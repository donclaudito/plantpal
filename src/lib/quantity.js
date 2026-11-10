export function formatQuantity(value) {
  const number = Number(value) || 0;
  return new Intl.NumberFormat('pt-BR', { maximumFractionDigits: 2 }).format(number);
}