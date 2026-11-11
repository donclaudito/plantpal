import React, { useEffect, useState } from 'react';
import { base44 } from '@/api/base44Client';
import { Mail, FileText } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { procedimentoTotal } from '@/lib/procedimentoTotals';
import { formatDatePtBr } from '@/lib/dateKeys';

export default function ReciboEnvioModal({ procedimento, hospital, onClose, onSent }) {
  const [email, setEmail] = useState('');
  const [enviando, setEnviando] = useState(false);
  const [erro, setErro] = useState('');

  useEffect(() => {
    setEmail(hospital?.email || '');
    setErro('');
    setEnviando(false);
  }, [procedimento?.id, hospital?.id, hospital?.email]);

  if (!procedimento) return null;

  const emailValido = /.+@.+\..+/.test(email.trim());

  const handleEnviar = async () => {
    setEnviando(true);
    setErro('');
    try {
      const { data } = await base44.functions.invoke('enviarReciboProcedimento', {
        procedimento_id: procedimento.id,
        email_destino: email.trim(),
      });
      onSent(email.trim(), data);
    } catch (e) {
      setErro(e?.response?.data?.error || 'Não foi possível enviar o recibo.');
      setEnviando(false);
    }
  };

  return (
    <Dialog open onOpenChange={(open) => !open && !enviando && onClose()}>
      <DialogContent className="max-w-lg">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <FileText className="w-5 h-5 text-green-600" />
            Enviar recibo em PDF
          </DialogTitle>
        </DialogHeader>

        <div className="space-y-4">
          <div className="rounded-lg bg-gray-50 border border-gray-200 p-4 text-sm space-y-1">
            <p className="font-semibold text-gray-900">
              {procedimento.tipo} · {hospital?.name || procedimento.hospital_name || 'Sem hospital'}
            </p>
            <p className="text-gray-600">Paciente: {procedimento.paciente || '-'}</p>
            <p className="text-gray-600">
              Data: {procedimento.data ? formatDatePtBr(procedimento.data) : '-'} · Total: R$ {procedimentoTotal(procedimento).toFixed(2)}
            </p>
          </div>

          <div>
            <label className="text-sm font-medium text-gray-700 mb-2 block">
              E-mail do hospital
            </label>
            <Input
              type="email"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              placeholder="financeiro@hospital.com.br"
              disabled={enviando}
            />
            <p className="text-xs text-gray-500 mt-2">
              O recibo é enviado pelo seu Gmail e fica guardado em "Enviados".
            </p>
          </div>

          {erro && (
            <p className="text-sm text-red-600 bg-red-50 border border-red-200 rounded-lg p-3">{erro}</p>
          )}

          <div className="flex justify-end gap-2 pt-2">
            <Button variant="outline" onClick={onClose} disabled={enviando}>
              Cancelar
            </Button>
            <Button onClick={handleEnviar} disabled={!emailValido || enviando} className="gap-2">
              <Mail className="w-4 h-4" />
              {enviando ? 'A gerar e enviar...' : 'Gerar PDF e enviar'}
            </Button>
          </div>
        </div>
      </DialogContent>
    </Dialog>
  );
}