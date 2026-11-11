const normalizar = (valor) =>
  String(valor || '')
    .normalize('NFD')
    .replace(/[\u0300-\u036f]/g, '')
    .toUpperCase()
    .trim();

const JANELAS_POR_TIPO = [
  { chave: (t) => t.includes('24H'), janela: [0, 1440] },
  { chave: (t) => t.includes('DIURN') && t.includes('MANHA'), janela: [420, 780] },
  { chave: (t) => t.includes('DIURN') && t.includes('TARDE'), janela: [780, 1140] },
  { chave: (t) => t.includes('NOTURN') || t.includes('NOITE'), janela: [1140, 1860] },
  { chave: (t) => t.includes('DIURN'), janela: [420, 1140] },
];

const JANELAS_POR_PERIODO = {
  '24H': [0, 1440],
  '12H': [420, 1140],
  '6H': [420, 780],
};

export const janelaDoPlantao = (shift) => {
  const tipo = normalizar(shift.shift_type);
  const porTipo = JANELAS_POR_TIPO.find(item => item.chave(tipo));
  if (porTipo) return porTipo.janela;
  return JANELAS_POR_PERIODO[normalizar(shift.period)] || null;
};

export const dataHoje = () => {
  const agora = new Date();
  const mes = String(agora.getMonth() + 1).padStart(2, '0');
  const dia = String(agora.getDate()).padStart(2, '0');
  return `${agora.getFullYear()}-${mes}-${dia}`;
};

export const formatarDataCurta = (data) => {
  const partes = String(data || '').split('-');
  return partes.length === 3 ? `${partes[2]}/${partes[1]}` : data || '';
};

export const conflitosDeHorario = (shifts = []) => {
  const grupos = new Map();

  shifts
    .filter(shift => shift.date && shift.status !== 'Cancelado')
    .forEach(shift => {
      const janela = janelaDoPlantao(shift);
      const medico = normalizar(shift.doctor_name);
      if (!janela || !medico) return;
      const chave = `${shift.date}|${medico}`;
      const lista = grupos.get(chave) || [];
      lista.push({ shift, janela });
      grupos.set(chave, lista);
    });

  const conflitos = [];
  grupos.forEach((lista) => {
    for (let i = 0; i < lista.length; i += 1) {
      for (let j = i + 1; j < lista.length; j += 1) {
        const a = lista[i];
        const b = lista[j];
        const sobreposto = a.janela[0] < b.janela[1] && b.janela[0] < a.janela[1];
        if (!sobreposto) continue;
        conflitos.push({
          id: `${a.shift.id}-${b.shift.id}`,
          date: a.shift.date,
          doctor: a.shift.doctor_name,
          mensagem: `${a.shift.hospital} (${a.shift.shift_type}) e ${b.shift.hospital} (${b.shift.shift_type})`,
        });
      }
    }
  });

  return conflitos.sort((a, b) => a.date.localeCompare(b.date));
};