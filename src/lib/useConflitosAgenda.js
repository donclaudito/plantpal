import { useQuery } from '@tanstack/react-query';
import { base44 } from '@/api/base44Client';
import { conflitosDoAgendamento, janelaDoCompromisso, variantesDeData } from '@/lib/conflitosAgenda';

export default function useConflitosAgenda({
  data,
  doctorName,
  tipo = 'plantao',
  shiftType,
  period,
  ignorarIds = [],
  enabled = true,
}) {
  const datas = variantesDeData(data);
  const ativo = enabled && datas.length > 0 && Boolean(String(doctorName || '').trim());

  const { data: registos } = useQuery({
    queryKey: ['conflitos-agenda', datas.join('|')],
    queryFn: async () => {
      const [plantoes, cirurgias] = await Promise.all([
        base44.entities.Shift.filter({ date: { $in: datas } }, { limit: 200 }),
        base44.entities.Procedimento.filter({ tipo: 'Cirurgia', data: { $in: datas } }, { limit: 200 }),
      ]);
      return { shifts: plantoes.items || [], cirurgias: cirurgias.items || [] };
    },
    enabled: ativo,
  });

  if (!ativo) return [];

  const janela = tipo === 'plantao' ? janelaDoCompromisso({ shift_type: shiftType, period }) : null;

  return conflitosDoAgendamento({
    doctorName,
    janela,
    shifts: registos?.shifts || [],
    cirurgias: registos?.cirurgias || [],
    ignorarIds,
  });
}