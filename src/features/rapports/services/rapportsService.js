import { supabase } from '../../../lib/supabaseClient';
import { getMyProfile } from '../../auth/services/profileService';

function getDateRange(period) {
  const now = new Date();
  const start = new Date(now);
  const end = new Date(now);

  if (period === 'today') {
    start.setHours(0, 0, 0, 0);
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
    start.setMonth(0, 1);
    start.setHours(0, 0, 0, 0);
    end.setHours(23, 59, 59, 999);
  }

  return {
    start: start.toISOString(),
    end: end.toISOString(),
  };
}

function toNumber(value) {
  return Number(value || 0);
}

function sumField(rows, field) {
  return (rows || []).reduce((sum, row) => sum + toNumber(row?.[field]), 0);
}

function formatDayKey(dateValue) {
  const date = new Date(dateValue);
  const day = String(date.getDate()).padStart(2, '0');
  const month = String(date.getMonth() + 1).padStart(2, '0');
  return `${day}/${month}`;
}

function groupSalesRows(rows = []) {
  const map = new Map();

  for (const row of rows) {
    const venteId = row.id;

    if (!map.has(venteId)) {
      map.set(venteId, {
        id: row.id,
        entreprise_id: row.entreprise_id,
        nomClient: row.nomClient,
        prenomClient: row.prenomClient,
        telephone: row.telephone,
        adresse: row.adresse,
        statut: row.statut,
        dateAchat: row.dateAchat,
        created_at: row.created_at,
        fraisLivraison: toNumber(row.fraisLivraison),
        benefice: toNumber(row.benefice_net ?? row.benefice),
        total_articles: toNumber(row.total_articles),
        total_vente: toNumber(row.total_vente),
        cout_total_vente: toNumber(row.cout_total_vente),
        quantite_totale: toNumber(row.quantite_totale ?? row.quantite ?? 1),
        lignes: [],
      });
    }

    const vente = map.get(venteId);

    vente.lignes.push({
      produit_id: row.produit_id,
      nomProduit: row.nomProduit || 'Produit',
      referenceProduit: row.referenceProduit || '-',
      prixUnitaire: toNumber(row.prixUnitaire),
      quantite: toNumber(row.quantite || 1),
      prix_unitaire: toNumber(row.prix_unitaire),
      prix_achat_unitaire: toNumber(row.prix_achat_unitaire),
      sous_total: toNumber(row.sous_total),
      cout_total: toNumber(row.cout_total),
      benefice_ligne: toNumber(row.benefice_ligne),
    });
  }

  return Array.from(map.values()).sort(
    (a, b) => new Date(b.created_at || b.dateAchat) - new Date(a.created_at || a.dateAchat)
  );
}

function buildTopProduits(ventes = []) {
  const statsMap = new Map();

  ventes.forEach((vente) => {
    (vente.lignes || []).forEach((ligne) => {
      const produitId = ligne.produit_id || 'inconnu';
      const produitNom = ligne.nomProduit || 'Produit inconnu';
      const reference = ligne.referenceProduit || '-';
      const quantite = toNumber(ligne.quantite);
      const sousTotal = toNumber(ligne.sous_total);
      const coutTotal = toNumber(ligne.cout_total);
      const beneficeLigne = toNumber(ligne.benefice_ligne);

      if (!statsMap.has(produitId)) {
        statsMap.set(produitId, {
          produit_id: produitId,
          nom: produitNom,
          reference,
          nombre_ventes: 0,
          quantite_vendue: 0,
          chiffre_affaires: 0,
          cout_total: 0,
          caisse_generee: 0,
        });
      }

      const current = statsMap.get(produitId);
      current.nombre_ventes += 1;
      current.quantite_vendue += quantite;
      current.chiffre_affaires += sousTotal;
      current.cout_total += coutTotal;
      current.caisse_generee += beneficeLigne;
    });
  });

  return Array.from(statsMap.values()).sort((a, b) => {
    if (b.quantite_vendue !== a.quantite_vendue) {
      return b.quantite_vendue - a.quantite_vendue;
    }
    return b.chiffre_affaires - a.chiffre_affaires;
  });
}

function buildDailySeries(ventes = [], depenses = [], remboursements = []) {
  const dailyMap = new Map();

  ventes.forEach((vente) => {
    const key = formatDayKey(vente.dateAchat || vente.created_at);

    if (!dailyMap.has(key)) {
      dailyMap.set(key, {
        jour: key,
        ventes: 0,
        depenses: 0,
        remboursements: 0,
      });
    }

    dailyMap.get(key).ventes += toNumber(vente.total_articles);
  });

  depenses.forEach((depense) => {
    const key = formatDayKey(depense.date_depense || depense.created_at);

    if (!dailyMap.has(key)) {
      dailyMap.set(key, {
        jour: key,
        ventes: 0,
        depenses: 0,
        remboursements: 0,
      });
    }

    dailyMap.get(key).depenses += toNumber(depense.montant);
  });

  remboursements.forEach((item) => {
    const key = formatDayKey(item.date_remboursement || item.created_at);

    if (!dailyMap.has(key)) {
      dailyMap.set(key, {
        jour: key,
        ventes: 0,
        depenses: 0,
        remboursements: 0,
      });
    }

    dailyMap.get(key).remboursements += toNumber(item.montant);
  });

  return Array.from(dailyMap.values()).sort((a, b) => {
    const [dayA, monthA] = a.jour.split('/').map(Number);
    const [dayB, monthB] = b.jour.split('/').map(Number);
    if (monthA !== monthB) return monthA - monthB;
    return dayA - dayB;
  });
}

export async function getRapportGlobal(period = '30days') {
  const profile = await getMyProfile();
  const { start, end } = getDateRange(period);

  const [ventesRes, depensesRes, creditsRes, remboursementsRes] = await Promise.all([
    supabase
      .from('ventes_details')
      .select('*')
      .eq('entreprise_id', profile.entreprise_id)
      .gte('dateAchat', start)
      .lte('dateAchat', end),

    supabase
      .from('depenses')
      .select('*')
      .eq('entreprise_id', profile.entreprise_id)
      .gte('date_depense', start)
      .lte('date_depense', end),

    supabase
      .from('credits_clients')
      .select('*')
      .eq('entreprise_id', profile.entreprise_id)
      .gte('date_credit', start)
      .lte('date_credit', end),

    supabase
      .from('remboursements_credit')
      .select('*')
      .eq('entreprise_id', profile.entreprise_id)
      .gte('date_remboursement', start)
      .lte('date_remboursement', end),
  ]);

  if (ventesRes.error) throw ventesRes.error;
  if (depensesRes.error) throw depensesRes.error;
  if (creditsRes.error) throw creditsRes.error;
  if (remboursementsRes.error) throw remboursementsRes.error;

  const ventesRows = ventesRes.data || [];
  const depenses = depensesRes.data || [];
  const credits = creditsRes.data || [];
  const remboursements = remboursementsRes.data || [];

  const ventes = groupSalesRows(ventesRows);

  const chiffreAffaires = ventes.reduce(
    (sum, vente) => sum + toNumber(vente.total_articles),
    0
  );

  const totalLivraison = ventes.reduce(
    (sum, vente) => sum + toNumber(vente.fraisLivraison),
    0
  );

  const coutTotalVentes = ventes.reduce(
    (sum, vente) => sum + toNumber(vente.cout_total_vente),
    0
  );

  const ventesEncaissees = ventes
    .filter((vente) => String(vente.statut || '').toLowerCase() !== 'en_attente')
    .reduce((sum, vente) => sum + toNumber(vente.total_vente), 0);

  const beneficeNetVentes = ventes.reduce(
    (sum, vente) => sum + toNumber(vente.benefice),
    0
  );

  const totalDepenses = sumField(depenses, 'montant');
  const totalRemboursements = sumField(remboursements, 'montant');

  const creditsEnCours = credits
    .filter((item) => toNumber(item.reste_a_payer) > 0)
    .reduce((sum, item) => sum + toNumber(item.reste_a_payer), 0);

  const totalCredits = credits.reduce(
    (sum, item) => sum + toNumber(item.montant_total),
    0
  );

  const totalCreditsPayes = credits.reduce(
    (sum, item) => sum + toNumber(item.montant_paye),
    0
  );

  const caisseNette = beneficeNetVentes + totalRemboursements - totalDepenses;

  const topProduits = buildTopProduits(ventes);
  const series = buildDailySeries(ventes, depenses, remboursements);

  return {
    period,
    start,
    end,
    stats: {
      chiffreAffaires,
      ventesEncaissees,
      totalLivraison,
      totalDepenses,
      caisseNette,
      creditsEnCours,
      totalCredits,
      totalCreditsPayes,
      totalRemboursements,
      coutTotalVentes,
      beneficeNetVentes,
      nombreVentes: ventes.length,
      nombreDepenses: depenses.length,
      nombreCredits: credits.length,
      nombreRemboursements: remboursements.length,
    },
    topProduits,
    series,
    ventes,
    depenses,
    credits,
    remboursements,
  };
}