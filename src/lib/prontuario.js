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

export const emptyProntuario = () => ({
  paciente: '',
  convenio: '',
  tipoCirurgia: '',
  nomeCirurgia: '',
  valor: ''
});