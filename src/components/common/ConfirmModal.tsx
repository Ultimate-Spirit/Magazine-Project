import React from 'react';
import { AlertTriangle, Loader2 } from 'lucide-react';

interface ConfirmModalProps {
  isOpen: boolean;
  title: string;
  message: string;
  confirmLabel?: string;
  cancelLabel?: string;
  onConfirm: () => void;
  onCancel: () => void;
  isLoading?: boolean;
  variant?: 'danger' | 'warning' | 'info';
}

export const ConfirmModal: React.FC<ConfirmModalProps> = ({
  isOpen,
  title,
  message,
  confirmLabel = 'Confirm',
  cancelLabel = 'Cancel',
  onConfirm,
  onCancel,
  isLoading = false,
  variant = 'danger'
}) => {
  if (!isOpen) return null;

  const variantStyles = {
    danger: 'bg-red-600 hover:bg-red-700 shadow-red-100',
    warning: 'bg-orange-600 hover:bg-orange-700 shadow-orange-100',
    info: 'bg-blue-600 hover:bg-blue-700 shadow-blue-100'
  };

  const iconStyles = {
    danger: 'bg-red-50 text-red-600',
    warning: 'bg-orange-50 text-orange-600',
    info: 'bg-blue-50 text-blue-600'
  };

  return (
    <div className="fixed inset-0 bg-gray-900/60 backdrop-blur-xl z-[200] flex items-center justify-center p-6 animate-in fade-in duration-300">
      <div className="bg-white rounded-[3rem] shadow-2xl w-full max-w-md overflow-hidden border border-gray-100 animate-in zoom-in-95 duration-200">
        <div className="p-12 pb-8 flex flex-col items-center text-center">
          <div className={`w-20 h-20 ${iconStyles[variant]} rounded-[2rem] flex items-center justify-center mb-8`}>
            <AlertTriangle className="w-10 h-10" />
          </div>
          
          <h2 className="text-3xl font-black text-gray-900 tracking-tight mb-4">
            {title}
          </h2>
          <p className="text-gray-500 font-medium leading-relaxed">
            {message}
          </p>
        </div>

        <div className="p-12 pt-4 flex flex-col gap-3">
          <button
            onClick={onConfirm}
            disabled={isLoading}
            className={`w-full py-6 ${variantStyles[variant]} text-white font-black rounded-[1.5rem] disabled:opacity-50 transition-all shadow-2xl flex items-center justify-center gap-3 text-lg uppercase tracking-widest`}
          >
            {isLoading ? <Loader2 className="w-6 h-6 animate-spin" /> : confirmLabel}
          </button>
          
          <button
            onClick={onCancel}
            disabled={isLoading}
            className="w-full py-6 bg-white border border-gray-100 text-gray-400 font-bold rounded-[1.5rem] hover:bg-gray-50 transition-all flex items-center justify-center text-lg uppercase tracking-widest"
          >
            {cancelLabel}
          </button>
        </div>
      </div>
    </div>
  );
};
