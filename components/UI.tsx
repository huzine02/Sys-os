import React from 'react';

// Card avec effet "Inner Light" et bordure subtile
export const Card: React.FC<{ children: React.ReactNode; className?: string; borderLeftColor?: string }> = ({ children, className = "", borderLeftColor }) => (
    <div 
        className={`relative bg-bg-surface/50 backdrop-blur-xl border border-white/[0.08] rounded-2xl shadow-xl overflow-hidden ${className}`}
        style={borderLeftColor ? { borderLeft: `3px solid ${borderLeftColor}` } : {}}
    >
        {/* Inner light top edge */}
        <div className="absolute top-0 left-0 right-0 h-px bg-gradient-to-r from-transparent via-white/10 to-transparent opacity-50 pointer-events-none"></div>
        {children}
    </div>
);

export const Button: React.FC<React.ButtonHTMLAttributes<HTMLButtonElement> & { variant?: 'ghost' | 'primary' | 'outline' | 'alert' }> = ({ children, variant = 'outline', className = "", ...props }) => {
    const base = "h-[36px] px-4 rounded-lg text-xs font-semibold font-sans tracking-wide transition-all duration-200 flex items-center justify-center gap-2 active:scale-[0.98]";
    
    const variants = {
        ghost: "text-slate-400 hover:text-white hover:bg-white/[0.04]",
        
        outline: "bg-white/[0.02] border border-white/[0.08] text-slate-300 hover:bg-white/[0.06] hover:text-white hover:border-white/[0.15] shadow-sm",
        
        // Primary avec effet de glow subtil
        primary: "bg-pro text-white border border-blue-400/20 shadow-[0_0_15px_-3px_rgba(59,130,246,0.4)] hover:bg-blue-600 hover:shadow-[0_0_20px_-3px_rgba(59,130,246,0.5)]",
        
        alert: "bg-red-500/10 text-red-400 border border-red-500/20 hover:bg-red-500/20 hover:border-red-500/30"
    };
    
    return (
        <button className={`${base} ${variants[variant]} ${className}`} {...props}>
            {children}
        </button>
    );
};

export const Input = React.forwardRef<HTMLInputElement, React.InputHTMLAttributes<HTMLInputElement>>(({ className = "", ...props }, ref) => (
    <div className="relative w-full">
        <input 
            ref={ref}
            className={`w-full bg-bg-surface border border-white/[0.08] text-slate-200 rounded-lg px-3 py-2.5 text-sm 
            focus:bg-bg-subtle focus:border-white/20 focus:ring-1 focus:ring-white/10 focus:outline-none 
            placeholder:text-slate-600 transition-all shadow-inner ${className}`}
            {...props}
        />
        {/* Focus indicator glow effect could be added here if needed */}
    </div>
));

export const SmartTable: React.FC<{ children: React.ReactNode }> = ({ children }) => (
    <div className="w-full overflow-x-auto rounded-xl border border-white/[0.06]">
        <table className="w-full text-sm border-separate border-spacing-0">
            {children}
        </table>
    </div>
);