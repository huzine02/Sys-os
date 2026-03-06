
# 🗺️ SYS-DIAG V7 // PROJECT MAP

Ce document référence la structure complète de l'application, le rôle de chaque fichier et les flux de données.

## 📂 STRUCTURE DES DOSSIERS

```
/
├── index.html              # Point d'entrée HTML + Styles globaux + Control Room (Vanilla JS)
├── index.tsx               # Point d'entrée React (Mount)
├── App.tsx                 # ORCHESTRATEUR PRINCIPAL (State, Routing, Sync Logic)
├── types.ts                # Définitions TypeScript (Interfaces Globales)
├── utils.ts                # Fonctions utilitaires, Configs (Constantes), Sécurité
├── metadata.json           # Permissions PWA
├── package.json            # Dépendances (React 19, Vite, Gemini SDK)
├── vite.config.ts          # Config Build & Env Vars
├── cloudbuild.yaml         # CI/CD Google Cloud
├── nginx.conf              # Config Serveur (Production)
├── concept.md              # Documentation Architecture & Déploiement
└── map.md                  # Cartographie du projet (Ce fichier)

/components                 # BLOCS UI & FONCTIONNELS
├── CommandCenter.tsx       # Interface IA (Express, Chat, Stratégie)
├── TaskRow.tsx             # Composant d'affichage d'une tâche (avec logique Camouflage)
├── Overlays.tsx            # Modales (Focus, Shutdown, Eye Care, Circuit Breaker, Masque Excel)
├── UI.tsx                  # Composants Atomiques (Card, Button, Input, Table)
└── Icons.tsx               # Bibliothèque d'icônes SVG (Lucide-like)

/services                   # LOGIQUE MÉTIER EXTERNE
└── ai.ts                   # Intégration Google Gemini API (Prompts & Parsing)
```

---

## 🧩 DÉTAILS DES COMPOSANTS CLÉS

### 1. Le Cerveau (`App.tsx`)
C'est le fichier monstre qui gère tout.
-   **State :** `data` (Tâches, Métriques, Journal...), `currentView` (Navigation).
-   **Sync Engine :** Gère le polling et le push vers GitHub Gist.
-   **Modules :** Intègre le `CommandCenter`, les `Overlays`, et les vues (Dashboard, Agenda, Review).
-   **Cycle de vie :** `useEffect` pour l'heure, les prières, le mode veille.

### 2. L'Intelligence (`services/ai.ts` & `components/CommandCenter.tsx`)
-   **`ai.ts` :** Contient les prompts "System" (forcés en Français). C'est ici qu'on définit la personnalité de l'IA (Coach, Stratège). Utilise le SDK `@google/genai`.
-   **`CommandCenter.tsx` :** L'interface utilisateur pour parler à l'IA. Gère l'upload de fichiers et l'affichage des réponses (Markdown/JSON).

### 3. La Configuration (`utils.ts`)
Si tu veux changer le comportement de l'OS, c'est ici.
-   **`DAY_CONFIGS` :** Définit les thèmes de chaque jour (Lundi Admin, Mardi Site, etc.) et les budgets temps.
-   **`PHASE_DATA` :** Les objectifs du Blueprint (MRR cibles).
-   **`sanitizeForOffice` :** La fonction qui censure les mots clés en mode VPN.
-   **`encryptData` / `decryptData` :** Sécurité locale.

### 4. L'Apparence (`index.html` & `tailwind`)
-   Le style "Cyber-Industrial" est défini via Tailwind dans le `<head>` de `index.html`.
-   Contient aussi la **"Control Room"** (le petit panneau en bas à droite), qui est un script Vanilla JS de secours indépendant de React pour vérifier la sync.

---

## 🔄 FLUX DE DONNÉES (DATA FLOW)

1.  **Saisie Utilisateur** (Ajout tâche/Note) -> `App.tsx` (State Update).
2.  **Sauvegarde Locale** -> `localStorage` (Chiffré via `utils.ts`).
3.  **Synchronisation Cloud** (Si Token présent) :
    -   `App.tsx` détecte le changement.
    -   Envoie un `PATCH` à l'API GitHub Gist (`huzine_db.json`).
4.  **Réception Cloud** (Polling) :
    -   `App.tsx` (ou le script dans `index.html`) ping l'API Gist toutes les secondes.
    -   Si timestamp distant > timestamp local -> Mise à jour du State.

---

## 🛠️ GUIDE RAPIDE DE MODIFICATION

-   **Changer les couleurs/thèmes :** `index.html` (Tailwind Config).
-   **Modifier les catégories de tâches :** `types.ts` (Enum) + `utils.ts` (Couleurs & Labels).
-   **Ajuster l'IA :** `services/ai.ts` (Prompts).
-   **Ajouter une vue :** Ajouter l'ID dans `types.ts`, ajouter le bouton dans la nav `App.tsx`, ajouter la condition d'affichage dans le `main` de `App.tsx`.

---

*Dernière mise à jour : V7.2*
