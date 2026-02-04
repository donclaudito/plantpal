import React from 'react';
import { CheckCircle, XCircle } from 'lucide-react';

export default function Toast({ message, type = 'success' }) {
  if (!message) return null;

  return (
    <div className="fixed top-4 right-4 z-50 animate-in slide-in-from-top duration-300">
      <div className={`flex items-center gap-3 px-6 py-4 rounded-2xl shadow-2xl ${
        type === 'success' 
          ? 'bg-green-600 dark:bg-green-500 text-white' 
          : 'bg-red-600 dark:bg-red-500 text-white'
      }`}>
        {type === 'success' ? <CheckCircle size={20} /> : <XCircle size={20} />}
        <span className="font-bold text-sm">{message}</span>
      </div>
    </div>
  );
}