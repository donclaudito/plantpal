import React, { useState } from 'react';
import { Upload, AlertCircle, CheckCircle } from 'lucide-react';
import { base44 } from '@/api/base44Client';

export default function ImportShiftsCSV({ showToast }) {
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState(null);
  const [preview, setPreview] = useState(null);

  const parseCSV = (text) => {
    const lines = text.trim().split('\n');
    if (lines.length < 2) throw new Error('CSV vazio ou inválido');

    const headers = lines[0].split(',').map(h => h.trim().toLowerCase());
    const data = [];

    for (let i = 1; i < lines.length; i++) {
      if (!lines[i].trim()) continue;
      
      const values = lines[i].split(',').map(v => v.trim());
      const row = {};
      
      headers.forEach((header, idx) => {
        row[header] = values[idx] || '';
      });
      
      data.push(row);
    }

    return data;
  };

  const mapCSVToShift = (row) => {
    return {
      date: row.data || row.date || '',
      doctor_name: row.médico || row.doctor_name || row.doctor || '',
      hospital: row.hospital || row.unidade || row.unit || '',
      shift_type: row.tipo || row.type || 'Diurno',
      period: row.período || row.period || '12h',
      value: parseFloat(row.valor || row.value || 0),
      status: row.status || 'Realizado',
      notes: row.observações || row.notes || ''
    };
  };

  const handleFileUpload = async (e) => {
    const file = e.target.files?.[0];
    if (!file) return;

    setLoading(true);
    setError(null);
    setPreview(null);

    try {
      const text = await file.text();
      const parsedData = parseCSV(text);
      
      if (parsedData.length === 0) {
        throw new Error('Nenhum registo encontrado no ficheiro');
      }

      const shifts = parsedData.map(mapCSVToShift).filter(shift => shift.date && shift.doctor_name);
      
      if (shifts.length === 0) {
        throw new Error('Nenhum plantão válido encontrado. Verifique as colunas: data, médico, hospital');
      }

      setPreview(shifts);
    } catch (err) {
      setError(err.message);
      showToast(`Erro ao processar ficheiro: ${err.message}`, 'error');
    } finally {
      setLoading(false);
    }
  };

  const handleImport = async () => {
    if (!preview || preview.length === 0) return;

    setLoading(true);
    try {
      const results = await Promise.allSettled(
        preview.map(shift => base44.entities.Shift.create(shift))
      );

      const successful = results.filter(r => r.status === 'fulfilled').length;
      const failed = results.filter(r => r.status === 'rejected').length;

      showToast(`${successful} plantões importados com sucesso!`);
      
      if (failed > 0) {
        showToast(`${failed} plantões falharam na importação`, 'error');
      }

      setPreview(null);
      document.querySelector('input[type="file"]').value = '';
    } catch (err) {
      showToast(`Erro na importação: ${err.message}`, 'error');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="bg-white dark:bg-slate-800 rounded-2xl shadow-lg p-6 border border-slate-200 dark:border-slate-700">
      <h3 className="text-lg font-black text-slate-900 dark:text-white mb-4 uppercase tracking-wide">
        Importar Plantões (CSV)
      </h3>

      <div className="mb-6">
        <label className="block">
          <div className="flex items-center justify-center gap-3 border-2 border-dashed border-slate-300 dark:border-slate-600 rounded-2xl p-8 hover:bg-slate-50 dark:hover:bg-slate-700/50 cursor-pointer transition-colors">
            <Upload size={20} className="text-blue-600 dark:text-blue-400" />
            <div className="text-center">
              <p className="font-bold text-slate-900 dark:text-white">Clique para selecionar ficheiro CSV</p>
              <p className="text-xs text-slate-500 dark:text-slate-400 mt-1">
                Colunas esperadas: data, médico, hospital, tipo, período, valor
              </p>
            </div>
          </div>
          <input
            type="file"
            accept=".csv"
            onChange={handleFileUpload}
            disabled={loading}
            className="hidden"
          />
        </label>
      </div>

      {error && (
        <div className="flex gap-3 bg-red-50 dark:bg-red-900/30 border border-red-200 dark:border-red-800 rounded-xl p-4 mb-4">
          <AlertCircle size={18} className="text-red-600 dark:text-red-400 flex-shrink-0 mt-0.5" />
          <p className="text-sm text-red-700 dark:text-red-300">{error}</p>
        </div>
      )}

      {preview && preview.length > 0 && (
        <div className="mb-6">
          <div className="flex gap-2 mb-3">
            <CheckCircle size={18} className="text-green-600 dark:text-green-400" />
            <p className="font-bold text-green-700 dark:text-green-300">{preview.length} plantões prontos para importar</p>
          </div>
          
          <div className="bg-slate-50 dark:bg-slate-900/50 rounded-xl p-4 max-h-60 overflow-y-auto">
            <div className="space-y-2 text-xs">
              {preview.slice(0, 5).map((shift, idx) => (
                <div key={idx} className="text-slate-600 dark:text-slate-400 p-2 bg-white dark:bg-slate-800 rounded-lg">
                  <strong>{shift.doctor_name}</strong> • {shift.date} • {shift.hospital} • R$ {shift.value.toFixed(2)}
                </div>
              ))}
              {preview.length > 5 && (
                <p className="text-slate-500 dark:text-slate-500 text-center py-2">
                  ... e mais {preview.length - 5} plantões
                </p>
              )}
            </div>
          </div>

          <button
            onClick={handleImport}
            disabled={loading}
            className="w-full mt-4 py-3 bg-green-600 dark:bg-green-500 text-white rounded-xl font-bold hover:bg-green-700 dark:hover:bg-green-600 transition-colors disabled:opacity-50"
          >
            {loading ? 'A importar...' : `Importar ${preview.length} plantões`}
          </button>
        </div>
      )}
    </div>
  );
}