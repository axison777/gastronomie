import { AlertTriangle, CheckCircle2, HelpCircle } from 'lucide-react';

interface ConfirmModalProps {
  isOpen: boolean;
  title: string;
  message: string | React.ReactNode;
  type?: 'confirm' | 'alert' | 'danger';
  confirmText?: string;
  cancelText?: string;
  onConfirm: () => void;
  onCancel?: () => void;
}

export default function ConfirmModal({
  isOpen,
  title,
  message,
  type = 'confirm',
  confirmText = 'Confirmer',
  cancelText = 'Annuler',
  onConfirm,
  onCancel,
}: ConfirmModalProps) {
  if (!isOpen) return null;

  const getIcon = () => {
    switch (type) {
      case 'danger':
        return (
          <div className="w-16 h-16 rounded-full bg-red-50 dark:bg-red-500/10 flex items-center justify-center mb-6 ring-4 ring-red-500/10">
            <AlertTriangle className="text-red-500" size={28} strokeWidth={2.5} />
          </div>
        );
      case 'alert':
        return (
          <div className="w-16 h-16 rounded-full bg-emerald-50 dark:bg-emerald-500/10 flex items-center justify-center mb-6 ring-4 ring-emerald-500/10">
            <CheckCircle2 className="text-emerald-500" size={28} strokeWidth={2.5} />
          </div>
        );
      default:
        return (
          <div className="w-16 h-16 rounded-full bg-orange-50 dark:bg-orange-500/10 flex items-center justify-center mb-6 ring-4 ring-orange-500/10">
            <HelpCircle className="text-orange-500" size={28} strokeWidth={2.5} />
          </div>
        );
    }
  };

  const getConfirmButtonStyles = () => {
    switch (type) {
      case 'danger':   return 'bg-[#BD4F19] hover:bg-[#A64B2A] text-white';
      case 'alert':    return 'bg-emerald-500 hover:bg-emerald-600 text-white';
      default:         return 'bg-[#BD4F19] hover:bg-[#A64B2A] text-white';
    }
  };

  return (
    <div className="fixed inset-0 z-[200] flex items-center justify-center p-6 animate-in fade-in duration-200">
      <div className="fixed inset-0 bg-black/40 backdrop-blur-md" onClick={onCancel} />

      <div className="relative bg-white/80 dark:bg-[#0B0F15]/80 backdrop-blur-xl border border-white/20 dark:border-white/10 rounded-[32px] shadow-[0_8px_30px_rgb(0,0,0,0.12)] w-full max-w-sm px-8 py-8 flex flex-col items-center text-center animate-in zoom-in-95 duration-200">
        {getIcon()}

        <h3 className="text-[22px] font-extrabold text-slate-900 dark:text-white tracking-tight leading-snug mb-3">
          {title}
        </h3>

        <p className="text-[14px] text-slate-600 dark:text-slate-400 font-medium leading-relaxed mb-8 px-1">
          {message}
        </p>

        <div className="flex items-center justify-center gap-4 w-full">
          {type !== 'alert' && (
            <button
              onClick={onCancel}
              className="flex-1 py-3.5 text-slate-600 dark:text-slate-300 font-bold text-[15px] hover:text-slate-900 dark:hover:text-white transition-colors rounded-2xl bg-slate-100/50 hover:bg-slate-200/50 dark:bg-white/5 dark:hover:bg-white/10"
            >
              {cancelText}
            </button>
          )}
          <button
            onClick={onConfirm}
            className={`flex-1 py-3.5 rounded-2xl font-extrabold text-[15px] transition-all shadow-md active:scale-[0.98] ${getConfirmButtonStyles()}`}
          >
            {confirmText}
          </button>
        </div>
      </div>
    </div>
  );
}
