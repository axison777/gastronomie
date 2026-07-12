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
          <div className="w-16 h-16 rounded-full bg-red-50 flex items-center justify-center mb-6">
            <AlertTriangle className="text-red-400" size={28} strokeWidth={2} />
          </div>
        );
      case 'alert':
        return (
          <div className="w-16 h-16 rounded-full bg-emerald-50 flex items-center justify-center mb-6">
            <CheckCircle2 className="text-emerald-500" size={28} strokeWidth={2} />
          </div>
        );
      default:
        return (
          <div className="w-16 h-16 rounded-full bg-orange-50 flex items-center justify-center mb-6">
            <HelpCircle className="text-orange-400" size={28} strokeWidth={2} />
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
      <div className="fixed inset-0 bg-black/30 backdrop-blur-sm" onClick={onCancel} />

      <div className="relative bg-white rounded-3xl shadow-2xl w-full max-w-sm px-8 py-8 flex flex-col items-center text-center animate-in zoom-in-95 duration-200">
        {getIcon()}

        <h3 className="text-[22px] font-extrabold text-gray-900 tracking-tight leading-snug mb-3">
          {title}
        </h3>

        <p className="text-[13px] text-gray-500 font-semibold leading-relaxed mb-8 px-1">
          {message}
        </p>

        <div className="flex items-center justify-center gap-4 w-full">
          {type !== 'alert' && (
            <button
              onClick={onCancel}
              className="flex-1 py-3 text-gray-500 font-semibold text-[15px] hover:text-gray-800 transition-colors rounded-2xl hover:bg-gray-50"
            >
              {cancelText}
            </button>
          )}
          <button
            onClick={onConfirm}
            className={`flex-1 py-3 rounded-2xl font-extrabold text-[15px] transition-all shadow-sm active:scale-[0.98] ${getConfirmButtonStyles()}`}
          >
            {confirmText}
          </button>
        </div>
      </div>
    </div>
  );
}
