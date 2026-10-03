function normalizeText(value) {
  return String(value || '').trim().toLowerCase();
}

export function cleanExtractedProductName(value) {
  return String(value || '')
    .replace(/\?/g, '')
    .replace(/\./g, '')
    .replace(/ce mois-ci/gi, '')
    .replace(/ce mois ci/gi, '')
    .replace(/ce mois/gi, '')
    .replace(/cette semaine/gi, '')
    .replace(/cette année/gi, '')
    .replace(/cette annee/gi, '')
    .replace(/aujourd'hui/gi, '')
    .replace(/aujourdhui/gi, '')
    .replace(/hier/gi, '')
    .replace(/a été vendu/gi, '')
    .replace(/a ete vendu/gi, '')
    .replace(/ont été vendues/gi, '')
    .replace(/ont ete vendues/gi, '')
    .replace(/combien/gi, '')
    .replace(/quel est/gi, '')
    .replace(/quelle est/gi, '')
    .replace(/compare les produits/gi, '')
    .replace(/comparaison entre/gi, '')
    .replace(/quel produit est meilleur entre/gi, '')
    .replace(/et/gi, ' ')
    .replace(/le/gi, '')
    .replace(/la/gi, '')
    .replace(/du/gi, '')
    .replace(/de/gi, '')
    .replace(/sur/gi, '')
    .replace(/pour/gi, '')
    .replace(/produit/gi, '')
    .replace(/bénéfice/gi, '')
    .replace(/benefice/gi, '')
    .replace(/profit/gi, '')
    .replace(/chiffre d’affaires/gi, '')
    .replace(/chiffre affaire/gi, '')
    .replace(/revenu/gi, '')
    .replace(/stock/gi, '')
    .replace(/restant/gi, '')
    .replace(/quantité/gi, '')
    .replace(/quantite/gi, '')
    .replace(/vendu/gi, '')
    .replace(/vendues/gi, '')
    .replace(/unité/gi, '')
    .replace(/unites/gi, '')
    .replace(/unités/gi, '')
    .trim();
}

export function extractProductName(message) {
  const text = normalizeText(message);

  const patterns = [
    /produit\s+(.+)/i,
    /sur\s+(.+)/i,
    /pour\s+(.+)/i,
    /de\s+(.+)/i,
  ];

  for (const pattern of patterns) {
    const match = text.match(pattern);
    if (match?.[1]) {
      return cleanExtractedProductName(match[1]);
    }
  }

  return cleanExtractedProductName(text);
}

export function extractTwoProductNames(message) {
  const text = normalizeText(message)
    .replace(/\?/g, '')
    .replace(/compare les produits/gi, '')
    .replace(/comparaison entre/gi, '')
    .replace(/quel produit est meilleur entre/gi, '')
    .trim();

  const separators = [' et ', ',', ' versus ', ' vs '];

  for (const sep of separators) {
    if (text.includes(sep)) {
      const parts = text.split(sep).map((item) => cleanExtractedProductName(item)).filter(Boolean);
      if (parts.length >= 2) {
        return [parts[0], parts[1]];
      }
    }
  }

  return [];
}