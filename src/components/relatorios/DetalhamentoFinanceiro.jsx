import React from 'react';
import { Button } from '@/components/ui/button';
import { formatQuantity } from '@/lib/quantity';

const Tabela = ({ titulo, colunas, linhas }) => (
  <div className="bg-white rounded-2xl border border-slate-200 shadow-md overflow-hidden">
    <div className="px-6 py-4 bg-slate-100 border-b border-slate-200">
      <h2 className="text-lg font-black text-slate-900">{titulo}</h2>
    </div>
    <div className="overflow-x-auto">
      <table className="w-full">
        <thead className="bg-slate-50">
          <tr>
            {colunas.map((coluna) => (
              <th
                key={coluna.label}
                className={`px-6 py-4 text-xs font-black text-slate-600 uppercase ${coluna.alinhamento || 'text-left'}`}
              >
                {coluna.label}
              </th>
            ))}
          </tr>
        </thead>
        <tbody className="divide-y divide-slate-200">
          {linhas.length === 0 ? (
            <tr>
              <td colSpan={colunas.length} className="px-6 py-8 text-sm text-slate-500">
                Sem plantões para os filtros selecionados.
              </td>
            </tr>
          ) : (
            linhas.map((linha) => (
              <tr key={linha.chave} className="hover:bg-slate-50">
                {colunas.map((coluna) => (
                  <td
                    key={coluna.label}
                    className={`px-6 py-4 text-sm ${coluna.alinhamento === 'text-right' ? 'text-right' : ''} ${coluna.classe || 'text-slate-600'}`}
                  >
                    {coluna.valor(linha)}
                  </td>
                ))}
              </tr>
            ))
          )}
        </tbody>
      </table>
    </div>
  </div>
);

const brl = (valor) => `R$ ${Number(valor || 0).toFixed(2)}`;

export default function DetalhamentoFinanceiro({ reports, loading, error, onRetry }) {
  if (error) {
    return (
      <div className="bg-white rounded-2xl border border-slate-200 shadow-md p-6 space-y-3">
        <h2 className="text-lg font-black text-slate-900">Detalhamento financeiro dos plantões</h2>
        <p role="alert" className="text-sm text-red-600">Não foi possível carregar o detalhamento: {error.message}</p>
        <Button onClick={() => onRetry()}>Tentar novamente</Button>
      </div>
    );
  }

  if (loading) {
    return (
      <div className="bg-white rounded-2xl border border-slate-200 shadow-md p-6">
        <p className="text-sm font-bold text-slate-500">A carregar detalhamento financeiro...</p>
      </div>
    );
  }

  const colunasComuns = [
    { label: 'Nº Plantões', alinhamento: 'text-right', valor: (linha) => formatQuantity(linha.numPlantoes) },
    { label: 'Valor Bruto', alinhamento: 'text-right', classe: 'font-bold text-slate-900', valor: (linha) => brl(linha.valorBruto) },
    { label: 'Descontos', alinhamento: 'text-right', classe: 'text-red-600', valor: (linha) => brl(linha.valorDescontos) },
    { label: 'Valor Líquido', alinhamento: 'text-right', classe: 'font-bold text-blue-600', valor: (linha) => brl(linha.valorLiquido) },
  ];

  return (
    <div className="space-y-6">
      <Tabela
        titulo="Por Hospital"
        colunas={[
          { label: 'Hospital', classe: 'font-bold text-slate-900', valor: (linha) => linha.name },
          { label: 'Nº Médicos', alinhamento: 'text-right', valor: (linha) => linha.doctorCount },
          ...colunasComuns,
        ]}
        linhas={reports.byHospital.map((linha) => ({ ...linha, chave: linha.name }))}
      />

      <Tabela
        titulo="Por Médico"
        colunas={[
          { label: 'Médico', classe: 'font-bold text-slate-900', valor: (linha) => linha.name },
          { label: 'Nº Hospitais', alinhamento: 'text-right', valor: (linha) => linha.hospitalCount },
          ...colunasComuns,
        ]}
        linhas={reports.byDoctor.map((linha) => ({ ...linha, chave: linha.name }))}
      />

      <Tabela
        titulo="Por Médico e Hospital"
        colunas={[
          { label: 'Médico', classe: 'font-bold text-slate-900', valor: (linha) => linha.doctor },
          { label: 'Hospital', valor: (linha) => linha.hospital },
          ...colunasComuns,
        ]}
        linhas={reports.byDoctorHospital.map((linha) => ({ ...linha, chave: `${linha.doctor}-${linha.hospital}` }))}
      />
    </div>
  );
}