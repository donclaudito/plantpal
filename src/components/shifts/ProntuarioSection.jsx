import React, { useRef, useState } from 'react';
import { Camera, Loader2 } from 'lucide-react';
import { base44 } from '@/api/base44Client';
import DadosFolhaSala from '@/components/shifts/DadosFolhaSala';
import NomeCirurgiaSelect from '@/components/shifts/NomeCirurgiaSelect';
import useNomesCirurgia from '@/lib/useNomesCirurgia';
import { CAMPOS_INTERNAMENTO } from '@/lib/prontuario';

const campos = [
  { key: 'paciente', label: 'Paciente' },
  { key: 'convenio', label: 'Convênio' },
  { key: 'tipoCirurgia', label: 'Tipo de cirurgia' },
  { key: 'nomeCirurgia', label: 'Nome da cirurgia' },
];

export default function ProntuarioSection({ dados, onChange }) {
  const inputRef = useRef(null);
  const [isExtracting, setIsExtracting] = useState(false);
  const [error, setError] = useState('');
  const [fileName, setFileName] = useState('');
  const { data: nomesCirurgia = [] } = useNomesCirurgia();

  const handleFile = async (event) => {
    const file = event.target.files?.[0];
    event.target.value = '';
    if (!file) return;
    setError('');
    setFileName(file.name);
    setIsExtracting(true);
    try {
      const { file_uri } = await base44.integrations.Core.UploadPrivateFile({ file });
      const response = await base44.functions.invoke('extractProntuario', { fileUri: file_uri });
      const extraido = response.data || {};
      if (extraido.error) throw new Error(extraido.error);
      onChange({
        paciente: extraido.paciente || '',
        convenio: extraido.convenio || '',
        tipoCirurgia: extraido.tipo_cirurgia || '',
        nomeCirurgia: extraido.nome_cirurgia || '',
        data: extraido.data || '',
        ...CAMPOS_INTERNAMENTO.reduce((acc, campo) => ({ ...acc, [campo.key]: extraido[campo.key] || '' }), {}),
      });
    } catch (e) {
      setError('Não foi possível ler o prontuário. Preencha os campos manualmente.');
    } finally {
      setIsExtracting(false);
    }
  };

  return (
    <div className="rounded-2xl border-2 border-dashed border-slate-300 dark:border-slate-600 bg-slate-50 dark:bg-slate-700/40 p-4 space-y-4">
      <div className="flex items-center justify-between gap-3">
        <div>
          <p className="text-xs font-black text-slate-600 dark:text-slate-400 uppercase tracking-wider">Prontuário / ficha da cirurgia</p>
          <p className="text-xs text-slate-500 dark:text-slate-400 mt-1">Tire uma foto e os dados da cirurgia são preenchidos automaticamente.</p>
        </div>
        <button
          type="button"
          onClick={() => inputRef.current?.click()}
          disabled={isExtracting}
          className="flex items-center gap-2 px-4 py-2 bg-blue-600 dark:bg-blue-500 text-white rounded-xl font-bold text-sm hover:bg-blue-700 dark:hover:bg-blue-600 transition-colors disabled:opacity-60"
        >
          {isExtracting ? <Loader2 size={16} className="animate-spin" /> : <Camera size={16} />}
          {isExtracting ? 'A ler...' : 'Tirar foto'}
        </button>
        <input
          ref={inputRef}
          type="file"
          accept="image/*,application/pdf"
          className="hidden"
          onChange={handleFile}
        />
      </div>

      {fileName && <p className="text-xs text-slate-500 dark:text-slate-400 truncate">Ficheiro: {fileName}</p>}
      {error && <p role="alert" className="text-sm text-destructive">{error}</p>}

      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
        {campos.map(campo => (
          <div key={campo.key}>
            <label className="block text-xs font-black text-slate-600 dark:text-slate-400 uppercase tracking-wider mb-2">
              {campo.label}
            </label>
            {campo.key === 'nomeCirurgia' ? (
              <NomeCirurgiaSelect
                value={dados.nomeCirurgia || ''}
                onChange={(valor) => onChange({ nomeCirurgia: valor })}
                nomes={nomesCirurgia}
              />
            ) : (
              <input
                type="text"
                value={dados[campo.key] || ''}
                onChange={(e) => onChange({ [campo.key]: e.target.value })}
                className="w-full px-4 py-3 bg-white dark:bg-slate-700 border-2 border-transparent focus:border-blue-600 dark:focus:border-blue-400 rounded-xl font-bold text-slate-900 dark:text-white transition-colors"
              />
            )}
          </div>
        ))}

        <div>
          <label className="block text-xs font-black text-slate-600 dark:text-slate-400 uppercase tracking-wider mb-2">
            Valor da cirurgia (R$)
          </label>
          <input
            type="number"
            step="0.01"
            min="0"
            value={dados.valor}
            onChange={(e) => onChange({ valor: e.target.value })}
            placeholder="0,00"
            className="w-full px-4 py-3 bg-white dark:bg-slate-700 border-2 border-transparent focus:border-blue-600 dark:focus:border-blue-400 rounded-xl font-bold text-slate-900 dark:text-white transition-colors"
          />
        </div>
      </div>

      <DadosFolhaSala dados={dados} onChange={onChange} />
    </div>
  );
}