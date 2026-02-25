
import React, { useState } from 'react';
import { Task, Settings } from '../types';
import { Icons } from './Icons';
import { Button, Input } from './UI';
import { playSoftBeep, getTaskDuration, sanitizeForOffice } from '../utils';

// --- CORPORATE MASK (PANIC MODE) ---
export const CorporateMask: React.FC<{ active: boolean }> = ({ active }) => {
    if (!active) return null;

    // Fake Data generation
    const rows = Array.from({ length: 25 }).map((_, i) => ({
        id: i + 100,
        task: `INC-${3920 + i} - Resource Allocation Check`,
        status: Math.random() > 0.8 ? 'Pending' : 'Resolved',
        date: new Date().toLocaleDateString(),
        owner: 'System',
        priority: Math.random() > 0.9 ? 'High' : 'Low'
    }));

    return (
        <div className="fixed inset-0 z-[9999] bg-white text-black font-sans text-xs flex flex-col cursor-default select-none">
            {/* Fake Excel Header */}
            <div className="bg-[#107C41] text-white p-2 flex items-center justify-between">
                <div className="font-bold flex items-center gap-2"><div className="w-4 h-4 bg-white text-[#107C41] flex items-center justify-center font-bold text-[10px] rounded-[1px]">X</div> Q3_Resource_Tracking_EMEA.xlsx</div>
                <div className="flex gap-4 opacity-80">
                    <span>File</span><span>Home</span><span>Insert</span><span>Layout</span><span>Formulas</span>
                </div>
            </div>
            {/* Toolbar */}
            <div className="bg-[#F3F2F1] border-b border-[#E1DFDD] p-2 flex gap-4 text-gray-600">
                <div className="flex gap-2 bg-white border px-2 py-1 items-center">Arial <Icons.ChevronDown size={10}/></div>
                <div className="flex gap-2 bg-white border px-2 py-1 items-center">10 <Icons.ChevronDown size={10}/></div>
                <div className="font-bold px-2">B</div><div className="italic px-2">I</div><div className="underline px-2">U</div>
            </div>
            {/* Grid */}
            <div className="flex-1 overflow-auto bg-white">
                <table className="w-full border-collapse">
                    <thead>
                        <tr className="bg-[#E1DFDD] text-gray-600 font-normal">
                            <th className="border w-10"></th>
                            <th className="border px-2 py-1 text-left font-normal w-32">Ticket ID</th>
                            <th className="border px-2 py-1 text-left font-normal w-96">Description</th>
                            <th className="border px-2 py-1 text-left font-normal w-24">Status</th>
                            <th className="border px-2 py-1 text-left font-normal w-24">Date</th>
                            <th className="border px-2 py-1 text-left font-normal w-24">Owner</th>
                        </tr>
                    </thead>
                    <tbody>
                        {rows.map((r, i) => (
                            <tr key={r.id} className="hover:bg-blue-50">
                                <td className="border text-center bg-[#F3F2F1] text-gray-500">{i+1}</td>
                                <td className="border px-2 py-1 border-gray-200">{r.id}</td>
                                <td className="border px-2 py-1 border-gray-200">{r.task}</td>
                                <td className="border px-2 py-1 border-gray-200">{r.status}</td>
                                <td className="border px-2 py-1 border-gray-200">{r.date}</td>
                                <td className="border px-2 py-1 border-gray-200">{r.owner}</td>
                            </tr>
                        ))}
                    </tbody>
                </table>
            </div>
            {/* Footer */}
            <div className="bg-[#F3F2F1] border-t p-1 flex gap-2 text-gray-500">
                <div className="bg-white px-3 py-0.5 border-t-2 border-[#107C41] text-[#107C41] font-bold">Sheet1</div>
                <div className="px-3 py-0.5">Sheet2</div>
                <div className="px-3 py-0.5">Sheet3</div>
            </div>
        </div>
    );
};

// --- EYE CARE OVERLAY (20-20-20 RULE) ---
export const EyeCareOverlay: React.FC<{
    active: boolean;
    timeLeft: number;
    onSkip: () => void;
    isOfficeMode?: boolean;
}> = ({ active, timeLeft, onSkip, isOfficeMode = false }) => {
    if (!active) return null;

    return (
        <div className={`fixed inset-0 z-[200] flex flex-col items-center justify-center animate-fade-in transition-all duration-1000 ${isOfficeMode ? 'bg-gray-900/60 backdrop-blur-sm' : 'bg-black/50 backdrop-blur-md'}`}>
             <div className={`flex flex-col items-center text-center ${isOfficeMode ? 'bg-white border border-gray-300 rounded-xl p-10 shadow-lg' : 'bg-[#050507]/90 border border-blue-500/30 rounded-full p-12 shadow-[0_0_100px_rgba(59,130,246,0.3)]'}`}>
                <Icons.Eye size={48} className={`mb-6 animate-pulse ${isOfficeMode ? 'text-[#2563EB]' : 'text-blue-400'}`} />
                <h2 className={`text-2xl font-bold mb-2 tracking-widest ${isOfficeMode ? 'text-gray-800' : 'text-white'}`}>{isOfficeMode ? 'SCREEN BREAK' : 'PROTOCOLE RETINIEN'}</h2>
                <div className={`text-6xl font-mono mb-6 tabular-nums ${isOfficeMode ? 'text-[#2563EB]' : 'text-blue-500'}`}>{timeLeft}s</div>
                <p className={`text-sm max-w-xs leading-relaxed mb-8 ${isOfficeMode ? 'text-gray-500' : 'text-slate-400'}`}>
                    {isOfficeMode ? (<>20-20-20 rule active.<br/><span className={isOfficeMode ? 'text-gray-800 font-medium' : 'text-white'}>Look at an object 20ft away.</span><br/>Rest your eyes.</>) : (<>Regle 20-20-20 activee.<br/><span className="text-white">Regarde un objet a 6 metres.</span><br/>Detache tes yeux de l'ecran.</>)}
                </p>
                <button
                    onClick={onSkip}
                    className={`text-xs uppercase tracking-widest border-b border-transparent transition-colors ${isOfficeMode ? 'text-gray-400 hover:text-gray-800 hover:border-gray-800' : 'text-slate-600 hover:text-white hover:border-white'}`}
                >
                    {isOfficeMode ? 'Dismiss' : 'Ignorer'}
                </button>
             </div>
        </div>
    );
};

// --- FOCUS OVERLAY (Timer managed by App.tsx Web Worker for background reliability) ---
export const FocusOverlay: React.FC<{
    task: Task | null;
    active: boolean;
    elapsed: number;
    isRunning: boolean;
    onStart: () => void;
    onPause: () => void;
    onResume: () => void;
    onClose: () => void;
    onComplete: () => void;
    onNext: () => void;
    isOfficeMode?: boolean;
    settings?: Settings;
}> = ({ task, active, elapsed, isRunning, onStart, onPause, onResume, onClose, onComplete, onNext, isOfficeMode = false, settings }) => {

    const fmtTime = (s: number) => {
        const m = Math.floor(s / 60).toString().padStart(2, '0');
        const sec = (s % 60).toString().padStart(2, '0');
        return `${m}:${sec}`;
    };

    if (!active || !task) return null;

    const durationMins = getTaskDuration(task.text);
    const targetSeconds = durationMins > 0.5 ? durationMins * 60 : 1500;
    const isOvertime = elapsed > targetSeconds;
    const remaining = Math.max(0, targetSeconds - elapsed);

    return (
        <div className={`fixed inset-0 z-50 flex flex-col items-center justify-center animate-slide-up transition-colors duration-1000 ${isOfficeMode ? 'bg-gray-50' : 'bg-gradient-to-b from-[#050505] to-[#0A0C10]'} ${isOvertime ? 'border-[4px] border-red-900/50' : ''}`}>
            <button onClick={onClose} className={`absolute top-8 right-8 p-3 rounded-full border hover:bg-white/10 ${isOfficeMode ? 'border-gray-300 text-gray-500' : 'border-white/10 text-slate-400'}`}>
                <Icons.X size={24} />
            </button>

            <div className={`px-4 py-1.5 rounded-full border text-xs font-bold tracking-widest uppercase mb-8 ${isOfficeMode ? 'border-[#2563EB]/30 bg-[#2563EB]/10 text-[#2563EB]' : 'border-pro/20 bg-pro/10 text-pro'}`}>
                {sanitizeForOffice(task.type, isOfficeMode, settings)}
            </div>

            <h1 className={`text-4xl md:text-5xl font-bold text-center max-w-3xl leading-tight mb-4 px-4 ${isOfficeMode ? 'text-gray-800' : 'text-white'}`}>
                {sanitizeForOffice(task.text, isOfficeMode, settings)}
            </h1>

            {/* Countdown or elapsed */}
            {!isOvertime && elapsed > 0 && (
                <div className={`text-sm font-mono mb-2 ${isOfficeMode ? 'text-gray-400' : 'text-slate-500'}`}>{isOfficeMode ? 'Remaining' : 'Restant'}: {fmtTime(remaining)}</div>
            )}

            <div className={`font-mono text-6xl mb-12 opacity-80 transition-colors ${isOvertime ? 'text-red-500 animate-pulse' : isOfficeMode ? 'text-gray-400' : 'text-slate-500'}`}>
                {fmtTime(elapsed)}
                {isOvertime && <div className="text-sm font-sans tracking-widest text-red-500/50 mt-2 text-center">OVERTIME</div>}
            </div>

            <div className="flex items-center gap-4">
                <button
                    onClick={() => { if (!isRunning && elapsed === 0) onStart(); else if (isRunning) onPause(); else onResume(); }}
                    className={`h-12 px-8 rounded-full border font-medium text-lg flex items-center gap-2 ${isOfficeMode ? 'border-gray-300 bg-gray-100 hover:bg-gray-200 text-gray-700' : 'border-white/10 bg-white/5 hover:bg-white/10'}`}
                >
                    {isRunning ? <><Icons.Square size={18} fill="currentColor" /> Pause</> : <><Icons.Play size={18} fill="currentColor" /> {elapsed > 0 ? (isOfficeMode ? 'Resume' : 'Reprendre') : 'Timer'}</>}
                </button>

                <button
                    onClick={() => { playSoftBeep(); onComplete(); }}
                    className={`h-12 px-10 rounded-full font-bold text-lg hover:scale-105 transition-transform ${isOvertime ? 'bg-red-500 hover:bg-red-400 text-white shadow-[0_0_30px_rgba(239,68,68,0.4)]' : isOfficeMode ? 'bg-[#2563EB] text-white' : 'bg-white text-black shadow-[0_0_30px_rgba(255,255,255,0.15)]'}`}
                >
                    {isOfficeMode ? 'DONE' : 'TERMINE'}
                </button>

                <button
                    onClick={onNext}
                    className={`h-12 w-12 rounded-full border flex items-center justify-center ${isOfficeMode ? 'border-gray-300 bg-gray-100 hover:bg-gray-200' : 'border-white/10 bg-white/5 hover:bg-white/10'}`}
                >
                    <Icons.ArrowRight size={20} />
                </button>
            </div>
        </div>
    );
};

// --- SHUTDOWN MODAL ---
export const ShutdownModal: React.FC<{
    active: boolean;
    onClose: () => void;
    onSaveNextDay: (tasks: string) => void;
}> = ({ active, onClose, onSaveNextDay }) => {
    const [nextDayTasks, setNextDayTasks] = useState("");

    if (!active) return null;

    return (
        <div className="fixed inset-0 z-50 bg-black/80 backdrop-blur-sm flex items-center justify-center p-4 animate-[fadeIn_0.2s_ease-out]">
            <div className="bg-[#0F1115] border border-white/10 rounded-2xl p-8 max-w-md w-full shadow-2xl text-center">
                <h2 className="text-2xl font-bold text-white mb-2">SHUTDOWN</h2>
                <p className="text-slate-400 mb-8">22h45 — End of Day</p>

                <div className="space-y-4 text-left mb-8">
                    <label className="flex items-center gap-3 text-slate-300 cursor-pointer">
                        <input type="checkbox" className="w-5 h-5 rounded border-slate-600 bg-transparent text-saas focus:ring-0 checked:bg-saas checked:border-saas" />
                        <span>Daily win logged</span>
                    </label>
                    <label className="flex items-center gap-3 text-slate-300 cursor-pointer">
                        <input type="checkbox" className="w-5 h-5 rounded border-slate-600 bg-transparent text-saas focus:ring-0 checked:bg-saas checked:border-saas" />
                        <span>Screens off</span>
                    </label>

                    <div className="pt-2">
                        <label className="block text-sm text-slate-500 mb-2">Top 3 Tomorrow:</label>
                        <Input
                            value={nextDayTasks}
                            onChange={(e) => setNextDayTasks(e.target.value)}
                            placeholder="1. / 2. / 3."
                        />
                    </div>
                </div>

                <Button
                    className="w-full py-3 bg-white text-black hover:bg-slate-200 font-bold"
                    onClick={() => { onSaveNextDay(nextDayTasks); onClose(); }}
                >
                    CONFIRM
                </Button>
            </div>
        </div>
    );
};

// --- CIRCUIT BREAKER OVERLAY ---
export const CircuitBreakerOverlay: React.FC<{
    active: boolean;
    onReset: () => void;
    isOfficeMode?: boolean;
}> = ({ active, onReset, isOfficeMode = false }) => {
    if (!active) return null;

    return (
        <div className={`fixed inset-0 z-[100] backdrop-blur-xl flex flex-col items-center justify-center animate-pulse-soft ${isOfficeMode ? 'bg-gray-900/70' : 'bg-black/80'}`}>
            <Icons.Zap size={64} className="text-red-500 mb-6" />
            <h1 className={`text-5xl font-black mb-4 tracking-tighter ${isOfficeMode ? 'text-white' : 'text-white'}`}>{isOfficeMode ? 'SESSION TIMEOUT' : 'CIRCUIT OUVERT'}</h1>
            <p className="text-xl text-red-400 mb-8 font-mono">{isOfficeMode ? '90 MINUTES CONTINUOUS ACTIVITY' : '90 MINUTES CONTINUOUS'}</p>
            <p className={`max-w-md text-center mb-12 leading-relaxed ${isOfficeMode ? 'text-gray-300' : 'text-slate-400'}`}>
                {isOfficeMode ? (<>Sustained screen time detected. Productivity declining.<br/><br/><span className="text-white font-bold">ACTION:</span> Stand up. Walk for 5 minutes. Hydrate.</>) : (<>Ton systeme nerveux sature. Ta productivite chute.<br/><br/><span className="text-white font-bold">ORDRE :</span> Leve-toi. Marche 5 minutes. Bois de l'eau.</>)}
            </p>
            <Button
                className={`h-16 px-12 text-lg text-white border-red-500 hover:bg-red-700 shadow-[0_0_40px_rgba(220,38,38,0.5)] ${isOfficeMode ? 'bg-[#2563EB] border-[#2563EB] hover:bg-[#005fa3] shadow-none' : 'bg-red-600'}`}
                onClick={onReset}
            >
                {isOfficeMode ? 'RESUME SESSION' : 'JE SUIS FRAIS'}
            </Button>
        </div>
    );
};
