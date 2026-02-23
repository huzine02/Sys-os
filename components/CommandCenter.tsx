
import React, { useState, useRef } from 'react';
import { AppData } from '../types';
import { aiService, ChatMessage } from '../services/ai';
import { PHASE_DATA, parseMarkdown } from '../utils';
import { Card, Button, Input } from './UI';
import { Icons } from './Icons';
import DOMPurify from 'dompurify';

interface CommandCenterProps {
    data: AppData;
    onUpdateData: (newData: Partial<AppData>) => void;
    onAddTasks: (tasks: any[]) => void;
}

const CommandCenter: React.FC<CommandCenterProps> = ({ data, onUpdateData, onAddTasks }) => {
    const [mode, setMode] = useState<'express' | 'chat' | 'strategic'>('express');
    const [loading, setLoading] = useState(false);
    
    // Express State
    const [expressInput, setExpressInput] = useState("");
    const [uploadedFile, setUploadedFile] = useState<{file: File, base64: string} | null>(null);
    const [expressResult, setExpressResult] = useState<{analysis: string, tasks: any[]} | null>(null);
    const fileInputRef = useRef<HTMLInputElement>(null);

    // Chat State
    const [chatInput, setChatInput] = useState("");
    const [chatHistory, setChatHistory] = useState<ChatMessage[]>([]);

    // Strategic State
    const [stratInput, setStratInput] = useState("");
    const [stratResult, setStratResult] = useState<{verdict: string, analysis: string, recommendation: string, tasks: any[]} | null>(null);

    // --- HANDLERS ---

    const handleFileUpload = (e: React.ChangeEvent<HTMLInputElement>) => {
        const file = e.target.files?.[0];
        if (file) {
            const reader = new FileReader();
            reader.onload = (ev) => {
                setUploadedFile({ file, base64: ev.target?.result as string });
            };
            reader.readAsDataURL(file);
        }
    };

    const runExpress = async () => {
        if (!expressInput && !uploadedFile) return;

        setLoading(true);
        setExpressResult(null); // Reset previous
        try {
            const response = await aiService.generateTasks(
                data.context,
                data.blueprint,
                expressInput,
                'auto',
                uploadedFile?.base64,
                uploadedFile?.file.type
            );
            
            const parsed = aiService.parseResponse(response);
            
            // Si pas d'analyse ni de tâches, on affiche le raw pour debug ou message d'erreur
            if (!parsed.analysis && parsed.tasks.length === 0) {
                 setExpressResult({ analysis: "L'IA n'a pas renvoyé de résultat structuré. Vérifiez la clé API ou réessayez.", tasks: [] });
            } else {
                 setExpressResult({ analysis: parsed.analysis, tasks: parsed.tasks });
            }
            
        } catch (e: any) {
            setExpressResult({ analysis: "Erreur critique: " + e.message, tasks: [] });
        }
        setLoading(false);
    };

    const runChat = async () => {
        if (!chatInput.trim()) return;

        const newUserMsg: ChatMessage = { role: 'user', content: chatInput };
        // Optimistic UI Update
        const newHistory = [...chatHistory, newUserMsg];
        setChatHistory(newHistory);
        setChatInput("");
        setLoading(true);

        try {
            const responseText = await aiService.chat(
                data.context,
                data.blueprint,
                newHistory // On envoie tout l'historique (aiService gère le découpage)
            );
            
            setChatHistory(prev => [...prev, { role: 'assistant', content: responseText || "..." }]);
        } catch (e: any) {
            setChatHistory(prev => [...prev, { role: 'assistant', content: "Erreur connexion: " + e.message }]);
        }
        setLoading(false);
    };

    const runStrategic = async () => {
        if (!stratInput.trim()) return;

        setLoading(true);
        setStratResult(null);
        try {
            const response = await aiService.strategicCheck(
                data.blueprint,
                stratInput
            );
            const parsed = aiService.parseResponse(response);
            setStratResult({
                verdict: parsed.verdict || '?',
                analysis: parsed.analysis,
                recommendation: parsed.recommendation || '',
                tasks: parsed.tasks
            });
        } catch (e: any) {
             setStratResult({
                verdict: 'ERROR',
                analysis: e.message,
                recommendation: "Vérifiez la connexion.",
                tasks: []
            });
        }
        setLoading(false);
    };

    // --- BLUEPRINT DATA ---
    const currentPhase = PHASE_DATA[data.blueprint.phase] || PHASE_DATA[1];
    const progressPct = Math.min(100, (parseInt(data.blueprint.mrr) / currentPhase.target) * 100);

    return (
        <div className="flex flex-col gap-6 h-full max-w-5xl mx-auto animate-slide-up">
            
            {/* HEADER & BLUEPRINT WIDGET */}
            <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
                {/* Context/Config Card */}
                <Card className="p-5 flex flex-col justify-between md:col-span-1 border-white/10">
                    <div>
                        <div className="flex justify-between items-center mb-4">
                            <h3 className="font-bold flex items-center gap-2 text-patri">
                                <Icons.Brain size={18} /> COMMAND CENTER
                            </h3>
                        </div>
                        <div className="text-xs text-slate-500 mb-2">Contexte global :</div>
                        <textarea 
                            className="w-full h-20 bg-white/5 border border-white/10 rounded p-2 text-xs text-slate-300 resize-none focus:outline-none"
                            value={data.context}
                            onChange={(e) => onUpdateData({ context: e.target.value })}
                        />
                    </div>
                </Card>

                {/* Blueprint Progress */}
                <Card className="p-5 md:col-span-2 relative overflow-hidden bg-gradient-to-br from-[#0F1115] to-[#1a1c1f]">
                    <div className="absolute top-0 left-0 w-1 h-full bg-blue-500"></div>
                    <div className="flex justify-between items-start mb-6">
                        <div>
                            <div className="text-xs font-bold text-blue-500 tracking-wider mb-1">PHASE {data.blueprint.phase} : {currentPhase.name.toUpperCase()}</div>
                            <div className="text-lg font-bold text-white">{currentPhase.objective}</div>
                        </div>
                        <div className="text-right">
                            <div className="text-xs text-slate-500">CIBLE</div>
                            <div className="font-mono font-bold text-xl text-green-500">{currentPhase.target}€ <span className="text-xs text-slate-600">MRR</span></div>
                        </div>
                    </div>

                    <div className="space-y-2 mb-4">
                        <div className="flex justify-between text-xs text-slate-400">
                            <span>Progression (MRR: {data.blueprint.mrr}€)</span>
                            <span>{progressPct.toFixed(0)}%</span>
                        </div>
                        <div className="w-full h-2 bg-white/5 rounded-full overflow-hidden">
                            <div className="h-full bg-blue-500 transition-all duration-1000" style={{ width: `${progressPct}%` }}></div>
                        </div>
                    </div>

                    <div className="flex gap-4 mt-auto">
                        <div className="flex-1">
                            <label className="text-xs text-slate-500 uppercase">Phase</label>
                            <select 
                                className="w-full bg-white/5 border border-white/10 rounded text-xs py-1 px-2 text-slate-300"
                                value={data.blueprint.phase}
                                onChange={(e) => onUpdateData({ blueprint: { ...data.blueprint, phase: parseInt(e.target.value) } })}
                            >
                                <option value="1">1. Validation</option>
                                <option value="2">2. Produit</option>
                                <option value="3">3. Scale</option>
                            </select>
                        </div>
                        <div className="flex-1">
                            <label className="text-xs text-slate-500 uppercase">MRR Actuel</label>
                            <input 
                                type="number" 
                                className="w-full bg-white/5 border border-white/10 rounded text-xs py-1 px-2 text-slate-300"
                                value={data.blueprint.mrr}
                                onChange={(e) => onUpdateData({ blueprint: { ...data.blueprint, mrr: e.target.value } })}
                            />
                        </div>
                    </div>
                </Card>
            </div>

            {/* TABS */}
            <div className="flex border-b border-white/5">
                <button 
                    onClick={() => setMode('express')}
                    className={`px-6 py-3 text-sm font-medium flex items-center gap-2 border-b-2 transition-colors ${mode === 'express' ? 'border-blue-500 text-white' : 'border-transparent text-slate-500 hover:text-slate-300'}`}
                >
                    <Icons.Zap size={16} /> EXPRESS
                </button>
                <button 
                    onClick={() => setMode('chat')}
                    className={`px-6 py-3 text-sm font-medium flex items-center gap-2 border-b-2 transition-colors ${mode === 'chat' ? 'border-purple-500 text-white' : 'border-transparent text-slate-500 hover:text-slate-300'}`}
                >
                    <Icons.MessageSquare size={16} /> DISCUSSION
                </button>
                <button 
                    onClick={() => setMode('strategic')}
                    className={`px-6 py-3 text-sm font-medium flex items-center gap-2 border-b-2 transition-colors ${mode === 'strategic' ? 'border-cyan-500 text-white' : 'border-transparent text-slate-500 hover:text-slate-300'}`}
                >
                    <Icons.Target size={16} /> STRATÉGIE
                </button>
            </div>

            {/* CONTENT AREA */}
            <div className="flex-1 min-h-[400px]">
                
                {/* MODE: EXPRESS */}
                {mode === 'express' && (
                    <div className="animate-[fadeIn_0.3s_ease-out]">
                        <div className="mb-6">
                            <label className="text-sm text-slate-400 mb-2 block">Qu'est-ce que tu veux faire ? (Ou glisse un fichier)</label>
                            <textarea 
                                className="w-full h-32 bg-white/[0.03] border border-white/10 rounded-xl p-4 text-slate-200 focus:bg-white/5 focus:border-blue-500/50 focus:outline-none transition-all resize-none"
                                placeholder="Ex: Analyse ce devis PDF, Découpe mon projet Nutri-Track en tâches..."
                                value={expressInput}
                                onChange={(e) => setExpressInput(e.target.value)}
                                onKeyDown={(e) => { if (e.key === 'Enter' && e.metaKey) runExpress(); }}
                            />
                            
                            <div className="flex items-center justify-between mt-3">
                                <div className="flex items-center gap-3">
                                    <button 
                                        onClick={() => fileInputRef.current?.click()}
                                        className={`px-3 py-1.5 rounded-lg border text-xs font-medium flex items-center gap-2 transition-colors ${uploadedFile ? 'bg-green-500/10 border-green-500/30 text-green-500' : 'bg-white/5 border-white/10 text-slate-400 hover:bg-white/10'}`}
                                    >
                                        <Icons.Upload size={14} />
                                        {uploadedFile ? uploadedFile.file.name : "Joindre Fichier"}
                                    </button>
                                    {uploadedFile && (
                                        <button onClick={() => setUploadedFile(null)} className="text-slate-500 hover:text-red-500"><Icons.X size={14} /></button>
                                    )}
                                    <input type="file" ref={fileInputRef} className="hidden" onChange={handleFileUpload} accept="image/*,.pdf" />
                                </div>
                                <Button variant="primary" onClick={runExpress} disabled={loading} className="w-32">
                                    {loading ? '...' : 'GÉNÉRER'}
                                </Button>
                            </div>
                        </div>

                        {expressResult && (
                            <div className="space-y-4 animate-slide-up">
                                {expressResult.analysis && (
                                    <div className="p-4 bg-blue-500/5 border border-blue-500/20 rounded-xl text-sm text-slate-300 leading-relaxed" 
                                         dangerouslySetInnerHTML={{ __html: DOMPurify.sanitize(parseMarkdown(expressResult.analysis)) }} 
                                    />
                                )}
                                
                                {expressResult.tasks.length > 0 && (
                                    <div className="grid grid-cols-1 gap-2">
                                        <div className="flex justify-between items-center mb-2">
                                            <span className="text-xs font-bold text-slate-500">TÂCHES GÉNÉRÉES ({expressResult.tasks.length})</span>
                                            <Button variant="ghost" className="text-xs h-7" onClick={() => { onAddTasks(expressResult.tasks); setExpressResult(null); }}>
                                                TOUT AJOUTER
                                            </Button>
                                        </div>
                                        {expressResult.tasks.map((t, i) => (
                                            <div key={i} className="flex items-center gap-3 p-3 bg-white/[0.03] border border-white/5 rounded-lg">
                                                <span className="text-xs uppercase font-bold px-2 py-0.5 rounded bg-white/5 text-slate-400">{t.type}</span>
                                                <span className="flex-1 text-sm text-slate-300">{t.text}</span>
                                                <div className={`w-2 h-2 rounded-full ${t.priority === 'H' ? 'bg-red-500' : t.priority === 'M' ? 'bg-orange-500' : 'bg-slate-500'}`}></div>
                                                <button onClick={() => { onAddTasks([t]); }} className="text-slate-500 hover:text-green-500 hover:bg-green-500/10 p-1 rounded transition-colors">+</button>
                                            </div>
                                        ))}
                                    </div>
                                )}
                            </div>
                        )}
                    </div>
                )}

                {/* MODE: CHAT */}
                {mode === 'chat' && (
                    <div className="flex flex-col h-[500px] bg-white/[0.02] border border-white/5 rounded-2xl overflow-hidden animate-[fadeIn_0.3s_ease-out]">
                        <div className="flex-1 overflow-y-auto p-4 space-y-4">
                            {chatHistory.length === 0 && (
                                <div className="text-center text-slate-500 mt-20 text-sm">
                                    <p className="mb-2">👋 Je suis ton Coach Hybrid.</p>
                                    <p>Dis-moi où tu bloques, je t'aide à prioriser.</p>
                                </div>
                            )}
                            {chatHistory.map((msg, i) => (
                                <div key={i} className={`flex ${msg.role === 'user' ? 'justify-end' : 'justify-start'}`}>
                                    <div 
                                        className={`max-w-[80%] p-3 rounded-xl text-sm leading-relaxed ${msg.role === 'user' ? 'bg-purple-600 text-white rounded-br-none' : 'bg-white/10 text-slate-200 rounded-bl-none'}`}
                                        dangerouslySetInnerHTML={{ __html: DOMPurify.sanitize(parseMarkdown(msg.content)) }}
                                    >
                                    </div>
                                </div>
                            ))}
                        </div>
                        <div className="p-4 border-t border-white/5 flex gap-3">
                            <Input 
                                placeholder="Pose une question..."
                                value={chatInput}
                                onChange={(e) => setChatInput(e.target.value)}
                                onKeyDown={(e) => { if (e.key === 'Enter') runChat(); }}
                            />
                            <Button variant="ghost" onClick={runChat} disabled={loading} className="bg-white/5 hover:bg-white/10">
                                <Icons.Send size={18} />
                            </Button>
                        </div>
                    </div>
                )}

                {/* MODE: STRATEGIC */}
                {mode === 'strategic' && (
                    <div className="animate-[fadeIn_0.3s_ease-out]">
                         <div className="mb-6">
                            <div className="bg-cyan-500/10 border border-cyan-500/20 rounded-xl p-4 mb-4 flex gap-4 items-start">
                                <Icons.AlertTriangle className="text-cyan-500 shrink-0 mt-0.5" size={20} />
                                <div>
                                    <h4 className="font-bold text-cyan-500 text-sm mb-1">CHECKPOINT STRATÉGIQUE</h4>
                                    <p className="text-xs text-slate-400">Avant de lancer une action, vérifie si elle est alignée avec le Blueprint actuel. L'IA va te challenger.</p>
                                </div>
                            </div>

                            <div className="flex gap-3">
                                <Input 
                                    placeholder="Ex: Je veux coder le système de notifications..."
                                    value={stratInput}
                                    onChange={(e) => setStratInput(e.target.value)}
                                    onKeyDown={(e) => { if (e.key === 'Enter') runStrategic(); }}
                                />
                                <Button variant="primary" onClick={runStrategic} disabled={loading} className="bg-cyan-600 border-cyan-500 hover:bg-cyan-700 w-32">
                                    VÉRIFIER
                                </Button>
                            </div>
                        </div>

                        {stratResult && (
                            <div className={`p-6 rounded-2xl border ${stratResult.verdict.includes('NON') ? 'bg-orange-500/10 border-orange-500/30' : 'bg-green-500/10 border-green-500/30'} animate-slide-up`}>
                                <div className="flex items-center gap-3 mb-4">
                                    <div className={`text-lg font-bold ${stratResult.verdict.includes('NON') ? 'text-orange-500' : 'text-green-500'}`}>
                                        {stratResult.verdict.includes('NON') ? '⚠️ NON ALIGNÉ' : '✅ ALIGNÉ'}
                                    </div>
                                </div>
                                
                                <div className="space-y-4 text-sm text-slate-300">
                                    <div><strong className="text-white">Analyse :</strong> <span dangerouslySetInnerHTML={{ __html: DOMPurify.sanitize(parseMarkdown(stratResult.analysis)) }} /></div>
                                    <div><strong className="text-white">Conseil :</strong> <span dangerouslySetInnerHTML={{ __html: DOMPurify.sanitize(parseMarkdown(stratResult.recommendation)) }} /></div>
                                </div>

                                {stratResult.tasks.length > 0 && (
                                    <div className="mt-6 pt-6 border-t border-white/10">
                                        <div className="flex justify-between items-center mb-3">
                                            <span className="text-xs font-bold text-slate-400">ACTIONS VALIDÉES</span>
                                            <Button variant="ghost" className="text-xs h-8 bg-white/5" onClick={() => { onAddTasks(stratResult.tasks); setStratResult(null); }}>
                                                AJOUTER CES TÂCHES
                                            </Button>
                                        </div>
                                        {stratResult.tasks.map((t, i) => (
                                            <div key={i} className="text-xs text-slate-400 border-l-2 border-slate-600 pl-3 py-1 mb-1">
                                                {t.text}
                                            </div>
                                        ))}
                                    </div>
                                )}
                            </div>
                        )}
                    </div>
                )}
            </div>
        </div>
    );
};

export default CommandCenter;
