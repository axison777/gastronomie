import { BarChart2, FileText, Send, Utensils } from 'lucide-react';
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
  activeView,
  onViewChange,
  onExport,
  onWhatsApp,
}: MobileSummaryViewProps) {
  const siteNames = getSiteNames(sites, employees);

  const activeMealIds = meals.map(m => m.id);
  const activeOrders = orders.filter(o =>
    activeMealIds.includes(o.meal_id) &&
    employees.some(e => e.id === o.employee_id)
  );
  const total = activeOrders.length;

  return (
    <div className="flex flex-col min-h-screen bg-[#F5F4EC]">
      {/* Scrollable content */}
      <div className="flex-1 overflow-y-auto pb-36 px-5">
        {/* Page Title */}
        <div className="pt-5 pb-5">
          <h2 className="text-2xl font-extrabold text-gray-900 leading-tight tracking-tight">
            Synthèse des Commandes
          </h2>
          <p className="text-[13px] text-gray-500 font-semibold mt-1 leading-snug">
            Récapitulatif pour la préparation<br />et la livraison.
          </p>
        </div>

        {/* Global Dashboard card */}
        <div className="relative bg-[#8B2E0D] rounded-3xl px-6 py-5 mb-6 overflow-hidden shadow-lg">
          {/* Decorative background icon */}
          <div className="absolute right-4 top-1/2 -translate-y-1/2 opacity-20">
            <BarChart2 size={72} className="text-white" strokeWidth={1.5} />
          </div>

          <span className="text-[10px] font-extrabold text-white/60 uppercase tracking-[0.2em] block mb-2">
            Global Dashboard
          </span>
          <div className="flex items-baseline gap-3">
            <span className="text-5xl font-black text-white leading-none">{total}</span>
            <span className="text-[13px] font-extrabold text-white/80 uppercase tracking-wider">
              Commandes Totales
            </span>
          </div>
        </div>

        {/* Per-site cards */}
        {total === 0 ? (
          <div className="text-center py-16 text-gray-400">
            <Utensils className="mx-auto mb-3 text-gray-300" size={36} />
            <p className="font-semibold text-sm">Aucune commande pour aujourd'hui.</p>
          </div>
        ) : (
          <div className="flex flex-col gap-4">
            {siteNames.map(site => {
              const siteEmployees = employees.filter(e => getEmployeeSiteName(e) === site);
              const siteOrders = activeOrders.filter(o =>
                siteEmployees.some(e => e.id === o.employee_id)
              );
              if (siteOrders.length === 0) return null;

              const deliveryTime = SITE_DELIVERY[site] || '12h30';

              // Build meal breakdown rows
              const mealRows: { label: string; count: number }[] = [];
              meals.forEach(meal => {
                const mOrders = siteOrders.filter(o => o.meal_id === meal.id);
                if (mOrders.length === 0) return;

                if (meal.has_options) {
                  const vCount = mOrders.filter(o => o.protein_option === 'Viande').length;
                  const pCount = mOrders.filter(o => o.protein_option === 'Poisson').length;
                  if (vCount > 0) mealRows.push({ label: `${meal.name} (Viande)`, count: vCount });
                  if (pCount > 0) mealRows.push({ label: `${meal.name} (Poisson)`, count: pCount });
                  // Also show total if both options
                  if (vCount > 0 && pCount > 0) {
                    // Already added individually above
                  }
                } else {
                  mealRows.push({ label: meal.name, count: mOrders.length });
                }
              });

              return (
                <div
                  key={site}
                  className="bg-white border border-[#E4E3DB] rounded-3xl px-5 py-5 shadow-sm"
                >
                  {/* Card Header */}
                  <div className="flex items-start justify-between mb-1">
                    <div>
                      <h3 className="text-[18px] font-extrabold text-gray-900 leading-tight">{site}</h3>
                      <p className="text-[12px] text-gray-400 font-semibold mt-0.5">
                        Livrables à {deliveryTime}
                      </p>
                    </div>
                    <span className="bg-[#F5E9D0] text-[#A05C00] font-extrabold text-[12px] px-3 py-1.5 rounded-full shrink-0 ml-3">
                      {siteOrders.length} Plats
                    </span>
                  </div>

                  {/* Divider */}
                  <div className="border-t border-[#F0EFE8] mt-3 mb-2" />

                  {/* Meal rows */}
                  <div className="flex flex-col gap-0.5">
                    {mealRows.map((row, idx) => (
                      <div key={idx} className="flex items-center gap-3 py-2.5">
                        {/* Scissors icon box */}
                        <div className="w-8 h-8 rounded-lg bg-[#F5F4EC] border border-[#E4E3DB] flex items-center justify-center shrink-0">
                          <svg
                            xmlns="http://www.w3.org/2000/svg"
                            className="w-4 h-4 text-gray-400"
                            fill="none"
                            viewBox="0 0 24 24"
                            strokeWidth={2}
                            stroke="currentColor"
                          >
                            <path strokeLinecap="round" strokeLinejoin="round" d="M6 9a3 3 0 100-6 3 3 0 000 6zM6 21a3 3 0 100-6 3 3 0 000 6zM20 4L8.12 15.88M14.47 14.48L20 20M8.12 8.12L12 12" />
                          </svg>
                        </div>
                        <span className="flex-1 text-[14px] font-semibold text-gray-800">
                          {row.count} {row.label}
                        </span>
                      </div>
                    ))}
                  </div>
                </div>
              );
            })}
          </div>
        )}
      </div>

      {/* Floating action buttons (PDF + WhatsApp) */}
      <div className="fixed bottom-[84px] right-5 flex items-center gap-3 z-30">
        <button
          onClick={onExport}
          className="w-12 h-12 bg-white border border-[#E4E3DB] rounded-2xl flex items-center justify-center shadow-md text-gray-600 hover:bg-gray-50 transition-colors"
          title="Exporter PDF"
        >
          <FileText size={20} />
        </button>
        <button
          onClick={onWhatsApp}
          disabled={total === 0}
          className="w-12 h-12 bg-[#BD4F19] hover:bg-[#A64B2A] disabled:bg-gray-200 disabled:text-gray-400 text-white rounded-2xl flex items-center justify-center shadow-md transition-colors"
          title="Envoyer sur WhatsApp"
        >
          <Send size={20} />
        </button>
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
    </div>
  );
}
