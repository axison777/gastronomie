import { useEffect, useState } from 'react';
import { supabase, type Employee, type Meal, type Order, type Settings as Config, type Site, type Department } from './lib/supabase';
import { getEmployeeDeptName, getEmployeeSiteName } from './lib/employeeUtils';
import { Send, Settings, Search, Download, Calendar, Bell, ChevronDown, ChefHat } from 'lucide-react';
import OrderGrid from './components/OrderGrid';
import MobileOrderView from './components/MobileOrderView';
import MobileSummaryView from './components/MobileSummaryView';
import Summary from './components/Summary';
import Countdown from './components/Countdown';
import AdminDashboard from './components/AdminDashboard';
import ExportModal from './components/ExportModal';
import MaintenanceView from './components/MaintenanceView';
import AdminLoginModal from './components/AdminLoginModal';

const IS_MAINTENANCE = false;

const getFormattedDate = () => {
  const options: Intl.DateTimeFormatOptions = { weekday: 'long', day: 'numeric', month: 'long' };
  const dateStr = new Date().toLocaleDateString('fr-FR', options);
  // Capitalize each word for French presentation
  return dateStr.split(' ').map(word => word.charAt(0).toUpperCase() + word.slice(1)).join(' ');
};

const getTodayStr = () => {
  const now = new Date();
  const yyyy = now.getFullYear();
  const mm = String(now.getMonth() + 1).padStart(2, '0');
  const dd = String(now.getDate()).padStart(2, '0');
  return `${yyyy}-${mm}-${dd}`;
};

function App() {
  const [employees, setEmployees] = useState<Employee[]>([]);
  const [meals, setMeals] = useState<Meal[]>([]);
  const [orders, setOrders] = useState<Order[]>([]);
  const [isLocked, setIsLocked] = useState(false);
  const [isAdminOpen, setIsAdminOpen] = useState(false);
  const [isAdminLoginModalOpen, setIsAdminLoginModalOpen] = useState(false);
  const [isExportOpen, setIsExportOpen] = useState(false);
  const [loading, setLoading] = useState(true);
  const [sites, setSites] = useState<Site[]>([]);
  const [departments, setDepartments] = useState<Department[]>([]);
  const [selectedSite, setSelectedSite] = useState<string>('All');
  const [selectedDept, setSelectedDept] = useState<string>('All');
  const [config, setConfig] = useState<Config | null>(null);
  const [searchTerm, setSearchTerm] = useState('');
  const [activeView, setActiveView] = useState<'orders' | 'summary'>('orders');

  useEffect(() => {
    if (IS_MAINTENANCE) {
      setLoading(false);
      return;
    }
    loadData();
    const refreshInterval = setInterval(loadData, 30000); // 30s secondary fallback
    return () => clearInterval(refreshInterval);
  }, []);

  useEffect(() => {
    if (IS_MAINTENANCE) return;
    const check = () => {
      if (!config) return;

      const now = new Date();
      const today = getTodayStr();
      
      if (config.last_publish_date !== today) {
        setIsLocked(true);
        return;
      }

      const [timePart] = config.lock_time.split('|');
      const [lockH, lockM] = timePart.split(':').map(Number);
      const lockDate = new Date();
      lockDate.setHours(lockH, lockM, 0, 0);

      setIsLocked(now >= lockDate);
    };

    check();
    const interval = setInterval(check, 1000); // Tighter check
    return () => clearInterval(interval);
  }, [config]);

  // Realtime Subscriptions
  useEffect(() => {
    if (IS_MAINTENANCE) return;
    const ordersSubscription = supabase
      .channel('public:orders')
      .on(
        'postgres_changes',
        { event: '*', schema: 'public', table: 'orders' },
        (payload) => {
          if (payload.eventType === 'INSERT') {
            const newOrder = payload.new as Order;
            setOrders((current) => {
              if (current.some(o => o.id === newOrder.id)) return current;
              return [...current, newOrder];
            });
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
  }, [config?.last_publish_date]);

  const loadData = async () => {
    try {
      const [employeesRes, mealsRes, ordersRes, configRes, sitesRes, deptsRes] = await Promise.all([
        supabase.from('employees').select('*, site:sites(name), department:departments(name)'),
        supabase.from('meals').select('*').order('name'),
        supabase.from('orders').select('*'),
        supabase.from('settings').select('*').eq('id', 'config').single(),
        supabase.from('sites').select('*').order('name'),
        supabase.from('departments').select('*').order('name')
      ]);

      if (configRes.data) {
        setConfig(configRes.data);
      }
      if (sitesRes.data) setSites(sitesRes.data);
      if (deptsRes.data) setDepartments(deptsRes.data);

      if (employeesRes.data) {
        // Tri par Site, puis par Département, puis par Nom
        const sortedEmployees = [...employeesRes.data].sort((a, b) => {
          const siteA = getEmployeeSiteName(a, '');
          const siteB = getEmployeeSiteName(b, '');
          if (siteA !== siteB) return siteA.localeCompare(siteB);
          
          const deptA = getEmployeeDeptName(a) || '';
          const deptB = getEmployeeDeptName(b) || '';
          if (deptA !== deptB) return deptA.localeCompare(deptB);
          
          const nameA = `${a.first_name} ${a.last_name}`;
          const nameB = `${b.first_name} ${b.last_name}`;
          return nameA.localeCompare(nameB);
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

    const employee = employees.find(e => e.id === employeeId);
    if (employee && !employee.is_active) return;

    const employeeOrders = orders.filter((o) => o.employee_id === employeeId);
    const existingOrder = employeeOrders.find((o) => o.meal_id === mealId);
    const today = new Date().toISOString().split('T')[0];

    try {
      if (existingOrder) {
        await supabase.from('orders').delete().eq('id', existingOrder.id);
        setOrders(orders.filter((o) => o.id !== existingOrder.id));
      } else {
        if (employeeOrders.length > 0) {
          alert("Cet employé a déjà commandé un plat aujourd'hui. Veuillez d'abord décocher son plat actuel avant d'en choisir un nouveau.");
          return;
        }

        const { data } = await supabase
          .from('orders')
          .insert({
            employee_id: employeeId,
            meal_id: mealId,
            order_date: today,
            protein_option: option,
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
    const siteNames = sites.map(s => s.name);
    let fullMessage = '━━━━━━━━ 🍽️ ━━━━━━━━\n';
    fullMessage += '📝 *COMMANDES DE REPAS*\n';
    fullMessage += '━━━━━━━━ 🍽️ ━━━━━━━━\n\n';

    const getMealEmoji = (name: string) => {
      const lower = name.toLowerCase();
      if (lower.includes('poisson') || lower.includes('thon')) return '🐟';
      if (lower.includes('poulet') || lower.includes('yassa')) return '🍗';
      if (lower.includes('viande') || lower.includes('bœuf') || lower.includes('boeuf') || lower.includes('boulette')) return '🥩';
      if (lower.includes('riz')) return '🍚';
      if (lower.includes('attiéké') || lower.includes('attieke')) return '🌾';
      if (lower.includes('benga') || lower.includes('haricot')) return '🫘';
      if (lower.includes('salade')) return '🥗';
      return '🍛';
    };

    const activeMealsList = meals.filter(m => m.is_active);

    siteNames.forEach((siteName) => {
      const siteEmployees = employees.filter(e => getEmployeeSiteName(e) === siteName);
      const siteOrders = orders.filter(o => siteEmployees.some(e => e.id === o.employee_id));

      if (siteOrders.length === 0) return;

      fullMessage += `📍 *${siteName.toUpperCase()}*\n`;
      fullMessage += `──────────────────\n`;
      
      const siteCounts: Record<string, { count: number, emoji: string }> = {};
      activeMealsList.forEach(m => {
        const mOrders = siteOrders.filter(o => o.meal_id === m.id);
        if (mOrders.length === 0) return;

        const emoji = getMealEmoji(m.name);

        if (m.has_options) {
          const vCount = mOrders.filter(o => o.protein_option === 'Viande').length;
          const pCount = mOrders.filter(o => o.protein_option === 'Poisson').length;
          if (vCount > 0) siteCounts[`${m.name} (Viande)`] = { count: vCount, emoji: '🥩' };
          if (pCount > 0) siteCounts[`${m.name} (Poisson)`] = { count: pCount, emoji: '🐟' };
        } else {
          siteCounts[m.name] = { count: mOrders.length, emoji };
        }
      });

      Object.entries(siteCounts).forEach(([name, data]) => {
        fullMessage += `${data.emoji} ${name} : *${data.count}*\n`;
      });
      fullMessage += `\n📊 *Total ${siteName}* : _${siteOrders.length} plats_\n\n`;
    });

    const totalMeals = orders.filter(o => activeMealsList.some(m => m.id === o.meal_id)).length;
    fullMessage += `━━━━━━━━━━━━━━━━━━━━\n`;
    fullMessage += `🔥 *TOTAL GÉNÉRAL : ${totalMeals} PLATS* 🔥\n`;
    fullMessage += `━━━━━━━━━━━━━━━━━━━━`;

    const encodedMessage = encodeURIComponent(fullMessage);
    window.open(`https://wa.me/?text=${encodedMessage}`, '_blank');
  };

  if (IS_MAINTENANCE) {
    return <MaintenanceView />;
  }

  if (loading) {
    return (
      <div className="min-h-screen bg-[#FBF9F1] flex flex-col items-center justify-center font-sans gap-4">
        <div className="relative flex items-center justify-center">
          {/* Decorative pulsing background ring */}
          <div className="absolute w-16 h-16 rounded-full bg-orange-100 animate-ping opacity-75" />
          {/* Icon wrapper */}
          <div className="relative w-14 h-14 rounded-full bg-[#BD4F19] text-white flex items-center justify-center shadow-lg shadow-orange-700/20">
            <ChefHat className="w-7 h-7 animate-bounce duration-1000" />
          </div>
        </div>
        <div className="flex flex-col items-center gap-1.5 text-center">
          <span className="text-[#BD4F19] text-sm font-black uppercase tracking-[0.25em] animate-pulse">
            Chef à l'œuvre
          </span>
          <span className="text-gray-400 text-xs font-semibold">
            Préparation de vos délices quotidiens...
          </span>
        </div>
      </div>
    );
  }

  const isMaintenanceActive = config?.lock_time.includes('|maintenance') || false;

  if (isMaintenanceActive) {
    return (
      <>
        <MaintenanceView onAdminClick={() => setIsAdminOpen(true)} />
        {isAdminOpen && (
          <AdminDashboard
            employees={employees}
            meals={meals}
            orders={orders}
            config={config}
            sites={sites}
            departments={departments}
            onDataUpdate={loadData}
            onClose={() => setIsAdminOpen(false)}
          />
        )}
      </>
    );
  }

  const departmentsForSite = [
    'All',
    ...new Set(
      employees
        .filter(e => e.is_active && (selectedSite === 'All' || getEmployeeSiteName(e) === selectedSite))
        .map(e => getEmployeeDeptName(e))
        .filter(Boolean)
    )
  ].sort();

  const filteredEmployees = employees.filter(e => {
    if (!e.is_active) return false;
    const siteMatches = selectedSite === 'All' || getEmployeeSiteName(e) === selectedSite;
    const deptMatches = selectedDept === 'All' || getEmployeeDeptName(e) === selectedDept;
    const fullName = `${e.first_name} ${e.last_name}`.toLowerCase();
    const nameMatches = fullName.includes(searchTerm.toLowerCase());
    return siteMatches && deptMatches && nameMatches;
  });

  const activeMeals = meals.filter(m => m.is_active);

  if (isAdminOpen) {
    return (
      <AdminDashboard
        employees={employees}
        meals={meals}
        orders={orders}
        config={config}
        sites={sites}
        departments={departments}
        onDataUpdate={loadData}
        onClose={() => setIsAdminOpen(false)}
      />
    );
  }

  return (
    <div className="min-h-screen bg-[#FBF9F1] flex flex-col font-sans">
      {/* ============================================================ */}
      {/* MOBILE LAYOUT — shown only on screens smaller than md (768px) */}
      {/* ============================================================ */}
      <div className="md:hidden">
        {/* Mobile Header */}
        <header className="bg-[#FBF9F1] border-b border-[#E4E3DB] sticky top-0 z-40">
          <div className="px-5 py-3 flex items-center justify-between gap-3">
            <div className="flex items-center gap-2">
              <span className="text-lg font-extrabold text-orange-700 tracking-tight">🍽️ GS</span>
            </div>
            <Countdown isLocked={isLocked} lockTime={config?.lock_time} />
            <div className="flex items-center gap-2">
              <button className="p-2 text-gray-400 relative">
                <Bell size={18} />
                <span className="absolute top-1.5 right-1.5 w-2 h-2 rounded-full bg-orange-700" />
              </button>
              <button
                onClick={() => setIsAdminOpen(true)}
                className="p-2 text-gray-400"
              >
                <Settings size={18} />
              </button>
            </div>
          </div>
        </header>

        {/* Mobile date label */}
        <div className="px-5 py-2 text-xs font-bold text-gray-400 bg-[#F5F4EC] border-b border-[#E4E3DB] flex items-center gap-1.5">
          <Calendar size={12} />
          {getFormattedDate()}
        </div>

        {/* Mobile views switcher */}
        {activeView === 'orders' ? (
          <MobileOrderView
            employees={filteredEmployees}
            meals={activeMeals}
            orders={orders}
            isLocked={isLocked}
            activeView={activeView}
            onViewChange={setActiveView}
            onCellClick={handleCellClick}
            sites={sites}
            departments={departments}
            selectedSite={selectedSite}
            selectedDept={selectedDept}
            onSiteChange={setSelectedSite}
            onDeptChange={setSelectedDept}
          />
        ) : (
          <MobileSummaryView
            meals={activeMeals}
            orders={orders}
            employees={employees}
            sites={sites}
            activeView={activeView}
            onViewChange={setActiveView}
            onExport={() => setIsExportOpen(true)}
            onWhatsApp={sendToWhatsApp}
          />
        )}
      </div>

      {/* ============================================================ */}
      {/* DESKTOP LAYOUT — shown only on md (768px) and above          */}
      {/* ============================================================ */}
      <div className="hidden md:flex flex-col flex-1 pb-24">
        {/* Horizontal Nav Bar */}
        <header className="bg-[#FBF9F1] border-b border-gray-200 sticky top-0 z-40">
        <div className="max-w-7xl mx-auto px-6 py-4 flex items-center justify-between gap-4">
          <div className="flex items-center gap-3">
            <h1 className="text-xl font-extrabold text-orange-700 tracking-tight select-none font-sans">
              Gastronomie Service
            </h1>
            <Countdown isLocked={isLocked} lockTime={config?.lock_time} />
          </div>

          {/* Navigation Tabs */}
          <nav className="flex items-center gap-6">
            <button
              onClick={() => setActiveView('orders')}
              className={`text-sm font-semibold transition-all pb-1 border-b-2 cursor-pointer select-none ${
                activeView === 'orders'
                  ? 'text-orange-700 border-orange-700'
                  : 'text-gray-500 border-transparent hover:text-gray-900'
              }`}
            >
              Commandes
            </button>
            <button
              onClick={() => setActiveView('summary')}
              className={`text-sm font-semibold transition-all pb-1 border-b-2 cursor-pointer select-none ${
                activeView === 'summary'
                  ? 'text-orange-700 border-orange-700'
                  : 'text-gray-500 border-transparent hover:text-gray-900'
              }`}
            >
              Synthèse
            </button>
          </nav>

          {/* Right actions */}
          <div className="flex items-center gap-3">
            {/* Dynamic Date */}
            <div className="hidden sm:inline-flex items-center gap-2 pl-4 border-l border-gray-250 text-sm font-semibold text-gray-700">
              <Calendar size={16} className="text-gray-600" />
              <span>{getFormattedDate()}</span>
            </div>

            {/* Notification bell */}
            <button className="p-2 text-gray-400 hover:text-gray-600 rounded-lg hover:bg-gray-100 transition-colors relative">
              <Bell size={18} />
              <span className="absolute top-1.5 right-1.5 w-2 h-2 rounded-full bg-orange-700" />
            </button>

            {/* Settings / Admin gear */}
            <button
              onClick={() => setIsAdminOpen(true)}
              className="p-2 text-gray-400 hover:text-orange-700 rounded-lg hover:bg-gray-100 transition-colors"
              title="Administration"
            >
              <Settings size={18} />
            </button>
          </div>
        </div>
      </header>

      {/* Main Content Area — desktop only */}
      <main className="max-w-7xl w-full mx-auto px-6 py-8 flex-1 flex flex-col gap-6">
        {/* View Switch */}
        {activeView === 'orders' ? (
          <div className="flex flex-col gap-6">
            {/* Title block with search and filters */}
            <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
              <div>
                <h2 className="text-2xl font-extrabold text-gray-900 tracking-tight">
                  Commande Publique
                </h2>
                <p className="text-sm text-gray-500 font-medium mt-0.5">
                  Sélectionnez vos plats pour le déjeuner d'aujourd'hui.
                </p>
              </div>

              {/* Filters & Search */}
              <div className="flex flex-wrap items-center gap-2">
                <div className="relative">
                  <Search size={16} className="absolute left-3.5 top-1/2 -translate-y-1/2 text-gray-400" />
                  <input 
                    type="text"
                    placeholder="Rechercher mon nom..."
                    value={searchTerm}
                    onChange={(e) => setSearchTerm(e.target.value)}
                    className="pl-10 pr-4 py-2 border border-gray-200 rounded-xl focus:ring-2 focus:ring-orange-500/20 focus:border-orange-500 bg-white outline-none w-56 text-sm text-gray-700 placeholder-gray-400 transition-all shadow-sm"
                  />
                </div>

                {/* Site Dropdown styled with Tailwind */}
                <div className="relative flex items-center bg-white border border-gray-200 rounded-xl shadow-sm">
                  <select
                    value={selectedSite}
                    onChange={(e) => {
                      setSelectedSite(e.target.value as any);
                      setSelectedDept('All');
                    }}
                    className="appearance-none bg-transparent pl-4 pr-10 py-2 text-sm text-gray-700 outline-none cursor-pointer font-medium"
                  >
                    <option value="All">Tous les sites</option>
                    {sites.map(site => (
                      <option key={site.id} value={site.name}>
                        {site.name}
                      </option>
                    ))}
                  </select>
                  <ChevronDown size={14} className="absolute right-3 text-gray-400 pointer-events-none" />
                </div>

                {/* Department Dropdown styled with Tailwind */}
                <div className="relative flex items-center bg-white border border-gray-200 rounded-xl shadow-sm">
                  <select
                    value={selectedDept}
                    onChange={(e) => setSelectedDept(e.target.value)}
                    className="appearance-none bg-transparent pl-4 pr-10 py-2 text-sm text-gray-700 outline-none cursor-pointer font-medium"
                  >
                    {departmentsForSite.map(dept => (
                      <option key={dept} value={dept}>
                        {dept === 'All' ? 'Tous les départements' : dept}
                      </option>
                    ))}
                  </select>
                  <ChevronDown size={14} className="absolute right-3 text-gray-400 pointer-events-none" />
                </div>
              </div>
            </div>

            {/* Grid */}
            <OrderGrid
              employees={filteredEmployees}
              meals={activeMeals}
              orders={orders}
              isLocked={isLocked}
              onCellClick={handleCellClick}
            />
          </div>
        ) : (
          <div className="flex flex-col gap-6">
            <div>
              <h2 className="text-2xl font-extrabold text-gray-900 tracking-tight">
                Synthèse des Commandes
              </h2>
              <p className="text-sm text-gray-500 font-medium mt-0.5">
                Récapitulatif pour la préparation et la livraison
              </p>
            </div>
            <Summary meals={activeMeals} orders={orders} employees={employees} sites={sites} />
          </div>
        )}
      </main>

      {/* Sticky Action Footer */}
      <footer className="bg-white border-t border-gray-200 py-3.5 px-6 fixed bottom-0 left-0 right-0 z-30 shadow-md">
        <div className="max-w-7xl mx-auto flex items-center justify-between">
          <button
            onClick={() => setIsExportOpen(true)}
            className="flex items-center gap-2 bg-white border border-gray-200 hover:border-gray-300 text-gray-700 px-4 py-2.5 rounded-lg text-sm font-semibold transition-all shadow-sm"
          >
            <Download size={16} />
            Exporter (PDF)
          </button>
          <div className="flex items-center gap-4">
            <span className="hidden sm:inline text-sm font-semibold text-gray-500">
              Prêt pour la logistique ?
            </span>
            <button
              onClick={sendToWhatsApp}
              disabled={orders.length === 0}
              className="flex items-center gap-2 bg-orange-700 hover:bg-orange-800 disabled:bg-gray-100 disabled:text-gray-400 disabled:border-gray-200 disabled:shadow-none text-white px-5 py-2.5 rounded-lg text-sm font-bold transition-all shadow-sm"
            >
              <Send size={16} />
              Synthèse WhatsApp
            </button>
          </div>
        </div>
      </footer>

      </div>{/* end desktop div */}

      {/* Modals — shared across mobile & desktop */}
      {isExportOpen && (
        <ExportModal
          employees={employees}
          meals={activeMeals}
          orders={orders}
          sites={sites}
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
