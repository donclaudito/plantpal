export const procedimentoQuantidade = (procedimento) => {
  const quantidade = Number(procedimento?.quantidade);
  return quantidade > 0 ? quantidade : 1;
};

export const procedimentoTotal = (procedimento) =>
  (Number(procedimento?.valor) || 0) * procedimentoQuantidade(procedimento);

export const somaProcedimentos = (procedimentos) =>
  (procedimentos || []).reduce((total, procedimento) => total + procedimentoTotal(procedimento), 0);