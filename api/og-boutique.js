/**
 * api/og-boutique.js — Vercel Edge Function
 * ------------------------------------------
 * Gère toutes les requêtes vers /boutique/:slug (avec ou sans ?produit=REF).
 *
 * - Crawlers Facebook/Instagram/WhatsApp/LinkedIn :
 *   → /boutique/slug             : preview de la boutique (nom, description, bannière)
 *   → /boutique/slug?produit=REF : preview du produit spécifique (nom, prix, image)
 *
 * - Vrais navigateurs :
 *   → Reçoivent le index.html de la SPA React (comportement normal).
 */

export const config = { runtime: 'edge' };

const CRAWLER_UA = [
  'facebookexternalhit', 'facebot', 'twitterbot', 'linkedinbot',
  'whatsapp', 'telegrambot', 'slackbot', 'discordbot',
  'pinterest', 'vkshare', 'ia_archiver', 'w3c_validator',
];

function isCrawler(ua = '') {
  const u = ua.toLowerCase();
  return CRAWLER_UA.some((bot) => u.includes(bot));
}

function escHtml(str) {
  return String(str || '')
    .replace(/&/g, '&amp;').replace(/"/g, '&quot;')
    .replace(/'/g, '&#x27;').replace(/</g, '&lt;').replace(/>/g, '&gt;');
}

function formatGNF(v) {
  return new Intl.NumberFormat('fr-FR').format(Number(v || 0)) + ' GNF';
}

/* ── Récupère la boutique depuis Supabase REST ── */
async function fetchBoutique(slug) {
  const supabaseUrl = process.env.VITE_SUPABASE_URL;
  const supabaseKey = process.env.VITE_SUPABASE_ANON_KEY;
  if (!supabaseUrl || !supabaseKey) return null;

  const apiUrl = new URL(`${supabaseUrl}/rest/v1/boutiques`);
  apiUrl.searchParams.set('slug',   `eq.${slug}`);
  apiUrl.searchParams.set('actif',  'eq.true');
  apiUrl.searchParams.set('select', 'id,nom_boutique,description,banniere_url,couleur_principale,slug,entreprises(logo_url)');
  apiUrl.searchParams.set('limit',  '1');

  try {
    const res = await fetch(apiUrl.toString(), {
      headers: {
        apikey: supabaseKey,
        Authorization: `Bearer ${supabaseKey}`,
        Accept: 'application/json',
      },
    });
    if (!res.ok) return null;
    const data = await res.json();
    return data?.[0] ?? null;
  } catch { return null; }
}

/* ── Récupère un produit par sa référence dans une boutique ── */
async function fetchProduit(boutiqueId, reference) {
  const supabaseUrl = process.env.VITE_SUPABASE_URL;
  const supabaseKey = process.env.VITE_SUPABASE_ANON_KEY;
  if (!supabaseUrl || !supabaseKey) return null;

  /* On cherche dans boutique_produits → produits via la référence */
  const apiUrl = new URL(`${supabaseUrl}/rest/v1/boutique_produits`);
  apiUrl.searchParams.set('boutique_id', `eq.${boutiqueId}`);
  apiUrl.searchParams.set('select', 'prix_vente,produits(id,nom,reference,prixUnitaire,stock,image_url)');
  apiUrl.searchParams.set('limit', '200'); // récupère tous les produits de la boutique

  try {
    const res = await fetch(apiUrl.toString(), {
      headers: {
        apikey: supabaseKey,
        Authorization: `Bearer ${supabaseKey}`,
        Accept: 'application/json',
      },
    });
    if (!res.ok) return null;
    const rows = await res.json();
    /* Cherche le produit par référence (insensible à la casse) */
    const row = (rows || []).find(
      (r) => r.produits?.reference?.toLowerCase() === reference.toLowerCase()
    );
    if (!row?.produits) return null;
    return {
      ...row.produits,
      prixUnitaire: row.prix_vente ? Number(row.prix_vente) : row.produits.prixUnitaire,
    };
  } catch { return null; }
}

/* ── Génère le HTML OG pour la boutique ── */
function buildBoutiqueHtml(boutique, pageUrl) {
  const titre   = boutique.nom_boutique || 'Boutique en ligne';
  const desc    = boutique.description?.slice(0, 160)
    || `Découvrez les produits de ${titre} et commandez en ligne en quelques clics.`;
  const image   = boutique.banniere_url || boutique.entreprises?.logo_url || '';
  const couleur = boutique.couleur_principale || '#3b82f6';

  return buildHtml({ titre, desc, image, couleur, pageUrl, siteName: titre });
}

/* ── Génère le HTML OG pour un produit spécifique ── */
function buildProduitHtml(boutique, produit, pageUrl) {
  const prix    = formatGNF(produit.prixUnitaire);
  const titre   = produit.nom || 'Produit';
  const desc    = `${prix} — Disponible sur ${boutique.nom_boutique}. Commandez directement en ligne !`;
  const image   = produit.image_url || boutique.banniere_url || boutique.entreprises?.logo_url || '';
  const couleur = boutique.couleur_principale || '#3b82f6';

  return buildHtml({ titre, desc, image, couleur, pageUrl, siteName: boutique.nom_boutique });
}

/* ── Constructeur HTML commun ── */
function buildHtml({ titre, desc, image, couleur, pageUrl, siteName }) {
  const imageTags = image ? `
  <meta property="og:image"        content="${escHtml(image)}" />
  <meta property="og:image:width"  content="1200" />
  <meta property="og:image:height" content="630" />
  <meta property="og:image:alt"    content="${escHtml(titre)}" />
  <meta name="twitter:image"       content="${escHtml(image)}" />
  <meta name="twitter:image:alt"   content="${escHtml(titre)}" />` : '';

  return `<!doctype html>
<html lang="fr">
<head>
  <meta charset="UTF-8" />
  <title>${escHtml(titre)} — ${escHtml(siteName)}</title>
  <meta name="description" content="${escHtml(desc)}" />
  <meta name="theme-color" content="${escHtml(couleur)}" />
  <link rel="canonical"    href="${escHtml(pageUrl)}" />

  <!-- Open Graph -->
  <meta property="og:type"        content="website" />
  <meta property="og:url"         content="${escHtml(pageUrl)}" />
  <meta property="og:title"       content="${escHtml(titre)}" />
  <meta property="og:description" content="${escHtml(desc)}" />
  <meta property="og:site_name"   content="${escHtml(siteName)}" />
  <meta property="og:locale"      content="fr_FR" />${imageTags}

  <!-- Twitter / X Cards -->
  <meta name="twitter:card"        content="${image ? 'summary_large_image' : 'summary'}" />
  <meta name="twitter:title"       content="${escHtml(titre)}" />
  <meta name="twitter:description" content="${escHtml(desc)}" />
</head>
<body>
  <h1>${escHtml(titre)}</h1>
  <p>${escHtml(desc)}</p>
  <a href="${escHtml(pageUrl)}">Voir sur ${escHtml(siteName)} →</a>
</body>
</html>`;
}

/* ── Sert le index.html de la SPA ── */
async function serveSPA(requestUrl) {
  const spaUrl = new URL('/', requestUrl);
  try {
    const res  = await fetch(spaUrl.toString());
    const html = await res.text();
    return new Response(html, {
      status: res.status,
      headers: { 'Content-Type': 'text/html; charset=utf-8' },
    });
  } catch {
    return new Response(
      '<!doctype html><html><head><meta charset="UTF-8"/></head><body><div id="root"></div></body></html>',
      { status: 200, headers: { 'Content-Type': 'text/html; charset=utf-8' } }
    );
  }
}

/* ── Handler principal ── */
export default async function handler(req) {
  const url       = new URL(req.url);
  const userAgent = req.headers.get('user-agent') || '';

  const match = url.pathname.match(/^\/boutique\/([^/?#]+)/);
  const slug  = match?.[1];

  if (!slug) return serveSPA(req.url);
  if (!isCrawler(userAgent)) return serveSPA(req.url);

  /* ── Crawler détecté ── */
  const boutique = await fetchBoutique(slug);

  if (!boutique) {
    return new Response(
      `<!doctype html><html lang="fr"><head><meta charset="UTF-8" /><title>Boutique introuvable</title>
      <meta name="robots" content="noindex" /></head><body><p>Boutique introuvable.</p></body></html>`,
      { status: 404, headers: { 'Content-Type': 'text/html; charset=utf-8' } }
    );
  }

  /* Vérifie si ?produit=REF est présent */
  const refProduit = url.searchParams.get('produit');
  let html;

  if (refProduit) {
    /* Tente de charger le produit spécifique */
    const produit = await fetchProduit(boutique.id, refProduit);
    const pageUrl = `${url.origin}/boutique/${slug}?produit=${encodeURIComponent(refProduit)}`;
    html = produit
      ? buildProduitHtml(boutique, produit, pageUrl)
      : buildBoutiqueHtml(boutique, `${url.origin}/boutique/${slug}`); // fallback boutique si produit non trouvé
  } else {
    html = buildBoutiqueHtml(boutique, `${url.origin}/boutique/${slug}`);
  }

  return new Response(html, {
    status: 200,
    headers: {
      'Content-Type':  'text/html; charset=utf-8',
      'Cache-Control': 'public, s-maxage=300, stale-while-revalidate=60',
      'X-OG-Generated': refProduit ? `produit:${refProduit}` : 'boutique',
    },
  });
}
