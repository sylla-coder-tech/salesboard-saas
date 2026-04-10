function normalizeText(value) {
  return String(value || '').trim().toLowerCase();
}

function containsOneOf(text, keywords = []) {
  return keywords.some((keyword) => text.includes(keyword));
}

export function detectPeriodFromMessage(message, fallback = '30days') {
  const text = normalizeText(message);

  if (containsOneOf(text, ['hier'])) return 'yesterday';
  if (containsOneOf(text, ["aujourd'hui", 'aujourdhui', 'ce jour', 'aujourd hui'])) return 'today';
  if (containsOneOf(text, ['cette semaine', 'semaine en cours', '7 derniers jours'])) return '7days';
  if (containsOneOf(text, ['ce mois', 'ce mois-ci', 'ce mois ci', '30 derniers jours', 'mois en cours'])) return '30days';
  if (containsOneOf(text, ['cette année', 'cette annee', 'année en cours', 'annee en cours'])) return 'year';

  return fallback;
}

export function getPeriodLabel(period) {
  if (period === 'today') return "aujourd’hui";
  if (period === 'yesterday') return 'hier';
  if (period === '7days') return 'les 7 derniers jours';
  if (period === '30days') return 'les 30 derniers jours';
  if (period === 'year') return "cette année";
  return 'la période analysée';
}