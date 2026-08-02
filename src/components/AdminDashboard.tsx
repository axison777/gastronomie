import { useState, useEffect } from 'react';
import { supabase, type Employee, type Meal, type Order, type Settings as Config, type Site, type Department } from '../lib/supabase';
import { 
  Trash2, Users, Utensils, Save, X, LayoutDashboard, 
  Settings as SettingsIcon, Clock, Plus, Search, Send,
  Lock, Mail, Eye, EyeOff, ExternalLink, Calendar, 
  TrendingUp, FileText, Building2, ChevronRight, BarChart2, LogOut,
  MapPin, Home, Folder, ShieldCheck, MessageSquare
} from 'lucide-react';
import ConfirmModal from './ConfirmModal';
import HistoryReportModal from './HistoryReportModal';
import { getEmployeeDeptName, getEmployeeFullName, getEmployeeSiteName } from '../lib/employeeUtils';

interface AdminDashboardProps {
  employees: Employee[];
  meals: Meal[];
  orders: Order[];
  config: Config | null;
  sites: Site[];
  departments: Department[];
  onDataUpdate: () => void;
  onClose: () => void;
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

const getMealCategory = (name: string) => {
  const lower = name.toLowerCase();
  if (lower.includes('salade') || lower.includes('veget') || lower.includes('végé') || lower.includes('quinoa') || lower.includes('benga')) {
    return { label: 'Végétarien', color: 'bg-emerald-500', textClass: 'text-emerald-700 bg-emerald-50 border-emerald-100' };
  }
  if (lower.includes('poisson') || lower.includes('fish') || lower.includes('mer') || lower.includes('grillé') || lower.includes('grille')) {
    return { label: 'Poisson', color: 'bg-blue-500', textClass: 'text-blue-700 bg-blue-50 border-blue-100' };
  }
  return { label: 'Viande', color: 'bg-orange-500', textClass: 'text-orange-700 bg-orange-50 border-orange-100' };
};

const getFormattedDate = () => {
  const options: Intl.DateTimeFormatOptions = { weekday: 'long', day: 'numeric', month: 'long', year: 'numeric' };
  const dateStr = new Date().toLocaleDateString('fr-FR', options);
  return dateStr.split(' ').map(word => word.charAt(0).toUpperCase() + word.slice(1)).join(' ');
};

const getDeptColor = (deptName: string) => {
  const lower = deptName.toLowerCase();
  if (lower.includes('rh') || lower.includes('ressources') || lower.includes('humain')) {
    return { label: 'RH', color: 'bg-[#FDB249]', textClass: 'text-emerald-700 bg-emerald-50 border-emerald-100' };
  }
  if (lower.includes('logis') || lower.includes('opéra') || lower.includes('tech') || lower.includes('info')) {
    return { label: 'Tech', color: 'bg-[#517664]', textClass: 'text-blue-700 bg-blue-50 border-blue-100' };
  }
  if (lower.includes('direct') || lower.includes('géné') || lower.includes('admin')) {
    return { label: 'Admin', color: 'bg-[#BD4F19]', textClass: 'text-orange-700 bg-orange-50 border-orange-100' };
  }
  return { label: 'Autre', color: 'bg-[#5B88A5]', textClass: 'text-gray-700 bg-gray-100 border-gray-200' };
};

const getDeptBadgeStyle = (deptName?: string) => {
  if (!deptName) return 'bg-gray-250/70 text-gray-650';
  const lower = deptName.toLowerCase();
  if (lower.includes('rh') || lower.includes('ressources') || lower.includes('humain')) {
    return 'bg-[#F2EFE9] text-[#7A756B]';
  }
  if (lower.includes('serv')) {
    return 'bg-[#FCE4D6] text-[#C65911]';
  }
  if (lower.includes('culin') || lower.includes('cuis')) {
    return 'bg-[#E2F0D9] text-[#385723]';
  }
  return 'bg-gray-250/70 text-gray-650';
};

export default function AdminDashboard({ employees, meals, orders, config, sites, departments, onDataUpdate, onClose }: AdminDashboardProps) {
  // Authentication states
  const [session, setSession] = useState<any>(null);
  const [isLocallyAuthenticated, setIsLocallyAuthenticated] = useState(() => {
    return localStorage.getItem('admin_authenticated') === 'true';
  });
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [showPassword, setShowPassword] = useState(false);
  const [loginError, setLoginError] = useState('');
  const [isLoggingIn, setIsLoggingIn] = useState(false);

  // Tab & UI states
  const [activeTab, setActiveTab] = useState<'dashboard' | 'meals' | 'sites' | 'employees' | 'settings' | 'journal'>('dashboard');
  const [selectedSite, setSelectedSite] = useState<string>(sites[0]?.id ?? '');

  useEffect(() => {
    if (sites.length > 0 && !sites.some(s => s.id === selectedSite)) {
      setSelectedSite(sites[0].id);
    }
  }, [sites, selectedSite]);

  // Order History states
  const [orderHistory, setOrderHistory] = useState<any[]>([]);
  const [isLoadingHistory, setIsLoadingHistory] = useState(false);
  const [selectedHistoryItem, setSelectedHistoryItem] = useState<any | null>(null);
  const [isReportModalOpen, setIsReportModalOpen] = useState(false);

  const fetchOrderHistory = async () => {
    setIsLoadingHistory(true);
    try {
      const { data, error } = await supabase
        .from('order_history')
        .select('*')
        .order('publish_date', { ascending: false });
      if (error) throw error;
      setOrderHistory(data || []);
      
      if (data && data.length > 0 && !selectedHistoryItem) {
        setSelectedHistoryItem(data[0]);
      }
    } catch (e) {
      console.error('Error fetching order history:', e);
    } finally {
      setIsLoadingHistory(false);
    }
  };

  useEffect(() => {
    if (activeTab === 'journal' || activeTab === 'dashboard') {
      fetchOrderHistory();
    }
  }, [activeTab]);

  // Site/Dept Creation modal states
  const [isCreateModalOpen, setIsCreateModalOpen] = useState(false);
  const [createModalMode, setCreateModalMode] = useState<'create' | 'edit'>('create');
  const [createModalActiveTab, setCreateModalActiveTab] = useState<'site' | 'department'>('site');
  const [editingSiteId, setEditingSiteId] = useState<string | null>(null);
  const [editingDeptId, setEditingDeptId] = useState<string | null>(null);
  const [newSiteName, setNewSiteName] = useState('');
  const [newSiteAddress, setNewSiteAddress] = useState('');
  const [newDeptName, setNewDeptName] = useState('');
  const [newDeptSiteId, setNewDeptSiteId] = useState(sites.length > 0 ? sites[0].id : '');

  const closeCreateModal = () => {
    setIsCreateModalOpen(false);
    setCreateModalMode('create');
    setEditingSiteId(null);
    setEditingDeptId(null);
    setNewSiteName('');
    setNewSiteAddress('');
    setNewDeptName('');
  };

  const openCreateSiteModal = () => {
    setCreateModalMode('create');
    setEditingSiteId(null);
    setEditingDeptId(null);
    setCreateModalActiveTab('site');
    setNewSiteName('');
    setNewSiteAddress('');
    setIsCreateModalOpen(true);
  };

  const openEditSiteModal = (site: Site) => {
    setCreateModalMode('edit');
    setEditingSiteId(site.id);
    setEditingDeptId(null);
    setCreateModalActiveTab('site');
    setNewSiteName(site.name);
    setNewSiteAddress(site.address || '');
    setIsCreateModalOpen(true);
  };

  const openCreateDepartmentModal = (siteId: string) => {
    setCreateModalMode('create');
    setEditingSiteId(null);
    setEditingDeptId(null);
    setCreateModalActiveTab('department');
    setNewDeptName('');
    setNewDeptSiteId(siteId);
    setIsCreateModalOpen(true);
  };

  const openEditDepartmentModal = (dept: Department) => {
    setCreateModalMode('edit');
    setEditingSiteId(null);
    setEditingDeptId(dept.id);
    setCreateModalActiveTab('department');
    setNewDeptName(dept.name);
    setNewDeptSiteId(dept.site_id);
    setIsCreateModalOpen(true);
  };

  const handleCreateConfirm = async () => {
    try {
      if (createModalActiveTab === 'site') {
        if (!newSiteName.trim()) return;
        if (createModalMode === 'edit' && editingSiteId) {
          const { error } = await supabase.from('sites').update({
            name: newSiteName.trim(),
            address: newSiteAddress.trim() || 'Adresse non configurée',
          }).eq('id', editingSiteId);
          if (error) throw error;
        } else {
          const { error } = await supabase.from('sites').insert({
            name: newSiteName.trim(),
            address: newSiteAddress.trim() || 'Adresse non configurée',
          });
          if (error) throw error;
        }
      } else {
        if (!newDeptName.trim() || !newDeptSiteId) return;
        if (createModalMode === 'edit' && editingDeptId) {
          const { error } = await supabase.from('departments').update({
            name: newDeptName.trim(),
            site_id: newDeptSiteId,
          }).eq('id', editingDeptId);
          if (error) throw error;

          // Transférer également tous les collaborateurs du département (et donc leurs commandes) vers le nouveau site
          const { error: empError } = await supabase.from('employees').update({
            site_id: newDeptSiteId,
          }).eq('department_id', editingDeptId);
          if (empError) throw empError;
        } else {
          const { error } = await supabase.from('departments').insert({
            name: newDeptName.trim(),
            site_id: newDeptSiteId,
          });
          if (error) throw error;
        }
      }
      closeCreateModal();
      onDataUpdate();
      setModalConfig({
        isOpen: true,
        title: createModalMode === 'edit' ? 'Modification réussie ✓' : 'Création réussie ✓',
        message: 'L\'élément a été enregistré avec succès.',
        type: 'alert',
        confirmText: 'Parfait',
        onConfirm: () => setModalConfig(prev => ({ ...prev, isOpen: false })),
      });
    } catch (e: any) {
      console.error(e);
      setModalConfig({
        isOpen: true,
        title: 'Erreur',
        message: e.message,
        type: 'danger',
        confirmText: 'Compris',
        onConfirm: () => setModalConfig(prev => ({ ...prev, isOpen: false })),
      });
    }
  };

  const handleDeleteSite = (site: Site) => {
    const linkedEmployees = employees.filter(e => e.site_id === site.id).length;
    const linkedDepartments = departments.filter(d => d.site_id === site.id).length;

    setModalConfig({
      isOpen: true,
      title: 'Supprimer ce site ?',
      message: (
        <span>
          Le site <strong className="text-[#BD4F19] font-extrabold">{site.name}</strong> sera supprimé
          {linkedDepartments > 0 && <> avec <strong>{linkedDepartments}</strong> département{linkedDepartments > 1 ? 's' : ''}</>}.
          {linkedEmployees > 0 && (
            <> <strong>{linkedEmployees}</strong> collaborateur{linkedEmployees > 1 ? 's' : ''} n&apos;aur{linkedEmployees > 1 ? 'ont' : 'a'} plus de site assigné.</>
          )}
        </span>
      ),
      type: 'danger',
      confirmText: 'Oui, supprimer',
      onConfirm: async () => {
        try {
          const { error } = await supabase.from('sites').delete().eq('id', site.id);
          if (error) throw error;
          if (selectedSite === site.id) {
            setSelectedSite(sites.find(s => s.id !== site.id)?.id ?? '');
          }
          closeCreateModal();
          onDataUpdate();
          setModalConfig(prev => ({ ...prev, isOpen: false }));
        } catch (e: any) {
          console.error(e);
          setModalConfig({
            isOpen: true,
            title: 'Suppression impossible',
            message: e.message,
            type: 'danger',
            confirmText: 'Compris',
            onConfirm: () => setModalConfig(prev => ({ ...prev, isOpen: false })),
          });
        }
      },
    });
  };

  const handleDeleteDepartment = (dept: Department) => {
    const linkedEmployees = employees.filter(e => e.department_id === dept.id).length;

    setModalConfig({
      isOpen: true,
      title: 'Supprimer ce département ?',
      message: (
        <span>
          Le département <strong className="text-[#BD4F19] font-extrabold">{dept.name}</strong> sera définitivement supprimé.
          {linkedEmployees > 0 && (
            <> <strong>{linkedEmployees}</strong> collaborateur{linkedEmployees > 1 ? 's' : ''} n&apos;aur{linkedEmployees > 1 ? 'ont' : 'a'} plus de département assigné.</>
          )}
        </span>
      ),
      type: 'danger',
      confirmText: 'Oui, supprimer',
      onConfirm: async () => {
        try {
          const { error } = await supabase.from('departments').delete().eq('id', dept.id);
          if (error) throw error;
          onDataUpdate();
          setModalConfig(prev => ({ ...prev, isOpen: false }));
        } catch (e: any) {
          console.error(e);
          setModalConfig({
            isOpen: true,
            title: 'Suppression impossible',
            message: e.message,
            type: 'danger',
            confirmText: 'Compris',
            onConfirm: () => setModalConfig(prev => ({ ...prev, isOpen: false })),
          });
        }
      },
    });
  };

  const [isDrawerOpen, setIsDrawerOpen] = useState(false);
  const [drawerMode, setDrawerMode] = useState<'create' | 'edit'>('create');
  const [mealForm, setMealForm] = useState({ id: '', name: '', has_options: false, imageUrl: '' });
  const [mealImageFile, setMealImageFile] = useState<File | null>(null);
  const [isEmployeeDrawerOpen, setIsEmployeeDrawerOpen] = useState(false);
  const [employeeDrawerMode, setEmployeeDrawerMode] = useState<'create' | 'edit'>('create');
  const [employeeForm, setEmployeeForm] = useState({ id: '', first_name: '', last_name: '', site_id: '', department_id: '', is_active: true });
  const [filterSite, setFilterSite] = useState<string>('all');
  const [filterDept, setFilterDept] = useState<string>('all');
  const [showBulkImport, setShowBulkImport] = useState(false);
  const [showMealBulkImport, setShowMealBulkImport] = useState(false);
  const [bulkText, setBulkText] = useState('');
  const [mealBulkText, setMealBulkText] = useState('');
  const [mealSearchTerm, setMealSearchTerm] = useState('');
  const [employeeSearchTerm, setEmployeeSearchTerm] = useState('');
  const [isPublishing, setIsPublishing] = useState(false);

  // General settings state variables
  const [timezone, setTimezone] = useState('Europe/Paris (GMT+1)');
  const [whatsappPrefix, setWhatsappPrefix] = useState('+33 (FR)');
  const [whatsappNumber, setWhatsappNumber] = useState('6 12 34 56 78');
  const [maintenanceMsg, setMaintenanceMsg] = useState('');

  // Password Security states
  const [oldPassword, setOldPassword] = useState('');
  const [newPassword, setNewPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');

  const handleUpdatePassword = async () => {
    if (!oldPassword || !newPassword || !confirmPassword) {
      setModalConfig({
        isOpen: true,
        title: 'Champs manquants',
        message: 'Veuillez remplir tous les champs de mot de passe avant de continuer.',
        type: 'alert',
        confirmText: 'Compris',
        onConfirm: () => setModalConfig(prev => ({ ...prev, isOpen: false }))
      });
      return;
    }
    if (newPassword !== confirmPassword) {
      setModalConfig({
        isOpen: true,
        title: 'Mots de passe différents',
        message: 'Le nouveau mot de passe et sa confirmation ne correspond pas. Veuillez réessayer.',
        type: 'alert',
        confirmText: 'Réessayer',
        onConfirm: () => setModalConfig(prev => ({ ...prev, isOpen: false }))
      });
      return;
    }
    if (isLocallyAuthenticated && !session) {
      setModalConfig({
        isOpen: true,
        title: 'Compte local',
        message: 'Le changement de mot de passe nécessite une connexion via un compte Supabase Auth.',
        type: 'alert',
        confirmText: 'Compris',
        onConfirm: () => setModalConfig(prev => ({ ...prev, isOpen: false }))
      });
      return;
    }
    try {
      const userEmail = session?.user.email;
      if (!userEmail) throw new Error('Session utilisateur introuvable.');

      const { error: signInError } = await supabase.auth.signInWithPassword({
        email: userEmail,
        password: oldPassword,
      });
      if (signInError) throw signInError;

      const { error } = await supabase.auth.updateUser({ password: newPassword });
      if (error) throw error;

      setModalConfig({
        isOpen: true,
        title: 'Mot de passe mis à jour ✓',
        message: 'Votre mot de passe a été modifié avec succès.',
        type: 'alert',
        confirmText: 'Parfait',
        onConfirm: () => {
          setOldPassword('');
          setNewPassword('');
          setConfirmPassword('');
          setModalConfig(prev => ({ ...prev, isOpen: false }));
        }
      });
    } catch (err: any) {
      setModalConfig({
        isOpen: true,
        title: 'Erreur',
        message: err.message || 'Impossible de mettre à jour le mot de passe.',
        type: 'danger',
        confirmText: 'Compris',
        onConfirm: () => setModalConfig(prev => ({ ...prev, isOpen: false }))
      });
    }
  };

  const handlePurgeOrders = () => {
    setModalConfig({
      isOpen: true,
      title: 'Purger tout l’historique ?',
      message: (
        <span>
          Cette action est <strong className="text-[#BD4F19] font-extrabold">irréversible</strong>. Toutes les commandes actives ainsi que l'intégralité du journal des commandes seront définitivement supprimées de la base de données.
        </span>
      ),
      type: 'danger',
      confirmText: 'Oui, purger',
      onConfirm: async () => {
        try {
          // Delete active orders
          const { error: errorOrders } = await supabase.from('orders').delete().neq('id', '00000000-0000-0000-0000-000000000000');
          if (errorOrders) throw errorOrders;

          // Delete order history journal
          const { error: errorHistory } = await supabase.from('order_history').delete().neq('id', '00000000-0000-0000-0000-000000000000');
          if (errorHistory) throw errorHistory;

          onDataUpdate();
          fetchOrderHistory(); // Refresh order history list
          setSelectedHistoryItem(null); // Reset selection

          setModalConfig({
            isOpen: true,
            title: 'Purge réussie ✓',
            message: 'Le journal et l\'historique des commandes ont été effacés avec succès.',
            type: 'alert',
            confirmText: 'Parfait',
            onConfirm: () => setModalConfig(prev => ({ ...prev, isOpen: false }))
          });
        } catch (err: any) {
          console.error(err);
          setModalConfig({
            isOpen: true,
            title: 'Erreur lors de la purge',
            message: err.message || 'Une erreur inconnue est survenue.',
            type: 'danger',
            confirmText: 'Compris',
            onConfirm: () => setModalConfig(prev => ({ ...prev, isOpen: false }))
          });
        }
      }
    });
  };

  const getCleanLockTime = (timeStr: string) => timeStr ? timeStr.split('|')[0] : '18:00';
  const getMaintenanceStatus = (timeStr: string) => timeStr ? timeStr.includes('|maintenance') : false;

  const [newLockTime, setNewLockTime] = useState(getCleanLockTime(config?.lock_time || '18:00'));
  const [isMaintenance, setIsMaintenance] = useState(getMaintenanceStatus(config?.lock_time || '18:00'));
  const [isSavingSettings, setIsSavingSettings] = useState(false);

  useEffect(() => {
    if (!config) return;
    setNewLockTime(getCleanLockTime(config.lock_time));
    setIsMaintenance(getMaintenanceStatus(config.lock_time));
    setTimezone(config.timezone || 'Europe/Paris (GMT+1)');
    setMaintenanceMsg(config.maintenance_message || '');
    setWhatsappPrefix(config.whatsapp_prefix || '+226 (BF)');
    setWhatsappNumber(config.whatsapp_number || '');
  }, [config]);

  const [modalConfig, setModalConfig] = useState<{
    isOpen: boolean;
    title: string;
    message: string | React.ReactNode;
    type?: 'confirm' | 'alert' | 'danger';
    confirmText?: string;
    onConfirm: () => void;
  }>({
    isOpen: false,
    title: '',
    message: '',
    onConfirm: () => {},
  });

  useEffect(() => {
    supabase.auth.getSession().then(({ data: { session } }) => {
      setSession(session);
    });

    const { data: { subscription } } = supabase.auth.onAuthStateChange((_event, session) => {
      setSession(session);
    });

    return () => subscription.unsubscribe();
  }, []);

  const isAuthenticated = !!session || isLocallyAuthenticated;

  const handleLoginSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoginError('');
    setIsLoggingIn(true);

    try {
      if (email.trim() === 'admin@gastronomie.com' && password === 'admin') {
        setIsLocallyAuthenticated(true);
        localStorage.setItem('admin_authenticated', 'true');
        setActiveTab('dashboard');
      } else {
        const { error } = await supabase.auth.signInWithPassword({ email, password });
        if (error) throw error;
        setActiveTab('dashboard');
      }
    } catch (err: any) {
      console.error(err);
      setLoginError(err.message || 'Identifiants de connexion invalides.');
    } finally {
      setIsLoggingIn(false);
    }
  };

  const handleLogout = async () => {
    if (isLocallyAuthenticated) {
      setIsLocallyAuthenticated(false);
      localStorage.removeItem('admin_authenticated');
    } else {
      await supabase.auth.signOut();
    }
    setEmail('');
    setPassword('');
  };

  const handleImageChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file) {
      setMealImageFile(file);
      // Create a local preview URL for the UI
      const previewUrl = URL.createObjectURL(file);
      setMealForm(prev => ({ ...prev, imageUrl: previewUrl }));
    }
  };

  const handleSaveMealForm = async (e?: React.FormEvent) => {
    if (e) e.preventDefault();
    if (!mealForm.name.trim()) return;

    try {
      // Upload image to Cloudinary if a new file was selected
      let finalImageUrl = mealForm.imageUrl;
      if (mealImageFile) {
        const formData = new FormData();
        formData.append('file', mealImageFile);
        formData.append('upload_preset', 'gastronomie');

        const response = await fetch('https://api.cloudinary.com/v1_1/qnun0lly/image/upload', {
          method: 'POST',
          body: formData
        });

        if (!response.ok) {
          const errData = await response.json().catch(() => ({}));
          throw new Error(errData.error?.message || 'Erreur de communication avec Cloudinary.');
        }

        const data = await response.json();
        finalImageUrl = data.secure_url;
        setMealImageFile(null);
      }

      if (drawerMode === 'create') {
        const { error } = await supabase.from('meals').insert({
          name: mealForm.name,
          has_options: mealForm.has_options,
          image_url: finalImageUrl || null
        });
        if (error) throw error;
        
        setModalConfig({
          isOpen: true,
          title: 'Plat ajouté ✓',
          message: `Le plat « ${mealForm.name} » a été ajouté au menu avec succès.`,
          type: 'alert',
          confirmText: 'Super',
          onConfirm: () => setModalConfig(prev => ({ ...prev, isOpen: false }))
        });
      } else {
        const { error } = await supabase.from('meals')
          .update({ 
            name: mealForm.name,
            has_options: mealForm.has_options,
            image_url: finalImageUrl || null
          })
          .eq('id', mealForm.id);
        if (error) throw error;
      }
      setIsDrawerOpen(false);
      onDataUpdate();
    } catch (err: any) {
      console.error(err);
      setModalConfig({
        isOpen: true,
        title: 'Erreur de sauvegarde',
        message: `Une erreur est survenue : ${err.message || 'Impossible d\'enregistrer le plat.'}`,
        type: 'danger',
        confirmText: 'Compris',
        onConfirm: () => setModalConfig(prev => ({ ...prev, isOpen: false }))
      });
    }
  };

  const existingDepartments = [
    ...new Set([
      ...departments.map(d => d.name),
      ...employees
        .map(e => (e.department as { name: string } | undefined)?.name)
        .filter((name): name is string => Boolean(name)),
    ]),
  ].sort();

  const handleToggleMealActive = async (id: string, currentStatus: boolean) => {
    try {
      await supabase.from('meals').update({ is_active: !currentStatus }).eq('id', id);
      onDataUpdate();
    } catch (e) {
      console.error(e);
    }
  };

  const handleMealBulkImport = async () => {
    const lines = mealBulkText.split('\n').filter(line => line.trim());
    const mealsToInsert = lines.map(line => {
      const parts = line.split(';');
      const name = parts[0]?.trim();
      const optionPart = parts[1]?.trim()?.toLowerCase() || '';
      const hasOptions = optionPart === 'oui' || optionPart === 'yes' || optionPart === 'true';
      if (!name) return null;
      return { name, has_options: hasOptions, is_active: false };
    }).filter(Boolean);

    if (mealsToInsert.length === 0) {
      setModalConfig({
        isOpen: true,
        title: 'Format incorrect',
        message: 'Aucun plat valide trouvé. Utilisez le format : Nom du plat ; oui/non (par ligne).',
        type: 'danger',
        confirmText: 'Compris',
        onConfirm: () => setModalConfig(prev => ({ ...prev, isOpen: false }))
      });
      return;
    }

    try {
      const { error } = await supabase.from('meals').insert(mealsToInsert);
      if (error) throw error;
      
      setMealBulkText('');
      setMealSearchTerm('');
      setShowMealBulkImport(false);
      onDataUpdate();
      setModalConfig({
        isOpen: true,
        title: `${mealsToInsert.length} plats importés ✓`,
        message: `L’importation est terminée. ${mealsToInsert.length} plats ont été ajoutés à la bibliothèque.`,
        type: 'alert',
        confirmText: 'Parfait',
        onConfirm: () => setModalConfig(prev => ({ ...prev, isOpen: false }))
      });
    } catch (e: any) {
      console.error(e);
      setModalConfig({
        isOpen: true,
        title: "Erreur d’importation",
        message: `Une erreur est survenue : ${e.message || 'Problème de permissions.'}`,
        type: 'danger',
        confirmText: 'Compris',
        onConfirm: () => setModalConfig(prev => ({ ...prev, isOpen: false }))
      });
    }
  };

  const handlePublishMenu = async () => {
    const activeMealsCount = meals.filter(m => m.is_active).length;
    if (activeMealsCount === 0) {
      setModalConfig({
        isOpen: true,
        title: 'Aucun plat sélectionné',
        message: 'Sélectionnez au moins un plat actif dans la bibliothèque avant de publier le menu du jour.',
        type: 'danger',
        confirmText: 'Compris',
        onConfirm: () => setModalConfig(prev => ({ ...prev, isOpen: false }))
      });
      return;
    }

    setModalConfig({
      isOpen: true,
      title: 'Publier le menu du jour ?',
      message: (
        <span>
          Cela va <strong className="text-[#BD4F19] font-extrabold">déverrouiller le tableau</strong> et effacer toutes les commandes actuelles pour démarrer une nouvelle session.
        </span>
      ),
      type: 'confirm',
      confirmText: 'Oui, publier',
      onConfirm: async () => {
        setIsPublishing(true);
        try {
          // 1. Aggregate current orders by meal, option, and site
          const mealDetailsMap: Record<string, { meal_name: string, protein_option: 'Viande' | 'Poisson' | null, site_name: string, count: number }> = {};
          let totalOrdersCount = 0;

          orders.forEach(order => {
            const meal = meals.find(m => m.id === order.meal_id);
            if (!meal) return;

            const employee = employees.find(e => e.id === order.employee_id);
            const siteName = employee ? getEmployeeSiteName(employee) : 'Bureau 1';

            const key = `${order.meal_id}_${order.protein_option || 'None'}_${siteName}`;
            if (mealDetailsMap[key]) {
              mealDetailsMap[key].count += 1;
            } else {
              mealDetailsMap[key] = {
                meal_name: meal.name,
                protein_option: order.protein_option || null,
                site_name: siteName,
                count: 1
              };
            }
            totalOrdersCount += 1;
          });

          const detailsList = Object.values(mealDetailsMap);
          const today = new Date().toISOString().split('T')[0];

          if (totalOrdersCount > 0) {
            const { error: historyError } = await supabase
              .from('order_history')
              .insert({
                publish_date: today,
                total_orders: totalOrdersCount,
                details: detailsList
              });

            if (historyError) throw historyError;
          }

          const { error: settingsError } = await supabase
            .from('settings')
            .update({ last_publish_date: today })
            .eq('id', 'config');
          
          if (settingsError) throw settingsError;

          const { error: ordersError } = await supabase
            .from('orders')
            .delete()
            .neq('id', '00000000-0000-0000-0000-000000000000');
          
          if (ordersError) throw ordersError;

          onDataUpdate();
          fetchOrderHistory(); // Refresh order history list
          setActiveTab('meals'); // Redirect to Menu & Plats tab
          setModalConfig(prev => ({ ...prev, isOpen: false }));
        } catch (e: any) {
          console.error(e);
          setModalConfig({
            isOpen: true,
            title: 'Erreur de publication',
            message: e.message,
            type: 'danger',
            confirmText: 'Compris',
            onConfirm: () => setModalConfig(prev => ({ ...prev, isOpen: false }))
          });
        } finally {
          setIsPublishing(false);
        }
      }
    });
  };

  const handleDeleteMeal = async (id: string, name: string) => {
    setModalConfig({
      isOpen: true,
      title: 'Supprimer ce plat ?',
      message: (
        <span>
          Le plat <strong className="text-[#BD4F19] font-extrabold">{name}</strong> et toutes les commandes associées seront définitivement supprimés.
        </span>
      ),
      type: 'danger',
      confirmText: 'Oui, supprimer',
      onConfirm: async () => {
        try {
          const { error } = await supabase.from('meals').delete().eq('id', id);
          if (error) throw error;
          onDataUpdate();
          setModalConfig(prev => ({ ...prev, isOpen: false }));
        } catch (e: any) {
          console.error(e);
          setModalConfig({
            isOpen: true,
            title: 'Suppression impossible',
            message: e.message,
            type: 'danger',
            confirmText: 'Compris',
            onConfirm: () => setModalConfig(prev => ({ ...prev, isOpen: false }))
          });
        }
      }
    });
  };

  const handleSaveEmployeeForm = async () => {
    if (!employeeForm.first_name.trim() || !employeeForm.last_name.trim()) return;

    try {
      // Résolution automatique du site selon le département sélectionné
      let targetSiteId = employeeForm.site_id || null;
      if (employeeForm.department_id) {
        const selectedDept = departments.find(d => d.id === employeeForm.department_id);
        if (selectedDept && selectedDept.site_id) {
          targetSiteId = selectedDept.site_id;
        }
      }

      if (employeeDrawerMode === 'create') {
        const { error } = await supabase.from('employees').insert({
          first_name: employeeForm.first_name.trim(),
          last_name: employeeForm.last_name.trim(),
          site_id: targetSiteId,
          department_id: employeeForm.department_id || null,
          is_active: employeeForm.is_active,
        });
        if (error) throw error;
      } else {
        const { error } = await supabase.from('employees')
          .update({
            first_name: employeeForm.first_name.trim(),
            last_name: employeeForm.last_name.trim(),
            site_id: targetSiteId,
            department_id: employeeForm.department_id || null,
            is_active: employeeForm.is_active,
          })
          .eq('id', employeeForm.id);
        if (error) throw error;
      }
      setIsEmployeeDrawerOpen(false);
      onDataUpdate();
    } catch (err: any) {
      console.error(err);
      setModalConfig({
        isOpen: true,
        title: 'Erreur de sauvegarde',
        message: `Une erreur est survenue : ${err.message || 'Problème de permissions (RLS).'}`,
        type: 'danger',
        confirmText: 'Compris',
        onConfirm: () => setModalConfig(prev => ({ ...prev, isOpen: false })),
      });
    }
  };

  const handleToggleEmployeeActive = async (emp: Employee) => {
    const nextStatus = !emp.is_active;
    try {
      const { error } = await supabase
        .from('employees')
        .update({ is_active: nextStatus })
        .eq('id', emp.id);
      if (error) throw error;
      onDataUpdate();
    } catch (err: any) {
      console.error(err);
      setModalConfig({
        isOpen: true,
        title: 'Erreur',
        message: err.message || 'Impossible de mettre à jour le statut.',
        type: 'danger',
        confirmText: 'Compris',
        onConfirm: () => setModalConfig(prev => ({ ...prev, isOpen: false })),
      });
    }
  };

  const handleBulkImport = async () => {
    const lines = bulkText.split('\n').filter(line => line.trim());
    const employeesToInsert = lines.map(line => {
      const parts = line.split(';');
      const fullName = parts[0]?.trim();
      if (!fullName) return null;
      
      const nameParts = fullName.split(' ');
      const first_name = nameParts[0];
      const last_name = nameParts.slice(1).join(' ');
      
      const siteName = parts[1]?.trim();
      const deptName = parts[2]?.trim();
      
      const site = sites.find(s => s.name.toLowerCase() === siteName?.toLowerCase()) || sites[0];
      const department = departments.find(d => d.name.toLowerCase() === deptName?.toLowerCase() && d.site_id === site?.id);
      
      return { 
        first_name, 
        last_name, 
        site_id: site?.id || null, 
        department_id: department?.id || null 
      };
    }).filter(Boolean);

    if (employeesToInsert.length === 0) return;

    try {
      await supabase.from('employees').insert(employeesToInsert);
      setBulkText('');
      setShowBulkImport(false);
      onDataUpdate();
      setModalConfig({
        isOpen: true,
        title: `${employeesToInsert.length} collaborateurs importés ✓`,
        message: `L’importation est terminée. ${employeesToInsert.length} personnes ont été ajoutées à la liste.`,
        type: 'alert',
        confirmText: 'Parfait',
        onConfirm: () => setModalConfig(prev => ({ ...prev, isOpen: false }))
      });
    } catch (e) {
      console.error(e);
    }
  };

  const handleDeleteEmployee = async (id: string, name: string) => {
    setModalConfig({
      isOpen: true,
      title: 'Supprimer ce collaborateur ?',
      message: (
        <span>
          Cette action est irréversible. Toutes les données liées à{' '}
          <strong className="text-[#BD4F19] font-extrabold">{name}</strong>{' '}
          seront définitivement effacées de la plateforme Gastronomie Service.
        </span>
      ),
      type: 'danger',
      confirmText: 'Oui, supprimer',
      onConfirm: async () => {
        try {
          const { error } = await supabase.from('employees').delete().eq('id', id);
          if (error) throw error;
          onDataUpdate();
          setModalConfig(prev => ({ ...prev, isOpen: false }));
        } catch (e: any) {
          console.error(e);
          setModalConfig({
            isOpen: true,
            title: 'Échec',
            message: e.message,
            type: 'danger',
            onConfirm: () => setModalConfig(prev => ({ ...prev, isOpen: false }))
          });
        }
      }
    });
  };

  const buildSettingsPayload = (maintenanceOverride?: boolean) => ({
    lock_time: (maintenanceOverride ?? isMaintenance) ? `${newLockTime}|maintenance` : newLockTime,
    timezone,
    maintenance_message: maintenanceMsg.trim() || null,
    whatsapp_prefix: whatsappPrefix,
    whatsapp_number: whatsappNumber.trim() || null,
  });

  const handleUpdateSettings = async (showSuccess = true) => {
    setIsSavingSettings(true);
    try {
      const { error } = await supabase
        .from('settings')
        .update(buildSettingsPayload())
        .eq('id', 'config');
      if (error) throw error;
      onDataUpdate();
      if (showSuccess) {
        setModalConfig({
          isOpen: true,
          title: 'Paramètres enregistrés ✓',
          message: 'Vos paramètres ont été mis à jour et pris en compte immédiatement.',
          type: 'alert',
          confirmText: 'Parfait',
          onConfirm: () => setModalConfig(prev => ({ ...prev, isOpen: false }))
        });
      }
    } catch (e: any) {
      console.error(e);
      setModalConfig({
        isOpen: true,
        title: 'Erreur de sauvegarde',
        message: e.message || 'Impossible d\'enregistrer les paramètres.',
        type: 'danger',
        confirmText: 'Compris',
        onConfirm: () => setModalConfig(prev => ({ ...prev, isOpen: false }))
      });
    } finally {
      setIsSavingSettings(false);
    }
  };

  const handleMaintenanceToggle = async (checked: boolean) => {
    setIsMaintenance(checked);
    setIsSavingSettings(true);
    try {
      const { error } = await supabase
        .from('settings')
        .update(buildSettingsPayload(checked))
        .eq('id', 'config');
      if (error) throw error;
      onDataUpdate();
    } catch (e: any) {
      console.error(e);
      setIsMaintenance(!checked);
      setModalConfig({
        isOpen: true,
        title: 'Erreur',
        message: e.message || 'Impossible de mettre à jour le mode maintenance.',
        type: 'danger',
        confirmText: 'Compris',
        onConfirm: () => setModalConfig(prev => ({ ...prev, isOpen: false }))
      });
    } finally {
      setIsSavingSettings(false);
    }
  };

  // Dashboard calculations
  const totalEmployees = employees.length || 1;
  const currentOrders = orders.length;
  const capacityPercent = Math.min(100, Math.round((currentOrders / totalEmployees) * 100));

  const getPopularDish = () => {
    if (orders.length === 0) return { name: 'Aucun plat', count: 0 };
    const counts: Record<string, number> = {};
    orders.forEach(o => {
      counts[o.meal_id] = (counts[o.meal_id] || 0) + 1;
    });
    let maxMealId = '';
    let maxCount = 0;
    Object.entries(counts).forEach(([mealId, count]) => {
      if (count > maxCount) {
        maxCount = count;
        maxMealId = mealId;
      }
    });
    const popularMeal = meals.find(m => m.id === maxMealId);
    return {
      name: popularMeal ? popularMeal.name : 'Aucun plat',
      count: maxCount || 0,
      image_url: popularMeal ? popularMeal.image_url : undefined
    };
  };

  const popular = getPopularDish();

  // If not authenticated, render Login Screen
  if (!isAuthenticated) {
    return (
      <div className="min-h-screen w-full flex font-sans bg-[#FBF9F1]">
        {/* Left Side: West African Culinary Journey */}
        <div className="hidden md:flex w-1/2 relative bg-cover bg-center bg-[url('https://images.unsplash.com/photo-1544025162-d76694265947?w=1000&auto=format&fit=crop&q=80')]">
          <div className="absolute inset-0 bg-gradient-to-t from-black/80 via-black/40 to-black/30 flex flex-col justify-end p-12 text-white">
            <h1 className="text-4xl font-extrabold tracking-tight mb-2">Gastronomie Service</h1>
            <p className="text-orange-200 text-sm font-medium tracking-wide">La pause déjeuner simplifiée</p>
          </div>
        </div>

        {/* Right Side: Manager Credentials login form */}
        <div className="w-full md:w-1/2 flex items-center justify-center p-8 relative">
          <button 
            onClick={onClose} 
            className="absolute top-6 right-6 p-2 bg-white border border-gray-200 rounded-full hover:bg-gray-100 text-gray-500 shadow-sm transition-all"
          >
            <X size={20} />
          </button>
          
          <div className="max-w-md w-full flex flex-col gap-6">
            <div>
              <h2 className="text-2xl font-extrabold text-gray-900 tracking-tight mb-2">Espace Gestionnaire</h2>
              <p className="text-sm text-gray-500 font-medium">Veuillez vous connecter pour accéder à votre espace de gestion.</p>
            </div>

            {loginError && (
              <div className="bg-red-50 border border-red-200 text-red-700 p-3.5 rounded-xl text-xs font-semibold">
                {loginError}
              </div>
            )}

            <form onSubmit={handleLoginSubmit} className="flex flex-col gap-4">
              <div className="flex flex-col gap-1.5">
                <label className="text-xs font-bold text-gray-600 uppercase tracking-wider">Adresse Email</label>
                <div className="relative flex items-center">
                  <Mail size={18} className="absolute left-3.5 text-gray-400" />
                  <input
                    type="email"
                    required
                    placeholder="nom@entreprise.com"
                    value={email}
                    onChange={e => setEmail(e.target.value)}
                    className="w-full pl-11 pr-4 py-3 border border-gray-200 rounded-xl focus:ring-2 focus:ring-orange-500/20 focus:border-orange-500 bg-white outline-none text-sm text-gray-700 placeholder-gray-400 shadow-sm"
                  />
                </div>
              </div>

              <div className="flex flex-col gap-1.5">
                <div className="flex justify-between items-center">
                  <label className="text-xs font-bold text-gray-600 uppercase tracking-wider">Mot de passe</label>
                  <a href="#" className="text-xs font-bold text-orange-700 hover:underline">Mot de passe oublié ?</a>
                </div>
                <div className="relative flex items-center">
                  <Lock size={18} className="absolute left-3.5 text-gray-400" />
                  <input
                    type={showPassword ? "text" : "password"}
                    required
                    placeholder="••••••••"
                    value={password}
                    onChange={e => setPassword(e.target.value)}
                    className="w-full pl-11 pr-11 py-3 border border-gray-200 rounded-xl focus:ring-2 focus:ring-orange-500/20 focus:border-orange-500 bg-white outline-none text-sm text-gray-700 placeholder-gray-400 shadow-sm"
                  />
                  <button
                    type="button"
                    onClick={() => setShowPassword(!showPassword)}
                    className="absolute right-3.5 text-gray-400 hover:text-gray-600"
                  >
                    {showPassword ? <EyeOff size={18} /> : <Eye size={18} />}
                  </button>
                </div>
              </div>

              <button
                type="submit"
                disabled={isLoggingIn}
                className="w-full bg-orange-700 hover:bg-orange-800 disabled:bg-gray-100 disabled:text-gray-400 text-white font-bold py-3.5 rounded-xl shadow-sm transition-all transform active:scale-98 mt-2"
              >
                {isLoggingIn ? "Connexion..." : "Se connecter"}
              </button>
            </form>

            <div className="text-center text-xs text-gray-500 font-medium pt-4 border-t border-gray-100">
              Besoin d'un accès ? <a href="#" className="text-orange-700 font-bold hover:underline">Contactez l'administration</a>
            </div>
          </div>
        </div>
      </div>
    );
  }

  // Dashboard Tab Content
  const renderDashboard = () => {
    return (
      <div className="flex flex-col gap-6">
        {/* Metric Cards Row */}
        <div className="grid grid-cols-1 lg:grid-cols-5 gap-6">
          {/* Daily orders card */}
          <div className="lg:col-span-2 bg-[#FBF9F1] rounded-3xl border border-gray-200/85 p-6 flex justify-between items-start relative overflow-hidden h-40">
            <div className="flex flex-col justify-between h-full z-10">
              <div>
                <span className="text-[10px] font-bold text-gray-400 uppercase tracking-wider block mb-1.5">Commandes du Jour</span>
                <span className="text-5xl font-extrabold text-orange-700 leading-none">{currentOrders}</span>
              </div>
              <div className="flex items-center gap-1.5 text-xs text-gray-500 font-semibold">
                <TrendingUp size={14} className="text-gray-400" />
                <span>+12% vs hier</span>
              </div>
            </div>
            {/* Faded Document Icon background */}
            <FileText size={100} className="text-gray-150 absolute -right-4 -bottom-4 opacity-30 transform rotate-12 pointer-events-none" />
          </div>

          {/* Popular Dish Card */}
          <div className="lg:col-span-3 bg-[#FBF9F1] rounded-3xl border border-gray-200/85 p-6 flex justify-between items-start relative overflow-hidden h-40">
            <div className="flex flex-col justify-between h-full z-10 w-7/12">
              <div>
                <span className="text-[10px] font-bold text-gray-400 uppercase tracking-wider block mb-1">Plat le plus populaire</span>
                <span className="text-2xl font-extrabold text-gray-900 leading-snug tracking-tight block truncate" title={popular.name}>
                  {popular.name}
                </span>
              </div>
              <div className="flex items-center gap-3">
                <span className="bg-orange-50 border border-orange-100 text-orange-700 font-bold px-2.5 py-1 rounded-lg text-[10px] uppercase tracking-wider block w-fit">
                  {popular.count} commandes
                </span>
                <button 
                  onClick={() => setActiveTab('meals')}
                  className="text-xs font-bold text-orange-700 hover:underline"
                >
                  Voir les détails
                </button>
              </div>
            </div>
            {/* Dish Image filling the right side */}
            <div className="absolute right-0 top-0 bottom-0 w-[42%] overflow-hidden rounded-r-3xl border-l border-gray-100">
              <img 
                src={popular.image_url || getMealImage(popular.name)} 
                alt={popular.name} 
                className="w-full h-full object-cover opacity-70" 
              />
              <div className="absolute inset-y-0 left-0 w-8 bg-gradient-to-r from-[#FBF9F1] to-transparent" />
            </div>
          </div>
        </div>

        {/* Closing Time & Capacity dial Card */}
        <div className="bg-[#FBF9F1] rounded-3xl border border-gray-200/85 p-6 md:p-8 flex flex-col md:flex-row justify-between items-center gap-8">
          <div className="flex-1 flex flex-col gap-4 w-full">
            <div>
              <h4 className="text-lg font-bold text-gray-900 leading-tight mb-1">Heure de clôture des commandes</h4>
              <p className="text-xs text-gray-400 font-medium">Suivi du volume des commandes à l'approche de l'heure limite.</p>
            </div>
            
            <div className="flex flex-col gap-2 w-full mt-2">
              {/* Timeline labels */}
              <div className="flex justify-between items-center text-xs font-bold text-gray-400">
                <span>08:00</span>
                <span className="text-gray-500 font-semibold">Objectif: {totalEmployees}</span>
                <span>{getCleanLockTime(config?.lock_time || '18:00')} (Clôture)</span>
              </div>

              {/* Progress bar */}
              <div className="w-full bg-gray-100 h-3.5 rounded-full overflow-hidden border border-gray-200/50">
                <div 
                  className="bg-orange-700 h-full rounded-full transition-all duration-500" 
                  style={{ width: `${capacityPercent}%` }}
                />
              </div>

              {/* Status note */}
              <p className="text-xs font-bold text-orange-700 mt-1">
                {currentOrders} / {totalEmployees} commandes atteintes
              </p>
            </div>
          </div>

          {/* SVG Circular Progress Dial with Dual Ring look */}
          <div className="border border-orange-200/30 p-2.5 rounded-full flex-shrink-0">
            <div className="relative w-24 h-24 flex items-center justify-center">
              <svg className="w-full h-full transform -rotate-90" viewBox="0 0 100 100">
                <circle cx="50" cy="50" r="40" stroke="#F1EFE9" strokeWidth="8" fill="transparent" />
                <circle 
                  cx="50" cy="50" r="40" 
                  stroke="#c2410c" strokeWidth="8" fill="transparent" 
                  strokeDasharray="251.2"
                  strokeDashoffset={251.2 - (251.2 * capacityPercent) / 100}
                  strokeLinecap="round"
                  className="transition-all duration-500"
                />
              </svg>
              <div className="absolute flex flex-col items-center justify-center">
                <span className="text-xl font-extrabold text-gray-900 leading-none">{capacityPercent}%</span>
                <span className="text-[9px] text-gray-400 font-bold uppercase tracking-wider mt-0.5">Capacité</span>
              </div>
            </div>
          </div>
        </div>
      </div>
    );
  };

  const getDepartmentsForSite = (siteId: string) => {
    const dbDeptNames = departments.filter(d => d.site_id === siteId).map(d => d.name);
    const employeeDeptNames = employees
      .filter(e => e.site_id === siteId)
      .map(e => (e.department as { name: string } | undefined)?.name)
      .filter((name): name is string => Boolean(name));
    return [...new Set([...dbDeptNames, ...employeeDeptNames])].sort();
  };

  // Sites & Departments Tab Content
  const renderSites = () => {
    const activeSiteId = sites.some(s => s.id === selectedSite) ? selectedSite : (sites[0]?.id ?? '');

    const siteDetails: Record<string, { name: string; address: string; type: string }> = {};
    sites.forEach((s, index) => {
      siteDetails[s.id] = {
        name: s.name,
        address: s.address || 'Adresse non configurée',
        type: index === 0 ? 'Lieu principal' : 'Site secondaire',
      };
    });

    const activeSiteInfo = siteDetails[activeSiteId] || { name: 'Site', address: 'Adresse non configurée', type: '' };
    const activeSiteEmployees = employees.filter(e => e.site_id === activeSiteId);
    const activeSiteDeptRecords = departments
      .filter(d => d.site_id === activeSiteId)
      .sort((a, b) => a.name.localeCompare(b.name));

    return (
      <div className="grid grid-cols-1 lg:grid-cols-12 gap-8 items-start animate-in fade-in duration-300">
        {/* Left Column: Bureaux / Sites */}
        <div className="lg:col-span-5 flex flex-col gap-6">
          <div className="flex items-center justify-between">
            <h3 className="text-base font-bold text-gray-900">Bureaux / Sites</h3>
            <span className="text-[10px] font-bold text-gray-500 bg-gray-250/50 border border-gray-200/30 px-2.5 py-1 rounded-full">
              {sites.length} Total
            </span>
          </div>

          <div className="flex flex-col gap-4">
            {sites.length === 0 ? (
              <p className="text-xs text-gray-400 italic py-6 text-center">Aucun site configuré.</p>
            ) : sites.map(site => {
              const info = siteDetails[site.id] || { name: site.name, address: 'Adresse non configurée', type: '' };
              const isActive = activeSiteId === site.id;
              const deptsCount = getDepartmentsForSite(site.id).length;

              return (
                <div 
                  key={site.id}
                  onClick={() => setSelectedSite(site.id)}
                  className={`rounded-3xl p-6 border-2 transition-all cursor-pointer relative overflow-hidden flex flex-col gap-4 ${
                    isActive 
                      ? 'border-[#BD4F19] bg-[#FBF9F1] shadow-xs' 
                      : 'border-transparent bg-[#f1eee3]'
                  }`}
                >
                  {/* Decorative background icon image (building) */}
                  <div className="absolute right-4 bottom-2 opacity-[0.04] pointer-events-none text-gray-900">
                    <Building2 size={80} />
                  </div>

                  <div className="flex items-start gap-4">
                    {/* Building Icon circle container */}
                    <div className={`w-11 h-11 rounded-full flex items-center justify-center shrink-0 shadow-xs ${
                      isActive ? 'bg-[#f5e4d7] text-orange-700' : 'bg-[#e7e4d9] text-gray-400'
                    }`}>
                      {info.name === 'Bureau 2' ? <Home size={20} /> : <Building2 size={20} />}
                    </div>

                    {/* Site Details */}
                    <div className="flex-1 min-w-0">
                      <div className="flex items-center justify-between gap-2">
                        <h4 className="font-bold text-gray-900 text-sm truncate">{info.name}</h4>
                        {isActive && (
                          <span className="bg-[#f5e4d7] text-[#BD4F19] text-[9px] font-extrabold px-2 py-0.5 rounded tracking-wider">
                            ACTIVE
                          </span>
                        )}
                      </div>
                      
                      <div className="flex flex-col gap-1.5 mt-3 text-xs font-semibold text-gray-500">
                        <div className="flex items-center gap-1.5">
                          <MapPin size={13} className="text-gray-400 shrink-0" />
                          <span className="truncate">{info.address}</span>
                        </div>
                        <div className="flex items-center gap-1.5">
                          <Users size={13} className="text-gray-400 shrink-0" />
                          <span>{deptsCount} Département{deptsCount > 1 ? 's' : ''}</span>
                        </div>
                      </div>
                    </div>
                  </div>

                  {/* Edit / Delete actions — bottom of card */}
                  <div
                    className="flex justify-end items-center gap-2 pt-3 border-t border-gray-200/50 relative z-10"
                    onClick={(e) => e.stopPropagation()}
                  >
                    <button
                      type="button"
                      onClick={() => openEditSiteModal(site)}
                      title="Modifier le site"
                      className="flex items-center gap-1.5 px-3 py-2 rounded-xl bg-orange-50 text-orange-700 hover:bg-orange-100 transition-colors text-xs font-bold"
                    >
                      <FileText size={14} />
                      Modifier
                    </button>
                    <button
                      type="button"
                      onClick={() => handleDeleteSite(site)}
                      title="Supprimer le site"
                      className="flex items-center gap-1.5 px-3 py-2 rounded-xl bg-red-50 text-red-500 hover:bg-red-100 transition-colors text-xs font-bold"
                    >
                      <Trash2 size={14} />
                      Supprimer
                    </button>
                  </div>
                </div>
              );
            })}
          </div>

          {/* Add Site Button */}
          <button 
            onClick={openCreateSiteModal}
            className="w-full py-3 bg-transparent border border-[#BD4F19] hover:bg-[#BD4F19] hover:text-white text-[#BD4F19] font-bold rounded-xl text-xs flex items-center justify-center gap-2 transition-all duration-300 transform active:scale-98 shadow-xs cursor-pointer"
          >
            <Plus size={14} />
            Ajouter un site
          </button></div>

        {/* Right Column: Departments for active site */}
        <div className="lg:col-span-7 bg-[#F5F4EC] border border-gray-250/30 rounded-3xl p-6 flex flex-col gap-6 shadow-xs">
          {/* Header Row */}
          <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4 border-b border-gray-200/30 pb-4">
            <div>
              <span className="text-[10px] font-bold text-gray-400 uppercase tracking-widest font-inter">DÉPARTEMENTS POUR</span>
              <div className="flex items-center gap-1.5 mt-0.5">
                <h3 className="text-lg font-bold text-gray-900">{activeSiteInfo.name}</h3>
                <span className="w-4.5 h-4.5 rounded-full bg-orange-700 flex items-center justify-center text-white text-[9px] font-bold shadow-xs">✓</span>
              </div>
            </div>

            <button 
              onClick={() => openCreateDepartmentModal(activeSiteId)}
              className="flex items-center gap-2 bg-orange-700 hover:bg-orange-800 text-white font-bold px-4 py-2.5 rounded-xl text-xs shadow-sm transition-colors"
            >
              <Plus size={14} />
              Ajouter un département
            </button>
          </div>

          {/* Department Cards List */}
          <div className="flex flex-col gap-3">
            {activeSiteDeptRecords.length === 0 ? (
              <p className="text-xs text-gray-400 italic py-6 text-center">Aucun département configuré pour ce site.</p>
            ) : (
              activeSiteDeptRecords.map(dept => {
                const count = activeSiteEmployees.filter(e => e.department_id === dept.id).length;
                const pillColor = getDeptColor(dept.name).color;
                
                return (
                  <div 
                    key={dept.id}
                    className="bg-[#FBF9F1] border border-[#E4E3DB] p-5 rounded-2xl flex flex-col gap-4 hover:translate-x-0.5 transition-transform shadow-xs"
                  >
                    <div className="flex items-center gap-4">
                      {/* Vertical Pill Indicator */}
                      <div className={`w-2 h-10 rounded-full shrink-0 ${pillColor}`} />
                      
                      <div className="flex-1 min-w-0">
                        <span className="text-sm font-bold text-gray-800">{dept.name}</span>
                        <p className="text-[10px] text-gray-400 font-semibold mt-0.5">
                          {count} Collaborateur{count > 1 ? 's' : ''}
                        </p>
                      </div>
                    </div>

                    {/* Edit / Delete actions — bottom of card */}
                    <div className="flex justify-end items-center gap-2 pt-3 border-t border-gray-200/50">
                      <button
                        type="button"
                        onClick={() => openEditDepartmentModal(dept)}
                        title="Modifier le département"
                        className="flex items-center gap-1.5 px-3 py-2 rounded-xl bg-orange-50 text-orange-700 hover:bg-orange-100 transition-colors text-xs font-bold"
                      >
                        <FileText size={14} />
                        Modifier
                      </button>
                      <button
                        type="button"
                        onClick={() => handleDeleteDepartment(dept)}
                        title="Supprimer le département"
                        className="flex items-center gap-1.5 px-3 py-2 rounded-xl bg-red-50 text-red-500 hover:bg-red-100 transition-colors text-xs font-bold"
                      >
                        <Trash2 size={14} />
                        Supprimer
                      </button>
                    </div>
                  </div>
                );
              })
            )}
          </div>
        </div>
      </div>
    );
  };

  const renderJournal = () => {
    const siteTotals: Record<string, number> = {};
    // Initialize all sites from the configured sites props
    sites.forEach(s => {
      siteTotals[s.name] = 0;
    });
    
    if (selectedHistoryItem && selectedHistoryItem.details) {
      selectedHistoryItem.details.forEach((detail: any) => {
        const site = detail.site_name || 'Bureau 1';
        siteTotals[site] = (siteTotals[site] || 0) + detail.count;
      });
    }
    
    const uniqueSitesInItem = sites.map(s => s.name);

    // Group meals for table
    const mealGroups: Record<string, {
      meal_name: string;
      options: Record<string, number>;
      siteCounts: Record<string, number>;
      total: number;
    }> = {};

    if (selectedHistoryItem && selectedHistoryItem.details) {
      selectedHistoryItem.details.forEach((detail: any) => {
        const name = detail.meal_name;
        const site = detail.site_name || 'Bureau 1';
        
        if (!mealGroups[name]) {
          mealGroups[name] = {
            meal_name: name,
            options: {},
            siteCounts: {},
            total: 0
          };
        }
        
        if (detail.protein_option) {
          mealGroups[name].options[detail.protein_option] = (mealGroups[name].options[detail.protein_option] || 0) + detail.count;
        }
        
        mealGroups[name].siteCounts[site] = (mealGroups[name].siteCounts[site] || 0) + detail.count;
        mealGroups[name].total += detail.count;
      });
    }

    const sortedMealGroups = Object.values(mealGroups).sort((a, b) => a.meal_name.localeCompare(b.meal_name));

    return (
      <div className="space-y-6 animate-in fade-in duration-300">
        {isLoadingHistory ? (
          <div className="text-center py-12 text-gray-400 font-semibold bg-white border border-[#E4E3DB] rounded-3xl">Chargement de l'historique...</div>
        ) : orderHistory.length === 0 ? (
          <div className="text-center py-12 text-gray-400 italic bg-white border border-[#E4E3DB] rounded-3xl">Aucun historique disponible.</div>
        ) : (
          <div className="grid grid-cols-1 md:grid-cols-12 gap-8 items-start">
            {/* List of dates */}
            <div className="md:col-span-4 flex flex-col gap-4 max-h-[650px] overflow-y-auto bg-gray-50/50 border border-[#E4E3DB] rounded-3xl p-4 shadow-sm">
              <span className="text-[10px] font-bold text-gray-400 uppercase tracking-widest block mb-1 px-1">Dates de publication</span>
              <div className="flex flex-col gap-3">
                {orderHistory.map(item => {
                  const formattedDate = new Date(item.publish_date).toLocaleDateString('fr-FR', {
                    weekday: 'long',
                    day: 'numeric',
                    month: 'long',
                    year: 'numeric'
                  });
                  const isSelected = selectedHistoryItem?.id === item.id;
                  return (
                    <button
                      key={item.id}
                      onClick={() => setSelectedHistoryItem(item)}
                      className={`w-full text-left px-5 py-4 rounded-2xl transition-all flex flex-col gap-1 border-2 ${
                        isSelected 
                          ? 'bg-[#FCE4D6]/70 border-[#BD4F19] text-[#BD4F19] shadow-sm' 
                          : 'bg-white border-transparent hover:bg-gray-100/50 text-gray-700 shadow-xs'
                      }`}
                    >
                      <span className="font-extrabold text-sm capitalize leading-tight">
                        {formattedDate}
                      </span>
                      <span className="text-xs text-gray-455 font-semibold">
                        {item.total_orders} plat{item.total_orders > 1 ? 's' : ''} commandés
                      </span>
                    </button>
                  );
                })}
              </div>
            </div>

            {/* Details Pane */}
            <div className="md:col-span-8 flex flex-col gap-6 min-h-[300px]">
              {selectedHistoryItem ? (
                <>
                  {/* KPI Cards Row */}
                  <div className="grid grid-cols-1 sm:grid-cols-3 gap-6">
                    {/* Total Plats Card */}
                    <div className="bg-white border border-[#E4E3DB] rounded-3xl p-6 shadow-sm flex items-center gap-4">
                      <div className="bg-[#FCE4D6] text-[#BD4F19] w-12 h-12 rounded-full flex items-center justify-center shrink-0">
                        <Utensils size={22} />
                      </div>
                      <div>
                        <span className="text-[10px] font-bold text-gray-400 uppercase tracking-wider block">Total Plats</span>
                        <span className="text-2xl font-black text-gray-800">{selectedHistoryItem.total_orders}</span>
                      </div>
                    </div>

                    {/* Bureau Cards */}
                    {uniqueSitesInItem.map((site, index) => {
                      const colors = [
                        { bg: 'bg-[#FEF3D6]', text: 'text-[#D97706]' }, // Yellow/Orange
                        { bg: 'bg-[#E2F0D9]', text: 'text-[#385723]' }, // Green
                        { bg: 'bg-[#E8F4F8]', text: 'text-[#1F6E8C]' }  // Blue
                      ];
                      const color = colors[index % colors.length];
                      return (
                        <div key={site} className="bg-white border border-[#E4E3DB] rounded-3xl p-6 shadow-sm flex items-center gap-4">
                          <div className={`${color.bg} ${color.text} w-12 h-12 rounded-full flex items-center justify-center shrink-0`}>
                            {index === 0 ? <Building2 size={22} /> : <Home size={22} />}
                          </div>
                          <div>
                            <span className="text-[10px] font-bold text-gray-400 uppercase tracking-wider block">{site}</span>
                            <span className="text-2xl font-black text-gray-800">{siteTotals[site] || 0}</span>
                          </div>
                        </div>
                      );
                    })}
                  </div>

                  {/* Main details table */}
                  <div className="bg-white border border-[#E4E3DB] rounded-3xl shadow-sm overflow-hidden flex flex-col">
                    <div className="p-6 border-b border-gray-150 flex items-center justify-between">
                      <h4 className="font-bold text-gray-900 text-base capitalize">
                        Détails du {new Date(selectedHistoryItem.publish_date).toLocaleDateString('fr-FR', {
                          weekday: 'long',
                          day: 'numeric',
                          month: 'long',
                          year: 'numeric'
                        })}
                      </h4>
                      <span className="bg-[#FCE4D6] text-[#BD4F19] text-[10px] font-black uppercase tracking-widest px-3 py-1 rounded-full">
                        Session Déjeuner
                      </span>
                    </div>

                    <div className="overflow-x-auto">
                      <table className="w-full text-left border-collapse">
                        <thead>
                          <tr className="bg-gray-50/50 text-[10px] font-extrabold uppercase tracking-wider border-b border-gray-200 text-gray-400">
                            <th className="px-6 py-4 font-bold">Plat</th>
                            <th className="px-6 py-4 font-bold">Détail Options</th>
                            {uniqueSitesInItem.map(site => (
                              <th key={site} className="px-6 py-4 font-bold text-center">{site.toUpperCase()}</th>
                            ))}
                            <th className="px-6 py-4 font-bold text-right">Total</th>
                          </tr>
                        </thead>
                        <tbody className="divide-y divide-gray-150 bg-white">
                          {sortedMealGroups.map((group, idx) => (
                            <tr key={idx} className="hover:bg-gray-50/40 transition-colors">
                              <td className="px-6 py-4 text-sm font-extrabold text-gray-800">
                                {group.meal_name}
                              </td>
                              <td className="px-6 py-4 text-xs font-semibold text-gray-500">
                                {Object.keys(group.options).length > 0 ? (
                                  <div className="flex items-center gap-3">
                                    {Object.entries(group.options).map(([optName, optCount]) => (
                                      <span key={optName} className="inline-flex items-center gap-1.5">
                                        <span className={`w-5 h-5 flex items-center justify-center rounded text-[9px] font-black text-white ${
                                          optName === 'Viande' ? 'bg-[#BD4F19]' : 'bg-[#517664]'
                                        }`}>
                                          {optName.charAt(0)}
                                        </span>
                                        <span className="font-bold text-sm text-gray-800">{optCount}</span>
                                      </span>
                                    ))}
                                  </div>
                                ) : (
                                  <span className="text-gray-400">—</span>
                                )}
                              </td>
                              {uniqueSitesInItem.map(site => (
                                <td key={site} className="px-6 py-4 text-sm font-bold text-gray-500 text-center">
                                  {String(group.siteCounts[site] || 0).padStart(2, '0')}
                                </td>
                              ))}
                              <td className="px-6 py-4 text-sm font-extrabold text-[#BD4F19] text-right">
                                {String(group.total).padStart(2, '0')}
                              </td>
                            </tr>
                          ))}
                          
                          {/* Totals row */}
                          <tr className="bg-gray-50/50 font-black text-sm text-gray-800 border-t border-gray-200">
                            <td className="px-6 py-4 uppercase tracking-wider font-extrabold text-xs text-gray-800">
                              Totaux Globaux
                            </td>
                            <td className="px-6 py-4"></td>
                            {uniqueSitesInItem.map(site => (
                              <td key={site} className="px-6 py-4 text-center font-extrabold text-sm text-gray-700">
                                {String(siteTotals[site] || 0).padStart(2, '0')}
                              </td>
                            ))}
                            <td className="px-6 py-4 text-right font-black text-sm text-[#BD4F19]">
                              {selectedHistoryItem.total_orders}
                            </td>
                          </tr>
                        </tbody>
                      </table>
                    </div>
                  </div>
                </>
              ) : (
                <div className="bg-[#FBF9F1] border border-gray-200 rounded-3xl p-12 flex flex-col items-center justify-center text-center text-gray-455 gap-2 min-h-[400px]">
                  <BarChart2 size={32} className="text-gray-300 animate-pulse" />
                  <span className="font-semibold">Sélectionnez une date pour voir les détails des commandes</span>
                </div>
              )}
            </div>
          </div>
        )}
      </div>
    );
  };

  return (
    <div className="min-h-screen w-full flex font-sans bg-[#FBF9F1]">
      {/* Sidebar Navigation Panel */}
      <aside className="w-[260px] bg-[#F4F0E6] border-r border-gray-200/50 flex flex-col justify-between py-8 px-4 flex-shrink-0 h-screen sticky top-0">
        <div className="flex flex-col gap-8">
          {/* Sidebar Top Header */}
          <div className="flex items-center gap-3 px-2">
            <div className="w-12 h-12 rounded-full overflow-hidden border border-orange-200/60 shadow-sm bg-gray-200 shrink-0">
              <img 
                src="https://images.unsplash.com/photo-1573496359142-b8d87734a5a2?w=150&auto=format&fit=crop&q=80" 
                alt="Admin Avatar" 
                className="w-full h-full object-cover" 
              />
            </div>
            <div className="truncate">
              <h2 className="text-sm font-bold text-orange-700 truncate leading-tight">Gastronomie Service</h2>
              <span className="text-[10px] font-bold text-gray-400 uppercase tracking-wider">Admin Dashboard</span>
            </div>
          </div>

          {/* Menu Options Vertical List */}
          <nav className="flex flex-col gap-1">
            <button
              onClick={() => setActiveTab('dashboard')}
              className={`flex items-center justify-between px-3 py-2.5 rounded-xl text-sm font-bold transition-all relative ${
                activeTab === 'dashboard'
                  ? 'bg-orange-50 text-orange-700'
                  : 'text-gray-500 hover:text-gray-900 hover:bg-gray-200/30'
              }`}
            >
              <div className="flex items-center gap-3">
                <LayoutDashboard size={18} />
                <span>Dashboard</span>
              </div>
              {activeTab === 'dashboard' && <span className="absolute right-0 top-2 bottom-2 w-1 bg-orange-700 rounded-l" />}
            </button>

            <button
              onClick={() => setActiveTab('meals')}
              className={`flex items-center justify-between px-3 py-2.5 rounded-xl text-sm font-bold transition-all relative ${
                activeTab === 'meals'
                  ? 'bg-orange-50 text-orange-700'
                  : 'text-gray-500 hover:text-gray-900 hover:bg-gray-200/30'
              }`}
            >
              <div className="flex items-center gap-3">
                <Utensils size={18} />
                <span>Menu & Plats</span>
              </div>
              {activeTab === 'meals' && <span className="absolute right-0 top-2 bottom-2 w-1 bg-orange-700 rounded-l" />}
            </button>

            <button
              onClick={() => setActiveTab('sites')}
              className={`flex items-center justify-between px-3 py-2.5 rounded-xl text-sm font-bold transition-all relative ${
                activeTab === 'sites'
                  ? 'bg-orange-50 text-orange-700'
                  : 'text-gray-500 hover:text-gray-900 hover:bg-gray-200/30'
              }`}
            >
              <div className="flex items-center gap-3">
                <Building2 size={18} />
                <span>Sites & Départements</span>
              </div>
              {activeTab === 'sites' && <span className="absolute right-0 top-2 bottom-2 w-1 bg-orange-700 rounded-l" />}
            </button>

            <button
              onClick={() => setActiveTab('employees')}
              className={`flex items-center justify-between px-3 py-2.5 rounded-xl text-sm font-bold transition-all relative ${
                activeTab === 'employees'
                  ? 'bg-orange-50 text-orange-700'
                  : 'text-gray-500 hover:text-gray-900 hover:bg-gray-200/30'
              }`}
            >
              <div className="flex items-center gap-3">
                <Users size={18} />
                <span>Collaborateurs</span>
              </div>
              {activeTab === 'employees' && <span className="absolute right-0 top-2 bottom-2 w-1 bg-orange-700 rounded-l" />}
            </button>

            <button
              onClick={() => setActiveTab('journal')}
              className={`flex items-center justify-between px-3 py-2.5 rounded-xl text-sm font-bold transition-all relative ${
                activeTab === 'journal'
                  ? 'bg-orange-50 text-orange-700'
                  : 'text-gray-500 hover:text-gray-900 hover:bg-gray-200/30'
              }`}
            >
              <div className="flex items-center gap-3">
                <FileText size={18} />
                <span>Journal des commandes</span>
              </div>
              {activeTab === 'journal' && <span className="absolute right-0 top-2 bottom-2 w-1 bg-orange-700 rounded-l" />}
            </button>

            <button
              onClick={() => setActiveTab('settings')}
              className={`flex items-center justify-between px-3 py-2.5 rounded-xl text-sm font-bold transition-all relative ${
                activeTab === 'settings'
                  ? 'bg-orange-50 text-orange-700'
                  : 'text-gray-500 hover:text-gray-900 hover:bg-gray-200/30'
              }`}
            >
              <div className="flex items-center gap-3">
                <SettingsIcon size={18} />
                <span>Paramètres</span>
              </div>
              {activeTab === 'settings' && <span className="absolute right-0 top-2 bottom-2 w-1 bg-orange-700 rounded-l" />}
            </button>
          </nav>
        </div>

        {/* Sidebar Footer buttons */}
        <div className="flex flex-col gap-2.5">
          <button
            onClick={onClose}
            className="w-full bg-orange-700 hover:bg-orange-800 text-white font-bold p-3 rounded-xl flex items-center justify-center gap-2 text-sm shadow-sm transition-all transform active:scale-98"
          >
            <ExternalLink size={16} />
            <span>Voir le site public</span>
          </button>
          
          <button
            onClick={handleLogout}
            className="w-full bg-white hover:bg-red-50 text-red-600 border border-red-200 font-bold p-2.5 rounded-xl flex items-center justify-center gap-2 text-xs shadow-sm transition-all"
          >
            <LogOut size={14} />
            <span>Déconnexion</span>
          </button>
        </div>
      </aside>

      {/* Main Content Workspace panel */}
      <main className="flex-1 p-8 overflow-y-auto h-screen">
        {/* Header Block */}
        <header className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 border-b border-gray-200/50 pb-6 mb-6">
          {activeTab === 'meals' ? (
            <div>
              <h2 className="text-2xl font-extrabold text-gray-900 tracking-tight">Menu & Plats</h2>
              <p className="text-xs font-semibold text-gray-400 mt-1">Gérez les plats du jour et votre bibliothèque culinaire.</p>
            </div>
          ) : activeTab === 'sites' ? (
            <div>
              <h2 className="text-2xl font-extrabold text-orange-950 tracking-tight">Gestion de l'arborescence</h2>
              <p className="text-xs font-semibold text-gray-400 mt-1 font-inter">Gérez vos bureaux, sites et départements.</p>
            </div>
          ) : activeTab === 'employees' ? (
            <div>
              <h2 className="text-2xl font-extrabold text-gray-900 tracking-tight">Collaborateurs</h2>
              <p className="text-xs font-semibold text-gray-400 mt-1">Gérez les membres de l'équipe, leurs sites et départements.</p>
            </div>
          ) : activeTab === 'settings' ? (
            <div>
              <h2 className="text-2xl font-extrabold text-gray-900 tracking-tight">Paramètres généraux</h2>
              <p className="text-xs font-semibold text-gray-400 mt-1">Gérez la configuration globale de votre plateforme.</p>
            </div>
          ) : activeTab === 'journal' ? (
            <div>
              <h2 className="text-2xl font-extrabold text-gray-900 tracking-tight">Journal des commandes</h2>
              <p className="text-xs font-semibold text-gray-400 mt-1">Historique des menus publiés et des statistiques de commandes.</p>
            </div>
          ) : (
            <div>
              <h2 className="text-2xl font-extrabold text-gray-900 tracking-tight">Tableau de bord</h2>
              <div className="flex items-center gap-2 text-sm font-semibold text-gray-500 mt-1">
                <Calendar size={16} className="text-gray-400" />
                <span>{getFormattedDate()}</span>
              </div>
            </div>
          )}

          {/* Quick Header actions */}
          <div className="flex items-center gap-3">
            {activeTab === 'meals' ? (
              <div className="flex items-center gap-2.5">
                <button
                  onClick={() => {
                    setDrawerMode('create');
                    setMealForm({ id: '', name: '', has_options: false, imageUrl: '' });
                    setIsDrawerOpen(true);
                  }}
                  className="flex items-center gap-2 bg-orange-700 hover:bg-orange-800 text-white px-5 py-2.5 rounded-xl text-sm font-bold shadow-sm transition-colors"
                >
                  <Plus size={16} />
                  Nouveau Plat
                </button>
              </div>
            ) : activeTab === 'sites' ? null : activeTab === 'employees' ? (
              <div className="flex items-center gap-3">
                <button 
                  onClick={() => setShowBulkImport(!showBulkImport)}
                  className="text-[#BD4F19] hover:text-[#A64B2A] hover:underline text-xs font-bold transition-colors cursor-pointer mr-1"
                >
                  {showBulkImport ? "Retour à la liste" : "Importation en lot"}
                </button>
                <button 
                  onClick={() => {
                    setEmployeeDrawerMode('create');
                    setEmployeeForm({
                      id: '',
                      first_name: '',
                      last_name: '',
                      site_id: sites[0]?.id || '',
                      department_id: '',
                      is_active: true,
                    });
                    setIsEmployeeDrawerOpen(true);
                  }}
                  className="flex items-center gap-2 bg-[#BD4F19] hover:bg-[#A64B2A] text-white px-5 py-2.5 rounded-xl text-sm font-bold shadow-xs transition-colors cursor-pointer"
                >
                  <Plus size={16} />
                  Ajouter un employé
                </button>
              </div>
            ) : activeTab === 'settings' ? (
              <button
                type="button"
                onClick={() => handleUpdateSettings(true)}
                disabled={isSavingSettings}
                className="flex items-center justify-center gap-2 bg-[#BD4F19] hover:bg-[#A64B2A] disabled:opacity-50 text-white px-5 py-2.5 rounded-xl text-sm font-bold shadow-sm transition-colors shrink-0"
              >
                <Save size={16} />
                {isSavingSettings ? 'Enregistrement...' : 'Enregistrer les paramètres'}
              </button>
            ) : activeTab === 'journal' ? (
              <button
                onClick={() => setIsReportModalOpen(true)}
                className="flex items-center gap-2 bg-[#BD4F19] hover:bg-[#A64B2A] text-white px-5 py-2.5 rounded-xl text-sm font-bold shadow-sm transition-colors cursor-pointer"
              >
                <BarChart2 size={16} />
                Générer un Rapport
              </button>
            ) : (
              <>
                <button
                  onClick={() => setIsReportModalOpen(true)}
                  className="flex items-center gap-2 bg-white border border-[#BD4F19] text-[#BD4F19] hover:bg-orange-50 px-4 py-2.5 rounded-xl text-sm font-bold shadow-sm transition-colors cursor-pointer"
                >
                  <BarChart2 size={16} />
                  Rapports
                </button>
                <button
                  onClick={() => setActiveTab('meals')}
                  className="flex items-center gap-2 bg-orange-700 hover:bg-orange-800 text-white px-5 py-2.5 rounded-xl text-sm font-bold shadow-sm transition-colors cursor-pointer"
                >
                  <Send size={16} />
                  Publier le Menu
                </button>
              </>
            )}
          </div>
        </header>

        {/* Tab Body contents */}
        {activeTab === 'dashboard' && renderDashboard()}
        
        {activeTab === 'sites' && renderSites()}

        {activeTab === 'meals' && (
          <div className="space-y-6">
            {/* Mega Publish Banner Card */}
            <div className="bg-[#FBF9F1] border border-gray-200/85 rounded-3xl p-8 relative overflow-hidden text-center shadow-[0_4px_20px_rgba(0,0,0,0.015)]">
              {/* Decorative background image or layout */}
              <div className="absolute right-6 bottom-0 top-0 w-1/3 opacity-5 flex items-center justify-end pointer-events-none">
                <Utensils size={180} />
              </div>
              
              <div className="bg-orange-50/70 border border-orange-105 text-orange-750 text-orange-700 p-4 rounded-full w-14 h-14 flex items-center justify-center mx-auto mb-4">
                <Send size={24} className="rotate-12" />
              </div>
              <h3 className="text-lg font-bold text-gray-900 mb-2">Ready to launch today's menu?</h3>
              <p className="text-xs text-gray-400 font-medium max-w-lg mx-auto leading-relaxed mb-6">
                Publier réinitialise les commandes actuelles et ouvre la plateforme pour les nouvelles sélections de vos collaborateurs.
              </p>
              
              <button 
                onClick={handlePublishMenu}
                disabled={isPublishing}
                className="bg-orange-700 hover:bg-orange-800 disabled:opacity-50 text-white font-bold px-7 py-3 rounded-xl flex items-center justify-center gap-2.5 text-xs tracking-wider uppercase mx-auto shadow-sm transition-all transform active:scale-98"
              >
                <span>Publier le menu du jour</span>
                <Send size={14} strokeWidth={2.5} />
              </button>
            </div>

            {showMealBulkImport ? (
              <div className="bg-[#FBF9F1] rounded-3xl p-6 border border-gray-200/85 shadow-sm space-y-4">
                <div>
                  <h3 className="text-sm font-bold text-gray-900 uppercase tracking-wide mb-1">Importer en lot des plats</h3>
                  <p className="text-xs text-gray-400 mb-3 italic">Format: Nom du plat; Option Viande/Poisson (oui/non)</p>
                  <textarea 
                    className="w-full h-48 p-4 rounded-xl border border-gray-250 bg-white focus:ring-2 focus:ring-orange-500/20 focus:border-orange-500 outline-none font-mono text-sm"
                    placeholder="Riz au gras; oui&#10;Benga; non&#10;Poisson braisé; oui"
                    value={mealBulkText}
                    onChange={e => setMealBulkText(e.target.value)}
                  />
                </div>
                <div className="flex justify-end gap-3">
                  <button onClick={() => setShowMealBulkImport(false)} className="px-5 py-2.5 rounded-xl text-gray-600 hover:bg-gray-150 text-sm font-bold">
                    Annuler
                  </button>
                  <button onClick={handleMealBulkImport} className="px-5 py-2.5 rounded-xl bg-orange-700 text-white font-bold hover:bg-orange-800 shadow-sm text-sm">
                    Démarrer l'importation
                  </button>
                </div>
              </div>
            ) : (
              <div className="flex flex-col gap-6">
                {/* Title area for list with aligned search bar */}
                <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4">
                  <div className="flex items-center gap-4">
                    <h3 className="text-xl font-bold text-gray-900">Bibliothèque des plats</h3>
                    <span className="text-xs font-bold text-gray-500 bg-gray-200/50 border border-gray-200/30 px-3 py-1 rounded-full">
                      {meals.filter(m => m.is_active).length} sélectionnés
                    </span>
                  </div>
                  
                  {/* Search Bar + Reset aligned */}
                  <div className="flex items-center gap-2 w-full sm:w-auto">
                    <div className="relative flex-1 sm:w-80">
                      <Search className="absolute left-3.5 top-1/2 -translate-y-1/2 text-gray-400" size={18} />
                      <input
                        type="text"
                        placeholder="Rechercher un plat..."
                        value={mealSearchTerm}
                        onChange={(e) => setMealSearchTerm(e.target.value)}
                        className="w-full pl-11 pr-4 py-2.5 bg-white border border-gray-300 rounded-xl focus:ring-2 focus:ring-orange-500/20 focus:border-orange-500 outline-none text-sm font-medium shadow-sm transition-all"
                      />
                    </div>
                    <button
                      onClick={async () => {
                        const activeMeals = meals.filter(m => m.is_active);
                        for (const meal of activeMeals) {
                          await supabase.from('meals').update({ is_active: false }).eq('id', meal.id);
                        }
                        onDataUpdate();
                      }}
                      title="Réinitialiser la sélection"
                      className="flex items-center gap-1.5 bg-white border border-gray-300 text-gray-600 hover:bg-gray-50 hover:text-red-500 hover:border-red-300 px-3 py-2.5 rounded-xl text-xs font-bold shadow-sm transition-colors shrink-0"
                    >
                      <X size={14} />
                      Réinitialiser
                    </button>
                  </div>
                </div>

                {/* Grid list of dishes */}
                <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-6">
                  {meals
                    .filter(meal => meal.name.toLowerCase().includes(mealSearchTerm.toLowerCase()))
                    .map(meal => {
                      const cat = getMealCategory(meal.name);
                      return (
                        <div 
                          key={meal.id} 
                          className={`flex flex-col bg-[#FBF9F1] rounded-3xl border transition-all overflow-hidden group shadow-sm ${
                            meal.is_active ? 'border-orange-700' : 'border-gray-200/80 hover:border-gray-300'
                          }`}
                        >
                          {/* Dish Image / Checkbox / Category Badges Area */}
                          <div className="h-40 w-full relative overflow-hidden">
                            <img 
                              src={meal.image_url || getMealImage(meal.name)} 
                              alt={meal.name} 
                              className={`w-full h-full object-cover transition-transform duration-500 group-hover:scale-105 ${
                                meal.is_active ? 'opacity-90' : 'opacity-75 group-hover:opacity-90'
                              }`} 
                            />
                            
                            {/* Checkbox Trigger Top-Left */}
                            <button
                              onClick={() => handleToggleMealActive(meal.id, meal.is_active || false)}
                              className="absolute top-3 left-3 w-6 h-6 rounded-lg flex items-center justify-center transition-all focus:outline-none"
                            >
                              {meal.is_active ? (
                                <div className="w-6 h-6 rounded-lg bg-orange-700 flex items-center justify-center text-white scale-105 shadow-sm">
                                  <Plus size={14} className="rotate-45" strokeWidth={4} />
                                </div>
                              ) : (
                                <div className="w-6 h-6 rounded-lg bg-white/80 backdrop-blur-sm border-2 border-white/50 hover:bg-white" />
                              )}
                            </button>

                            {/* Category Badge Bottom-Left */}
                            <div className="absolute bottom-3 left-3 bg-white/90 backdrop-blur-sm px-2.5 py-1 rounded-full flex items-center gap-1.5 text-[9px] font-bold shadow-sm">
                              <span className={`w-1.5 h-1.5 rounded-full ${cat.color}`} />
                              <span className="text-gray-700 uppercase tracking-wider">{cat.label}</span>
                            </div>
                          </div>

                          {/* Text Contents Area */}
                          <div className="p-4 flex flex-col justify-between flex-1 gap-2 min-h-[80px]">
                            <div>
                              <h4 className="font-bold text-gray-900 text-sm leading-snug tracking-tight truncate" title={meal.name}>
                                {meal.name}
                              </h4>
                            </div>

                            {/* Modify / Delete actions */}
                            <div className="flex justify-between items-center mt-2 pt-2 border-t border-gray-150/40">
                              <button 
                                onClick={() => {
                                  setDrawerMode('edit');
                                  setMealForm({ 
                                    id: meal.id, 
                                    name: meal.name, 
                                    has_options: meal.has_options || false,
                                    imageUrl: ''
                                  });
                                  setIsDrawerOpen(true);
                                }} 
                                className="text-orange-700 hover:underline text-[10px] font-bold"
                              >
                                Modifier
                              </button>
                              <button 
                                onClick={() => handleDeleteMeal(meal.id, meal.name)} 
                                className="text-gray-400 hover:text-red-500 transition-colors p-1"
                              >
                                <Trash2 size={13} />
                              </button>
                            </div>
                          </div>
                        </div>
                      );
                    })}

                  {/* Add Plat dashed card */}
                  <div 
                    onClick={() => {
                      setDrawerMode('create');
                      setMealForm({ id: '', name: '', has_options: false, imageUrl: '' });
                      setIsDrawerOpen(true);
                    }}
                    className="border-2 border-dashed border-gray-250 rounded-3xl p-6 flex flex-col items-center justify-center text-center hover:bg-orange-50/15 cursor-pointer transition-all h-full min-h-[220px]"
                  >
                    <div className="w-10 h-10 rounded-full bg-white border border-gray-200 flex items-center justify-center shadow-sm text-gray-500 mb-4">
                      <Plus size={20} />
                    </div>
                    <h4 className="text-sm font-bold text-gray-900">Ajouter un plat</h4>
                    <p className="text-[10px] text-gray-400 font-semibold max-w-[150px] leading-relaxed mt-1">
                      Créer une nouvelle recette pour votre bibliothèque.
                    </p>
                  </div>
                </div>
              </div>
            )}
          </div>
        )}

        {activeTab === 'employees' && (
          <div className="space-y-6 animate-in fade-in duration-300">
            {showBulkImport ? (
              <div className="bg-[#F5F4EC] rounded-3xl p-6 border border-gray-250/30 shadow-xs space-y-4">
                <div>
                  <h3 className="text-sm font-bold text-gray-900 uppercase tracking-wide mb-1">Coller la liste de collaborateurs</h3>
                  <p className="text-xs text-gray-400 mb-3 italic">Format: Nom; Bureau; Département (Ex: Jean Dupont; Bureau 1; RH)</p>
                  <textarea 
                    className="w-full h-48 p-4 rounded-xl border border-gray-250 bg-white focus:ring-2 focus:ring-orange-500/20 focus:border-orange-500 outline-none font-mono text-sm"
                    placeholder="Jean Dupont; Bureau 1; RH&#10;Marie Durand; Bureau 2; Informatique"
                    value={bulkText}
                    onChange={e => setBulkText(e.target.value)}
                  />
                </div>
                <div className="flex justify-end gap-3">
                  <button onClick={() => setShowBulkImport(false)} className="px-5 py-2.5 rounded-xl text-gray-600 text-sm font-bold hover:bg-gray-200/50">
                    Annuler
                  </button>
                  <button onClick={handleBulkImport} className="px-5 py-2.5 rounded-xl bg-orange-700 text-white font-bold hover:bg-orange-850 shadow-sm text-sm">
                    Démarrer l'importation
                  </button>
                </div>
              </div>
            ) : (
              <div className="flex flex-col gap-6">
                {/* Search & Filter inputs */}
                <div className="bg-white border border-[#E4E3DB] rounded-3xl p-5 flex flex-col md:flex-row items-center justify-between gap-4 shadow-xs">
                  {/* Search bar on the left */}
                  <div className="relative w-full md:w-96">
                    <Search className="absolute left-3.5 top-1/2 -translate-y-1/2 text-gray-400" size={18} />
                    <input
                      type="text"
                      placeholder="Rechercher par nom..."
                      value={employeeSearchTerm}
                      onChange={(e) => setEmployeeSearchTerm(e.target.value)}
                      className="w-full pl-11 pr-4 py-2.5 bg-[#F5F4EC] border border-transparent rounded-xl focus:bg-white focus:border-orange-500 focus:ring-2 focus:ring-orange-500/20 outline-none text-sm font-semibold text-gray-700 transition-all"
                    />
                  </div>

                  {/* Filter dropdowns on the right */}
                  <div className="flex items-center gap-3 w-full md:w-auto">
                    {/* Sites dropdown filter */}
                    <div className="relative w-full md:w-44">
                      <select
                        value={filterSite}
                        onChange={(e) => setFilterSite(e.target.value)}
                        className="w-full pl-4 pr-10 py-2.5 bg-[#F5F4EC] border border-transparent rounded-xl focus:bg-white focus:border-orange-500 outline-none text-sm font-bold text-gray-700 cursor-pointer appearance-none"
                      >
                        <option value="all">Tous les sites</option>
                        {sites.map(site => (
                          <option key={site.id} value={site.name}>{site.name}</option>
                        ))}
                      </select>
                      <ChevronRight className="absolute right-3.5 top-1/2 -translate-y-1/2 text-gray-400 rotate-90 pointer-events-none" size={16} />
                    </div>

                    {/* Departments dropdown filter */}
                    <div className="relative w-full md:w-48">
                      <select
                        value={filterDept}
                        onChange={(e) => setFilterDept(e.target.value)}
                        className="w-full pl-4 pr-10 py-2.5 bg-[#F5F4EC] border border-transparent rounded-xl focus:bg-white focus:border-orange-500 outline-none text-sm font-bold text-gray-700 cursor-pointer appearance-none"
                      >
                        <option value="all">Tous les départements</option>
                        {existingDepartments.map(dept => (
                          <option key={dept} value={dept}>{dept}</option>
                        ))}
                      </select>
                      <ChevronRight className="absolute right-3.5 top-1/2 -translate-y-1/2 text-gray-400 rotate-90 pointer-events-none" size={16} />
                    </div>
                  </div>
                </div>

                {/* List Table container */}
                <div className="bg-[#F5F4EC] rounded-3xl shadow-xs border border-[#E4E3DB] overflow-hidden">
                  <div className="overflow-x-auto">
                    <table className="w-full text-left border-collapse">
                      <thead>
                        <tr className="text-[#8C867A] text-[10px] font-extrabold uppercase tracking-wider border-b border-[#E4E3DB]">
                          <th className="pl-8 pr-6 py-5 font-bold">Nom complet</th>
                          <th className="px-6 py-5 font-bold">Site assigné</th>
                          <th className="px-6 py-5 font-bold">Département</th>
                          <th className="px-6 py-5 font-bold">Statut</th>
                          <th className="pr-8 pl-6 py-5 font-bold text-right">Actions</th>
                        </tr>
                      </thead>
                      <tbody className="bg-white divide-y divide-[#E4E3DB]">
                        {employees
                          .filter(e => {
                            const matchesSearch = `${e.first_name} ${e.last_name}`.toLowerCase().includes(employeeSearchTerm.toLowerCase());
                            const siteName = getEmployeeSiteName(e);
                            const deptName = getEmployeeDeptName(e);
                            const matchesSite = filterSite === 'all' || siteName === filterSite;
                            const matchesDept = filterDept === 'all' || deptName === filterDept;
                            return matchesSearch && matchesSite && matchesDept;
                          })
                          .map(emp => {
                            const fullName = getEmployeeFullName(emp);
                            const initials = (emp.first_name?.[0] || '') + (emp.last_name?.[0] || '');
                            const isActive = emp.is_active;
                            const deptName = getEmployeeDeptName(emp);
                            const deptBadgeStyle = getDeptBadgeStyle(deptName);
                            const siteText = getEmployeeSiteName(emp);

                            return (
                              <tr key={emp.id} className={`transition-colors ${isActive ? 'hover:bg-gray-50/40' : 'opacity-50 bg-gray-50/60'}`}>
                                {/* Name with initials avatar */}
                                <td className="pl-8 pr-6 py-5 flex items-center gap-3">
                                  <div className={`w-10 h-10 rounded-full flex items-center justify-center text-xs font-bold shadow-xs overflow-hidden shrink-0 border ${
                                    isActive ? 'bg-[#E4E3DB] text-gray-500 border-gray-305' : 'bg-gray-200 text-gray-400 border-gray-200'
                                  }`}>
                                    <span>{initials}</span>
                                  </div>
                                  <div className="flex flex-col">
                                    <span className={`font-bold text-sm leading-tight ${isActive ? 'text-gray-800' : 'text-gray-400 line-through'}`}>
                                      {fullName}
                                    </span>
                                    {!isActive && (
                                      <span className="text-[10px] text-gray-400 font-semibold mt-0.5">Inactif</span>
                                    )}
                                  </div>
                                </td>

                                {/* Assigned Site */}
                                <td className="px-6 py-5 text-sm font-semibold text-gray-700">
                                  {siteText}
                                </td>

                                {/* Assigned Dept */}
                                <td className="px-6 py-5">
                                  {deptName ? (
                                    <span className={`px-3 py-1.5 rounded-full text-[10px] font-extrabold uppercase tracking-wider ${deptBadgeStyle}`}>
                                      {deptName}
                                    </span>
                                  ) : (
                                    <span className="text-gray-400 italic text-xs font-semibold">-</span>
                                  )}
                                </td>

                                {/* Status toggle */}
                                <td className="px-6 py-5">
                                  <label className="relative inline-flex items-center cursor-pointer select-none">
                                    <input 
                                      type="checkbox" 
                                      checked={isActive}
                                      onChange={() => handleToggleEmployeeActive(emp)}
                                      className="sr-only peer"
                                    />
                                    <div className="w-11 h-6 bg-gray-300 rounded-full peer peer-focus:outline-none peer-checked:bg-[#BD4F19] after:content-[''] after:absolute after:top-[2px] after:left-[2px] after:bg-white after:border-gray-300 after:border after:rounded-full after:h-5 after:w-5 after:transition-all peer-checked:after:translate-x-full peer-checked:after:border-white"></div>
                                  </label>
                                </td>

                                {/* Actions (Edit / Delete) */}
                                <td className="pr-8 pl-6 py-5 text-right">
                                  <div className="flex items-center justify-end gap-2">
                                    <button 
                                      onClick={() => {
                                        setEmployeeDrawerMode('edit');
                                        setEmployeeForm({
                                          id: emp.id,
                                          first_name: emp.first_name,
                                          last_name: emp.last_name,
                                          site_id: emp.site_id || '',
                                          department_id: emp.department_id || '',
                                          is_active: emp.is_active,
                                        });
                                        setIsEmployeeDrawerOpen(true);
                                      }}
                                      title="Modifier l'employé"
                                      className="w-8 h-8 flex items-center justify-center rounded-lg bg-orange-50 text-orange-700 hover:bg-orange-100 transition-colors"
                                    >
                                      <FileText size={14} />
                                    </button>
                                    <button 
                                      onClick={() => handleDeleteEmployee(emp.id, fullName)} 
                                      className="text-gray-450 hover:text-red-500 p-2 rounded-lg transition-colors"
                                    >
                                      <Trash2 size={15} />
                                    </button>
                                  </div>
                                </td>
                              </tr>
                            );
                          })}
                      </tbody>
                    </table>
                  </div>

                  {/* Table pagination footer */}
                  <div className="flex items-center justify-between bg-[#F5F4EC] px-8 py-5">
                    <span className="text-[10px] font-bold text-gray-500">
                      Showing 1 to {employees.length} of {employees.length} entries
                    </span>
                    <div className="flex items-center gap-1.5">
                      <button className="w-7 h-7 rounded bg-white border border-gray-200 flex items-center justify-center text-gray-400 hover:bg-gray-50 transition-colors shadow-xs">
                        <ChevronRight size={14} className="rotate-180" />
                      </button>
                      <button className="w-7 h-7 rounded bg-white border border-gray-200 flex items-center justify-center text-gray-400 hover:bg-gray-50 transition-colors shadow-xs">
                        <ChevronRight size={14} />
                      </button>
                    </div>
                  </div>
                </div>
              </div>
            )}
          </div>
        )}

        {activeTab === 'journal' && renderJournal()}

        {activeTab === 'settings' && (
          <div className="space-y-8 animate-in fade-in duration-300 max-w-5xl mx-auto py-2">

            <div className="grid grid-cols-1 md:grid-cols-2 gap-8">
              {/* Card 1: Système & Clôture */}
              <div className="bg-white p-8 rounded-3xl border border-[#E4E3DB] shadow-sm flex flex-col gap-6 justify-between relative overflow-hidden">
                <div className="space-y-6">
                  <div className="flex items-center gap-3">
                    <div className="w-10 h-10 rounded-full bg-[#FCE4D6] text-[#BD4F19] flex items-center justify-center shrink-0">
                      <Clock size={18} />
                    </div>
                    <h3 className="text-base font-bold text-gray-900">Système & Clôture</h3>
                  </div>
                  
                  <div className="space-y-4">
                    <div className="flex flex-col gap-1.5">
                      <label className="text-[10px] font-bold text-gray-400 uppercase tracking-widest">Heure de clôture automatique</label>
                      <input
                        type="text"
                        placeholder="11:00 AM"
                        value={newLockTime}
                        onChange={e => setNewLockTime(e.target.value)}
                        onBlur={() => handleUpdateSettings(false)}
                        className="w-full px-4 py-3 bg-[#FBF9F1] border border-[#E4E3DB] rounded-xl focus:bg-white focus:ring-2 focus:ring-orange-500/20 focus:border-orange-500 outline-none text-sm font-bold text-gray-700 placeholder-gray-400"
                      />
                      <p className="text-[10px] text-gray-400 font-semibold mt-0.5">Heure limite pour les commandes du jour.</p>
                    </div>

                    <div className="flex flex-col gap-1.5">
                      <label className="text-[10px] font-bold text-gray-400 uppercase tracking-widest">Fuseau horaire de l'entreprise</label>
                      <div className="relative">
                        <select
                          value={timezone}
                          onChange={e => setTimezone(e.target.value)}
                          onBlur={() => handleUpdateSettings(false)}
                          className="w-full pl-4 pr-10 py-3 bg-[#FBF9F1] border border-[#E4E3DB] rounded-xl focus:bg-white focus:border-orange-500 outline-none text-sm font-semibold text-gray-700 cursor-pointer appearance-none"
                        >
                          <option value="Europe/Paris (GMT+1)">Europe/Paris (GMT+1)</option>
                          <option value="GMT (GMT+0)">GMT (GMT+0)</option>
                          <option value="Africa/Ouagadougou (GMT+0)">Africa/Ouagadougou (GMT+0)</option>
                        </select>
                        <ChevronRight className="absolute right-3.5 top-1/2 -translate-y-1/2 text-gray-400 rotate-90 pointer-events-none" size={16} />
                      </div>
                    </div>
                  </div>
                </div>
              </div>

              {/* Card 2: État de la plateforme */}
              <div className="bg-white p-8 rounded-3xl border border-[#E4E3DB] shadow-sm flex flex-col gap-6 justify-between">
                <div className="space-y-6">
                  <div className="flex items-center gap-3">
                    <div className="w-10 h-10 rounded-full bg-[#FCE4D6] text-[#BD4F19] flex items-center justify-center shrink-0">
                      <ShieldCheck size={18} />
                    </div>
                    <h3 className="text-base font-bold text-gray-900">État de la plateforme</h3>
                  </div>

                  <div className="space-y-4">
                    {/* Maintenance toggle wrapper */}
                    <div className="bg-[#FBF9F1] border border-[#E4E3DB] p-4 rounded-2xl flex items-center justify-between gap-4">
                      <div className="flex-1">
                        <h4 className="font-bold text-gray-900 text-sm">Activer le Mode Maintenance</h4>
                        <p className="text-[10px] text-gray-400 font-semibold mt-0.5 leading-normal">
                          Rend le site temporairement inaccessible aux clients.
                        </p>
                      </div>
                      
                      <label className="relative inline-flex items-center cursor-pointer select-none">
                        <input 
                          type="checkbox" 
                          checked={isMaintenance}
                          onChange={(e) => handleMaintenanceToggle(e.target.checked)}
                          className="sr-only peer"
                        />
                        <div className="w-11 h-6 bg-gray-300 rounded-full peer peer-focus:outline-none peer-checked:bg-[#BD4F19] after:content-[''] after:absolute after:top-[2px] after:left-[2px] after:bg-white after:border-gray-300 after:border after:rounded-full after:h-5 after:w-5 after:transition-all peer-checked:after:translate-x-full peer-checked:after:border-white"></div>
                      </label>
                    </div>

                    <div className="flex flex-col gap-1.5">
                      <label className="text-[10px] font-bold text-gray-400 uppercase tracking-widest">Message de maintenance personnalisé</label>
                      <textarea
                        placeholder="Ex: Nous mettons à jour notre menu d'été..."
                        rows={2}
                        value={maintenanceMsg}
                        onChange={e => setMaintenanceMsg(e.target.value)}
                        onBlur={() => handleUpdateSettings(false)}
                        className="w-full px-4 py-3 bg-[#FBF9F1] border border-[#E4E3DB] rounded-xl focus:bg-white focus:ring-2 focus:ring-orange-500/20 focus:border-orange-500 outline-none text-sm font-semibold text-gray-750 placeholder-gray-400"
                      />
                    </div>
                  </div>
                </div>
              </div>

              {/* Card 3: Intégration Traiteur */}
              <div className="bg-white p-8 rounded-3xl border border-[#E4E3DB] shadow-sm flex flex-col gap-6 justify-between">
                <div className="space-y-6">
                  <div className="flex items-center gap-3">
                    <div className="w-10 h-10 rounded-full bg-[#FCE4D6] text-[#BD4F19] flex items-center justify-center shrink-0">
                      <MessageSquare size={18} />
                    </div>
                    <h3 className="text-base font-bold text-gray-900">Intégration Traiteur</h3>
                  </div>

                  <div className="space-y-4">
                    <div className="flex flex-col gap-1.5">
                      <label className="text-[10px] font-bold text-gray-400 uppercase tracking-widest">Numéro WhatsApp de réception des commandes</label>
                      <div className="flex gap-2">
                        <div className="relative w-32 shrink-0">
                          <select
                            value={whatsappPrefix}
                            onChange={e => setWhatsappPrefix(e.target.value)}
                            onBlur={() => handleUpdateSettings(false)}
                            className="w-full pl-3 pr-8 py-3 bg-[#FBF9F1] border border-[#E4E3DB] rounded-xl focus:bg-white focus:border-orange-500 outline-none text-sm font-bold text-gray-750 cursor-pointer appearance-none"
                          >
                            <option value="+33 (FR)">+33 (FR)</option>
                            <option value="+226 (BF)">+226 (BF)</option>
                            <option value="+1 (US)">+1 (US)</option>
                          </select>
                          <ChevronRight className="absolute right-2.5 top-1/2 -translate-y-1/2 text-gray-400 rotate-90 pointer-events-none" size={14} />
                        </div>
                        <input
                          type="text"
                          placeholder="6 12 34 56 78"
                          value={whatsappNumber}
                          onChange={e => setWhatsappNumber(e.target.value)}
                          onBlur={() => handleUpdateSettings(false)}
                          className="flex-1 px-4 py-3 bg-[#FBF9F1] border border-[#E4E3DB] rounded-xl focus:bg-white focus:ring-2 focus:ring-orange-500/20 focus:border-orange-500 outline-none text-sm font-semibold text-gray-750 placeholder-gray-400"
                        />
                      </div>
                      <p className="text-[10px] text-gray-400 font-semibold leading-normal mt-1">
                        Les notifications de nouvelles commandes seront envoyées à ce numéro.
                      </p>
                    </div>
                  </div>
                </div>
              </div>

              {/* Card 4: Sécurité du compte */}
              <div className="bg-white p-8 rounded-3xl border border-[#E4E3DB] shadow-sm flex flex-col gap-6 justify-between">
                <div className="space-y-6">
                  <div className="flex items-center gap-3">
                    <div className="w-10 h-10 rounded-full bg-[#FCE4D6] text-[#BD4F19] flex items-center justify-center shrink-0">
                      <Lock size={18} />
                    </div>
                    <h3 className="text-base font-bold text-gray-900">Sécurité du compte</h3>
                  </div>

                  <div className="space-y-3">
                    <div className="flex flex-col gap-1">
                      <label className="text-[10px] font-bold text-gray-400 uppercase tracking-widest">Ancien mot de passe</label>
                      <input
                        type="password"
                        value={oldPassword}
                        onChange={e => setOldPassword(e.target.value)}
                        placeholder="••••••••"
                        className="w-full px-4 py-2.5 bg-[#FBF9F1] border border-[#E4E3DB] rounded-xl focus:bg-white focus:ring-2 focus:ring-orange-500/20 focus:border-orange-500 outline-none text-sm font-semibold text-gray-750 placeholder-gray-400"
                      />
                    </div>
                    <div className="flex flex-col gap-1">
                      <label className="text-[10px] font-bold text-gray-400 uppercase tracking-widest">Nouveau mot de passe</label>
                      <input
                        type="password"
                        value={newPassword}
                        onChange={e => setNewPassword(e.target.value)}
                        placeholder="••••••••"
                        className="w-full px-4 py-2.5 bg-[#FBF9F1] border border-[#E4E3DB] rounded-xl focus:bg-white focus:ring-2 focus:ring-orange-500/20 focus:border-orange-500 outline-none text-sm font-semibold text-gray-750 placeholder-gray-400"
                      />
                    </div>
                    <div className="flex flex-col gap-1">
                      <label className="text-[10px] font-bold text-gray-400 uppercase tracking-widest">Confirmer le nouveau mot de passe</label>
                      <input
                        type="password"
                        value={confirmPassword}
                        onChange={e => setConfirmPassword(e.target.value)}
                        placeholder="••••••••"
                        className="w-full px-4 py-2.5 bg-[#FBF9F1] border border-[#E4E3DB] rounded-xl focus:bg-white focus:ring-2 focus:ring-orange-500/20 focus:border-orange-500 outline-none text-sm font-semibold text-gray-750 placeholder-gray-400"
                      />
                    </div>
                  </div>
                </div>

                <button
                  type="button"
                  onClick={handleUpdatePassword}
                  className="w-full bg-[#BD4F19] hover:bg-[#A64B2A] text-white py-3 rounded-xl font-bold transition-all shadow-md text-xs uppercase tracking-wider active:scale-98 cursor-pointer mt-2"
                >
                  Mettre à jour le mot de passe
                </button>
              </div>
            </div>

            {/* Danger Zone Banner */}
            <div className="bg-[#FDF3EB] border border-[#F5C2B1] rounded-3xl p-6 flex flex-col md:flex-row items-start md:items-center justify-between gap-6 mt-8">
              <div>
                <h4 className="font-extrabold text-[#B0382E] text-base">Zone de danger</h4>
                <p className="text-xs text-gray-500 font-semibold mt-1">
                  Cette action est irréversible et supprimera définitivement toutes les données d'historique.
                </p>
              </div>
              <button
                type="button"
                onClick={handlePurgeOrders}
                className="px-5 py-3 border border-[#B0382E] text-[#B0382E] hover:bg-[#B0382E] hover:text-white transition-all font-bold rounded-xl text-xs flex items-center gap-2 cursor-pointer shadow-xs active:scale-98 shrink-0 bg-transparent"
              >
                <Trash2 size={15} />
                Purger l'historique des commandes
              </button>
            </div>
          </div>
        )}
      </main>

      {/* Slide-out Drawer Panel for Adding / Editing Employees */}
      {isEmployeeDrawerOpen && (
        <>
          {/* Backdrop overlay */}
          <div 
            onClick={() => setIsEmployeeDrawerOpen(false)}
            className="fixed inset-0 bg-black/35 backdrop-blur-xs z-40 transition-opacity duration-300"
          />

          {/* Drawer container */}
          <div className="fixed right-0 top-0 bottom-0 w-[440px] bg-white shadow-2xl z-50 border-l border-gray-200 flex flex-col justify-between animate-in slide-in-from-right duration-300 font-sans">
            {/* Header */}
            <div className="p-6 border-b border-gray-100 flex items-center justify-between">
              <div>
                <h3 className="text-lg font-bold text-gray-900">
                  {employeeDrawerMode === 'create' ? 'Ajouter un employé' : `Modifier ${employeeForm.first_name} ${employeeForm.last_name}`}
                </h3>
                <p className="text-[10px] text-gray-400 font-semibold mt-0.5">
                  {employeeDrawerMode === 'create' ? 'Remplir les détails pour ajouter un membre' : 'Mettre à jour les informations du collaborateur'}
                </p>
              </div>
              <button 
                onClick={() => setIsEmployeeDrawerOpen(false)}
                className="p-1.5 hover:bg-gray-100 rounded-full text-gray-400 hover:text-gray-650 transition-colors"
              >
                <X size={20} />
              </button>
            </div>

            {/* Form body */}
            <form onSubmit={(e) => { e.preventDefault(); handleSaveEmployeeForm(); }} className="flex-1 p-6 overflow-y-auto space-y-6">
              {/* Section: Informations Personnelles */}
              <div className="space-y-4">
                <span className="text-[10px] font-bold text-[#BD4F19] uppercase tracking-widest flex items-center gap-1.5">
                  <Users size={14} />
                  Informations Personnelles
                </span>
                
                {/* Name fields */}
                <div className="grid grid-cols-2 gap-4">
                  <div className="flex flex-col gap-1.5">
                    <label className="text-[10px] font-bold text-gray-400 uppercase tracking-wider">Prénom</label>
                    <input
                      type="text"
                      required
                      placeholder="ex: Amadou"
                      value={employeeForm.first_name}
                      onChange={e => setEmployeeForm({ ...employeeForm, first_name: e.target.value })}
                      className="w-full px-4 py-3 border border-gray-250 rounded-xl focus:ring-2 focus:ring-orange-500/20 focus:border-orange-500 outline-none text-sm font-semibold text-gray-700 bg-white"
                    />
                  </div>
                  <div className="flex flex-col gap-1.5">
                    <label className="text-[10px] font-bold text-gray-400 uppercase tracking-wider">Nom</label>
                    <input
                      type="text"
                      required
                      placeholder="ex: Ly"
                      value={employeeForm.last_name}
                      onChange={e => setEmployeeForm({ ...employeeForm, last_name: e.target.value })}
                      className="w-full px-4 py-3 border border-gray-250 rounded-xl focus:ring-2 focus:ring-orange-500/20 focus:border-orange-500 outline-none text-sm font-semibold text-gray-700 bg-white"
                    />
                  </div>
                </div>

              </div>

              {/* Divider */}
              <div className="border-t border-gray-200/60 my-4" />

              {/* Section: Affectation */}
              <div className="space-y-4">
                <span className="text-[10px] font-bold text-[#BD4F19] uppercase tracking-widest flex items-center gap-1.5">
                  <Building2 size={14} />
                  Affectation
                </span>

                {/* Site dropdown */}
                <div className="flex flex-col gap-1.5">
                  <label className="text-[10px] font-bold text-gray-400 uppercase tracking-wider">Assigner à un Site</label>
                  <div className="relative">
                    <select
                      value={employeeForm.site_id}
                      onChange={e => setEmployeeForm({ ...employeeForm, site_id: e.target.value, department_id: '' })}
                      className="w-full pl-4 pr-10 py-3 border border-gray-250 rounded-xl focus:ring-2 focus:ring-orange-500/20 focus:border-orange-500 outline-none text-sm font-semibold text-gray-750 bg-white cursor-pointer appearance-none"
                    >
                      <option value="">Sélectionner un site</option>
                      {sites.map(s => (
                        <option key={s.id} value={s.id}>{s.name}</option>
                      ))}
                    </select>
                    <ChevronRight className="absolute right-3.5 top-1/2 -translate-y-1/2 text-gray-400 rotate-90 pointer-events-none" size={16} />
                  </div>
                </div>

                {/* Department dropdown */}
                <div className="flex flex-col gap-1.5">
                  <label className="text-[10px] font-bold text-gray-400 uppercase tracking-wider">Assigner à un Département</label>
                  <div className="relative">
                    <select
                      value={employeeForm.department_id}
                      onChange={e => {
                        const selectedDeptId = e.target.value;
                        const selectedDept = departments.find(d => d.id === selectedDeptId);
                        const newSiteId = selectedDept?.site_id || employeeForm.site_id;
                        setEmployeeForm({
                          ...employeeForm,
                          department_id: selectedDeptId,
                          site_id: newSiteId,
                        });
                      }}
                      className="w-full pl-4 pr-10 py-3 border border-gray-250 rounded-xl focus:ring-2 focus:ring-orange-500/20 focus:border-orange-500 outline-none text-sm font-semibold text-gray-750 bg-white cursor-pointer appearance-none"
                    >
                      <option value="">Sélectionner un département</option>
                      {(employeeForm.site_id 
                        ? departments.filter(d => d.site_id === employeeForm.site_id)
                        : departments
                      ).map(d => (
                        <option key={d.id} value={d.id}>{d.name}</option>
                      ))}
                    </select>
                    <ChevronRight className="absolute right-3.5 top-1/2 -translate-y-1/2 text-gray-400 rotate-90 pointer-events-none" size={16} />
                  </div>
                </div>
              </div>

              {/* Divider */}
              <div className="border-t border-gray-200/60 my-4" />

              {/* Toggle Card: Activer le compte */}
              <div className="bg-[#FBF9F1] border border-gray-200/80 rounded-2xl p-4 flex items-center justify-between gap-4">
                <div className="flex items-center gap-3">
                  <div className="w-10 h-10 rounded-full bg-orange-50 flex items-center justify-center text-[#BD4F19] shadow-xs shrink-0">
                    <Lock size={18} />
                  </div>
                  <div>
                    <h4 className="font-bold text-gray-900 text-sm">Activer le compte</h4>
                    <p className="text-[10px] text-gray-400 font-semibold mt-0.5 leading-normal">
                      Autoriser l'accès au tableau de bord
                    </p>
                  </div>
                </div>

                {/* Toggle switch */}
                <label className="relative inline-flex items-center cursor-pointer select-none">
                  <input 
                    type="checkbox" 
                    checked={employeeForm.is_active}
                    onChange={(e) => setEmployeeForm({ ...employeeForm, is_active: e.target.checked })}
                    className="sr-only peer"
                  />
                  <div className="w-11 h-6 bg-gray-300 rounded-full peer peer-focus:outline-none peer-checked:bg-[#BD4F19] after:content-[''] after:absolute after:top-[2px] after:left-[2px] after:bg-white after:border-gray-300 after:border after:rounded-full after:h-5 after:w-5 after:transition-all peer-checked:after:translate-x-full peer-checked:after:border-white"></div>
                </label>
              </div>
            </form>

            {/* Footer */}
            <div className="p-6 border-t border-gray-100 flex items-center justify-between bg-white shrink-0">
              <button 
                type="button"
                onClick={() => setIsEmployeeDrawerOpen(false)}
                className="text-sm font-bold text-gray-400 hover:text-gray-650 transition-colors"
              >
                Annuler
              </button>
              
              <button 
                type="button"
                onClick={() => handleSaveEmployeeForm()}
                className="bg-[#BD4F19] hover:bg-[#A64B2A] text-white font-bold px-6 py-3 rounded-xl text-xs uppercase tracking-wider shadow-sm transition-all active:scale-98 flex items-center gap-2"
              >
                <Save size={14} />
                {employeeDrawerMode === 'create' ? 'Ajouter' : 'Enregistrer'}
              </button>
            </div>
          </div>
        </>
      )}

      {/* Slide-out Drawer Panel for Adding / Editing Meals */}
      {isDrawerOpen && (
        <>
          {/* Backdrop overlay */}
          <div 
            onClick={() => setIsDrawerOpen(false)}
            className="fixed inset-0 bg-black/35 backdrop-blur-xs z-40 transition-opacity duration-300"
          />

          {/* Drawer container */}
          <div className="fixed right-0 top-0 bottom-0 w-[440px] bg-white shadow-2xl z-50 border-l border-gray-200 flex flex-col justify-between animate-in slide-in-from-right duration-300 font-sans">
            {/* Header */}
            <div className="p-6 border-b border-gray-100 flex items-center justify-between">
              <h3 className="text-lg font-bold text-gray-900">
                {drawerMode === 'create' ? 'Ajouter un nouveau plat' : 'Modifier le plat'}
              </h3>
              <button 
                onClick={() => setIsDrawerOpen(false)}
                className="p-1.5 hover:bg-gray-100 rounded-full text-gray-400 hover:text-gray-650 transition-colors"
              >
                <X size={20} />
              </button>
            </div>

            {/* Form body */}
            <form onSubmit={(e) => { e.preventDefault(); handleSaveMealForm(); }} className="flex-1 p-6 overflow-y-auto space-y-6">
              {/* Photo du plat dropzone with dynamic preview */}
              <div className="flex flex-col gap-1.5">
                <span className="text-[10px] font-bold text-gray-400 uppercase tracking-wider">Photo du plat</span>
                <div 
                  onClick={() => document.getElementById('meal-image-upload')?.click()}
                  onDragOver={(e) => e.preventDefault()}
                  onDrop={(e) => {
                    e.preventDefault();
                    const file = e.dataTransfer.files?.[0];
                    if (file) {
                      const url = URL.createObjectURL(file);
                      setMealForm(prev => ({ ...prev, imageUrl: url }));
                    }
                  }}
                  className="h-44 w-full rounded-2xl border-2 border-dashed border-gray-250 overflow-hidden relative group cursor-pointer flex flex-col items-center justify-center text-center p-4 bg-cover bg-center transition-all hover:border-orange-200/50"
                  style={{ backgroundImage: `linear-gradient(rgba(0, 0, 0, 0.45), rgba(0, 0, 0, 0.55)), url(${mealForm.imageUrl || getMealImage(mealForm.name)})` }}
                >
                  <input 
                    type="file" 
                    id="meal-image-upload" 
                    accept="image/*" 
                    className="hidden" 
                    onChange={handleImageChange} 
                  />
                  <div className="flex flex-col items-center gap-2 text-white z-10 p-2">
                    <Send className="rotate-12 w-7 h-7 opacity-80" />
                    <p className="text-xs font-semibold leading-snug max-w-[200px]">
                      Glissez une photo appétissante ici ou cliquez pour parcourir
                    </p>
                  </div>
                </div>
              </div>

              {/* Nom du plat */}
              <div className="flex flex-col gap-1.5">
                <label className="text-[10px] font-bold text-gray-400 uppercase tracking-wider">Nom du plat</label>
                <input
                  type="text"
                  required
                  placeholder="ex: Babenda Tô ou Poulet Yassa"
                  value={mealForm.name}
                  onChange={e => setMealForm({ ...mealForm, name: e.target.value })}
                  className="w-full px-4 py-3 border border-gray-250 rounded-xl focus:ring-2 focus:ring-orange-500/20 focus:border-orange-500 outline-none text-sm font-semibold text-gray-700 bg-white"
                />
              </div>

              {/* Options de protéines Container Card */}
              <div className="bg-[#FBF9F1] border border-gray-200 rounded-2xl p-4 flex flex-col gap-4">
                <div className="flex items-center justify-between">
                  <div>
                    <h4 className="font-bold text-gray-900 text-sm">Options de protéines</h4>
                    <p className="text-[10px] text-gray-400 font-semibold mt-0.5">Ce plat propose-t-il des options ?</p>
                  </div>
                  
                  {/* Switch toggle */}
                  <label className="relative inline-flex items-center cursor-pointer select-none">
                    <input 
                      type="checkbox" 
                      checked={mealForm.has_options}
                      onChange={(e) => setMealForm({ ...mealForm, has_options: e.target.checked })}
                      className="sr-only peer"
                    />
                    <div className="w-11 h-6 bg-gray-300 rounded-full peer peer-focus:outline-none peer-checked:bg-orange-700 after:content-[''] after:absolute after:top-[2px] after:left-[2px] after:bg-white after:border-gray-300 after:border after:rounded-full after:h-5 after:w-5 after:transition-all peer-checked:after:translate-x-full peer-checked:after:border-white"></div>
                  </label>
                </div>

                {/* Protein Option tag list if checked */}
                {mealForm.has_options && (
                  <div className="flex flex-wrap gap-2 pt-3 border-t border-gray-200/50">
                    <span className="flex items-center gap-1.5 bg-orange-50 border border-orange-200 text-orange-750 text-orange-700 text-xs font-bold px-3 py-1 rounded-full">
                      Viande
                    </span>
                    <span className="flex items-center gap-1.5 bg-orange-50 border border-orange-200 text-orange-750 text-orange-700 text-xs font-bold px-3 py-1 rounded-full">
                      Poisson
                    </span>
                    <button 
                      type="button"
                      className="flex items-center gap-1.5 bg-white border border-gray-200 text-gray-500 hover:text-gray-700 text-xs font-bold px-3 py-1 rounded-full border-dashed"
                    >
                      + Ajouter une option
                    </button>
                  </div>
                )}
              </div>
            </form>

            {/* Footer */}
            <div className="p-6 border-t border-gray-100 flex items-center justify-between bg-white shrink-0">
              <button 
                type="button"
                onClick={() => setIsDrawerOpen(false)}
                className="text-sm font-bold text-gray-400 hover:text-gray-650 transition-colors"
              >
                Annuler
              </button>
              
              <button 
                type="button"
                onClick={() => handleSaveMealForm()}
                className="bg-orange-700 hover:bg-orange-850 text-white font-bold px-6 py-3 rounded-xl text-xs uppercase tracking-wider shadow-sm transition-all active:scale-98"
              >
                {drawerMode === 'create' ? 'Ajouter à la bibliothèque' : 'Enregistrer'}
              </button>
            </div>
          </div>
        </>
      )}

      {/* Create Site & Department Modal Popup */}
      {isCreateModalOpen && (
        <>
          {/* Backdrop overlay */}
          <div 
            onClick={closeCreateModal}
            className="fixed inset-0 bg-black/45 backdrop-blur-xs z-50 transition-opacity duration-300"
          />

          {/* Modal Container */}
          <div className="fixed inset-0 flex items-center justify-center z-50 p-4 animate-in fade-in zoom-in-95 duration-200">
            <div className="bg-white border border-[#E4E3DB] rounded-3xl w-full max-w-[480px] p-8 shadow-2xl flex flex-col gap-6 relative font-sans text-gray-800">
              
              {/* Title Section */}
              <div className="flex items-center gap-3">
                <div className="w-11 h-11 rounded-full bg-[#FCE4D6] text-[#BD4F19] flex items-center justify-center shrink-0">
                  {createModalActiveTab === 'site' ? <Building2 size={20} /> : <Folder size={20} />}
                </div>
                <h3 className="text-xl font-bold text-gray-900 leading-tight">
                  {createModalActiveTab === 'site'
                    ? (createModalMode === 'edit' ? 'Modifier le Bureau / Site' : 'Créer un nouveau Bureau / Site')
                    : (createModalMode === 'edit' ? 'Modifier le Département' : 'Créer un nouveau Département')}
                </h3>
              </div>

              {/* Navigation Tabs — creation only */}
              {createModalMode === 'create' && (
                <div className="bg-[#F5F4EC] p-1.5 rounded-2xl flex items-center gap-1 border border-[#E4E3DB]/60">
                  <button
                    type="button"
                    onClick={() => setCreateModalActiveTab('site')}
                    className={`flex-1 py-2.5 text-center text-xs font-bold rounded-xl transition-all ${
                      createModalActiveTab === 'site'
                        ? 'bg-white text-[#BD4F19] shadow-xs'
                        : 'text-gray-500 hover:text-gray-850'
                    }`}
                  >
                    Nouveau Site
                  </button>
                  <button
                    type="button"
                    onClick={() => setCreateModalActiveTab('department')}
                    className={`flex-1 py-2.5 text-center text-xs font-bold rounded-xl transition-all ${
                      createModalActiveTab === 'department'
                        ? 'bg-white text-[#BD4F19] shadow-xs'
                        : 'text-gray-500 hover:text-gray-855'
                    }`}
                  >
                    Nouveau Département
                  </button>
                </div>
              )}

              {/* Form Content */}
              {createModalActiveTab === 'site' ? (
                /* Site Form */
                <div className="flex flex-col gap-4">
                  <div className="flex flex-col gap-1.5">
                    <label className="text-[10px] font-bold text-gray-400 uppercase tracking-widest">Nom du site</label>
                    <input
                      type="text"
                      placeholder="ex: Siège principal, Annexe Ouaga 2000"
                      value={newSiteName}
                      onChange={(e) => setNewSiteName(e.target.value)}
                      className="w-full px-4 py-3 bg-[#FBF9F1] border border-[#E4E3DB] rounded-xl focus:bg-white focus:ring-2 focus:ring-orange-500/20 focus:border-orange-500 outline-none text-sm font-semibold text-gray-700 placeholder-gray-400"
                    />
                  </div>

                  <div className="flex flex-col gap-1.5">
                    <label className="text-[10px] font-bold text-gray-400 uppercase tracking-widest">Description ou adresse</label>
                    <textarea
                      placeholder="Saisissez l'adresse physique complète ou une brève description du site..."
                      rows={3}
                      value={newSiteAddress}
                      onChange={(e) => setNewSiteAddress(e.target.value)}
                      className="w-full px-4 py-3 bg-[#FBF9F1] border border-[#E4E3DB] rounded-xl focus:bg-white focus:ring-2 focus:ring-orange-500/20 focus:border-orange-500 outline-none text-sm font-semibold text-gray-750 placeholder-gray-400"
                    />
                  </div>
                </div>
              ) : (
                /* Department Form */
                <div className="flex flex-col gap-4">
                  <div className="flex flex-col gap-1.5">
                    <label className="text-[10px] font-bold text-gray-400 uppercase tracking-widest">Nom du département</label>
                    <input
                      type="text"
                      placeholder="ex: Ressources Humaines, Marketing, IT"
                      value={newDeptName}
                      onChange={(e) => setNewDeptName(e.target.value)}
                      className="w-full px-4 py-3 bg-[#FBF9F1] border border-[#E4E3DB] rounded-xl focus:bg-white focus:ring-2 focus:ring-orange-500/20 focus:border-orange-500 outline-none text-sm font-semibold text-gray-700 placeholder-gray-400"
                    />
                  </div>

                  <div className="flex flex-col gap-1.5">
                    <label className="text-[10px] font-bold text-gray-400 uppercase tracking-widest">Rattacher au site</label>
                    <div className="relative">
                      <select
                        value={newDeptSiteId}
                        onChange={(e) => setNewDeptSiteId(e.target.value)}
                        className="w-full pl-4 pr-10 py-3 bg-[#FBF9F1] border border-[#E4E3DB] rounded-xl focus:bg-white focus:border-orange-500 outline-none text-sm font-semibold text-gray-750 cursor-pointer appearance-none"
                      >
                        {sites.map(s => (
                          <option key={s.id} value={s.id}>{s.name}</option>
                        ))}
                      </select>
                      <ChevronRight className="absolute right-3.5 top-1/2 -translate-y-1/2 text-gray-400 rotate-90 pointer-events-none" size={16} />
                    </div>
                  </div>
                </div>
              )}

              {/* Action Buttons */}
              <div className="flex items-center justify-end gap-6 pt-2">
                <button
                  type="button"
                  onClick={closeCreateModal}
                  className="text-sm font-bold text-gray-400 hover:text-gray-650 transition-colors"
                >
                  Annuler
                </button>
                <button
                  type="button"
                  onClick={handleCreateConfirm}
                  className="bg-[#BD4F19] hover:bg-[#A64B2A] text-white font-bold px-6 py-3 rounded-xl text-xs flex items-center gap-2 transition-all shadow-md active:scale-98"
                >
                  {createModalMode === 'edit'
                    ? 'Enregistrer'
                    : (createModalActiveTab === 'site' ? 'Créer le site' : 'Créer le département')}
                  <span>→</span>
                </button>
              </div>

            </div>
          </div>
        </>
      )}

      <ConfirmModal
        isOpen={modalConfig.isOpen}
        title={modalConfig.title}
        message={modalConfig.message}
        type={modalConfig.type}
        confirmText={modalConfig.confirmText}
        onConfirm={modalConfig.onConfirm}
        onCancel={() => setModalConfig(prev => ({ ...prev, isOpen: false }))}
      />

      {isReportModalOpen && (
        <HistoryReportModal
          orderHistory={orderHistory}
          onClose={() => setIsReportModalOpen(false)}
        />
      )}
    </div>
  );
}
