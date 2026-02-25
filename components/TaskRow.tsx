
import React from 'react';
import { Task } from '../types';
import { Icons } from './Icons';
import { getThemeColor, ASSETS_CONFIG, sanitizeForOffice, getStreakCount, getSubtaskProgress } from '../utils';

interface TaskRowProps {
    task: Task;
    onToggle: (id: number) => void;
    onDelete: (id: number) => void;
    onStar: (id: number) => void;
    onFocus: (id: number) => void;
    showTypeDot?: boolean;
    isBlurred?: boolean;
    isOfficeMode?: boolean;
    allTasks?: Task[];
}

const TaskRow: React.FC<TaskRowProps> = ({ task, onToggle, onDelete, onStar, onFocus, showTypeDot, isBlurred, isOfficeMode = false, allTasks }) => {

    const getSubtypeBadge = () => {
        if (task.type in ASSETS_CONFIG) {
            const rawLabel = ASSETS_CONFIG[task.type as keyof typeof ASSETS_CONFIG];
            const label = sanitizeForOffice(rawLabel, isOfficeMode);
            return (
                <span className={`mr-2 px-1.5 py-0.5 rounded-[4px] border text-xs font-bold uppercase tracking-wider ${isOfficeMode ? 'bg-gray-100 border-gray-200 text-gray-500' : 'bg-patri/10 border-patri/20 text-patri'}`}>
                    {label}
                </span>
            );
        }
        return null;
    };

    const displayText = sanitizeForOffice(task.text, isOfficeMode);
    const isToday = task.todayStar && !task.done;

    return (
        <div className={`group relative flex items-center p-2 rounded-lg border transition-all duration-200 cursor-pointer touch-manipulation
            ${isToday ? (isOfficeMode ? 'border-orange-200 bg-orange-50' : 'border-gold/20 bg-gold/[0.03]') : (isOfficeMode ? 'border-transparent hover:bg-gray-50 hover:border-gray-200' : 'border-transparent hover:bg-white/[0.03] hover:border-white/[0.05]')}
            ${task.done ? 'opacity-50' : ''}`}
             onClick={() => onFocus(task.id)}>

            <div className="flex items-center flex-1 min-w-0">
                <div
                    onClick={(e) => { e.stopPropagation(); onToggle(task.id); }}
                    className={`w-5 h-5 md:w-[22px] md:h-[22px] rounded-[6px] border flex items-center justify-center mr-2.5 flex-shrink-0 cursor-pointer transition-all duration-200
                    ${task.done
                        ? (isOfficeMode ? 'bg-[#2563EB] border-[#2563EB] text-white' : 'bg-saas border-saas text-white shadow-[0_0_10px_rgba(16,185,129,0.4)]')
                        : (isOfficeMode ? 'border-gray-300 hover:border-gray-400 bg-white' : 'border-white/20 hover:border-white/40 bg-white/[0.02]')}`}
                >
                    {task.done && <Icons.Check size={12} strokeWidth={4} />}
                </div>

                {/* Star inline when todayStar */}
                {isToday && (
                    <Icons.Star size={14} fill="currentColor" className={`mr-1.5 flex-shrink-0 ${isOfficeMode ? 'text-orange-500' : 'text-gold drop-shadow-[0_0_6px_rgba(245,158,11,0.5)]'}`} />
                )}

                {showTypeDot && !getSubtypeBadge() && (
                    <div className={`w-1.5 h-1.5 rounded-full mr-2.5 shadow-[0_0_6px_currentColor] flex-shrink-0 ${getThemeColor(task.type, isOfficeMode)} bg-current`}></div>
                )}

                {getSubtypeBadge()}

                {/* Recurring task badge with streak */}
                {task.recurrenceDays && task.recurrenceDays > 0 && (() => {
                    const streak = allTasks ? getStreakCount(task, allTasks) : 0;
                    const recLabel = task.recurrenceDays <= 2 ? `${task.recurrenceDays}j` : task.recurrenceDays <= 7 ? '1s' : task.recurrenceDays <= 14 ? '2s' : task.recurrenceDays <= 21 ? '3s' : task.recurrenceDays <= 30 ? '1m' : `${task.recurrenceDays}j`;
                    const hasFire = streak >= 5 && !isOfficeMode;
                    return (
                        <span className={`mr-1.5 px-1.5 py-0.5 rounded-[4px] border text-[10px] font-bold flex-shrink-0 ${hasFire ? 'bg-orange-500/20 border-orange-500/30 text-orange-400 shadow-[0_0_8px_rgba(245,158,11,0.3)]' : isOfficeMode ? 'bg-amber-50 border-amber-200 text-amber-600' : 'bg-amber-500/10 border-amber-500/20 text-amber-400'}`}>
                            ↻{recLabel}{streak > 0 ? ` ${streak}x` : ''}{hasFire ? ' \uD83D\uDD25' : ''}
                        </span>
                    );
                })()}

                {isBlurred && (
                    <div className={`mr-2 transition-colors ${isOfficeMode ? 'text-gray-400 group-hover:text-gray-600' : 'text-slate-600 group-hover:text-slate-400'}`}>
                        <Icons.Lock size={12} />
                    </div>
                )}

                <span
                    className={`text-sm tracking-tight truncate select-none transition-all duration-300
                    ${task.done ? (isOfficeMode ? 'line-through text-gray-400' : 'line-through text-slate-600') : (isOfficeMode ? 'text-gray-700 font-medium' : 'text-slate-200 font-medium')}
                    ${isBlurred ? 'blur-[5px] group-hover:blur-0 opacity-40 group-hover:opacity-100' : ''}`}
                >
                    {displayText}
                </span>

                {/* Subtask progress indicator */}
                {(() => {
                    const progress = getSubtaskProgress(task);
                    if (!progress) return null;
                    const pct = Math.round((progress.done / progress.total) * 100);
                    return (
                        <div className="flex items-center gap-1.5 ml-2 flex-shrink-0">
                            <div className={`w-12 h-1 rounded-full overflow-hidden ${isOfficeMode ? 'bg-gray-200' : 'bg-white/10'}`}>
                                <div className={`h-full rounded-full transition-all ${pct === 100 ? (isOfficeMode ? 'bg-green-500' : 'bg-saas') : (isOfficeMode ? 'bg-[#2563EB]' : 'bg-pro')}`} style={{ width: `${pct}%` }} />
                            </div>
                            <span className={`text-[10px] font-mono ${isOfficeMode ? 'text-gray-400' : 'text-slate-500'}`}>{progress.done}/{progress.total}</span>
                        </div>
                    );
                })()}

                {/* Next date indicator for recurring tasks */}
                {task.nextDate && task.recurrenceDays && !task.done && (
                    <span className={`ml-1.5 text-[10px] flex-shrink-0 ${isOfficeMode ? 'text-gray-400' : 'text-slate-500'}`}>
                        {(() => {
                            const today = new Date(); today.setHours(0,0,0,0);
                            const next = new Date(task.nextDate + 'T00:00:00');
                            const diff = Math.round((next.getTime() - today.getTime()) / 86400000);
                            if (diff < 0) return isOfficeMode ? 'overdue' : 'en retard';
                            if (diff === 0) return isOfficeMode ? 'today' : "auj.";
                            if (diff === 1) return isOfficeMode ? 'tomorrow' : 'demain';
                            return isOfficeMode ? `in ${diff}d` : `dans ${diff}j`;
                        })()}
                    </span>
                )}
            </div>

            {/* Actions: always visible on mobile, hover on desktop */}
            <div className="flex items-center gap-0.5 opacity-100 md:opacity-0 md:group-hover:opacity-100 transition-all duration-200">
                <button
                    onClick={(e) => { e.stopPropagation(); onStar(task.id); }}
                    className={`p-2 rounded-md transition-colors touch-manipulation ${task.todayStar ? (isOfficeMode ? 'text-orange-500' : 'text-gold drop-shadow-[0_0_8px_rgba(245,158,11,0.6)]') : (isOfficeMode ? 'text-gray-300 hover:text-orange-500' : 'text-slate-600 hover:text-gold')} ${isOfficeMode ? 'hover:bg-gray-100' : 'hover:bg-white/10'}`}
                >
                    <Icons.Star size={16} fill={task.todayStar ? "currentColor" : "none"} />
                </button>
                <button
                    onClick={(e) => { e.stopPropagation(); onDelete(task.id); }}
                    className={`p-2 rounded-md transition-colors touch-manipulation ${isOfficeMode ? 'text-gray-300 hover:text-red-500 hover:bg-red-50' : 'text-slate-600 hover:text-alert hover:bg-alert/10'}`}
                >
                    <Icons.Trash2 size={16} />
                </button>
            </div>
        </div>
    );
};

export default TaskRow;
