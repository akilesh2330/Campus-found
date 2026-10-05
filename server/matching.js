const normalize = (value = '') => String(value).toLowerCase().replace(/[^\p{L}\p{N}\s]/gu, ' ').replace(/\s+/g, ' ').trim();
const tokens = (value) => new Set(normalize(value).split(' ').filter((word) => word.length > 1));

function textSimilarity(left, right) {
  const a = normalize(left);
  const b = normalize(right);
  if (!a || !b) return 0;
  if (a === b) return 1;
  if (a.includes(b) || b.includes(a)) return 0.86;
  const leftWords = tokens(a);
  const rightWords = tokens(b);
  const overlap = [...leftWords].filter((word) => rightWords.has(word)).length;
  const wordScore = leftWords.size + rightWords.size ? (2 * overlap) / (leftWords.size + rightWords.size) : 0;
  const leftBigrams = new Set(Array.from({ length: Math.max(0, a.length - 1) }, (_, i) => a.slice(i, i + 2)));
  const rightBigrams = new Set(Array.from({ length: Math.max(0, b.length - 1) }, (_, i) => b.slice(i, i + 2)));
  const bigramOverlap = [...leftBigrams].filter((pair) => rightBigrams.has(pair)).length;
  const bigramScore = leftBigrams.size + rightBigrams.size ? (2 * bigramOverlap) / (leftBigrams.size + rightBigrams.size) : 0;
  return Math.min(1, 0.72 * wordScore + 0.28 * bigramScore);
}

function dateProximity(lostDate, foundDate) {
  const days = Math.abs(new Date(lostDate).getTime() - new Date(foundDate).getTime()) / 86_400_000;
  return Math.max(0, 1 - days / 45);
}

export function scoreMatch(lost, found) {
  const factors = [
    { key: 'category', label: 'Category', weight: 0.20, score: normalize(lost.category) === normalize(found.category) ? 1 : textSimilarity(lost.category, found.category) },
    { key: 'name', label: 'Item name', weight: 0.22, score: textSimilarity(lost.name, found.name) },
    { key: 'brand', label: 'Brand', weight: 0.14, score: textSimilarity(lost.brand, found.brand) },
    { key: 'color', label: 'Color', weight: 0.12, score: textSimilarity(lost.color, found.color) },
    { key: 'location', label: 'Location', weight: 0.12, score: textSimilarity(lost.location, found.location) },
    { key: 'details', label: 'Description & identifying details', weight: 0.12, score: textSimilarity(`${lost.description || ''} ${lost.identifyingFeatures || ''}`, `${found.description || ''} ${found.identifyingFeatures || ''}`) },
    { key: 'date', label: 'Date proximity', weight: 0.08, score: dateProximity(lost.date, found.date) },
  ];
  const score = Math.round(factors.reduce((total, factor) => total + factor.score * factor.weight, 0) * 100);
  return {
    score,
    factors: factors.filter((factor) => factor.score >= 0.34).map(({ key, label, score: value }) => ({ key, label, strength: Math.round(value * 100) })),
  };
}

export function rankMatches(lost, foundItems, limit = 5) {
  return foundItems
    .map((item) => ({ item, ...scoreMatch(lost, item) }))
    .filter((match) => match.score >= 25)
    .sort((a, b) => b.score - a.score)
    .slice(0, limit);
}
