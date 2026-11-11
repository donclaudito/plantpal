import React from 'react';
import { AlertTriangle } from 'lucide-react';

export const faltandoDados = (procedimento) => ({
  semData: !procedimento.data,
  semMedico: !procedimento.doctor_name && !procedimento.doctor_id,
  semHospital: !procedimento.hospital_name && !procedimento.hospital_id,
  semValor: procedimento.valor === null || procedimento.valor === undefined,
});

export default function DadosFaltandoAlerta({ procedimentos }) {
  const contagem = procedimentos.reduce((total, p) => {
    const faltando = faltandoDados(p);
    total.semData += faltando.semData ? 1 : 0;
    total.semMedico += faltando.semMedico ? 1 : 0;
    total.semHospital += faltando.semHospital ? 1 : 0;
    total.semValor += faltando.semValor ? 1 : 0;
    return total;
  }, { semData: 0, semMedico: 0, semHospital: 0, semValor: 0 });

  const itens = [
    { rotulo: 'sem data', valor: contagem.semData },
    { rotulo: 'sem médico', valor: contagem.semMedico },
    { rotulo: 'sem hospital', valor: contagem.semHospital },
    { rotulo: 'sem valor', valor: contagem.semValor },
  ].filter((item) => item.valor > 0);

  if (itens.length === 0) return null;

  const afetados = procedimentos.filter((p) => Object.values(faltandoDados(p)).some(Boolean)).length;

  return (
    <div className="rounded-lg border border-amber-300 bg-amber-50 p-4">
      <div className="flex items-start gap-3">
        <AlertTriangle className="w-5 h-5 text-amber-600 mt-0.5" />
        <div>
          <p className="font-semibold text-amber-900">
            {afetados} procedimento{afetados > 1 ? 's' : ''} com dados faltando
          </p>
          <div className="flex flex-wrap gap-2 mt-2">
            {itens.map((item) => (
              <span key={item.rotulo} className="inline-flex px-2 py-1 text-xs font-semibold rounded-full bg-amber-200 text-amber-900">
                {item.valor} {item.rotulo}
              </span>
            ))}
          </div>
          <p className="text-xs text-amber-800 mt-2">Abra o procedimento e complete os campos em falta.</p>
        </div>
      </div>
    </div>
  );
}