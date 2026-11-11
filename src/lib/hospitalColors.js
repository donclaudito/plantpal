const normalize = (value) => (value || '')
  .toString()
  .normalize('NFD')
  .replace(/[\u0300-\u036f]/g, '')
  .toUpperCase();

const HOSPITAL_COLORS = [
  {
    label: 'Cirurgia SUS',
    matches: (h) => h.includes('CIRURGIA') && (h.includes('SUS') || !h.includes('CONVENIO')),
    bg: 'bg-rose-200 dark:bg-rose-700/40',
    border: 'border-rose-500 dark:border-rose-400',
  },
  {
    label: 'Cirurgia Convênio',
    matches: (h) => h.includes('CIRURGIA'),
    bg: 'bg-amber-200 dark:bg-amber-600/40',
    border: 'border-amber-500 dark:border-amber-400',
  },
  {
    label: 'Ambulatório SUS',
    matches: (h) => h.includes('AMBUL') && h.includes('SUS'),
    bg: 'bg-sky-200 dark:bg-sky-700/40',
    border: 'border-sky-500 dark:border-sky-400',
  },
  {
    label: 'Ambulatório Convênio',
    matches: (h) => h.includes('AMBUL'),
    bg: 'bg-violet-200 dark:bg-violet-700/40',
    border: 'border-violet-500 dark:border-violet-400',
  },
];

export function getHospitalColor(hospital) {
  const normalized = normalize(hospital);
  if (!normalized) return null;
  const found = HOSPITAL_COLORS.find(color => color.matches(normalized));
  return found ? { bg: found.bg, border: found.border } : null;
}