import { useEffect, useState } from 'react';
import { useQuery } from '@tanstack/react-query';
import { base44 } from '@/api/base44Client';

export default function useShiftQuote(doctorId, hospital, period, enabled = true, grossValue = null) {
  const [quotedGross, setQuotedGross] = useState(grossValue);
  useEffect(() => {
    const timeout = setTimeout(() => setQuotedGross(grossValue), 300);
    return () => clearTimeout(timeout);
  }, [grossValue]);
  const query = useQuery({
    queryKey: ['shiftQuote', doctorId, hospital, period, quotedGross],
    queryFn: async () => {
      const response = await base44.functions.invoke('getShiftQuote', { doctorId, hospital, period, grossValue: quotedGross });
      return response.data;
    },
    enabled: enabled && !!doctorId && !!hospital,
    placeholderData: previous => previous,
  });
  return { ...query, isFetching: query.isFetching || grossValue !== quotedGross };
}