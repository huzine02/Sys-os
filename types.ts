
// --- TYPES ORIGINAUX RESTAURÉS ---
// Les types correspondent exactement à ta base de données actuelle pour ne rien casser.

export type TaskType = 'pro' | 'saas' | 'vie' | 'patri' | 'copro' | 'airbnb' | 'maison';
export type ViewType = 'dashboard' | 'pro' | 'saas' | 'vie' | 'patri' | 'review' | 'command' | 'agenda';
export type Priority = 'H' | 'M' | 'L';

export interface Task {
  id: number;
  type: TaskType;
  text: string;
  done: boolean;
  priority: Priority;
  todayStar: boolean;
  createdAt: string;
  completedAt?: string;
  vpnColumn?: 1 | 2 | 3 | 4;
  // Récurrence / Relance
  recurrenceDays?: number;   // Intervalle en jours (7=hebdo, 14=2sem, 21=3sem, 35=5sem...)
  nextDate?: string;         // Date prochaine échéance (ISO YYYY-MM-DD)
  parentId?: number;         // ID de la tâche originale (pour tracer la chaîne)
}

export interface JournalEntry {
  time: string;
  text: string;
  date: string;
}

export interface Metrics {
  mrr: string;
  users: string;
}

export interface ReviewData {
  win: string;
  fail: string;
  priority: string;
  energy?: number;  // 1-5, score energie hebdo
  focus?: number;   // 1-5, score focus hebdo
}

export interface DailyProgress {
  pro: number;
  saas: number;
  patri: number;
  vie: number;
  lastReset: string;
}

export interface AgendaEvent {
  id: number;
  title: string;
  date: string; // YYYY-MM-DD
  time: string; // HH:MM
  duration: number; // Minutes
  type: 'meeting' | 'work' | 'other';
  important: boolean;
  vpnCreated?: boolean; // true if created while VPN mode was active
}

export interface Settings {
  // Dates techniques
  coproDate: string;
  airbnbDate: string;

  crisisMode: boolean;
  vpnMode: boolean;
  eyeCare: boolean;
  gistToken: string;
  gistId: string;

  // Labels personnalisés (Optionnel)
  labels?: Record<string, string>;

  // Identité & VPN personnalisation
  userName?: string; // "Operator" par défaut
  vpnAppName?: string; // Nom de l'app en mode VPN (ex: "TaskFlow", "Planner")
  vpnLabels?: { // Noms des 4 piliers en mode VPN
    pro?: string;
    saas?: string;
    patri?: string;
    vie?: string;
  };
  vpnColumns?: {
    col1: string;
    col2: string;
    col3: string;
    col4: string;
  };
}

export interface Blueprint {
  phase: number;
  week: number;
  mrr: string;
  clients: string;
  principles: string;
  weeklyTheme: string;
}

export interface PrayerTimes {
    Fajr: string;
    Dhuhr: string;
    Asr: string;
    Maghrib: string;
    Isha: string;
    [key: string]: string;
}

export interface DayConfig {
  name: string;
  label: string;
  theme: string;
  office: boolean;
  budgets: {
    pro: number;
    saas: number;
    patri: number;
    vie: number;
  };
}

export interface AppData {
  updatedBy?: string;
  lastSynced: number;
  tasks: Task[];
  metrics: Metrics;
  settings: Settings;
  journal: JournalEntry[];
  review: ReviewData;
  dailyProgress: DailyProgress;
  blueprint: Blueprint;
  context: string;
  agenda: AgendaEvent[];
  weeklyConfig: Record<number, DayConfig>;
  dailyScores?: { date: string; score: number }[];
}

export interface Backup {
    id: string;
    timestamp: number;
    dateStr: string;
    trigger: string;
    data: AppData;
}

export const AGENT_PROMPT = `
# SYSTEM INSTRUCTION:
Analyze input. Output JSON tasks.
Categories: "pro" (Job), "saas" (Dev), "vie" (Life), "copro" (RealEstate1), "airbnb" (RealEstate2), "maison" (Home).
`;
