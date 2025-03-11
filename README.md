# Module Génération Contenu

## Description
Ce projet est un module de génération de contenu utilisant Supabase pour la gestion des données et Make.com pour la publication sur différentes plateformes. Il permet aux utilisateurs de générer, modifier, publier et supprimer du contenu personnalisé.

## Fonctionnalités
- **Inscription et Connexion** : Les utilisateurs peuvent s'inscrire et se connecter.
- **Génération de Contenu** : Génération de contenu textuel, d'images et de vidéos basés sur des mots-clés.
- **Gestion de Contenu** : Les utilisateurs peuvent lister, modifier et supprimer leur contenu.
- **Publication** : Publication immédiate ou planifiée du contenu sur différentes plateformes via Make.com.
- **Journalisation** : Journalisation des actions des utilisateurs.

## Prérequis
- Node.js
- Supabase
- Make.com

## Installation
1. Clonez le dépôt :
   ```bash
   git clone <URL_DU_DEPOT>
   cd backend
   ```

2. Installez les dépendances :
   ```bash
   npm install
   ```

3. Configurez les variables d'environnement dans le fichier `.env` :
   ```
   PORT=3001
   MAKE_WEBHOOK_URL=https://hook.make.com/ton-webhook-url
   SUPABASE_URL=https://erbbhydiwleenlftidcc.supabase.co
   SUPABASE_KEY=<VOTRE_SUPABASE_KEY>
   SUPABASE_SERVICE_ROLE_KEY=<VOTRE_SUPABASE_SERVICE_ROLE_KEY>
   ```

## Utilisation
1. Démarrez le serveur :
   ```bash
   npm start
   ```

2. Accédez à l'application via `http://localhost:3001`.

## Routes API
- **Auth** :
  - `POST /auth/register` : Inscription
  - `POST /auth/login` : Connexion
  - `GET /auth/profile` : Profil utilisateur
  - `PUT /auth/set-role` : Modifier le rôle d'un utilisateur
  - `GET /auth/list-users` : Lister les utilisateurs (admin uniquement)

- **Content** :
  - `POST /content/generate` : Générer du contenu
  - `GET /content/list` : Lister le contenu de l'utilisateur
  - `PUT /content/update/:contentId` : Modifier le contenu
  - `DELETE /content/delete/:contentId` : Supprimer le contenu

- **Publish** :
  - `POST /publish` : Publier du contenu

- **Log** :
  - `POST /log` : Journaliser une action

## Contribution
Les contributions sont les bienvenues. Veuillez soumettre une pull request pour toute amélioration ou correction.

## Licence
Ce projet est un projet client et peut nécessiter une licence spécifique. Veuillez contacter le propriétaire du projet pour plus de détails sur les droits d'utilisation et de distribution.
