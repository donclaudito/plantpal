import React, { useEffect, useRef, useState } from 'react';
import { Check, ChevronDown } from 'lucide-react';

export default function NomeCirurgiaSelect({ value = '', onChange, nomes = [] }) {
  const [isOpen, setIsOpen] = useState(false);
  const containerRef = useRef(null);
  const filtro = String(value || '').trim().toLowerCase();
  const lista = nomes.filter((nome) => !filtro || nome.toLowerCase().includes(filtro));

  useEffect(() => {
    if (!isOpen) return;
    const fechar = (event) => {
      if (!containerRef.current?.contains(event.target)) setIsOpen(false);
    };
    document.addEventListener('mousedown', fechar);
    return () => document.removeEventListener('mousedown', fechar);
  }, [isOpen]);

  const selecionar = (nome) => {
    onChange(nome);
    setIsOpen(false);
  };

  return (
    <div ref={containerRef} className="relative">
      <div className="flex gap-2">
        <input
          type="text"
          value={value}
          onChange={(e) => {
            onChange(e.target.value);
            setIsOpen(true);
          }}
          onFocus={() => setIsOpen(true)}
          placeholder="Selecione ou escreva o nome"
          className="flex-1 px-4 py-3 bg-white dark:bg-slate-700 border-2 border-transparent focus:border-blue-600 dark:focus:border-blue-400 rounded-xl font-bold text-slate-900 dark:text-white transition-colors"
        />
        <button
          type="button"
          onClick={() => setIsOpen((aberto) => !aberto)}
          aria-label="Escolher nome da cirurgia"
          className="px-3 rounded-xl bg-slate-100 dark:bg-slate-600 text-slate-600 dark:text-slate-200 hover:bg-slate-200 dark:hover:bg-slate-500 transition-colors"
        >
          <ChevronDown size={18} />
        </button>
      </div>

      {isOpen && (
        <div className="absolute z-30 mt-1 w-full max-h-56 overflow-y-auto rounded-xl border border-slate-200 dark:border-slate-600 bg-white dark:bg-slate-800 shadow-xl">
          {lista.length === 0 ? (
            <p className="px-4 py-3 text-xs text-slate-500 dark:text-slate-400">
              Nenhuma cirurgia anterior. Escreva um nome novo para o guardar na lista.
            </p>
          ) : (
            lista.map((nome) => (
              <button
                key={nome}
                type="button"
                onClick={() => selecionar(nome)}
                className="flex w-full items-center justify-between gap-2 px-4 py-2 text-left text-sm font-bold text-slate-800 dark:text-slate-100 hover:bg-slate-100 dark:hover:bg-slate-700 transition-colors"
              >
                <span className="truncate">{nome}</span>
                {nome.toLowerCase() === filtro && <Check size={14} className="text-blue-600" />}
              </button>
            ))
          )}
        </div>
      )}
    </div>
  );
}