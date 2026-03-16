import { useState } from 'react';
import { supabase, type Employee, type Meal, type Settings as Config } from '../lib/supabase';
import { Trash2, Users, Utensils, Save, X, LayoutDashboard, Settings as SettingsIcon, Clock } from 'lucide-react';
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
  const [newEmployee, setNewEmployee] = useState({ name: '', site: 'Site 1', department: '' });
  const [isPublishing, setIsPublishing] = useState(false);
  const [showBulkImport, setShowBulkImport] = useState(false);
  const [bulkText, setBulkText] = useState('');
  const [newLockTime, setNewLockTime] = useState(config?.lock_time || '18:00');
  const [modalConfig, setModalConfig] = useState<{
    isOpen: boolean;
    title: string;
    message: string;
    type?: 'confirm' | 'alert' | 'danger';
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
    } catch (e) {
      console.error(e);
    }
  };

  const handleAddEmployee = async () => {
    if (!newEmployee.name) return;
    try {
      await supabase.from('employees').insert({
        name: newEmployee.name,
        site: newEmployee.site,
        department: newEmployee.department
      });
      setNewEmployee({ name: '', site: 'Site 1', department: '' });
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
      const site = parts[1]?.trim() || 'Site 1';
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
          await supabase.from('employees').delete().eq('id', id);
          onDataUpdate();
        } catch (e) {
          console.error(e);
        }
        setModalConfig(prev => ({ ...prev, isOpen: false }));
      }
    });
  };

  const handleUpdateSettings = async () => {
    try {
      await supabase.from('settings').update({ lock_time: newLockTime }).eq('id', 'config');
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

  const handlePublishMenu = async () => {
    setModalConfig({
      isOpen: true,
      title: 'Publier le menu ?',
      message: 'Cela effacera toutes les commandes actuelles et déverrouillera le tableau pour aujourd\'hui.',
      onConfirm: async () => {
        setIsPublishing(true);
        try {
          const today = new Date().toISOString().split('T')[0];
          await supabase.from('orders').delete().eq('order_date', today);
          await supabase.from('settings').update({ last_publish_date: today }).eq('id', 'config');
          onDataUpdate();
          setModalConfig({
            isOpen: true,
            title: 'Menu publié',
            message: 'Le tableau est maintenant ouvert aux commandes.',
            type: 'alert',
            onConfirm: () => setModalConfig(prev => ({ ...prev, isOpen: false }))
          });
        } catch (e) {
          console.error(e);
        } finally {
          setIsPublishing(false);
        }
      }
    });
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
              <div className="bg-amber-50 rounded-xl p-4 border border-amber-100 text-amber-800 text-sm">
                Modifiez les plats du jour ici. Une fois terminé, cliquez sur <strong>"Publier le Menu"</strong> pour ouvrir les commandes.
              </div>
              <div className="grid gap-4">
                {meals.map(meal => (
                  <div key={meal.id} className="flex items-center gap-4 p-4 bg-slate-50 rounded-lg border border-slate-100">
                    <div className="flex-1">
                      {editingMeal?.id === meal.id ? (
                        <div className="flex flex-col gap-2">
                          <input
                            autoFocus
                            className="w-full px-3 py-2 rounded border border-indigo-300 focus:ring-2 focus:ring-indigo-200 outline-none font-medium"
                            value={editingMeal.name}
                            onChange={e => setEditingMeal({ ...editingMeal, name: e.target.value })}
                          />
                          <label className="flex items-center gap-2 text-sm text-slate-600 cursor-pointer">
                            <input
                              type="checkbox"
                              checked={editingMeal.has_options}
                              onChange={e => setEditingMeal({ ...editingMeal, has_options: e.target.checked })}
                              className="rounded text-indigo-600 focus:ring-indigo-500"
                            />
                            Proposer Option Viande/Poisson
                          </label>
                        </div>
                      ) : (
                        <div>
                          <span className="font-medium text-slate-700">{meal.name}</span>
                          {meal.has_options && (
                            <span className="ml-2 text-xs bg-indigo-100 text-indigo-600 px-2 py-0.5 rounded-full font-bold">
                              Options Viande/Poisson
                            </span>
                          )}
                        </div>
                      )}
                    </div>
                    <div className="flex gap-2">
                      {editingMeal?.id === meal.id ? (
                        <>
                          <button onClick={handleUpdateMeal} className="p-2 bg-emerald-500 text-white rounded hover:bg-emerald-600">
                            <Save size={18} />
                          </button>
                          <button onClick={() => setEditingMeal(null)} className="p-2 bg-slate-200 text-slate-600 rounded hover:bg-slate-300">
                            <X size={18} />
                          </button>
                        </>
                      ) : (
                        <button onClick={() => setEditingMeal({ id: meal.id, name: meal.name, has_options: meal.has_options || false })} className="p-2 text-indigo-600 hover:bg-indigo-50 rounded">
                          Modifier
                        </button>
                      )}
                    </div>
                  </div>
                ))}
              </div>
              <div className="pt-6 border-t border-slate-100 flex justify-end">
                <button
                  onClick={handlePublishMenu}
                  disabled={isPublishing}
                  className="bg-indigo-600 text-white px-8 py-3 rounded-xl font-bold shadow-lg hover:shadow-indigo-200 hover:-translate-y-0.5 transition-all disabled:opacity-50"
                >
                  {isPublishing ? 'Publication...' : '🚀 Publier le Menu pour Demain'}
                </button>
              </div>
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
                    <p className="text-xs text-slate-500 mb-4 italic">Format: Nom; Site; Département (Ex: Jean Dupont; Site 1; RH)</p>
                    <textarea 
                      className="w-full h-48 p-4 rounded-xl border border-slate-200 focus:ring-2 focus:ring-indigo-300 outline-none font-mono text-sm"
                      placeholder="Jean Dupont; Site 1; RH&#10;Marie Durand; Site 2; Informatique"
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
                      <option value="Site 1">Site 1</option>
                      <option value="Site 2">Site 2</option>
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
                          <th className="px-6 py-4">Site</th>
                          <th className="px-6 py-4">Département</th>
                          <th className="px-6 py-4">Actions</th>
                        </tr>
                      </thead>
                      <tbody className="divide-y divide-slate-100">
                        {employees.map(emp => (
                          <tr key={emp.id} className="hover:bg-slate-50 transition-colors">
                            <td className="px-6 py-4 font-medium">{emp.name}</td>
                            <td className="px-6 py-4 text-xs font-bold text-slate-400">{emp.site || 'Site 1'}</td>
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
                
                <div className="space-y-4">
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

                  <button
                    onClick={handleUpdateSettings}
                    className="w-full bg-indigo-600 text-white py-4 rounded-2xl font-bold shadow-lg shadow-indigo-100 hover:bg-indigo-700 transition-all transform hover:-translate-y-1 mt-4"
                  >
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
