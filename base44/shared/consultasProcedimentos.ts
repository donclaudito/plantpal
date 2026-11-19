import { normalizeName, hospitalKey, money } from './shiftPricing.ts';

export const isoDate = (value) => {
  const bruto = String(value || '').trim();
  const iso = bruto.match(/^(\d{4})-(\d{2})-(\d{2})/);
  if (iso) return `${iso[1]}-${iso[2]}-${iso[3]}`;
  const br = bruto.match(/^(\d{2})\/(\d{2})\/(\d{4})$/);
  return br ? `${br[3]}-${br[2]}-${br[1]}` : bruto;
};

export const momentoDoRegisto = (record) =>
  new Date(record?.updated_date || record?.created_date || 0).getTime() || 0;

export const chaveConsulta = (doctorName, hospital, data) =>
  JSON.stringify([normalizeName(doctorName), hospitalKey(hospital), isoDate(data)]);

export const rotuloConsulta = (shiftType) => `Consultas · ${String(shiftType || '').trim()}`.trim();

// Liga cada plantão de consultas ao procedimento que o representa no faturamento.
export function casarConsultas(shifts = [], procedimentos = []) {
  const grupos = new Map();
  for (const procedimento of procedimentos) {
    const chave = chaveConsulta(procedimento.doctor_name, procedimento.hospital_name, procedimento.data);
    if (!grupos.has(chave)) grupos.set(chave, []);
    grupos.get(chave).push(procedimento);
  }

  const usados = new Set();
  const pares = [];
  const plantoesSemProcedimento = [];
  const ordenados = [...shifts].sort((a, b) =>
    String(a.date || '').localeCompare(String(b.date || '')) || String(a.shift_type || '').localeCompare(String(b.shift_type || '')));

  for (const shift of ordenados) {
    const candidatos = grupos.get(chaveConsulta(shift.doctor_name, shift.hospital, shift.date)) || [];
    const rotulo = rotuloConsulta(shift.shift_type);
    const procedimento = candidatos.find(p => !usados.has(p.id) && (p.descricao || '').trim() === rotulo)
      || candidatos.find(p => !usados.has(p.id) && (!p.descricao || p.descricao === '-'));
    if (procedimento) {
      usados.add(procedimento.id);
      pares.push({ shift, procedimento });
    } else {
      plantoesSemProcedimento.push(shift);
    }
  }

  return {
    pares,
    plantoesSemProcedimento,
    procedimentosSemPlantao: procedimentos.filter(p => !usados.has(p.id)),
  };
}

export const linhaDoProcedimento = (procedimento) => {
  const quantidade = Number(procedimento.quantidade) || 0;
  const valor = Number(procedimento.valor) || 0;
  return {
    doctor_name: procedimento.doctor_name,
    hospital: procedimento.hospital_name,
    period: 'consultas',
    count: 1,
    quantidade_consultas: quantidade,
    valor_consulta: valor,
    sum_value: money(quantidade * valor),
    date: procedimento.data,
  };
};

export const linhaDoPlantao = (shift) => {
  const quantidade = Number(shift.quantidade_consultas) || 0;
  const valor = Number(shift.valor_consulta) || 0;
  return {
    doctor_name: shift.doctor_name,
    hospital: shift.hospital,
    shift_type: shift.shift_type,
    period: 'consultas',
    count: 1,
    quantidade_consultas: quantidade,
    valor_consulta: valor,
    sum_value: money(quantidade * valor),
    date: shift.date,
  };
};