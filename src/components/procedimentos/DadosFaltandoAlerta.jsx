import React from 'react';
import { AlertTriangle, ChevronRight } from 'lucide-react';
import { formatDatePtBr } from '@/lib/dateKeys';

const CAMPOS = [
  { chave: 'semData', rotulo: 'sem data', campo: 'Data' },
  { chave: 'semMedico', rotulo: 'sem médico', campo: 'Médico' },
  { chave: 'semHospital', rotulo: 'sem hospital', campo: 'Hospital' },
  { chave: 'semValor', rotulo: 'sem valor', campo: 'Valor' },
];

export const faltandoDados = (procedimento) => ({
  semData: !procedimento.data,
  semMedico: !procedimento.doctor_name && !procedimento.doctor_id,
  semHospital: !procedimento.hospital_name && !procedimento.hospital_id,
  semValor: procedimento.valor === null || procedimento.valor === undefined,
});

export default function DadosFaltandoAlerta({ procedimentos, onAbrir }) {
  const afetados = procedimentos
    .map((p) => ({
      procedimento: p,
      faltando: CAMPOS.filter((c) => faltandoDados(p)[c.chave]),
    }))
    .filter((item) => item.faltando.length > 0);

  if (afetados.length === 0) return null;

  const contagem = CAMPOS.map((c) => ({
    ...c,
    valor: afetados.filter((item) => item.faltando.some((f) => f.chave === c.chave)).length,
  })).filter((c) => c.valor > 0);

  return (
    <div className="rounded-lg border border-amber-300 bg-amber-50 p-4">
      <div className="flex items-start gap-3">
        <AlertTriangle className="w-5 h-5 text-amber-600 mt-0.5" />
        <div className="flex-1">
          <p className="font-semibold text-amber-900">
            {afetados.length} procedimento{afetados.length > 1 ? 's' : ''} com dados faltando
          </p>
          <div className="flex flex-wrap gap-2 mt-2">
            {contagem.map((c) => (
              <button
                key={c.chave}
                type="button"
                onClick={() => onAbrir(afetados.find((item) => item.faltando.some((f) => f.chave === c.chave)).procedimento)}
                className="inline-flex px-2 py-1 text-xs font-semibold rounded-full bg-amber-200 text-amber-900 hover:bg-amber-300"
              >
                {c.valor} {c.rotulo}
              </button>
            ))}
          </div>
          <div className="mt-3 space-y-1">
            {afetados.map(({ procedimento, faltando }) => (
              <button
                key={procedimento.id}
                type="button"
                onClick={() => onAbrir(procedimento)}
                className="w-full flex items-center justify-between gap-3 text-left px-3 py-2 rounded-md bg-white border border-amber-200 hover:border-amber-400 hover:bg-amber-100"
              >
                <span className="text-xs text-amber-900">
                  <span className="font-semibold">{procedimento.data ? formatDatePtBr(procedimento.data) : 'Sem data'}</span>
                  {' · '}
                  {procedimento.tipo}
                  {procedimento.doctor_name ? ` · ${procedimento.doctor_name}` : ''}
                  {' · '}
                  falta {faltando.map((f) => f.campo.toLowerCase()).join(', ')}
                </span>
                <span className="inline-flex items-center gap-1 text-xs font-semibold text-amber-800 shrink-0">
                  Completar
                  <ChevronRight className="w-3 h-3" />
                </span>
              </button>
            ))}
          </div>
        </div>
      </div>
    </div>
  );
}