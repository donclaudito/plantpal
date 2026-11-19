import { janelaDoPlantao } from '@/lib/shiftConflicts';

const normalizar = (valor) =>
  String(valor || '')
    .normalize('NFD')
    .replace(/[\u0300-\u036f]/g, '')
    .toUpperCase()
    .trim();

// Períodos de consultas não têm hora; ocupam o dia de ambulatório.
const JANELA_CONSULTAS = [420, 1140];

export const janelaDoCompromisso = (shift = {}) => {
  const janela = janelaDoPlantao(shift);
  if (janela) return janela;
  return normalizar(shift.period) === 'CONSULTAS' ? JANELA_CONSULTAS : null;
};

// A base de dados guarda datas em ISO (2026-11-04) ou em pt-BR (04/11/2026).
export const variantesDeData = (data) => {
  const bruto = String(data || '').trim();
  const iso = bruto.match(/^(\d{4})-(\d{2})-(\d{2})/);
  if (iso) return [`${iso[1]}-${iso[2]}-${iso[3]}`, `${iso[3]}/${iso[2]}/${iso[1]}`];
  const br = bruto.match(/^(\d{2})\/(\d{2})\/(\d{4})$/);
  if (br) return [`${br[3]}-${br[2]}-${br[1]}`, bruto];
  return [];
};

// Sem janela definida (cirurgias e consultas) o compromisso ocupa o dia inteiro.
const sobrepoe = (a, b) => {
  if (!a || !b) return true;
  return a[0] < b[1] && b[0] < a[1];
};

const rotuloDoPlantao = (shift) =>
  ['Plantão', shift.shift_type, shift.hospital].filter(Boolean).join(' · ');

const rotuloDaCirurgia = (cirurgia) =>
  ['Cirurgia', cirurgia.hospital_name, cirurgia.paciente].filter(Boolean).join(' · ');

export const conflitosDoAgendamento = ({
  doctorName,
  janela,
  shifts = [],
  cirurgias = [],
  ignorarIds = [],
}) => {
  const medico = normalizar(doctorName);
  if (!medico) return [];

  const ignorar = new Set((ignorarIds || []).filter(Boolean));
  const conflitos = [];

  shifts.forEach((shift) => {
    if (!shift || ignorar.has(shift.id) || shift.status === 'Cancelado') return;
    if (normalizar(shift.doctor_name) !== medico) return;
    if (!sobrepoe(janela, janelaDoCompromisso(shift))) return;
    conflitos.push({ id: `shift-${shift.id}`, rotulo: rotuloDoPlantao(shift) });
  });

  cirurgias.forEach((cirurgia) => {
    if (!cirurgia || ignorar.has(cirurgia.id) || cirurgia.tipo !== 'Cirurgia') return;
    if (normalizar(cirurgia.doctor_name) !== medico) return;
    if (!sobrepoe(janela, null)) return;
    conflitos.push({ id: `cirurgia-${cirurgia.id}`, rotulo: rotuloDaCirurgia(cirurgia) });
  });

  return conflitos;
};