import { useEffect, useState } from 'react';
import { supabase, type Employee, type Meal, type Order } from './lib/supabase';
import { Clock, Send } from 'lucide-react';
import OrderGrid from './components/OrderGrid';
import Summary from './components/Summary';
import Countdown from './components/Countdown';

function App() {
  const [employees, setEmployees] = useState<Employee[]>([]);
  const [meals, setMeals] = useState<Meal[]>([]);
  const [orders, setOrders] = useState<Order[]>([]);
  const [isLocked, setIsLocked] = useState(false);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    loadData();
    checkLockStatus();
    const interval = setInterval(checkLockStatus, 1000);
    return () => clearInterval(interval);
  }, []);

  const checkLockStatus = () => {
    const now = new Date();
    const hours = now.getHours();
    setIsLocked(hours >= 18);
  };

  const loadData = async () => {
    try {
      const [employeesRes, mealsRes, ordersRes] = await Promise.all([
        supabase.from('employees').select('*').order('name'),
        supabase.from('meals').select('*').order('name'),
        supabase
          .from('orders')
          .select('*')
          .eq('order_date', new Date().toISOString().split('T')[0]),
      ]);

      if (employeesRes.data) setEmployees(employeesRes.data);
      if (mealsRes.data) setMeals(mealsRes.data);
      if (ordersRes.data) setOrders(ordersRes.data);
    } catch (error) {
      console.error('Erreur lors du chargement:', error);
    } finally {
      setLoading(false);
    }
  };

  const handleCellClick = async (employeeId: string, mealId: string) => {
    if (isLocked) return;

    const existingOrder = orders.find((o) => o.employee_id === employeeId);

    try {
      if (existingOrder && existingOrder.meal_id === mealId) {
        await supabase.from('orders').delete().eq('id', existingOrder.id);
        setOrders(orders.filter((o) => o.id !== existingOrder.id));
      } else if (existingOrder) {
        const { data } = await supabase
          .from('orders')
          .update({ meal_id: mealId })
          .eq('id', existingOrder.id)
          .select()
          .single();
        if (data) {
          setOrders(orders.map((o) => (o.id === existingOrder.id ? data : o)));
        }
      } else {
        const { data } = await supabase
          .from('orders')
          .insert({
            employee_id: employeeId,
            meal_id: mealId,
            order_date: new Date().toISOString().split('T')[0],
          })
          .select()
          .single();
        if (data) {
          setOrders([...orders, data]);
        }
      }
    } catch (error) {
      console.error('Erreur lors de la mise à jour:', error);
    }
  };

  const getMealCounts = () => {
    const counts: Record<string, number> = {};
    meals.forEach((meal) => {
      counts[meal.name] = orders.filter((o) => o.meal_id === meal.id).length;
    });
    return counts;
  };

  const sendToWhatsApp = () => {
    const counts = getMealCounts();
    let message = '🍽️ *Commande repas pour demain*\n\n';

    Object.entries(counts).forEach(([mealName, count]) => {
      if (count > 0) {
        message += `• ${mealName}: ${count}\n`;
      }
    });

    const total = Object.values(counts).reduce((sum, count) => sum + count, 0);
    message += `\n*Total: ${total} repas*`;

    const encodedMessage = encodeURIComponent(message);
    window.open(`https://wa.me/?text=${encodedMessage}`, '_blank');
  };

  if (loading) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-slate-50 to-slate-100 flex items-center justify-center">
        <div className="text-slate-600 text-lg">Chargement...</div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gradient-to-br from-slate-50 to-slate-100">
      <div className="container mx-auto px-4 py-8 max-w-7xl">
        <div className="bg-white rounded-2xl shadow-xl p-8">
          <div className="flex items-center justify-between mb-8">
            <div>
              <h1 className="text-3xl font-bold text-slate-800 mb-2">
                Commandes de Repas
              </h1>
              <p className="text-slate-600">
                Sélectionnez un plat par employé pour demain
              </p>
            </div>
            <Countdown isLocked={isLocked} />
          </div>

          {isLocked && (
            <div className="bg-amber-50 border-l-4 border-amber-500 p-4 mb-6 rounded-lg">
              <div className="flex items-center">
                <Clock className="text-amber-600 mr-3" size={24} />
                <div>
                  <p className="text-amber-800 font-semibold">
                    Commandes clôturées pour demain
                  </p>
                  <p className="text-amber-700 text-sm">
                    Les commandes seront réouvertes demain matin
                  </p>
                </div>
              </div>
            </div>
          )}

          <OrderGrid
            employees={employees}
            meals={meals}
            orders={orders}
            isLocked={isLocked}
            onCellClick={handleCellClick}
          />

          <Summary meals={meals} orders={orders} />

          <div className="mt-6 flex justify-end">
            <button
              onClick={sendToWhatsApp}
              disabled={orders.length === 0}
              className="flex items-center gap-2 bg-green-600 hover:bg-green-700 disabled:bg-slate-300 disabled:cursor-not-allowed text-white px-6 py-3 rounded-lg font-semibold transition-all shadow-lg hover:shadow-xl transform hover:-translate-y-0.5"
            >
              <Send size={20} />
              Envoyer la commande sur WhatsApp
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}

export default App;
