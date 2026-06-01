# 🏢 Portail RH — Bulletins de Salaire

Application web complète pour la consultation et le téléchargement des bulletins de salaire.

---

## 🚀 Démarrage rapide

### Prérequis
- **Node.js** v18+
- **npm** v9+

### 1. Cloner / Dézipper le projet
```bash
cd paystub-app
```

### 2. Installer les dépendances
```bash
# Backend
cd server && npm install

# Frontend
cd ../client && npm install
```

### 3. Configurer le backend
```bash
cd server
cp .env.example .env
# Éditez .env et changez JWT_SECRET
```

### 4. Lancer le serveur backend
```bash
cd server
npm run dev        # Mode développement (nodemon)
# ou
npm start          # Mode production
```
Le serveur démarre sur **http://localhost:5000**

### 5. Lancer le frontend (autre terminal)
```bash
cd client
npm run dev
```
L'app est disponible sur **http://localhost:5173**

---

## 🔑 Comptes de démonstration

| Matricule | PIN   | Statut            | Mot de passe     |
|-----------|-------|-------------------|------------------|
| EMP001    | 1234  | Première connexion | (à définir)      |
| EMP002    | 5678  | Première connexion | (à définir)      |
| EMP003    | —     | Activé            | Admin123!        |

**Flux première connexion :**
1. Entrer matricule + PIN → page de création de mot de passe
2. Saisir le PIN administratif + nouveau mot de passe → compte activé

---

## 📊 Synchronisation CSV

### Format du fichier CSV
```csv
matricule,nom,prenom,mois,annee,salaire_brut,salaire_net,fichier_pdf
EMP001,Seye,Mouhamed,Janvier,2025,500000,420000,EMP001_2025_01.pdf
EMP001,Seye,Mouhamed,Février,2025,500000,420000,EMP001_2025_02.pdf
```

### Option 1 : Fichier local automatique
Placez votre CSV dans `server/csv/payslips.csv`, puis dans l'app :
- Menu **Synchronisation** → bouton **Synchroniser maintenant**

### Option 2 : Upload via l'interface
- Menu **Synchronisation** → zone de dépôt → sélectionnez votre CSV

### Via API REST directement
```bash
# Sync fichier local
curl -X POST http://localhost:5000/api/sync/csv \
  -H "Authorization: Bearer VOTRE_TOKEN"

# Upload CSV
curl -X POST http://localhost:5000/api/sync/csv \
  -H "Authorization: Bearer VOTRE_TOKEN" \
  -F "csv=@/chemin/vers/payslips.csv"
```

---

## 📁 Structure du projet

```
paystub-app/
├── server/
│   ├── controllers/
│   │   ├── authController.js       # Login, change-password, logout
│   │   ├── payslipController.js    # CRUD bulletins + download
│   │   └── syncController.js      # Import CSV
│   ├── routes/
│   │   ├── auth.js
│   │   ├── payslips.js
│   │   └── sync.js
│   ├── middleware/
│   │   └── auth.js                 # JWT middleware
│   ├── database/
│   │   └── db.js                   # SQLite init + seed
│   ├── csv/
│   │   └── payslips.csv            # Fichier CSV de données
│   ├── pdf/                        # Dossier des fichiers PDF
│   ├── .env.example
│   └── index.js                    # Point d'entrée Express
│
└── client/
    ├── src/
    │   ├── pages/
    │   │   ├── Login.jsx
    │   │   ├── FirstLogin.jsx
    │   │   ├── Dashboard.jsx
    │   │   ├── Payslips.jsx
    │   │   ├── Profile.jsx
    │   │   └── Sync.jsx
    │   ├── components/
    │   │   ├── Layout.jsx          # Sidebar + navigation
    │   │   └── PrivateRoute.jsx
    │   ├── contexts/
    │   │   └── AuthContext.jsx     # Gestion session JWT
    │   ├── services/
    │   │   └── api.js              # Axios configuré
    │   ├── theme.js                # Thème Material UI
    │   ├── App.jsx                 # Routing
    │   └── main.jsx
    └── vite.config.js
```

---

## 🔌 API REST

### Authentification
| Méthode | Endpoint               | Description                    |
|---------|------------------------|--------------------------------|
| POST    | /api/auth/login        | Connexion matricule+mot de passe |
| POST    | /api/auth/change-password | Définir/changer mot de passe |
| POST    | /api/auth/logout       | Déconnexion                    |
| GET     | /api/auth/me           | Profil employé connecté        |

### Bulletins
| Méthode | Endpoint                            | Description            |
|---------|-------------------------------------|------------------------|
| GET     | /api/payslips                       | Liste paginée          |
| GET     | /api/payslips/years                 | Années disponibles     |
| GET     | /api/payslips/:matricule            | Par matricule          |
| GET     | /api/payslips/:matricule/:annee/:mois | Bulletin spécifique  |
| GET     | /api/payslips/download/:id          | Télécharger PDF        |

### Synchronisation
| Méthode | Endpoint     | Description           |
|---------|--------------|-----------------------|
| POST    | /api/sync/csv | Sync CSV (local ou upload) |

---

## 🛡️ Sécurité
- ✅ JWT Authentication (8h expiration)
- ✅ Bcrypt (salt rounds: 10)
- ✅ Rate limiting (5 tentatives / 15 min)
- ✅ Protection CORS
- ✅ Validation des entrées
- ✅ Routes privées React

## 🔧 Variables d'environnement (server/.env)
```
PORT=5000
JWT_SECRET=votre_cle_secrete_longue_et_aleatoire
JWT_EXPIRES_IN=8h
DB_PATH=./database/paystub.db
PDF_DIR=./pdf
CSV_PATH=./csv/payslips.csv
NODE_ENV=development
```

## 📄 Ajouter des vrais PDF
Placez vos fichiers PDF dans `server/pdf/` avec le nom défini dans la colonne `fichier_pdf` du CSV.
Exemple : `server/pdf/EMP001_2025_01.pdf`

Si le fichier est absent, le système génère automatiquement un bulletin HTML téléchargeable.
