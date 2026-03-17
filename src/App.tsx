import { useEffect, useState } from 'react';
import { supabase, type Employee, type Meal, type Order, type Settings as Config } from './lib/supabase';
import { Clock, Send, Settings, CheckCircle2, Search, Download } from 'lucide-react';
import OrderGrid from './components/OrderGrid';
import Summary from './components/Summary';
import Countdown from './components/Countdown';
import AdminDashboard from './components/AdminDashboard';
import ExportModal from './components/ExportModal';
import AdminLoginModal from './components/AdminLoginModal';

function App() {
  const [employees, setEmployees] = useState<Employee[]>([]);
  const [meals, setMeals] = useState<Meal[]>([]);
  const [orders, setOrders] = useState<Order[]>([]);
  const [isLocked, setIsLocked] = useState(false);
  const [isAdminOpen, setIsAdminOpen] = useState(false);
  const [isExportOpen, setIsExportOpen] = useState(false);
  const [loading, setLoading] = useState(true);
  const [selectedSite, setSelectedSite] = useState<'All' | 'Bureau 1' | 'Bureau 2'>('All');
  const [selectedDept, setSelectedDept] = useState<string>('All');
  const [config, setConfig] = useState<Config | null>(null);
  const [searchTerm, setSearchTerm] = useState('');
  const [isAdminLoginModalOpen, setIsAdminLoginModalOpen] = useState(false);
  const [isAuthenticated, setIsAuthenticated] = useState(false);

  useEffect(() => {
    loadData();
  }, []);

  useEffect(() => {
    const check = () => {
      if (!config) return;

      const now = new Date();
      const today = now.toISOString().split('T')[0];
      
      if (config.last_publish_date !== today) {
        setIsLocked(true);
        return;
      }

      const [lockH, lockM] = config.lock_time.split(':').map(Number);
      const lockDate = new Date();
      lockDate.setHours(lockH, lockM, 0, 0);

      setIsLocked(now > lockDate);
    };

    check();
    const interval = setInterval(check, 1000 * 30); // Check every 30 seconds
    return () => clearInterval(interval);
  }, [config]);

  // Realtime Subscriptions
  useEffect(() => {
    const ordersSubscription = supabase
      .channel('public:orders')
      .on(
        'postgres_changes',
        { event: '*', schema: 'public', table: 'orders' },
        (payload) => {
          if (payload.eventType === 'INSERT') {
            const newOrder = payload.new as Order;
            const today = new Date().toISOString().split('T')[0];
            if (newOrder.order_date === today) {
              setOrders((current) => {
                if (current.some(o => o.id === newOrder.id)) return current;
                return [...current, newOrder];
              });
            }
          } else if (payload.eventType === 'UPDATE') {
            const updatedOrder = payload.new as Order;
            setOrders((current) =>
              current.map((o) => (o.id === updatedOrder.id ? updatedOrder : o))
            );
          } else if (payload.eventType === 'DELETE') {
            const deletedId = payload.old.id;
            setOrders((current) => current.filter((o) => o.id !== deletedId));
          }
        }
      )
      .subscribe();

    const settingsSubscription = supabase
      .channel('public:settings')
      .on(
        'postgres_changes',
        { event: 'UPDATE', schema: 'public', table: 'settings', filter: 'id=eq.config' },
        (payload) => {
          setConfig(payload.new as Config);
        }
      )
      .subscribe();

    const mealsSubscription = supabase
      .channel('public:meals')
      .on(
        'postgres_changes',
        { event: '*', schema: 'public', table: 'meals' },
        (payload) => {
          if (payload.eventType === 'INSERT') {
            setMeals(current => [...current, payload.new as Meal]);
          } else if (payload.eventType === 'UPDATE') {
            const updated = payload.new as Meal;
            setMeals(current => current.map(m => m.id === updated.id ? updated : m));
          } else if (payload.eventType === 'DELETE') {
            setMeals(current => current.filter(m => m.id !== payload.old.id));
          }
        }
      )
      .subscribe();

    return () => {
      supabase.removeChannel(ordersSubscription);
      supabase.removeChannel(settingsSubscription);
      supabase.removeChannel(mealsSubscription);
    };
  }, []);


  const loadData = async () => {
    try {
      const [employeesRes, mealsRes, ordersRes, configRes] = await Promise.all([
        supabase.from('employees').select('*').order('name'),
        supabase.from('meals').select('*').order('name'),
        supabase
          .from('orders')
          .select('*')
          .eq('order_date', new Date().toISOString().split('T')[0]),
        supabase.from('settings').select('*').eq('id', 'config').single(),
      ]);

      if (configRes.data) {
        setConfig(configRes.data);
      }

      if (employeesRes.data) {
        // Tri par Site, puis par Département, puis par Nom
        const sortedEmployees = [...employeesRes.data].sort((a, b) => {
          const siteA = a.site || 'Bureau 1';
          const siteB = b.site || 'Bureau 1';
          if (siteA !== siteB) return siteA.localeCompare(siteB);
          
          const deptA = a.department || '';
          const deptB = b.department || '';
          if (deptA !== deptB) return deptA.localeCompare(deptB);
          
          return a.name.localeCompare(b.name);
        });
        setEmployees(sortedEmployees);
      }
      if (mealsRes.data) setMeals(mealsRes.data);
      if (ordersRes.data) setOrders(ordersRes.data);
    } catch (error) {
      console.error('Erreur lors du chargement:', error);
    } finally {
      setLoading(false);
    }
  };

  const handleCellClick = async (employeeId: string, mealId: string, option: 'Viande' | 'Poisson' | null) => {
    if (isLocked) return;

    const existingOrder = orders.find((o) => o.employee_id === employeeId && o.meal_id === mealId);

    try {
      if (existingOrder) {
        // Simple toggle off
        await supabase.from('orders').delete().eq('id', existingOrder.id);
        setOrders(orders.filter((o) => o.id !== existingOrder.id));
      } else {
        // Insert new order
        const { data } = await supabase
          .from('orders')
          .insert({
            employee_id: employeeId,
            meal_id: mealId,
            order_date: new Date().toISOString().split('T')[0],
            protein_option: option
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

  const sendToWhatsApp = () => {
    const sites = ['Bureau 1', 'Bureau 2'];
    let fullMessage = '🍽️ *COMMANDES REPAS POUR DEMAIN*\n\n';

    sites.forEach((site) => {
      const siteEmployees = employees.filter(e => (e.site || 'Bureau 1') === site);
      const siteOrders = orders.filter(o => siteEmployees.some(e => e.id === o.employee_id));

      if (siteOrders.length === 0) return;

      fullMessage += `📍 *--- ${site.toUpperCase()} ---*\n`;
      
      const siteCounts: Record<string, number> = {};
      activeMeals.forEach(m => {
        const mOrders = siteOrders.filter(o => o.meal_id === m.id);
        if (mOrders.length === 0) return;

        if (m.has_options) {
          const vCount = mOrders.filter(o => o.protein_option === 'Viande').length;
          const pCount = mOrders.filter(o => o.protein_option === 'Poisson').length;
          if (vCount > 0) siteCounts[`${m.name} (Viande)`] = vCount;
          if (pCount > 0) siteCounts[`${m.name} (Poisson)`] = pCount;
        } else {
          siteCounts[m.name] = mOrders.length;
        }
      });

      Object.entries(siteCounts).forEach(([name, count]) => {
        fullMessage += `• ${name}: *${count}*\n`;
      });
      fullMessage += `\n*Total ${site}: ${siteOrders.length} plats*\n\n`;
    });

    const grandTotal = orders.length;
    fullMessage += `📊 *TOTAL GÉNÉRAL : ${grandTotal} REPAS*`;

    const encodedMessage = encodeURIComponent(fullMessage);
    window.open(`https://wa.me/?text=${encodedMessage}`, '_blank');
  };

  if (loading) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-slate-50 to-slate-100 flex items-center justify-center">
        <div className="text-indigo-600 text-lg animate-pulse font-semibold">Chargement de la gastronomie...</div>
      </div>
    );
  }

  const departmentsForSite = [
    'All',
    ...new Set(
      employees
        .filter(e => selectedSite === 'All' || (e.site || 'Bureau 1') === selectedSite)
        .map(e => e.department)
        .filter(Boolean)
    )
  ].sort();

  const filteredEmployees = employees.filter(e => {
    const siteMatches = selectedSite === 'All' || (e.site || 'Bureau 1') === selectedSite;
    const deptMatches = selectedDept === 'All' || e.department === selectedDept;
    const nameMatches = e.name.toLowerCase().includes(searchTerm.toLowerCase());
    return siteMatches && deptMatches && nameMatches;
  });

  const activeMeals = meals.filter(m => m.is_active);

  return (
    <div className="min-h-screen bg-gradient-to-br from-slate-50 to-slate-100">
      <div className="container mx-auto px-4 py-8 max-w-7xl">
        <div className="bg-white rounded-3xl shadow-2xl p-8 border border-white/20 backdrop-blur-sm">
          <div className="flex flex-col md:flex-row md:items-center justify-between gap-6 mb-8">
            <div className="flex items-center gap-4">
              <div className="bg-indigo-600 p-3 rounded-2xl shadow-indigo-200 shadow-lg">
                <Clock className="text-white" size={32} />
              </div>
              <div>
                <h1 className="text-3xl font-black text-slate-800 tracking-tight">
                  Gastronomie Service
                </h1>
                <p className="text-slate-500 font-medium">
                  {isLocked 
                    ? `Clôture à ${config?.lock_time || '18:00'}`
                    : `Commandes ouvertes jusqu'à ${config?.lock_time || '18:00'}`}
                </p>
              </div>
            </div>
            <div className="flex items-center gap-4">
              <button
                onClick={() => {
                  if (isAuthenticated) {
                    setIsAdminOpen(true);
                  } else {
                    setIsAdminLoginModalOpen(true);
                  }
                }}
                className={`p-3 rounded-2xl transition-all ${isAuthenticated ? 'text-indigo-600 bg-indigo-50' : 'text-slate-400 hover:text-indigo-600 hover:bg-indigo-50'}`}
                title="Administration"
              >
                <Settings size={24} />
              </button>
              <Countdown isLocked={isLocked} lockTime={config?.lock_time} />
            </div>
          </div>

          {!isLocked ? (
            <div className="bg-emerald-50 border-emerald-200 border p-4 mb-6 rounded-2xl flex items-center gap-4">
              <div className="bg-emerald-500 p-2 rounded-xl text-white">
                <CheckCircle2 size={24} />
              </div>
              <div>
                <p className="text-emerald-900 font-bold">Commandes Ouvertes</p>
                <p className="text-emerald-700 text-sm">Les plats pour demain sont disponibles.</p>
              </div>
            </div>
          ) : (
            <div className="bg-slate-50 border-slate-200 border p-4 mb-6 rounded-2xl flex items-center gap-4">
              <div className="bg-slate-400 p-2 rounded-xl text-white">
                <Clock size={24} />
              </div>
              <div>
                <p className="text-slate-700 font-bold">Plateforme Verrouillée</p>
                <p className="text-slate-500 text-sm">
                  {config?.last_publish_date !== new Date().toISOString().split('T')[0]
                    ? "En attente de la publication du menu par la restauratrice." 
                    : "L'heure limite de commande est dépassée."}
                </p>
              </div>
            </div>
          )}

          <div className="space-y-12">
            <div>
              <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 mb-6">
                <h2 className="text-xl font-bold text-slate-800 flex items-center gap-2">
                  <span className="w-1.5 h-6 bg-indigo-600 rounded-full"></span>
                  Tableau des Commandes
                </h2>
                
                <div className="flex flex-wrap items-center gap-3">
                  <div className="relative group">
                    <Search size={18} className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400 group-focus-within:text-indigo-600 transition-colors" />
                    <input 
                      type="text"
                      placeholder="Chercher nom..."
                      value={searchTerm}
                      onChange={(e) => setSearchTerm(e.target.value)}
                      className="pl-9 pr-4 py-2 bg-slate-100 border-none rounded-xl focus:ring-2 focus:ring-indigo-300 focus:bg-white outline-none w-48 text-sm font-medium transition-all"
                    />
                  </div>

                  <div className="flex bg-slate-100 p-1 rounded-xl w-fit">
                    {['All', 'Bureau 1', 'Bureau 2'].map((site) => (
                      <button
                        key={site}
                        onClick={() => {
                          setSelectedSite(site as any);
                          setSelectedDept('All'); // Reset dept when site changes
                        }}
                        className={`px-4 py-1.5 rounded-lg text-sm font-bold transition-all ${
                          selectedSite === site 
                            ? 'bg-white text-indigo-600 shadow-sm' 
                            : 'text-slate-500 hover:text-slate-700'
                        }`}
                      >
                        {site === 'All' ? 'Tous' : site}
                      </button>
                    ))}
                  </div>

                  <select
                    value={selectedDept}
                    onChange={(e) => setSelectedDept(e.target.value)}
                    className="bg-slate-100 border-none rounded-xl px-4 py-2 text-sm font-bold text-slate-700 focus:ring-2 focus:ring-indigo-300 outline-none"
                  >
                    {departmentsForSite.map(dept => (
                      <option key={dept} value={dept}>
                        {dept === 'All' ? 'Tous les départements' : dept}
                      </option>
                    ))}
                  </select>
                </div>
              </div>

              <OrderGrid
                employees={filteredEmployees}
                meals={activeMeals}
                orders={orders}
                isLocked={isLocked}
                onCellClick={handleCellClick}
              />
            </div>

            <Summary meals={activeMeals} orders={orders} employees={employees} />
          </div>

          <div className="mt-8 flex justify-end gap-4">
            <button
              onClick={() => setIsExportOpen(true)}
              className="group flex items-center gap-3 bg-white border-2 border-slate-200 hover:border-indigo-600 hover:text-indigo-600 text-slate-600 px-8 py-4 rounded-2xl font-bold transition-all transform hover:-translate-y-1"
            >
              <Download size={22} />
              Exporter (PDF)
            </button>
            <button
              onClick={sendToWhatsApp}
              disabled={orders.length === 0}
              className="group flex items-center gap-3 bg-indigo-600 hover:bg-indigo-700 disabled:bg-slate-200 disabled:text-slate-400 text-white px-8 py-4 rounded-2xl font-bold transition-all shadow-lg hover:shadow-indigo-200 transform hover:-translate-y-1"
            >
              <Send size={22} />
              Synthèse WhatsApp
            </button>
          </div>
        </div>
      </div>

      {isAdminOpen && (
        <AdminDashboard
          employees={employees}
          meals={meals}
          config={config}
          onDataUpdate={loadData}
          onClose={() => {
            setIsAdminOpen(false);
            setIsAuthenticated(false);
          }}
        />
      )}
      {isExportOpen && (
        <ExportModal
          employees={employees}
          meals={activeMeals}
          orders={orders}
          onClose={() => setIsExportOpen(false)}
        />
      )}

      <AdminLoginModal 
        isOpen={isAdminLoginModalOpen}
        onClose={() => setIsAdminLoginModalOpen(false)}
        correctPassword={config?.admin_password}
        onSuccess={() => {
          setIsAdminLoginModalOpen(false);
          setIsAuthenticated(true);
          setIsAdminOpen(true);
        }}
      />
    </div>
  );
}

export default App;
