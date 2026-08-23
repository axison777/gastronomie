import { useState, useMemo } from 'react';
import { Check, Search, ChevronDown, CheckCircle2, Plus, MoreHorizontal } from 'lucide-react';
import type { Employee, Meal, Order, Site, Department } from '../lib/supabase';
import { getEmployeeDeptName, getEmployeeFullName, getEmployeeSiteName } from '../lib/employeeUtils';
import ConfirmModal from './ConfirmModal';

interface DesktopOrderViewProps {
  employees: Employee[];
  meals: Meal[];
  orders: Order[];
  isLocked: boolean;
  onCellClick: (employeeId: string, mealId: string, option: 'Viande' | 'Poisson' | null) => void;
  sites: Site[];
  departments: Department[];
}

const getMealImage = (name: string) => {
  const lower = name.toLowerCase();
  if (lower.includes('yassa') || lower.includes('poulet')) return 'https://images.unsplash.com/photo-1604908176997-125f25cc6f3d?w=400&auto=format&fit=crop&q=80';
  if (lower.includes('mafe') || lower.includes('mafé') || lower.includes('boeuf') || lower.includes('bœuf')) return 'https://images.unsplash.com/photo-1544025162-d76694265947?w=400&auto=format&fit=crop&q=80';
  if (lower.includes('salade') || lower.includes('veget') || lower.includes('légume')) return 'https://images.unsplash.com/photo-1512621776951-a57141f2eefd?w=400&auto=format&fit=crop&q=80';
  if (lower.includes('poisson') || lower.includes('fish') || lower.includes('grillé')) return 'https://images.unsplash.com/photo-1473093295043-cdd812d0e601?w=400&auto=format&fit=crop&q=80';
  if (lower.includes('riz') || lower.includes('rice') || lower.includes('thieb')) return 'https://images.unsplash.com/photo-1574672280242-9b3c267b3186?w=400&auto=format&fit=crop&q=80';
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

const getInitials = (name: string) => {
  const parts = name.trim().split(/\s+/);
  if (parts.length >= 2) return `${parts[0][0]}${parts[parts.length - 1][0]}`.toUpperCase();
  return name.slice(0, 2).toUpperCase();
};

const getAvatarColors = (name: string) => {
  const code = name.split('').reduce((acc, char) => acc + char.charCodeAt(0), 0);
  const colorOptions = [
    { bg: 'bg-orange-500/20 text-orange-400', border: 'border-orange-500/30' },
    { bg: 'bg-blue-500/20 text-blue-400', border: 'border-blue-500/30' },
    { bg: 'bg-emerald-500/20 text-emerald-400', border: 'border-emerald-500/30' },
    { bg: 'bg-indigo-500/20 text-indigo-400', border: 'border-indigo-500/30' },
    { bg: 'bg-rose-500/20 text-rose-400', border: 'border-rose-500/30' },
    { bg: 'bg-amber-500/20 text-amber-400', border: 'border-amber-500/30' }
  ];
  return colorOptions[code % colorOptions.length];
};

export default function DesktopOrderView({
  employees,
  meals,
  orders,
  isLocked,
  onCellClick,
  sites,
  departments
}: DesktopOrderViewProps) {
  const [searchTerm, setSearchTerm] = useState('');
  const [selectedSite, setSelectedSite] = useState<string>('All');
  const [selectedDept, setSelectedDept] = useState<string>('All');
  const [selectedEmployeeId, setSelectedEmployeeId] = useState<string | null>(null);
  
  // To handle the detail modal and options
  const [selectedMealForDetail, setSelectedMealForDetail] = useState<Meal | null>(null);
  const [pendingOrderOption, setPendingOrderOption] = useState<string | null>(null);
  
  const [errorModal, setErrorModal] = useState<{isOpen: boolean; message: string}>({ isOpen: false, message: '' });

  const activeEmployees = useMemo(() => employees.filter(e => e.is_active), [employees]);

  const departmentsForSite = useMemo(() => {
    return [
      'All',
      ...new Set(
        activeEmployees
          .filter(e => selectedSite === 'All' || getEmployeeSiteName(e) === selectedSite)
          .map(e => getEmployeeDeptName(e))
          .filter(Boolean)
      )
    ].sort();
  }, [activeEmployees, selectedSite]);

  const filteredEmployees = useMemo(() => {
    return activeEmployees.filter(e => {
      const siteMatches = selectedSite === 'All' || getEmployeeSiteName(e) === selectedSite;
      const deptMatches = selectedDept === 'All' || getEmployeeDeptName(e) === selectedDept;
      const fullName = getEmployeeFullName(e).toLowerCase();
      const nameMatches = fullName.includes(searchTerm.toLowerCase());
      return siteMatches && deptMatches && nameMatches;
    });
  }, [activeEmployees, selectedSite, selectedDept, searchTerm]);

  const selectedEmployee = activeEmployees.find(e => e.id === selectedEmployeeId) || null;

  const handleEmployeeClick = (emp: Employee) => {
    setSelectedEmployeeId(emp.id);
    setSelectedMealForDetail(null);
    setPendingOrderOption(null);
  };

  const getEmployeeOrder = (empId: string) => orders.find(o => o.employee_id === empId);

  const handleMealClick = (meal: Meal) => {
    if (!selectedEmployeeId || isLocked) return;
    
    const existingOrder = getEmployeeOrder(selectedEmployeeId);
    
    if (existingOrder) {
      if (existingOrder.meal_id === meal.id) {
        // Deselect
        onCellClick(selectedEmployeeId, meal.id, null);
        setSelectedMealForDetail(null);
      } else {
        setErrorModal({
          isOpen: true,
          message: "Cet employé a déjà commandé un plat aujourd'hui. Veuillez d'abord annuler son plat actuel."
        });
      }
      return;
    }

    setSelectedMealForDetail(meal);
    setPendingOrderOption(null);
  };

  const handleValidateDetail = () => {
    if (!selectedEmployeeId || !selectedMealForDetail || isLocked) return;
    onCellClick(selectedEmployeeId, selectedMealForDetail.id, pendingOrderOption);
    setSelectedMealForDetail(null);
    setPendingOrderOption(null);
  };

  return (
    <div className="flex h-[calc(100vh-180px)] min-h-[600px] gap-6">
      
      {/* LEFT PANEL: Master List */}
      <div className="w-[380px] glass-panel rounded-2xl flex flex-col overflow-hidden shrink-0 relative border border-slate-200 dark:border-white/10">
        <div className="p-4 border-b border-slate-200 dark:border-white/10 space-y-4 bg-white/40 dark:bg-white/5 relative z-10">
          <div className="flex items-center justify-between">
            <h3 className="font-bold text-slate-900 dark:text-white text-lg">Collaborateurs</h3>
            <span className="bg-orange-500/10 dark:bg-orange-500/20 text-orange-600 dark:text-orange-400 py-0.5 px-2.5 rounded-full text-xs font-bold border border-orange-500/20">
              {filteredEmployees.length}
            </span>
          </div>
          
          <div className="relative">
            <Search size={16} className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400" />
            <input 
              type="text"
              placeholder="Rechercher..."
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              className="w-full pl-9 pr-3 py-2 bg-white/60 dark:bg-white/5 border border-slate-300 dark:border-white/10 rounded-xl focus:ring-2 focus:ring-orange-500/50 focus:border-orange-500/50 text-sm text-slate-900 dark:text-white placeholder-slate-400 dark:placeholder-slate-500 outline-none transition-all"
            />
          </div>

          <div className="flex gap-2">
            <div className="relative flex-1">
              <select
                value={selectedSite}
                onChange={(e) => {
                  setSelectedSite(e.target.value);
                  setSelectedDept('All');
                }}
                className="w-full appearance-none bg-white/60 dark:bg-white/5 border border-slate-300 dark:border-white/10 rounded-lg pl-3 pr-8 py-1.5 text-xs font-medium text-slate-700 dark:text-slate-300 outline-none cursor-pointer"
              >
                <option value="All" className="bg-white dark:bg-[#0B0F15]">Tous sites</option>
                {sites.map(site => (
                  <option key={site.id} value={site.name} className="bg-white dark:bg-[#0B0F15]">{site.name}</option>
                ))}
              </select>
              <ChevronDown size={12} className="absolute right-2.5 top-1/2 -translate-y-1/2 text-slate-400 pointer-events-none" />
            </div>
            <div className="relative flex-1">
              <select
                value={selectedDept}
                onChange={(e) => setSelectedDept(e.target.value)}
                className="w-full appearance-none bg-white/60 dark:bg-white/5 border border-slate-300 dark:border-white/10 rounded-lg pl-3 pr-8 py-1.5 text-xs font-medium text-slate-700 dark:text-slate-300 outline-none cursor-pointer"
              >
                {departmentsForSite.map(dept => (
                  <option key={dept} value={dept} className="bg-white dark:bg-[#0B0F15]">{dept === 'All' ? 'Tous dépts' : dept}</option>
                ))}
              </select>
              <ChevronDown size={12} className="absolute right-2.5 top-1/2 -translate-y-1/2 text-slate-400 pointer-events-none" />
            </div>
          </div>
        </div>

        <div className="flex-1 overflow-y-auto p-3 space-y-1.5 relative z-10">
          {filteredEmployees.map((emp) => {
            const isSelected = emp.id === selectedEmployeeId;
            const empOrder = getEmployeeOrder(emp.id);
            const hasOrdered = !!empOrder;
            const fullName = getEmployeeFullName(emp);
            const deptName = getEmployeeDeptName(emp);
            const colors = getAvatarColors(fullName);

            return (
              <button
                key={emp.id}
                onClick={() => handleEmployeeClick(emp)}
                className={`w-full flex items-center justify-between p-3 rounded-xl transition-all duration-200 text-left group border ${
                  isSelected 
                    ? 'bg-orange-50 dark:bg-orange-500/10 border-orange-200 dark:border-orange-500/30 shadow-[0_0_15px_rgba(249,115,22,0.1)] ring-1 ring-orange-500/20' 
                    : 'bg-transparent border-transparent hover:bg-white/40 dark:hover:bg-white/5 hover:border-slate-200 dark:hover:border-white/10'
                }`}
              >
                <div className="flex items-center gap-3 min-w-0">
                  <div className={`w-10 h-10 rounded-full flex items-center justify-center font-bold text-sm shrink-0 border ${colors.bg} ${colors.border}`}>
                    {getInitials(fullName)}
                  </div>
                  <div className="min-w-0 flex-1">
                    <div className={`font-semibold truncate text-[14px] ${isSelected ? 'text-slate-900 dark:text-white' : 'text-slate-700 dark:text-slate-300 group-hover:text-slate-900 dark:group-hover:text-white'}`}>
                      {fullName}
                    </div>
                    <div className="flex gap-1.5 mt-0.5">
                      {deptName && (
                         <span className="text-[10px] px-2 py-0.5 rounded-full bg-slate-100 dark:bg-white/5 border border-slate-200 dark:border-white/5 text-slate-500 dark:text-slate-400 font-medium truncate">
                           {deptName}
                         </span>
                      )}
                    </div>
                  </div>
                </div>
                
                <div className="shrink-0 ml-3">
                  {hasOrdered ? (
                    <div className="w-6 h-6 rounded-full bg-orange-100 dark:bg-orange-500/20 flex items-center justify-center text-orange-500 dark:text-orange-400 border border-orange-200 dark:border-orange-500/30">
                      <Check size={14} strokeWidth={3} />
                    </div>
                  ) : (
                    <div className={`w-6 h-6 rounded-full border-2 border-slate-300 dark:border-white/10 ${isSelected ? 'bg-white/50 dark:bg-white/10' : ''}`} />
                  )}
                </div>
              </button>
            );
          })}
          {filteredEmployees.length === 0 && (
            <div className="text-center py-10 text-slate-500 text-sm font-medium">
              Aucun collaborateur trouvé
            </div>
          )}
        </div>
      </div>

      {/* RIGHT PANEL: Detail (Menu) */}
      <div className="flex-1 glass-panel flex flex-col rounded-2xl relative overflow-hidden border border-slate-200 dark:border-white/10">
        {!selectedEmployee ? (
          <div className="flex-1 flex flex-col items-center justify-center text-slate-500 space-y-4">
            <div className="w-20 h-20 bg-white/50 dark:bg-white/5 border border-slate-200 dark:border-white/10 rounded-full flex items-center justify-center">
              <Search size={32} className="text-slate-400" />
            </div>
            <p className="text-lg font-medium text-slate-500 dark:text-slate-400">Sélectionnez un collaborateur à gauche</p>
          </div>
        ) : selectedEmployee.is_cotisation_paid === false ? (
          <div className="flex-1 flex flex-col items-center justify-center p-8 text-center animate-in fade-in duration-300 relative">
             <div className="absolute inset-0 bg-red-50/30 dark:bg-red-900/5 backdrop-blur-sm pointer-events-none" />
             <div className="relative z-10">
              <div className="w-24 h-24 rounded-full bg-red-100 dark:bg-red-500/10 text-red-500 dark:text-red-400 flex items-center justify-center mx-auto mb-6 border border-red-200 dark:border-red-500/20 shadow-lg shadow-red-500/10">
                <svg xmlns="http://www.w3.org/2000/svg" className="h-12 w-12" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-3L13.732 4c-.77-1.333-2.694-1.333-3.464 0L3.34 16c-.77 1.333.192 3 1.732 3z" />
                </svg>
              </div>
              
              <h3 className="text-2xl font-extrabold text-slate-900 dark:text-white mb-4">
                Cotisation Impayée
              </h3>
              
              <p className="text-base font-semibold text-slate-500 dark:text-slate-400 max-w-md leading-relaxed mx-auto">
                Désolé <span className="text-slate-900 dark:text-white font-bold">{selectedEmployee.first_name}</span>, vous n'êtes pas à jour sur vos cotisations. <br/><br/>
                <span className="text-red-500 dark:text-red-400 font-bold bg-red-50 dark:bg-red-500/10 px-3 py-1.5 rounded-lg border border-red-100 dark:border-red-500/20 inline-block mt-2">Veuillez vous approcher des responsables de la restauration.</span>
              </p>
            </div>
          </div>
        ) : selectedMealForDetail ? (
          <div className="flex-1 flex flex-col h-full animate-in slide-in-from-right-8 duration-300 bg-white/40 dark:bg-[#0B0F15]/40 relative">
            {/* Header Image */}
            <div className="relative w-full h-48 shrink-0">
              <img 
                src={selectedMealForDetail.image_url || getMealImage(selectedMealForDetail.name)} 
                alt={selectedMealForDetail.name}
                className="w-full h-full object-cover"
              />
              <div className="absolute inset-0 bg-gradient-to-t from-white dark:from-[#0B0F15] via-transparent to-transparent" />
              
              {/* Back button */}
              <button
                onClick={() => {
                  setSelectedMealForDetail(null);
                  setPendingOrderOption(null);
                }}
                className="absolute top-6 left-6 w-12 h-12 rounded-full bg-black/20 hover:bg-black/40 backdrop-blur-md flex items-center justify-center text-white z-20 transition-colors shadow-sm"
              >
                <svg xmlns="http://www.w3.org/2000/svg" width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round"><path d="m15 18-6-6 6-6"/></svg>
              </button>
            </div>

            {/* Content Area */}
            <div className="flex-1 overflow-y-auto px-8 pt-4 pb-8 flex flex-col relative z-10 -mt-8">
              <div className="bg-white/90 dark:bg-[#111823]/90 backdrop-blur-xl border border-slate-200/80 dark:border-white/10 rounded-[24px] p-6 shadow-2xl flex-1 flex flex-col">
                <h2 className="text-2xl font-extrabold text-slate-900 dark:text-white leading-tight mb-2">
                  {selectedMealForDetail.name}
                </h2>
                
                <p className="text-slate-500 dark:text-slate-400 leading-relaxed text-[14px] mb-4">
                  {getMealSubtitle(selectedMealForDetail.name)}. Un plat délicieux préparé avec soin, offrant des saveurs exceptionnelles pour ravir vos papilles.
                </p>

                {selectedMealForDetail.has_options && (
                  <div className="mb-6">
                    <h3 className="font-extrabold text-slate-900 dark:text-white text-lg mb-3">Option (Requis)</h3>
                    <div className="flex flex-wrap gap-3">
                      {(selectedMealForDetail.options?.length ? selectedMealForDetail.options : ['Viande', 'Poisson']).map(option => (
                        <button
                          key={option}
                          onClick={() => setPendingOrderOption(option)}
                          className={`flex-1 min-w-[120px] py-3 text-[14px] font-bold rounded-xl transition-all border-2 ${
                            pendingOrderOption === option 
                              ? 'bg-orange-500 border-orange-500 text-white shadow-lg shadow-orange-500/30 ring-2 ring-orange-500/20' 
                              : 'bg-slate-50 dark:bg-white/5 border-slate-200 dark:border-white/10 text-slate-700 dark:text-slate-300 hover:bg-slate-100 dark:hover:bg-white/10'
                          }`}
                        >
                          {option}
                        </button>
                      ))}
                    </div>
                  </div>
                )}

                <div className="mt-auto pt-4">
                  <button
                    onClick={handleValidateDetail}
                    disabled={selectedMealForDetail.has_options ? !pendingOrderOption : false}
                    className="w-full py-3.5 bg-[#FF6B4A] hover:bg-[#F25A38] disabled:bg-slate-200 dark:disabled:bg-white/10 disabled:text-slate-400 dark:disabled:text-white/30 text-white font-extrabold rounded-xl text-[16px] flex items-center justify-center gap-2 transition-all shadow-[0_8px_20px_rgba(255,107,74,0.3)] disabled:shadow-none active:scale-[0.98] disabled:scale-100"
                  >
                    Valider la commande
                  </button>
                </div>
              </div>
            </div>
          </div>
        ) : (
          <div className="flex-1 flex flex-col h-full animate-in fade-in duration-300">
            {/* Header Detail */}
            <div className="px-8 py-6 border-b border-slate-200 dark:border-white/10 bg-white/40 dark:bg-[#0B0F15]/40 backdrop-blur-md flex items-center justify-between sticky top-0 z-10">
              <div>
                <h2 className="text-2xl font-extrabold text-slate-900 dark:text-white">
                  Menu de <span className="text-orange-500 dark:text-orange-400">{selectedEmployee.first_name}</span>
                </h2>
                <p className="text-sm text-slate-500 dark:text-slate-400 mt-1 font-medium">
                  {getEmployeeOrder(selectedEmployee.id) ? 'Commande effectuée' : 'Veuillez sélectionner un plat'}
                </p>
              </div>
              {getEmployeeOrder(selectedEmployee.id) && (
                <button 
                  onClick={() => onCellClick(selectedEmployee.id, getEmployeeOrder(selectedEmployee.id)!.meal_id, null)}
                  className="px-4 py-2 text-sm font-bold text-red-500 dark:text-red-400 bg-red-50 dark:bg-red-500/10 border border-red-200 dark:border-red-500/20 hover:bg-red-100 dark:hover:bg-red-500/20 rounded-lg transition-colors"
                  disabled={isLocked}
                >
                  Annuler la commande
                </button>
              )}
            </div>

            {/* Bento Grid */}
            <div className="flex-1 overflow-y-auto p-8 relative z-10">
              <div className="grid grid-cols-3 gap-6">
                {meals.map((meal) => {
                  const empOrder = getEmployeeOrder(selectedEmployee.id);
                  const isOrdered = empOrder?.meal_id === meal.id;
                  
                  return (
                    <div 
                      key={meal.id}
                      onClick={() => handleMealClick(meal)}
                      className={`relative w-full rounded-[24px] bg-white/60 dark:bg-white/5 backdrop-blur-xl p-3 group cursor-pointer transition-all duration-300 border ${
                        isOrdered 
                          ? 'border-orange-500 shadow-[0_0_20px_rgba(249,115,22,0.15)] ring-1 ring-orange-500' 
                          : 'border-slate-100 dark:border-white/5 hover:border-slate-300 dark:hover:border-white/10 hover:shadow-xl'
                      }`}
                    >
                      {/* Top Image Section */}
                      <div className="relative w-full h-[180px] rounded-[16px] overflow-hidden">
                        <img 
                          src={meal.image_url || getMealImage(meal.name)} 
                          alt={meal.name}
                          className="w-full h-full object-cover transition-transform duration-700 group-hover:scale-105"
                        />
                        
                        {/* More Button Overlay */}
                        <div className="absolute bottom-2 right-2 w-8 h-8 rounded-full bg-white dark:bg-[#0B0F15] flex items-center justify-center shadow-md text-slate-700 dark:text-slate-300">
                           <MoreHorizontal size={18} strokeWidth={2.5} />
                        </div>
                        
                        {/* Status badge */}
                        {isOrdered && (
                          <div className="absolute top-2 right-2 bg-orange-500 text-white p-1.5 rounded-full shadow-lg shadow-orange-500/40 z-10">
                            <CheckCircle2 size={16} strokeWidth={2.5} />
                          </div>
                        )}
                      </div>

                      {/* Info Section */}
                      <div className="mt-3 px-1">
                        <h3 className="font-semibold text-slate-900 dark:text-white text-[15px] truncate">{meal.name}</h3>
                        
                        <div className="flex items-center justify-between mt-3">
                           {/* Price or subtitle */}
                           <span className="text-slate-600 dark:text-slate-400 font-medium text-[13px] truncate flex-1">
                              {getMealSubtitle(meal.name)}
                           </span>
                           
                           {/* Action area */}
                           <div className="shrink-0 flex items-center gap-2 ml-2">
                             {isOrdered ? (
                               <div className="bg-orange-50 dark:bg-orange-500/10 text-orange-600 dark:text-orange-400 font-bold px-3 py-1.5 rounded-lg text-xs border border-orange-200 dark:border-orange-500/20">
                                 {meal.has_options && empOrder.protein_option ? `${empOrder.protein_option}` : 'Sélectionné'}
                               </div>
                             ) : (
                               <button 
                                 className="w-[28px] h-[28px] rounded-[8px] bg-[#FF5722] text-white flex items-center justify-center hover:bg-[#F4511E] transition-colors shadow-sm"
                               >
                                 <Plus size={16} strokeWidth={3} />
                               </button>
                             )}
                           </div>
                        </div>
                      </div>
                    </div>
                  );
                })}
              </div>
            </div>
          </div>
        )}
      </div>

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
