import { ChefHat, Coffee, Wrench, Clock, MessageSquare, Heart, Settings } from 'lucide-react';

interface MaintenanceViewProps {
  onAdminClick?: () => void;
  isAuthenticated?: boolean;
}

export default function MaintenanceView({ onAdminClick, isAuthenticated }: MaintenanceViewProps) {
  const handleReload = () => {
    window.location.reload();
  };

  return (
    <div className="min-h-screen w-full bg-gradient-to-br from-amber-50/50 via-orange-50/30 to-orange-100/20 flex items-center justify-center p-4 relative overflow-hidden font-sans">
      {/* Decorative blurred background blobs */}
      <div className="absolute -top-24 -left-24 w-96 h-96 bg-orange-200/30 rounded-full blur-3xl animate-pulse duration-3000" />
      <div className="absolute -bottom-32 -right-32 w-96 h-96 bg-orange-200/20 rounded-full blur-3xl animate-pulse duration-4000 [animation-delay:1.5s]" />
      <div className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-[500px] h-[500px] bg-amber-100/10 rounded-full blur-3xl pointer-events-none" />

      {/* Settings / Admin Button in top-right */}
      {onAdminClick && (
        <button
          onClick={onAdminClick}
          className={`absolute top-6 right-6 p-3 rounded-2xl border transition-all hover:-translate-y-0.5 active:scale-95 z-20 flex items-center gap-2 font-bold text-xs ${
            isAuthenticated 
              ? 'bg-orange-50 border-orange-200 text-orange-700 shadow-md shadow-orange-100/50' 
              : 'bg-white/80 border-gray-200 text-gray-500 hover:text-orange-700 hover:border-orange-200 shadow-sm'
          }`}
          title="Administration"
        >
          <Settings size={18} className={isAuthenticated ? 'animate-spin [animation-duration:10s]' : ''} />
          {isAuthenticated ? 'Admin Connecté' : 'Administration'}
        </button>
      )}

      {/* Main glassmorphic card */}
      <div className="bg-white/70 backdrop-blur-2xl border border-white/50 shadow-[0_32px_80px_rgba(249,115,22,0.08)] rounded-[2.5rem] p-8 md:p-12 max-w-lg w-full text-center relative z-10 flex flex-col items-center">
        
        {/* Floating Culinary & Tech Icon Wrapper */}
        <div className="relative mb-8">
          <div className="bg-gradient-to-tr from-amber-500 to-orange-500 text-white p-6 rounded-[2rem] shadow-xl shadow-orange-500/20 relative z-10 animate-bounce [animation-duration:3s]">
            <ChefHat size={48} strokeWidth={1.5} />
          </div>
          {/* Secondary mini icon indicating maintenance */}
          <div className="absolute -bottom-2 -right-2 bg-slate-800 text-amber-400 p-2 rounded-xl shadow-lg border border-slate-700 z-20 animate-pulse">
            <Wrench size={18} />
          </div>
        </div>

        {/* Header Section */}
        <span className="px-4 py-1.5 bg-orange-100/80 text-orange-700 rounded-full text-xs font-bold uppercase tracking-wider mb-4 border border-orange-200/50 inline-block">
          Mise à jour en cours
        </span>
        
        <h1 className="text-3xl md:text-4xl font-black text-slate-800 tracking-tight leading-tight mb-4">
          Notre cuisine fait <br />
          <span className="text-transparent bg-clip-text bg-gradient-to-r from-orange-600 to-amber-500">
            peau neuve !
          </span>
        </h1>

        {/* Detailed Explanation and Apology */}
        <p className="text-slate-600 font-medium text-sm md:text-base leading-relaxed mb-6">
          Chers gourmets, afin de vous concocter une expérience de commande encore plus savoureuse et fluide, la plateforme <span className="font-extrabold text-orange-700">Gastronomie Service</span> est temporairement en cuisine. 
        </p>
        
        <p className="text-slate-500 text-xs md:text-sm leading-relaxed mb-8 italic">
          Nous mettons à jour nos recettes numériques pour améliorer la gestion de vos repas de midi. Veuillez nous excuser pour ce court contretemps. Notre équipe s'active derrière les fourneaux pour rouvrir le service très vite !
        </p>

        {/* Progress or Status box */}
        <div className="w-full bg-slate-50 rounded-2xl p-4 border border-slate-100 flex flex-col gap-3 mb-8">
          <div className="flex justify-between items-center text-xs font-bold text-slate-500">
            <span className="flex items-center gap-1.5 text-orange-600">
              <Clock size={14} className="animate-spin [animation-duration:8s]" /> En préparation...
            </span>
            <span>90%</span>
          </div>
          <div className="w-full bg-slate-200/80 h-2 rounded-full overflow-hidden">
            <div className="bg-gradient-to-r from-orange-500 to-amber-500 h-full rounded-full w-[90%] animate-pulse" />
          </div>
        </div>

        {/* Action / Contact Buttons */}
        <div className="w-full flex flex-col sm:flex-row gap-3 items-center">
          <a
            href="https://wa.me/?text=Bonjour,%20je%20vous%20contacte%20concernant%20les%20commandes%20de%20repas..."
            target="_blank"
            rel="noopener noreferrer"
            className="w-full flex items-center justify-center gap-2 bg-emerald-500 hover:bg-emerald-600 text-white font-bold py-3.5 px-6 rounded-2xl shadow-lg shadow-emerald-500/15 transition-all hover:-translate-y-0.5 text-sm"
          >
            <MessageSquare size={18} />
            Nous contacter sur WhatsApp
          </a>
          <button
            onClick={handleReload}
            className="w-full bg-white hover:bg-slate-50 border border-slate-200 text-slate-700 font-bold py-3.5 px-6 rounded-2xl transition-all hover:-translate-y-0.5 text-sm"
          >
            Actualiser la page
          </button>
        </div>

        {/* Footer info */}
        <div className="mt-8 pt-6 border-t border-slate-100 w-full flex items-center justify-center gap-2 text-xs text-slate-400 font-medium">
          <span>Gastronomie Service © {new Date().getFullYear()}</span>
          <span>•</span>
          <span className="flex items-center gap-1">
            Fait avec <Coffee size={12} className="text-orange-500" /> & <Heart size={12} className="text-red-500 fill-red-500 animate-pulse" />
          </span>
        </div>

      </div>
    </div>
  );
}
