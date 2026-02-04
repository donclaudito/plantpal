import React, { useState } from 'react';
import { Upload, FileSpreadsheet } from 'lucide-react';
import { base44 } from '@/api/base44Client';

export default function ImportShifts({ showToast }) {
  const [isImporting, setIsImporting] = useState(false);
  const [spreadsheetUrl, setSpreadsheetUrl] = useState('');

  const handleImport = async () => {
    if (!spreadsheetUrl.trim()) {
      showToast('Por favor, insira o URL da planilha', 'error');
      return;
    }

    setIsImporting(true);
    try {
      const { data } = await base44.functions.invoke('importShiftsFromSheets', {
        spreadsheetUrl: spreadsheetUrl.trim()
      });
      
      if (data.success) {
        showToast(`${data.count} plantões importados com sucesso!`);
        setSpreadsheetUrl('');
      } else {
        showToast(data.error || 'Erro ao importar', 'error');
      }
    } catch (error) {
      showToast(error.message || 'Erro ao importar', 'error');
    } finally {
      setIsImporting(false);
    }
  };

  return (
    <div className="bg-white dark:bg-slate-800 rounded-3xl shadow-xl dark:shadow-slate-900/30 p-6 border border-slate-200 dark:border-slate-700">
      <div className="flex items-center gap-3 mb-6">
        <div className="w-12 h-12 bg-green-100 dark:bg-green-900/30 rounded-2xl flex items-center justify-center">
          <FileSpreadsheet className="text-green-600 dark:text-green-400" size={24} />
        </div>
        <div>
          <h3 className="text-lg font-black text-slate-900 dark:text-white">Importar do Google Sheets</h3>
          <p className="text-xs text-slate-500 dark:text-slate-400">Cole o URL da sua planilha</p>
        </div>
      </div>

      <div className="space-y-4">
        <div>
          <label className="block text-xs font-black text-slate-600 dark:text-slate-400 uppercase tracking-wider mb-2">
            URL da Planilha
          </label>
          <input
            type="url"
            value={spreadsheetUrl}
            onChange={(e) => setSpreadsheetUrl(e.target.value)}
            placeholder="https://docs.google.com/spreadsheets/d/..."
            className="w-full px-4 py-3 bg-slate-100 dark:bg-slate-700 border-2 border-transparent focus:border-blue-600 dark:focus:border-blue-400 rounded-xl font-bold text-slate-900 dark:text-white transition-colors"
          />
        </div>

        <button
          onClick={handleImport}
          disabled={isImporting}
          className="w-full py-4 bg-green-600 dark:bg-green-500 text-white rounded-xl font-bold hover:bg-green-700 dark:hover:bg-green-600 transition-colors flex items-center justify-center gap-2 disabled:opacity-50 disabled:cursor-not-allowed"
        >
          <Upload size={20} />
          {isImporting ? 'Importando...' : 'Importar Plantões'}
        </button>

        <div className="bg-blue-50 dark:bg-blue-900/20 p-4 rounded-xl border border-blue-200 dark:border-blue-800">
          <p className="text-xs text-blue-800 dark:text-blue-300 font-bold mb-2">📋 Formato esperado:</p>
          <ul className="text-xs text-blue-700 dark:text-blue-400 space-y-1">
            <li>• Colunas: Data, Médico, Especialidade, Hospital, Tipo, Horas, Valor</li>
            <li>• Compartilhe a planilha com "Qualquer pessoa com o link"</li>
          </ul>
        </div>
      </div>
    </div>
  );
}