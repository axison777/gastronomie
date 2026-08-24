import { useEffect, useState } from 'react';
import { supabase, type Employee, type Meal, type Order, type Settings as Config, type Site, type Department, type Announcement } from './lib/supabase';
import { getEmployeeDeptName, getEmployeeSiteName } from './lib/employeeUtils';
import { Send, Settings, Search, Download, Calendar, Bell, ChevronDown, ChefHat, Sun, Moon, BarChart2, MapPin, Menu, X, Home, List, AlertTriangle } from 'lucide-react';
import DesktopOrderView from './components/DesktopOrderView';
import MobileOrderView from './components/MobileOrderView';
import MobileSummaryView from './components/MobileSummaryView';
import Summary from './components/Summary';
import Countdown from './components/Countdown';
import AdminDashboard from './components/AdminDashboard';
import ExportModal from './components/ExportModal';
import MaintenanceView from './components/MaintenanceView';
import AdminLoginModal from './components/AdminLoginModal';
import ConfirmModal from './components/ConfirmModal';

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
  const [announcements, setAnnouncements] = useState<Announcement[]>([]);
  const [heroBanners, setHeroBanners] = useState<any[]>([]);
  const [isLocked, setIsLocked] = useState(false);
  const [isAdminOpen, setIsAdminOpen] = useState(false);
  const [isAdminLoginModalOpen, setIsAdminLoginModalOpen] = useState(false);
  const [isExportOpen, setIsExportOpen] = useState(false);
  const [errorModal, setErrorModal] = useState<{isOpen: boolean; message: string}>({ isOpen: false, message: '' });
  const [loading, setLoading] = useState(true);
  const [sites, setSites] = useState<Site[]>([]);
  const [departments, setDepartments] = useState<Department[]>([]);
  const [selectedSite, setSelectedSite] = useState<string>('All');
  const [selectedDept, setSelectedDept] = useState<string>('All');
  const [config, setConfig] = useState<Config | null>(null);
  const [searchTerm, setSearchTerm] = useState('');
  const [activeView, setActiveView] = useState<'orders' | 'summary'>('orders');
  const [isDarkMode, setIsDarkMode] = useState(false);
  const [isScrolled, setIsScrolled] = useState(false);
  const [isDrawerOpen, setIsDrawerOpen] = useState(false);
  const [isPopupOpen, setIsPopupOpen] = useState(false);
  const [popupIndex, setPopupIndex] = useState(0);
  const [heroSlideIndex, setHeroSlideIndex] = useState(0);

  // Initialize popup if announcement is active
  useEffect(() => {
    if (announcements.length > 0) {
      setIsPopupOpen(true);
    }
  }, [announcements.length]);

  // Carousel logic
  useEffect(() => {
    if (heroBanners.length <= 1) {
      setHeroSlideIndex(0);
      return;
    }
    const interval = setInterval(() => {
      setHeroSlideIndex(current => (current + 1) % heroBanners.length);
    }, 6000);
    return () => clearInterval(interval);
  }, [heroBanners.length]);

  useEffect(() => {
    const handleScroll = () => {
      setIsScrolled(window.scrollY > 50);
    };
    window.addEventListener('scroll', handleScroll);
    return () => window.removeEventListener('scroll', handleScroll);
  }, []);

  useEffect(() => {
    if (isDarkMode) {
      document.documentElement.classList.add('dark');
    } else {
      document.documentElement.classList.remove('dark');
    }
  }, [isDarkMode]);

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
      const [employeesRes, mealsRes, ordersRes, configRes, sitesRes, deptsRes, announcementsRes, heroBannersRes] = await Promise.all([
        supabase.from('employees').select('*, site:sites(name), department:departments(name)'),
        supabase.from('meals').select('*').order('name'),
        supabase.from('orders').select('*'),
        supabase.from('settings').select('*').eq('id', 'config').single(),
        supabase.from('sites').select('*').order('name'),
        supabase.from('departments').select('*').order('name'),
        supabase.from('announcements').select('*').eq('is_active', true).order('created_at', { ascending: false }),
        supabase.from('hero_banners').select('*').eq('is_active', true).order('created_at', { ascending: false })
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
      if (announcementsRes.data) setAnnouncements(announcementsRes.data);
      if (heroBannersRes.data) setHeroBanners(heroBannersRes.data);
    } catch (error) {
      console.error('Erreur lors du chargement:', error);
    } finally {
      setLoading(false);
    }
  };

  const handleCellClick = async (employeeId: string, mealId: string, option: string | null) => {
    if (isLocked) {
      setErrorModal({
        isOpen: true,
        message: "L'heure limite est dépassée. Les commandes sont clôturées pour aujourd'hui, aucune modification n'est possible."
      });
      return;
    }

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
          setErrorModal({
            isOpen: true,
            message: "Cet employé a déjà commandé un plat aujourd'hui. Veuillez d'abord décocher son plat actuel avant d'en choisir un nouveau."
          });
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
          const optionsList = m.options?.length ? m.options : ['Viande', 'Poisson'];
          optionsList.forEach(opt => {
            const count = mOrders.filter(o => o.protein_option === opt).length;
            if (count > 0) {
              const optEmoji = opt.toLowerCase() === 'viande' ? '🥩' : opt.toLowerCase() === 'poisson' ? '🐟' : '🔸';
              siteCounts[`${m.name} (${opt})`] = { count, emoji: optEmoji };
            }
          });
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
    return <MaintenanceView onAdminClick={() => setIsAdminOpen(true)} />;
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
    <div className="min-h-screen bg-transparent flex flex-col font-sans">
      {/* ============================================================ */}
      {/* MOBILE LAYOUT — shown only on screens smaller than md (768px) */}
      {/* ============================================================ */}
      <div className="md:hidden">
        {/* Mobile Header (Fixed & Dynamic based on scroll) */}
        <header className={`fixed top-0 left-0 right-0 z-50 px-5 flex items-center justify-between transition-all duration-300 ${
          isScrolled || activeView !== 'orders'
            ? 'bg-white/90 dark:bg-[#0B0F15]/90 backdrop-blur-xl border-b border-slate-200 dark:border-white/10 shadow-sm py-3' 
            : 'bg-transparent border-transparent pt-6 pb-2'
        }`}>
          <button 
            onClick={() => setIsDrawerOpen(true)}
            className={`w-11 h-11 rounded-full flex items-center justify-center shadow-sm transition-colors ${
              isScrolled || activeView !== 'orders'
                ? 'bg-slate-100 dark:bg-white/10 text-slate-900 dark:text-white' 
                : 'bg-white/20 backdrop-blur-md border border-white/10 text-white'
            }`}
          >
            <Menu size={20} />
          </button>
          
          <div className="flex-1 flex justify-center pointer-events-none">
            {/* The Countdown replaces Location */}
            {isScrolled || activeView !== 'orders' ? (
              <Countdown isLocked={isLocked} lockTime={config?.lock_time} variant="icon-only" />
            ) : (
              <Countdown isLocked={isLocked} lockTime={config?.lock_time} variant="minimal" />
            )}
          </div>

          <div className="flex gap-2">
            <button 
              onClick={() => setIsDarkMode(!isDarkMode)} 
              className={`w-11 h-11 rounded-full flex items-center justify-center shadow-sm transition-colors ${
                isScrolled || activeView !== 'orders'
                  ? 'bg-slate-100 dark:bg-white/10 text-slate-900 dark:text-white' 
                  : 'bg-white/20 backdrop-blur-md border border-white/10 text-white'
              }`}
            >
              {isDarkMode ? <Sun size={20} /> : <Moon size={20} />}
            </button>
            <button 
              onClick={() => setIsPopupOpen(true)}
              className={`w-11 h-11 rounded-full flex items-center justify-center shadow-sm transition-colors relative ${
                isScrolled || activeView !== 'orders'
                  ? 'bg-slate-100 dark:bg-white/10 text-slate-900 dark:text-white' 
                  : 'bg-white/20 backdrop-blur-md border border-white/10 text-white'
              }`}
            >
              <Bell size={20} />
              {announcements.length > 0 && (
                <span className={`absolute top-2.5 right-2.5 w-2.5 h-2.5 rounded-full ring-2 ${
                  isScrolled || activeView !== 'orders' ? 'ring-[#FDFBF7] dark:ring-[#0B0F15] bg-orange-500' : 'ring-transparent bg-orange-500 shadow-md'
                }`} />
              )}
            </button>
          </div>
        </header>

        {/* Mobile Drawer Menu */}
        {isDrawerOpen && (
          <div className="fixed inset-0 z-[100] flex">
             <div className="absolute inset-0 bg-black/60 backdrop-blur-sm transition-opacity" onClick={() => setIsDrawerOpen(false)} />
             <div className="relative w-[280px] h-full bg-[#FDFBF7] dark:bg-[#0B0F15] flex flex-col animate-in slide-in-from-left-full duration-300 shadow-2xl">
                <div className="p-6 border-b border-slate-200 dark:border-white/10 flex items-center justify-between">
                   <div className="flex items-center gap-2">
                     <span className="text-xl font-extrabold text-orange-500 tracking-tight">🍽️ GS</span>
                   </div>
                   <button onClick={() => setIsDrawerOpen(false)} className="w-8 h-8 rounded-full bg-slate-100 dark:bg-white/5 flex items-center justify-center text-slate-500">
                     <X size={18} />
                   </button>
                </div>
                <div className="flex-1 py-6 px-4 flex flex-col gap-2">
                   <button onClick={() => { setActiveView('orders'); setIsDrawerOpen(false); }} className={`flex items-center gap-3 px-4 py-3.5 rounded-xl font-bold transition-colors ${activeView === 'orders' ? 'bg-orange-50 dark:bg-orange-500/10 text-orange-600 dark:text-orange-400' : 'text-slate-600 dark:text-slate-300 hover:bg-slate-50 dark:hover:bg-white/5'}`}>
                     <Home size={20} /> Accueil
                   </button>
                   <button onClick={() => { setActiveView('summary'); setIsDrawerOpen(false); }} className={`flex items-center gap-3 px-4 py-3.5 rounded-xl font-bold transition-colors ${activeView === 'summary' ? 'bg-orange-50 dark:bg-orange-500/10 text-orange-600 dark:text-orange-400' : 'text-slate-600 dark:text-slate-300 hover:bg-slate-50 dark:hover:bg-white/5'}`}>
                     <List size={20} /> Liste des commandes
                   </button>
                   <div className="h-px w-full bg-slate-200 dark:bg-white/10 my-2" />
                   <button onClick={() => { setIsAdminOpen(true); setIsDrawerOpen(false); }} className={`flex items-center gap-3 px-4 py-3.5 rounded-xl font-bold transition-colors text-slate-600 dark:text-slate-300 hover:bg-slate-50 dark:hover:bg-white/5`}>
                     <Settings size={20} /> Paramètres
                   </button>
                </div>
             </div>
          </div>
        )}

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
            heroBanners={heroBanners}
            heroSlideIndex={heroSlideIndex}
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

        {/* Main View Area */}
      </div>

      {/* ============================================================ */}
      {/* DESKTOP LAYOUT — shown only on md (768px) and above          */}
      {/* ============================================================ */}
      <div className="hidden md:flex flex-col flex-1 pb-24 relative">
        {/* Horizontal Nav Bar (Fixed & Dynamic based on scroll) */}
        <header className={`fixed top-0 left-0 right-0 z-50 transition-all duration-300 ${
          isScrolled 
            ? 'bg-white/90 dark:bg-[#0B0F15]/90 backdrop-blur-xl border-b border-slate-200 dark:border-white/10 shadow-sm' 
            : 'bg-transparent border-transparent'
        }`}>
          <div className="max-w-7xl mx-auto px-6 py-4 flex items-center justify-between gap-4">
             {/* Logo & Countdown */}
             <div className="flex items-center gap-4">
                <h1 className={`text-2xl font-extrabold tracking-tight select-none font-sans transition-colors ${
                  isScrolled ? 'text-orange-500' : 'text-white drop-shadow-md'
                }`}>
                  Gastronomie Service
                </h1>
                <div className={isScrolled ? 'opacity-100' : 'opacity-95'}>
                  <Countdown isLocked={isLocked} lockTime={config?.lock_time} variant={isScrolled ? 'icon-only' : 'minimal'} />
                </div>
             </div>

             {/* Navigation Tabs */}
             <nav className="flex items-center gap-8">
               <button
                 onClick={() => setActiveView('orders')}
                 className={`text-[15px] font-bold transition-all pb-1 border-b-2 cursor-pointer select-none ${
                   activeView === 'orders'
                     ? (isScrolled ? 'text-orange-500 border-orange-500' : 'text-white border-white drop-shadow-md')
                     : (isScrolled ? 'text-slate-500 hover:text-slate-900 dark:text-slate-400 dark:hover:text-white border-transparent' : 'text-white/70 hover:text-white border-transparent drop-shadow-md')
                 }`}
               >
                 Commandes
               </button>
               <button
                 onClick={() => setActiveView('summary')}
                 className={`text-[15px] font-bold transition-all pb-1 border-b-2 cursor-pointer select-none ${
                   activeView === 'summary'
                     ? (isScrolled ? 'text-orange-500 border-orange-500' : 'text-white border-white drop-shadow-md')
                     : (isScrolled ? 'text-slate-500 hover:text-slate-900 dark:text-slate-400 dark:hover:text-white border-transparent' : 'text-white/70 hover:text-white border-transparent drop-shadow-md')
                 }`}
               >
                 Synthèse
               </button>
             </nav>
             
             {/* Right actions */}
             <div className="flex items-center gap-2">
               <div className={`hidden lg:flex items-center gap-2 pr-4 border-r ${
                 isScrolled ? 'border-slate-300 dark:border-white/10 text-slate-700 dark:text-slate-300' : 'border-white/20 text-white/95'
               } text-sm font-semibold`}>
                 <Calendar size={16} />
                 <span>{getFormattedDate()}</span>
               </div>
               
               <button onClick={() => setIsDarkMode(!isDarkMode)} className={`p-2.5 rounded-xl transition-colors ml-2 ${isScrolled ? 'text-slate-500 hover:text-orange-500 hover:bg-slate-100 dark:hover:bg-white/10' : 'text-white/90 hover:text-white hover:bg-white/20'}`}>
                 {isDarkMode ? <Sun size={18} /> : <Moon size={18} />}
               </button>
               
               <button 
                 onClick={() => setIsPopupOpen(true)}
                 className={`p-2.5 rounded-xl transition-colors relative ${isScrolled ? 'text-slate-500 hover:text-slate-900 hover:bg-slate-100 dark:hover:bg-white/10 dark:hover:text-white' : 'text-white/90 hover:text-white hover:bg-white/20'}`}
               >
                 <Bell size={18} />
                 {announcements.length > 0 && (
                   <span className={`absolute top-2 right-2 w-2 h-2 rounded-full bg-orange-500 ring-2 ${isScrolled ? 'ring-white dark:ring-[#0B0F15]' : 'ring-transparent shadow-md'}`} />
                 )}
               </button>

               <button onClick={() => setIsAdminOpen(true)} className={`p-2.5 rounded-xl transition-colors ${isScrolled ? 'text-slate-500 hover:text-orange-500 hover:bg-slate-100 dark:hover:bg-white/10' : 'text-white/90 hover:text-white hover:bg-white/20'}`}>
                 <Settings size={18} />
               </button>
             </div>
          </div>
        </header>

        {/* Desktop Hero Banner */}
        <div className="relative w-full h-[380px] flex-shrink-0 overflow-hidden">
          {(() => {
            if (activeView === 'summary') {
              return (
                <div className="absolute inset-0 w-full h-full">
                  <div className="absolute inset-0 z-0">
                    <img 
                      src="https://images.unsplash.com/photo-1504674900247-0877df9cc836?w=800&auto=format&fit=crop&q=80" 
                      alt="Hero background" 
                      className="w-full h-full object-cover"
                    />
                    <div className="absolute inset-0 bg-gradient-to-b from-black/80 via-black/40 to-[#FBF9F1] dark:to-[#030712]" />
                  </div>
                  <div className="relative z-10 max-w-7xl mx-auto px-6 h-full flex flex-col justify-center pt-16">
                    <h2 className="text-5xl lg:text-6xl font-black text-white leading-tight tracking-tight drop-shadow-lg max-w-2xl">
                      Synthèse des Commandes
                    </h2>
                    <p className="text-white/90 font-medium text-lg mt-4 max-w-xl leading-relaxed drop-shadow-md">
                      Récapitulatif pour la préparation et la livraison
                    </p>
                  </div>
                </div>
              );
            }

            return (
              <div 
                className="flex w-full h-full transition-transform duration-700 ease-in-out"
                style={{ transform: `translateX(-${heroSlideIndex * 100}%)` }}
              >
                {(heroBanners.length > 0 ? heroBanners : [{}]).map((banner: any, idx: number) => {
                  const bgUrl = banner.image_url || "https://images.unsplash.com/photo-1504674900247-0877df9cc836?w=800&auto=format&fit=crop&q=80";
                  const title = banner.title ? (
                    <div dangerouslySetInnerHTML={{ __html: banner.title.replace(/\n/g, '<br/>') }} />
                  ) : <>Découvrez <br/>notre Menu.</>;
                  const subtitle = banner.subtitle || "Des plats savoureux préparés avec soin tous les jours.";

                  return (
                    <div key={idx} className="w-full h-full shrink-0 relative">
                      <div className="absolute inset-0 z-0">
                        <img 
                          src={bgUrl} 
                          alt="Hero background" 
                          className="w-full h-full object-cover"
                        />
                        <div className="absolute inset-0 bg-gradient-to-b from-black/80 via-black/40 to-[#FBF9F1] dark:to-[#030712]" />
                      </div>
                      <div className="relative z-10 max-w-7xl mx-auto px-6 h-full flex flex-col justify-center pt-16">
                        <h2 className="text-5xl lg:text-6xl font-black text-white leading-tight tracking-tight drop-shadow-lg max-w-2xl">
                          {title}
                        </h2>
                        <p className="text-white/90 font-medium text-lg mt-4 max-w-xl leading-relaxed drop-shadow-md">
                          {subtitle}
                        </p>
                      </div>
                    </div>
                  );
                })}
              </div>
            );
          })()}
        </div>

        {/* Main Content Area — desktop only */}
        <main className="max-w-7xl w-full mx-auto px-6 flex-1 flex flex-col gap-6 -mt-12 relative z-20">
          {/* View Switch */}
          {activeView === 'orders' ? (
            <div className="flex flex-col gap-6">
              <DesktopOrderView
                employees={employees}
                meals={activeMeals}
                orders={orders}
                isLocked={isLocked}
                onCellClick={handleCellClick}
                sites={sites}
                departments={departments}
              />
            </div>
        ) : (
          <div className="flex flex-col gap-6">
            <Summary meals={activeMeals} orders={orders} employees={employees} sites={sites} />
          </div>
        )}
      </main>

      {/* Sticky Action Footer */}
      <footer className="bg-white/60 dark:bg-[#0B0F15]/80 backdrop-blur-xl border-t border-slate-200 dark:border-white/10 py-3.5 px-6 fixed bottom-0 left-0 right-0 z-30 shadow-2xl">
        <div className="max-w-7xl mx-auto flex items-center justify-between">
          <button
            onClick={() => setIsExportOpen(true)}
            className="flex items-center gap-2 glass-button text-slate-900 dark:text-white px-4 py-2.5 rounded-lg text-sm font-semibold shadow-sm"
          >
            <Download size={16} />
            Exporter (PDF)
          </button>
          <div className="flex items-center gap-4">
            <span className="hidden sm:inline text-sm font-semibold text-slate-500 dark:text-slate-400">
              Prêt pour la logistique ?
            </span>
            <button
              onClick={sendToWhatsApp}
              disabled={orders.length === 0}
              className="flex items-center gap-2 primary-gradient-btn disabled:from-slate-200 disabled:to-slate-100 dark:disabled:from-white/10 dark:disabled:to-white/5 disabled:text-slate-400 dark:disabled:text-white/40 disabled:border-slate-200 dark:disabled:border-white/10 disabled:shadow-none px-5 py-2.5 rounded-lg text-sm font-bold shadow-sm"
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
        onSuccess={() => {
          setIsAdminLoginModalOpen(false);
          setIsAdminOpen(true);
        }}
      />

      <ConfirmModal
        isOpen={errorModal.isOpen}
        title="Action impossible"
        message={errorModal.message}
        type="alert"
        confirmText="Compris"
        onConfirm={() => setErrorModal({ isOpen: false, message: '' })}
      />

      {isPopupOpen && announcements.length > 0 && announcements[popupIndex] && (
        <div className="fixed inset-0 z-[100] flex items-center justify-center p-4 animate-in fade-in duration-200">
          <div className="fixed inset-0 bg-black/40 backdrop-blur-md" onClick={() => setIsPopupOpen(false)} />
          <div className="relative w-full max-w-md bg-white/80 dark:bg-[#0B0F15]/80 backdrop-blur-xl border border-white/20 dark:border-white/10 rounded-[32px] shadow-[0_8px_30px_rgb(0,0,0,0.12)] overflow-hidden flex flex-col max-h-[90vh] animate-in zoom-in-95 duration-200">
            <button 
              onClick={() => setIsPopupOpen(false)}
              className="absolute top-4 right-4 w-10 h-10 flex items-center justify-center bg-black/20 hover:bg-black/40 text-white rounded-full z-20 transition-colors backdrop-blur-md shadow-sm"
            >
              <X size={18} strokeWidth={2.5} />
            </button>
            {announcements[popupIndex].image_url && (
              <div className="relative w-full h-48 sm:h-56 shrink-0">
                <img 
                  src={announcements[popupIndex].image_url} 
                  alt="Annonce" 
                  className="w-full h-full object-cover"
                />
                <div className="absolute inset-0 bg-gradient-to-t from-white/80 dark:from-[#0B0F15]/80 via-transparent to-transparent" />
              </div>
            )}
            <div className={`p-8 overflow-y-auto ${!announcements[popupIndex].image_url ? 'pt-12' : 'pt-4 -mt-4 relative z-10'}`}>
              {announcements.length > 1 && (
                <div className="flex gap-1 mb-4 justify-center">
                  {announcements.map((_, i) => (
                    <div key={i} className={`h-1.5 rounded-full transition-all ${i === popupIndex ? 'w-6 bg-[#BD4F19]' : 'w-2 bg-gray-200 dark:bg-gray-700'}`} />
                  ))}
                </div>
              )}
              <h3 className="text-2xl font-black text-slate-900 dark:text-white mb-3 tracking-tight">
                {announcements[popupIndex].title || 'Information'}
              </h3>
              <p className="text-slate-600 dark:text-slate-300 text-sm font-medium leading-relaxed whitespace-pre-wrap">
                {announcements[popupIndex].message}
              </p>
              <button 
                onClick={() => {
                  if (popupIndex < announcements.length - 1) {
                    setPopupIndex(prev => prev + 1);
                  } else {
                    setIsPopupOpen(false);
                  }
                }}
                className="w-full mt-6 bg-[#BD4F19] hover:bg-[#A64B2A] text-white py-3 rounded-xl font-bold transition-all shadow-md active:scale-98 flex items-center justify-center gap-2"
              >
                {popupIndex < announcements.length - 1 ? (
                  <>Suivant <span>→</span></>
                ) : (
                  'J\'ai compris'
                )}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}

export default App;
