import React from 'react';
import { Input } from '@/components/ui/input';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { AlertTriangle, CheckCircle2, Info } from 'lucide-react';

const money = (value) => (Number(value) || 0).toFixed(2);

function Field({ label, children }) {
  return (
    <div>
      <label className="block text-xs font-black text-slate-600 uppercase mb-2">{label}</label>
      {children}
    </div>
  );
}

export default function PixReceiptReview({ form, onChange, doctors, hospitals, competencias, matched, formatMonth }) {
  const competenceOptions = Array.from(new Set([...(competencias || []), form.mes_competencia].filter(Boolean)));
  const expected = matched ? matched.valorLiquido ?? matched.valor_liquido ?? 0 : null;
  const difference = expected === null ? 0 : Math.round(((Number(form.valor_pago) || 0) - expected) * 100) / 100;

  return (
    <div className="space-y-4">
      <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
        <Field label="Valor recebido (R$)">
          <Input
            type="number"
            step="0.01"
            min="0"
            value={form.valor_pago}
            onChange={(e) => onChange({ valor_pago: e.target.value })}
          />
        </Field>

        <Field label="Data do pagamento">
          <Input
            type="date"
            value={form.data_pagamento}
            onChange={(e) => onChange({ data_pagamento: e.target.value })}
          />
        </Field>

        <Field label="Mês de depósito">
          <Input
            type="month"
            value={form.mes_deposito}
            onChange={(e) => onChange({ mes_deposito: e.target.value })}
          />
        </Field>

        <Field label="Médico">
          <Select value={form.doctor_id} onValueChange={(value) => onChange({ doctor_id: value })}>
            <SelectTrigger>
              <SelectValue placeholder="Selecione o médico" />
            </SelectTrigger>
            <SelectContent>
              {doctors.map((doctor) => (
                <SelectItem key={doctor.id} value={doctor.id}>{doctor.full_name}</SelectItem>
              ))}
            </SelectContent>
          </Select>
        </Field>

        <Field label="Hospital">
          <Select value={form.hospital_id} onValueChange={(value) => onChange({ hospital_id: value })}>
            <SelectTrigger>
              <SelectValue placeholder="Selecione o hospital" />
            </SelectTrigger>
            <SelectContent>
              {hospitals.map((hospital) => (
                <SelectItem key={hospital.id} value={hospital.id}>{hospital.name}</SelectItem>
              ))}
            </SelectContent>
          </Select>
        </Field>

        <Field label="Mês de competência">
          <Select value={form.mes_competencia} onValueChange={(value) => onChange({ mes_competencia: value })}>
            <SelectTrigger>
              <SelectValue placeholder="Selecione a competência" />
            </SelectTrigger>
            <SelectContent>
              {competenceOptions.map((competencia) => (
                <SelectItem key={competencia} value={competencia}>{formatMonth(competencia)}</SelectItem>
              ))}
            </SelectContent>
          </Select>
        </Field>
      </div>

      {(form.pagador || form.recebedor) && (
        <p className="text-xs text-slate-500 flex items-center gap-2">
          <Info size={14} />
          Recibo: {form.pagador || 'pagador não identificado'} → {form.recebedor || 'recebedor não identificado'}
        </p>
      )}

      {matched ? (
        <div className={`rounded-xl border p-4 space-y-1 ${difference === 0 ? 'bg-green-50 border-green-200' : 'bg-yellow-50 border-yellow-200'}`}>
          <p className="text-sm font-black text-slate-900 flex items-center gap-2">
            {difference === 0 ? <CheckCircle2 size={16} className="text-green-600" /> : <AlertTriangle size={16} className="text-yellow-600" />}
            Depósito: {formatMonth(matched.mesCompetencia || matched.mes_competencia)} · previsto R$ {money(expected)}
          </p>
          <p className="text-sm text-slate-600">
            Recebido no recibo: R$ {money(form.valor_pago)}
            {difference !== 0 && ` · diferença de R$ ${money(Math.abs(difference))} ${difference < 0 ? 'a menos' : 'a mais'}`}
          </p>
          {matched.comprovante_pix && (
            <p className="text-xs text-slate-600">Este depósito já possui um comprovante registrado.</p>
          )}
        </div>
      ) : (
        <div className="rounded-xl border border-slate-200 bg-slate-50 p-4">
          <p className="text-sm text-slate-600">
            Nenhum depósito calculado para este médico, hospital e competência. Será criado um novo registro com o valor recebido.
          </p>
        </div>
      )}
    </div>
  );
}