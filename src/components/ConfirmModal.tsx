import { AlertCircle, CheckCircle2, HelpCircle } from 'lucide-react';

interface ConfirmModalProps {
  isOpen: boolean;
  title: string;
  message: string;
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
      case 'danger': return <AlertCircle className="text-red-500" size={32} />;
      case 'alert': return <CheckCircle2 className="text-emerald-500" size={32} />;
      default: return <HelpCircle className="text-indigo-500" size={32} />;
    }
  };

  const getConfirmButtonStyles = () => {
    switch (type) {
      case 'danger': return 'bg-red-500 hover:bg-red-600 shadow-red-100';
      case 'alert': return 'bg-emerald-500 hover:bg-emerald-600 shadow-emerald-100';
      default: return 'bg-indigo-600 hover:bg-indigo-700 shadow-indigo-100';
    }
  };

  return (
    <div className="fixed inset-0 z-[100] flex items-center justify-center p-4 animate-in fade-in duration-200">
      <div className="fixed inset-0 bg-slate-900/40 backdrop-blur-md" onClick={onCancel}></div>
      
      <div className="relative bg-white rounded-[2rem] shadow-2xl w-full max-w-sm overflow-hidden animate-in zoom-in duration-300">
        <div className="p-8 text-center flex flex-col items-center">
          <div className={`mb-6 p-4 rounded-3xl ${type === 'danger' ? 'bg-red-50' : type === 'alert' ? 'bg-emerald-50' : 'bg-indigo-50'}`}>
            {getIcon()}
          </div>
          
          <h3 className="text-2xl font-black text-slate-800 mb-3 tracking-tight leading-tight">
            {title}
          </h3>
          
          <p className="text-slate-500 font-bold leading-relaxed px-2 mb-8">
            {message}
          </p>
          
          <div className="flex flex-col w-full gap-3">
            <button
              onClick={onConfirm}
              className={`w-full py-4 rounded-2xl text-white font-black text-lg transition-all transform hover:-translate-y-1 active:scale-95 shadow-xl ${getConfirmButtonStyles()}`}
            >
              {confirmText}
            </button>
            
            {type !== 'alert' && (
              <button
                onClick={onCancel}
                className="w-full py-4 rounded-2xl text-slate-400 font-bold hover:bg-slate-50 hover:text-slate-600 transition-all"
              >
                {cancelText}
              </button>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}
