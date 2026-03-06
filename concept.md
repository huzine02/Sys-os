
# 🧠 SYS-DIAG V7 // CONCEPT & ARCHITECTURE

## 1. Identité du Projet
**Nom de code :** SysDiag V7 (System Diagnostics)
**Fonction réelle :** OS de Productivité Personnel & Stratégique.
**Fonction apparente (Camouflage) :** Outil de monitoring serveur/réseau interne.
**Philosophie :** "Hide in plain sight". Une interface austère et technique pour gérer des piliers de vie personnels (Pro, SaaS, Immo, Vie) dans n'importe quel environnement (bureau, open space) sans attirer l'attention.

---

## 2. Architecture Technique

### Stack
- **Core :** React 19 + TypeScript + Vite.
- **UI :** TailwindCSS (Design System "Cyber-Industrial").
- **IA :** Google Gemini API (Flash 2.5 pour la vitesse, Pro 3 pour la stratégie).
- **Audio :** Web Audio API (Sons binuraux et alertes discrètes).

### Data Layer (Le "Sync Engine")
C'est le cœur du système qui empêche la perte de données.
1.  **Local First :** Les données sont stockées dans le `localStorage` du navigateur, cryptées (Base64 + Obfuscation).
2.  **Cloud Mirror (GitHub Gist) :**
    -   Le système utilise un **Gist Privé GitHub** comme base de données distante.
    -   Un fichier `huzine_db.json` contient tout l'état de l'application.
    -   **Polling :** L'app vérifie toutes les secondes si le Gist a changé.
    -   **Push :** À chaque modification locale (tâche cochée, note ajoutée), l'app envoie la mise à jour au Gist.
    -   **Sécurité :** Les tokens API sont retirés du payload avant l'envoi pour ne pas être stockés dans le JSON.

---

## 3. Sécurité & Modes

### A. Mode VPN (Office Mode)
-   **Activé par :** Toggle dans les paramètres.
-   **Effet :** Remplace tous les mots-clés sensibles (noms de projets perso, "Airbnb", "SaaS") par des termes corporate ("Project Alpha", "Unit A", "Maintenance").
-   **Visuel :** Passe l'interface en thème "Clair/Admin", ressemblant à un vieil intranet ou Excel.

### B. Mode "Air Gap"
-   **Fonction :** Coupe toute communication réseau vers GitHub.
-   **Usage :** Environnements ultra-sécurisés ou paranoïa temporaire.
-   **Récupération :** Nécessite une reconnexion manuelle via Token.

### C. Magic Link
-   L'URL de l'application peut contenir `?token=XYZ&id=123`.
-   Cela permet de se connecter instantanément sur mobile sans taper le mot de passe.
-   **Note :** À utiliser avec précaution.

---

## 4. Modules IA (Gemini)

L'IA n'est pas un gadget, c'est le **moteur décisionnel**.
1.  **Express (Mode Auto) :** Analyse une entrée texte ou un fichier (PDF/Image) pour en extraire des tâches structurées JSON.
2.  **Stratégie (Checkpoint) :** Compare une action voulue avec le *Blueprint* (objectifs de la phase actuelle) pour valider ou rejeter l'idée.
3.  **Chat (Coach) :** Discussion libre avec mémoire contextuelle pour débloquer des situations.

*Note : Les prompts sont forcés en Français via `services/ai.ts`.*

---

## 5. Déploiement & Sauvegarde

Pour ne plus perdre de données en local, l'application doit être hébergée (Cloud) et les données synchronisées (Gist).

### A. Hébergement du Code (Vercel / Netlify / GitHub Pages)
1.  Pousser ce code sur un repo GitHub privé.
2.  Connecter le repo à Vercel.
3.  Ajouter la variable d'environnement : `VITE_API_KEY` (Clé Google Gemini).
4.  Le site est en ligne.

### B. Configuration de la Donnée
1.  Créer un **Personal Access Token (Classic)** sur GitHub avec les droits `gist`.
2.  Créer un **Gist** manuellement avec un fichier vide `huzine_db.json`.
3.  Au premier lancement de l'app :
    -   Entrer le Token.
    -   Entrer l'ID du Gist (dans l'URL du gist).
4.  Le système est désormais synchronisé. Si vous changez d'ordinateur ou videz le cache, il suffit de se reconnecter pour tout récupérer.

---

## 6. Codes Erreurs Fréquents

-   **403 (Forbidden) :** Le token GitHub est valide mais n'a pas la permission `gist` cochée, ou le Gist n'appartient pas à ce token.
-   **401 (Unauthorized) :** Le token est invalide ou expiré.
-   **Sync Loop :** Si l'app clignote (Syncing...), c'est que l'horloge système est décalée ou qu'une autre fenêtre est ouverte.

---

*Dernière mise à jour : V7.2 Stable*
