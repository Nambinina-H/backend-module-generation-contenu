// controllers/authController.js
const { supabase, supabaseAdmin } = require('../services/supabaseService');
const { logAction } = require('../services/logService'); // Import logAction

// Inscription d'un utilisateur
exports.register = async (req, res) => {
  console.log("Données reçues :", req.body); // Ajout de log pour voir l'email
  const { email, password } = req.body;

  // Vérifier que les champs sont remplis
  if (!email || !password) {
    return res.status(400).json({ error: 'Email et mot de passe requis' });
  }

  // Vérifier le format de l'email
  const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
  if (!emailRegex.test(email)) {
    return res.status(400).json({ error: 'Format email invalide' });
  }

  // Inscription de l'utilisateur dans Supabase
  const { data, error } = await supabase.auth.signUp({ email, password });

  if (error) {
    console.error('Erreur Supabase:', error.message);
    return res.status(400).json({ error: error.message });
  }

  // Créer le profil dans `profiles`
  const userId = data.user.id;
  const { error: profileError } = await supabase
    .from('profiles')
    .insert([{ user_id: userId, role: 'user' }]);

  await logAction(userId, 'create', `Utilisateur ${email} inscrit`);

  if (profileError) {
    console.error("Erreur lors de la création du profil :", profileError);
    return res.status(500).json({ error: 'Erreur lors de la création du profil utilisateur.' });
  }

  res.json({ message: 'Utilisateur créé avec succès', data });
};

// Connexion d'un utilisateur
exports.login = async (req, res) => {
  const { email, password } = req.body;

  // Vérifier que les champs sont remplis
  if (!email || !password) {
    return res.status(400).json({ error: 'Email et mot de passe requis' });
  }

  // Vérifier le format de l'email
  const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
  if (!emailRegex.test(email)) {
    return res.status(400).json({ error: 'Format email invalide' });
  }

  const { data, error } = await supabase.auth.signInWithPassword({ email, password });

  if (error) {
    return res.status(400).json({ error: error.message });
  }

 // Enregistrer le log de connexion
 await logAction(data.user.id, 'login', `Utilisateur ${email} connecté`);

  res.json({
    message: 'Connexion réussie',
    user: data.user,
    token: data.session.access_token // Le token JWT
  });
};

// Modifie role d'un utilisateur
exports.setUserRole = async (req, res) => {
  const { userId, newRole } = req.body;
  const adminRole = req.user.role; // Récupérer le rôle de l'admin qui fait la requête

  // Vérifier que l'utilisateur est bien admin
  if (adminRole !== 'admin') {
    return res.status(403).json({ error: "Accès refusé. Seuls les admins peuvent modifier les rôles." });
  }

  // Vérifier que le rôle est valide
  if (!['user', 'admin'].includes(newRole)) {
    return res.status(400).json({ error: "Rôle invalide. Valeurs autorisées : 'user' ou 'admin'." });
  }

  try {
    // Vérifier si l'utilisateur existe dans `profiles`
    const { data: existingUser, error: fetchError } = await supabase
      .from('profiles')
      .select('user_id')
      .eq('user_id', userId)
      .single();

    if (fetchError || !existingUser) {
      return res.status(404).json({ error: "Utilisateur introuvable." });
    }

    // Mettre à jour le rôle de l'utilisateur
    const { error } = await supabase
      .from('profiles')
      .update({ role: newRole })
      .eq('user_id', userId);

    if (error) {
      console.error("🚨 Erreur lors du changement de rôle :", error);
      return res.status(500).json({ error: error.message });
    }

     // Enregistrer le log
  await logAction(req.user.id, 'update', `Changement de rôle de l'utilisateur ${userId} en ${newRole}`);

    res.json({ message: `Rôle de l'utilisateur mis à jour en '${newRole}'.` });
  } catch (error) {
    console.error("🚨 Erreur serveur :", error);
    res.status(500).json({ error: error.message });
  }
};



exports.listUsers = async (req, res) => {
  const adminRole = req.user.role;

  if (adminRole !== 'admin') {
    return res.status(403).json({ error: "Accès refusé. Seuls les admins peuvent voir la liste des utilisateurs." });
  }

  // Récupérer les paramètres `page`, `limit`, `search`, `sort`, `sortRole`, `sortDate`
  let { page = 1, limit = 10, search, sort = 'asc', sortRole, sortDate } = req.query;
  page = parseInt(page);
  limit = parseInt(limit);

  if (isNaN(page) || isNaN(limit) || page < 1 || limit < 1) {
    return res.status(400).json({ error: "Les paramètres `page` et `limit` doivent être des nombres positifs." });
  }

  if (!['asc', 'desc'].includes(sort)) {
    return res.status(400).json({ error: "Le paramètre `sort` doit être `asc` ou `desc`." });
  }

  if (sortRole && !['role-asc', 'role-desc'].includes(sortRole)) {
    return res.status(400).json({ error: "Le paramètre `sortRole` doit être `role-asc` ou `role-desc`." });
  }

  if (sortDate && !['date-asc', 'date-desc'].includes(sortDate)) {
    return res.status(400).json({ error: "Le paramètre `sortDate` doit être `date-asc` ou `date-desc`." });
  }

  try {
    // Récupérer les utilisateurs via Supabase Admin API
    const { data: users, error: usersError } = await supabaseAdmin.auth.admin.listUsers();

    if (usersError) {
      console.error("🚨 Erreur lors de la récupération des utilisateurs :", usersError);
      return res.status(500).json({ error: usersError.message });
    }

    // Filtrer par email si `search` est fourni
    let filteredUsers = users.users;
    if (search) {
      filteredUsers = filteredUsers.filter(user => user.email.toLowerCase().includes(search.toLowerCase()));
    }

    // Récupérer les `user_id` des utilisateurs filtrés et leurs dates d'inscription
    const userDates = users.users.map(user => ({
      user_id: user.id,
      created_at: new Date(user.created_at) // Convertir en Date JS
    }));

    // Récupérer les profils des utilisateurs filtrés
    const { data: profiles, error: profilesError } = await supabase
      .from('profiles')
      .select('user_id, role')
      .in('user_id', filteredUsers.map(user => user.id));

    if (profilesError) {
      console.error("🚨 Erreur lors de la récupération des profils :", profilesError);
      return res.status(500).json({ error: profilesError.message });
    }

    // Associer les emails et les dates aux profils
    let userList = profiles.map(profile => {
      const user = filteredUsers.find(u => u.id === profile.user_id);
      const userDate = userDates.find(u => u.user_id === profile.user_id);
      return {
        user_id: profile.user_id,
        email: user ? user.email : null,
        role: profile.role,
        created_at: userDate ? userDate.created_at.toISOString() : null
      };
    });

    // Trier par email
    userList.sort((a, b) => {
      return sort === 'asc' ? a.email.localeCompare(b.email) : b.email.localeCompare(a.email);
    });

    // Trier par rôle si demandé
    if (sortRole) {
      userList.sort((a, b) => {
        return sortRole === 'role-asc' ? a.role.localeCompare(b.role) : b.role.localeCompare(a.role);
      });
    }

    // Trier par date si demandé
    if (sortDate) {
      userList.sort((a, b) => {
        return sortDate === 'date-asc'
          ? new Date(a.created_at) - new Date(b.created_at)
          : new Date(b.created_at) - new Date(a.created_at);
      });
    }

    // Appliquer la pagination
    const totalUsers = userList.length;
    const totalPages = Math.ceil(totalUsers / limit);
    userList = userList.slice((page - 1) * limit, page * limit);

    res.json({
      message: "Liste des utilisateurs récupérée avec succès",
      totalUsers,
      totalPages,
      currentPage: page,
      users: userList
    });
  } catch (error) {
    console.error("🚨 Erreur serveur :", error);
    res.status(500).json({ error: error.message });
  }
};

