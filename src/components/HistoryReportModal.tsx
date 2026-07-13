import { useState } from 'react';
import { X, Calendar, Download, FileSpreadsheet } from 'lucide-react';
import { jsPDF } from 'jspdf';
import autoTable from 'jspdf-autotable';

interface HistoryReportModalProps {
  orderHistory: any[];
  onClose: () => void;
}

export default function HistoryReportModal({ orderHistory, onClose }: HistoryReportModalProps) {
  // Set default dates: start of current month to today
  const todayStr = new Date().toISOString().split('T')[0];
  const startOfMonthStr = (() => {
    const d = new Date();
    d.setDate(1);
    return d.toISOString().split('T')[0];
  })();

  const [startDate, setStartDate] = useState(startOfMonthStr);
  const [endDate, setEndDate] = useState(todayStr);

  const filteredHistory = orderHistory.filter(item => {
    return item.publish_date >= startDate && item.publish_date <= endDate;
  });

  // Calculate totals (grouped by meal name and sorted alphabetically)
  const groupedPeriodTotals: Record<string, { meal_name: string; options: Record<string, number>; total: number }> = {};
  let grandTotal = 0;
  
  filteredHistory.forEach(day => {
    day.details.forEach((detail: any) => {
      const name = detail.meal_name;
      if (!groupedPeriodTotals[name]) {
        groupedPeriodTotals[name] = {
          meal_name: name,
          options: {},
          total: 0
        };
      }
      if (detail.protein_option) {
        groupedPeriodTotals[name].options[detail.protein_option] = (groupedPeriodTotals[name].options[detail.protein_option] || 0) + detail.count;
      }
      groupedPeriodTotals[name].total += detail.count;
      grandTotal += detail.count;
    });
  });

  const sortedPeriodTotals = Object.values(groupedPeriodTotals).sort((a, b) => a.meal_name.localeCompare(b.meal_name));

  const handleExportPDF = () => {
    const doc = new jsPDF();
    const dateRangeStr = `Période : du ${new Date(startDate).toLocaleDateString('fr-FR')} au ${new Date(endDate).toLocaleDateString('fr-FR')}`;
    
    // Header styling matching premium aesthetics
    doc.setFontSize(18);
    doc.setTextColor(189, 79, 25); // #BD4F19
    doc.text(`Rapport de Restauration`, 14, 20);
    
    doc.setFontSize(10);
    doc.setTextColor(100, 100, 100);
    doc.text(dateRangeStr, 14, 27);
    doc.text(`Nombre total de plats commandés : ${grandTotal}`, 14, 33);
    
    // Table 1: Totaux par plat (alphabetical order)
    const totalsHeaders = [['Nom du plat', 'Option Protéine', 'Quantité Totale']];
    const totalsRows = sortedPeriodTotals.map(item => {
      const optionsStr = Object.entries(item.options)
        .map(([optName, optCount]) => `${optName} (${optCount})`)
        .join(', ');
      return [
        item.meal_name,
        optionsStr || 'Aucune',
        item.total.toString()
      ];
    });

    autoTable(doc, {
      startY: 40,
      head: totalsHeaders,
      body: totalsRows,
      theme: 'striped',
      headStyles: { fillColor: [189, 79, 25], fontSize: 10, fontStyle: 'bold' },
      bodyStyles: { fontSize: 9 },
    });

    // Table 2: Historique quotidien
    const dailyStartY = (doc as any).lastAutoTable.finalY + 15;
    
    const fillDailyData = () => {
      const rows: string[][] = [];
      filteredHistory
        .sort((a, b) => b.publish_date.localeCompare(a.publish_date))
        .forEach(day => {
          const formattedDate = new Date(day.publish_date).toLocaleDateString('fr-FR', {
            day: 'numeric',
            month: 'short',
            year: 'numeric'
          });
          
          // Group by meal name for this day and sort alphabetically
          const dailyGroups: Record<string, { meal_name: string; options: Record<string, number>; total: number }> = {};
          day.details.forEach((detail: any) => {
            const name = detail.meal_name;
            if (!dailyGroups[name]) {
              dailyGroups[name] = {
                meal_name: name,
                options: {},
                total: 0
              };
            }
            if (detail.protein_option) {
              dailyGroups[name].options[detail.protein_option] = (dailyGroups[name].options[detail.protein_option] || 0) + detail.count;
            }
            dailyGroups[name].total += detail.count;
          });

          Object.values(dailyGroups)
            .sort((a, b) => a.meal_name.localeCompare(b.meal_name))
            .forEach(item => {
              const optionsStr = Object.entries(item.options)
                .map(([optName, optCount]) => `${optName} (${optCount})`)
                .join(', ');
              rows.push([
                formattedDate,
                item.meal_name,
                optionsStr || 'Aucune',
                item.total.toString()
              ]);
            });
        });
      return rows;
    };

    const dailyHeaders = [['Date', 'Nom du plat', 'Option Protéine', 'Quantité']];
    const dailyRows = fillDailyData();

    if (dailyStartY > 260) {
      doc.addPage();
      doc.setFontSize(14);
      doc.setTextColor(189, 79, 25);
      doc.text("Détail quotidien", 14, 20);
      
      autoTable(doc, {
        startY: 25,
        head: dailyHeaders,
        body: dailyRows,
        theme: 'grid',
        headStyles: { fillColor: [100, 100, 100], fontSize: 9 },
        bodyStyles: { fontSize: 8 },
      });
    } else {
      doc.setFontSize(14);
      doc.setTextColor(189, 79, 25);
      doc.text("Détail quotidien", 14, dailyStartY);
      
      autoTable(doc, {
        startY: dailyStartY + 5,
        head: dailyHeaders,
        body: dailyRows,
        theme: 'grid',
        headStyles: { fillColor: [100, 100, 100], fontSize: 9 },
        bodyStyles: { fontSize: 8 },
      });
    }

    doc.save(`Rapport_Commandes_${startDate}_au_${endDate}.pdf`);
  };

  const handleExportCSV = () => {
    const csvRows = [];
    csvRows.push(['Date de debut', startDate].join(','));
    csvRows.push(['Date de fin', endDate].join(','));
    csvRows.push(['Total des plats', grandTotal.toString()].join(','));
    csvRows.push([]);
    csvRows.push(['SYNTHESE DES PLATS']);
    csvRows.push(['Nom du plat', 'Option Proteine', 'Quantite Totale']);

    sortedPeriodTotals.forEach(item => {
      const optionsStr = Object.entries(item.options)
        .map(([optName, optCount]) => `${optName} (${optCount})`)
        .join('; ');
      csvRows.push([
        `"${item.meal_name.replace(/"/g, '""')}"`,
        optionsStr ? `"${optionsStr.replace(/"/g, '""')}"` : 'Aucune',
        item.total
      ].join(','));
    });

    csvRows.push([]);
    csvRows.push(['BREAKDOWN QUOTIDIEN']);
    csvRows.push(['Date', 'Nom du plat', 'Option Proteine', 'Quantite']);
    
    filteredHistory
      .sort((a, b) => b.publish_date.localeCompare(a.publish_date))
      .forEach(day => {
        // Group by meal for this day
        const dailyGroups: Record<string, { meal_name: string; options: Record<string, number>; total: number }> = {};
        day.details.forEach((detail: any) => {
          const name = detail.meal_name;
          if (!dailyGroups[name]) {
            dailyGroups[name] = {
              meal_name: name,
              options: {},
              total: 0
            };
          }
          if (detail.protein_option) {
            dailyGroups[name].options[detail.protein_option] = (dailyGroups[name].options[detail.protein_option] || 0) + detail.count;
          }
          dailyGroups[name].total += detail.count;
        });

        Object.values(dailyGroups)
          .sort((a, b) => a.meal_name.localeCompare(b.meal_name))
          .forEach(item => {
            const optionsStr = Object.entries(item.options)
              .map(([optName, optCount]) => `${optName} (${optCount})`)
              .join('; ');
            csvRows.push([
              day.publish_date,
              `"${item.meal_name.replace(/"/g, '""')}"`,
              optionsStr ? `"${optionsStr.replace(/"/g, '""')}"` : 'Aucune',
              item.total
            ].join(','));
          });
      });

    const csvContent = "\uFEFF" + csvRows.join('\n');
    const blob = new Blob([csvContent], { type: 'text/csv;charset=utf-8;' });
    const url = URL.createObjectURL(blob);
    const link = document.createElement("a");
    link.setAttribute("href", url);
    link.setAttribute("download", `Rapport_Commandes_${startDate}_au_${endDate}.csv`);
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
  };

  return (
    <div className="fixed inset-0 bg-[#0F0E0A]/40 backdrop-blur-sm z-[100] flex items-center justify-center p-4">
      <div className="bg-white rounded-3xl shadow-2xl w-full max-w-md overflow-hidden animate-in zoom-in-95 duration-200">
        <div className="p-6 border-b border-gray-150 flex items-center justify-between bg-gray-50">
          <div className="flex items-center gap-3">
            <Calendar className="text-[#BD4F19]" size={24} />
            <h2 className="text-xl font-bold text-gray-800 font-sans">Générer un Rapport</h2>
          </div>
          <button onClick={onClose} className="p-2 hover:bg-gray-200/60 rounded-full transition-colors">
            <X size={20} className="text-gray-500" />
          </button>
        </div>

        <div className="p-6 space-y-6">
          <div className="grid grid-cols-2 gap-4">
            <div className="flex flex-col gap-1.5">
              <label className="text-xs font-bold text-gray-500 uppercase tracking-wide">Date de début</label>
              <input
                type="date"
                value={startDate}
                onChange={e => setStartDate(e.target.value)}
                className="w-full px-4 py-3 bg-[#FBF9F1] border border-gray-200 rounded-xl focus:bg-white focus:ring-2 focus:ring-orange-500/20 focus:border-orange-500 outline-none text-sm font-bold text-gray-700 shadow-sm"
              />
            </div>
            <div className="flex flex-col gap-1.5">
              <label className="text-xs font-bold text-gray-500 uppercase tracking-wide">Date de fin</label>
              <input
                type="date"
                value={endDate}
                onChange={e => setEndDate(e.target.value)}
                className="w-full px-4 py-3 bg-[#FBF9F1] border border-gray-200 rounded-xl focus:bg-white focus:ring-2 focus:ring-orange-500/20 focus:border-orange-500 outline-none text-sm font-bold text-gray-700 shadow-sm"
              />
            </div>
          </div>

          <div className="bg-[#FBF9F1] p-4 rounded-2xl border border-gray-200/80 text-center">
            <span className="text-xs font-bold text-gray-400 uppercase tracking-wider block mb-1">Nombre de jours dans la période</span>
            <span className="text-3xl font-extrabold text-gray-900 block">{filteredHistory.length}</span>
            <span className="text-xs text-gray-450 font-semibold mt-1 block">
              {grandTotal} plat{grandTotal > 1 ? 's' : ''} commandé{grandTotal > 1 ? 's' : ''} au total
            </span>
          </div>

          <div className="pt-2 flex flex-col gap-3">
            <button
              onClick={handleExportPDF}
              disabled={filteredHistory.length === 0}
              className="w-full flex items-center justify-center gap-2.5 bg-[#BD4F19] hover:bg-[#A64B2A] disabled:opacity-50 text-white py-3.5 rounded-xl font-bold transition-all shadow-sm"
            >
              <Download size={18} />
              Générer PDF (Imprimable)
            </button>
            
            <button
              onClick={handleExportCSV}
              disabled={filteredHistory.length === 0}
              className="w-full flex items-center justify-center gap-2.5 bg-white border-2 border-gray-200 text-gray-700 hover:bg-gray-50 disabled:opacity-50 py-3.5 rounded-xl font-bold transition-all"
            >
              <FileSpreadsheet size={18} className="text-emerald-600" />
              Exporter en CSV (Excel)
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}
