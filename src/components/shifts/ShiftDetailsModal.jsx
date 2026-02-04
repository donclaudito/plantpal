import React from 'react';
import { X, Calendar, Clock, DollarSign, MapPin, User, Stethoscope, Check, Pencil, Trash2 } from 'lucide-react';

export default function ShiftDetailsModal({ shift, isOpen, onClose, onEdit, onDelete }) {
  if (!isOpen || !shift) return null;

  return (
    <div className="fixed inset-0 bg-black/60 backdrop-blur-sm z-50 flex items-center justify-center p-4 animate-in fade-in duration-200">
      <div className="bg-white dark:bg-slate-800 rounded-3xl shadow-2xl max-w-2xl w-full max-h-[90vh] overflow-y-auto animate-in zoom-in-95 duration-200">
        <div className="sticky top-0 bg-white dark:bg-slate-800 border-b border-slate-200 dark:border-slate-700 p-6 flex items-center justify-between">
          <h2 className="text-2xl font-black text-slate-900 dark:text-white">Detalhes do Plantão</h2>
          <button onClick={onClose} className="p-2 hover:bg-slate-100 dark:hover:bg-slate-700 rounded-xl transition-colors">
            <X className="text-slate-400 dark:text-slate-500" size={24} />
          </button>
        </div>

        <div className="p-6 space-y-6">
          <div className={`p-6 rounded-2xl border-2 ${
            shift.status === 'Pago'
              ? 'bg-green-50 dark:bg-green-900/20 border-green-300 dark:border-green-700' 
              : 'bg-blue-50 dark:bg-blue-900/20 border-blue-300 dark:border-blue-700'
          }`}>
            <div className="flex items-center justify-between mb-2">
              <span className="text-xs font-black text-slate-500 dark:text-slate-400 uppercase tracking-wider">Status</span>
              {shift.status === 'Pago' && <Check className="text-green-600 dark:text-green-400" size={20} />}
            </div>
            <p className={`text-2xl font-black ${
              shift.status === 'Pago' ? 'text-green-700 dark:text-green-400' : 'text-blue-700 dark:text-blue-400'
            }`}>
              {shift.status}
            </p>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div className="bg-slate-50 dark:bg-slate-700/50 p-4 rounded-xl">
              <div className="flex items-center gap-3 mb-2">
                <User className="text-blue-600 dark:text-blue-400" size={20} />
                <span className="text-xs font-black text-slate-500 dark:text-slate-400 uppercase tracking-wider">Médico</span>
              </div>
              <p className="text-lg font-black text-slate-900 dark:text-white">{shift.doctor_name}</p>
            </div>

            <div className="bg-slate-50 dark:bg-slate-700/50 p-4 rounded-xl">
              <div className="flex items-center gap-3 mb-2">
                <Stethoscope className="text-blue-600 dark:text-blue-400" size={20} />
                <span className="text-xs font-black text-slate-500 dark:text-slate-400 uppercase tracking-wider">Tipo</span>
              </div>
              <p className="text-lg font-black text-slate-900 dark:text-white">{shift.shift_type} • {shift.period || '12h'}</p>
            </div>

            <div className="bg-slate-50 dark:bg-slate-700/50 p-4 rounded-xl">
              <div className="flex items-center gap-3 mb-2">
                <Calendar className="text-blue-600 dark:text-blue-400" size={20} />
                <span className="text-xs font-black text-slate-500 dark:text-slate-400 uppercase tracking-wider">Data</span>
              </div>
              <p className="text-lg font-black text-slate-900 dark:text-white">
                {new Date(shift.date + 'T00:00:00').toLocaleDateString('pt-PT', { 
                  weekday: 'long', 
                  year: 'numeric', 
                  month: 'long', 
                  day: 'numeric' 
                })}
              </p>
            </div>

            <div className="bg-slate-50 dark:bg-slate-700/50 p-4 rounded-xl">
              <div className="flex items-center gap-3 mb-2">
                <MapPin className="text-blue-600 dark:text-blue-400" size={20} />
                <span className="text-xs font-black text-slate-500 dark:text-slate-400 uppercase tracking-wider">Hospital</span>
              </div>
              <p className="text-lg font-black text-slate-900 dark:text-white">{shift.hospital}</p>
            </div>
          </div>

          <div className="flex gap-3">
            <button
              onClick={() => {
                onDelete(shift.id, shift.doctor_name);
                onClose();
              }}
              className="flex-1 py-4 bg-red-600 dark:bg-red-500 text-white rounded-xl font-bold hover:bg-red-700 dark:hover:bg-red-600 transition-colors flex items-center justify-center gap-2"
            >
              <Trash2 size={18} />
              Eliminar
            </button>
            <button
              onClick={() => {
                onEdit(shift);
                onClose();
              }}
              className="flex-1 py-4 bg-blue-600 dark:bg-blue-500 text-white rounded-xl font-bold hover:bg-blue-700 dark:hover:bg-blue-600 transition-colors flex items-center justify-center gap-2"
            >
              <Pencil size={18} />
              Editar
            </button>
          </div>
          
          <button
            onClick={onClose}
            className="w-full py-4 bg-slate-100 dark:bg-slate-700 text-slate-700 dark:text-slate-300 rounded-xl font-bold hover:bg-slate-200 dark:hover:bg-slate-600 transition-colors"
          >
            Fechar
          </button>
        </div>
      </div>
    </div>
  );
}