import React from 'react';
import { X, AlertTriangle, Info, Loader2 } from 'lucide-react';

interface Props {
  isOpen: boolean;
  title: string;
  message: string;
  confirmLabel: string;
  onConfirm: () => void;
  onCancel: () => void;
  isLoading?: boolean;
  variant?: 'danger' | 'info';
}

export const ConfirmModal: React.FC<Props> = ({
  isOpen,
  title,
  message,
  confirmLabel,
  onConfirm,
  onCancel,
  isLoading = false,
  variant = 'info'
}) => {
  if (!isOpen) return null;

  const variantStyles = {
    danger: 'bg-destructive hover:bg-destructive/90',
    info: 'bg-primary hover:bg-primary/90'
  };

  const iconStyles = {
    danger: 'bg-destructive/10 text-destructive',
    info: 'bg-primary/10 text-primary'
  };

  return (
    <div className="fixed inset-0 bg-background/60 backdrop-blur-2xl z-[200] flex items-center justify-center p-6 animate-in fade-in duration-500">
      <div className="micro-surface rounded-[3rem] shadow-none w-full max-w-md overflow-hidden border border-border/10 animate-in zoom-in-95 duration-300">
        <div className="p-12 flex flex-col items-center text-center">
          <div className={`w-20 h-20 rounded-[2.5rem] flex items-center justify-center mb-8 border border-border/10 ${iconStyles[variant]}`}>
            {variant === 'danger' ? <AlertTriangle size={32} /> : <Info size={32} />}
          </div>
          
          <h2 className="text-3xl font-black text-foreground mb-4 tracking-tighter">{title}</h2>
          <p className="text-muted-foreground/60 font-medium leading-relaxed mb-10 text-sm">
            {message}
          </p>

          <div className="w-full space-y-3">
            <button
              onClick={onConfirm}
              disabled={isLoading}
              className={`w-full py-5 ${variantStyles[variant]} text-primary-foreground font-black rounded-2xl disabled:opacity-50 transition-all flex items-center justify-center gap-3 text-[11px] uppercase tracking-[0.2em] shadow-lg`}
            >
              {isLoading ? <Loader2 className="w-4 h-4 animate-spin" /> : confirmLabel}
            </button>
            <button
              onClick={onCancel}
              disabled={isLoading}
              className="w-full py-5 micro-surface border border-border/10 text-muted-foreground/60 font-black rounded-2xl hover:bg-secondary transition-all flex items-center justify-center text-[10px] uppercase tracking-[0.2em]"
            >
              Cancel
            </button>
          </div>
        </div>

        <button 
          onClick={onCancel}
          className="absolute top-8 right-8 p-3 text-muted-foreground/20 hover:text-foreground transition-all"
        >
          <X size={20} />
        </button>
      </div>
    </div>
  );
};
