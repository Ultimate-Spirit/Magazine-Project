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
    <div className="fixed inset-0 bg-background/80 backdrop-blur-xl z-[200] flex items-center justify-center p-6 animate-in fade-in duration-300">
      <div className="bg-card rounded-[3rem] shadow-none w-full max-w-md overflow-hidden border border-border animate-in zoom-in-95 duration-200">
        <div className="p-12 flex flex-col items-center text-center">
          <div className={`w-20 h-20 rounded-[2rem] flex items-center justify-center mb-8 ${iconStyles[variant]}`}>
            {variant === 'danger' ? <AlertTriangle size={32} /> : <Info size={32} />}
          </div>
          
          <h2 className="text-3xl font-black text-foreground mb-4 tracking-tight">{title}</h2>
          <p className="text-muted-foreground font-medium leading-relaxed mb-10">
            {message}
          </p>

          <div className="w-full space-y-4">
            <button
              onClick={onConfirm}
              disabled={isLoading}
              className={`w-full py-6 ${variantStyles[variant]} text-primary-foreground font-black rounded-[1.5rem] disabled:opacity-50 transition-all flex items-center justify-center gap-3 text-lg uppercase tracking-widest`}
            >
              {isLoading ? <Loader2 className="w-6 h-6 animate-spin" /> : confirmLabel}
            </button>
            <button
              onClick={onCancel}
              disabled={isLoading}
              className="w-full py-6 bg-secondary border border-border text-muted-foreground font-bold rounded-[1.5rem] hover:bg-muted transition-all flex items-center justify-center text-lg uppercase tracking-widest"
            >
              Cancel
            </button>
          </div>
        </div>

        <button 
          onClick={onCancel}
          className="absolute top-8 right-8 p-4 text-muted-foreground/30 hover:text-foreground transition-all"
        >
          <X size={24} />
        </button>
      </div>
    </div>
  );
};
