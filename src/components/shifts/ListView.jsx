import React from 'react';
import { Trash2, Calendar, Clock } from 'lucide-react';

export default function ListView({ 
  shifts, 
  onTogglePaid, 
  onDeleteShift,
  selectedShifts,
  onToggleSelect,
  onToggleSelectAll
}) {
  return (
    <div className="space-y-4">
      {shifts.length > 0 && (
        <div className="flex items-center gap-3 mb-4 bg-white dark:bg-slate-800 p-4 rounded-2xl border border-slate-200 dark:border-slate-700">
          <input
            type="checkbox"
            checked={selectedShifts.length === shifts.length}
            onChange={onToggleSelectAll}
            className="w-5 h-5 rounded border-slate-300 dark:border-slate-600 text-blue-600 focus:ring-blue-500"
          />
          <span className="text-sm font-bold text-slate-600 dark:text-slate-400">
            {selectedShifts.length > 0 ? `${selectedShifts.length} selecionado(s)` : 'Selecionar todos'}
          </span>
        </div>
      )}

      {shifts.map(shift => {
        const isSelected = selectedShifts.includes(shift.id);
        return (
          <div
            key={shift.id}
            className={`bg-white dark:bg-slate-800 rounded-2xl shadow-lg dark:shadow-slate-900/30 overflow-hidden border-2 transition-all ${
              isSelected 
                ? 'border-blue-600 dark:border-blue-400' 
                : 'border-slate-200 dark:border-slate-700'
            }`}
          >
            <div className="p-6">
              <div className="flex items-start justify-between mb-4">
                <div className="flex items-start gap-3 flex-1">
                  <input
                    type="checkbox"
                    checked={isSelected}
                    onChange={() => onToggleSelect(shift.id)}
                    className="mt-1 w-5 h-5 rounded border-slate-300 dark:border-slate-600 text-blue-600 focus:ring-blue-500"
                  />
                  <div className="flex-1">
                    <h3 className="text-xl font-black text-slate-900 dark:text-white mb-1">
                      {shift.doctorName}
                    </h3>
                    <p className="text-sm text-slate-600 dark:text-slate-400 font-bold uppercase tracking-wide">
                      {shift.specialty}
                    </p>
                  </div>
                </div>
                
                <button
                  onClick={() => onDeleteShift(shift.id, shift.doctorName)}
                  className="p-2 hover:bg-red-100 dark:hover:bg-red-900/30 rounded-xl transition-colors"
                >
                  <Trash2 className="text-red-600 dark:text-red-400" size={20} />
                </button>
              </div>
              
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4 mb-4">
                <div className="flex items-center gap-3 bg-slate-50 dark:bg-slate-700 p-3 rounded-xl">
                  <Calendar className="text-blue-600 dark:text-blue-400" size={20} />
                  <div>
                    <p className="text-xs text-slate-500 dark:text-slate-400 font-bold uppercase">Data</p>
                    <p className="text-sm font-black text-slate-900 dark:text-white">
                      {new Date(shift.date + 'T00:00:00').toLocaleDateString('pt-PT')}
                    </p>
                  </div>
                </div>
                
                <div className="flex items-center gap-3 bg-slate-50 dark:bg-slate-700 p-3 rounded-xl">
                  <Clock className="text-blue-600 dark:text-blue-400" size={20} />
                  <div>
                    <p className="text-xs text-slate-500 dark:text-slate-400 font-bold uppercase">Tipo</p>
                    <p className="text-sm font-black text-slate-900 dark:text-white">{shift.type}</p>
                  </div>
                </div>
                

              </div>
              
              <div className="flex items-center justify-between pt-4 border-t border-slate-200 dark:border-slate-700">
                <p className="text-sm font-bold text-slate-600 dark:text-slate-400">{shift.unit}</p>
                
                <button
                  onClick={() => onTogglePaid(shift.id, !shift.paid)}
                  className={`px-6 py-2 rounded-xl font-black text-xs uppercase tracking-wider transition-all ${
                    shift.paid
                      ? 'bg-green-100 dark:bg-green-900/30 text-green-700 dark:text-green-400'
                      : 'bg-slate-100 dark:bg-slate-700 text-slate-600 dark:text-slate-400 hover:bg-blue-100 dark:hover:bg-blue-900/30'
                  }`}
                >
                  {shift.paid ? '✓ PAGO' : 'PENDENTE'}
                </button>
              </div>
            </div>
          </div>
        );
      })}
    </div>
  );
}