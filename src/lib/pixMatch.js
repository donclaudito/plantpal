const normalize = (value) =>
  String(value || '')
    .normalize('NFD')
    .replace(/[\u0300-\u036f]/g, '')
    .toUpperCase()
    .trim();

export function bestMatchName(candidates, nameKey, haystack) {
  const text = normalize(haystack);
  if (!text) return null;
  let best = null;
  let bestScore = 0;
  candidates.forEach((candidate) => {
    const tokens = normalize(candidate[nameKey]).split(/\s+/).filter((token) => token.length > 2);
    if (!tokens.length) return;
    const score = tokens.filter((token) => text.includes(token)).length / tokens.length;
    if (score > bestScore) {
      bestScore = score;
      best = candidate;
    }
  });
  return bestScore >= 0.5 ? best : null;
}

export function toIsoDate(value) {
  const raw = String(value || '').trim();
  if (/^\d{4}-\d{2}-\d{2}/.test(raw)) return raw.slice(0, 10);
  const br = raw.match(/^(\d{1,2})[/.-](\d{1,2})[/.-](\d{4})$/);
  if (br) return `${br[3]}-${br[2].padStart(2, '0')}-${br[1].padStart(2, '0')}`;
  return '';
}

export function monthFromDate(value) {
  const iso = toIsoDate(value);
  return iso ? iso.slice(0, 7) : '';
}