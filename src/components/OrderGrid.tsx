import { CheckCircle2 } from 'lucide-react';
import type { Employee, Meal, Order } from '../lib/supabase';

interface OrderGridProps {
  employees: Employee[];
  meals: Meal[];
  orders: Order[];
  isLocked: boolean;
  onCellClick: (employeeId: string, mealId: string) => void;
}

export default function OrderGrid({
  employees,
  meals,
  orders,
  isLocked,
  onCellClick,
}: OrderGridProps) {
  const isSelected = (employeeId: string, mealId: string) => {
    return orders.some(
      (o) => o.employee_id === employeeId && o.meal_id === mealId
    );
  };

  return (
    <div className="overflow-x-auto rounded-lg border border-slate-200">
      <table className="w-full">
        <thead>
          <tr className="bg-slate-100">
            <th className="py-4 px-6 text-left text-sm font-semibold text-slate-700 border-b border-slate-200">
              Employé
            </th>
            {meals.map((meal) => (
              <th
                key={meal.id}
                className="py-4 px-6 text-center text-sm font-semibold text-slate-700 border-b border-slate-200"
              >
                {meal.name}
              </th>
            ))}
          </tr>
        </thead>
        <tbody>
          {employees.map((employee) => (
            <tr
              key={employee.id}
              className="border-b border-slate-100 hover:bg-slate-50 transition-colors"
            >
              <td className="py-4 px-6 font-medium text-slate-800">
                {employee.name}
              </td>
              {meals.map((meal) => {
                const selected = isSelected(employee.id, meal.id);
                return (
                  <td key={meal.id} className="py-4 px-6 text-center">
                    <button
                      onClick={() => onCellClick(employee.id, meal.id)}
                      disabled={isLocked}
                      className={`w-12 h-12 rounded-lg flex items-center justify-center transition-all transform hover:scale-105 ${
                        selected
                          ? 'bg-emerald-500 hover:bg-emerald-600 shadow-lg'
                          : 'bg-slate-100 hover:bg-slate-200'
                      } ${
                        isLocked
                          ? 'cursor-not-allowed opacity-60'
                          : 'cursor-pointer'
                      }`}
                    >
                      {selected && (
                        <CheckCircle2 className="text-white" size={24} />
                      )}
                    </button>
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
