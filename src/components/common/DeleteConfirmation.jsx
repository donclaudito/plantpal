import React from 'react';
import { AlertTriangle } from 'lucide-react';

export default function DeleteConfirmation({ isOpen, name, onConfirm, onCancel }) {
  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 bg-black/60 backdrop-blur-sm z-50 flex items-center justify-center p-4 animate-in fade-in duration-200">
      <div className="bg-white dark:bg-slate-800 rounded-3xl shadow-2xl max-w-md w-full p-6 animate-in zoom-in-95 duration-200">
        <div className="flex items-center gap-3 mb-4">
          <div className="w-12 h-12 bg-red-100 dark:bg-red-900/30 rounded-2xl flex items-center justify-center">
            <AlertTriangle className="text-red-600 dark:text-red-400" size={24} />
          </div>
          <div>
            <h3 className="text-lg font-black text-slate-900 dark:text-white">Eliminar Plantão</h3>
            <p className="text-xs text-slate-500 dark:text-slate-400">Esta ação não pode ser revertida</p>
          </div>
        </div>
        
        <p className="text-sm text-slate-600 dark:text-slate-300 mb-6">
          Tem certeza que deseja eliminar o plantão de <strong>{name}</strong>?
        </p>
        
        <div className="flex gap-3">
          <button
            onClick={onCancel}
            className="flex-1 py-3 bg-slate-100 dark:bg-slate-700 text-slate-700 dark:text-slate-300 rounded-xl font-bold hover:bg-slate-200 dark:hover:bg-slate-600 transition-colors"
          >
            Cancelar
          </button>
          <button
            onClick={onConfirm}
            className="flex-1 py-3 bg-red-600 dark:bg-red-500 text-white rounded-xl font-bold hover:bg-red-700 dark:hover:bg-red-600 transition-colors"
          >
            Eliminar
          </button>
        </div>
      </div>
    </div>
  );
}