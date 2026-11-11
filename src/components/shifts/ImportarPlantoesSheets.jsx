import React, { useState } from 'react';
import { FileSpreadsheet, X, CheckCircle2 } from 'lucide-react';
import { base44 } from '@/api/base44Client';

export default function ImportarPlantoesSheets({ isOpen, onClose, hospitals = [], onImportado }) {
  const [hospital, setHospital] = useState('CSSM');
  const [loading, setLoading] = useState(false);
  const [erro, setErro] = useState(null);
  const [resultado, setResultado] = useState(null);

  if (!isOpen) return null;

  const handleImportar = async () => {
    setLoading(true);
    setErro(null);
    setResultado(null);
    try {
      const resposta = await base44.functions.invoke('importarPlantoesSheets', { hospital });
      if (resposta.data?.error) {
        setErro(resposta.data.error);
        return;
      }
      setResultado(resposta.data);
      onImportado && onImportado(resposta.data);
    } catch (e) {
      setErro(e?.response?.data?.error || 'Não foi possível importar os plantões.');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-900/60 p-4">
      <div className="w-full max-w-lg bg-white dark:bg-slate-800 rounded-2xl shadow-2xl border border-slate-200 dark:border-slate-700">
        <div className="flex items-start justify-between gap-4 p-5 border-b border-slate-200 dark:border-slate-700">
          <div className="flex items-start gap-3">
            <div className="p-2 rounded-xl bg-green-100 dark:bg-green-900/30">
              <FileSpreadsheet className="w-5 h-5 text-green-700 dark:text-green-400" />
            </div>
            <div>
              <h3 className="font-black text-slate-900 dark:text-white uppercase tracking-wide text-sm">
                Importar plantões do CLAUDIO
              </h3>
              <p className="text-xs text-slate-500 dark:text-slate-400 mt-1">
                Lê a escala publicada no Google Sheets e cria apenas os plantões do CLAUDIO que ainda não existem.
              </p>
            </div>
          </div>
          <button onClick={onClose} className="p-1 rounded-lg hover:bg-slate-100 dark:hover:bg-slate-700">
            <X className="w-4 h-4 text-slate-500" />
          </button>
        </div>

        <div className="p-5 space-y-4">
          <div>
            <label className="block text-xs font-black uppercase tracking-widest text-slate-500 dark:text-slate-400 mb-2">
              Hospital dos plantões
            </label>
            <select
              value={hospital}
              onChange={(e) => setHospital(e.target.value)}
              className="w-full bg-slate-50 dark:bg-slate-900 border border-slate-200 dark:border-slate-700 rounded-xl px-3 py-2 text-sm font-bold text-slate-700 dark:text-slate-200"
            >
              {hospitals.map((h) => (
                <option key={h.id} value={h.name}>{h.name}</option>
              ))}
            </select>
          </div>

          {erro && (
            <div className="bg-red-50 dark:bg-red-900/30 border border-red-200 dark:border-red-800 rounded-xl p-3 text-sm text-red-700 dark:text-red-300">
              {erro}
            </div>
          )}

          {resultado && (
            <div className="bg-green-50 dark:bg-green-900/20 border border-green-200 dark:border-green-800 rounded-xl p-3 space-y-1">
              <p className="flex items-center gap-2 text-sm font-bold text-green-800 dark:text-green-300">
                <CheckCircle2 className="w-4 h-4" />
                {resultado.criados} plantões criados · {resultado.ignorados} já existiam
              </p>
              <p className="text-xs text-green-700 dark:text-green-400">
                {resultado.encontrados} plantões do CLAUDIO na escala, em {resultado.hospital}.
              </p>
            </div>
          )}

          <button
            onClick={handleImportar}
            disabled={loading || !hospitals.length}
            className="w-full py-3 bg-green-600 text-white rounded-xl font-black text-xs uppercase tracking-widest hover:bg-green-700 transition-colors disabled:opacity-50"
          >
            {loading ? 'A importar…' : 'Importar agora'}
          </button>
        </div>
      </div>
    </div>
  );
}