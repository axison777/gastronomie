import { useState } from 'react';
import { BarChart2, FileText, Send, Utensils, ChevronLeft, ChevronRight, CheckCircle2 } from 'lucide-react';
import type { Employee, Meal, Order, Site } from '../lib/supabase';
import { getEmployeeSiteName, getSiteNames } from '../lib/employeeUtils';

interface MobileSummaryViewProps {
  meals: Meal[];
  orders: Order[];
  employees: Employee[];
  sites: Site[];
  activeView: 'orders' | 'summary';
  onViewChange: (view: 'orders' | 'summary') => void;
  onExport: () => void;
  onWhatsApp: () => void;
}

// Delivery times per site (static — can be made configurable later)
const SITE_DELIVERY: Record<string, string> = {
  'Bureau 1': '12h30',
  'Bureau 2': '13h00',
};

export default function MobileSummaryView({
  meals,
  orders,
  employees,
  sites,
  onExport,
  onWhatsApp,
}: MobileSummaryViewProps) {
  const [selectedSiteDetail, setSelectedSiteDetail] = useState<string | null>(null);
  const [selectedDeptFilter, setSelectedDeptFilter] = useState<string>('All');

  const siteNames = getSiteNames(sites, employees);

  const activeMealIds = meals.map(m => m.id);
  const activeOrders = orders.filter(o =>
    activeMealIds.includes(o.meal_id) &&
    employees.some(e => e.id === o.employee_id)
  );
  const total = activeOrders.length;

  return (
    <div className="flex flex-col min-h-screen bg-transparent">
      {/* Scrollable content */}
      <div className="flex-1 overflow-y-auto pb-40 px-5 relative z-10">
        {/* Page Title */}
        <div className="pt-24 pb-5">
          <h2 className="text-2xl font-extrabold text-slate-900 dark:text-white leading-tight tracking-tight">
            Synthèse des Commandes
          </h2>
          <p className="text-[13px] text-slate-500 dark:text-slate-400 font-semibold mt-1 leading-snug">
            Récapitulatif pour la préparation<br />et la livraison.
          </p>
        </div>

        {/* Global Dashboard card */}
        <div className="relative primary-gradient-btn rounded-3xl px-6 py-6 mb-6 overflow-hidden shadow-lg border-none">
          {/* Decorative background icon */}
          <div className="absolute right-4 top-1/2 -translate-y-1/2 opacity-20">
            <BarChart2 size={96} className="text-white" strokeWidth={1} />
          </div>

          <span className="text-[10px] font-extrabold text-white/80 uppercase tracking-[0.2em] block mb-2 relative z-10">
            Global Dashboard
          </span>
          <div className="flex items-baseline gap-3 relative z-10">
            <span className="text-5xl font-black text-white leading-none">{total}</span>
            <span className="text-[13px] font-extrabold text-white/90 uppercase tracking-wider">
              Commandes
            </span>
          </div>
        </div>

        {/* Per-site cards */}
        {total === 0 ? (
          <div className="text-center py-16 text-slate-500">
            <Utensils className="mx-auto mb-3 opacity-50" size={36} />
            <p className="font-semibold text-sm">Aucune commande pour aujourd'hui.</p>
          </div>
        ) : (
          <div className="flex flex-col gap-5">
            {siteNames.map(site => {
              const siteEmployees = employees.filter(e => getEmployeeSiteName(e) === site);
              const siteOrders = activeOrders.filter(o =>
                siteEmployees.some(e => e.id === o.employee_id)
              );
              if (siteOrders.length === 0) return null;

              const deliveryTime = SITE_DELIVERY[site] || '12h30';

              // Build meal breakdown rows
              const mealRows: { label: string; count: number; image_url?: string; name: string }[] = [];
              meals.forEach(meal => {
                const mOrders = siteOrders.filter(o => o.meal_id === meal.id);
                if (mOrders.length === 0) return;

                if (meal.has_options) {
                  const optionsList = meal.options?.length ? meal.options : ['Viande', 'Poisson'];
                  optionsList.forEach(opt => {
                    const count = mOrders.filter(o => o.protein_option === opt).length;
                    if (count > 0) mealRows.push({ label: `${meal.name} (${opt})`, count, image_url: meal.image_url, name: meal.name });
                  });
                } else {
                  mealRows.push({ label: meal.name, count: mOrders.length, image_url: meal.image_url, name: meal.name });
                }
              });

              return (
                <button
                  key={site}
                  onClick={() => {
                    setSelectedSiteDetail(site);
                    setSelectedDeptFilter('All');
                  }}
                  className="w-full glass-panel rounded-3xl px-5 py-5 text-left active:scale-[0.98] transition-all hover:border-orange-500/50"
                >
                  {/* Card Header */}
                  <div className="flex items-start justify-between mb-1">
                    <div>
                      <h3 className="text-[18px] font-extrabold text-slate-900 dark:text-white leading-tight">{site}</h3>
                      <p className="text-[12px] text-slate-500 dark:text-slate-400 font-semibold mt-0.5">
                        Livrables à {deliveryTime}
                      </p>
                    </div>
                    <div className="flex items-center gap-2">
                      <span className="bg-orange-500/20 text-orange-600 dark:text-orange-400 font-extrabold text-[12px] px-3 py-1.5 rounded-full shrink-0 border border-orange-500/30">
                        {siteOrders.length} Plats
                      </span>
                      <div className="w-8 h-8 rounded-full bg-slate-100 dark:bg-white/5 flex items-center justify-center text-slate-400">
                        <ChevronRight size={18} />
                      </div>
                    </div>
                  </div>

                  {/* Divider */}
                  <div className="border-t border-slate-200 dark:border-white/10 mt-3 mb-2" />

                  {/* Meal rows */}
                  <div className="flex flex-col gap-1">
                    {mealRows.map((row, idx) => (
                      <div key={idx} className="flex items-center gap-3 py-2.5">
                        {/* Meal Image */}
                        <img 
                          src={row.image_url || 'https://images.unsplash.com/photo-1504674900247-0877df9cc836?w=150&auto=format&fit=crop&q=80'} 
                          alt={row.name} 
                          className="w-8 h-8 rounded-lg object-cover border border-slate-200 dark:border-white/10 shrink-0" 
                        />
                        <span className="flex-1 text-[14px] font-semibold text-slate-800 dark:text-slate-200">
                          <span className="font-extrabold mr-1 text-slate-900 dark:text-white">{row.count}</span> {row.label}
                        </span>
                      </div>
                    ))}
                  </div>
                </button>
              );
            })}
          </div>
        )}
      </div>

      {/* Fixed bottom action bar (PDF + WhatsApp) */}
      <div className="fixed bottom-0 left-0 right-0 p-5 bg-[#FDFBF7] dark:bg-[#0B0F15] border-t border-slate-200 dark:border-white/10 flex items-center justify-center gap-4 z-30 shadow-[0_-10px_30px_rgba(0,0,0,0.05)]">
        <button
          onClick={onExport}
          className="flex-1 py-3.5 glass-panel border border-slate-200 dark:border-white/20 rounded-xl flex items-center justify-center gap-2 text-slate-700 dark:text-slate-300 hover:text-slate-900 dark:hover:text-white transition-colors font-bold text-sm"
        >
          <FileText size={18} /> Exporter PDF
        </button>
        <button
          onClick={onWhatsApp}
          disabled={total === 0}
          className="flex-1 py-3.5 primary-gradient-btn disabled:opacity-50 disabled:cursor-not-allowed rounded-xl flex items-center justify-center gap-2 transition-colors font-bold text-white text-sm"
        >
          <Send size={18} /> Envoyer WhatsApp
        </button>
      </div>

      {/* Site Detail Overlay */}
      {selectedSiteDetail && (
        <div className="fixed inset-0 z-50 bg-[#FDFBF7] dark:bg-[#0B0F15] flex flex-col animate-in slide-in-from-right-full duration-300 overflow-hidden">
          {/* Header */}
          <div className="px-5 py-4 border-b border-slate-200 dark:border-white/10 bg-white/40 dark:bg-black/20 backdrop-blur-md flex items-center sticky top-0 z-20">
            <button 
              onClick={() => setSelectedSiteDetail(null)} 
              className="w-10 h-10 rounded-full flex items-center justify-center glass-button text-slate-700 dark:text-white mr-3"
            >
              <ChevronLeft size={24} />
            </button>
            <div className="flex-1">
              <h2 className="text-xl font-extrabold text-slate-900 dark:text-white leading-tight">
                {selectedSiteDetail}
              </h2>
              <p className="text-xs text-slate-500 dark:text-slate-400 font-medium mt-0.5">
                Détails des commandes
              </p>
            </div>
          </div>

          <div className="flex-1 overflow-y-auto pb-10">
            {/* Department Filter */}
            <div className="px-5 py-4">
              <label className="block text-sm font-bold text-slate-700 dark:text-slate-300 mb-2">Département</label>
              <select
                value={selectedDeptFilter}
                onChange={e => setSelectedDeptFilter(e.target.value)}
                className="w-full glass-panel rounded-xl px-4 py-3.5 outline-none text-slate-900 dark:text-white font-bold appearance-none focus:ring-2 focus:ring-orange-500/50"
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

            {/* List of employees and their orders */}
            <div className="px-5 flex flex-col gap-3 mt-2">
              {(() => {
                const siteEmployees = employees.filter(e => getEmployeeSiteName(e) === selectedSiteDetail);
                const filteredEmps = selectedDeptFilter === 'All' 
                  ? siteEmployees 
                  : siteEmployees.filter(e => e.department?.name === selectedDeptFilter);
                
                const empsWithOrders = filteredEmps.filter(e => activeOrders.some(o => o.employee_id === e.id));

                if (empsWithOrders.length === 0) {
                  return (
                    <div className="text-center py-10 text-slate-500 font-semibold text-sm">
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
                    <div className="glass-panel rounded-2xl p-4 mb-2 flex flex-col gap-2">
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
                                    <div key={opt} className="flex items-center gap-1.5 bg-orange-50 dark:bg-orange-500/10 border border-orange-200 dark:border-orange-500/20 px-2.5 py-1 rounded-lg">
                                      <span className="font-extrabold text-orange-600 dark:text-orange-400">{optCount}</span>
                                      <span className="text-xs font-semibold text-slate-700 dark:text-slate-300">{s.meal.name} <span className="text-[10px] uppercase ml-0.5 opacity-70 font-bold bg-orange-500/10 px-1 py-0.5 rounded">{opt}</span></span>
                                    </div>
                                  );
                                })}
                              </div>
                            );
                          }
                          return (
                            <div key={s.meal.id} className="flex items-center gap-1.5 bg-orange-50 dark:bg-orange-500/10 border border-orange-200 dark:border-orange-500/20 px-2.5 py-1 rounded-lg">
                              <span className="font-extrabold text-orange-600 dark:text-orange-400">{s.count}</span>
                              <span className="text-xs font-semibold text-slate-700 dark:text-slate-300">{s.meal.name}</span>
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
                        <div key={emp.id} className="glass-panel rounded-2xl p-4 flex flex-col gap-2">
                          <div className="flex items-center justify-between">
                            <span className="font-bold text-slate-900 dark:text-white text-[15px]">{emp.first_name} {emp.last_name}</span>
                            {emp.department?.name && selectedDeptFilter === 'All' && (
                              <span className="text-[10px] px-2 py-0.5 rounded-full bg-slate-100 dark:bg-white/5 border border-slate-200 dark:border-white/10 text-slate-500 dark:text-slate-400 font-medium">
                                {emp.department.name}
                              </span>
                            )}
                          </div>
                          <div className="flex items-center gap-2">
                            <span className="text-orange-600 dark:text-orange-400 font-bold text-sm flex items-center gap-1.5">
                              <CheckCircle2 size={14} />
                              {meal.name}
                            </span>
                            {meal.has_options && empOrder.protein_option && (
                              <span className="text-[9px] font-extrabold px-2 py-0.5 bg-orange-100 dark:bg-orange-500/20 text-orange-700 dark:text-orange-300 rounded-md uppercase tracking-wide border border-orange-200 dark:border-orange-500/20">
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
        </div>
      )}
    </div>
  );
}
