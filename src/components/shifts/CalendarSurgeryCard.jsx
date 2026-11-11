import React from 'react';
import { Trash2 } from 'lucide-react';

export default function CalendarSurgeryCard({
  surgery,
  isDragging = false,
  isViewer = false,
  dragProps = {},
  onClick,
  onDelete,
  compact = false,
}) {
  return (
    <div
      {...dragProps}
      title={[surgery.hospital_name, surgery.paciente, surgery.descricao].filter(Boolean).join(' • ')}
      onClick={(e) => {
        e.stopPropagation();
        if (onClick) onClick(surgery);
      }}
      className={`group relative rounded-xl bg-rose-100 dark:bg-rose-900/30 border border-rose-400 dark:border-rose-600 hover:shadow-lg transition-all cursor-pointer ${
        compact ? 'p-2 text-xs' : 'p-3'
      } ${isDragging ? 'opacity-50 scale-95' : ''}`}
    >
      <div className="font-black text-rose-800 dark:text-rose-200 truncate uppercase tracking-wide text-[10px]">
        Cirurgia • {surgery.hospital_name}
      </div>
      <div className={`text-rose-700 dark:text-rose-300 truncate mt-0.5 ${compact ? 'text-[9px]' : 'text-[11px]'}`}>
        {surgery.paciente || surgery.descricao || 'Programada'}
      </div>

      {!isViewer && onDelete && (
        <button
          onClick={(e) => {
            e.stopPropagation();
            onDelete(surgery);
          }}
          className={`absolute -top-1 -right-1 w-5 h-5 bg-red-600 dark:bg-red-500 text-white rounded-full transition-opacity flex items-center justify-center shadow-lg ${
            compact ? 'opacity-100 sm:opacity-0 sm:group-hover:opacity-100' : 'opacity-100'
          }`}
        >
          <Trash2 size={10} />
        </button>
      )}
    </div>
  );
}