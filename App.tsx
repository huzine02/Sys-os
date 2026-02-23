
import React, { useState, useEffect, useRef, useCallback } from 'react';
import {
    AppData, Task, TaskType, ViewType, Settings,
    DayConfig, AgendaEvent, PrayerTimes, Backup
} from './types';
import {
    DAY_CONFIGS, getTaskDuration,
    getThemeColor, getGreeting,
    INITIAL_DATA, fetchPrayerTimes, playSoftBeep,
    sanitizeForOffice, encryptData, decryptData,
    calculateConsumedBudget, ASSETS_KEYS,
    saveSnapshot, getBackups,
    requestNotificationPermission, sendSystemNotification,
    playEyeCareBeep, playBreakerBeep, playTaskTimerBeep, playAdhanBeep
} from './utils';
import { Button, Input, Card } from './components/UI';
import { Icons } from './components/Icons';
import TaskRow from './components/TaskRow';
import { FocusOverlay, ShutdownModal, CircuitBreakerOverlay, CorporateMask, EyeCareOverlay } from './components/Overlays';
import CommandCenter from './components/CommandCenter';

export type ExtendedViewType = ViewType | 'journal' | 'agenda';

// --- NEW TASK MODAL ---
const NewTaskModal = ({ active, onClose, onAdd, defaultType, isOfficeMode, settings }: { active: boolean, onClose: () => void, onAdd: (t: TaskType, txt: string) => void, defaultType?: TaskType, isOfficeMode: boolean, settings: Settings }) => {
    const [text, setText] = useState("");
    const [type, setType] = useState<TaskType>(defaultType || 'pro');
    const [duration, setDuration] = useState<number | null>(null);

    useEffect(() => {
        if(active) { setText(""); setDuration(null); if(defaultType) setType(defaultType); }
    }, [active, defaultType]);

    if (!active) return null;

    return (
        <div className="fixed inset-0 z-[100] bg-black/80 backdrop-blur-sm flex items-center justify-center p-4">
            <div className={`border rounded-2xl p-6 max-w-md w-full shadow-2xl animate-slide-up ${isOfficeMode ? 'bg-white border-gray-200' : 'bg-[#0F1115] border-white/10'}`}>
                <h3 className={`font-bold mb-4 flex items-center gap-2 ${isOfficeMode ? 'text-gray-800' : 'text-white'}`}><Icons.Plus size={18}/> {isOfficeMode ? 'NEW TICKET' : 'AJOUTER TÂCHE'}</h3>
                <div className="space-y-4">
                    <div>
                        <label className={`text-xs uppercase mb-1 block ${isOfficeMode ? 'text-gray-500' : 'text-slate-500'}`}>{isOfficeMode ? 'Subject' : 'Titre'}</label>
                        <Input autoFocus value={text} onChange={e => setText(e.target.value)} placeholder={isOfficeMode ? 'Ex: Review config...' : 'Ex: Réviser devis...'} />
                    </div>
                    <div>
                        <label className={`text-xs uppercase mb-1 block ${isOfficeMode ? 'text-gray-500' : 'text-slate-500'}`}>{isOfficeMode ? 'Category' : 'Catégorie'}</label>
                        <select className={`w-full border rounded-lg px-3 py-2.5 text-sm focus:outline-none ${isOfficeMode ? 'bg-gray-50 border-gray-200 text-gray-800' : 'bg-bg-surface border-white/[0.08] text-slate-200'}`} value={type} onChange={(e) => setType(e.target.value as TaskType)}>
                            <option value="pro">{sanitizeForOffice("pro", isOfficeMode, settings)}</option>
                            <option value="saas">{sanitizeForOffice("saas", isOfficeMode, settings)}</option>
                            <option value="patri">{sanitizeForOffice("patri", isOfficeMode, settings)}</option>
                            {ASSETS_KEYS.map((key) => (<option key={key} value={key}>  {sanitizeForOffice(key, isOfficeMode, settings)}</option>))}
                            <option value="vie">{sanitizeForOffice("vie", isOfficeMode, settings)}</option>
                        </select>
                    </div>
                    <div>
                        <label className={`text-xs uppercase mb-2 block ${isOfficeMode ? 'text-gray-500' : 'text-slate-500'}`}>{isOfficeMode ? 'Est. Time (Min)' : 'Durée (Min)'}</label>
                        <div className="grid grid-cols-6 gap-2">
                            {[2, 5, 10, 15, 30, 60].map(m => (
                                <button key={m} onClick={() => setDuration(m)} className={`py-2 rounded border text-xs font-bold transition-all ${duration === m ? 'bg-blue-600 border-blue-500 text-white' : isOfficeMode ? 'bg-gray-50 border-gray-200 text-gray-600' : 'bg-white/5 border-white/10 text-slate-400 hover:bg-white/10'}`}>{m}</button>
                            ))}
                        </div>
                    </div>
                    <div className="pt-2 flex gap-3">
                        <Button className={`flex-1 ${isOfficeMode ? 'bg-gray-100 text-gray-600' : 'bg-white/5'}`} onClick={onClose}>{isOfficeMode ? 'Cancel' : 'Annuler'}</Button>
                        <Button className={`flex-1 ${!text || !duration ? 'opacity-50 cursor-not-allowed' : 'bg-pro text-white'}`} disabled={!text || !duration} onClick={() => { if (text && duration) { onAdd(type, `${text} (${duration})`); onClose(); } }}>{isOfficeMode ? 'Submit' : 'Valider'}</Button>
                    </div>
                </div>
            </div>
        </div>
    );
};

// --- LOGIN SCREEN ---
const LoginScreen = ({ onLogin, onLog }: { onLogin: (t: string, i: string) => void, onLog: (msg: string) => void }) => {
    const [tempToken, setTempToken] = useState("");
    const [tempId, setTempId] = useState("");
    const [loading, setLoading] = useState(false);
    const [error, setError] = useState("");

    const handleConnect = async () => {
        setLoading(true); setError("");
        const cleanToken = tempToken.trim();
        let cleanId = tempId.trim();
        if(cleanId.includes('gist.github.com')) cleanId = cleanId.split('/').pop() || "";
        onLog(`[Login] Token: ${cleanToken ? 'OK' : 'KO'} / ID: ${cleanId}`);
        try {
            const res = await fetch(`https://api.github.com/gists/${cleanId}?t=${Date.now()}`, { headers: cleanToken ? { 'Authorization': `token ${cleanToken}` } : {} });
            if(res.status === 401) throw new Error("Token refusé (401).");
            if(res.status === 404) throw new Error("Gist introuvable (404).");
            if(!res.ok) throw new Error(`Erreur API (${res.status})`);
            await res.json();
            onLog("[Login] OK"); onLogin(cleanToken, cleanId);
        } catch (e: any) { setError(e.message); onLog("[Login] FAIL: " + e.message); }
        setLoading(false);
    };

    return (
        <div className="fixed inset-0 z-[999] bg-[#050507] flex items-center justify-center p-6 text-slate-200">
            <div className="max-w-md w-full animate-slide-up">
                <div className="text-center mb-8">
                    <Icons.Activity size={48} className="mx-auto text-blue-500 mb-4" />
                    <h1 className="text-2xl font-bold text-white tracking-widest">SYS-OS // RECOVERY</h1>
                </div>
                <Card className="p-8 space-y-6 bg-[#0E0F14] border-blue-500/20 shadow-glow">
                    <div className="text-xs text-blue-400 border border-blue-500/20 bg-blue-500/10 p-3 rounded mb-4 leading-relaxed"><strong>CONNEXION</strong><br/>Entrez vos identifiants GitHub Gist.</div>
                    <div><label className="text-xs font-bold text-slate-400 uppercase mb-2 block">1. GitHub Token</label><Input type="password" value={tempToken} onChange={e => setTempToken(e.target.value)} className="bg-[#050507]" placeholder="ghp_..." /></div>
                    <div><label className="text-xs font-bold text-slate-400 uppercase mb-2 block">2. Gist ID</label><Input value={tempId} onChange={e => setTempId(e.target.value)} className="bg-[#050507]" placeholder="d1e..." /></div>
                    {error && <div className="text-red-400 text-xs p-2 border border-red-500/20 bg-red-500/10 rounded">{error}</div>}
                    <Button variant="primary" className="w-full" onClick={handleConnect} disabled={loading}>{loading ? "..." : "CONNECTER"}</Button>
                    <button onClick={() => { localStorage.clear(); window.location.reload(); }} className="w-full text-xs text-slate-600 hover:text-red-500 mt-4 underline">Reset local data</button>
                </Card>
            </div>
        </div>
    );
};

// ============================================
// MAIN APP
// ============================================
export default function App() {
    const [data, setData] = useState<AppData>(() => {
        try {
            // Migration: try new key first, fallback to old key
            let savedData = localStorage.getItem('sys_diag_cache');
            if (!savedData) {
                savedData = localStorage.getItem('huzine_os_secure');
                if (savedData) {
                    // Migrate to new key and remove old
                    localStorage.setItem('sys_diag_cache', savedData);
                    localStorage.removeItem('huzine_os_secure');
                }
            }
            if (savedData) {
                const parsed = decryptData(savedData);
                if (parsed && parsed.settings) {
                    return { ...INITIAL_DATA, ...parsed, settings: { ...parsed.settings, gistToken: parsed.settings.gistToken || INITIAL_DATA.settings.gistToken, gistId: parsed.settings.gistId || INITIAL_DATA.settings.gistId }, weeklyConfig: parsed.weeklyConfig || DAY_CONFIGS };
                }
            }
        } catch (e) { console.error("[INIT] Error", e); }
        return INITIAL_DATA;
    });

    const [currentView, setCurrentView] = useState<ExtendedViewType>('dashboard');
    const [currentTime, setCurrentTime] = useState(new Date().toLocaleTimeString('en-US', { hour: '2-digit', minute: '2-digit', hour12: false }));
    const [focusTask, setFocusTask] = useState<Task | null>(null);
    const [showShutdown, setShowShutdown] = useState(false);
    const [showCorporateMask, setShowCorporateMask] = useState(false);
    const [showSettings, setShowSettings] = useState(false);
    const [flashSync, setFlashSync] = useState(false);
    const [backupsList, setBackupsList] = useState<Backup[]>([]);
    const [showTaskModal, setShowTaskModal] = useState(false);
    const [modalDefaultType, setModalDefaultType] = useState<TaskType>('pro');
    const [syncStatus, setSyncStatus] = useState<'idle' | 'syncing' | 'success' | 'error' | 'pending'>('idle');
    const syncTimeoutRef = useRef<ReturnType<typeof setTimeout> | null>(null);
    const [debugLogs, setDebugLogs] = useState<string[]>([]);
    const [showDebug, setShowDebug] = useState(false);
    const SESSION_ID = useRef(crypto.randomUUID()).current;
    const importFileInputRef = useRef<HTMLInputElement>(null);
    const dataRef = useRef(data);
    useEffect(() => { dataRef.current = data; }, [data]);

    const log = (msg: string) => { setDebugLogs(prev => [`[${new Date().toLocaleTimeString()}] ${msg}`, ...prev].slice(0, 50)); };

    // Timer states (timestamp-based for background reliability)
    const [prayerTimes, setPrayerTimes] = useState<PrayerTimes | null>(null);
    const [showBreaker, setShowBreaker] = useState(false);
    const [curfewActive, setCurfewActive] = useState(false);
    const [overrideCurfew, setOverrideCurfew] = useState(false);
    const [eyeCareStartTime, setEyeCareStartTime] = useState(Date.now());
    const [eyeBreakActive, setEyeBreakActive] = useState(false);
    const [breakCountdown, setBreakCountdown] = useState(20);
    const [eyeTimeLeft, setEyeTimeLeft] = useState(1200);
    const [breakerStartTime, setBreakerStartTime] = useState(Date.now());
    // Focus timer (managed by Web Worker for background reliability)
    const [focusElapsed, setFocusElapsed] = useState(0);
    const [focusRunning, setFocusRunning] = useState(false);
    const focusStartTimeRef = useRef(0);
    const focusAlertFiredRef = useRef(false);
    // Inline task timer (click-to-start countdown, NOT fullscreen)
    const [timerTask, setTimerTask] = useState<Task | null>(null);
    const [timerElapsed, setTimerElapsed] = useState(0);
    const [timerRunning, setTimerRunning] = useState(false);
    const timerStartTimeRef = useRef(0);
    const timerAlertFiredRef = useRef(false);
    // Adhan alerts tracking (set of "prayerName-HH:MM" already fired)
    const adhanFiredRef = useRef<Set<string>>(new Set());

    const todayStr = new Date().toISOString().split('T')[0];
    const [newAgendaTitle, setNewAgendaTitle] = useState("");
    const [newAgendaTime, setNewAgendaTime] = useState("");
    const [newAgendaDate, setNewAgendaDate] = useState(todayStr);
    const [newAgendaDuration, setNewAgendaDuration] = useState("30");
    const [newAgendaImportant, setNewAgendaImportant] = useState(false);
    const [newJournalEntry, setNewJournalEntry] = useState("");

    // --- HELPERS ---
    const getDayConfig = (dayIndex: number): DayConfig => (data.weeklyConfig && data.weeklyConfig[dayIndex]) ? data.weeklyConfig[dayIndex] : (DAY_CONFIGS[dayIndex] || DAY_CONFIGS[1]);
    const currentDayIndex = new Date().getDay();
    const dayConfig = getDayConfig(currentDayIndex);
    const isVpnMode = data.settings.vpnMode;
    const isOfficeSanitization = isVpnMode;

    const vpnAppName = data.settings.vpnAppName || 'Planner';
    const userName = data.settings.userName || 'Operator';
    useEffect(() => { document.title = isVpnMode ? vpnAppName : "SYS-OS // Main"; }, [isVpnMode, vpnAppName]);

    const visibleCategories = ['pro', 'saas', 'patri', 'vie'];
    const appBg = isVpnMode ? 'bg-gray-50 text-gray-900' : 'bg-[#050507] text-slate-200 selection:bg-pro selection:text-white';
    const headerBg = isVpnMode ? 'bg-white border-b border-gray-200' : 'bg-bg-deep/80 backdrop-blur-md border-b border-white/[0.06]';
    const mutedText = isVpnMode ? 'text-gray-500' : 'text-slate-500';
    const textColor = isVpnMode ? 'text-gray-900' : 'text-slate-200';
    const getCardClass = (extra: string = "") => isVpnMode ? `bg-white border border-gray-200 shadow-sm rounded-xl ${extra}` : `bg-bg-surface/50 backdrop-blur-xl border border-white/[0.08] rounded-2xl shadow-xl ${extra}`;

    // --- SAFE DATA SETTER (immediate localStorage persist) ---
    const setSafeData = useCallback((fn: (prev: AppData) => AppData) => {
        setData(prev => {
            const next = fn(prev);
            const stamped = { ...next, updatedBy: SESSION_ID, lastSynced: Date.now() };
            try { localStorage.setItem('sys_diag_cache', encryptData(stamped)); } catch(e) {}
            return stamped;
        });
    }, [SESSION_ID]);

    const toggleTaskSafe = (id: number) => setSafeData(prev => ({ ...prev, tasks: prev.tasks.map(t => t.id !== id ? t : { ...t, done: !t.done, completedAt: !t.done ? new Date().toISOString() : undefined }) }));
    const updateTaskSafe = (id: number, updates: Partial<Task>) => setSafeData(prev => ({...prev, tasks: prev.tasks.map(t => t.id === id ? { ...t, ...updates } : t)}));
    const deleteTaskSafe = (id: number) => setSafeData(prev => ({...prev, tasks: prev.tasks.filter(t => t.id !== id)}));
    const toggleTodayStar = (id: number) => { const t = data.tasks.find(tk => tk.id === id); if (t) updateTaskSafe(id, { todayStar: !t.todayStar }); };

    const getBudgetStatus = (type: 'pro' | 'saas' | 'patri' | 'vie') => {
        const budget = dayConfig.budgets[type] || 0;
        const consumed = calculateConsumedBudget(data.tasks, data.agenda, type, todayStr);
        const pct = budget > 0 ? (consumed / budget) * 100 : 0;
        return { budget, consumed, pct: Math.min(100, pct) };
    };

    const getNextPrayer = () => {
        if (!prayerTimes) return null;
        const now = new Date(); const cm = now.getHours() * 60 + now.getMinutes();
        const prayers = [{ name: 'Fajr', time: prayerTimes.Fajr }, { name: 'Dhuhr', time: prayerTimes.Dhuhr }, { name: 'Asr', time: prayerTimes.Asr }, { name: 'Maghrib', time: prayerTimes.Maghrib }, { name: 'Isha', time: prayerTimes.Isha }];
        for (const p of prayers) { const [h, m] = p.time.split(':').map(Number); const pm = h * 60 + m; if (pm > cm) { const d = pm - cm; return { name: p.name, time: p.time, diff: `${Math.floor(d/60) > 0 ? Math.floor(d/60)+'h':''}${d%60}min` }; } }
        return { name: 'Fajr', time: prayerTimes.Fajr, diff: 'Demain' };
    };
    const nextPrayer = getNextPrayer();

    const radarEvents = (() => {
        const today = new Date(); today.setHours(0,0,0,0);
        return (data.agenda || []).filter(e => { const d = new Date(e.date); d.setHours(0,0,0,0); const diff = Math.ceil((d.getTime() - today.getTime()) / 86400000); return diff >= 0 && diff <= 7; }).sort((a,b) => new Date(a.date).getTime() - new Date(b.date).getTime());
    })();

    // ============ SYNC ENGINE V9 ============
    const syncToGist = useCallback(async (dataToSync: AppData, token: string, id: string) => {
        if (!token || !id) return;
        if (dataToSync.settings.vpnMode) { log("[PUSH] Blocked: VPN mode active"); return; }
        setSyncStatus('syncing');
        try {
            const safe = { ...dataToSync, settings: { ...dataToSync.settings, gistToken: "", gistId: "" } };
            await fetch(`https://api.github.com/gists/${id}`, { method: 'PATCH', headers: { 'Authorization': `token ${token}`, 'Content-Type': 'application/json' }, body: JSON.stringify({ files: { 'sys_data.json': { content: JSON.stringify(safe, null, 2) } } }), cache: 'no-store' });
            setSyncStatus('success'); setTimeout(() => setSyncStatus('idle'), 2000);
        } catch (e: any) { log("[PUSH] ERR: " + e.message); setSyncStatus('error'); }
    }, []);

    const pullFromGist = useCallback(async () => {
        const c = dataRef.current;
        if (!c.settings.gistToken || !c.settings.gistId || c.settings.vpnMode || document.hidden) return;
        try {
            const res = await fetch(`https://api.github.com/gists/${c.settings.gistId}?ts=${Date.now()}`, { headers: { 'Authorization': `token ${c.settings.gistToken}` }, cache: 'no-store' });
            if (!res.ok) return;
            const json = await res.json();
            const file = json.files['sys_data.json'] || json.files['huzine_db.json'];
            if (!file?.content) return;
            const remote = JSON.parse(file.content) as AppData;
            if (remote.updatedBy === SESSION_ID) return;
            if (remote.lastSynced <= (c.lastSynced || 0)) return;
            const ae = document.activeElement;
            if (ae && (ae.tagName === 'INPUT' || ae.tagName === 'TEXTAREA')) return;
            log("[PULL] Remote update applied.");
            setFlashSync(true); setTimeout(() => setFlashSync(false), 1000);
            setData(prev => ({ ...prev, ...remote, weeklyConfig: remote.weeklyConfig || prev.weeklyConfig || DAY_CONFIGS, settings: { ...prev.settings, ...remote.settings, gistToken: c.settings.gistToken, gistId: c.settings.gistId } }));
            setSyncStatus('success');
        } catch (e: any) { log("[PULL] Err: " + e.message); }
    }, [SESSION_ID]);

    const addNewTask = (type: TaskType, text: string) => {
        if (!text) return;
        setSafeData(p => ({ ...p, tasks: [{ id: Date.now(), type, text, done: false, priority: 'M', todayStar: false, createdAt: new Date().toISOString() }, ...p.tasks] }));
    };

    // --- INIT ---
    useEffect(() => {
        requestNotificationPermission();
        if (!isVpnMode) fetchPrayerTimes().then(setPrayerTimes);
        const params = new URLSearchParams(window.location.search);
        const ut = params.get('token'), ui = params.get('id');
        if (ut && ui) { setSafeData(prev => ({ ...prev, settings: { ...prev.settings, gistToken: ut, gistId: ui } })); window.history.replaceState({}, document.title, window.location.pathname); }
        // Keyboard shortcuts
        const hk = (e: KeyboardEvent) => {
            // Panic key: Escape ALWAYS shows mask. Ctrl+Shift+H hides it (secret combo).
            if (e.key === 'Escape') { setShowCorporateMask(true); }
            if (e.key === 'h' && e.ctrlKey && e.shiftKey) { e.preventDefault(); setShowCorporateMask(false); }
            // N = New task (only when not typing in an input)
            const ae = document.activeElement;
            const isTyping = ae && (ae.tagName === 'INPUT' || ae.tagName === 'TEXTAREA' || ae.tagName === 'SELECT');
            if (e.key === 'n' && !e.ctrlKey && !e.metaKey && !e.altKey && !isTyping) { setShowTaskModal(true); }
        };
        window.addEventListener('keydown', hk);
        return () => window.removeEventListener('keydown', hk);
    }, []); // eslint-disable-line

    // --- SYNC POLLING (5s) ---
    useEffect(() => {
        const { gistToken, gistId } = data.settings;
        if (!gistToken || !gistId || data.settings.vpnMode) return;
        pullFromGist();
        const iv = setInterval(pullFromGist, 5000);
        return () => clearInterval(iv);
    }, [data.settings.gistId, data.settings.gistToken, data.settings.vpnMode, pullFromGist]);

    // --- PUSH ON CHANGE (debounced) ---
    useEffect(() => {
        if (data === INITIAL_DATA || data.settings.vpnMode) return;
        saveSnapshot(data);
        if (data.settings.gistId && data.settings.gistToken && data.updatedBy === SESSION_ID) {
            if (syncTimeoutRef.current) clearTimeout(syncTimeoutRef.current);
            setSyncStatus('pending');
            syncTimeoutRef.current = setTimeout(() => { syncToGist(data, data.settings.gistToken, data.settings.gistId); }, 1500);
        }
    }, [data, SESSION_ID, syncToGist]);

    // --- BEFOREUNLOAD + VISIBILITY ---
    useEffect(() => {
        const onUnload = () => {
            const d = dataRef.current;
            try { localStorage.setItem('sys_diag_cache', encryptData(d)); } catch(e) {}
            if (d.settings.gistId && d.settings.gistToken && !d.settings.vpnMode) {
                const safe = { ...d, settings: { ...d.settings, gistToken: "", gistId: "" } };
                const blob = new Blob([JSON.stringify({ files: { 'sys_data.json': { content: JSON.stringify(safe, null, 2) } } })], { type: 'application/json' });
                navigator.sendBeacon?.(`https://api.github.com/gists/${d.settings.gistId}`, blob);
            }
        };
        const onVis = () => { if (!document.hidden) pullFromGist(); };
        window.addEventListener('beforeunload', onUnload);
        document.addEventListener('visibilitychange', onVis);
        return () => { window.removeEventListener('beforeunload', onUnload); document.removeEventListener('visibilitychange', onVis); };
    }, [pullFromGist]);

    // --- TIMERS (Web Worker — immune to background throttling) ---
    const workerRef = useRef<Worker | null>(null);
    const [eyeBreakStartedAt, setEyeBreakStartedAt] = useState(0);

    // Refs for Worker closure (prevents stale closures and unnecessary worker recreation)
    const eyeCareEnabledRef = useRef(data.settings.eyeCare);
    const eyeBreakActiveRef = useRef(eyeBreakActive);
    const eyeCareStartTimeRef = useRef(eyeCareStartTime);
    const eyeBreakStartedAtRef = useRef(eyeBreakStartedAt);
    const breakerStartTimeRef = useRef(breakerStartTime);
    const showBreakerRef = useRef(showBreaker);
    const overrideCurfewRef = useRef(overrideCurfew);
    const isVpnModeRef = useRef(isVpnMode);
    const focusRunningRef = useRef(focusRunning);
    const focusTaskRef = useRef(focusTask);
    const timerRunningRef = useRef(timerRunning);
    const timerTaskRef = useRef(timerTask);
    const prayerTimesRef = useRef(prayerTimes);

    // Keep refs in sync
    useEffect(() => { eyeCareEnabledRef.current = data.settings.eyeCare; }, [data.settings.eyeCare]);
    useEffect(() => { eyeBreakActiveRef.current = eyeBreakActive; }, [eyeBreakActive]);
    useEffect(() => { eyeCareStartTimeRef.current = eyeCareStartTime; }, [eyeCareStartTime]);
    useEffect(() => { eyeBreakStartedAtRef.current = eyeBreakStartedAt; }, [eyeBreakStartedAt]);
    useEffect(() => { breakerStartTimeRef.current = breakerStartTime; }, [breakerStartTime]);
    useEffect(() => { showBreakerRef.current = showBreaker; }, [showBreaker]);
    useEffect(() => { overrideCurfewRef.current = overrideCurfew; }, [overrideCurfew]);
    useEffect(() => { isVpnModeRef.current = isVpnMode; }, [isVpnMode]);
    useEffect(() => { focusRunningRef.current = focusRunning; }, [focusRunning]);
    useEffect(() => { focusTaskRef.current = focusTask; }, [focusTask]);
    useEffect(() => { timerRunningRef.current = timerRunning; }, [timerRunning]);
    useEffect(() => { timerTaskRef.current = timerTask; }, [timerTask]);
    useEffect(() => { prayerTimesRef.current = prayerTimes; }, [prayerTimes]);

    useEffect(() => {
        // Create Web Worker ONCE for reliable 1s ticks even in background
        const blob = new Blob([`
            let id = null;
            self.onmessage = function(e) {
                if (e.data === 'start') { if (id) clearInterval(id); id = setInterval(() => self.postMessage('tick'), 1000); }
                if (e.data === 'stop') { if (id) clearInterval(id); id = null; }
            };
        `], { type: 'application/javascript' });
        const worker = new Worker(URL.createObjectURL(blob));
        workerRef.current = worker;

        worker.onmessage = () => {
            const now = new Date();
            const locale = isVpnModeRef.current ? 'en-US' : 'fr-FR';
            setCurrentTime(now.toLocaleTimeString(locale, { hour: '2-digit', minute: '2-digit', hour12: false }));

            // Eye Care: timestamp-based (no drift) — uses refs to avoid stale closures
            if (eyeCareEnabledRef.current && !eyeBreakActiveRef.current) {
                const elapsed = Math.floor((Date.now() - eyeCareStartTimeRef.current) / 1000);
                const remaining = Math.max(0, 1200 - elapsed);
                setEyeTimeLeft(remaining);
                if (remaining <= 0) {
                    setEyeBreakActive(true);
                    eyeBreakActiveRef.current = true;
                    const startedAt = Date.now();
                    setEyeBreakStartedAt(startedAt);
                    eyeBreakStartedAtRef.current = startedAt;
                    sendSystemNotification(isVpnModeRef.current ? "SCREEN BREAK" : "PROTOCOLE RETINIEN", isVpnModeRef.current ? "Look at an object 20ft away for 20s." : "Regarde un objet a 6m pendant 20s.");
                    playEyeCareBeep();
                }
            } else if (eyeBreakActiveRef.current) {
                const breakElapsed = Math.floor((Date.now() - eyeBreakStartedAtRef.current) / 1000);
                const breakRemaining = Math.max(0, 20 - breakElapsed);
                setBreakCountdown(breakRemaining);
                if (breakRemaining <= 0) {
                    setEyeBreakActive(false);
                    eyeBreakActiveRef.current = false;
                    const newStart = Date.now();
                    setEyeCareStartTime(newStart);
                    eyeCareStartTimeRef.current = newStart;
                    playSoftBeep();
                }
            }

            // Curfew
            if (!isVpnModeRef.current) {
                const h = now.getHours(), m = now.getMinutes();
                setCurfewActive(!overrideCurfewRef.current && ((h === 22 && m >= 45) || h > 22 || h < 5));
            } else setCurfewActive(false);

            // Circuit Breaker (90 min)
            const be = Math.floor((Date.now() - breakerStartTimeRef.current) / 1000);
            if (be >= 5400 && !showBreakerRef.current) {
                setShowBreaker(true);
                showBreakerRef.current = true;
                sendSystemNotification(isVpnModeRef.current ? "SESSION TIMEOUT" : "CIRCUIT OUVERT", isVpnModeRef.current ? "90 min continuous. Take a break." : "90 min d'activite. Pause obligatoire.");
                playBreakerBeep();
            }

            // Adhan / Salat reminder (5 min before + at time)
            if (!isVpnModeRef.current && prayerTimesRef.current) {
                const pt = prayerTimesRef.current;
                const nowMins = now.getHours() * 60 + now.getMinutes();
                const prayers = [
                    { name: 'Fajr', time: pt.Fajr },
                    { name: 'Dhuhr', time: pt.Dhuhr },
                    { name: 'Asr', time: pt.Asr },
                    { name: 'Maghrib', time: pt.Maghrib },
                    { name: 'Isha', time: pt.Isha }
                ];
                for (const p of prayers) {
                    const [ph, pm] = p.time.split(':').map(Number);
                    const prayerMins = ph * 60 + pm;
                    // Alert 5 min before
                    const key5 = `${p.name}-5min`;
                    if (nowMins === prayerMins - 5 && now.getSeconds() < 2 && !adhanFiredRef.current.has(key5)) {
                        adhanFiredRef.current.add(key5);
                        playAdhanBeep();
                        sendSystemNotification(`${p.name} dans 5 min`, `${p.time} — Prepare-toi pour la salat`);
                    }
                    // Alert at prayer time
                    const key0 = `${p.name}-now`;
                    if (nowMins === prayerMins && now.getSeconds() < 2 && !adhanFiredRef.current.has(key0)) {
                        adhanFiredRef.current.add(key0);
                        playAdhanBeep();
                        playAdhanBeep(); // double dong at exact time
                        sendSystemNotification(`${p.name} — SALAT`, `${p.time} — C'est l'heure`);
                    }
                }
                // Reset fired alerts at midnight
                if (now.getHours() === 0 && now.getMinutes() === 0 && now.getSeconds() < 2) {
                    adhanFiredRef.current.clear();
                }
            }

            // Focus Timer (background-immune via Worker)
            if (focusRunningRef.current && focusStartTimeRef.current > 0) {
                const elapsed = Math.floor((Date.now() - focusStartTimeRef.current) / 1000);
                setFocusElapsed(elapsed);
                const ft = focusTaskRef.current;
                if (ft && !focusAlertFiredRef.current) {
                    const durMins = getTaskDuration(ft.text);
                    const targetSec = durMins > 0.5 ? durMins * 60 : 1500;
                    if (elapsed >= targetSec) {
                        focusAlertFiredRef.current = true;
                        playTaskTimerBeep();
                        sendSystemNotification(isVpnModeRef.current ? "TIME'S UP" : "TEMPS ECOULE", isVpnModeRef.current ? `"${ft.text}" — estimated time reached` : `"${ft.text}" — duree estimee atteinte !`);
                    }
                    if (elapsed > targetSec && (elapsed - targetSec) % 600 === 0 && elapsed !== targetSec) {
                        playTaskTimerBeep();
                        sendSystemNotification(isVpnModeRef.current ? "REMINDER" : "RAPPEL", isVpnModeRef.current ? `Overtime on "${ft.text}"` : `Tu depasses le temps sur "${ft.text}"`);
                    }
                }
            }

            // Inline Task Timer (click-to-start, background-immune via Worker)
            if (timerRunningRef.current && timerStartTimeRef.current > 0) {
                const elapsed = Math.floor((Date.now() - timerStartTimeRef.current) / 1000);
                setTimerElapsed(elapsed);
                const tt = timerTaskRef.current;
                if (tt && !timerAlertFiredRef.current) {
                    // Extract raw minutes from "(N)" in task text
                    const rawMatch = tt.text.match(/\((\d+)\)/);
                    const rawMins = rawMatch ? parseInt(rawMatch[1], 10) : 0;
                    const targetSec = rawMins >= 1 ? rawMins * 60 : 1500;
                    if (elapsed >= targetSec) {
                        timerAlertFiredRef.current = true;
                        playTaskTimerBeep();
                        sendSystemNotification(isVpnModeRef.current ? "TIME'S UP" : "TEMPS ECOULE", isVpnModeRef.current ? `"${tt.text}" — done!` : `"${tt.text}" — termine !`);
                    }
                    if (elapsed > targetSec && (elapsed - targetSec) % 300 === 0 && elapsed !== targetSec) {
                        playTaskTimerBeep();
                        sendSystemNotification(isVpnModeRef.current ? "OVERTIME" : "DEPASSEMENT", isVpnModeRef.current ? `Still running: "${tt.text}"` : `Encore en cours : "${tt.text}"`);
                    }
                }
            }
        };

        worker.postMessage('start');
        return () => { worker.postMessage('stop'); worker.terminate(); };
    }, []); // Empty deps = Worker created ONCE, refs handle all dynamic values

    // --- EXPORT / IMPORT ---
    const exportToJson = () => { const b = new Blob([JSON.stringify(data, null, 2)], { type: "application/json" }); const u = URL.createObjectURL(b); const l = document.createElement('a'); l.href = u; l.download = `sys_backup_${todayStr}.json`; document.body.appendChild(l); l.click(); document.body.removeChild(l); };
    const handleImportJson = (e: React.ChangeEvent<HTMLInputElement>) => {
        const file = e.target.files?.[0]; if (!file) return;
        const reader = new FileReader();
        reader.onload = (ev) => { try { const json = JSON.parse(ev.target?.result as string); if (json.tasks && json.settings) { if(confirm("Écraser toutes les données ?")) { setSafeData(() => ({ ...INITIAL_DATA, ...json })); setShowSettings(false); } } else { alert("Fichier invalide."); } } catch { alert("Erreur JSON."); } };
        reader.readAsText(file); e.target.value = '';
    };

    // --- COMPUTED ---
    const activeTasks = data.tasks.filter(t => !t.done);
    const top3 = data.tasks.filter(t => !t.done && t.todayStar).sort((a) => (a.priority === 'H' ? -1 : 1)).slice(0, 3);
    const todayCompleted = data.tasks.filter(t => t.done && t.completedAt?.startsWith(todayStr)).length;
    const todayTotal = data.tasks.filter(t => t.todayStar).length;
    const copyMobileLink = () => { navigator.clipboard.writeText(`${window.location.origin}${window.location.pathname}?token=${data.settings.gistToken}&id=${data.settings.gistId}`); alert("Lien copié !"); };

    // Focus timer controls
    const startFocusTimer = useCallback(() => { focusStartTimeRef.current = Date.now(); focusAlertFiredRef.current = false; setFocusElapsed(0); setFocusRunning(true); }, []);
    const pauseFocusTimer = useCallback(() => { setFocusRunning(false); }, []);
    const resumeFocusTimer = useCallback(() => { if (focusElapsed > 0) { focusStartTimeRef.current = Date.now() - focusElapsed * 1000; } setFocusRunning(true); }, [focusElapsed]);
    const resetFocusTimer = useCallback(() => { focusStartTimeRef.current = 0; focusAlertFiredRef.current = false; setFocusElapsed(0); setFocusRunning(false); }, []);

    // Inline timer controls (click on task = auto-start countdown)
    const startInlineTimer = useCallback((task: Task) => {
        setTimerTask(task); timerStartTimeRef.current = Date.now(); timerAlertFiredRef.current = false; setTimerElapsed(0); setTimerRunning(true);
    }, []);
    const stopInlineTimer = useCallback(() => {
        timerStartTimeRef.current = 0; timerAlertFiredRef.current = false; setTimerElapsed(0); setTimerRunning(false); setTimerTask(null);
    }, []);
    const completeInlineTimer = useCallback(() => {
        if (timerTask) toggleTaskSafe(timerTask.id);
        stopInlineTimer();
    }, [timerTask, stopInlineTimer]);

    // --- LOGIN GATE ---
    if (!data.settings.gistId || !data.settings.gistToken) {
        return <LoginScreen onLogin={(t, i) => {
            const nd = { ...data, settings: { ...data.settings, gistToken: t, gistId: i }, updatedBy: SESSION_ID, lastSynced: Date.now() };
            try { localStorage.setItem('sys_diag_cache', encryptData(nd)); } catch(e) {}
            setData(nd); syncToGist(nd, t, i);
        }} onLog={log} />;
    }

    // ============================================
    // RENDER
    // ============================================
    return (
        <div className={`flex flex-col h-screen transition-all duration-500 ${appBg} ${curfewActive ? 'grayscale-[0.8] brightness-50' : ''} ${data.settings.crisisMode ? 'border-[6px] border-alert' : ''} ${flashSync ? 'flash-sync' : ''}`}>
            <CorporateMask active={showCorporateMask} />
            <NewTaskModal active={showTaskModal} onClose={() => setShowTaskModal(false)} onAdd={addNewTask} defaultType={modalDefaultType} isOfficeMode={isOfficeSanitization} settings={data.settings} />
            <FocusOverlay active={!!focusTask} task={focusTask} elapsed={focusElapsed} isRunning={focusRunning} onStart={startFocusTimer} onPause={pauseFocusTimer} onResume={resumeFocusTimer} onClose={() => { resetFocusTimer(); setFocusTask(null); }} onComplete={() => { resetFocusTimer(); if(focusTask) toggleTaskSafe(focusTask.id); setFocusTask(null); }} onNext={() => { resetFocusTimer(); const idx = activeTasks.findIndex(t => t.id === focusTask?.id); if(idx !== -1 && idx < activeTasks.length - 1) setFocusTask(activeTasks[idx+1]); }} isOfficeMode={isOfficeSanitization} />
            {curfewActive && (<div className="fixed inset-0 z-[100] border-t-8 border-red-900 mix-blend-overlay opacity-50 flex justify-center pt-2 pointer-events-none"><button onClick={() => setOverrideCurfew(true)} className="pointer-events-auto bg-red-900/90 text-red-100 px-6 py-1.5 rounded-full text-xs font-bold animate-pulse tracking-widest border border-red-500/30 hover:bg-red-700 cursor-pointer">FORCER</button></div>)}
            <EyeCareOverlay active={eyeBreakActive} timeLeft={breakCountdown} onSkip={() => { setEyeBreakActive(false); eyeBreakActiveRef.current = false; const t = Date.now(); setEyeCareStartTime(t); eyeCareStartTimeRef.current = t; }} isOfficeMode={isOfficeSanitization} />
            <CircuitBreakerOverlay active={showBreaker} onReset={() => { setShowBreaker(false); showBreakerRef.current = false; const t = Date.now(); setBreakerStartTime(t); breakerStartTimeRef.current = t; }} isOfficeMode={isOfficeSanitization} />

            {/* HEADER */}
            <header className={`h-12 flex items-center justify-between px-4 lg:px-6 z-40 sticky top-0 ${headerBg}`}>
                <div className="flex items-center gap-2 font-mono font-bold text-sm tracking-tight">
                    {isVpnMode ? (
                        <span className="text-gray-700 flex items-center gap-2"><Icons.Activity size={15}/> {vpnAppName}</span>
                    ) : (
                        <><span className="bg-clip-text text-transparent bg-gradient-to-r from-white to-slate-400">SYS-OS</span><span className="font-normal text-slate-600 text-xs">//v8.0</span></>
                    )}
                    <div className="flex items-center gap-1.5">
                         <div className={`w-1.5 h-1.5 rounded-full ${syncStatus === 'success' ? 'bg-saas shadow-[0_0_6px_#10B981]' : syncStatus === 'error' ? 'bg-alert' : syncStatus === 'syncing' ? 'bg-pro animate-pulse' : isVpnMode ? 'bg-gray-300' : 'bg-slate-600'}`}></div>
                         {isVpnMode && <span className="text-xs text-gray-400 uppercase font-mono">LOCAL</span>}
                    </div>
                </div>
                <div className="flex items-center gap-2">
                     {data.settings.eyeCare && !isVpnMode && (<div className="hidden lg:flex items-center gap-1.5 px-2 py-0.5 bg-white/5 rounded-full border border-white/10 text-xs font-mono text-blue-300"><Icons.Eye size={11} className={eyeTimeLeft < 60 ? "text-red-400 animate-pulse" : "text-blue-400"} /><span>{Math.floor(eyeTimeLeft / 60)}:{(eyeTimeLeft % 60).toString().padStart(2, '0')}</span></div>)}
                     {!isVpnMode && nextPrayer && (<div className="hidden lg:flex items-center gap-1.5 px-2 py-0.5 bg-white/5 rounded-full border border-white/10 text-xs font-mono text-purple-300"><Icons.Flame size={9} className="text-purple-400" /><span>{nextPrayer.name} {nextPrayer.time}</span><span className="text-slate-500">({nextPrayer.diff})</span></div>)}
                    <div className={`hidden md:block font-mono text-[11px] ${mutedText}`}>{currentTime}</div>
                    <Button variant="ghost" className="w-7 h-7 p-0 rounded-full" onClick={() => { setBackupsList(getBackups()); setShowSettings(true); }}><Icons.Settings size={14}/></Button>
                    {!isVpnMode && <Button variant="ghost" className="w-7 h-7 p-0 rounded-full" onClick={() => syncToGist(data, data.settings.gistToken, data.settings.gistId)} disabled={syncStatus === 'syncing'}><Icons.Cloud size={14} className={syncStatus === 'syncing' ? 'animate-spin' : ''}/></Button>}
                    <div className="hidden sm:flex gap-1.5 ml-1">
                        {!isVpnMode && <Button variant={currentView === 'command' ? 'primary' : 'outline'} className="text-xs h-7 px-2" onClick={() => setCurrentView('command')}><Icons.Brain size={12} /> IA</Button>}
                        <Button variant="outline" onClick={() => { const t = top3[0] || activeTasks[0]; if(t) setFocusTask(t); }} className="text-xs h-7 px-2"><Icons.Target size={12} /> FOCUS</Button>
                    </div>
                </div>
            </header>

            {/* INLINE TASK TIMER BAR */}
            {timerTask && (() => {
                const rawMatch = timerTask.text.match(/\((\d+)\)/);
                const rawMins = rawMatch ? parseInt(rawMatch[1], 10) : 0;
                const targetSec = rawMins >= 1 ? rawMins * 60 : 1500;
                const remaining = Math.max(0, targetSec - timerElapsed);
                const isOvertime = timerElapsed > targetSec;
                const pct = Math.min(100, (timerElapsed / targetSec) * 100);
                const mm = Math.floor((isOvertime ? timerElapsed - targetSec : remaining) / 60).toString().padStart(2, '0');
                const ss = ((isOvertime ? timerElapsed - targetSec : remaining) % 60).toString().padStart(2, '0');
                return (
                    <div className={`relative z-30 flex items-center gap-3 px-4 py-1.5 ${isVpnMode ? 'bg-blue-50 border-b border-blue-200' : 'bg-[#0A0C10] border-b border-white/10'}`}>
                        {/* Progress bar background */}
                        <div className="absolute inset-0 pointer-events-none"><div className={`h-full transition-all duration-1000 ${isOvertime ? (isVpnMode ? 'bg-red-100' : 'bg-red-500/10') : (isVpnMode ? 'bg-blue-100' : 'bg-pro/10')}`} style={{width: `${pct}%`}}></div></div>
                        <div className={`relative flex items-center gap-2 flex-1 min-w-0`}>
                            <div className={`w-2 h-2 rounded-full flex-shrink-0 ${timerRunning ? (isOvertime ? 'bg-red-500 animate-pulse' : 'bg-saas animate-pulse') : (isVpnMode ? 'bg-gray-400' : 'bg-slate-500')}`}></div>
                            <span className={`text-xs font-medium truncate ${isVpnMode ? 'text-gray-700' : 'text-slate-300'}`}>{sanitizeForOffice(timerTask.text, isOfficeSanitization, data.settings)}</span>
                        </div>
                        <div className={`relative font-mono text-sm font-bold tabular-nums ${isOvertime ? 'text-red-500' : isVpnMode ? 'text-[#2563EB]' : 'text-white'}`}>
                            {isOvertime && <span className="text-xs mr-1">+</span>}{mm}:{ss}
                        </div>
                        <div className="relative flex items-center gap-1">
                            {timerRunning ? (
                                <button onClick={() => setTimerRunning(false)} className={`p-1.5 rounded-md transition-colors ${isVpnMode ? 'hover:bg-gray-200 text-gray-500' : 'hover:bg-white/10 text-slate-400'}`}><Icons.Square size={14} fill="currentColor" /></button>
                            ) : (
                                <button onClick={() => { timerStartTimeRef.current = Date.now() - timerElapsed * 1000; setTimerRunning(true); }} className={`p-1.5 rounded-md transition-colors ${isVpnMode ? 'hover:bg-gray-200 text-gray-500' : 'hover:bg-white/10 text-slate-400'}`}><Icons.Play size={14} fill="currentColor" /></button>
                            )}
                            <button onClick={completeInlineTimer} className={`p-1.5 rounded-md transition-colors ${isVpnMode ? 'hover:bg-green-100 text-green-600' : 'hover:bg-saas/20 text-saas'}`}><Icons.Check size={14} strokeWidth={3} /></button>
                            <button onClick={stopInlineTimer} className={`p-1.5 rounded-md transition-colors ${isVpnMode ? 'hover:bg-red-100 text-red-500' : 'hover:bg-alert/20 text-alert'}`}><Icons.X size={14} /></button>
                        </div>
                    </div>
                );
            })()}

            <div className="flex flex-1 overflow-hidden">
                {/* SIDEBAR */}
                <nav className={`w-14 md:w-16 border-r flex flex-col items-center py-3 gap-2 z-30 ${isVpnMode ? 'bg-white border-gray-200' : 'bg-bg-surface/30 border-white/[0.06]'}`}>
                    {[
                        { id: 'dashboard', icon: <Icons.Activity size={16} />, label: 'Day' },
                        ...(!isVpnMode ? [{ id: 'command', icon: <Icons.Brain size={16} />, label: 'Brain' }] : []),
                        { id: 'agenda', icon: <Icons.Clock size={16} />, label: 'Time' },
                        { id: 'journal', icon: <Icons.Book size={16} />, label: 'Journal' },
                        { id: 'review', icon: <Icons.Calendar size={16} />, label: 'Plan' },
                        { id: 'pro', icon: <Icons.Briefcase size={16} />, label: 'pro' },
                        { id: 'saas', icon: <Icons.Globe size={16} />, label: 'saas' },
                        { id: 'vie', icon: <Icons.Heart size={16} />, label: 'vie' },
                        { id: 'patri', icon: <Icons.Building size={16} />, label: 'patri' },
                    ].map(item => (
                        <button key={item.id} onClick={() => setCurrentView(item.id as ExtendedViewType)} className={`group w-10 h-10 md:w-11 md:h-11 rounded-lg flex flex-col items-center justify-center gap-0.5 transition-all relative ${currentView === item.id ? (isVpnMode ? 'bg-[#2563EB] text-white' : 'bg-white/[0.08] text-white') : (isVpnMode ? 'text-gray-400 hover:bg-gray-100' : 'text-slate-500 hover:text-slate-200 hover:bg-white/[0.03]')}`}>
                            {currentView === item.id && !isVpnMode && <div className="absolute left-0 top-1/2 -translate-y-1/2 h-3 w-[2px] bg-white rounded-r-full"></div>}
                            {item.icon}
                            <span className="hidden md:block text-[11px] font-medium opacity-60">{sanitizeForOffice(item.label, isOfficeSanitization, data.settings)}</span>
                        </button>
                    ))}
                </nav>

                {/* MAIN */}
                <main className="flex-1 overflow-y-auto p-3 md:p-5 lg:p-6 scroll-smooth">
                    <div className="max-w-7xl mx-auto w-full animate-slide-up pb-8">

                         {currentView === 'command' && !isVpnMode && <CommandCenter data={data} onUpdateData={(nd) => setSafeData(prev => ({ ...prev, ...nd }))} onAddTasks={(ts) => { setSafeData(prev => ({ ...prev, tasks: [...ts, ...prev.tasks] })); setCurrentView('dashboard'); }} />}

                         {/* AGENDA */}
                         {currentView === 'agenda' && (
                             <div className="space-y-4">
                                <h2 className={`text-lg font-bold flex items-center gap-2 ${isVpnMode ? 'text-[#2563EB]' : 'text-slate-200'}`}><Icons.Clock size={20}/> {sanitizeForOffice("Agenda", isOfficeSanitization, data.settings)}</h2>
                                <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                                    <Card className="p-4 h-fit">
                                        <h3 className={`font-bold text-xs mb-3 uppercase ${isVpnMode ? 'text-gray-500' : 'text-slate-400'}`}>{isVpnMode ? 'NEW EVENT' : 'NOUVEL ÉVÉNEMENT'}</h3>
                                        <div className="space-y-2">
                                            <Input type="date" value={newAgendaDate} onChange={e => setNewAgendaDate(e.target.value)} className="font-mono text-center text-xs" />
                                            <Input type="time" value={newAgendaTime} onChange={e => setNewAgendaTime(e.target.value)} className="font-mono text-center text-xs" />
                                            <div className="flex gap-2"><Input type="number" placeholder="Min" value={newAgendaDuration} onChange={e => setNewAgendaDuration(e.target.value)} className="w-16 font-mono text-center text-xs" /><Input placeholder={isVpnMode ? 'Subject' : 'Titre'} value={newAgendaTitle} onChange={e => setNewAgendaTitle(e.target.value)} className="text-xs" /></div>
                                            <label className={`flex items-center gap-2 text-xs cursor-pointer ${isVpnMode ? 'text-gray-500' : 'text-slate-400'}`}><input type="checkbox" checked={newAgendaImportant} onChange={e => setNewAgendaImportant(e.target.checked)} />{isVpnMode ? 'Priority' : 'Important'}</label>
                                            <Button variant="primary" className="w-full h-8 text-xs" onClick={() => { if(newAgendaTime && newAgendaTitle && newAgendaDate) { setSafeData(prev => ({ ...prev, agenda: [...(prev.agenda || []), { id: Date.now(), title: newAgendaTitle, time: newAgendaTime, date: newAgendaDate, type: 'work' as const, important: newAgendaImportant, duration: parseInt(newAgendaDuration) || 30 }].sort((a,b) => a.time.localeCompare(b.time)) })); setNewAgendaTitle(""); setNewAgendaTime(""); setNewAgendaImportant(false); } }}>{isVpnMode ? 'ADD' : 'AJOUTER'}</Button>
                                        </div>
                                    </Card>
                                    <Card className="md:col-span-2 p-4 flex flex-col h-[480px]">
                                        <h3 className={`font-bold text-xs mb-3 uppercase ${isVpnMode ? 'text-gray-500' : 'text-slate-400'}`}>{isVpnMode ? 'SCHEDULE' : 'AGENDA'}</h3>
                                        <div className="flex-1 overflow-y-auto space-y-3 pr-1">
                                            {Object.entries((data.agenda || []).sort((a,b) => new Date(a.date).getTime() - new Date(b.date).getTime()).reduce((acc, evt) => { if (!acc[evt.date]) acc[evt.date] = []; acc[evt.date].push(evt); return acc; }, {} as Record<string, AgendaEvent[]>)).map(([date, events]) => {
                                                const isToday = date === todayStr;
                                                return (<div key={date} className={`relative pl-3 border-l ${isToday ? 'border-pro' : isVpnMode ? 'border-gray-200' : 'border-white/10'}`}>
                                                    <div className={`absolute -left-[4px] top-0 w-2 h-2 rounded-full ${isToday ? 'bg-pro' : isVpnMode ? 'bg-gray-400' : 'bg-slate-700'}`}></div>
                                                    <div className="mb-1.5"><span className={`font-mono font-bold text-xs ${isToday ? (isVpnMode ? 'text-[#2563EB]' : 'text-white') : isVpnMode ? 'text-gray-500' : 'text-slate-400'}`}>{new Date(date).toLocaleDateString(isVpnMode ? 'en-US' : 'fr-FR', { weekday: 'short', day: 'numeric', month: 'short' })}</span></div>
                                                    <div className="space-y-1">{(events as AgendaEvent[]).sort((a,b) => a.time.localeCompare(b.time)).map(evt => (
                                                        <div key={evt.id} className={`flex items-center gap-2 p-1.5 rounded border text-xs ${evt.important ? (isVpnMode ? 'bg-red-50 border-red-200' : 'bg-alert/5 border-alert/20') : (isVpnMode ? 'bg-gray-50 border-gray-100' : 'bg-white/[0.02] border-white/5')}`}>
                                                            <span className={`font-mono font-bold min-w-[36px] ${evt.important ? 'text-alert' : ''}`}>{evt.time}</span>
                                                            <span className="flex-1 truncate">{evt.title}</span><span className="text-slate-500 text-xs">{evt.duration}m</span>
                                                            <button onClick={() => setSafeData(prev => ({...prev, agenda: prev.agenda.filter(x => x.id !== evt.id)}))} className="text-slate-500 hover:text-alert opacity-40 hover:opacity-100"><Icons.Trash2 size={12}/></button>
                                                        </div>))}</div>
                                                </div>);
                                            })}
                                        </div>
                                    </Card>
                                </div>
                             </div>
                         )}

                        {/* JOURNAL */}
                        {currentView === 'journal' && (
                            <div className="space-y-4">
                                <h2 className={`text-lg font-bold flex items-center gap-2 ${isVpnMode ? 'text-[#2563EB]' : 'text-slate-200'}`}><Icons.Book size={20}/> {isVpnMode ? 'SYSTEM LOGS' : 'JOURNAL'}</h2>
                                <Card className="p-4">
                                    <textarea className={`w-full h-24 border rounded-lg p-3 resize-none text-sm focus:outline-none font-mono ${isVpnMode ? 'bg-gray-50 border-gray-200 text-gray-800' : 'bg-white/[0.03] border-white/10 text-slate-200 focus:border-blue-500/50'}`} placeholder={isVpnMode ? 'Log entry...' : 'Notes...'} value={newJournalEntry} onChange={e => setNewJournalEntry(e.target.value)} />
                                    <div className="flex justify-end mt-2"><Button variant="primary" className="h-8 text-xs" onClick={() => { if (!newJournalEntry.trim()) return; setSafeData(prev => ({ ...prev, journal: [{ time: new Date().toLocaleTimeString(), date: new Date().toLocaleDateString(), text: newJournalEntry }, ...prev.journal] })); setNewJournalEntry(""); }}>{isVpnMode ? 'SAVE' : 'ENREGISTRER'}</Button></div>
                                </Card>
                                <div className="space-y-2">{data.journal.map((entry, i) => (<Card key={i} className="p-3"><div className="flex justify-between items-center mb-1 text-xs"><span className={`font-mono font-bold ${isVpnMode ? 'text-[#2563EB]' : 'text-blue-400'}`}>{entry.date}</span><span className="text-slate-500 font-mono">{entry.time}</span></div><div className={`text-xs whitespace-pre-wrap ${isVpnMode ? 'text-gray-700' : 'text-slate-300'}`}>{entry.text}</div></Card>))}</div>
                            </div>
                        )}

                        {/* REVIEW */}
                        {currentView === 'review' && (
                            <div className="space-y-4">
                                <h2 className={`text-lg font-bold flex items-center gap-2 ${isVpnMode ? 'text-[#2563EB]' : 'text-slate-200'}`}><Icons.Calendar size={20}/> {sanitizeForOffice("WEEKLY PLAN", isOfficeSanitization, data.settings)}</h2>
                                <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
                                    <Card className="p-4"><h3 className={`font-bold text-xs mb-2 flex items-center gap-1 ${isVpnMode ? 'text-gray-600' : 'text-green-500'}`}><Icons.Check size={12}/> {sanitizeForOffice("WIN", isOfficeSanitization, data.settings)}</h3><textarea className={`w-full min-h-[100px] border rounded-lg p-3 resize-none focus:outline-none text-sm ${isVpnMode ? 'bg-green-50 border-green-200 text-gray-800' : 'bg-green-500/5 border-green-500/10 text-slate-200'}`} value={data.review.win} onChange={e => setSafeData(prev => ({...prev, review: {...prev.review, win: e.target.value}}))} /></Card>
                                    <Card className="p-4"><h3 className={`font-bold text-xs mb-2 flex items-center gap-1 ${isVpnMode ? 'text-gray-600' : 'text-red-500'}`}><Icons.X size={12}/> {sanitizeForOffice("FAIL", isOfficeSanitization, data.settings)}</h3><textarea className={`w-full min-h-[100px] border rounded-lg p-3 resize-none focus:outline-none text-sm ${isVpnMode ? 'bg-red-50 border-red-200 text-gray-800' : 'bg-red-500/5 border-red-500/10 text-slate-200'}`} value={data.review.fail} onChange={e => setSafeData(prev => ({...prev, review: {...prev.review, fail: e.target.value}}))} /></Card>
                                </div>
                                <Card className="p-4"><h3 className={`font-bold text-xs mb-2 uppercase ${isVpnMode ? 'text-gray-600' : 'text-gold'}`}><Icons.Star size={12} className="inline mr-1"/> {sanitizeForOffice("PRIORITÉ", isOfficeSanitization, data.settings)}</h3><Input value={data.review.priority} onChange={e => setSafeData(prev => ({...prev, review: {...prev.review, priority: e.target.value}}))} /></Card>
                                <div className="space-y-2">
                                     <h3 className={`text-xs font-bold uppercase tracking-wider ${isVpnMode ? 'text-gray-500' : 'text-slate-400'}`}>{isVpnMode ? 'RESOURCE ALLOCATION' : 'BUDGET HEURES'}</h3>
                                     <div className="grid grid-cols-2 md:grid-cols-7 gap-2">
                                        {[1, 2, 3, 4, 5, 6, 0].map(dIndex => {
                                            const cfg = getDayConfig(dIndex); const isToday = currentDayIndex === dIndex;
                                            const updateBudget = (cat: 'pro'|'saas'|'patri'|'vie', val: number) => { setSafeData(prev => ({ ...prev, weeklyConfig: { ...prev.weeklyConfig, [dIndex]: { ...cfg, budgets: { ...cfg.budgets, [cat]: val } } } })); };
                                            return (<div key={dIndex} className={`relative p-2 rounded-lg border transition-all ${isToday ? (isVpnMode ? 'bg-blue-50 border-[#2563EB]' : 'bg-blue-500/10 border-blue-500 scale-[1.02] z-10') : (isVpnMode ? 'bg-white border-gray-200' : 'bg-white/[0.02] border-white/[0.05]')}`}>
                                                {isToday && <div className={`absolute -top-2 left-1/2 -translate-x-1/2 px-1.5 py-0.5 text-white text-[11px] font-bold rounded-full ${isVpnMode ? 'bg-[#2563EB]' : 'bg-blue-500'}`}>NOW</div>}
                                                <div className={`text-center mb-1.5 font-bold text-xs ${isVpnMode ? 'text-gray-700' : 'text-white'}`}>{cfg.name}</div>
                                                <div className="space-y-1">{visibleCategories.map(cat => (<div key={cat} className="flex items-center justify-between text-xs"><span className={`uppercase font-bold ${getThemeColor(cat, isOfficeSanitization)}`}>{sanitizeForOffice(cat, isOfficeSanitization, data.settings).substring(0,3)}</span><input type="number" value={cfg.budgets[cat as keyof typeof cfg.budgets]} onChange={(e) => updateBudget(cat as any, parseInt(e.target.value) || 0)} className={`w-6 text-center rounded border text-xs ${isVpnMode ? 'bg-gray-50 border-gray-200 text-gray-700' : 'bg-black/20 border-white/10 text-slate-300'}`} /></div>))}</div>
                                            </div>);
                                        })}
                                     </div>
                                </div>
                            </div>
                        )}

                        {/* ============ DASHBOARD ============ */}
                        {currentView === 'dashboard' && (
                             <>
                                <div className="flex flex-col md:flex-row md:justify-between md:items-end mb-4 gap-3">
                                    <div className="flex-1">
                                        <div className="flex flex-wrap items-center gap-2 mb-1.5">
                                             <div className={`inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-bold uppercase tracking-widest text-white ${isVpnMode ? 'bg-[#2563EB]' : ''}`} style={!isVpnMode ? { backgroundColor: dayConfig.theme } : {}}>{sanitizeForOffice(dayConfig.name, isOfficeSanitization, data.settings)}</div>
                                             <div className={`flex items-center gap-2.5 px-2.5 py-0.5 rounded-full border text-xs ${isVpnMode ? 'bg-gray-50 border-gray-200' : 'bg-white/[0.03] border-white/10'}`}>
                                                 {visibleCategories.map(type => { const s = getBudgetStatus(type as any); if (s.budget === 0) return null; const barColor: Record<string, string> = { pro: 'bg-pro', saas: 'bg-saas', patri: 'bg-patri', vie: 'bg-vie' }; return (<div key={type} className="flex items-center gap-1.5"><span className={`font-bold uppercase ${getThemeColor(type, isOfficeSanitization)}`}>{sanitizeForOffice(type, isOfficeSanitization, data.settings).substring(0,3)}</span><div className={`w-16 h-2 rounded-full overflow-hidden ${isVpnMode ? 'bg-gray-200' : 'bg-white/10'}`}><div className={`h-full rounded-full ${s.pct > 100 ? 'bg-red-500' : isVpnMode ? 'bg-[#2563EB]' : barColor[type] || 'bg-white/50'}`} style={{width: `${s.pct}%`}}></div></div><span className={`font-mono ${isVpnMode ? 'text-gray-400' : 'text-slate-500'}`}>{s.consumed.toFixed(1)}/{s.budget}</span></div>); })}
                                             </div>
                                        </div>
                                        <h1 className={`text-xl md:text-2xl font-light ${mutedText}`}>{getGreeting()}, <span className={`font-semibold ${isVpnMode ? 'text-gray-800' : 'text-white'}`}>{userName}</span></h1>
                                    </div>
                                    {!isVpnMode && <Button variant="outline" onClick={() => setShowShutdown(true)} className="h-8 px-3 text-xs">Shutdown</Button>}
                                </div>

                                {/* ROW 1: ANCRE (2/3) + STATS (1/3) */}
                                <div className="grid grid-cols-1 md:grid-cols-3 gap-3 mb-4">
                                    {/* ANCRE — Hero Card */}
                                    <Card className={`p-4 md:col-span-2 flex flex-col min-h-[180px] border-l-[3px] ${isVpnMode ? 'border-l-[#2563EB]' : 'border-l-gold'}`}>
                                        {top3.length > 0 ? (<>
                                            <div className={`text-xs font-bold tracking-widest uppercase mb-3 ${isVpnMode ? 'text-gray-400' : 'text-gold'}`}>{sanitizeForOffice("ANCRE", isOfficeSanitization, data.settings)}</div>
                                            <div className="cursor-pointer hover:opacity-80 mb-3" onClick={() => startInlineTimer(top3[0])}>
                                                <h2 className={`text-base md:text-lg font-bold leading-snug mb-1 ${isVpnMode ? 'text-gray-800' : 'text-white'}`}>{sanitizeForOffice(top3[0].text, isOfficeSanitization, data.settings)}</h2>
                                                <div className="flex gap-3 text-xs opacity-60"><span className={`uppercase font-bold ${getThemeColor(top3[0].type, isOfficeSanitization)}`}>{sanitizeForOffice(top3[0].type, isOfficeSanitization, data.settings)}</span><span className="flex items-center gap-1"><Icons.Clock size={11}/>{getTaskDuration(top3[0].text) * 60}m</span></div>
                                            </div>
                                            <div className="mt-auto flex items-center gap-3">
                                                <button onClick={() => { const t = top3[0]; if(t) setFocusTask(t); }} className={`flex items-center gap-2 px-4 py-2 rounded-lg text-xs font-bold transition-all ${isVpnMode ? 'bg-[#2563EB] text-white hover:bg-[#005fa3]' : 'bg-gold/20 text-gold border border-gold/30 hover:bg-gold/30'}`}><Icons.Target size={14}/> START FOCUS</button>
                                            </div>
                                            {top3.length > 1 && (<div className={`pt-3 mt-3 border-t space-y-1.5 ${isVpnMode ? 'border-gray-100' : 'border-white/5'}`}><div className={`text-xs font-bold uppercase mb-1 ${isVpnMode ? 'text-gray-400' : 'text-slate-500'}`}>{sanitizeForOffice("Soutien", isOfficeSanitization, data.settings)}</div>{top3.slice(1).map(t => (<div key={t.id} className="flex items-center gap-2 cursor-pointer hover:opacity-80" onClick={() => startInlineTimer(t)}><div className={`w-1.5 h-1.5 rounded-full ${getThemeColor(t.type, isOfficeSanitization)} bg-current`}></div><span className={`text-xs truncate ${isVpnMode ? 'text-gray-600' : 'text-slate-400'}`}>{sanitizeForOffice(t.text, isOfficeSanitization, data.settings)}</span></div>))}</div>)}
                                        </>) : (<div className="py-6 text-center flex-1 flex flex-col justify-center"><div className={`text-sm font-bold mb-1 ${isVpnMode ? 'text-gray-500' : 'text-slate-400'}`}>{isVpnMode ? 'No primary task' : 'Pas d\'ancre'}</div><div className={`text-xs ${isVpnMode ? 'text-gray-400' : 'text-slate-600'}`}>{isVpnMode ? 'Star a task to set your anchor' : 'Star une tâche pour définir ton ancre'}</div></div>)}
                                    </Card>

                                    {/* STATS */}
                                    <Card className="p-4 flex flex-col">
                                        <h3 className={`text-xs font-bold uppercase flex items-center gap-1.5 mb-3 ${isVpnMode ? 'text-gray-500' : 'text-slate-400'}`}><Icons.Activity size={14}/> {isVpnMode ? 'Metrics' : 'Stats'}</h3>
                                        <div className="space-y-2.5 flex-1">
                                            <div className={`p-3 rounded-lg border ${isVpnMode ? 'bg-gray-50 border-gray-100' : 'bg-white/[0.03] border-white/5'}`}><div className={`text-xs uppercase font-bold mb-0.5 ${isVpnMode ? 'text-gray-400' : 'text-slate-500'}`}>{isVpnMode ? 'Done' : 'Terminées'}</div><div className={`text-2xl font-bold font-mono ${isVpnMode ? 'text-[#2563EB]' : 'text-saas'}`}>{todayCompleted}</div></div>
                                            <div className={`p-3 rounded-lg border ${isVpnMode ? 'bg-gray-50 border-gray-100' : 'bg-white/[0.03] border-white/5'}`}><div className={`text-xs uppercase font-bold mb-0.5 ${isVpnMode ? 'text-gray-400' : 'text-slate-500'}`}>{isVpnMode ? 'Active' : 'En cours'}</div><div className={`text-2xl font-bold font-mono ${isVpnMode ? 'text-gray-800' : 'text-white'}`}>{activeTasks.length}</div></div>
                                            <div className={`p-3 rounded-lg border ${isVpnMode ? 'bg-gray-50 border-gray-100' : 'bg-white/[0.03] border-white/5'}`}><div className={`text-xs uppercase font-bold mb-0.5 ${isVpnMode ? 'text-gray-400' : 'text-slate-500'}`}>{isVpnMode ? 'Priority' : 'Stars'}</div><div className={`text-2xl font-bold font-mono ${isVpnMode ? 'text-orange-600' : 'text-gold'}`}>{todayTotal}</div></div>
                                        </div>
                                    </Card>
                                </div>

                                {/* ROW 2: RADAR — Horizontal scroll full-width */}
                                <Card className="p-3 mb-4">
                                    <div className="flex items-center justify-between mb-2"><h3 className={`text-xs font-bold uppercase flex items-center gap-1.5 ${isVpnMode ? 'text-gray-500' : 'text-slate-400'}`}><Icons.Calendar size={14}/> {isVpnMode ? 'Schedule' : 'Radar 7J'}</h3><span className={`text-xs px-2 py-0.5 rounded-full ${isVpnMode ? 'bg-gray-100 text-gray-500' : 'bg-white/10 text-slate-400'}`}>{radarEvents.length}</span></div>
                                    <div className="flex gap-3 overflow-x-auto pb-2 scrollbar-hide">
                                        {radarEvents.length > 0 ? radarEvents.map(evt => (<div key={evt.id} className={`flex-shrink-0 w-48 p-3 rounded-lg border ${evt.important ? (isVpnMode ? 'bg-red-50 border-red-200' : 'bg-alert/5 border-alert/20') : (isVpnMode ? 'bg-gray-50 border-gray-100 hover:bg-gray-100' : 'bg-white/[0.03] border-white/5 hover:bg-white/[0.06]')} transition-colors`}><div className="flex items-center gap-2 mb-1"><span className={`text-xs font-bold uppercase ${isVpnMode ? 'text-gray-400' : 'text-slate-500'}`}>{new Date(evt.date).toLocaleDateString(isVpnMode ? 'en-US' : 'fr-FR', {weekday: 'short'})}</span><span className={`text-sm font-bold ${evt.important ? 'text-alert' : isVpnMode ? 'text-gray-700' : 'text-slate-300'}`}>{new Date(evt.date).getDate()}</span><span className={`ml-auto text-xs font-mono ${isVpnMode ? 'text-gray-500' : 'text-slate-500'}`}>{evt.time}</span></div><div className={`text-xs font-medium truncate ${evt.important ? 'font-bold' : ''} ${isVpnMode ? 'text-gray-700' : 'text-slate-300'}`}>{evt.title}</div><div className="text-xs text-slate-500 mt-0.5">{evt.duration}m</div></div>)) : <div className={`text-center text-xs py-4 w-full ${isVpnMode ? 'text-gray-400' : 'text-slate-600'}`}>{isVpnMode ? 'No upcoming events.' : 'Aucun événement à venir.'}</div>}
                                    </div>
                                </Card>

                                {/* ROW 3: CATEGORIES — Dynamic height columns */}
                                <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-3">
                                    {visibleCategories.map(type => {
                                        const budget = dayConfig.budgets[type as keyof typeof dayConfig.budgets] || 0;
                                        const isPriority = budget > 0; const isMajor = budget >= 3;
                                        let glow = "";
                                        if (!isVpnMode && isPriority) {
                                            const colors: Record<string, string> = { pro: 'blue', saas: 'emerald', patri: 'purple', vie: 'pink' };
                                            const c = colors[type] || 'blue';
                                            glow = isMajor ? `border-${c}-500/40` : `border-${c}-500/20`;
                                        }
                                        const todayTasks = data.tasks.filter(t => (type==='patri'?['patri',...ASSETS_KEYS].includes(t.type):t.type===type) && !t.done && t.todayStar);
                                        const backlogTasks = data.tasks.filter(t => (type==='patri'?['patri',...ASSETS_KEYS].includes(t.type):t.type===type) && !t.done && !t.todayStar);

                                        return (<div key={type} className={getCardClass(`p-3 flex flex-col min-h-[320px] max-h-[calc(100vh-520px)] ${glow}`)}>
                                             <div className="flex justify-between items-center mb-2">
                                                <h3 className={`text-sm font-bold flex items-center gap-1.5 uppercase tracking-wider ${getThemeColor(type, isOfficeSanitization)}`}>{sanitizeForOffice(type.toUpperCase(), isOfficeSanitization, data.settings)}{!isVpnMode && isPriority && <div className={`w-1.5 h-1.5 rounded-full ${isMajor ? 'animate-pulse' : ''} bg-current`}></div>}</h3>
                                                <div className="flex items-center gap-2">
                                                    {type === 'pro' && data.settings.eyeCare && (<div className={`flex items-center gap-1 px-1.5 py-0.5 rounded-full border text-xs font-mono ${eyeTimeLeft < 60 ? (isVpnMode ? 'border-red-200 bg-red-50 text-red-600' : 'border-red-500/30 bg-red-500/10 text-red-400 animate-pulse') : (isVpnMode ? 'border-gray-200 bg-gray-50 text-gray-500' : 'border-white/10 bg-white/5 text-blue-400')}`}><Icons.Eye size={10} />{Math.floor(eyeTimeLeft / 60)}:{(eyeTimeLeft % 60).toString().padStart(2, '0')}</div>)}
                                                    <span className={`text-xs font-mono ${isVpnMode ? 'text-gray-400' : 'opacity-50'}`}>{todayTasks.length + backlogTasks.length}</span>
                                                </div>
                                             </div>
                                             <div className="flex-1 overflow-y-auto pr-0.5 space-y-0">
                                                {/* TODAY section */}
                                                {todayTasks.length > 0 && (<div className="mb-2">
                                                    <div className={`flex items-center gap-1.5 mb-1 px-1 ${isVpnMode ? 'text-orange-600' : 'text-gold'}`}><Icons.Star size={12} fill="currentColor"/><span className="text-xs font-bold uppercase tracking-wider">TODAY</span></div>
                                                    {type === 'patri' ? (<div className="space-y-1">{todayTasks.map(t => (<TaskRow key={t.id} task={t} onToggle={toggleTaskSafe} onDelete={deleteTaskSafe} onStar={toggleTodayStar} onFocus={() => startInlineTimer(t)} isBlurred={false} showTypeDot={false} isOfficeMode={isOfficeSanitization} />))}</div>) : todayTasks.map(t => (<TaskRow key={t.id} task={t} onToggle={toggleTaskSafe} onDelete={deleteTaskSafe} onStar={toggleTodayStar} onFocus={() => startInlineTimer(t)} isBlurred={false} showTypeDot={false} isOfficeMode={isOfficeSanitization} />))}
                                                </div>)}
                                                {/* BACKLOG section */}
                                                {backlogTasks.length > 0 && (<div className={todayTasks.length > 0 ? `pt-2 border-t ${isVpnMode ? 'border-gray-100' : 'border-white/5'}` : ''}>
                                                    <div className={`flex items-center gap-1.5 mb-1 px-1 ${isVpnMode ? 'text-gray-400' : 'text-slate-600'}`}><span className="text-xs font-bold uppercase tracking-wider">BACKLOG</span><span className="text-xs opacity-50">{backlogTasks.length}</span></div>
                                                    {type === 'patri' ? (<div className="space-y-2">
                                                        {ASSETS_KEYS.map(sub => { const st = backlogTasks.filter(t => t.type === sub); if(st.length === 0) return null; return (<div key={sub} className={`rounded p-1.5 border ${isVpnMode ? 'bg-gray-50 border-gray-100' : 'bg-white/[0.02] border-white/[0.04]'}`}><div className={`text-xs font-bold uppercase mb-1 flex justify-between ${isVpnMode ? 'text-gray-500' : 'text-patri'}`}>{sanitizeForOffice(sub, isOfficeSanitization, data.settings)}<span className="opacity-50">{st.length}</span></div>{st.map(t => (<TaskRow key={t.id} task={t} onToggle={toggleTaskSafe} onDelete={deleteTaskSafe} onStar={toggleTodayStar} onFocus={() => startInlineTimer(t)} isBlurred={false} showTypeDot={false} isOfficeMode={isOfficeSanitization} />))}</div>); })}
                                                        {backlogTasks.filter(t => t.type === 'patri').length > 0 && (<div className={`rounded p-1.5 border ${isVpnMode ? 'bg-gray-50 border-gray-100' : 'bg-white/[0.02] border-white/[0.04]'}`}><div className={`text-xs font-bold uppercase mb-1 ${isVpnMode ? 'text-gray-500' : 'text-slate-400'}`}>{isVpnMode ? 'General' : 'Général'}</div>{backlogTasks.filter(t => t.type === 'patri').map(t => (<TaskRow key={t.id} task={t} onToggle={toggleTaskSafe} onDelete={deleteTaskSafe} onStar={toggleTodayStar} onFocus={() => startInlineTimer(t)} isBlurred={false} showTypeDot={false} isOfficeMode={isOfficeSanitization} />))}</div>)}
                                                    </div>) : backlogTasks.map(t => (<TaskRow key={t.id} task={t} onToggle={toggleTaskSafe} onDelete={deleteTaskSafe} onStar={toggleTodayStar} onFocus={() => startInlineTimer(t)} isBlurred={false} showTypeDot={false} isOfficeMode={isOfficeSanitization} />))}
                                                </div>)}
                                                {/* ADD TASK — Full-width dashed button */}
                                                <button onClick={() => { setModalDefaultType(type as TaskType); setShowTaskModal(true); }} className={`w-full py-2.5 mt-2 rounded-lg border-2 border-dashed text-xs font-semibold flex items-center justify-center gap-1.5 transition-all ${isVpnMode ? 'border-gray-200 text-gray-400 hover:border-gray-300 hover:text-gray-600' : 'border-white/10 text-slate-500 hover:border-white/20 hover:text-slate-300 hover:bg-white/[0.02]'}`}><Icons.Plus size={14}/> {isVpnMode ? 'Add' : 'Ajouter'}</button>
                                             </div>
                                        </div>);
                                    })}
                                </div>
                             </>
                         )}

                         {/* CATEGORY DETAIL VIEWS */}
                         {['pro', 'saas', 'vie', 'patri'].includes(currentView) && (
                            <div className="space-y-3">
                                <h2 className={`text-lg font-bold uppercase ${isVpnMode ? 'text-[#2563EB]' : ''}`}>{sanitizeForOffice(currentView, isOfficeSanitization, data.settings)}</h2>
                                <div className={getCardClass("p-3 flex flex-col min-h-[400px] max-h-[calc(100vh-200px)]")}>
                                     <div className="flex-1 overflow-y-auto pr-1">
                                        {currentView === 'patri' ? (<div className="space-y-3">{[...ASSETS_KEYS, 'patri' as TaskType].map(sub => { const st = data.tasks.filter(t => t.type === sub && !t.done); return (<div key={sub} className="mb-2"><h3 className={`text-xs font-bold uppercase mb-1.5 border-b pb-1 ${isVpnMode ? 'text-gray-600 border-gray-200' : 'text-patri border-white/10'}`}>{sub === 'patri' ? 'Général' : sanitizeForOffice(sub, isOfficeSanitization, data.settings)}</h3>{st.map(t => (<TaskRow key={t.id} task={t} onToggle={toggleTaskSafe} onDelete={deleteTaskSafe} onStar={toggleTodayStar} onFocus={() => startInlineTimer(t)} isBlurred={false} showTypeDot={false} isOfficeMode={isOfficeSanitization} />))}<Button variant="ghost" className="mt-1 text-xs" onClick={() => { setModalDefaultType(sub as TaskType); setShowTaskModal(true); }}>+</Button></div>); })}</div>) : (<>{data.tasks.filter(t => t.type === currentView && !t.done).map(t => (<TaskRow key={t.id} task={t} onToggle={toggleTaskSafe} onDelete={deleteTaskSafe} onStar={toggleTodayStar} onFocus={() => startInlineTimer(t)} isBlurred={false} showTypeDot={false} isOfficeMode={isOfficeSanitization} />))}<Button variant="ghost" className="mt-2 text-xs" onClick={() => { setModalDefaultType(currentView as TaskType); setShowTaskModal(true); }}>+</Button></>)}
                                     </div>
                                </div>
                            </div>
                         )}
                    </div>
                </main>
            </div>

            {/* SETTINGS MODAL */}
            {showSettings && (
                 <div className="fixed inset-0 z-50 bg-black/80 backdrop-blur-xl flex items-center justify-center p-4">
                    <Card className={`p-5 max-w-md w-full shadow-2xl border max-h-[85vh] overflow-y-auto ${isVpnMode ? 'bg-white border-gray-200' : 'bg-bg-deep border-white/10'}`}>
                        <h2 className={`text-base font-bold mb-4 flex items-center gap-2 ${textColor}`}><Icons.Settings size={18}/> {isVpnMode ? 'Settings' : 'Paramètres'}</h2>
                        <div className="space-y-3">
                            <div className={`p-2 rounded border text-xs font-mono break-all ${isVpnMode ? 'bg-gray-50 border-gray-200 text-gray-500' : 'bg-white/5 border-white/10 text-slate-400'}`}><span className={`font-bold ${isVpnMode ? 'text-gray-700' : 'text-white'}`}>SESSION</span> {SESSION_ID.substring(0,12)}</div>
                            <label className="flex items-center justify-between"><span className={`text-xs ${mutedText}`}>{isVpnMode ? 'Light Theme' : 'Mode VPN'}</span><input type="checkbox" checked={data.settings.vpnMode} onChange={(e) => setSafeData(p => ({...p, settings: {...p.settings, vpnMode: e.target.checked}}))} /></label>
                            {!isVpnMode && <label className="flex items-center justify-between"><span className={`text-xs ${mutedText}`}>Crise</span><input type="checkbox" checked={data.settings.crisisMode} onChange={(e) => setSafeData(p => ({...p, settings: {...p.settings, crisisMode: e.target.checked}}))} /></label>}
                            <label className="flex items-center justify-between"><span className={`text-xs ${mutedText}`}>Eye Care</span><input type="checkbox" checked={data.settings.eyeCare} onChange={(e) => setSafeData(p => ({...p, settings: {...p.settings, eyeCare: e.target.checked}}))} /></label>

                            {/* IDENTITY & VPN CUSTOMIZATION */}
                            <div className={`pt-2 border-t ${isVpnMode ? 'border-gray-200' : 'border-white/10'}`}>
                                <h3 className={`text-xs font-bold mb-2 uppercase ${isVpnMode ? 'text-gray-600' : 'text-slate-400'}`}>Identity</h3>
                                <div className="space-y-2">
                                    <div><label className={`text-xs mb-0.5 block ${mutedText}`}>Name</label><Input value={data.settings.userName || ''} onChange={e => setSafeData(p => ({...p, settings: {...p.settings, userName: e.target.value}}))} placeholder="Operator" className="text-xs" /></div>
                                    <div><label className={`text-xs mb-0.5 block ${mutedText}`}>{isVpnMode ? 'App Name (VPN)' : 'Nom app (VPN)'}</label><Input value={data.settings.vpnAppName || ''} onChange={e => setSafeData(p => ({...p, settings: {...p.settings, vpnAppName: e.target.value}}))} placeholder="Planner" className="text-xs" /></div>
                                </div>
                                <h3 className={`text-xs font-bold mt-3 mb-2 uppercase ${isVpnMode ? 'text-gray-600' : 'text-slate-400'}`}>{isVpnMode ? 'Category Labels (VPN)' : 'Noms piliers (VPN)'}</h3>
                                <div className="grid grid-cols-2 gap-2">
                                    <div><label className={`text-xs mb-0.5 block ${mutedText}`}>Pro</label><Input value={data.settings.vpnLabels?.pro || ''} onChange={e => setSafeData(p => ({...p, settings: {...p.settings, vpnLabels: {...(p.settings.vpnLabels || {}), pro: e.target.value}}}))} placeholder="Work" className="text-xs" /></div>
                                    <div><label className={`text-xs mb-0.5 block ${mutedText}`}>SaaS</label><Input value={data.settings.vpnLabels?.saas || ''} onChange={e => setSafeData(p => ({...p, settings: {...p.settings, vpnLabels: {...(p.settings.vpnLabels || {}), saas: e.target.value}}}))} placeholder="Projects" className="text-xs" /></div>
                                    <div><label className={`text-xs mb-0.5 block ${mutedText}`}>Patri</label><Input value={data.settings.vpnLabels?.patri || ''} onChange={e => setSafeData(p => ({...p, settings: {...p.settings, vpnLabels: {...(p.settings.vpnLabels || {}), patri: e.target.value}}}))} placeholder="Admin" className="text-xs" /></div>
                                    <div><label className={`text-xs mb-0.5 block ${mutedText}`}>Vie</label><Input value={data.settings.vpnLabels?.vie || ''} onChange={e => setSafeData(p => ({...p, settings: {...p.settings, vpnLabels: {...(p.settings.vpnLabels || {}), vie: e.target.value}}}))} placeholder="Personal" className="text-xs" /></div>
                                </div>
                            </div>

                            <div className={`pt-2 border-t ${isVpnMode ? 'border-gray-200' : 'border-white/10'}`}><h3 className={`text-xs font-bold mb-1.5 uppercase ${isVpnMode ? 'text-[#2563EB]' : 'text-blue-400'}`}><Icons.Clock size={10} className="inline mr-1"/> TIME MACHINE</h3>
                                <div className={`rounded p-1.5 max-h-28 overflow-y-auto space-y-1 ${isVpnMode ? 'bg-gray-50' : 'bg-black/40'}`}>
                                    <Button variant="outline" className="w-full text-xs py-1 h-auto" onClick={() => { saveSnapshot(data, true); setBackupsList(getBackups()); }}>+ BACKUP</Button>
                                    {backupsList.map(bk => (<div key={bk.id} className={`flex items-center justify-between p-1.5 rounded border ${isVpnMode ? 'bg-white border-gray-100' : 'bg-white/5 border-white/5'}`}><div><div className={`text-xs font-bold ${isVpnMode ? 'text-gray-700' : 'text-white'}`}>{bk.dateStr}</div><div className="text-xs text-slate-500">{bk.trigger} / {bk.data.tasks.length}t</div></div><button onClick={() => { if(confirm(`Restore ${bk.dateStr}?`)) { setSafeData(() => ({...bk.data, updatedBy: SESSION_ID, lastSynced: Date.now()})); setShowSettings(false); } }} className={`px-1.5 py-0.5 text-xs font-bold rounded ${isVpnMode ? 'bg-blue-100 text-[#2563EB]' : 'bg-blue-500/20 text-blue-400 hover:bg-blue-500 hover:text-white'}`}>RESTORE</button></div>))}
                                    {backupsList.length === 0 && <div className="text-xs text-slate-600 text-center py-1">-</div>}
                                </div>
                            </div>

                            <div className={`pt-2 border-t ${isVpnMode ? 'border-gray-200' : 'border-white/10'}`}>
                                <h3 className={`text-xs font-bold mb-1.5 uppercase ${isVpnMode ? 'text-orange-600' : 'text-gold'}`}><Icons.Zap size={10} className="inline mr-1"/> RESET DAY</h3>
                                <div className="grid grid-cols-2 gap-1.5">
                                    <Button variant="outline" className="text-xs h-auto py-1.5" onClick={() => { if(confirm(isVpnMode ? 'Uncheck all completed tasks?' : 'Décocher toutes les tâches terminées ?')) { setSafeData(p => ({...p, tasks: p.tasks.map(t => ({...t, done: false, completedAt: undefined}))})); } }}><Icons.Check size={12}/> {isVpnMode ? 'Uncheck All' : 'Décocher tout'}</Button>
                                    <Button variant="outline" className="text-xs h-auto py-1.5" onClick={() => { if(confirm(isVpnMode ? 'Remove all today stars?' : 'Retirer toutes les étoiles today ?')) { setSafeData(p => ({...p, tasks: p.tasks.map(t => ({...t, todayStar: false}))})); } }}><Icons.Star size={12}/> {isVpnMode ? 'Clear Stars' : 'Reset Stars'}</Button>
                                </div>
                            </div>

                            <div className={`pt-2 border-t ${isVpnMode ? 'border-gray-200' : 'border-white/10'}`}><h3 className={`text-xs font-bold mb-1.5 uppercase ${isVpnMode ? 'text-green-600' : 'text-emerald-400'}`}><Icons.Save size={10} className="inline mr-1"/> JSON BACKUP</h3>
                                <div className="grid grid-cols-2 gap-1.5"><Button variant="outline" onClick={exportToJson} className="text-xs h-auto py-1.5"><Icons.Download size={12} /> EXPORT</Button><Button variant="outline" onClick={() => importFileInputRef.current?.click()} className="text-xs h-auto py-1.5"><Icons.Upload size={12} /> IMPORT</Button><input type="file" ref={importFileInputRef} className="hidden" accept=".json" onChange={handleImportJson} /></div>
                            </div>

                            {!isVpnMode && (<div className={`pt-2 border-t border-white/10`}><Button variant="ghost" onClick={() => setShowDebug(!showDebug)} className="w-full text-xs">{showDebug ? "Hide" : "Logs"}</Button>{showDebug && <div className="mt-1 p-1.5 rounded h-16 overflow-y-auto text-xs font-mono bg-black/50 text-slate-400">{debugLogs.map((l,i) => <div key={i}>{l}</div>)}</div>}</div>)}

                            {!isVpnMode && (<div className="pt-2 border-t border-white/10"><Button className="w-full bg-red-900/20 border-red-900/50 text-red-400 hover:bg-red-900/40 py-2 text-xs" onClick={() => { if(confirm("Air Gap?")) { setSafeData(p => ({ ...p, settings: { ...p.settings, gistToken: "", gistId: "", vpnMode: true } })); setShowSettings(false); } }}>AIR GAP</Button></div>)}

                            {!isVpnMode && (<div className={`flex gap-2 pt-2 border-t border-white/10`}>
                                <Button className="flex-1 py-2 text-xs" onClick={() => pullFromGist()}>RE-SYNC</Button>
                                <Button className="flex-1 bg-saas border-saas text-white font-bold py-2 text-xs" onClick={() => syncToGist(data, data.settings.gistToken, data.settings.gistId)}>PUSH</Button>
                            </div>)}
                            {!isVpnMode && <Button variant="outline" className="w-full mt-1 text-xs" onClick={copyMobileLink}><Icons.Copy size={12} /> MOBILE LINK</Button>}
                            <Button variant="ghost" className="w-full mt-2" onClick={() => setShowSettings(false)}>{isVpnMode ? 'Close' : 'Fermer'}</Button>
                        </div>
                    </Card>
                 </div>
            )}
            <ShutdownModal active={showShutdown} onClose={() => setShowShutdown(false)} onSaveNextDay={(tasks) => { if (tasks) setSafeData(prev => ({ ...prev, journal: [{ time: new Date().toLocaleTimeString(), date: new Date().toLocaleDateString(), text: `Top 3 Demain: ${tasks}` }, ...prev.journal] })); }} />
        </div>
    );
}
