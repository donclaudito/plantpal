import { normalizarNome } from '@/lib/shiftFilters';

export const MEDICO_PADRAO = 'CLAUDIO';

export const idMedicoPadrao = (doctors = []) =>
  doctors.find((d) => normalizarNome(d.full_name) === MEDICO_PADRAO)?.id || 'all';