import { useState } from 'react';
import { X, FileText, Download } from 'lucide-react';
import type { Employee, Meal, Order } from '../lib/supabase';
import { jsPDF } from 'jspdf';
import autoTable from 'jspdf-autotable';

interface ExportModalProps {
  employees: Employee[];
  meals: Meal[];
  orders: Order[];
  onClose: () => void;
}

export default function ExportModal({ employees, meals, orders, onClose }: ExportModalProps) {
  const [selectedSite, setSelectedSite] = useState<'All' | 'Bureau 1' | 'Bureau 2'>('All');
  const [selectedDept, setSelectedDept] = useState<string>('All');

  const departments = ['All', ...new Set(employees.map(e => e.department).filter(Boolean))].sort();

  const generatePDF = () => {
    const doc = new jsPDF();
    const date = new Date().toLocaleDateString();
    
    doc.setFontSize(18);
    doc.text('Synthese des Commandes - Gastronomie', 14, 20);
    
    doc.setFontSize(12);
    doc.text(`Date: ${date}`, 14, 30);
    doc.text(`Bureau: ${selectedSite === 'All' ? 'Tous' : selectedSite}`, 14, 37);
    if (selectedDept !== 'All') {
      doc.text(`Departement: ${selectedDept}`, 14, 44);
    }

    const filtered = employees.filter(e => {
      const siteMatch = selectedSite === 'All' || (e.site || 'Bureau 1') === selectedSite;
      const deptMatch = selectedDept === 'All' || e.department === selectedDept;
      return siteMatch && deptMatch;
    });

    const tableHeaders = ['Nom', 'Bureau', 'Departement', ...meals.map(m => m.name)];
    const tableData = filtered.map(emp => {
      const row = [emp.name, emp.site || 'Bureau 1', emp.department || '-'];
      meals.forEach(m => {
        const order = orders.find(o => o.employee_id === emp.id && o.meal_id === m.id);
        if (order) {
          row.push(order.protein_option ? `X (${order.protein_option})` : 'X');
        } else {
          row.push('');
        }
      });
      return row;
    });

    autoTable(doc, {
      head: [tableHeaders],
      body: tableData,
      startY: 55,
      styles: { fontSize: 8, cellPadding: 2 },
      headStyles: { fillColor: [79, 70, 229] },
    });

    doc.save(`commandes_${selectedSite}_${date}.pdf`);
  };

  return (
    <div className="fixed inset-0 bg-slate-900/50 backdrop-blur-sm z-[100] flex items-center justify-center p-4">
      <div className="bg-white rounded-2xl shadow-2xl w-full max-w-md overflow-hidden animate-in zoom-in duration-200">
        <div className="p-6 border-b border-slate-100 flex items-center justify-between bg-slate-50">
          <div className="flex items-center gap-3">
            <FileText className="text-indigo-600" size={24} />
            <h2 className="text-xl font-bold text-slate-800">Exporter les commandes</h2>
          </div>
          <button onClick={onClose} className="p-2 hover:bg-slate-200 rounded-full transition-colors">
            <X size={20} className="text-slate-500" />
          </button>
        </div>

        <div className="p-8 space-y-6">
          <div className="space-y-4">
            <div>
              <label className="block text-sm font-bold text-slate-700 mb-2">Choisir le Bureau</label>
              <div className="flex bg-slate-100 p-1 rounded-xl w-full">
                {['All', 'Bureau 1', 'Bureau 2'].map((site) => (
                  <button
                    key={site}
                    onClick={() => setSelectedSite(site as any)}
                    className={`flex-1 py-2 rounded-lg text-sm font-bold transition-all ${
                      selectedSite === site 
                        ? 'bg-white text-indigo-600 shadow-sm' 
                        : 'text-slate-500 hover:text-slate-700'
                    }`}
                  >
                    {site === 'All' ? 'Tous' : site}
                  </button>
                ))}
              </div>
            </div>

            <div>
              <label className="block text-sm font-bold text-slate-700 mb-2">Choisir le Département</label>
              <select
                value={selectedDept}
                onChange={(e) => setSelectedDept(e.target.value)}
                className="w-full bg-slate-100 border-none rounded-xl px-4 py-3 text-sm font-bold text-slate-700 focus:ring-2 focus:ring-indigo-300 outline-none"
              >
                {departments.map(dept => (
                  <option key={dept} value={dept}>
                    {dept === 'All' ? 'Tous les départements' : dept}
                  </option>
                ))}
              </select>
            </div>
          </div>

          <div className="pt-4 space-y-3">
            <button
              onClick={generatePDF}
              className="w-full flex items-center justify-center gap-3 bg-indigo-600 hover:bg-indigo-700 text-white py-4 rounded-xl font-bold transition-all shadow-lg shadow-indigo-100"
            >
              <Download size={20} />
              Générer PDF (Qui a coché quoi)
            </button>
            <p className="text-[10px] text-center text-slate-400">
              Le fichier PDF contiendra le tableau détaillé pour le site sélectionné.
            </p>
          </div>
        </div>
      </div>
    </div>
  );
}
