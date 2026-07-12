import { useState } from 'react';
import { X, FileText, Download } from 'lucide-react';
import type { Employee, Meal, Order, Site } from '../lib/supabase';
import { getEmployeeDeptName, getEmployeeFullName, getEmployeeSiteName } from '../lib/employeeUtils';
import { jsPDF } from 'jspdf';
import autoTable from 'jspdf-autotable';

interface ExportModalProps {
  employees: Employee[];
  meals: Meal[];
  orders: Order[];
  sites: Site[];
  onClose: () => void;
}

export default function ExportModal({ employees, meals, orders, sites, onClose }: ExportModalProps) {
  const siteOptions = ['All', ...sites.map(s => s.name)];
  const [selectedSite, setSelectedSite] = useState<string>('All');
  const [selectedDept, setSelectedDept] = useState<string>('All');

  const departments = [
    'All',
    ...new Set(
      employees
        .map(getEmployeeDeptName)
        .filter((name): name is string => Boolean(name))
    ),
  ].sort();

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
      const siteMatch = selectedSite === 'All' || getEmployeeSiteName(e) === selectedSite;
      const deptMatch = selectedDept === 'All' || getEmployeeDeptName(e) === selectedDept;
      return siteMatch && deptMatch;
    });

    const tableHeaders = ['Nom', 'Bureau', 'Departement', ...meals.map(m => m.name)];
    const tableData = filtered.map(emp => {
      const row = [
        getEmployeeFullName(emp),
        getEmployeeSiteName(emp),
        getEmployeeDeptName(emp) || '-',
      ];
      meals.forEach(m => {
        const order = orders.find(o => o.employee_id === emp.id && o.meal_id === m.id);
        row.push(order ? (order.protein_option ? `X (${order.protein_option})` : 'X') : '');
      });
      return row;
    });

    autoTable(doc, {
      head: [tableHeaders],
      body: tableData,
      startY: 55,
      styles: { fontSize: 8, cellPadding: 2 },
      headStyles: { fillColor: [194, 65, 12] },
    });

    doc.save(`commandes_${selectedSite}_${date}.pdf`);
  };

  return (
    <div className="fixed inset-0 bg-slate-900/50 backdrop-blur-sm z-[100] flex items-center justify-center p-4">
      <div className="bg-white rounded-2xl shadow-2xl w-full max-w-md overflow-hidden animate-in zoom-in duration-200">
        <div className="p-6 border-b border-slate-100 flex items-center justify-between bg-slate-50">
          <div className="flex items-center gap-3">
            <FileText className="text-orange-700" size={24} />
            <h2 className="text-xl font-bold text-slate-800">Exporter les commandes</h2>
          </div>
          <button onClick={onClose} className="p-2 hover:bg-slate-200 rounded-full transition-colors">
            <X size={20} className="text-slate-500" />
          </button>
        </div>

        <div className="p-8 space-y-6">
          <div className="space-y-4">
            <div>
              <label className="block text-sm font-bold text-slate-700 mb-2">Choisir le bureau</label>
              <div className="flex flex-wrap bg-slate-100 p-1 rounded-xl w-full gap-1">
                {siteOptions.map((site) => (
                  <button
                    key={site}
                    onClick={() => setSelectedSite(site)}
                    className={`flex-1 min-w-[80px] py-2 rounded-lg text-sm font-bold transition-all ${
                      selectedSite === site
                        ? 'bg-white text-orange-700 shadow-sm'
                        : 'text-slate-500 hover:text-slate-700'
                    }`}
                  >
                    {site === 'All' ? 'Tous' : site}
                  </button>
                ))}
              </div>
            </div>

            <div>
              <label className="block text-sm font-bold text-slate-700 mb-2">Choisir le département</label>
              <select
                value={selectedDept}
                onChange={(e) => setSelectedDept(e.target.value)}
                className="w-full bg-slate-100 border-none rounded-xl px-4 py-3 text-sm font-bold text-slate-700 focus:ring-2 focus:ring-orange-300 outline-none"
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
              className="w-full flex items-center justify-center gap-3 bg-orange-700 hover:bg-orange-800 text-white py-4 rounded-xl font-bold transition-all shadow-lg shadow-orange-100"
            >
              <Download size={20} />
              Générer PDF
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
