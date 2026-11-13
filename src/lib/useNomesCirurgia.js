import { useQuery } from '@tanstack/react-query';
import { base44 } from '@/api/base44Client';

// O nome da cirurgia é guardado no início da descrição do procedimento ("Nome • Tipo").
const nomeDaDescricao = (descricao) => String(descricao || '').split('•')[0].trim();

export default function useNomesCirurgia() {
  return useQuery({
    queryKey: ['nomes-cirurgia'],
    queryFn: async () => {
      const page = await base44.entities.Procedimento.filter(
        { tipo: 'Cirurgia' },
        { sort: '-created_date', limit: 300 }
      );
      const nomes = new Map();
      for (const item of page?.items || []) {
        const nome = nomeDaDescricao(item.descricao);
        if (nome) nomes.set(nome.toLowerCase(), nome);
      }
      return [...nomes.values()].sort((a, b) => a.localeCompare(b, 'pt-BR'));
    },
  });
}