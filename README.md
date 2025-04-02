# Module Génération Contenu

## Description
Ce projet est un module de génération de contenu utilisant Supabase pour la gestion des données et Make.com pour la publication sur différentes plateformes. Il permet aux utilisateurs de générer, modifier, publier et supprimer du contenu personnalisé.

## Fonctionnalités
- **Inscription et Connexion** : Les utilisateurs peuvent s'inscrire et se connecter.
- **Génération de Contenu** : Génération de contenu textuel, d'images et de vidéos basés sur des mots-clés.
- **Gestion de Contenu** : Les utilisateurs peuvent lister, modifier et supprimer leur contenu.
- **Publication** : Publication immédiate ou planifiée du contenu sur différentes plateformes via Make.com.
- **Journalisation** : Journalisation des actions des utilisateurs.
- **Gestion des clés API** : 
  - Stockage sécurisé des clés API avec chiffrement
  - Mise à jour en temps réel via Supabase Realtime
  - Cache en mémoire pour les performances
  - Support multi-plateformes (OpenAI, etc.)

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
   ENCRYPTION_KEY=your_32_char_encryption_key # Clé de 32 caractères pour le chiffrement AES
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

- **API Config** :
  - `POST /api/config/add` : Ajouter une nouvelle clé API
  - `GET /api/config/list` : Lister les clés API de l'utilisateur
  - `PUT /api/config/update/:id` : Mettre à jour une clé API
  - `DELETE /api/config/delete/:id` : Supprimer une clé API

## Architecture Technique

### Gestion des Clés API
- **Stockage** : Les clés API sont stockées dans la table `api_configurations` de Supabase
- **Sécurité** : 
  - Chiffrement AES-256-CBC avec IV unique
  - Clés stockées de manière chiffrée dans la base de données
- **Performance** :
  - Cache en mémoire des clés déchiffrées
  - Mise à jour automatique du cache via Supabase Realtime
- **Temps réel** :
  - Synchronisation automatique lors des changements (INSERT/UPDATE/DELETE)
  - Pas besoin de redémarrer le serveur

## Configuration Supabase

### Table api_configurations
```sql
-- Créer une nouvelle table avec la colonne `keys` en JSON
CREATE TABLE api_configurations (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  user_id UUID NOT NULL,
  platform TEXT NOT NULL,
  keys JSONB NOT NULL,
  created_at TIMESTAMP DEFAULT NOW(),
  updated_at TIMESTAMP DEFAULT NOW()
);

-- Ajouter une contrainte de clé étrangère
ALTER TABLE api_configurations
  ADD CONSTRAINT fk_user
  FOREIGN KEY (user_id)
  REFERENCES auth.users(id)
  ON DELETE CASCADE;

-- Activer le mode Realtime pour la table
ALTER PUBLICATION supabase_realtime ADD TABLE api_configurations;

-- Ajouter les politiques de sécurité RLS
CREATE POLICY "Les utilisateurs peuvent voir leurs propres clés API"
  ON api_configurations FOR SELECT
  USING (auth.uid() = user_id);

CREATE POLICY "Les utilisateurs peuvent insérer leurs propres clés API"
  ON api_configurations FOR INSERT
  WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Les utilisateurs peuvent mettre à jour leurs propres clés API"
  ON api_configurations FOR UPDATE
  USING (auth.uid() = user_id);

CREATE POLICY "Les utilisateurs peuvent supprimer leurs propres clés API"
  ON api_configurations FOR DELETE
  USING (auth.uid() = user_id);
```

## Utilisation des clés API
Les clés API sont automatiquement chargées au démarrage et mises à jour en temps réel. Pour utiliser une clé :

```javascript
const apiKeys = ApiConfigService.getKeyFromCache('platform_name');
// Utiliser apiKeys.api_key ou autres propriétés selon la configuration
```

## Contribution
Les contributions sont les bienvenues. Veuillez soumettre une pull request pour toute amélioration ou correction.

## Licence
Ce projet est un projet client et peut nécessiter une licence spécifique. Veuillez contacter le propriétaire du projet pour plus de détails sur les droits d'utilisation et de distribution.
