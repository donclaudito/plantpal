import React, { useState } from 'react';
import { base44 } from '@/api/base44Client';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { Plus, Check, X } from 'lucide-react';

// Lista histórica que estava fixa no ShiftModal. É mantida como base para que
// nenhum plantão antigo perca a especialidade caso o cadastro ainda esteja vazio.
const ESPECIALIDADES_PADRAO = [
  'CIRURGIA GERAL',
  'CLÍNICA MÉDICA',
  'PEDIATRIA',
  'GINECOLOGIA',
  'ORTOPEDIA',
  'ANESTESIA',
  'GASTROENTEROLOGIA',
  'CIRURGIA DIGESTIVA',
  'OUTRA'
];

/**
 * Seletor de especialidades alimentado pelo cadastro (entidade Especialidade),
 * com criação rápida de uma nova especialidade sem sair do formulário.
 *
 * value/onChange funcionam como um <select> comum, inclusive em react-hook-form.
 */
export default function EspecialidadeSelect({ value, onChange, className = '', allowCreate = true }) {
  const [adding, setAdding] = useState(false);
  const [novoNome, setNovoNome] = useState('');
  const [erro, setErro] = useState(null);
  const queryClient = useQueryClient();

  const { data: especialidades = [] } = useQuery({
    queryKey: ['especialidades'],
    queryFn: async () => {
      try {
        return await base44.entities.Especialidade.list('name');
      } catch (error) {
        // Entidade indisponível: cai na lista padrão em vez de quebrar o formulário.
        console.error('Erro ao carregar especialidades:', error);
        return [];
      }
    },
    retry: false
  });

  const createMutation = useMutation({
    mutationFn: (data) => base44.entities.Especialidade.create(data),
    onSuccess: (criada, variables) => {
      queryClient.invalidateQueries({ queryKey: ['especialidades'] });
      setNovoNome('');
      setErro(null);
      setAdding(false);
      if (onChange) onChange(criada?.name || variables.name);
    },
    onError: (error) => setErro(error.message || 'Erro ao criar especialidade')
  });

  const cadastradas = especialidades
    .filter((e) => e.ativo !== false && e.name)
    .map((e) => e.name.trim());

  const opcoes = [...new Set([...cadastradas, ...ESPECIALIDADES_PADRAO])].filter(Boolean);
  const atual = (value || '').trim();
  if (atual && !opcoes.some((o) => o.toLowerCase() === atual.toLowerCase())) {
    opcoes.push(atual); // preserva valores antigos/fora do cadastro
  }

  const jaExiste = (nome) =>
    [...opcoes, ...especialidades.map((e) => (e.name || '').trim())].some(
      (o) => o.toLowerCase() === nome.toLowerCase()
    );

  const handleConfirmar = (e) => {
    e.preventDefault();
    e.stopPropagation();
    const nome = novoNome.trim();

    if (!nome) {
      setErro('Informe o nome da especialidade');
      return;
    }
    if (jaExiste(nome)) {
      if (onChange) onChange(especialidades.find((esp) => (esp.name || '').trim().toLowerCase() === nome.toLowerCase())?.name || nome);
      setNovoNome('');
      setErro(null);
      setAdding(false);
      return;
    }

    createMutation.mutate({ name: nome, ativo: true });
  };

  const cancelar = (e) => {
    e.preventDefault();
    e.stopPropagation();
    setAdding(false);
    setNovoNome('');
    setErro(null);
  };

  return (
    <div>
      <select
        value={value || ''}
        onChange={(e) => onChange && onChange(e.target.value)}
        className={className}
      >
        <option value="">Selecione a especialidade</option>
        {opcoes.map((s) => (
          <option key={s} value={s}>{s}</option>
        ))}
      </select>

      {allowCreate && !adding && (
        <button
          type="button"
          onClick={(e) => {
            e.preventDefault();
            setAdding(true);
          }}
          className="mt-2 flex items-center gap-1 text-xs font-bold text-blue-600 hover:text-blue-700 dark:text-blue-400"
        >
          <Plus size={14} />
          Adicionar nova especialidade
        </button>
      )}

      {allowCreate && adding && (
        <div className="mt-2 p-3 rounded-xl border-2 border-blue-200 bg-blue-50 dark:bg-slate-700 dark:border-slate-600">
          <div className="flex items-center gap-2">
            <input
              type="text"
              value={novoNome}
              onChange={(e) => {
                setNovoNome(e.target.value);
                setErro(null);
              }}
              onKeyDown={(e) => {
                if (e.key === 'Enter') {
                  e.preventDefault();
                  handleConfirmar(e);
                }
                if (e.key === 'Escape') cancelar(e);
              }}
              placeholder="Nome da nova especialidade"
              autoFocus
              className="flex-1 px-3 py-2 bg-white dark:bg-slate-800 border-2 border-transparent focus:border-blue-600 rounded-lg font-bold text-sm text-slate-900 dark:text-white"
            />
            <button
              type="button"
              onClick={handleConfirmar}
              disabled={createMutation.isPending}
              title="Adicionar especialidade"
              className="p-2 bg-green-600 text-white rounded-lg hover:bg-green-700 disabled:opacity-50"
            >
              <Check size={16} />
            </button>
            <button
              type="button"
              onClick={cancelar}
              title="Cancelar"
              className="p-2 bg-slate-200 dark:bg-slate-600 text-slate-700 dark:text-slate-200 rounded-lg hover:bg-slate-300"
            >
              <X size={16} />
            </button>
          </div>
          {erro && <p className="mt-2 text-xs font-bold text-red-600">{erro}</p>}
          {createMutation.isPending && (
            <p className="mt-2 text-xs font-bold text-blue-600">Salvando...</p>
          )}
        </div>
      )}
    </div>
  );
}
