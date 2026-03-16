import { useState } from 'react';
import { supabase, type Employee, type Meal, type Settings as Config } from '../lib/supabase';
import { Trash2, Users, Utensils, Save, X, LayoutDashboard, Settings as SettingsIcon, Clock, Plus, Search, Send } from 'lucide-react';
import ConfirmModal from './ConfirmModal';

interface AdminDashboardProps {
  employees: Employee[];
  meals: Meal[];
  config: Config | null;
  onDataUpdate: () => void;
  onClose: () => void;
}

export default function AdminDashboard({ employees, meals, config, onDataUpdate, onClose }: AdminDashboardProps) {
  const [activeTab, setActiveTab] = useState<'meals' | 'employees' | 'settings'>('meals');
  const [editingMeal, setEditingMeal] = useState<{ id: string, name: string, has_options: boolean } | null>(null);
  const [newMeal, setNewMeal] = useState({ name: '', has_options: false });
  const [newEmployee, setNewEmployee] = useState({ name: '', site: 'Bureau 1', department: '' });
  const [showBulkImport, setShowBulkImport] = useState(false);
  const [showMealBulkImport, setShowMealBulkImport] = useState(false);
  const [bulkText, setBulkText] = useState('');
  const [mealBulkText, setMealBulkText] = useState('');
  const [mealSearchTerm, setMealSearchTerm] = useState('');
  const [showNewMealForm, setShowNewMealForm] = useState(false);
  const [isPublishing, setIsPublishing] = useState(false);
  const [newLockTime, setNewLockTime] = useState(config?.lock_time || '18:00');
  const [newPassword, setNewPassword] = useState(config?.admin_password || '');
  const [showPassword, setShowPassword] = useState(false);
  const [modalConfig, setModalConfig] = useState<{
    isOpen: boolean;
    title: string;
    message: string;
    type?: 'confirm' | 'alert' | 'danger';
    confirmText?: string;
    onConfirm: () => void;
  }>({
    isOpen: false,
    title: '',
    message: '',
    onConfirm: () => {},
  });
  
  const existingDepartments = [...new Set(employees.map(e => e.department).filter(Boolean))].sort();

  const handleUpdateMeal = async () => {
    if (!editingMeal) return;
    try {
      await supabase.from('meals')
        .update({ 
          name: editingMeal.name,
          has_options: editingMeal.has_options 
        })
        .eq('id', editingMeal.id);
      setEditingMeal(null);
      onDataUpdate();
    } catch (e: any) {
      console.error(e);
      setModalConfig({
        isOpen: true,
        title: 'Erreur',
        message: `Erreur lors de la mise à jour : ${e.message || 'Problème de permission (RLS)'}`,
        type: 'danger',
        onConfirm: () => setModalConfig(prev => ({ ...prev, isOpen: false }))
      });
    }
  };

  const handleAddMeal = async () => {
    if (!newMeal.name.trim()) return;
    try {
      await supabase.from('meals').insert(newMeal);
      setNewMeal({ name: '', has_options: false });
      setShowNewMealForm(false);
      setMealSearchTerm('');
      onDataUpdate();
      setModalConfig({
        isOpen: true,
        title: 'Plat ajouté',
        message: 'Le nouveau plat a été ajouté au menu avec succès.',
        type: 'alert',
        onConfirm: () => setModalConfig(prev => ({ ...prev, isOpen: false }))
      });
    } catch (e) {
      console.error(e);
    }
  };

  const handleToggleMealActive = async (id: string, currentStatus: boolean) => {
    try {
      await supabase.from('meals').update({ is_active: !currentStatus }).eq('id', id);
      onDataUpdate();
    } catch (e) {
      console.error(e);
    }
  };

  const handleDeselectAllMeals = async () => {
    try {
      await supabase.from('meals').update({ is_active: false }).neq('id', '00000000-0000-0000-0000-000000000000'); // Standard way to update all rows
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
        message: 'Aucun plat valide trouvé. Utilisez le format: Nom; oui/non',
        type: 'danger',
        onConfirm: () => setModalConfig(prev => ({ ...prev, isOpen: false }))
      });
      return;
    }

    try {
      const { error } = await supabase.from('meals').insert(mealsToInsert);
      if (error) throw error;
      
      setMealBulkText('');
      setMealSearchTerm(''); // Reset search to see new items
      setShowMealBulkImport(false);
      onDataUpdate();
      setModalConfig({
        isOpen: true,
        title: 'Importation réussie',
        message: `${mealsToInsert.length} plats ajoutés à la bibliothèque ! N'oubliez pas de les cocher pour les afficher au menu du jour.`,
        type: 'alert',
        onConfirm: () => setModalConfig(prev => ({ ...prev, isOpen: false }))
      });
    } catch (e: any) {
      console.error(e);
      setModalConfig({
        isOpen: true,
        title: "Échec de l'importation",
        message: `Une erreur est survenue : ${e.message || 'Problème de connexion ou de permissions'}`,
        type: 'danger',
        onConfirm: () => setModalConfig(prev => ({ ...prev, isOpen: false }))
      });
    }
  };

  const handlePublishMenu = async () => {
    setModalConfig({
      isOpen: true,
      title: 'Publier le Menu ?',
      message: 'Attention : cela va déverrouiller le tableau pour tout le monde et EFFACER TOUTES LES COMMANDES d\'aujourd\'hui pour démarrer une nouvelle session.',
      type: 'confirm',
      confirmText: 'Oui, Publier et Réinitialiser',
      onConfirm: async () => {
        setIsPublishing(true);
        try {
          const today = new Date().toISOString().split('T')[0];
          
          // 1. Mettre à jour la date de publication (déverrouille l'app)
          const { error: settingsError } = await supabase
            .from('settings')
            .update({ last_publish_date: today })
            .eq('id', 'config');
          
          if (settingsError) throw settingsError;

          // 2. Supprimer les commandes du jour
          const { error: ordersError } = await supabase
            .from('orders')
            .delete()
            .eq('order_date', today);
          
          if (ordersError) throw ordersError;

          onDataUpdate();
          setModalConfig(prev => ({ ...prev, isOpen: false }));
        } catch (e: any) {
          console.error(e);
          setModalConfig({
            isOpen: true,
            title: 'Erreur lors de la publication',
            message: e.message,
            type: 'danger',
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
      title: 'Supprimer le plat ?',
      message: `Voulez-vous vraiment supprimer "${name}" du menu ? Cela supprimera aussi les commandes liées à ce plat aujourd'hui.`,
      type: 'danger',
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
            title: 'Échec de la suppression',
            message: `Impossible de supprimer le plat. ${e.message === 'new row violates row-level security policy for table "meals"' ? 'Problème de permissions (RLS).' : e.message}`,
            type: 'danger',
            onConfirm: () => setModalConfig(prev => ({ ...prev, isOpen: false }))
          });
        }
      }
    });
  };

  const handleAddEmployee = async () => {
    if (!newEmployee.name) return;
    try {
      await supabase.from('employees').insert({
        name: newEmployee.name,
        site: newEmployee.site,
        department: newEmployee.department
      });
      setNewEmployee({ name: '', site: 'Bureau 1', department: '' });
      onDataUpdate();
    } catch (e) {
      console.error(e);
    }
  };

  const handleBulkImport = async () => {
    const lines = bulkText.split('\n').filter(line => line.trim());
    const employeesToInsert = lines.map(line => {
      const parts = line.split(';');
      const name = parts[0]?.trim();
      const site = parts[1]?.trim() || 'Bureau 1';
      const department = parts[2]?.trim() || '';
      if (!name) return null;
      return { name, site, department };
    }).filter(Boolean);

    if (employeesToInsert.length === 0) return;

    try {
      await supabase.from('employees').insert(employeesToInsert);
      setBulkText('');
      setShowBulkImport(false);
      onDataUpdate();
      setModalConfig({
        isOpen: true,
        title: 'Importation réussie',
        message: `${employeesToInsert.length} personnes ajoutées avec succès !`,
        type: 'alert',
        onConfirm: () => setModalConfig(prev => ({ ...prev, isOpen: false }))
      });
    } catch (e) {
      console.error(e);
      setModalConfig({
        isOpen: true,
        title: 'Erreur',
        message: "Erreur lors de l'importation. Vérifiez le format.",
        type: 'danger',
        onConfirm: () => setModalConfig(prev => ({ ...prev, isOpen: false }))
      });
    }
  };

  const handleDeleteEmployee = async (id: string) => {
    setModalConfig({
      isOpen: true,
      title: 'Supprimer ?',
      message: 'Voulez-vous vraiment supprimer cette personne du système ?',
      type: 'danger',
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
            title: 'Échec de la suppression',
            message: `Impossible de supprimer la personne. ${e.message === 'new row violates row-level security policy for table "employees"' ? 'Problème de permissions (RLS).' : e.message}`,
            type: 'danger',
            onConfirm: () => setModalConfig(prev => ({ ...prev, isOpen: false }))
          });
        }
      }
    });
  };

  const handleUpdateSettings = async () => {
    try {
      await supabase.from('settings').update({ 
        lock_time: newLockTime,
        admin_password: newPassword
      }).eq('id', 'config');
      onDataUpdate();
      setModalConfig({
        isOpen: true,
        title: 'Succès',
        message: 'Paramètres mis à jour avec succès !',
        type: 'alert',
        onConfirm: () => setModalConfig(prev => ({ ...prev, isOpen: false }))
      });
    } catch (e) {
      console.error(e);
    }
  };


  return (
    <div className="fixed inset-0 bg-slate-900/50 backdrop-blur-sm z-50 flex items-center justify-center p-4">
      <div className="bg-white rounded-2xl shadow-2xl w-full max-w-4xl max-h-[90vh] overflow-hidden flex flex-col">
        <div className="p-6 border-b border-slate-100 flex items-center justify-between bg-slate-50">
          <div className="flex items-center gap-3">
            <LayoutDashboard className="text-indigo-600" size={28} />
            <h2 className="text-2xl font-bold text-slate-800">Interface Administrateur</h2>
          </div>
          <button onClick={onClose} className="p-2 hover:bg-slate-200 rounded-full transition-colors">
            <X size={24} className="text-slate-500" />
          </button>
        </div>

        <div className="flex border-b border-slate-100">
          <button
            onClick={() => setActiveTab('meals')}
            className={`px-8 py-4 font-semibold transition-all ${activeTab === 'meals' ? 'text-indigo-600 border-b-2 border-indigo-600' : 'text-slate-500 hover:text-slate-700'}`}
          >
            <div className="flex items-center gap-2">
              <Utensils size={20} /> Gestion du Menu
            </div>
          </button>
          <button
            onClick={() => setActiveTab('employees')}
            className={`px-8 py-4 font-semibold transition-all ${activeTab === 'employees' ? 'text-indigo-600 border-b-2 border-indigo-600' : 'text-slate-500 hover:text-slate-700'}`}
          >
            <div className="flex items-center gap-2">
              <Users size={20} /> Personnes
            </div>
          </button>
          <button
            onClick={() => setActiveTab('settings')}
            className={`px-8 py-4 font-semibold transition-all ${activeTab === 'settings' ? 'text-indigo-600 border-b-2 border-indigo-600' : 'text-slate-500 hover:text-slate-700'}`}
          >
            <div className="flex items-center gap-2">
              <SettingsIcon size={20} /> Paramètres
            </div>
          </button>
        </div>

        <div className="flex-1 overflow-y-auto p-8">
          {activeTab === 'meals' ? (
            <div className="space-y-6">
              <div className="flex justify-between items-center bg-amber-50 rounded-xl p-4 border border-amber-100">
                <p className="text-amber-800 text-sm">
                  Cochez les plats à afficher pour aujourd'hui. Une fois terminé, cliquez sur <strong>"Publier le Menu"</strong>.
                </p>
                <div className="flex items-center gap-6">
                  <button 
                    onClick={handlePublishMenu}
                    disabled={isPublishing}
                    className="flex items-center gap-2 bg-emerald-600 text-white px-4 py-2 rounded-lg font-black text-xs uppercase tracking-widest hover:bg-emerald-700 shadow-md transition-all active:scale-95 disabled:opacity-50"
                  >
                    <Send size={14} strokeWidth={3} />
                    Publier le Menu
                  </button>
                  <div className="w-px h-6 bg-amber-200"></div>
                  <div className="flex items-center gap-4">
                  <button 
                    onClick={handleDeselectAllMeals}
                    className="text-slate-400 hover:text-red-500 text-xs font-black uppercase tracking-widest transition-colors"
                  >
                    Tout débloquer
                  </button>
                  <button 
                    onClick={() => setShowMealBulkImport(!showMealBulkImport)}
                    className="text-indigo-600 hover:underline text-xs font-black uppercase tracking-widest"
                  >
                    {showMealBulkImport ? "Retour" : "Import Bulk Plats"}
                  </button>
                </div>
              </div>
            </div>

            {showMealBulkImport ? (
                <div className="bg-slate-50 p-6 rounded-2xl border-2 border-dashed border-indigo-100 space-y-4">
                  <div>
                    <p className="text-sm font-bold text-slate-700 mb-2">Importer une liste de plats :</p>
                    <p className="text-xs text-slate-500 mb-4 italic">Format: Nom du plat; Option Viande/Poisson (oui/non)</p>
                    <textarea 
                      className="w-full h-48 p-4 rounded-xl border border-slate-200 focus:ring-2 focus:ring-indigo-300 outline-none font-mono text-sm"
                      placeholder="Riz au gras; oui&#10;Benga; non&#10;Spaghetti; oui"
                      value={mealBulkText}
                      onChange={e => setMealBulkText(e.target.value)}
                    />
                  </div>
                  <div className="flex justify-end gap-3">
                    <button onClick={() => setShowMealBulkImport(false)} className="px-6 py-2 rounded-lg text-slate-600 hover:bg-slate-100">
                      Annuler
                    </button>
                    <button onClick={handleMealBulkImport} className="px-6 py-2 rounded-lg bg-indigo-600 text-white font-bold hover:bg-indigo-700 shadow-md">
                      Importer la bibliothèque
                    </button>
                  </div>
                </div>
              ) : (
                <div className="grid gap-4">
                  {/* Nouveau Plat - Collapsible */}
                  {!showNewMealForm ? (
                    <button 
                      onClick={() => setShowNewMealForm(true)}
                      className="flex items-center justify-center gap-2 p-4 bg-indigo-50 border-2 border-dashed border-indigo-200 rounded-xl text-indigo-600 font-black hover:bg-indigo-100 transition-all group"
                    >
                      <Plus size={20} strokeWidth={3} className="group-hover:scale-110 transition-transform" />
                      AJOUTER UN NOUVEAU PLAT À LA BIBLIOTHÈQUE
                    </button>
                  ) : (
                    <div className="bg-indigo-50 p-6 rounded-2xl border-2 border-indigo-200 space-y-4 animate-in slide-in-from-top-4 duration-300">
                      <div className="flex items-center justify-between mb-2">
                        <h4 className="text-sm font-black text-indigo-900 uppercase">Nouveau Plat</h4>
                        <button onClick={() => setShowNewMealForm(false)} className="text-indigo-400 hover:text-indigo-600">
                          <X size={20} />
                        </button>
                      </div>
                      <div className="flex flex-col gap-4">
                        <input
                          autoFocus
                          placeholder="Nom du plat (ex: Riz au gras)"
                          className="w-full px-4 py-3 rounded-xl border-2 border-indigo-100 focus:border-indigo-300 outline-none font-bold text-slate-700 bg-white"
                          value={newMeal.name}
                          onChange={e => setNewMeal({ ...newMeal, name: e.target.value })}
                        />
                        <div className="flex items-center justify-between">
                          <label className="flex items-center gap-3 text-sm font-bold text-indigo-600 cursor-pointer select-none">
                            <div className="relative flex items-center">
                              <input
                                type="checkbox"
                                checked={newMeal.has_options}
                                onChange={e => setNewMeal({ ...newMeal, has_options: e.target.checked })}
                                className="peer h-5 w-5 cursor-pointer appearance-none rounded-md border-2 border-indigo-200 transition-all checked:bg-indigo-600 checked:border-indigo-600"
                              />
                              <Plus className="absolute h-3.5 w-3.5 text-white opacity-0 peer-checked:opacity-100 pointer-events-none left-0.5" strokeWidth={5} />
                            </div>
                            PROPOSER OPTION VIANDE/POISSON
                          </label>
                          <button
                            onClick={handleAddMeal}
                            disabled={!newMeal.name.trim()}
                            className="bg-indigo-600 text-white px-8 py-3 rounded-xl font-black hover:bg-indigo-700 disabled:opacity-50 transition-all shadow-lg shadow-indigo-100"
                          >
                            ENREGISTRER LE PLAT
                          </button>
                        </div>
                      </div>
                    </div>
                  )}

                  {/* Barre de recherche des plats - Now below creation */}
                  <div className="relative group">
                    <Search size={18} className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400 group-focus-within:text-indigo-600 transition-colors" />
                    <input 
                      type="text"
                      placeholder="Rechercher un plat dans la bibliothèque..."
                      value={mealSearchTerm}
                      onChange={(e) => setMealSearchTerm(e.target.value)}
                      className="pl-9 pr-4 py-3 bg-white border border-slate-200 rounded-xl focus:ring-2 focus:ring-indigo-300 outline-none w-full text-sm font-medium transition-all shadow-sm"
                    />
                  </div>

                  <div className="flex items-center gap-2 my-2 text-[10px] font-black text-slate-400 uppercase tracking-widest">
                  <div className="flex-1 h-px bg-slate-100"></div>
                  Bibliothèque de Plats ({meals.filter(m => m.name.toLowerCase().includes(mealSearchTerm.toLowerCase())).length})
                  <div className="flex-1 h-px bg-slate-100"></div>
                </div>

                {meals
                  .filter(meal => meal.name.toLowerCase().includes(mealSearchTerm.toLowerCase()))
                  .map(meal => (
                  <div key={meal.id} className={`flex items-center gap-4 p-4 rounded-xl border transition-all group ${meal.is_active ? 'bg-indigo-50 border-indigo-200 shadow-indigo-50' : 'bg-white border-slate-200 shadow-sm hover:shadow-md'}`}>
                    <div 
                      className="flex-shrink-0 cursor-pointer"
                      onClick={() => handleToggleMealActive(meal.id, meal.is_active || false)}
                    >
                      <div className={`w-6 h-6 rounded-lg border-2 flex items-center justify-center transition-all ${meal.is_active ? 'bg-indigo-600 border-indigo-600 text-white scale-110' : 'bg-white border-slate-300 text-transparent'}`}>
                        <Plus size={14} strokeWidth={4} />
                      </div>
                    </div>
                    <div 
                      className="flex-1 cursor-pointer"
                      onClick={() => handleToggleMealActive(meal.id, meal.is_active || false)}
                    >
                      {editingMeal?.id === meal.id ? (
                        <div className="flex flex-col gap-2">
                          <input
                            autoFocus
                            className="w-full px-3 py-2 rounded border-2 border-indigo-300 focus:ring-0 outline-none font-bold text-slate-800"
                            value={editingMeal.name}
                            onChange={e => setEditingMeal({ ...editingMeal, name: e.target.value })}
                          />
                          <label className="flex items-center gap-2 text-xs font-bold text-indigo-600 cursor-pointer">
                            <input
                              type="checkbox"
                              checked={editingMeal.has_options}
                              onChange={e => setEditingMeal({ ...editingMeal, has_options: e.target.checked })}
                              className="rounded text-indigo-600 focus:ring-indigo-500"
                            />
                            ACTIVER OPTIONS VIANDE/POISSON
                          </label>
                        </div>
                      ) : (
                        <div className="flex flex-col">
                          <span className="font-extrabold text-slate-800 text-lg">{meal.name}</span>
                          {meal.has_options && (
                            <span className="w-fit mt-1 text-[10px] bg-emerald-50 text-emerald-600 px-2 py-0.5 rounded-md font-black uppercase tracking-tighter">
                              Options Viande/Poisson incluses
                            </span>
                          )}
                        </div>
                      )}
                    </div>
                    <div className="flex gap-2">
                      {editingMeal?.id === meal.id ? (
                        <>
                          <button onClick={handleUpdateMeal} className="p-2 bg-emerald-500 text-white rounded-lg hover:bg-emerald-600 shadow-lg shadow-emerald-100 transition-all">
                            <Save size={20} />
                          </button>
                          <button onClick={() => setEditingMeal(null)} className="p-2 bg-slate-100 text-slate-500 rounded-lg hover:bg-slate-200 transition-all">
                            <X size={20} />
                          </button>
                        </>
                      ) : (
                        <div className="flex gap-1 opacity-0 group-hover:opacity-100 transition-opacity">
                          <button onClick={() => setEditingMeal({ id: meal.id, name: meal.name, has_options: meal.has_options || false })} className="p-2 text-indigo-600 hover:bg-indigo-50 rounded-lg font-bold text-sm">
                            Modifier
                          </button>
                          <button onClick={() => handleDeleteMeal(meal.id, meal.name)} className="p-2 text-red-500 hover:bg-red-50 rounded-lg">
                            <Trash2 size={20} />
                          </button>
                        </div>
                      )}
                    </div>
                  </div>
                ))}
              </div>
            )}
            </div>
          ) : activeTab === 'employees' ? (
            <div className="space-y-6">
              <div className="flex justify-between items-center mb-4">
                <h3 className="text-lg font-semibold text-slate-700">Gestion des personnes</h3>
                <button 
                  onClick={() => setShowBulkImport(!showBulkImport)}
                  className="text-indigo-600 hover:underline text-sm font-medium"
                >
                  {showBulkImport ? "Retour au mode normal" : "Ajouter plusieurs personnes (Import Bulk)"}
                </button>
              </div>

              {showBulkImport ? (
                <div className="bg-slate-50 p-6 rounded-2xl border-2 border-dashed border-indigo-100 space-y-4">
                  <div>
                    <p className="text-sm font-bold text-slate-700 mb-2">Collez votre liste ici :</p>
                    <p className="text-xs text-slate-500 mb-4 italic">Format: Nom; Bureau; Département (Ex: Jean Dupont; Bureau 1; RH)</p>
                    <textarea 
                      className="w-full h-48 p-4 rounded-xl border border-slate-200 focus:ring-2 focus:ring-indigo-300 outline-none font-mono text-sm"
                      placeholder="Jean Dupont; Bureau 1; RH&#10;Marie Durand; Bureau 2; Informatique"
                      value={bulkText}
                      onChange={e => setBulkText(e.target.value)}
                    />
                  </div>
                  <div className="flex justify-end gap-3">
                    <button onClick={() => setShowBulkImport(false)} className="px-6 py-2 rounded-lg text-slate-600 hover:bg-slate-100">
                      Annuler
                    </button>
                    <button onClick={handleBulkImport} className="px-6 py-2 rounded-lg bg-indigo-600 text-white font-bold hover:bg-indigo-700 shadow-md">
                      Démarrer l'importation
                    </button>
                  </div>
                </div>
              ) : (
                <>
                  <div className="grid grid-cols-4 gap-4 p-4 bg-indigo-50 rounded-xl border border-indigo-100">
                    <input
                      placeholder="Nom"
                      className="px-4 py-2 rounded-lg border focus:ring-2 focus:ring-indigo-300 outline-none"
                      value={newEmployee.name}
                      onChange={e => setNewEmployee({ ...newEmployee, name: e.target.value })}
                    />
                    <select
                      className="px-4 py-2 rounded-lg border focus:ring-2 focus:ring-indigo-300 outline-none"
                      value={newEmployee.site}
                      onChange={e => setNewEmployee({ ...newEmployee, site: e.target.value })}
                    >
                      <option value="Bureau 1">Bureau 1</option>
                      <option value="Bureau 2">Bureau 2</option>
                    </select>
                    <input
                      placeholder="Département"
                      className="px-4 py-2 rounded-lg border focus:ring-2 focus:ring-indigo-300 outline-none"
                      value={newEmployee.department}
                      onChange={e => setNewEmployee({ ...newEmployee, department: e.target.value })}
                      list="dept-list"
                    />
                    <datalist id="dept-list">
                      {existingDepartments.map(dept => <option key={dept} value={dept} />)}
                    </datalist>
                    <button onClick={handleAddEmployee} className="bg-indigo-600 text-white rounded-lg font-bold hover:bg-indigo-700">
                      Ajouter
                    </button>
                  </div>

                  <div className="overflow-hidden rounded-xl border border-slate-100">
                    <table className="w-full text-left">
                      <thead className="bg-slate-50 text-slate-500 text-xs uppercase">
                        <tr>
                          <th className="px-6 py-4">Nom</th>
                          <th className="px-6 py-4">Bureau</th>
                          <th className="px-6 py-4">Département</th>
                          <th className="px-6 py-4">Actions</th>
                        </tr>
                      </thead>
                      <tbody className="divide-y divide-slate-100">
                        {employees.map(emp => (
                          <tr key={emp.id} className="hover:bg-slate-50 transition-colors">
                            <td className="px-6 py-4 font-medium">{emp.name}</td>
                            <td className="px-6 py-4 text-xs font-bold text-slate-400">{emp.site || 'Bureau 1'}</td>
                            <td className="px-6 py-4 text-slate-600">{emp.department || '-'}</td>
                            <td className="px-6 py-4">
                              <button onClick={() => handleDeleteEmployee(emp.id)} className="text-red-500 hover:text-red-700 p-2">
                                <Trash2 size={18} />
                              </button>
                            </td>
                          </tr>
                        ))}
                      </tbody>
                    </table>
                  </div>
                </>
              )}
            </div>
          ) : (
            <div className="space-y-8 max-w-lg mx-auto py-12">
              <div className="bg-indigo-50 p-8 rounded-3xl border border-indigo-100 shadow-sm">
                <h3 className="text-xl font-bold text-slate-800 mb-6 flex items-center gap-3">
                  <Clock className="text-indigo-600" />
                  Verrouillage Automatique
                </h3>
                
                <div className="space-y-6">
                  <div>
                    <label className="block text-sm font-bold text-slate-600 mb-2">
                      Heure de clôture des commandes
                    </label>
                    <input
                      type="time"
                      value={newLockTime}
                      onChange={e => setNewLockTime(e.target.value)}
                      className="w-full px-6 py-4 rounded-2xl border-2 border-white bg-white shadow-sm focus:border-indigo-300 outline-none text-xl font-black text-slate-700"
                    />
                    <p className="mt-3 text-xs text-slate-500 leading-relaxed">
                      Passé cette heure, le tableau se verrouille automatiquement et personne ne peut plus modifier ses choix.
                    </p>
                  </div>

                  <div className="pt-6 border-t border-indigo-100">
                    <label className="block text-sm font-bold text-slate-600 mb-2">
                      Mot de passe Administrateur
                    </label>
                    <div className="relative">
                      <input
                        type={showPassword ? "text" : "password"}
                        value={newPassword}
                        onChange={e => setNewPassword(e.target.value)}
                        placeholder="Nouveau mot de passe"
                        className="w-full px-6 py-4 rounded-2xl border-2 border-white bg-white shadow-sm focus:border-indigo-300 outline-none text-lg font-bold text-slate-700 pr-14"
                      />
                      <button 
                        type="button"
                        onClick={() => setShowPassword(!showPassword)}
                        className="absolute right-4 top-1/2 -translate-y-1/2 p-2 text-slate-400 hover:text-indigo-600 transition-colors"
                      >
                        {showPassword ? <X size={20} /> : <SettingsIcon size={20} />}
                      </button>
                    </div>
                    <p className="mt-3 text-xs text-slate-500 leading-relaxed">
                      Ce mot de passe sera demandé pour accéder à cette interface. Par défaut : <strong>1234</strong>.
                    </p>
                  </div>

                  <button
                    onClick={handleUpdateSettings}
                    className="w-full bg-indigo-600 text-white py-4 rounded-2xl font-bold shadow-lg shadow-indigo-100 hover:bg-indigo-700 transition-all transform hover:-translate-y-1 mt-4 flex items-center justify-center gap-2"
                  >
                    <Save size={20} />
                    Enregistrer les paramètres
                  </button>
                </div>
              </div>

              <div className="p-6 rounded-2xl bg-slate-50 border border-slate-200">
                <p className="text-xs text-slate-400 text-center italic">
                  Note: Publier le menu déverrouille automatiquement le tableau pour la journée.
                </p>
              </div>
            </div>
          )}
        </div>
      </div>

      <ConfirmModal
        isOpen={modalConfig.isOpen}
        title={modalConfig.title}
        message={modalConfig.message}
        type={modalConfig.type}
        onConfirm={modalConfig.onConfirm}
        onCancel={() => setModalConfig(prev => ({ ...prev, isOpen: false }))}
      />
    </div>
  );
}
