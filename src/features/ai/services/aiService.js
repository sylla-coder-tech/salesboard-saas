import { supabase } from '../../../lib/supabaseClient';
import { getMyProfile } from '../../auth/services/profileService';

function toNumber(value) {
  return Number(value || 0);
}

function normalizeText(value) {
  return String(value || '').trim().toLowerCase();
}

function getDateRange(period = '30days') {
  const now = new Date();
  const start = new Date(now);
  const end = new Date(now);

  if (period === 'today') {
    start.setHours(0, 0, 0, 0);
    end.setHours(23, 59, 59, 999);
  } else if (period === 'yesterday') {
    start.setDate(now.getDate() - 1);
    start.setHours(0, 0, 0, 0);

    end.setDate(now.getDate() - 1);
    end.setHours(23, 59, 59, 999);
  } else if (period === '7days') {
    start.setDate(now.getDate() - 6);
    start.setHours(0, 0, 0, 0);
    end.setHours(23, 59, 59, 999);
  } else if (period === '30days') {
    start.setDate(now.getDate() - 29);
    start.setHours(0, 0, 0, 0);
    end.setHours(23, 59, 59, 999);
  } else if (period === 'year') {
    start.setMonth(0, 1);
    start.setHours(0, 0, 0, 0);
    end.setHours(23, 59, 59, 999);
  } else {
    start.setDate(now.getDate() - 29);
    start.setHours(0, 0, 0, 0);
    end.setHours(23, 59, 59, 999);
  }

  return {
    start: start.toISOString(),
    end: end.toISOString(),
  };
}

function buildProductStats(ventesRows = []) {
  const map = new Map();

  for (const row of ventesRows) {
    const produitId = row.produit_id;
    const nom = row.nomProduit || 'Produit';
    const reference = row.referenceProduit || '-';
    const quantite = toNumber(row.quantite);
    const chiffreAffaires = toNumber(row.sous_total);
    const coutTotal = toNumber(row.cout_total);
    const benefice = toNumber(row.benefice_ligne);

    if (!map.has(produitId)) {
      map.set(produitId, {
        produit_id: produitId,
        nom,
        reference,
        quantite_vendue: 0,
        chiffre_affaires: 0,
        cout_total: 0,
        benefice_total: 0,
      });
    }

    const item = map.get(produitId);
    item.quantite_vendue += quantite;
    item.chiffre_affaires += chiffreAffaires;
    item.cout_total += coutTotal;
    item.benefice_total += benefice;
  }

  return Array.from(map.values()).sort((a, b) => {
    if (b.benefice_total !== a.benefice_total) {
      return b.benefice_total - a.benefice_total;
    }
    return b.chiffre_affaires - a.chiffre_affaires;
  });
}

function buildLowStockAlerts(produits = [], threshold = 5) {
  return (produits || [])
    .filter((produit) => toNumber(produit.stock) <= threshold)
    .map((produit) => ({
      produit_id: produit.id,
      nom: produit.nom,
      reference: produit.reference,
      stock: toNumber(produit.stock),
      seuil: threshold,
    }))
    .sort((a, b) => a.stock - b.stock);
}

function buildCreditAlerts(credits = []) {
  return (credits || [])
    .filter((credit) => toNumber(credit.reste_a_payer) > 0)
    .sort((a, b) => toNumber(b.reste_a_payer) - toNumber(a.reste_a_payer))
    .map((credit) => ({
      id: credit.id,
      client_nom: [credit.nomClient, credit.prenomClient].filter(Boolean).join(' ') || 'Client',
      telephone: credit.telephone || '-',
      reste_a_payer: toNumber(credit.reste_a_payer),
      montant_total: toNumber(credit.montant_total),
      montant_paye: toNumber(credit.montant_paye),
      date_credit: credit.date_credit || null,
    }));
}

function buildStandardInsights({
  chiffreAffaires,
  beneficeNet,
  totalDepenses,
  totalRemboursements,
  creditsEnCours,
  topProduits,
  lowStockAlerts,
  creditAlerts,
}) {
  const insights = [];

  if (topProduits.length > 0) {
    const top = topProduits[0];
    insights.push(
      `Le produit le plus rentable est "${top.nom}" avec un bénéfice estimé à ${top.benefice_total} GNF.`
    );
  }

  if (lowStockAlerts.length > 0) {
    const first = lowStockAlerts[0];
    insights.push(
      `Le stock du produit "${first.nom}" est faible (${first.stock} restant). Un réapprovisionnement est conseillé.`
    );
  }

  if (creditAlerts.length > 0) {
    const first = creditAlerts[0];
    insights.push(
      `Le client "${first.client_nom}" a encore ${first.reste_a_payer} GNF à payer.`
    );
  }

  if (beneficeNet <= 0 && chiffreAffaires > 0) {
    insights.push(
      "Le bénéfice net est faible ou négatif. Il faut surveiller les coûts d’achat, la livraison et les dépenses."
    );
  }

  if (totalDepenses > beneficeNet && chiffreAffaires > 0) {
    insights.push(
      "Les dépenses absorbent une part importante du résultat. Une réduction des charges peut améliorer la rentabilité."
    );
  }

  if (totalRemboursements > 0) {
    insights.push(
      `Les remboursements crédit ont contribué à hauteur de ${totalRemboursements} GNF à la trésorerie.`
    );
  }

  if (creditsEnCours > 0) {
    insights.push(
      `Le montant total encore à récupérer sur les crédits est de ${creditsEnCours} GNF.`
    );
  }

  return insights;
}

function buildPremiumInsights({
  lowStockAlerts,
  creditAlerts,
  productStats,
}) {
  const insights = [];

  if (productStats.length > 1) {
    const mostProfitable = productStats[0];
    const leastProfitable = productStats[productStats.length - 1];

    insights.push(
      `Le produit le plus rentable est "${mostProfitable.nom}", tandis que "${leastProfitable.nom}" est actuellement le moins rentable sur la période.`
    );
  }

  const lowMarginProducts = productStats
    .filter((item) => item.chiffre_affaires > 0)
    .map((item) => ({
      ...item,
      marge_ratio: item.chiffre_affaires > 0 ? item.benefice_total / item.chiffre_affaires : 0,
    }))
    .sort((a, b) => a.marge_ratio - b.marge_ratio)
    .slice(0, 3);

  if (lowMarginProducts.length > 0) {
    insights.push(
      `Les produits à faible marge à surveiller sont : ${lowMarginProducts.map((p) => p.nom).join(', ')}.`
    );
  }

  if (lowStockAlerts.length >= 2) {
    insights.push(
      `Plusieurs produits approchent la rupture de stock : ${lowStockAlerts.slice(0, 3).map((p) => p.nom).join(', ')}.`
    );
  }

  if (creditAlerts.length >= 2) {
    insights.push(
      `Plusieurs clients ont des soldes ouverts. Une campagne de relance ciblée peut améliorer la trésorerie.`
    );
  }

  const stagnantProducts = productStats
    .filter((item) => item.quantite_vendue <= 1)
    .slice(0, 3);

  if (stagnantProducts.length > 0) {
    insights.push(
      `Produits à faible rotation sur la période : ${stagnantProducts.map((p) => p.nom).join(', ')}.`
    );
  }

  return insights;
}

export async function getAiCommercialData(period = '30days') {
  const profile = await getMyProfile();
  const { start, end } = getDateRange(period);

  const [entrepriseRes, ventesRes, produitsRes, creditsRes, depensesRes, remboursementsRes] =
    await Promise.all([
      supabase
        .from('entreprises')
        .select('*')
        .eq('id', profile.entreprise_id)
        .single(),

      supabase
        .from('ventes_details')
        .select('*')
        .eq('entreprise_id', profile.entreprise_id)
        .gte('dateAchat', start)
        .lte('dateAchat', end),

      supabase
        .from('produits')
        .select('*')
        .eq('entreprise_id', profile.entreprise_id)
        .order('created_at', { ascending: false }),

      supabase
        .from('credits_clients')
        .select('*')
        .eq('entreprise_id', profile.entreprise_id)
        .gte('date_credit', start)
        .lte('date_credit', end),

      supabase
        .from('depenses')
        .select('*')
        .eq('entreprise_id', profile.entreprise_id)
        .gte('date_depense', start)
        .lte('date_depense', end),

      supabase
        .from('remboursements_credit')
        .select('*')
        .eq('entreprise_id', profile.entreprise_id)
        .gte('date_remboursement', start)
        .lte('date_remboursement', end),
    ]);

  if (entrepriseRes.error) throw entrepriseRes.error;
  if (ventesRes.error) throw ventesRes.error;
  if (produitsRes.error) throw produitsRes.error;
  if (creditsRes.error) throw creditsRes.error;
  if (depensesRes.error) throw depensesRes.error;
  if (remboursementsRes.error) throw remboursementsRes.error;

  const entreprise = entrepriseRes.data;
  const ventesRows = ventesRes.data || [];
  const produits = produitsRes.data || [];
  const credits = creditsRes.data || [];
  const depenses = depensesRes.data || [];
  const remboursements = remboursementsRes.data || [];

  const productStats = buildProductStats(ventesRows);
  const lowStockAlerts = buildLowStockAlerts(produits, 5);
  const creditAlerts = buildCreditAlerts(credits);

  const chiffreAffaires = productStats.reduce(
    (sum, item) => sum + toNumber(item.chiffre_affaires),
    0
  );

  const coutTotal = productStats.reduce(
    (sum, item) => sum + toNumber(item.cout_total),
    0
  );

  const beneficeProduits = productStats.reduce(
    (sum, item) => sum + toNumber(item.benefice_total),
    0
  );

  const totalDepenses = depenses.reduce(
    (sum, item) => sum + toNumber(item.montant),
    0
  );

  const totalRemboursements = remboursements.reduce(
    (sum, item) => sum + toNumber(item.montant),
    0
  );

  const creditsEnCours = credits.reduce(
    (sum, item) => sum + toNumber(item.reste_a_payer),
    0
  );

  const beneficeNet = beneficeProduits - totalDepenses + totalRemboursements;

  const standardInsights = buildStandardInsights({
    chiffreAffaires,
    beneficeNet,
    totalDepenses,
    totalRemboursements,
    creditsEnCours,
    topProduits: productStats.slice(0, 5),
    lowStockAlerts,
    creditAlerts,
  });

  const premiumInsights =
    normalizeText(entreprise?.ia_niveau) === 'premium'
      ? buildPremiumInsights({
          lowStockAlerts,
          creditAlerts,
          productStats,
        })
      : [];

  return {
    entreprise,
    period,
    period_start: start,
    period_end: end,
    raw_produits: produits,
    resume: {
      chiffre_affaires: chiffreAffaires,
      cout_total: coutTotal,
      benefice_produits: beneficeProduits,
      total_depenses: totalDepenses,
      total_remboursements: totalRemboursements,
      credits_en_cours: creditsEnCours,
      benefice_net: beneficeNet,
      nombre_produits_vendus: productStats.length,
      nombre_alertes_stock: lowStockAlerts.length,
      nombre_alertes_credit: creditAlerts.length,
    },
    top_produits: productStats.slice(0, 10),
    alertes_stock: lowStockAlerts,
    alertes_credits: creditAlerts,
    insights: {
      standard: standardInsights,
      premium: premiumInsights,
    },
  };
}

export function getProductRevenueAnalysis(aiData, productName) {
  const search = normalizeText(productName);

  if (!search) {
    throw new Error('Le nom du produit est obligatoire.');
  }

  const found = (aiData?.top_produits || []).find((item) =>
    normalizeText(item.nom).includes(search)
  );

  if (!found) {
    throw new Error('Produit introuvable dans les données analysées.');
  }

  return {
    produit_id: found.produit_id,
    nom: found.nom,
    reference: found.reference,
    quantite_vendue: found.quantite_vendue,
    chiffre_affaires: found.chiffre_affaires,
    cout_total: found.cout_total,
    benefice_total: found.benefice_total,
  };
}