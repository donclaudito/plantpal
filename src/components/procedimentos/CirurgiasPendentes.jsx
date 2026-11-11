import React, { useRef, useState } from 'react';
import { AlertTriangle, CheckCircle2, Edit, Loader2, Paperclip } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { formatDatePtBr } from '@/lib/dateKeys';

const diasDesde = (data) => {
  if (!data) return null;
  const partes = String(data).split('-');
  if (partes.length !== 3) return null;
  const alvo = new Date(Number(partes[0]), Number(partes[1]) - 1, Number(partes[2]));
  const hoje = new Date();
  const base = new Date(hoje.getFullYear(), hoje.getMonth(), hoje.getDate());
  return Math.round((base - alvo) / 86400000);
};

const Atraso = ({ data }) => {
  const dias = diasDesde(data);
  if (dias === null || dias <= 0) return null;
  const critico = dias > 30;
  return (
    <span className={`inline-flex items-center gap-1 px-2 py-1 text-xs font-semibold rounded-full ${
      critico ? 'bg-red-100 text-red-800' : 'bg-amber-100 text-amber-800'
    }`}>
      <AlertTriangle className="w-3 h-3" />
      {dias} dia{dias === 1 ? '' : 's'} sem documentos
    </span>
  );
};

export default function CirurgiasPendentes({ items, onAnexar, onEdit }) {
  const inputRef = useRef(null);
  const [alvo, setAlvo] = useState(null);
  const [enviandoId, setEnviandoId] = useState(null);

  const abrirSeletor = (procedimento) => {
    setAlvo(procedimento);
    inputRef.current?.click();
  };

  const handleFiles = async (event) => {
    const files = Array.from(event.target.files || []);
    event.target.value = '';
    if (!files.length || !alvo) return;
    setEnviandoId(alvo.id);
    try {
      await onAnexar(alvo, files);
    } finally {
      setEnviandoId(null);
      setAlvo(null);
    }
  };

  if (!items.length) {
    return (
      <div className="text-center py-12">
        <CheckCircle2 className="w-10 h-10 text-green-500 mx-auto mb-3" />
        <p className="text-gray-700 font-semibold">Todas as cirurgias estão com documentos anexados</p>
        <p className="text-sm text-gray-500 mt-1">Nenhuma pendência de prontuário ou foto.</p>
      </div>
    );
  }

  return (
    <>
      <input
        ref={inputRef}
        type="file"
        accept="image/*,application/pdf"
        multiple
        className="hidden"
        onChange={handleFiles}
      />
      <div className="overflow-x-auto">
        <table className="w-full">
          <thead className="bg-gray-50">
            <tr>
              <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase">Data</th>
              <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase">Paciente</th>
              <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase">Médico</th>
              <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase">Hospital</th>
              <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase">Pendência</th>
              <th className="px-4 py-3 text-right text-xs font-medium text-gray-500 uppercase">Ações</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-gray-200">
            {items.map((proc) => (
              <tr key={proc.id} className="bg-amber-50 hover:bg-amber-100 border-l-4 border-l-amber-500">
                <td className="px-4 py-4 text-sm text-gray-900">
                  {proc.data ? formatDatePtBr(proc.data) : <span className="text-amber-800 font-semibold">Sem data</span>}
                </td>
                <td className="px-4 py-4 text-sm text-gray-900">{proc.paciente || '-'}</td>
                <td className="px-4 py-4 text-sm text-gray-900">{proc.doctor_name || '-'}</td>
                <td className="px-4 py-4 text-sm text-gray-900">{proc.hospital_name || '-'}</td>
                <td className="px-4 py-4 text-sm">
                  <Atraso data={proc.data} />
                </td>
                <td className="px-4 py-4 text-right">
                  <div className="flex gap-2 justify-end">
                    <Button
                      size="sm"
                      onClick={() => abrirSeletor(proc)}
                      disabled={enviandoId === proc.id}
                      className="bg-amber-600 hover:bg-amber-700"
                    >
                      {enviandoId === proc.id ? (
                        <Loader2 className="w-4 h-4 mr-2 animate-spin" />
                      ) : (
                        <Paperclip className="w-4 h-4 mr-2" />
                      )}
                      Anexar documentos
                    </Button>
                    <Button variant="ghost" size="sm" onClick={() => onEdit(proc)}>
                      <Edit className="w-4 h-4" />
                    </Button>
                  </div>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </>
  );
}