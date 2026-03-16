import { UtensilsCrossed, MapPin } from 'lucide-react';
import type { Meal, Order, Employee } from '../lib/supabase';

interface SummaryProps {
  meals: Meal[];
  orders: Order[];
  employees: Employee[];
}

export default function Summary({ meals, orders, employees }: SummaryProps) {
  const sites = ['Bureau 1', 'Bureau 2'];
  const total = orders.length;

  if (total === 0) return null;

  return (
    <div className="mt-8 space-y-6">
      <div className="flex items-center gap-3 mb-2">
        <UtensilsCrossed className="text-slate-700" size={24} />
        <h2 className="text-xl font-bold text-slate-800">
          Résumé pour la restauratrice
        </h2>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {sites.map(site => {
          const siteEmployees = employees.filter(e => (e.site || 'Bureau 1') === site);
          const siteOrders = orders.filter(o => siteEmployees.some(e => e.id === o.employee_id));
          
          if (siteOrders.length === 0) return null;

          return (
            <div key={site} className="bg-white rounded-2xl p-6 border border-slate-200 shadow-sm">
              <div className="flex items-center gap-2 mb-4 pb-3 border-b border-slate-100">
                <MapPin size={18} className="text-indigo-600" />
                <h3 className="font-black text-slate-800 uppercase tracking-wider">{site}</h3>
                <span className="ml-auto bg-indigo-50 text-indigo-600 px-3 py-1 rounded-full text-sm font-bold">
                  {siteOrders.length} plats
                </span>
              </div>

              <div className="space-y-3">
                {meals.map(meal => {
                  const mOrders = siteOrders.filter(o => o.meal_id === meal.id);
                  if (mOrders.length === 0) return null;

                  return (
                    <div key={meal.id} className="flex flex-col gap-1">
                      <div className="flex justify-between items-center bg-slate-50 p-3 rounded-xl border border-slate-100">
                        <span className="text-slate-700 font-bold text-sm">{meal.name}</span>
                        <span className="text-xl font-black text-indigo-600 leading-none">
                          {mOrders.length}
                        </span>
                      </div>
                      
                      {meal.has_options && (
                        <div className="flex gap-4 px-3 py-1">
                          <div className="flex items-center gap-2">
                            <span className="w-4 h-4 rounded bg-orange-100 text-orange-600 flex items-center justify-center text-[8px] font-black">V</span>
                            <span className="text-xs font-bold text-slate-500">
                              {mOrders.filter(o => o.protein_option === 'Viande').length}
                            </span>
                          </div>
                          <div className="flex items-center gap-2">
                            <span className="w-4 h-4 rounded bg-blue-100 text-blue-600 flex items-center justify-center text-[8px] font-black">P</span>
                            <span className="text-xs font-bold text-slate-500">
                              {mOrders.filter(o => o.protein_option === 'Poisson').length}
                            </span>
                          </div>
                        </div>
                      )}
                    </div>
                  );
                })}
              </div>
            </div>
          );
        })}
      </div>

      <div className="bg-emerald-600 rounded-2xl p-6 text-white shadow-lg shadow-emerald-100 flex justify-between items-center">
        <div>
          <p className="text-emerald-100 text-sm font-bold uppercase tracking-widest">Total Général</p>
          <p className="text-3xl font-black">Toutes les commandes</p>
        </div>
        <span className="text-5xl font-black">{total}</span>
      </div>
    </div>
  );
}
