import { Utensils, Fish, Leaf, Beef } from 'lucide-react';
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
      bg: 'bg-orange-50 text-orange-700 border-orange-200/50'
    };
  }
  if (lower.includes('mafe') || lower.includes('mafé') || lower.includes('boeuf') || lower.includes('bœuf')) {
    return {
      icon: <Beef size={16} />,
      bg: 'bg-amber-50 text-amber-700 border-amber-200/50'
    };
  }
  if (lower.includes('poisson') || lower.includes('fish') || lower.includes('mer') || lower.includes('grillé') || lower.includes('grille')) {
    return {
      icon: <Fish size={16} />,
      bg: 'bg-blue-50 text-blue-700 border-blue-200/50'
    };
  }
  return {
    icon: <Leaf size={16} />,
    bg: 'bg-emerald-50 text-emerald-700 border-emerald-200/50'
  };
};

export default function Summary({ meals, orders, employees, sites }: SummaryProps) {
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
        <Utensils className="mx-auto text-gray-300 mb-3" size={36} />
        <p className="text-gray-400 font-medium text-sm">Aucune commande enregistrée pour aujourd'hui.</p>
      </div>
    );
  }

  return (
    <div className="flex flex-col gap-6 font-sans">
      {/* Total Général Card */}
      <div className="bg-white rounded-2xl border border-gray-200 shadow-sm p-6 flex flex-col md:flex-row md:items-center justify-between gap-6">
        <div>
          <span className="text-[10px] font-bold text-gray-400 uppercase tracking-wider block mb-1">TOTAL GÉNÉRAL</span>
          <div className="flex items-baseline gap-1.5">
            <span className="text-4xl font-extrabold text-orange-700 leading-none">{total}</span>
            <span className="text-lg font-bold text-gray-900">Plats</span>
          </div>
        </div>

        {/* Horizontal list of meal totals */}
        <div className="flex flex-wrap gap-3 items-center md:justify-end">
          {meals.map(meal => {
            const count = activeOrders.filter(o => o.meal_id === meal.id).length;
            if (count === 0) return null;
            return (
              <div key={meal.id} className="flex items-center gap-2 bg-gray-100/70 border border-gray-200/50 pl-2 pr-3.5 py-1.5 rounded-full shadow-sm">
                <img 
                  src={meal.image_url || getMealImage(meal.name)} 
                  alt={meal.name} 
                  className="w-6 h-6 rounded-full object-cover border border-gray-200 bg-gray-50" 
                />
                <span className="text-xs font-semibold text-gray-800">
                  <span className="text-gray-900 font-bold mr-1">{count}</span> {meal.name}
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
            <div key={site} className="bg-white rounded-2xl p-6 border border-gray-200 shadow-sm flex flex-col justify-between">
              <div>
                {/* Header */}
                <div className="flex items-center justify-between mb-6 pb-2">
                  <div>
                    <h3 className="text-lg font-bold text-gray-900 leading-tight">
                      {site}
                    </h3>
                    <p className="text-xs text-gray-400 font-medium mt-0.5">
                      {site === 'Bureau 1' ? 'Lieu principal' : 'Site'}
                    </p>
                  </div>
                  <span className="bg-orange-700 text-white px-3.5 py-1.5 rounded-lg text-xs font-bold shadow-sm">
                    {siteOrders.length} plats
                  </span>
                </div>

                {/* Meals List */}
                <div className="divide-y divide-gray-100">
                  {meals.map(meal => {
                    const mOrders = siteOrders.filter(o => o.meal_id === meal.id);
                    if (mOrders.length === 0) return null;
                    const iconInfo = getMealIcon(meal.name);

                    return (
                      <div key={meal.id} className="py-3.5 flex flex-col gap-1.5">
                        <div className="flex items-center justify-between">
                          <div className="flex items-center gap-3">
                            <div className={`w-8 h-8 rounded-lg flex items-center justify-center border ${iconInfo.bg}`}>
                              {iconInfo.icon}
                            </div>
                            <span className="text-sm font-semibold text-gray-800">{meal.name}</span>
                          </div>
                          <span className="text-lg font-bold text-gray-955">{mOrders.length}</span>
                        </div>

                        {/* Optional protein breakdown if applicable */}
                        {meal.has_options && (
                          <div className="flex gap-2.5 ml-11">
                            {mOrders.filter(o => o.protein_option === 'Viande').length > 0 && (
                              <span className="text-[10px] font-bold text-orange-700 bg-orange-50 border border-orange-100 px-1.5 py-0.5 rounded">
                                {mOrders.filter(o => o.protein_option === 'Viande').length} Viande
                              </span>
                            )}
                            {mOrders.filter(o => o.protein_option === 'Poisson').length > 0 && (
                              <span className="text-[10px] font-bold text-blue-700 bg-blue-50 border border-blue-100 px-1.5 py-0.5 rounded">
                                {mOrders.filter(o => o.protein_option === 'Poisson').length} Poisson
                              </span>
                            )}
                          </div>
                        )}
                      </div>
                    );
                  })}
                </div>
              </div>
            </div>
          );
        })}
      </div>
    </div>
  );
}
