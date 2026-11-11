import React, { useState } from 'react';
import { base44 } from '@/api/base44Client';
import { Button } from '@/components/ui/button';
import { Upload, Loader2, X, CheckCircle, AlertTriangle } from 'lucide-react';
import PixReceiptReview from './PixReceiptReview';
import { bestMatchName, monthFromDate, toIsoDate } from '@/lib/pixMatch';

const today = () => new Date().toISOString().slice(0, 10);

export default function PixReceiptImport({ doctors, hospitals, competencias, depositsData, onSave, formatMonth, onClose }) {
  const [status, setStatus] = useState('idle');
  const [error, setError] = useState(null);
  const [form, setForm] = useState(null);
  const [confirmReplace, setConfirmReplace] = useState(false);

  const update = (patch) => setForm((prev) => ({ ...prev, ...patch }));

  const readReceipt = async (file) => {
    setStatus('extracting');
    setError(null);
    setForm(null);
    setConfirmReplace(false);
    try {
      const { file_url } = await base44.integrations.Core.UploadPublicFile({ file });
      const response = await base44.functions.invoke('extractPixReceipt', { file_url });
      const extracted = response.data?.data || {};
      const valor = Number(extracted.valor) || 0;
      const dataPagamento = toIsoDate(extracted.data) || today();
      const haystack = [extracted.pagador, extracted.recebedor, extracted.descricao].filter(Boolean).join(' ');
      const doctor = bestMatchName(doctors, 'full_name', haystack);
      const hospital = bestMatchName(hospitals, 'name', haystack);

      setForm({
        valor_pago: valor || '',
        data_pagamento: dataPagamento,
        doctor_id: doctor?.id || '',
        hospital_id: hospital?.id || '',
        mes_competencia: monthFromDate(dataPagamento),
        mes_deposito: monthFromDate(dataPagamento),
        pagador: extracted.pagador || '',
        recebedor: extracted.recebedor || '',
        file_url,
      });
      if (!valor) setError('Valor não identificado no recibo. Informe manualmente para calcular a entrada.');
      setStatus('review');
    } catch (err) {
      setError(err?.response?.data?.error || 'Não foi possível ler este recibo. Tente outro arquivo.');
      setStatus('idle');
    }
  };

  const matched = form
    ? depositsData.find((deposit) =>
        (deposit.doctorId || deposit.doctor_id) === form.doctor_id &&
        (deposit.hospitalId || deposit.hospital_id) === form.hospital_id &&
        (deposit.mesCompetencia || deposit.mes_competencia) === form.mes_competencia)
    : null;

  const alreadyRegistered = Boolean(matched && (matched.comprovante_pix || matched.status === 'Pago'));

  const save = async () => {
    if (!form) return;
    if (!(Number(form.valor_pago) > 0)) {
      setError('Informe o valor recebido no recibo.');
      return;
    }
    if (!form.doctor_id || !form.hospital_id || !form.mes_competencia) {
      setError('Selecione médico, hospital e mês de competência.');
      return;
    }
    if (alreadyRegistered && !confirmReplace) {
      setError('Este depósito já está registrado. Marque a confirmação para substituir os dados.');
      return;
    }

    setError(null);
    setStatus('saving');
    const doctor = doctors.find((item) => item.id === form.doctor_id);
    const hospital = hospitals.find((item) => item.id === form.hospital_id);

    const payload = {
      doctor_id: form.doctor_id,
      doctor_name: doctor?.full_name || '',
      hospital_id: form.hospital_id,
      hospital_name: hospital?.name || '',
      mes_competencia: form.mes_competencia,
      mes_deposito: form.mes_deposito || form.mes_competencia,
      num_plantoes: matched ? matched.numPlantoes ?? matched.num_plantoes ?? 0 : 0,
      valor_bruto: matched ? matched.valorBruto ?? matched.valor_bruto ?? 0 : Number(form.valor_pago),
      valor_descontos: matched ? matched.valorDescontos ?? matched.valor_descontos ?? 0 : 0,
      valor_liquido: matched ? matched.valorLiquido ?? matched.valor_liquido ?? 0 : Number(form.valor_pago),
      descontos_detalhados: matched?.descontosDetalhados || matched?.descontos_detalhados || [],
      valor_pago: Number(form.valor_pago),
      comprovante_pix: form.file_url,
      status: 'Pago',
      data_pagamento: form.data_pagamento || today(),
    };
    if (matched?.id) payload.id = matched.id;

    try {
      await onSave(payload);
      setStatus('saved');
    } catch (err) {
      setError(err?.message || 'Não foi possível salvar o depósito.');
      setStatus('review');
    }
  };

  return (
    <div className="bg-white rounded-2xl border border-slate-200 shadow-md p-6 space-y-4">
      <div className="flex justify-between items-start gap-4">
        <div>
          <h2 className="text-lg font-black text-slate-900">Importar recibo PIX</h2>
          <p className="text-sm text-slate-500">Envie um comprovante por vez; os dados são extraídos e você confere antes de salvar.</p>
        </div>
        <Button variant="ghost" size="icon" onClick={onClose} aria-label="Fechar">
          <X size={18} />
        </Button>
      </div>

      {status === 'idle' && (
        <label className="flex flex-col items-center justify-center gap-2 border-2 border-dashed border-slate-300 rounded-xl p-8 cursor-pointer hover:border-blue-400 hover:bg-blue-50/40 transition-colors">
          <input
            type="file"
            accept="image/*,.pdf"
            className="hidden"
            onChange={(e) => {
              const file = e.target.files?.[0];
              if (file) readReceipt(file);
              e.target.value = '';
            }}
          />
          <Upload size={24} className="text-slate-400" />
          <span className="text-sm font-bold text-slate-700">Selecionar recibo (imagem ou PDF)</span>
        </label>
      )}

      {status === 'extracting' && (
        <div className="flex items-center gap-3 text-slate-600 py-6">
          <Loader2 size={20} className="animate-spin" />
          <span className="text-sm font-bold">Extraindo dados do recibo...</span>
        </div>
      )}

      {(status === 'review' || status === 'saving') && form && (
        <>
          <PixReceiptReview
            form={form}
            onChange={update}
            doctors={doctors}
            hospitals={hospitals}
            competencias={competencias}
            matched={matched}
            formatMonth={formatMonth}
          />

          {alreadyRegistered && (
            <label className="flex items-center gap-2 text-sm text-slate-700">
              <input type="checkbox" checked={confirmReplace} onChange={(e) => setConfirmReplace(e.target.checked)} />
              Confirmo substituir o registro de depósito existente
            </label>
          )}

          <div className="flex gap-2 flex-wrap">
            <Button onClick={save} disabled={status === 'saving'} className="bg-green-600 hover:bg-green-700">
              {status === 'saving' ? 'Salvando...' : 'Confirmar e registrar entrada'}
            </Button>
            <Button variant="outline" onClick={() => { setStatus('idle'); setForm(null); setError(null); }}>
              Enviar outro recibo
            </Button>
          </div>
        </>
      )}

      {status === 'saved' && (
        <div className="flex items-center gap-3 rounded-xl bg-green-50 border border-green-200 p-4">
          <CheckCircle size={18} className="text-green-600" />
          <span className="text-sm font-bold text-green-800">Entrada registrada com o comprovante anexado.</span>
          <Button size="sm" variant="outline" onClick={() => { setStatus('idle'); setForm(null); setError(null); }}>
            Importar outro
          </Button>
        </div>
      )}

      {error && (
        <p role="alert" className="text-sm text-red-600 flex items-center gap-2">
          <AlertTriangle size={16} />
          {error}
        </p>
      )}
    </div>
  );
}