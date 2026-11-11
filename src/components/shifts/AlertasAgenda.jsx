import React, { useState } from 'react';
import { Bell, AlertTriangle, X } from 'lucide-react';
import { conflitosDeHorario, dataHoje, formatarDataCurta } from '@/lib/shiftConflicts';

export default function AlertasAgenda({ shifts = [], cirurgiasHoje = [], month, year }) {
  const [fechado, setFechado] = useState(false);
  const hoje = dataHoje();
  const plantoesHoje = shifts.filter(shift => shift.date === hoje && shift.status !== 'Cancelado');
  const mesAtual = `${year}-${String(month + 1).padStart(2, '0')}`;
  const conflitosMes = conflitosDeHorario(shifts).filter(conflito => conflito.date.startsWith(mesAtual));

  const total = plantoesHoje.length + cirurgiasHoje.length + conflitosMes.length;
  if (fechado || total === 0) return null;

  return (
    <div className="bg-white dark:bg-slate-800 rounded-3xl border-2 border-amber-300 dark:border-amber-600 shadow-lg p-5 space-y-4">
      <div className="flex items-start justify-between gap-4">
        <div className="flex items-center gap-3">
          <div className="relative w-10 h-10 rounded-full bg-amber-100 dark:bg-amber-900/30 flex items-center justify-center">
            <Bell className="text-amber-700 dark:text-amber-400" size={20} />
            <span className="absolute -top-1 -right-1 min-w-[20px] h-5 px-1 rounded-full bg-amber-600 text-white text-[11px] font-black flex items-center justify-center">
              {total}
            </span>
          </div>
          <div>
            <h3 className="text-sm font-black uppercase tracking-widest text-slate-800 dark:text-white">Avisos da agenda</h3>
            <p className="text-xs font-bold text-slate-500 dark:text-slate-400">
              Hoje, {formatarDataCurta(hoje)} • {plantoesHoje.length} plantão(ões) • {cirurgiasHoje.length} cirurgia(s)
            </p>
          </div>
        </div>
        <button
          onClick={() => setFechado(true)}
          className="p-2 rounded-xl hover:bg-slate-100 dark:hover:bg-slate-700 text-slate-400"
          aria-label="Fechar avisos"
        >
          <X size={18} />
        </button>
      </div>

      {(plantoesHoje.length > 0 || cirurgiasHoje.length > 0) && (
        <div className="space-y-2">
          <p className="text-[11px] font-black uppercase tracking-widest text-slate-500 dark:text-slate-400">Agendado para hoje</p>
          <div className="flex flex-wrap gap-2">
            {plantoesHoje.map(shift => (
              <span key={shift.id} className="px-3 py-1.5 rounded-xl bg-blue-100 dark:bg-blue-900/30 text-blue-800 dark:text-blue-200 text-xs font-bold">
                Plantão • {shift.hospital} • {shift.shift_type}
              </span>
            ))}
            {cirurgiasHoje.map(cirurgia => (
              <span key={cirurgia.id} className="px-3 py-1.5 rounded-xl bg-rose-100 dark:bg-rose-900/30 text-rose-800 dark:text-rose-200 text-xs font-bold">
                Cirurgia • {cirurgia.hospital_name}{cirurgia.paciente ? ` • ${cirurgia.paciente}` : ''}
              </span>
            ))}
          </div>
        </div>
      )}

      {conflitosMes.length > 0 && (
        <div className="space-y-2">
          <p className="text-[11px] font-black uppercase tracking-widest text-red-600 dark:text-red-400 flex items-center gap-1">
            <AlertTriangle size={14} /> Conflitos de horário no mês
          </p>
          <ul className="space-y-1.5">
            {conflitosMes.map(conflito => (
              <li key={conflito.id} className="text-xs font-bold text-red-700 dark:text-red-300 bg-red-50 dark:bg-red-900/20 border border-red-200 dark:border-red-800 rounded-xl px-3 py-2">
                {formatarDataCurta(conflito.date)} • {conflito.doctor}: {conflito.mensagem}
              </li>
            ))}
          </ul>
        </div>
      )}
    </div>
  );
}