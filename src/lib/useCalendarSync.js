import { useState, useEffect, useRef, useCallback } from 'react';
import { useQueryClient } from '@tanstack/react-query';
import { base44 } from '@/api/base44Client';

const INTERVALO_MS = 5 * 60 * 1000;

export default function useCalendarSync({ enabled }) {
  const [sincronizando, setSincronizando] = useState(false);
  const [ultimaSincronizacao, setUltimaSincronizacao] = useState(null);
  const [resumo, setResumo] = useState(null);
  const [erro, setErro] = useState(null);
  const queryClient = useQueryClient();
  const emAndamento = useRef(false);

  const atualizarAgenda = useCallback(() => {
    queryClient.invalidateQueries({ queryKey: ['shifts'] });
    queryClient.invalidateQueries({ queryKey: ['cirurgias-agenda'] });
    queryClient.invalidateQueries({ queryKey: ['cirurgias-hoje'] });
  }, [queryClient]);

  const sincronizar = useCallback(async () => {
    if (!enabled || emAndamento.current) return null;
    emAndamento.current = true;
    setSincronizando(true);
    setErro(null);
    try {
      const resposta = await base44.functions.invoke('syncGoogleCalendar', {});
      const dados = resposta?.data || {};
      setUltimaSincronizacao(dados.synced_at || new Date().toISOString());
      setResumo(dados);
      atualizarAgenda();
      return dados;
    } catch (error) {
      const detalhe = error?.response?.data || error;
      setErro(
        detalhe?.needs_connection
          ? 'Google Calendar não está conectado.'
          : 'Não foi possível sincronizar agora.'
      );
      return null;
    } finally {
      emAndamento.current = false;
      setSincronizando(false);
    }
  }, [enabled, atualizarAgenda]);

  // Sincronização automática e contínua enquanto a agenda está aberta
  useEffect(() => {
    if (!enabled) return undefined;
    sincronizar();
    const temporizador = setInterval(sincronizar, INTERVALO_MS);
    return () => clearInterval(temporizador);
  }, [enabled, sincronizar]);

  // Alterações vindas do servidor aparecem na hora, sem recarregar a página
  useEffect(() => {
    const cancelar = [
      base44.entities.Shift.subscribe(atualizarAgenda),
      base44.entities.Procedimento.subscribe(atualizarAgenda),
    ];
    return () => cancelar.forEach((fn) => typeof fn === 'function' && fn());
  }, [atualizarAgenda]);

  return { sincronizando, ultimaSincronizacao, resumo, erro, sincronizar };
}