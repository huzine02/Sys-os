
import React from 'react';
import { Task } from '../types';
import { Icons } from './Icons';
import { getThemeColor, ASSETS_CONFIG, sanitizeForOffice } from '../utils';

interface TaskRowProps {
    task: Task;
    onToggle: (id: number) => void;
    onDelete: (id: number) => void;
    onStar: (id: number) => void;
    onFocus: (id: number) => void;
    showTypeDot?: boolean;
    isBlurred?: boolean;
    isOfficeMode?: boolean;
}

const TaskRow: React.FC<TaskRowProps> = ({ task, onToggle, onDelete, onStar, onFocus, showTypeDot, isBlurred, isOfficeMode = false }) => {

    const getSubtypeBadge = () => {
        if (task.type in ASSETS_CONFIG) {
            const rawLabel = ASSETS_CONFIG[task.type as keyof typeof ASSETS_CONFIG];
            const label = sanitizeForOffice(rawLabel, isOfficeMode);
            return (
                <span className={`mr-2 px-1.5 py-0.5 rounded-[4px] border text-xs font-bold uppercase tracking-wider ${isOfficeMode ? 'bg-slate-700/50 border-slate-600 text-slate-400' : 'bg-patri/10 border-patri/20 text-patri'}`}>
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
            ${isToday && !isOfficeMode ? 'border-gold/20 bg-gold/[0.03]' : 'border-transparent hover:bg-white/[0.03] hover:border-white/[0.05]'}
            ${task.done ? 'opacity-50' : ''}`}
             onClick={() => onFocus(task.id)}>

            <div className="flex items-center flex-1 min-w-0">
                <div
                    onClick={(e) => { e.stopPropagation(); onToggle(task.id); }}
                    className={`w-5 h-5 md:w-[22px] md:h-[22px] rounded-[6px] border flex items-center justify-center mr-2.5 flex-shrink-0 cursor-pointer transition-all duration-200
                    ${task.done
                        ? (isOfficeMode ? 'bg-slate-600 border-slate-500 text-white' : 'bg-saas border-saas text-white shadow-[0_0_10px_rgba(16,185,129,0.4)]')
                        : 'border-white/20 hover:border-white/40 bg-white/[0.02]'}`}
                >
                    {task.done && <Icons.Check size={12} strokeWidth={4} />}
                </div>

                {/* Star inline when todayStar */}
                {isToday && (
                    <Icons.Star size={14} fill="currentColor" className="text-gold mr-1.5 flex-shrink-0 drop-shadow-[0_0_6px_rgba(245,158,11,0.5)]" />
                )}

                {showTypeDot && !getSubtypeBadge() && (
                    <div className={`w-1.5 h-1.5 rounded-full mr-2.5 shadow-[0_0_6px_currentColor] flex-shrink-0 ${getThemeColor(task.type, isOfficeMode)} bg-current`}></div>
                )}

                {getSubtypeBadge()}

                {isBlurred && (
                    <div className="mr-2 text-slate-600 group-hover:text-slate-400 transition-colors">
                        <Icons.Lock size={12} />
                    </div>
                )}

                <span
                    className={`text-sm tracking-tight truncate select-none transition-all duration-300
                    ${task.done ? 'line-through text-slate-600' : (isOfficeMode ? 'text-gray-300' : 'text-slate-200 font-medium')}
                    ${isBlurred ? 'blur-[5px] group-hover:blur-0 opacity-40 group-hover:opacity-100' : ''}`}
                >
                    {displayText}
                </span>
            </div>

            {/* Actions: always visible on mobile, hover on desktop */}
            <div className="flex items-center gap-0.5 opacity-100 md:opacity-0 md:group-hover:opacity-100 transition-all duration-200">
                <button
                    onClick={(e) => { e.stopPropagation(); onStar(task.id); }}
                    className={`p-2 rounded-md hover:bg-white/10 transition-colors touch-manipulation ${task.todayStar ? 'text-gold drop-shadow-[0_0_8px_rgba(245,158,11,0.6)]' : 'text-slate-600 hover:text-gold'}`}
                >
                    <Icons.Star size={16} fill={task.todayStar ? "currentColor" : "none"} />
                </button>
                <button
                    onClick={(e) => { e.stopPropagation(); onDelete(task.id); }}
                    className="p-2 rounded-md text-slate-600 hover:text-alert hover:bg-alert/10 transition-colors touch-manipulation"
                >
                    <Icons.Trash2 size={16} />
                </button>
            </div>
        </div>
    );
};

export default TaskRow;
