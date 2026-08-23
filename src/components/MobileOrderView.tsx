import { useState, useEffect, useRef } from 'react';
import { Check, Search, SlidersHorizontal, X, ChevronLeft, CheckCircle2, ArrowUpRight, Plus } from 'lucide-react';
import type { Employee, Meal, Order, Site, Department } from '../lib/supabase';
import { getEmployeeDeptName, getEmployeeFullName } from '../lib/employeeUtils';
import ConfirmModal from './ConfirmModal';

interface MobileOrderViewProps {
  employees: Employee[];
  meals: Meal[];
  orders: Order[];
  isLocked: boolean;
  activeView: 'orders' | 'summary';
  onViewChange: (view: 'orders' | 'summary') => void;
  onCellClick: (employeeId: string, mealId: string, option: string | null) => void;
  sites: Site[];
  departments: Department[];
  selectedSite: string;
  selectedDept: string;
  onSiteChange: (site: string) => void;
  onDeptChange: (dept: string) => void;
  config?: any;
  heroBanners?: any[];
  heroSlideIndex?: number;
}

const getMealImage = (name: string) => {
  const lower = name.toLowerCase();
  if (lower.includes('yassa') || lower.includes('poulet')) return 'https://images.unsplash.com/photo-1604908176997-125f25cc6f3d?w=400&auto=format&fit=crop&q=80';
  if (lower.includes('mafe') || lower.includes('mafé') || lower.includes('boeuf') || lower.includes('bœuf')) return 'https://images.unsplash.com/photo-1544025162-d76694265947?w=400&auto=format&fit=crop&q=80';
  if (lower.includes('salade') || lower.includes('veget') || lower.includes('légume')) return 'https://images.unsplash.com/photo-1512621776951-a57141f2eefd?w=400&auto=format&fit=crop&q=80';
  if (lower.includes('poisson') || lower.includes('fish') || lower.includes('grillé')) return 'https://images.unsplash.com/photo-1473093295043-cdd812d0e601?w=400&auto=format&fit=crop&q=80';
  if (lower.includes('thiebou') || lower.includes('thiébou') || lower.includes('riz')) return 'https://images.unsplash.com/photo-1574672280242-9b3c267b3186?w=400&auto=format&fit=crop&q=80';
  return 'https://images.unsplash.com/photo-1504674900247-0877df9cc836?w=400&auto=format&fit=crop&q=80';
};

const getMealSubtitle = (name: string) => {
  const lower = name.toLowerCase();
  if (lower.includes('yassa') || lower.includes('poulet')) return 'Citron confit, oignons caramélisés';
  if (lower.includes('mafe') || lower.includes('mafé')) return 'Sauce arachide onctueuse, légumes';
  if (lower.includes('thiebou') || lower.includes('thiébou')) return 'Riz parfumé, poisson noble, légumes';
  if (lower.includes('salade')) return 'Légumes frais, vinaigrette maison';
  return 'Plat du jour';
};

export default function MobileOrderView({
  employees,
  meals,
  orders,
  isLocked,
  onCellClick,
  sites,
  departments,
  selectedSite,
  selectedDept,
  onSiteChange,
  onDeptChange,
  config,
  heroBanners = [],
  heroSlideIndex = 0,
}: MobileOrderViewProps) {
  const [searchTerm, setSearchTerm] = useState('');
  const [viewMode, setViewMode] = useState<'list' | 'bento'>('list');
  const [selectedEmployee, setSelectedEmployee] = useState<Employee | null>(null);
  const [pendingOrder, setPendingOrder] = useState<{ mealId: string; option: string | null } | null>(null);
  const [selectedMealForDetail, setSelectedMealForDetail] = useState<Meal | null>(null);
  const [isFilterSheetOpen, setIsFilterSheetOpen] = useState(false);
  const [errorModal, setErrorModal] = useState<{isOpen: boolean; message: string}>({ isOpen: false, message: '' });
  
  // Ref for scrolling back to the employee after ordering
  const [recentlyOrderedId, setRecentlyOrderedId] = useState<string | null>(null);
  const employeeRefs = useRef<Record<string, HTMLButtonElement | null>>({});

  useEffect(() => {
    if (viewMode === 'list' && recentlyOrderedId) {
      const el = employeeRefs.current[recentlyOrderedId];
      if (el) {
        setTimeout(() => {
          el.scrollIntoView({ behavior: 'smooth', block: 'center' });
          setRecentlyOrderedId(null);
        }, 100);
      }
    }
  }, [viewMode, recentlyOrderedId]);

  const filteredEmployees = employees.filter(e =>
    e.is_active &&
    getEmployeeFullName(e).toLowerCase().includes(searchTerm.toLowerCase())
  );

  const getCurrentEmployeeOrder = () =>
    selectedEmployee ? orders.find(o => o.employee_id === selectedEmployee.id) : undefined;

  const handleEmployeeClick = (emp: Employee) => {
    if (isLocked || !emp.is_active) return;
    setPendingOrder(null);
    setSelectedEmployee(emp);
    setViewMode('bento');
  };

  const handleMealSelect = (meal: Meal) => {
    if (isLocked || !selectedEmployee) return;
    const currentOrder = getCurrentEmployeeOrder();
    
    if (currentOrder) {
      if (currentOrder.meal_id === meal.id) {
        // Just deselect if clicking on the currently ordered meal
        onCellClick(selectedEmployee.id, meal.id, null);
        return;
      } else {
        setErrorModal({
          isOpen: true,
          message: "Cet employé a déjà commandé un plat aujourd'hui. Veuillez annuler sa commande avant d'en choisir un nouveau."
        });
        return;
      }
    }
    
    // Select meal and open detail view
    setPendingOrder({ mealId: meal.id, option: null });
    setSelectedMealForDetail(meal);
  };

  const handleOptionSelect = (option: string) => {
    if (selectedEmployee && selectedMealForDetail) {   
      setPendingOrder({ ...pendingOrder!, option });
    }
  };

  const canValidate = () => {
    if (!pendingOrder || !selectedEmployee) return false;
    const meal = meals.find(m => m.id === pendingOrder.mealId);
    if (!meal) return false;
    if (meal.has_options && !pendingOrder.option) return false;
    return true;
  };

  const handleValidate = () => {
    if (!selectedEmployee || !pendingOrder) return;
    onCellClick(selectedEmployee.id, pendingOrder.mealId, pendingOrder.option);
    setSelectedMealForDetail(null);
    goBackToList(selectedEmployee.id);
  };

  const goBackToList = (empIdToFocus?: string) => {
    setViewMode('list');
    if (empIdToFocus) {
      setRecentlyOrderedId(empIdToFocus);
    }
    setTimeout(() => {
      setSelectedEmployee(null);
      setPendingOrder(null);
      setSelectedMealForDetail(null);
    }, 300);
  };

  if (viewMode === 'bento' && selectedEmployee) {
    const currentOrder = getCurrentEmployeeOrder();
    
    return (
      <div className="fixed inset-0 z-50 bg-[#FDFBF7] dark:bg-[#0B0F15] flex flex-col animate-in slide-in-from-right-full duration-300 overflow-hidden transition-colors">
        {/* Glows */}
        <div className="absolute top-0 left-0 right-0 h-40 bg-orange-500/10 blur-[100px] pointer-events-none" />

        {/* Bento Page Header */}
        <div className="px-5 py-4 glass-panel border-x-0 border-t-0 rounded-none sticky top-0 z-20 flex items-center shadow-sm">
          <button 
            onClick={() => goBackToList()} 
            className="w-10 h-10 rounded-full flex items-center justify-center glass-button text-slate-700 dark:text-white transition-colors mr-3"
          >
            <ChevronLeft size={24} />
          </button>
          <div className="flex-1">
            <h2 className="text-xl font-extrabold text-slate-900 dark:text-white leading-tight">
              {getEmployeeFullName(selectedEmployee)}
            </h2>
            <p className="text-xs text-slate-500 dark:text-slate-400 font-medium mt-0.5">
              {getEmployeeDeptName(selectedEmployee) || 'Commande repas'}
            </p>
          </div>
        </div>

        {/* Bento Grid Content or Blocked Message */}
        <div className="flex-1 overflow-y-auto p-4 pb-32">
          {selectedEmployee.is_cotisation_paid === false ? (
            <div className="h-full flex flex-col items-center justify-center p-6 text-center animate-in fade-in duration-300">
              <div className="w-24 h-24 rounded-full bg-red-100 dark:bg-red-500/10 text-red-500 dark:text-red-400 flex items-center justify-center mx-auto mb-6 border border-red-200 dark:border-red-500/20 shadow-lg shadow-red-500/10">
                <svg xmlns="http://www.w3.org/2000/svg" className="h-12 w-12" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-3L13.732 4c-.77-1.333-2.694-1.333-3.464 0L3.34 16c-.77 1.333.192 3 1.732 3z" />
                </svg>
              </div>
              
              <h3 className="text-2xl font-extrabold text-slate-900 dark:text-white mb-4">
                Cotisation Impayée
              </h3>
              
              <p className="text-base font-semibold text-slate-500 dark:text-slate-400 leading-relaxed">
                Désolé <span className="text-slate-900 dark:text-white font-bold">{selectedEmployee.first_name}</span>, vous n'êtes pas à jour sur vos cotisations. <br/><br/>
                <span className="text-red-500 dark:text-red-400 font-bold bg-red-50 dark:bg-red-500/10 px-3 py-1.5 rounded-lg border border-red-100 dark:border-red-500/20 inline-block mt-2">Veuillez vous approcher des responsables de la restauration.</span>
              </p>
            </div>
          ) : (
            <div className="grid grid-cols-2 gap-4 relative z-10">
            {meals.map(meal => {
              const isOrdered = currentOrder?.meal_id === meal.id;
              const isPending = pendingOrder?.mealId === meal.id;
              
              return (
                <div 
                  key={meal.id}
                  onClick={() => handleMealSelect(meal)}
                  className={`relative w-full flex flex-col rounded-3xl overflow-hidden shadow-md border border-slate-200 dark:border-white/10 bg-white dark:bg-[#0B0F15] transition-all duration-300 active:scale-[0.98] ${
                    isOrdered ? 'ring-2 ring-orange-500 shadow-[0_0_30px_rgba(249,115,22,0.15)]' : ''
                  }`}
                >
                  {/* Top Image Section */}
                  <div className="relative w-full h-[140px] shrink-0">
                    <img 
                      src={meal.image_url || getMealImage(meal.name)} 
                      alt={meal.name}
                      className="w-full h-full object-cover"
                    />
                    
                    {/* Top Right Action Button */}
                    {!isOrdered && !isPending && (
                      <button 
                        className="absolute top-3 right-3 w-8 h-8 rounded-full bg-white/50 dark:bg-black/50 backdrop-blur-md text-slate-900 dark:text-white flex items-center justify-center transition-colors shadow-sm pointer-events-none"
                      >
                        <Plus size={18} strokeWidth={2.5} />
                      </button>
                    )}
                    {isOrdered && (
                      <div className="absolute top-3 right-3 bg-orange-500 text-white p-1.5 rounded-full shadow-lg shadow-orange-500/40">
                        <CheckCircle2 size={16} strokeWidth={2.5} />
                      </div>
                    )}
                  </div>

                  {/* Bottom Info Section */}
                  <div className="p-3.5 flex flex-col gap-1.5 flex-1 justify-center z-10 bg-white dark:bg-transparent">
                    <h3 className="font-extrabold text-slate-900 dark:text-white text-[15px] truncate">{meal.name}</h3>
                    <p className="text-slate-500 dark:text-slate-400 text-[11px] truncate">{getMealSubtitle(meal.name)}</p>
                    
                    {isOrdered && (
                      <div className="mt-1 flex items-center gap-1.5 text-orange-500 font-bold text-xs">
                        {meal.has_options && currentOrder.protein_option && (
                          <span className="uppercase tracking-wider">{currentOrder.protein_option} • </span>
                        )}
                        <span>Commandé</span>
                      </div>
                    )}
                  </div>
                </div>
              );
            })}
            </div>
          )}
        </div>

        {/* Validate Floating Action Button */}
        {pendingOrder && !selectedMealForDetail && (
          <div className="fixed bottom-0 left-0 right-0 p-5 bg-gradient-to-t from-[#FDFBF7] dark:from-[#0B0F15] via-[#FDFBF7]/90 dark:via-[#0B0F15]/90 to-transparent pt-12 z-20">
            <button
              onClick={handleValidate}
              disabled={!canValidate()}
              className="w-full py-4 primary-gradient-btn disabled:from-slate-200 disabled:to-slate-100 dark:disabled:from-white/10 dark:disabled:to-white/5 disabled:text-slate-400 dark:disabled:text-white/30 disabled:border-slate-300 dark:disabled:border-white/5 text-white font-extrabold rounded-2xl text-[16px] flex items-center justify-center gap-2 transition-all shadow-xl active:scale-[0.98] disabled:scale-100"
            >
              <Check size={20} strokeWidth={3} />
              Valider la commande
            </button>
          </div>
        )}
        
        {/* Cancel Button */}
        {currentOrder && !isLocked && !pendingOrder && !selectedMealForDetail && (
          <div className="fixed bottom-0 left-0 right-0 p-5 bg-gradient-to-t from-[#FDFBF7] dark:from-[#0B0F15] via-[#FDFBF7]/90 dark:via-[#0B0F15]/90 to-transparent pt-12 z-20">
            <button
              onClick={() => {
                onCellClick(selectedEmployee.id, currentOrder.meal_id, null);
              }}
              className="w-full py-4 bg-red-50 dark:bg-red-500/10 text-red-600 dark:text-red-400 font-extrabold rounded-2xl text-[16px] flex items-center justify-center gap-2 transition-all active:scale-[0.98] border border-red-200 dark:border-red-500/20 hover:bg-red-100 dark:hover:bg-red-500/20"
            >
              Annuler cette commande
            </button>
          </div>
        )}

        {/* Meal Detail Modal */}
        {selectedMealForDetail && (
          <div className="fixed inset-0 z-[100] bg-white dark:bg-[#0B0F15] flex flex-col animate-in slide-in-from-bottom-full duration-300">
            {/* Header/Image Area */}
            <div className="relative w-full h-[40vh] bg-slate-100 dark:bg-slate-800 shrink-0">
              <img 
                src={selectedMealForDetail.image_url || getMealImage(selectedMealForDetail.name)} 
                alt={selectedMealForDetail.name}
                className="w-full h-full object-cover"
              />
              <div className="absolute inset-0 bg-gradient-to-b from-black/60 via-transparent to-transparent" />
              
              <button 
                onClick={() => {
                  setSelectedMealForDetail(null);
                  setPendingOrder(null);
                }}
                className="absolute top-6 left-5 w-10 h-10 rounded-full bg-white/20 backdrop-blur-md flex items-center justify-center text-white"
              >
                <ChevronLeft size={24} />
              </button>
            </div>

            {/* Details Area */}
            <div className="flex-1 flex flex-col -mt-8 bg-white dark:bg-[#0B0F15] rounded-t-[32px] overflow-hidden relative z-10">
              <div className="flex-1 overflow-y-auto px-6 pt-8 pb-32">
                <div className="flex items-start justify-between gap-4 mb-4">
                  <h2 className="text-2xl font-extrabold text-slate-900 dark:text-white leading-tight">
                    {selectedMealForDetail.name}
                  </h2>
                </div>
                
                <p className="text-slate-500 dark:text-slate-400 leading-relaxed mb-8">
                  {getMealSubtitle(selectedMealForDetail.name)}. Un plat délicieux préparé avec des ingrédients frais et une attention particulière pour satisfaire toutes vos envies gourmandes.
                </p>

                {selectedMealForDetail.has_options && (
                  <div className="mb-8">
                    <h3 className="font-extrabold text-slate-900 dark:text-white text-lg mb-4">Option (Requis)</h3>
                    <div className="flex flex-wrap gap-3">
                      {(selectedMealForDetail.options?.length ? selectedMealForDetail.options : ['Viande', 'Poisson']).map(option => (
                        <button
                          key={option}
                          onClick={() => handleOptionSelect(option)}
                          className={`flex-1 min-w-[120px] py-4 text-sm font-bold rounded-2xl transition-all border-2 ${
                            pendingOrder?.option === option 
                              ? 'bg-orange-500 border-orange-500 text-white shadow-lg shadow-orange-500/30' 
                              : 'bg-slate-50 dark:bg-white/5 border-slate-200 dark:border-white/10 text-slate-700 dark:text-slate-300'
                          }`}
                        >
                          {option}
                        </button>
                      ))}
                    </div>
                  </div>
                )}
              </div>

              {/* Validate Button Area */}
              <div className="absolute bottom-0 left-0 right-0 p-6 bg-gradient-to-t from-white dark:from-[#0B0F15] via-white/90 dark:via-[#0B0F15]/90 to-transparent pt-12">
                <button
                  onClick={handleValidate}
                  disabled={!canValidate()}
                  className="w-full py-4 bg-[#FF6B4A] hover:bg-[#F25A38] disabled:bg-slate-200 dark:disabled:bg-white/10 disabled:text-slate-400 dark:disabled:text-white/30 text-white font-extrabold rounded-[20px] text-[16px] flex items-center justify-center gap-2 transition-all shadow-[0_8px_20px_rgba(255,107,74,0.3)] disabled:shadow-none active:scale-[0.98] disabled:scale-100"
                >
                  Valider ma commande
                </button>
              </div>
            </div>
          </div>
        )}
      </div>
    );
  }

  return (
    <div className="flex flex-col min-h-screen bg-transparent">
      {/* Scrollable content (List Mode) */}
      <div className="flex-1 overflow-y-auto pb-32 relative">
        {/* Hero Header Card */}
        <div className="relative w-full rounded-b-[40px] overflow-hidden bg-slate-900 shadow-xl mb-6">
          {/* Carousel Container */}
          <div 
            className="flex w-full transition-transform duration-700 ease-in-out"
            style={{ transform: `translateX(-${heroSlideIndex * 100}%)` }}
          >
            {(heroBanners.length > 0 ? heroBanners : [{}]).map((banner, idx) => {
              const bgUrl = banner.image_url || "https://images.unsplash.com/photo-1504674900247-0877df9cc836?w=800&auto=format&fit=crop&q=80";
              const title = banner.title ? (
                <div dangerouslySetInnerHTML={{ __html: banner.title.replace(/\n/g, '<br/>') }} />
              ) : <>Découvrez <br/>notre Menu.</>;
              const subtitle = banner.subtitle || "Des plats savoureux préparés avec soin tous les jours.";

              return (
                <div key={idx} className="w-full shrink-0 relative">
                  {/* Background Image & Gradient */}
                  <div className="absolute inset-0 z-0">
                    <img 
                      src={bgUrl} 
                      alt="Hero background" 
                      className="w-full h-full object-cover opacity-60"
                    />
                    <div className="absolute inset-0 bg-gradient-to-b from-black/80 via-black/40 to-black/90" />
                  </div>

                  {/* Header Content */}
                  <div className="relative z-10 px-5 pt-24 pb-28 flex flex-col gap-6">
                    <div className="flex justify-between items-start">
                      <div>
                        <span className="text-orange-400 font-extrabold text-xs uppercase tracking-widest block mb-1">
                          Gastronomie Service
                        </span>
                        <h2 className="text-3xl font-extrabold text-white leading-tight tracking-tight">
                          {title}
                        </h2>
                        <p className="text-white/80 font-medium text-sm mt-2 max-w-[200px] leading-relaxed">
                          {subtitle}
                        </p>
                      </div>
                    </div>
                  </div>
                </div>
              );
            })}
          </div>

          {/* Floating Search Bar over the bottom edge */}
          <div className="absolute bottom-5 left-5 right-5 z-20 flex gap-3">
            <div className="flex-1 relative">
              <Search className="absolute left-5 top-1/2 -translate-y-1/2 text-slate-400 dark:text-slate-500" size={18} />
              <input
                type="text"
                placeholder="Search..."
                value={searchTerm}
                onChange={e => setSearchTerm(e.target.value)}
                className="w-full pl-12 pr-5 py-3.5 bg-white dark:bg-[#0B0F15] rounded-full outline-none text-[15px] font-medium text-slate-800 dark:text-white placeholder-slate-400 focus:ring-2 focus:ring-orange-500/50 transition-all border border-slate-100 dark:border-white/5 shadow-xl"
              />
            </div>
            <button 
              onClick={() => setIsFilterSheetOpen(true)}
              className={`w-[52px] h-[52px] flex items-center justify-center rounded-full shadow-xl shrink-0 transition-all border ${
                selectedSite !== 'All' || selectedDept !== 'All' 
                  ? 'primary-gradient-btn border-transparent text-white' 
                  : 'bg-white dark:bg-[#0B0F15] border-slate-100 dark:border-white/5 text-orange-500 hover:bg-slate-50'
              }`}
            >
              <SlidersHorizontal size={20} strokeWidth={2.5} />
            </button>
          </div>
        </div>

        {/* Employee Cards */}
        <div className="px-5 flex flex-col gap-3 relative z-10">
          {filteredEmployees.map(emp => {
            const empOrders = orders.filter(o => o.employee_id === emp.id);
            const hasOrdered = empOrders.length > 0;
            const orderedMeal = hasOrdered ? meals.find(m => m.id === empOrders[0].meal_id) : null;
            const proteinOption = hasOrdered ? empOrders[0].protein_option : null;
            const fullName = getEmployeeFullName(emp);
            const deptName = getEmployeeDeptName(emp);
            const isRecentlyOrdered = recentlyOrderedId === emp.id;

            return (
              <button
                key={emp.id}
                ref={(el) => employeeRefs.current[emp.id] = el}
                onClick={() => handleEmployeeClick(emp)}
                disabled={isLocked}
                className={`w-full glass-panel rounded-2xl px-5 py-4 flex items-center justify-between text-left active:scale-[0.99] transition-all duration-500 disabled:opacity-60 border ${
                  isRecentlyOrdered 
                    ? 'border-orange-500/50 ring-1 ring-orange-500/30 shadow-[0_0_20px_rgba(249,115,22,0.15)] bg-orange-50 dark:bg-orange-500/5' 
                    : 'hover:border-slate-300 dark:hover:border-white/20'
                }`}
              >
                <div className="flex-1 min-w-0">
                  <div className="flex items-center gap-2 mb-2">
                    <span className="font-bold text-slate-900 dark:text-white text-[15px] leading-tight">{fullName}</span>
                    {deptName && (
                      <span className="text-[10px] font-bold px-2 py-0.5 glass-button text-slate-600 dark:text-slate-300 rounded-full">
                        {deptName}
                      </span>
                    )}
                  </div>

                  {hasOrdered && orderedMeal ? (
                    <div className="flex items-center gap-2 flex-wrap">
                      <span className="text-orange-600 dark:text-orange-400 font-extrabold text-sm flex items-center gap-1.5">
                        <CheckCircle2 size={14} />
                        {orderedMeal.name}
                      </span>
                      {proteinOption && (
                        <span className="text-[9px] font-extrabold px-2 py-0.5 bg-orange-100 dark:bg-orange-500/20 text-orange-700 dark:text-orange-300 rounded-md uppercase tracking-wide border border-orange-200 dark:border-orange-500/20">
                          {proteinOption}
                        </span>
                      )}
                    </div>
                  ) : (
                    <div className="flex items-center gap-1.5 text-slate-400">
                      <span className="w-1.5 h-1.5 rounded-full bg-slate-300 dark:bg-slate-600" />
                      <span className="text-[12px] font-medium">Non commandé</span>
                    </div>
                  )}
                </div>

                <div className={`w-10 h-10 rounded-full shrink-0 flex items-center justify-center ml-3 border transition-all ${
                  hasOrdered
                    ? 'bg-orange-100 dark:bg-orange-500/20 border-orange-200 dark:border-orange-500/30 text-orange-600 dark:text-orange-400'
                    : 'bg-slate-100 dark:bg-white/5 border-slate-200 dark:border-white/10 text-slate-400 dark:text-slate-500'
                }`}>
                  <ChevronLeft size={20} className="rotate-180" />
                </div>
              </button>
            );
          })}

          {filteredEmployees.length === 0 && (
            <div className="text-center py-12 text-slate-500 font-semibold text-sm">
              Aucun collaborateur trouvé
            </div>
          )}
        </div>
      </div>

      {/* Filter Bottom Sheet */}
      {isFilterSheetOpen && (
        <>
          <div 
            className="fixed inset-0 bg-black/40 dark:bg-black/60 backdrop-blur-sm z-[60] transition-opacity" 
            onClick={() => setIsFilterSheetOpen(false)}
          />
          <div className="fixed bottom-0 left-0 right-0 bg-[#FDFBF7] dark:bg-[#0B0F15] border-t border-slate-200 dark:border-white/10 rounded-t-3xl z-[70] flex flex-col shadow-[0_-20px_50px_rgba(0,0,0,0.1)] dark:shadow-[0_-20px_50px_rgba(0,0,0,0.5)] animate-in slide-in-from-bottom-full duration-300 max-h-[85vh]">
            <div className="px-5 py-4 border-b border-slate-200 dark:border-white/10 flex items-center justify-between shrink-0 rounded-t-3xl sticky top-0 bg-[#FDFBF7] dark:bg-[#0B0F15]">
              <h3 className="font-extrabold text-slate-900 dark:text-white text-xl">Filtres</h3>
              <button 
                onClick={() => setIsFilterSheetOpen(false)}
                className="w-8 h-8 glass-button rounded-full flex items-center justify-center text-slate-500 dark:text-slate-400 hover:text-slate-900 dark:hover:text-white transition-colors"
              >
                <X size={18} />
              </button>
            </div>
            
            <div className="p-5 overflow-y-auto flex-1 flex flex-col gap-6 pb-32">
              <div>
                <label className="block text-sm font-bold text-slate-700 dark:text-slate-300 mb-2">Bureau (Site)</label>
                <select
                  value={selectedSite}
                  onChange={e => {
                    onSiteChange(e.target.value);
                    onDeptChange('All');
                  }}
                  className="w-full glass-panel rounded-xl px-4 py-3.5 outline-none text-slate-900 dark:text-white font-bold focus:border-orange-500 focus:ring-2 focus:ring-orange-500/20 transition-all appearance-none"
                >
                  <option value="All" className="bg-white dark:bg-[#0B0F15]">Tous les bureaux</option>
                  {sites.map(site => (
                    <option key={site.id} value={site.name} className="bg-white dark:bg-[#0B0F15]">{site.name}</option>
                  ))}
                </select>
              </div>

              <div>
                <label className="block text-sm font-bold text-slate-700 dark:text-slate-300 mb-2">Département</label>
                <select
                  value={selectedDept}
                  onChange={e => onDeptChange(e.target.value)}
                  className="w-full glass-panel rounded-xl px-4 py-3.5 outline-none text-slate-900 dark:text-white font-bold focus:border-orange-500 focus:ring-2 focus:ring-orange-500/20 transition-all appearance-none"
                >
                  <option value="All" className="bg-white dark:bg-[#0B0F15]">Tous les départements</option>
                  {departments
                    .filter(d => {
                      if (selectedSite === 'All') return true;
                      const siteObj = sites.find(s => s.name === selectedSite);
                      return siteObj && d.site_id === siteObj.id;
                    })
                    .map(dept => (
                    <option key={dept.id} value={dept.name} className="bg-white dark:bg-[#0B0F15]">{dept.name}</option>
                  ))}
                </select>
              </div>
            </div>

            <div className="px-5 py-5 bg-[#FDFBF7]/90 dark:bg-[#0B0F15]/90 backdrop-blur-md border-t border-slate-200 dark:border-white/10 shrink-0 flex gap-3 absolute bottom-0 left-0 right-0">
              <button
                onClick={() => {
                  onSiteChange('All');
                  onDeptChange('All');
                }}
                className="flex-[0.8] py-3.5 glass-button text-slate-700 dark:text-white font-bold rounded-xl active:scale-[0.98]"
              >
                Réinitialiser
              </button>
              <button
                onClick={() => setIsFilterSheetOpen(false)}
                className="flex-1 py-3.5 primary-gradient-btn rounded-xl active:scale-[0.98]"
              >
                Voir les résultats
              </button>
            </div>
          </div>
        </>
      )}

      <ConfirmModal
        isOpen={errorModal.isOpen}
        title="Action impossible"
        message={errorModal.message}
        type="danger"
        confirmText="Compris"
        onConfirm={() => setErrorModal({ isOpen: false, message: '' })}
      />
    </div>
  );
}
