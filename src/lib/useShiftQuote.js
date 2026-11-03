import { useQuery } from '@tanstack/react-query';
import { base44 } from '@/api/base44Client';

export default function useShiftQuote(doctorId, hospital, period, enabled = true) {
  return useQuery({
    queryKey: ['shiftQuote', doctorId, hospital, period],
    queryFn: async () => {
      const response = await base44.functions.invoke('getShiftQuote', { doctorId, hospital, period });
      return response.data;
    },
    enabled: enabled && !!doctorId && !!hospital,
  });
}