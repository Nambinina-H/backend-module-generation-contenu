// controllers/authController.js
const { supabase, supabaseAdmin } = require('../services/supabaseService');

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

  try {
    // Récupérer tous les profils (user_id + role)
    const { data: profiles, error: profilesError } = await supabase
      .from('profiles')
      .select('user_id, role');

    if (profilesError) {
      console.error("🚨 Erreur lors de la récupération des profils :", profilesError);
      return res.status(500).json({ error: profilesError.message });
    }

    // Utiliser `supabaseAdmin` pour récupérer tous les utilisateurs via Admin API
    const { data: users, error: usersError } = await supabaseAdmin.auth.admin.listUsers();

    if (usersError) {
      console.error("🚨 Erreur lors de la récupération des utilisateurs :", usersError);
      return res.status(500).json({ error: usersError.message });
    }

    // Associer les emails aux profils
    const userList = profiles.map(profile => {
      const user = users.users.find(u => u.id === profile.user_id);
      return {
        user_id: profile.user_id,
        email: user ? user.email : null, // Ajoute l'email s'il est trouvé
        role: profile.role
      };
    });

    res.json({ message: "Liste des utilisateurs récupérée avec succès", users: userList });
  } catch (error) {
    console.error("🚨 Erreur serveur :", error);
    res.status(500).json({ error: error.message });
  }
};


