import React, { useState } from 'react';
import { base44 } from '@/api/base44Client';
import { CalendarDays, RefreshCw } from 'lucide-react';

export default function GoogleCalendarSync() {
  const [loading, setLoading] = useState(false);
  const [message, setMessage] = useState(null);

  const sincronizar = async () => {
    setLoading(true);
    setMessage(null);
    try {
      const resposta = await base44.functions.invoke('syncGoogleCalendar', {});
      const dados = resposta?.data || {};
      const contagem = (grupo) =>
        (grupo?.created || 0) + (grupo?.updated || 0) + (grupo?.removed || 0);
      const total = contagem(dados.shifts) + contagem(dados.surgeries);

      setMessage({
        type: 'success',
        text: total > 0
          ? `${total} compromisso(s) sincronizado(s) com o Google Calendar.`
          : 'Tudo já está sincronizado com o Google Calendar.',
      });
    } catch (error) {
      const detalhe = error?.response?.data || error;
      setMessage({
        type: 'error',
        text: detalhe?.needs_connection
          ? 'Google Calendar não conectado. Peça a conexão no chat do PlantPal.'
          : 'Não foi possível sincronizar agora. Tente novamente em instantes.',
      });
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="flex flex-col sm:flex-row sm:items-center gap-3 bg-white dark:bg-slate-800 p-4 rounded-2xl border border-slate-200 dark:border-slate-700 shadow-md">
      <div className="flex items-center gap-3 flex-1">
        <div className="w-10 h-10 rounded-xl bg-blue-100 dark:bg-blue-900/30 flex items-center justify-center">
          <CalendarDays className="w-5 h-5 text-blue-600 dark:text-blue-400" />
        </div>
        <div>
          <p className="text-sm font-black text-slate-900 dark:text-white uppercase tracking-wide">
            Google Calendar
          </p>
          <p className="text-xs text-slate-500 dark:text-slate-400">
            Plantões e cirurgias sincronizados automaticamente a cada 6 horas, com lembretes no celular.
          </p>
        </div>
      </div>

      <div className="flex flex-col sm:items-end gap-1">
        <div className="flex gap-2">
          <a
            href="https://calendar.google.com"
            target="_blank"
            rel="noopener noreferrer"
            className="px-4 py-2 rounded-xl text-xs font-bold uppercase tracking-widest text-slate-600 dark:text-slate-300 hover:bg-slate-100 dark:hover:bg-slate-700 transition-colors"
          >
            Abrir
          </a>
          <button
            onClick={sincronizar}
            disabled={loading}
            className="flex items-center gap-2 px-4 py-2 bg-blue-600 text-white rounded-xl text-xs font-black uppercase tracking-widest hover:bg-blue-700 transition-colors disabled:opacity-60"
          >
            <RefreshCw className={`w-4 h-4 ${loading ? 'animate-spin' : ''}`} />
            {loading ? 'Sincronizando' : 'Sincronizar agora'}
          </button>
        </div>
        {message && (
          <p className={`text-xs font-semibold ${message.type === 'success' ? 'text-emerald-600 dark:text-emerald-400' : 'text-red-600 dark:text-red-400'}`}>
            {message.text}
          </p>
        )}
      </div>
    </div>
  );
}