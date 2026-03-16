import { useState, useEffect } from 'react';
import { createPortal } from 'react-dom';
import { CheckCircle2 } from 'lucide-react';
import type { Employee, Meal, Order } from '../lib/supabase';

interface OrderGridProps {
  employees: Employee[];
  meals: Meal[];
  orders: Order[];
  isLocked: boolean;
  onCellClick: (employeeId: string, mealId: string, option: 'Viande' | 'Poisson' | null) => void;
}

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

  return (
    <div className="relative overflow-x-auto rounded-2xl border-2 border-slate-300 shadow-sm">
      <table className="w-full table-fixed min-w-[800px]">
        <thead>
          <tr className="bg-slate-100/80 backdrop-blur-sm">
            <th className="w-[200px] py-5 px-6 text-left text-sm font-black text-slate-600 uppercase tracking-wider border-b-2 border-slate-300">
              personne
            </th>
            {meals.map((meal) => (
              <th
                key={meal.id}
                className="w-[150px] py-5 px-6 text-center text-sm font-black text-slate-600 uppercase tracking-wider border-b-2 border-slate-300 border-l border-slate-200"
              >
                {meal.name}
              </th>
            ))}
          </tr>
        </thead>
        <tbody className="divide-y divide-slate-300 bg-white">
          {employees.map((employee) => (
            <tr
              key={employee.id}
              className="hover:bg-indigo-50/50 transition-colors group"
            >
              <td className="py-5 px-6 border-r border-slate-200">
                <div className="font-extrabold text-slate-900 truncate">{employee.name}</div>
                <div className="flex gap-2 mt-1.5">
                  <span className="text-[10px] font-black px-2 py-0.5 bg-slate-200 text-slate-600 rounded-md uppercase">
                    {employee.site || 'Site 1'}
                  </span>
                  {employee.department && (
                    <span className="text-[10px] font-black px-2 py-0.5 bg-indigo-100 text-indigo-600 rounded-md uppercase">
                      {employee.department}
                    </span>
                  )}
                </div>
              </td>
              {meals.map((meal) => {
                const order = getSelection(employee.id, meal.id);
                const isSelected = !!order;
                return (
                  <td key={meal.id} className="py-5 px-6 border-l border-slate-100">
                    <div className="flex justify-center items-center">
                      <button
                        onClick={(e) => handleCellClick(e, employee.id, meal)}
                        disabled={isLocked}
                        className={`w-12 h-12 rounded-xl flex items-center justify-center transition-all transform hover:scale-110 active:scale-95 ${
                          isSelected
                            ? 'bg-emerald-500 text-white shadow-lg shadow-emerald-200'
                            : 'bg-slate-100 text-slate-300 hover:bg-slate-200 border border-slate-200'
                        } ${
                          isLocked
                            ? 'cursor-not-allowed opacity-40 grayscale-[0.5]'
                            : 'cursor-pointer'
                        }`}
                      >
                        {isSelected ? (
                          meal.has_options && order.protein_option ? (
                            <span className="text-lg font-black">{order.protein_option[0]}</span>
                          ) : (
                            <CheckCircle2 size={24} strokeWidth={3} />
                          )
                        ) : null}
                      </button>

                      {showOptionMenu?.employeeId === employee.id && showOptionMenu?.mealId === meal.id && 
                        createPortal(
                          <>
                            {/* Backdrop */}
                            <div 
                              className="fixed inset-0 z-[100] bg-slate-900/10 backdrop-blur-[2px]" 
                              onClick={() => setShowOptionMenu(null)}
                            />
                            {/* Modal positioned via fixed coordinates */}
                            <div 
                              className={`fixed z-[101] bg-white rounded-xl shadow-2xl border-2 border-slate-200 py-2 w-36 overflow-hidden animate-in fade-in zoom-in duration-200 ${
                                showOptionMenu.y < 200 ? 'slide-in-from-top-2' : 'slide-in-from-bottom-2'
                              }`}
                              style={{ 
                                left: Math.min(window.innerWidth - 150, Math.max(10, showOptionMenu.x - 72)),
                                top: showOptionMenu.y < 200 
                                  ? showOptionMenu.y + 55 
                                  : showOptionMenu.y - 155
                              }}
                            >
                              <div className="px-3 pb-1 mb-1 border-b border-slate-100 text-[10px] font-black text-slate-400 uppercase">
                                Choisir option
                              </div>
                              <button
                                onClick={() => handleOptionSelect('Viande')}
                                className="w-full px-4 py-3 text-left text-sm font-black text-slate-700 hover:bg-orange-50 hover:text-orange-600 transition-colors flex items-center justify-between"
                              >
                                Viande
                                <span className="w-6 h-6 rounded-lg bg-orange-100 text-orange-600 flex items-center justify-center text-xs">V</span>
                              </button>
                              <button
                                onClick={() => handleOptionSelect('Poisson')}
                                className="w-full px-4 py-3 text-left text-sm font-black text-slate-700 hover:bg-blue-50 hover:text-blue-600 transition-colors flex items-center justify-between border-t border-slate-50"
                              >
                                Poisson
                                <span className="w-6 h-6 rounded-lg bg-blue-100 text-blue-600 flex items-center justify-center text-xs">P</span>
                              </button>
                              <button
                                onClick={() => setShowOptionMenu(null)}
                                className="w-full px-4 py-2 text-center text-[10px] font-black text-slate-400 hover:text-red-500 transition-colors border-t border-slate-50"
                              >
                                ANNULER
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
          ))}
        </tbody>
      </table>
    </div>
  );
}
