import { useState } from 'react';
import { Check, Search, SlidersHorizontal, X, BarChart2 } from 'lucide-react';
import type { Employee, Meal, Order } from '../lib/supabase';
import { getEmployeeDeptName, getEmployeeFullName } from '../lib/employeeUtils';

interface MobileOrderViewProps {
  employees: Employee[];
  meals: Meal[];
  orders: Order[];
  isLocked: boolean;
  activeView: 'orders' | 'summary';
  onViewChange: (view: 'orders' | 'summary') => void;
  onCellClick: (employeeId: string, mealId: string, option: 'Viande' | 'Poisson' | null) => void;
}

const getMealImage = (name: string) => {
  const lower = name.toLowerCase();
  if (lower.includes('yassa') || lower.includes('poulet'))
    return 'https://images.unsplash.com/photo-1604908176997-125f25cc6f3d?w=150&auto=format&fit=crop&q=80';
  if (lower.includes('mafe') || lower.includes('mafé') || lower.includes('boeuf') || lower.includes('bœuf'))
    return 'https://images.unsplash.com/photo-1544025162-d76694265947?w=150&auto=format&fit=crop&q=80';
  if (lower.includes('salade') || lower.includes('veget') || lower.includes('légume'))
    return 'https://images.unsplash.com/photo-1512621776951-a57141f2eefd?w=150&auto=format&fit=crop&q=80';
  if (lower.includes('poisson') || lower.includes('fish') || lower.includes('grillé'))
    return 'https://images.unsplash.com/photo-1473093295043-cdd812d0e601?w=150&auto=format&fit=crop&q=80';
  if (lower.includes('thiebou') || lower.includes('thiébou') || lower.includes('riz'))
    return 'https://images.unsplash.com/photo-1574672280242-9b3c267b3186?w=150&auto=format&fit=crop&q=80';
  return 'https://images.unsplash.com/photo-1504674900247-0877df9cc836?w=150&auto=format&fit=crop&q=80';
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
  activeView,
  onViewChange,
  onCellClick,
}: MobileOrderViewProps) {
  const [searchTerm, setSearchTerm] = useState('');
  const [selectedEmployee, setSelectedEmployee] = useState<Employee | null>(null);
  const [pendingOrder, setPendingOrder] = useState<{ mealId: string; option: 'Viande' | 'Poisson' | null } | null>(null);

  const filteredEmployees = employees.filter(e =>
    e.is_active &&
    getEmployeeFullName(e).toLowerCase().includes(searchTerm.toLowerCase())
  );

  const getCurrentEmployeeOrder = () =>
    selectedEmployee ? orders.find(o => o.employee_id === selectedEmployee.id) : undefined;

  const getEmployeeOrder = (mealId: string) => {
    const current = getCurrentEmployeeOrder();
    return current?.meal_id === mealId ? current : undefined;
  };

  const handleEmployeeClick = (emp: Employee) => {
    if (isLocked || !emp.is_active) return;
    setPendingOrder(null);
    setSelectedEmployee(emp);
  };

  const handleMealSelect = (meal: Meal) => {
    if (isLocked || !selectedEmployee) return;
    const currentOrder = getCurrentEmployeeOrder();
    if (currentOrder) {
      if (currentOrder.meal_id === meal.id) {
        onCellClick(selectedEmployee.id, meal.id, null);
        closeSheet();
        return;
      } else {
        alert("Cet employé a déjà commandé un plat aujourd'hui. Veuillez d'abord décocher son plat actuel avant d'en choisir un nouveau.");
        return;
      }
    }
    if (meal.has_options) {
      setPendingOrder({ mealId: meal.id, option: null });
    } else {
      setPendingOrder({ mealId: meal.id, option: null });
    }
  };

  const handleOptionSelect = (option: 'Viande' | 'Poisson') => {
    if (!pendingOrder) return;
    setPendingOrder({ ...pendingOrder, option });
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
    setSelectedEmployee(null);
    setPendingOrder(null);
  };

  const handleDeselectOrder = () => {
    if (!selectedEmployee || isLocked) return;
    const currentOrder = getCurrentEmployeeOrder();
    if (currentOrder) {
      onCellClick(selectedEmployee.id, currentOrder.meal_id, null);
    }
    closeSheet();
  };

  const closeSheet = () => {
    setSelectedEmployee(null);
    setPendingOrder(null);
  };

  return (
    <div className="flex flex-col min-h-screen bg-[#F5F4EC]">
      {/* Scrollable content */}
      <div className="flex-1 overflow-y-auto pb-28">
        {/* Page Title */}
        <div className="px-5 pt-5 pb-3">
          <h2 className="text-2xl font-extrabold text-gray-900 leading-tight tracking-tight">
            Commande Publique
          </h2>
          <p className="text-[13px] text-gray-500 font-semibold mt-1 leading-snug">
            Sélectionnez vos plats pour le déjeuner d'aujourd'hui.
          </p>
        </div>

        {/* Search Bar */}
        <div className="px-5 pb-5 flex items-center gap-3">
          <div className="flex-1 relative">
            <Search className="absolute left-4 top-1/2 -translate-y-1/2 text-gray-400" size={16} />
            <input
              type="text"
              placeholder="Rechercher mon nom..."
              value={searchTerm}
              onChange={e => setSearchTerm(e.target.value)}
              className="w-full pl-11 pr-4 py-3 bg-white border border-[#E4E3DB] rounded-2xl outline-none text-[14px] font-semibold text-gray-700 placeholder-gray-400 shadow-sm"
            />
          </div>
          <button className="w-11 h-11 flex items-center justify-center bg-white border border-[#E4E3DB] rounded-2xl shadow-sm text-gray-500 shrink-0">
            <SlidersHorizontal size={18} />
          </button>
        </div>

        {/* Employee Cards */}
        <div className="px-5 flex flex-col gap-3">
          {filteredEmployees.map(emp => {
            const empOrders = orders.filter(o => o.employee_id === emp.id);
            const hasOrdered = empOrders.length > 0;
            const orderedMeal = hasOrdered ? meals.find(m => m.id === empOrders[0].meal_id) : null;
            const proteinOption = hasOrdered ? empOrders[0].protein_option : null;
            const fullName = getEmployeeFullName(emp);
            const deptName = getEmployeeDeptName(emp);

            return (
              <button
                key={emp.id}
                onClick={() => handleEmployeeClick(emp)}
                disabled={isLocked}
                className="w-full bg-white border border-[#E4E3DB] rounded-2xl px-5 py-4 flex items-center justify-between text-left shadow-sm active:scale-[0.99] transition-transform disabled:opacity-60"
              >
                <div className="flex-1 min-w-0">
                  <div className="flex items-center gap-2 mb-2">
                    <span className="font-bold text-gray-900 text-[15px] leading-tight">{fullName}</span>
                    {deptName && (
                      <span className="text-[10px] font-bold px-2 py-0.5 bg-[#F0EFE8] border border-[#E4E3DB] text-gray-600 rounded-full">
                        {deptName}
                      </span>
                    )}
                  </div>

                  {hasOrdered && orderedMeal ? (
                    <div className="flex items-center gap-2 flex-wrap">
                      <span className="text-base leading-none">🍽️</span>
                      <span className="text-[#BD4F19] font-extrabold text-sm">{orderedMeal.name}</span>
                      {proteinOption && (
                        <span className="text-[9px] font-extrabold px-2 py-0.5 bg-[#E2F0D9] text-[#385723] rounded-full uppercase tracking-wide">
                          {proteinOption}
                        </span>
                      )}
                    </div>
                  ) : (
                    <div className="flex items-center gap-1.5 text-gray-400">
                      <span className="text-sm leading-none">😶</span>
                      <span className="text-[12px] font-semibold italic">Non commandé</span>
                    </div>
                  )}
                </div>

                <div className={`w-9 h-9 rounded-full shrink-0 flex items-center justify-center ml-3 border-2 transition-all ${
                  hasOrdered
                    ? 'bg-[#BD4F19] border-[#BD4F19] text-white shadow-sm'
                    : 'bg-transparent border-[#D1CFC8]'
                }`}>
                  {hasOrdered && <Check size={16} strokeWidth={3} />}
                </div>
              </button>
            );
          })}

          {filteredEmployees.length === 0 && (
            <div className="text-center py-12 text-gray-400 font-semibold text-sm">
              Aucun collaborateur trouvé
            </div>
          )}
        </div>
      </div>

      {/* Bottom Tab Navigation */}
      <div className="fixed bottom-0 left-0 right-0 bg-white/95 backdrop-blur-sm border-t border-[#E4E3DB] px-8 py-4 flex items-center justify-around z-30 shadow-lg">
        <button
          onClick={() => onViewChange('orders')}
          className="flex flex-col items-center"
        >
          {activeView === 'orders' ? (
            <div className="bg-[#BD4F19] text-white rounded-full px-6 py-2.5 flex items-center gap-2 font-extrabold text-[13px] shadow-md">
              <svg xmlns="http://www.w3.org/2000/svg" className="w-4 h-4" fill="none" viewBox="0 0 24 24" strokeWidth={2.5} stroke="currentColor">
                <path strokeLinecap="round" strokeLinejoin="round" d="M9 5H7a2 2 0 00-2 2v12a2 2 0 002 2h10a2 2 0 002-2V7a2 2 0 00-2-2h-2M9 5a2 2 0 002 2h2a2 2 0 002-2M9 5a2 2 0 012-2h2a2 2 0 012 2" />
              </svg>
              Commandes
            </div>
          ) : (
            <div className="flex flex-col items-center gap-1 px-4 py-1 text-gray-400">
              <svg xmlns="http://www.w3.org/2000/svg" className="w-5 h-5" fill="none" viewBox="0 0 24 24" strokeWidth={2} stroke="currentColor">
                <path strokeLinecap="round" strokeLinejoin="round" d="M9 5H7a2 2 0 00-2 2v12a2 2 0 002 2h10a2 2 0 002-2V7a2 2 0 00-2-2h-2M9 5a2 2 0 002 2h2a2 2 0 002-2M9 5a2 2 0 012-2h2a2 2 0 012 2" />
              </svg>
              <span className="text-[10px] font-bold">Commandes</span>
            </div>
          )}
        </button>

        <button
          onClick={() => onViewChange('summary')}
          className="flex flex-col items-center"
        >
          {activeView === 'summary' ? (
            <div className="bg-[#BD4F19] text-white rounded-full px-6 py-2.5 flex items-center gap-2 font-extrabold text-[13px] shadow-md">
              <BarChart2 size={16} />
              Synthèse
            </div>
          ) : (
            <div className="flex flex-col items-center gap-1 px-4 py-1 text-gray-400">
              <BarChart2 size={20} />
              <span className="text-[10px] font-bold">Synthèse</span>
            </div>
          )}
        </button>
      </div>

      {/* Bottom Sheet - Meal Selection */}
      {selectedEmployee && (
        <>
          {/* Backdrop */}
          <div
            onClick={closeSheet}
            className="fixed inset-0 bg-black/50 backdrop-blur-sm z-40"
          />

          {/* Sheet */}
          <div className="fixed bottom-0 left-0 right-0 bg-white rounded-t-3xl z-50 shadow-2xl flex flex-col max-h-[82vh] animate-in slide-in-from-bottom-4 duration-300">
            {/* Drag handle */}
            <div className="flex justify-center pt-3 pb-2 shrink-0">
              <div className="w-10 h-1 rounded-full bg-gray-300" />
            </div>

            {/* Sheet Header */}
            <div className="px-6 pt-2 pb-4 flex items-center justify-between shrink-0">
              <h3 className="text-xl font-extrabold text-gray-900 leading-tight">
                Menu du jour pour {selectedEmployee.first_name}
              </h3>
              <button
                onClick={closeSheet}
                className="w-8 h-8 rounded-full bg-gray-100 flex items-center justify-center text-gray-500 ml-3 shrink-0"
              >
                <X size={16} />
              </button>
            </div>

            {/* Meals List */}
            <div className="flex-1 overflow-y-auto px-5 flex flex-col gap-3 pb-3">
              {meals.map(meal => {
                const existingOrder = getEmployeeOrder(meal.id);
                const isPending = pendingOrder?.mealId === meal.id;
                const isActive = !!existingOrder || isPending;

                return (
                  <button
                    key={meal.id}
                    onClick={() => handleMealSelect(meal)}
                    className={`w-full text-left rounded-2xl border-2 transition-all ${
                      isActive
                        ? 'border-[#BD4F19]'
                        : 'border-[#E4E3DB] bg-white'
                    }`}
                  >
                    <div className="flex items-center gap-4 p-4">
                      <img
                        src={meal.image_url || getMealImage(meal.name)}
                        alt={meal.name}
                        className="w-[52px] h-[52px] rounded-xl object-cover shrink-0 border border-[#E4E3DB]"
                      />
                      <div className="flex-1 min-w-0">
                        <div className={`font-extrabold text-[15px] leading-snug ${isActive ? 'text-gray-900' : 'text-gray-500'}`}>
                          {meal.name}
                        </div>
                        <div className="text-[11px] text-gray-400 font-semibold mt-0.5 leading-normal">
                          {getMealSubtitle(meal.name)}
                        </div>
                      </div>
                      {(!!existingOrder || (isPending && (!meal.has_options || pendingOrder?.option))) && (
                        <div className="w-8 h-8 rounded-full bg-[#BD4F19] flex items-center justify-center shrink-0">
                          <Check size={15} strokeWidth={3} className="text-white" />
                        </div>
                      )}
                    </div>

                    {/* Option selector */}
                    {isPending && meal.has_options && (
                      <div
                        onClick={e => e.stopPropagation()}
                        className="flex items-center gap-3 px-4 pb-4 pt-1"
                      >
                        <button
                          onClick={() => handleOptionSelect('Viande')}
                          className={`flex-1 py-2.5 rounded-xl text-[13px] font-extrabold border-2 transition-all ${
                            pendingOrder?.option === 'Viande'
                              ? 'bg-[#BD4F19] text-white border-[#BD4F19]'
                              : 'bg-white text-[#BD4F19] border-[#BD4F19]'
                          }`}
                        >
                          Viande
                        </button>
                        <button
                          onClick={() => handleOptionSelect('Poisson')}
                          className={`flex-1 py-2.5 rounded-xl text-[13px] font-extrabold border-2 transition-all ${
                            pendingOrder?.option === 'Poisson'
                              ? 'bg-[#BD4F19] text-white border-[#BD4F19]'
                              : 'bg-white text-gray-500 border-[#E4E3DB]'
                          }`}
                        >
                          Poisson
                        </button>
                      </div>
                    )}
                  </button>
                );
              })}
            </div>

            {/* Validate / Cancel Buttons */}
            <div className="px-5 pb-10 pt-4 bg-white shrink-0 flex flex-col gap-3">
              <button
                onClick={handleValidate}
                disabled={!canValidate()}
                className="w-full py-4 bg-[#BD4F19] hover:bg-[#A64B2A] disabled:bg-[#E4E3DB] disabled:text-gray-400 text-white font-extrabold rounded-2xl text-[15px] flex items-center justify-center gap-2 transition-all shadow-md active:scale-[0.98] cursor-pointer disabled:cursor-not-allowed"
              >
                Valider ma commande →
              </button>
              {getCurrentEmployeeOrder() && !isLocked && (
                <button
                  onClick={handleDeselectOrder}
                  className="w-full py-3 text-[#BD4F19] font-bold text-sm hover:underline"
                >
                  Annuler ma commande
                </button>
              )}
            </div>
          </div>
        </>
      )}
    </div>
  );
}
