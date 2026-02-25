
import { AppData, Task, TaskType, DayConfig, PrayerTimes, Backup } from './types';

// --- SECURITY: OBFUSCATION DES MOTS CLÉS ---
// Permet de garder tes labels "Airbnb" chez toi sans qu'ils soient lisibles dans le code sur GitHub.
const decode = (str: string) => {
    try { return atob(str); } catch(e) { return "Unit"; }
};

// Configuration des sous-catégories (Assets)
// Les clés sont les vraies (db), les valeurs sont décodées à la volée.
export const ASSETS_CONFIG: Record<string, string> = {
    'copro': decode('Q29wcm8='),   // "Copro"
    'airbnb': decode('QWlyYm5i'),   // "Airbnb"
    'maison': decode('TWFpc29u')    // "Maison"
};

export const ASSETS_KEYS = Object.keys(ASSETS_CONFIG) as TaskType[];

const DEFAULT_CONTEXT = `# SYSTEM CONTEXT
[SECURE DATA REDACTED]`;

const DEFAULT_BLUEPRINT = `# OPERATIONAL BLUEPRINT
[SECURE DATA REDACTED]`;

// CLEF DE RÉPARTITION (Budget restauré pro/saas/patri/vie)
export const DAY_CONFIGS: Record<number, DayConfig> = {
    1: { name: 'MON', label: '🚀 PHASE 1: ADMIN', theme: '#D97706', office: false, budgets: { pro: 2, saas: 0, patri: 4, vie: 2 } },
    2: { name: 'TUE', label: '🏢 PHASE 2: SITE', theme: '#6366F1', office: true, budgets: { pro: 4, saas: 0, patri: 3, vie: 0 } },
    3: { name: 'WED', label: '📞 PHASE 3: LOGS', theme: '#0D9488', office: false, budgets: { pro: 1, saas: 2, patri: 2, vie: 3 } },
    4: { name: 'THU', label: '💻 PHASE 4: DEV', theme: '#E11D48', office: true, budgets: { pro: 4, saas: 4, patri: 0, vie: 0 } },
    5: { name: 'FRI', label: '📊 PHASE 5: CLOSE', theme: '#7C3AED', office: false, budgets: { pro: 3, saas: 0, patri: 1, vie: 2 } },
    6: { name: 'SAT', label: '🧠 PHASE 6: DEEP', theme: '#0891B2', office: false, budgets: { pro: 0, saas: 6, patri: 0, vie: 1 } },
    0: { name: 'SUN', label: '🔋 PHASE 7: RESET', theme: '#CA8A04', office: false, budgets: { pro: 0, saas: 0, patri: 0, vie: 2 } }
};

export const INITIAL_DATA: AppData = {
    lastSynced: 0,
    tasks: [],
    metrics: { mrr: '0', users: '0' },
    settings: { 
        coproDate: '', 
        airbnbDate: '', 
        crisisMode: false,
        vpnMode: false, 
        eyeCare: true, 
        // Récupération automatique depuis les variables d'environnement (.env)
        // Cela empêche la perte de connexion lors d'un crash ou d'un vide cache
        gistToken: process.env.GIST_TOKEN || '', 
        gistId: process.env.GIST_ID || '',
    },
    journal: [],
    review: { win: '', fail: '', priority: '' },
    dailyProgress: { pro: 0, saas: 0, patri: 0, vie: 0, lastReset: new Date().toDateString() },
    blueprint: {
        phase: 1,
        week: 1,
        mrr: '0',
        clients: '0',
        principles: DEFAULT_BLUEPRINT,
        weeklyTheme: 'HYBRID BALANCE'
    },
    context: DEFAULT_CONTEXT,
    agenda: [],
    weeklyConfig: DAY_CONFIGS 
};

export const PHASE_DATA: Record<number, {name: string, objective: string, target: number, reminder: string}> = {
    1: { name: "Phase I", objective: "Validation Metrics", target: 1000, reminder: "Focus on KPI validation." },
    2: { name: "Phase II", objective: "Product Iteration", target: 5000, reminder: "Iterate based on feedback." },
    3: { name: "Phase III", objective: "Scaling Ops", target: 10000, reminder: "Automate pipelines." }
};

export const getTaskDuration = (text: string): number => {
    const match = text.match(/\((\d+)\)/);
    if (match && match[1]) {
        return parseInt(match[1], 10) / 60;
    }
    return 0.5; // 30 min
};

export const calculateConsumedBudget = (tasks: Task[], _agenda: any[], type: 'pro' | 'saas' | 'patri' | 'vie', date: string) => {
    const relevantTasks = tasks.filter(t => {
        const isTypeMatch = type === 'patri'
            ? ['patri', ...ASSETS_KEYS].includes(t.type)
            : t.type === type;
        const isCompleted = t.done === true;
        // Only count tasks completed TODAY (using completedAt field)
        const isToday = t.completedAt
            ? t.completedAt.startsWith(date)
            : false; // Tasks without completedAt (legacy) are NOT counted
        return isTypeMatch && isCompleted && isToday;
    });

    let taskMinutes = 0;
    relevantTasks.forEach(t => {
        const d = getTaskDuration(t.text);
        taskMinutes += d * 60;
    });

    return taskMinutes / 60;
};

// ===== MOTIVATION ENGINE =====

export const getDailyScore = (tasks: Task[], todayStr: string, vpnFilter: (t: Task) => boolean): number => {
    const starred = tasks.filter(t => t.todayStar && vpnFilter(t));
    if (starred.length === 0) return 0;
    const completed = starred.filter(t => t.done && t.completedAt?.startsWith(todayStr));
    return Math.round((completed.length / starred.length) * 100);
};

export const getStreakCount = (task: Task, allTasks: Task[]): number => {
    if (!task.recurrenceDays || task.recurrenceDays === 0) return 0;
    const rootId = task.parentId || task.id;
    return allTasks.filter(t => (t.parentId === rootId || t.id === rootId) && t.done && t.completedAt).length;
};

export const getDeepWorkCount = (tasks: Task[], todayStr: string, vpnFilter: (t: Task) => boolean): number => {
    return tasks.filter(t => {
        if (!t.done || !t.completedAt?.startsWith(todayStr) || !vpnFilter(t)) return false;
        return getTaskDuration(t.text) >= 0.25; // 15min+ = deep work
    }).length;
};

export const getScoreColor = (score: number, isVpnMode: boolean): string => {
    if (isVpnMode) return score > 80 ? 'text-green-600' : score > 50 ? 'text-orange-600' : 'text-red-600';
    return score > 80 ? 'text-saas' : score > 50 ? 'text-gold' : 'text-alert';
};

// MODIFICATION: Ajout du paramètre isOfficeMode pour forcer la monochromie
export const getThemeColor = (type: TaskType | string, isOfficeMode: boolean = false) => {
    if (isOfficeMode) return 'text-slate-500'; // Stealth Mode: Gris neutre pour tout le monde

    switch(type) {
        case 'pro': return 'text-pro';
        case 'saas': return 'text-saas';
        case 'vie': return 'text-vie';
        case 'patri': return 'text-patri';
        case 'copro': return 'text-violet-400';
        case 'airbnb': return 'text-fuchsia-400';
        case 'maison': return 'text-purple-300';
        default: return 'text-slate-400';
    }
};

export const getGreeting = () => {
    const h = new Date().getHours();
    if (h < 12) return 'Good Morning';
    if (h < 18) return 'Good Afternoon';
    return 'Good Evening';
};

// --- CORE SECURITY FUNCTION (THE MASK) ---
export const sanitizeForOffice = (text: string, isOfficeMode: boolean, settings?: AppData['settings']): string => {
    if (isOfficeMode && settings) {
        const vl = settings.vpnLabels || {};
        // Build VPN label map from user settings (customizable pillar names)
        const vpnMap: Record<string, string> = {
            'pro': vl.pro || 'Work',
            'saas': vl.saas || 'Projects',
            'patri': vl.patri || 'Admin',
            'vie': vl.vie || 'Personal',
            'copro': 'Unit A',
            'airbnb': 'Unit B',
            'maison': 'Unit C',
            'ancre': 'Focus',
            'l\'ancre': 'Focus',
            'the one thing': 'Focus',
            'soutien': 'Support',
            'victoires': 'Wins',
            'win': 'Wins',
            'blocages': 'Blockers',
            'fail': 'Blockers',
            'priorité': 'Priority',
            'brain': 'AI',
            'day': 'Dashboard',
            'plan': 'Planner',
            'journal': 'Notes',
            'operator': settings.userName || 'User',
        };

        const lowerKey = text.toLowerCase();
        if (vpnMap[lowerKey]) return vpnMap[lowerKey];
        for (const key in vpnMap) {
            if (lowerKey.includes(key)) return vpnMap[key];
        }
        // Strip emojis
        return text.replace(/[\u{1F600}-\u{1F64F}\u{1F300}-\u{1F5FF}\u{1F680}-\u{1F6FF}\u{1F1E0}-\u{1F1FF}\u{2600}-\u{26FF}\u{2700}-\u{27BF}]/gu, '');
    }

    // Mode MAISON — noms réels
    if (text === 'copro') return ASSETS_CONFIG['copro'];
    if (text === 'airbnb') return ASSETS_CONFIG['airbnb'];
    if (text === 'maison') return ASSETS_CONFIG['maison'];
    if (text === 'pro') return 'Pro';
    if (text === 'saas') return 'SaaS';
    if (text === 'vie') return 'Vie';
    if (text === 'patri') return 'Patrimoine';

    return text;
};

export const parseMarkdown = (text: string): string => {
    if (!text) return "";
    let html = text
        .replace(/\*\*(.*?)\*\*/g, '<strong>$1</strong>')
        .replace(/\*(.*?)\*/g, '<em>$1</em>')
        .replace(/^- (.*)/gm, '• $1')
        .replace(/\n/g, '<br/>');
    return html;
};

// --- AES-256-GCM ENCRYPTION (Web Crypto API) ---
// Synchronous wrapper uses a rotating XOR cipher for localStorage (sync context).
// The key is derived from app identity — not perfect, but prevents casual atob() snooping.
const _CK = [83,89,83,45,79,83,45,50,48,50,53,45,83,69,67]; // "SYS-OS-2025-SEC"

const _xorCipher = (input: string, key: number[]): string => {
    const result: number[] = [];
    for (let i = 0; i < input.length; i++) {
        result.push(input.charCodeAt(i) ^ key[i % key.length]);
    }
    return result.map(c => c.toString(16).padStart(2, '0')).join('');
};

const _xorDecipher = (hex: string, key: number[]): string => {
    const bytes: number[] = [];
    for (let i = 0; i < hex.length; i += 2) {
        bytes.push(parseInt(hex.substring(i, i + 2), 16));
    }
    return bytes.map((b, i) => String.fromCharCode(b ^ key[i % key.length])).join('');
};

export const encryptData = (data: AppData): string => {
    try {
        const json = JSON.stringify(data);
        // Prefix with 'x1:' to identify new format
        return 'x1:' + _xorCipher(json, _CK);
    } catch (e) {
        return JSON.stringify(data);
    }
};

export const decryptData = (encrypted: string): AppData | null => {
    if (!encrypted) return null;
    try {
        // New format: x1:hex
        if (encrypted.startsWith('x1:')) {
            const json = _xorDecipher(encrypted.substring(3), _CK);
            return JSON.parse(json);
        }
        // Legacy format 1: base64
        const json = decodeURIComponent(escape(atob(encrypted)));
        return JSON.parse(json);
    } catch (e) {
        try {
            // Legacy format 2: double-base64 reversed
            const json = atob(atob(encrypted).split('').reverse().join(''));
            return JSON.parse(json);
        } catch (e2) {
            try { return JSON.parse(encrypted); } catch (e3) { return null; }
        }
    }
};

export const fetchPrayerTimes = async (): Promise<PrayerTimes | null> => {
    try {
        const date = new Date();
        const strDate = `${date.getDate()}-${date.getMonth()+1}-${date.getFullYear()}`;
        const res = await fetch(`https://api.aladhan.com/v1/timingsByCity/${strDate}?city=Paris&country=France&method=12`);
        const data = await res.json();
        if(data.code === 200) {
            return data.data.timings;
        }
        return null;
    } catch (e) {
        return null;
    }
};

export const playSoftBeep = () => {
    try {
        const AudioContext = window.AudioContext || (window as any).webkitAudioContext;
        if (!AudioContext) return;
        const ctx = new AudioContext();
        const osc = ctx.createOscillator();
        const gain = ctx.createGain();
        osc.connect(gain);
        gain.connect(ctx.destination);
        osc.frequency.value = 440;
        gain.gain.value = 0.05;
        osc.type = 'sine';
        osc.start();
        gain.gain.exponentialRampToValueAtTime(0.00001, ctx.currentTime + 0.5);
        osc.stop(ctx.currentTime + 0.5);
    } catch (e) {}
};

// Eye Care beep: 2 short high-pitched pings (880Hz)
export const playEyeCareBeep = () => {
    try {
        const AudioContext = window.AudioContext || (window as any).webkitAudioContext;
        if (!AudioContext) return;
        const ctx = new AudioContext();
        // Ping 1
        const osc1 = ctx.createOscillator();
        const gain1 = ctx.createGain();
        osc1.connect(gain1); gain1.connect(ctx.destination);
        osc1.frequency.value = 880;
        osc1.type = 'sine';
        gain1.gain.setValueAtTime(0.08, ctx.currentTime);
        gain1.gain.exponentialRampToValueAtTime(0.00001, ctx.currentTime + 0.15);
        osc1.start(ctx.currentTime);
        osc1.stop(ctx.currentTime + 0.15);
        // Ping 2
        const osc2 = ctx.createOscillator();
        const gain2 = ctx.createGain();
        osc2.connect(gain2); gain2.connect(ctx.destination);
        osc2.frequency.value = 1046; // C6
        osc2.type = 'sine';
        gain2.gain.setValueAtTime(0.08, ctx.currentTime + 0.2);
        gain2.gain.exponentialRampToValueAtTime(0.00001, ctx.currentTime + 0.4);
        osc2.start(ctx.currentTime + 0.2);
        osc2.stop(ctx.currentTime + 0.4);
    } catch (e) {}
};

// Task Timer Complete beep: LOUD insistent alarm (3x double-beep at 660Hz+880Hz)
// Designed to be heard from another room / phone background
export const playTaskTimerBeep = () => {
    try {
        const AudioContext = window.AudioContext || (window as any).webkitAudioContext;
        if (!AudioContext) return;
        const ctx = new AudioContext();
        for (let i = 0; i < 3; i++) {
            const baseTime = ctx.currentTime + i * 0.6;
            // High ping
            const osc1 = ctx.createOscillator();
            const gain1 = ctx.createGain();
            osc1.connect(gain1); gain1.connect(ctx.destination);
            osc1.frequency.value = 880;
            osc1.type = 'sine';
            gain1.gain.setValueAtTime(0.25, baseTime);
            gain1.gain.exponentialRampToValueAtTime(0.001, baseTime + 0.25);
            osc1.start(baseTime);
            osc1.stop(baseTime + 0.25);
            // Low confirmation
            const osc2 = ctx.createOscillator();
            const gain2 = ctx.createGain();
            osc2.connect(gain2); gain2.connect(ctx.destination);
            osc2.frequency.value = 660;
            osc2.type = 'sine';
            gain2.gain.setValueAtTime(0.2, baseTime + 0.3);
            gain2.gain.exponentialRampToValueAtTime(0.001, baseTime + 0.55);
            osc2.start(baseTime + 0.3);
            osc2.stop(baseTime + 0.55);
        }
    } catch (e) {}
};

// Adhan/Salat reminder: Melodic dong sequence (deep resonant bell sound)
// 3 descending tones — spiritual feel, loud enough to hear from another room
export const playAdhanBeep = () => {
    try {
        const AudioContext = window.AudioContext || (window as any).webkitAudioContext;
        if (!AudioContext) return;
        const ctx = new AudioContext();
        const notes = [523.25, 440, 349.23]; // C5, A4, F4 — descending triad
        notes.forEach((freq, i) => {
            const baseTime = ctx.currentTime + i * 0.7;
            // Main tone
            const osc = ctx.createOscillator();
            const gain = ctx.createGain();
            osc.connect(gain); gain.connect(ctx.destination);
            osc.frequency.value = freq;
            osc.type = 'sine';
            gain.gain.setValueAtTime(0.3, baseTime);
            gain.gain.exponentialRampToValueAtTime(0.001, baseTime + 0.65);
            osc.start(baseTime);
            osc.stop(baseTime + 0.65);
            // Harmonic overtone for richness
            const osc2 = ctx.createOscillator();
            const gain2 = ctx.createGain();
            osc2.connect(gain2); gain2.connect(ctx.destination);
            osc2.frequency.value = freq * 2; // octave up
            osc2.type = 'sine';
            gain2.gain.setValueAtTime(0.1, baseTime);
            gain2.gain.exponentialRampToValueAtTime(0.001, baseTime + 0.4);
            osc2.start(baseTime);
            osc2.stop(baseTime + 0.4);
        });
    } catch (e) {}
};

// Circuit Breaker beep: 3 insistent low-pitched pulses (330Hz)
export const playBreakerBeep = () => {
    try {
        const AudioContext = window.AudioContext || (window as any).webkitAudioContext;
        if (!AudioContext) return;
        const ctx = new AudioContext();
        for (let i = 0; i < 3; i++) {
            const osc = ctx.createOscillator();
            const gain = ctx.createGain();
            osc.connect(gain); gain.connect(ctx.destination);
            osc.frequency.value = 330; // E4 grave
            osc.type = 'square';
            const start = ctx.currentTime + i * 0.3;
            gain.gain.setValueAtTime(0.06, start);
            gain.gain.exponentialRampToValueAtTime(0.00001, start + 0.2);
            osc.start(start);
            osc.stop(start + 0.2);
        }
    } catch (e) {}
};

// Agenda Reminder chime: 2-note ascending doorbell (D5 -> G5)
// Distinct from all other sounds — pleasant, attention-grabbing
export const playAgendaChime = () => {
    try {
        const AudioContext = window.AudioContext || (window as any).webkitAudioContext;
        if (!AudioContext) return;
        const ctx = new AudioContext();
        // Note 1: D5 (587 Hz)
        const osc1 = ctx.createOscillator();
        const gain1 = ctx.createGain();
        osc1.connect(gain1); gain1.connect(ctx.destination);
        osc1.frequency.value = 587;
        osc1.type = 'sine';
        gain1.gain.setValueAtTime(0.15, ctx.currentTime);
        gain1.gain.exponentialRampToValueAtTime(0.001, ctx.currentTime + 0.3);
        osc1.start(ctx.currentTime);
        osc1.stop(ctx.currentTime + 0.3);
        // Note 2: G5 (784 Hz) — ascending = positive/anticipatory
        const osc2 = ctx.createOscillator();
        const gain2 = ctx.createGain();
        osc2.connect(gain2); gain2.connect(ctx.destination);
        osc2.frequency.value = 784;
        osc2.type = 'sine';
        gain2.gain.setValueAtTime(0.15, ctx.currentTime + 0.35);
        gain2.gain.exponentialRampToValueAtTime(0.001, ctx.currentTime + 0.7);
        osc2.start(ctx.currentTime + 0.35);
        osc2.stop(ctx.currentTime + 0.7);
    } catch (e) {}
};

// --- BACKUP SYSTEM / TIME MACHINE ---
const BACKUP_KEY = 'sys_diag_snapshots';

export const getBackups = (): Backup[] => {
    try {
        let raw = localStorage.getItem(BACKUP_KEY);
        // Migration from old key
        if (!raw) {
            raw = localStorage.getItem('huzine_snapshots');
            if (raw) { localStorage.setItem(BACKUP_KEY, raw); localStorage.removeItem('huzine_snapshots'); }
        }
        if (!raw) return [];
        return JSON.parse(raw);
    } catch (e) { return []; }
};

// --- NOTIFICATION SYSTEM (Background Eye Care / Circuit Breaker) ---
export const requestNotificationPermission = async () => {
    if ('Notification' in window && Notification.permission === 'default') {
        await Notification.requestPermission();
    }
};

export const sendSystemNotification = (title: string, body: string) => {
    if ('Notification' in window && Notification.permission === 'granted') {
        new Notification(title, { body, icon: '/favicon.ico', silent: false });
    }
};

export const saveSnapshot = (data: AppData, force: boolean = false) => {
    try {
        const backups = getBackups();
        const now = Date.now();
        if (!force && backups.length > 0) {
            const last = backups[0];
            if (now - last.timestamp < 30 * 60 * 1000) return; 
        }

        const newBackup: Backup = {
            id: crypto.randomUUID(),
            timestamp: now,
            dateStr: new Date(now).toLocaleString('fr-FR'),
            trigger: force ? 'Manuel' : 'Auto-Save',
            data: JSON.parse(JSON.stringify(data)) 
        };

        const updated = [newBackup, ...backups].slice(0, 20);
        localStorage.setItem(BACKUP_KEY, JSON.stringify(updated));
        // Silent in production — no console trace
    } catch (e) {
        console.error("Backup failed", e);
    }
};
