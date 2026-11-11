import React from 'react';
import { CalendarDays, RefreshCw, CheckCircle2, AlertTriangle } from 'lucide-react';

const contar = (grupo) =>
  (grupo?.created || 0) + (grupo?.updated || 0) + (grupo?.removed || 0);

const horaLocal = (iso) => {
  if (!iso) return null;
  return new Date(iso).toLocaleTimeString('pt-BR', { hour: '2-digit', minute: '2-digit' });
};

export default function GoogleCalendarSync({ sincronizando, ultimaSincronizacao, resumo, erro, onSincronizar }) {
  const enviados = contar(resumo?.shifts) + contar(resumo?.surgeries);
  const puxados = (resumo?.shifts?.pulled || 0) + (resumo?.surgeries?.pulled || 0);
  const hora = horaLocal(ultimaSincronizacao);

  let detalhe = 'Sincronização automática ativa a cada 5 minutos.';
  if (sincronizando) detalhe = 'Sincronizando agora — edições bloqueadas durante a sincronização.';
  else if (erro) detalhe = erro;
  else if (hora) {
    detalhe = `Sincronizado às ${hora}.`;
    if (enviados > 0) detalhe += ` ${enviados} registo(s) enviados para o Google Calendar.`;
    if (puxados > 0) detalhe += ` ${puxados} atualizado(s) a partir do Google Calendar.`;
    if (enviados === 0 && puxados === 0) detalhe += ' Tudo em dia.';
  }

  return (
    <div className="flex flex-col sm:flex-row sm:items-center gap-3 bg-white dark:bg-slate-800 p-4 rounded-2xl border border-slate-200 dark:border-slate-700 shadow-md">
      <div className="flex items-center gap-3 flex-1">
        <div className="w-10 h-10 rounded-xl bg-blue-100 dark:bg-blue-900/30 flex items-center justify-center">
          <CalendarDays className="w-5 h-5 text-blue-600 dark:text-blue-400" />
        </div>
        <div>
          <p className="text-sm font-black text-slate-900 dark:text-white uppercase tracking-wide flex items-center gap-2">
            Google Calendar
            <span className={`inline-flex items-center gap-1 text-[10px] font-bold px-2 py-0.5 rounded-full ${
              erro
                ? 'bg-red-100 text-red-700 dark:bg-red-900/40 dark:text-red-300'
                : 'bg-emerald-100 text-emerald-700 dark:bg-emerald-900/40 dark:text-emerald-300'
            }`}>
              {erro ? <AlertTriangle className="w-3 h-3" /> : <CheckCircle2 className="w-3 h-3" />}
              {erro ? 'Atenção' : 'Em tempo real'}
            </span>
          </p>
          <p className="text-xs text-slate-500 dark:text-slate-400">{detalhe}</p>
        </div>
      </div>

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
          onClick={onSincronizar}
          disabled={sincronizando}
          className="flex items-center gap-2 px-4 py-2 bg-blue-600 text-white rounded-xl text-xs font-black uppercase tracking-widest hover:bg-blue-700 transition-colors disabled:opacity-60"
        >
          <RefreshCw className={`w-4 h-4 ${sincronizando ? 'animate-spin' : ''}`} />
          {sincronizando ? 'Sincronizando' : 'Sincronizar agora'}
        </button>
      </div>
    </div>
  );
}