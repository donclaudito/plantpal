import { useEffect, useState } from 'react';
import { useQuery } from '@tanstack/react-query';
import { base44 } from '@/api/base44Client';

export default function useShiftQuote({
  doctorId,
  hospital,
  period = '12h',
  shiftType = '',
  tipo = 'plantao',
  enabled = true,
  grossValue = null,
  quantity = 0,
  valorConsulta = 0,
}) {
  const [quotedGross, setQuotedGross] = useState(grossValue);
  useEffect(() => {
    const timeout = setTimeout(() => setQuotedGross(grossValue), 300);
    return () => clearTimeout(timeout);
  }, [grossValue]);
  const query = useQuery({
    queryKey: ['shiftQuote', tipo, doctorId, hospital, period, shiftType, quotedGross, quantity, valorConsulta],
    queryFn: async () => {
      const response = await base44.functions.invoke('getShiftQuote', { tipo, doctorId, hospital, period, shiftType, grossValue: quotedGross, quantity, valorConsulta });
      return response.data;
    },
    enabled: enabled && !!doctorId && !!hospital,
    placeholderData: previous => previous,
  });
  return { ...query, isFetching: query.isFetching || grossValue !== quotedGross };
}