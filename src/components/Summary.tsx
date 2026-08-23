import { useState } from 'react';
import { Utensils, Fish, Leaf, Beef, ChevronLeft, ChevronRight, CheckCircle2 } from 'lucide-react';
import type { Meal, Order, Employee, Site } from '../lib/supabase';
import { getEmployeeSiteName, getSiteNames } from '../lib/employeeUtils';

interface SummaryProps {
  meals: Meal[];
  orders: Order[];
  employees: Employee[];
  sites: Site[];
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

const getMealIcon = (name: string) => {
  const lower = name.toLowerCase();
  if (lower.includes('yassa') || lower.includes('poulet')) {
    return {
      icon: <Utensils size={16} />,
      bg: 'bg-orange-500/20 text-orange-400 border-orange-500/30'
    };
  }
  if (lower.includes('mafe') || lower.includes('mafé') || lower.includes('boeuf') || lower.includes('bœuf')) {
    return {
      icon: <Beef size={16} />,
      bg: 'bg-amber-500/20 text-amber-400 border-amber-500/30'
    };
  }
  if (lower.includes('poisson') || lower.includes('fish') || lower.includes('mer') || lower.includes('grillé') || lower.includes('grille')) {
    return {
      icon: <Fish size={16} />,
      bg: 'bg-blue-500/20 text-blue-400 border-blue-500/30'
    };
  }
  return {
    icon: <Leaf size={16} />,
    bg: 'bg-emerald-500/20 text-emerald-400 border-emerald-500/30'
  };
};

export default function Summary({ meals, orders, employees, sites }: SummaryProps) {
  const [selectedSiteDetail, setSelectedSiteDetail] = useState<string | null>(null);
  const [selectedDeptFilter, setSelectedDeptFilter] = useState<string>('All');

  const siteNames = getSiteNames(sites, employees);
  
  // Filter orders to only include active meals and active employees
  const activeMealIds = meals.map(m => m.id);
  const activeOrders = orders.filter(o => 
    activeMealIds.includes(o.meal_id) && 
    employees.some(e => e.id === o.employee_id)
  );

  const total = activeOrders.length;

  if (total === 0) {
    return (
      <div className="text-center py-12">
        <Utensils className="mx-auto text-slate-500 mb-3" size={36} />
        <p className="text-slate-400 font-medium text-sm">Aucune commande enregistrée pour aujourd'hui.</p>
      </div>
    );
  }

  return (
    <div className="flex flex-col gap-6 font-sans">
      
      {/* Detail View Mode */}
      {selectedSiteDetail ? (
        <div className="flex flex-col gap-6 animate-in fade-in duration-300">
          <div className="flex items-center gap-4 mb-2">
            <button 
              onClick={() => setSelectedSiteDetail(null)}
              className="w-10 h-10 rounded-full flex items-center justify-center glass-button text-slate-700 dark:text-white"
            >
              <ChevronLeft size={20} />
            </button>
            <div>
              <h2 className="text-2xl font-extrabold text-slate-900 dark:text-white leading-tight">
                {selectedSiteDetail}
              </h2>
              <p className="text-sm text-slate-500 dark:text-slate-400 font-medium mt-0.5">
                Détails des commandes par collaborateurs
              </p>
            </div>
          </div>

          <div className="glass-panel rounded-2xl p-6 flex items-center gap-4">
            <label className="text-sm font-bold text-slate-700 dark:text-slate-300 whitespace-nowrap">Filtrer par Département :</label>
            <select
              value={selectedDeptFilter}
              onChange={e => setSelectedDeptFilter(e.target.value)}
              className="glass-panel rounded-xl px-4 py-2.5 outline-none text-slate-900 dark:text-white font-bold w-full max-w-sm focus:ring-2 focus:ring-orange-500/50 appearance-none"
            >
              <option value="All" className="bg-white dark:bg-[#0B0F15]">Tous les départements</option>
              {Array.from(new Set(
                employees
                  .filter(e => getEmployeeSiteName(e) === selectedSiteDetail && e.department_id)
                  .map(e => e.department?.name)
              )).filter(Boolean).map(dept => (
                <option key={dept as string} value={dept as string} className="bg-white dark:bg-[#0B0F15]">{dept}</option>
              ))}
            </select>
          </div>

            <div className="grid grid-cols-1 lg:grid-cols-2 gap-4 mt-2">
              {(() => {
                const siteEmployees = employees.filter(e => getEmployeeSiteName(e) === selectedSiteDetail);
                const filteredEmps = selectedDeptFilter === 'All' 
                  ? siteEmployees 
                  : siteEmployees.filter(e => e.department?.name === selectedDeptFilter);
                
                const empsWithOrders = filteredEmps.filter(e => activeOrders.some(o => o.employee_id === e.id));

                if (empsWithOrders.length === 0) {
                  return (
                    <div className="col-span-full text-center py-12 text-slate-500 font-semibold">
                      Aucune commande pour ce département.
                    </div>
                  );
                }

                // Calculate summary for this department
                const deptOrders = activeOrders.filter(o => empsWithOrders.some(e => e.id === o.employee_id));
                const deptSummary = meals.map(meal => {
                  const mOrders = deptOrders.filter(o => o.meal_id === meal.id);
                  return { meal, count: mOrders.length, mOrders };
                }).filter(s => s.count > 0);

                return (
                  <>
                    {/* Summary for Department */}
                    <div className="col-span-full glass-panel rounded-2xl p-4 mb-2 flex flex-col gap-2">
                      <span className="text-xs font-bold text-slate-500 dark:text-slate-400 uppercase tracking-wider">Résumé ({selectedDeptFilter}) : {deptOrders.length} plats</span>
                      <div className="flex flex-wrap gap-2 mt-1">
                        {deptSummary.map(s => {
                          if (s.meal.has_options) {
                            const optionsList = s.meal.options?.length ? s.meal.options : ['Viande', 'Poisson'];
                            
                            return (
                              <div key={s.meal.id} className="flex flex-wrap gap-2">
                                {optionsList.map(opt => {
                                  const optCount = s.mOrders.filter(o => o.protein_option === opt).length;
                                  if (optCount === 0) return null;
                                  return (
                                    <div key={opt} className="flex items-center gap-1.5 bg-orange-50 dark:bg-orange-500/10 border border-orange-200 dark:border-orange-500/20 px-3 py-1.5 rounded-lg">
                                      <span className="font-extrabold text-orange-600 dark:text-orange-400">{optCount}</span>
                                      <span className="text-sm font-semibold text-slate-700 dark:text-slate-300">{s.meal.name} <span className="text-[10px] uppercase ml-0.5 opacity-70 font-bold bg-orange-500/10 px-1 py-0.5 rounded">{opt}</span></span>
                                    </div>
                                  );
                                })}
                              </div>
                            );
                          }
                          return (
                            <div key={s.meal.id} className="flex items-center gap-1.5 bg-orange-50 dark:bg-orange-500/10 border border-orange-200 dark:border-orange-500/20 px-3 py-1.5 rounded-lg">
                              <span className="font-extrabold text-orange-600 dark:text-orange-400">{s.count}</span>
                              <span className="text-sm font-semibold text-slate-700 dark:text-slate-300">{s.meal.name}</span>
                            </div>
                          );
                        })}
                      </div>
                    </div>

                    {/* Employee List */}
                    {empsWithOrders.map(emp => {
                      const empOrder = activeOrders.find(o => o.employee_id === emp.id);
                      const meal = meals.find(m => m.id === empOrder?.meal_id);
                      if (!meal || !empOrder) return null;

                      return (
                        <div key={emp.id} className="glass-panel rounded-2xl p-5 flex items-center justify-between gap-4 transition-all hover:border-orange-500/30">
                          <div>
                            <h4 className="font-bold text-slate-900 dark:text-white text-base">{emp.first_name} {emp.last_name}</h4>
                            {emp.department?.name && selectedDeptFilter === 'All' && (
                              <p className="text-xs text-slate-500 dark:text-slate-400 font-medium mt-1">
                                {emp.department.name}
                              </p>
                            )}
                          </div>
                          <div className="text-right flex flex-col items-end gap-1.5">
                            <span className="text-orange-600 dark:text-orange-400 font-bold text-sm flex items-center gap-1.5">
                              <CheckCircle2 size={16} />
                              {meal.name}
                            </span>
                            {meal.has_options && empOrder.protein_option && (
                              <span className="text-[10px] font-extrabold px-2 py-0.5 bg-orange-100 dark:bg-orange-500/20 text-orange-700 dark:text-orange-300 rounded-md uppercase tracking-wide border border-orange-200 dark:border-orange-500/20">
                                {empOrder.protein_option}
                              </span>
                            )}
                          </div>
                        </div>
                      );
                    })}
                  </>
                );
              })()}
            </div>
        </div>
      ) : (
        <>
      {/* Total Général Card */}
      <div className="glass-panel rounded-2xl p-6 flex flex-col md:flex-row md:items-center justify-between gap-6 relative overflow-hidden">
        <div className="absolute top-0 right-0 w-64 h-64 bg-orange-500/5 blur-[80px] pointer-events-none" />
        
        <div className="relative z-10">
          <span className="text-[10px] font-bold text-slate-500 dark:text-slate-400 uppercase tracking-wider block mb-1">TOTAL GÉNÉRAL</span>
          <div className="flex items-baseline gap-1.5">
            <span className="text-4xl font-extrabold text-orange-500 leading-none">{total}</span>
            <span className="text-lg font-bold text-slate-900 dark:text-white">Plats</span>
          </div>
        </div>

        {/* Horizontal list of meal totals */}
        <div className="flex flex-wrap gap-3 items-center md:justify-end relative z-10">
          {meals.map(meal => {
            const mOrders = activeOrders.filter(o => o.meal_id === meal.id);
            const count = mOrders.length;
            if (count === 0) return null;
            
            if (meal.has_options) {
              const optionsList = meal.options?.length ? meal.options : ['Viande', 'Poisson'];
              
              return (
                <div key={meal.id} className="flex flex-wrap gap-2">
                  {optionsList.map(opt => {
                    const optCount = mOrders.filter(o => o.protein_option === opt).length;
                    if (optCount === 0) return null;
                    return (
                      <div key={opt} className="flex items-center gap-2 bg-white/50 dark:bg-white/5 border border-slate-200 dark:border-white/10 pl-2 pr-3.5 py-1.5 rounded-full shadow-sm backdrop-blur-sm">
                        <img 
                          src={meal.image_url || getMealImage(meal.name)} 
                          alt={meal.name} 
                          className="w-6 h-6 rounded-full object-cover border border-slate-200 dark:border-white/10" 
                        />
                        <span className="text-xs font-semibold text-slate-600 dark:text-slate-300">
                          <span className="text-slate-900 dark:text-white font-bold mr-1">{optCount}</span> {meal.name} <span className="text-[10px] uppercase ml-0.5 opacity-70 font-bold bg-slate-200 dark:bg-white/10 px-1.5 py-0.5 rounded-full">{opt}</span>
                        </span>
                      </div>
                    );
                  })}
                </div>
              );
            }

            return (
              <div key={meal.id} className="flex items-center gap-2 bg-white/50 dark:bg-white/5 border border-slate-200 dark:border-white/10 pl-2 pr-3.5 py-1.5 rounded-full shadow-sm backdrop-blur-sm">
                <img 
                  src={meal.image_url || getMealImage(meal.name)} 
                  alt={meal.name} 
                  className="w-6 h-6 rounded-full object-cover border border-slate-200 dark:border-white/10" 
                />
                <span className="text-xs font-semibold text-slate-600 dark:text-slate-300">
                  <span className="text-slate-900 dark:text-white font-bold mr-1">{count}</span> {meal.name}
                </span>
              </div>
            );
          })}
        </div>
      </div>

      {/* Sites Detail Grid */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
        {siteNames.map(site => {
          const siteEmployees = employees.filter(e => getEmployeeSiteName(e) === site);
          const siteOrders = activeOrders.filter(o => siteEmployees.some(e => e.id === o.employee_id));
          
          if (siteOrders.length === 0) return null;

          return (
            <button 
              key={site} 
              onClick={() => {
                setSelectedSiteDetail(site);
                setSelectedDeptFilter('All');
              }}
              className="glass-panel rounded-2xl p-6 flex flex-col justify-between text-left transition-all hover:border-orange-500/50 hover:shadow-lg hover:shadow-orange-500/5 cursor-pointer group"
            >
              <div className="w-full">
                {/* Header */}
                <div className="flex items-center justify-between mb-6 pb-2 border-b border-slate-200 dark:border-white/10 group-hover:border-orange-500/20 transition-colors">
                  <div>
                    <h3 className="text-lg font-bold text-slate-900 dark:text-white leading-tight group-hover:text-orange-500 transition-colors">
                      {site}
                    </h3>
                    <p className="text-xs text-slate-500 dark:text-slate-400 font-medium mt-0.5">
                      {site === 'Bureau 1' ? 'Lieu principal' : 'Site'}
                    </p>
                  </div>
                  <div className="flex items-center gap-3">
                    <span className="bg-orange-500 text-white px-3.5 py-1.5 rounded-lg text-xs font-bold shadow-sm shadow-orange-500/20">
                      {siteOrders.length} plats
                    </span>
                    <div className="w-8 h-8 rounded-full bg-slate-100 dark:bg-white/5 flex items-center justify-center text-slate-400 group-hover:bg-orange-50 dark:group-hover:bg-orange-500/10 group-hover:text-orange-500 transition-colors">
                      <ChevronRight size={18} />
                    </div>
                  </div>
                </div>

                {/* Meals List */}
                <div className="divide-y divide-slate-100 dark:divide-white/5">
                  {meals.map(meal => {
                    const mOrders = siteOrders.filter(o => o.meal_id === meal.id);
                    if (mOrders.length === 0) return null;


                    return (
                      <div key={meal.id} className="py-3.5 flex flex-col gap-1.5">
                        <div className="flex items-center justify-between">
                          <div className="flex items-center gap-3">
                            <img 
                              src={meal.image_url || getMealImage(meal.name)}
                              alt={meal.name}
                              className="w-8 h-8 rounded-lg object-cover shadow-sm border border-slate-200 dark:border-white/10"
                            />
                            <span className="text-sm font-semibold text-slate-700 dark:text-slate-200">{meal.name}</span>
                          </div>
                          <span className="text-lg font-bold text-slate-900 dark:text-white">{mOrders.length}</span>
                        </div>

                        {/* Optional protein breakdown if applicable */}
                        {meal.has_options && (
                          <div className="flex flex-wrap gap-2.5 ml-11">
                            {(meal.options?.length ? meal.options : ['Viande', 'Poisson']).map(opt => {
                              const optCount = mOrders.filter(o => o.protein_option === opt).length;
                              if (optCount === 0) return null;
                              return (
                                <span key={opt} className="text-[10px] font-bold text-orange-400 bg-orange-500/10 border border-orange-500/20 px-1.5 py-0.5 rounded">
                                  {optCount} {opt}
                                </span>
                              );
                            })}
                          </div>
                        )}
                      </div>
                    );
                  })}
                </div>
              </div>
            </button>
          );
        })}
      </div>
      </>
      )}
    </div>
  );
}
