export const isSurgeryHospital = (hospital) => {
  const normalized = (hospital || '')
    .toString()
    .normalize('NFD')
    .replace(/[\u0300-\u036f]/g, '')
    .toUpperCase();
  return normalized.includes('CIRURGIA') && normalized.includes('CONVENIO');
};

export const tipoPagamentoDoConvenio = (convenio) => {
  const normalized = (convenio || '').toUpperCase();
  if (normalized.includes('SUS')) return 'SUS';
  if (normalized.includes('PARTICULAR')) return 'Particular';
  return 'Convenio';
};

export const CAMPOS_INTERNAMENTO = [
  { key: 'mae', label: 'Mãe' },
  { key: 'prontuario', label: 'Prontuário' },
  { key: 'data_nascimento', label: 'Data de nascimento' },
  { key: 'atendimento', label: 'Atendimento' },
  { key: 'prescricao', label: 'Prescrição' },
  { key: 'cirurgia_codigo', label: 'Cirurgia (código)' },
  { key: 'sexo', label: 'Sexo' },
  { key: 'duracao', label: 'Duração' },
  { key: 'carater_cirurgico', label: 'Caráter cirúrgico' },
  { key: 'setor', label: 'Setor' },
  { key: 'acomodacao', label: 'Acomodação' },
  { key: 'tipo_internamento', label: 'Tipo' }
];

const extras = () => CAMPOS_INTERNAMENTO.reduce((acc, campo) => ({ ...acc, [campo.key]: '' }), {});

export const emptyProntuario = () => ({
  paciente: '',
  convenio: '',
  tipoCirurgia: '',
  nomeCirurgia: '',
  valor: '',
  data: '',
  ...extras()
});

const convenioDaObservacao = (observacoes) => {
  const match = String(observacoes || '').match(/Conv[eê]nio:\s*([^•\n]+)/i);
  return match ? match[1].trim() : '';
};

export const fichaDoProcedimento = (procedimento) => ({
  ...emptyProntuario(),
  paciente: procedimento?.paciente || '',
  convenio: convenioDaObservacao(procedimento?.observacoes),
  nomeCirurgia: procedimento?.descricao || '',
  valor: procedimento?.valor ?? '',
  ...extras(),
  ...(procedimento?.ficha || {})
});

export const internamentoDoProntuario = (prontuario) => {
  const ficha = {};
  for (const campo of CAMPOS_INTERNAMENTO) {
    const valor = String(prontuario?.[campo.key] || '').trim();
    if (valor) ficha[campo.key] = valor;
  }
  return ficha;
};