import { useState, useEffect } from 'react';
import { createPortal } from 'react-dom';
import { Check, MoreHorizontal } from 'lucide-react';
import type { Employee, Meal, Order } from '../lib/supabase';
import { getEmployeeDeptName, getEmployeeFullName, getEmployeeSiteName } from '../lib/employeeUtils';

interface OrderGridProps {
  employees: Employee[];
  meals: Meal[];
  orders: Order[];
  isLocked: boolean;
  onCellClick: (employeeId: string, mealId: string, option: 'Viande' | 'Poisson' | null) => void;
}

// Map keywords in meal names to high-quality Unsplash food images
const getMealImage = (name: string) => {
  const lower = name.toLowerCase();
  if (lower.includes('yassa') || lower.includes('poulet')) {
    return 'https://images.unsplash.com/photo-1604908176997-125f25cc6f3d?w=150&auto=format&fit=crop&q=80';
  }
  if (lower.includes('mafe') || lower.includes('mafé') || lower.includes('boeuf') || lower.includes('bœuf')) {
    return 'https://images.unsplash.com/photo-1544025162-d76694265947?w=150&auto=format&fit=crop&q=80';
  }
  if (lower.includes('salade') || lower.includes('veget') || lower.includes('végé') || lower.includes('legume') || lower.includes('légume')) {
    return 'https://images.unsplash.com/photo-1512621776951-a57141f2eefd?w=150&auto=format&fit=crop&q=80';
  }
  if (lower.includes('poisson') || lower.includes('fish') || lower.includes('mer') || lower.includes('grillé') || lower.includes('grille')) {
    return 'https://images.unsplash.com/photo-1473093295043-cdd812d0e601?w=150&auto=format&fit=crop&q=80';
  }
  if (lower.includes('riz') || lower.includes('rice')) {
    return 'https://images.unsplash.com/photo-1574672280242-9b3c267b3186?w=150&auto=format&fit=crop&q=80';
  }
  if (lower.includes('pasta') || lower.includes('spaghetti') || lower.includes('nouille')) {
    return 'https://images.unsplash.com/photo-1563379091339-03b21ab4a4f8?w=150&auto=format&fit=crop&q=80';
  }
  return 'https://images.unsplash.com/photo-1504674900247-0877df9cc836?w=150&auto=format&fit=crop&q=80';
};

// Generate initials from employee name
const getInitials = (name: string) => {
  const parts = name.trim().split(/\s+/);
  if (parts.length >= 2) {
    return `${parts[0][0]}${parts[parts.length - 1][0]}`.toUpperCase();
  }
  return name.slice(0, 2).toUpperCase();
};

// Generate stable pastel avatar colors based on name
const getAvatarColors = (name: string) => {
  const code = name.split('').reduce((acc, char) => acc + char.charCodeAt(0), 0);
  const colorOptions = [
    { bg: 'bg-orange-50 text-orange-700 border-orange-200' },
    { bg: 'bg-blue-50 text-blue-700 border-blue-200' },
    { bg: 'bg-emerald-50 text-emerald-700 border-emerald-200' },
    { bg: 'bg-indigo-50 text-indigo-700 border-indigo-200' },
    { bg: 'bg-rose-50 text-rose-700 border-rose-200' },
    { bg: 'bg-amber-50 text-amber-700 border-amber-200' }
  ];
  return colorOptions[code % colorOptions.length];
};

export default function OrderGrid({
  employees,
  meals,
  orders,
  isLocked,
  onCellClick,
}: OrderGridProps) {
  const [showOptionMenu, setShowOptionMenu] = useState<{ employeeId: string, mealId: string, x: number, y: number } | null>(null);

  // Close menu on scroll to prevent misalignment
  useEffect(() => {
    if (!showOptionMenu) return;
    const handleScroll = () => setShowOptionMenu(null);
    window.addEventListener('scroll', handleScroll, true);
    return () => window.removeEventListener('scroll', handleScroll, true);
  }, [showOptionMenu]);

  const getSelection = (employeeId: string, mealId: string) => {
    return orders.find(
      (o) => o.employee_id === employeeId && o.meal_id === mealId
    );
  };

  const handleCellClick = (e: React.MouseEvent, employeeId: string, meal: Meal) => {
    if (isLocked) return;

    const employee = employees.find(emp => emp.id === employeeId);
    if (!employee?.is_active) return;
    
    const existing = getSelection(employeeId, meal.id);
    if (existing) {
      onCellClick(employeeId, meal.id, null);
      return;
    }

    if (meal.has_options) {
      const rect = (e.currentTarget as HTMLElement).getBoundingClientRect();
      setShowOptionMenu({ 
        employeeId, 
        mealId: meal.id, 
        x: rect.left + rect.width / 2, 
        y: rect.top 
      });
    } else {
      onCellClick(employeeId, meal.id, null);
    }
  };

  const handleOptionSelect = (option: 'Viande' | 'Poisson') => {
    if (showOptionMenu) {
      onCellClick(showOptionMenu.employeeId, showOptionMenu.mealId, option);
      setShowOptionMenu(null);
    }
  };

  // Calculate totals
  const totalEmployees = employees.length;
  const activeMealIds = meals.map(m => m.id);
  const totalOrders = orders.filter(o => 
    activeMealIds.includes(o.meal_id) && 
    employees.some(e => e.id === o.employee_id)
  ).length;

  return (
    <div className="relative overflow-x-auto rounded-xl border border-gray-300 shadow-sm bg-white">
      <table className="w-full table-fixed min-w-[800px]">
        <thead>
          <tr className="bg-gray-50 border-b border-gray-300">
            <th className="w-[220px] py-4 px-6 text-left text-xs font-semibold text-gray-400 uppercase tracking-wider">
              Membres du Personnel
            </th>
            {meals.map((meal) => (
              <th
                key={meal.id}
                className="w-[150px] py-4 px-4 text-center border-l border-gray-200"
              >
                <div className="flex flex-col items-center gap-2">
                  <img
                    src={meal.image_url || getMealImage(meal.name)}
                    alt={meal.name}
                    className="w-10 h-10 rounded-full object-cover shadow-sm border border-gray-100 bg-gray-50"
                  />
                  <span className="text-sm font-semibold text-gray-900 tracking-tight leading-tight block truncate w-full max-w-[130px]" title={meal.name}>
                    {meal.name}
                  </span>
                </div>
              </th>
            ))}
          </tr>
        </thead>
        <tbody className="divide-y divide-gray-200 bg-white">
          {employees.map((employee) => {
            const isEmployeeActive = employee.is_active;

            return (
            <tr
              key={employee.id}
              className={`transition-colors group ${
                isEmployeeActive ? 'hover:bg-gray-50/50' : 'opacity-45 bg-gray-50/80'
              }`}
            >
              <td className="py-3 px-6 pr-2">
                <div className="flex items-center gap-3">
                  {(() => {
                    const fullName = getEmployeeFullName(employee);
                    const siteName = getEmployeeSiteName(employee);
                    const deptName = getEmployeeDeptName(employee);
                    return (
                      <>
                        {/* Initials Avatar */}
                        <div className={`w-8 h-8 rounded-full border flex items-center justify-center text-xs font-bold shrink-0 ${getAvatarColors(fullName).bg}`}>
                          {getInitials(fullName)}
                        </div>
                        <div className="truncate">
                          <div className={`font-semibold truncate ${isEmployeeActive ? 'text-gray-900' : 'text-gray-400 line-through'}`} title={fullName}>
                            {fullName}
                          </div>
                          <div className="flex gap-1.5 mt-0.5">
                            <span className="text-[9px] font-semibold px-1.5 py-0.5 bg-gray-100 text-gray-500 rounded border border-gray-200/50 uppercase tracking-wide">
                              {siteName}
                            </span>
                            {deptName && (
                              <span className="text-[9px] font-semibold px-1.5 py-0.5 bg-gray-100 text-gray-500 rounded border border-gray-200/50 uppercase tracking-wide">
                                {deptName}
                              </span>
                            )}
                          </div>
                        </div>
                      </>
                    );
                  })()}
                </div>
              </td>
              {meals.map((meal) => {
                const order = getSelection(employee.id, meal.id);
                const isSelected = !!order;
                const isMenuOpenForCell = showOptionMenu?.employeeId === employee.id && showOptionMenu?.mealId === meal.id;

                return (
                  <td key={meal.id} className="py-3 px-4 border-l border-gray-200">
                    <div className="flex justify-center items-center">
                      <button
                        onClick={(e) => handleCellClick(e, employee.id, meal)}
                        disabled={isLocked || !isEmployeeActive}
                        className={`w-9 h-9 rounded-full flex items-center justify-center transition-all transform hover:scale-105 active:scale-95 border-2 ${
                          isMenuOpenForCell
                            ? 'bg-orange-50 border-orange-600 text-orange-600 font-bold text-sm'
                            : isSelected
                              ? 'bg-orange-700 border-orange-700 text-white shadow-sm shadow-orange-700/10'
                              : 'bg-white border-gray-300 text-gray-300 hover:bg-orange-50/30 hover:border-orange-400'
                        } ${
                          isLocked || !isEmployeeActive
                            ? 'cursor-not-allowed opacity-40 grayscale-[0.2]'
                            : 'cursor-pointer'
                        }`}
                      >
                        {isMenuOpenForCell ? (
                          <MoreHorizontal className="w-4 h-4" strokeWidth={3} />
                        ) : isSelected ? (
                          meal.has_options && order.protein_option ? (
                            <span className="text-xs font-bold leading-none">{order.protein_option[0]}</span>
                          ) : (
                            <Check className="w-4 h-4 text-white" strokeWidth={3.5} />
                          )
                        ) : null}
                      </button>

                      {isMenuOpenForCell && 
                        createPortal(
                          <>
                            {/* Backdrop */}
                            <div 
                              className="fixed inset-0 z-[100] bg-black/5" 
                              onClick={() => setShowOptionMenu(null)}
                            />
                            {/* Option selection popup */}
                            <div 
                              className={`fixed z-[101] bg-white rounded-lg shadow-lg border border-gray-200 py-1 w-28 overflow-hidden animate-in fade-in zoom-in-95 duration-150 ${
                                showOptionMenu.y < 200 ? 'slide-in-from-top-1' : 'slide-in-from-bottom-1'
                              }`}
                              style={{ 
                                left: Math.min(window.innerWidth - 120, Math.max(10, showOptionMenu.x - 56)),
                                top: showOptionMenu.y < 200 
                                  ? showOptionMenu.y + 42 
                                  : showOptionMenu.y - 88
                              }}
                            >
                              <button
                                onClick={() => handleOptionSelect('Viande')}
                                className="w-full px-3 py-1.5 text-left text-xs font-semibold text-gray-700 hover:bg-orange-50 hover:text-orange-700 transition-colors flex items-center justify-between"
                              >
                                Viande
                                <span className="text-[9px] bg-orange-100 text-orange-700 px-1 rounded font-bold">V</span>
                              </button>
                              <button
                                onClick={() => handleOptionSelect('Poisson')}
                                className="w-full px-3 py-1.5 text-left text-xs font-semibold text-gray-700 hover:bg-orange-50 hover:text-orange-700 transition-colors flex items-center justify-between border-t border-gray-100"
                              >
                                Poisson
                                <span className="text-[9px] bg-blue-100 text-blue-700 px-1 rounded font-bold">P</span>
                              </button>
                            </div>
                          </>,
                          document.body
                        )
                      }
                    </div>
                  </td>
                );
              })}
            </tr>
            );
          })}
        </tbody>
        <tfoot>
          <tr className="bg-gray-50 border-t border-gray-300">
            <td colSpan={meals.length + 1} className="py-3 px-6">
              <div className="flex flex-col sm:flex-row justify-between items-center gap-3 text-xs font-semibold text-gray-500">
                <div>
                  TOTAL COMMANDES: <span className="text-gray-900 font-bold">{totalOrders}/{totalEmployees}</span>
                </div>
                <div className="flex flex-wrap items-center gap-x-4 gap-y-1">
                  {meals.map(meal => {
                    const count = orders.filter(o => 
                      o.meal_id === meal.id && 
                      employees.some(e => e.id === o.employee_id)
                    ).length;
                    if (count === 0) return null;
                    return (
                      <div key={meal.id} className="flex items-center gap-1.5">
                        <span className="w-1.5 h-1.5 rounded-full bg-orange-700" />
                        <span className="text-gray-900 font-bold uppercase text-[10px]">{meal.name}</span>
                        <span className="text-gray-500">({count})</span>
                      </div>
                    );
                  })}
                </div>
              </div>
            </td>
          </tr>
        </tfoot>
      </table>
    </div>
  );
}
