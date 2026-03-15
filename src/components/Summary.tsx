import { UtensilsCrossed } from 'lucide-react';
import type { Meal, Order } from '../lib/supabase';

interface SummaryProps {
  meals: Meal[];
  orders: Order[];
}

export default function Summary({ meals, orders }: SummaryProps) {
  const getMealCount = (mealId: string) => {
    return orders.filter((o) => o.meal_id === mealId).length;
  };

  const total = orders.length;

  return (
    <div className="mt-8 bg-gradient-to-r from-slate-50 to-slate-100 rounded-lg p-6 border border-slate-200">
      <div className="flex items-center gap-3 mb-4">
        <UtensilsCrossed className="text-slate-700" size={24} />
        <h2 className="text-xl font-bold text-slate-800">
          Résumé pour la restauratrice
        </h2>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
        {meals.map((meal) => {
          const count = getMealCount(meal.id);
          return (
            <div
              key={meal.id}
              className="bg-white rounded-lg p-4 shadow-sm border border-slate-200 hover:shadow-md transition-shadow"
            >
              <div className="flex justify-between items-center">
                <span className="text-slate-700 font-medium">{meal.name}</span>
                <span
                  className={`text-2xl font-bold ${
                    count > 0 ? 'text-emerald-600' : 'text-slate-400'
                  }`}
                >
                  {count}
                </span>
              </div>
            </div>
          );
        })}
      </div>

      <div className="mt-4 pt-4 border-t border-slate-300">
        <div className="flex justify-between items-center">
          <span className="text-lg font-semibold text-slate-800">
            Total des commandes
          </span>
          <span className="text-3xl font-bold text-emerald-600">{total}</span>
        </div>
      </div>
    </div>
  );
}
