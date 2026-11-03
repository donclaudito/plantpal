// Normalização e opções de filtro para médicos/hospitais.
// Os plantões antigos guardam nome do hospital e do médico com variações de
// maiúsculas/acentos e muitos não têm doctor_id, por isso comparamos sempre
// pelo nome normalizado.

export const normalizarNome = (valor) =>
  String(valor || '')
    .normalize('NFD')
    .replace(/[\u0300-\u036f]/g, '')
    .replace(/\s+/g, ' ')
    .trim()
    .toUpperCase();

export const normalizarHospital = (valor) => {
  const nome = normalizarNome(valor);
  return nome === 'AMBULATORIO CONV' ? 'AMBULATORIO CONVENIO' : nome;
};

export const encontrarHospital = (hospitals, nomeHospital) => {
  const alvo = normalizarHospital(nomeHospital);
  if (!alvo) return null;
  return hospitals.find((h) => normalizarHospital(h.name) === alvo) || null;
};

export const resolverDoctorId = (doctors, shift) => {
  const porId = doctors.find((d) => d.id === shift.doctor_id);
  if (porId) return porId.id;
  const alvo = normalizarNome(shift.doctor_name);
  const porNome = doctors.find((d) => normalizarNome(d.full_name) === alvo);
  return porNome?.id || shift.doctor_id || null;
};

const ordenarOpcoes = (mapa) =>
  Array.from(mapa, ([value, label]) => ({ value, label })).sort((a, b) =>
    a.label.localeCompare(b.label, 'pt')
  );

export const opcoesMedicos = (doctors, shifts) => {
  const mapa = new Map();
  doctors.forEach((d) => {
    const chave = normalizarNome(d.full_name);
    if (chave) mapa.set(chave, d.full_name);
  });
  shifts.forEach((s) => {
    const chave = normalizarNome(s.doctor_name);
    if (chave && !mapa.has(chave)) mapa.set(chave, s.doctor_name);
  });
  return ordenarOpcoes(mapa);
};

export const opcoesHospitais = (hospitals, shifts) => {
  const mapa = new Map();
  hospitals.forEach((h) => {
    const chave = normalizarHospital(h.name);
    if (chave) mapa.set(chave, h.name);
  });
  shifts.forEach((s) => {
    const chave = normalizarHospital(s.hospital);
    if (chave && !mapa.has(chave)) mapa.set(chave, s.hospital);
  });
  return ordenarOpcoes(mapa);
};