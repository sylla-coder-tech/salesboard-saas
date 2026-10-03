import { useEffect } from 'react';

/**
 * useBoutiqueOGMeta
 * -----------------
 * Injecte dynamiquement les meta tags Open Graph, Twitter Cards et
 * les balises SEO standard dans <head>.
 *
 * - Sans produit   → OG tags de la boutique (nom, description, bannière)
 * - Avec produit   → OG tags du produit (nom, prix, image)
 *
 * Compatible : WhatsApp, iMessage, Telegram, LinkedIn, Twitter/X, Slack.
 * ⚠️  Facebook/Instagram nécessitent l'Edge Function SSR (api/og-boutique.js).
 *
 * @param {Object|null} boutique - Objet boutique chargé depuis Supabase
 * @param {Object|null} produit  - Produit actuellement ouvert (optionnel)
 */
export function useBoutiqueOGMeta(boutique, produit = null) {
  useEffect(() => {
    if (!boutique) return;

    const origin = window.location.origin;
    const baseUrl = `${origin}/boutique/${boutique.slug}`;

    /* ── Valeurs selon contexte boutique ou produit ── */
    let titre, desc, image, url;

    if (produit) {
      /* Mode produit spécifique */
      titre = produit.nom || boutique.nom_boutique;
      const formatGNF = (v) =>
        new Intl.NumberFormat('fr-FR').format(Number(v || 0)) + ' GNF';
      desc  = `${formatGNF(produit.prixUnitaire)} — Disponible sur ${boutique.nom_boutique}. Commandez en ligne !`;
      image = produit.image_url
        || boutique.banniere_url
        || boutique.entreprises?.logo_url
        || null;
      url   = `${baseUrl}?produit=${encodeURIComponent(produit.reference || produit.id)}`;
    } else {
      /* Mode boutique générale */
      titre = boutique.nom_boutique || 'Boutique en ligne';
      desc  = boutique.description
        ? boutique.description.slice(0, 160)
        : `Découvrez les produits de ${titre} et commandez en ligne en quelques clics.`;
      image = boutique.banniere_url
        || boutique.entreprises?.logo_url
        || null;
      url   = baseUrl;
    }

    const couleur = boutique.couleur_principale || '#3b82f6';

    /* ── Helpers ── */
    function setMeta(selector, value) {
      if (!value) return;
      let el = document.head.querySelector(selector);
      if (!el) {
        el = document.createElement('meta');
        const attr = selector.startsWith('[property') ? 'property' : 'name';
        const attrValue = selector.match(/["']([^"']+)["']/)?.[1];
        if (attrValue) el.setAttribute(attr, attrValue);
        document.head.appendChild(el);
      }
      el.setAttribute('content', value);
    }

    function setLink(rel, href) {
      if (!href) return;
      let el = document.head.querySelector(`link[rel="${rel}"]`);
      if (!el) {
        el = document.createElement('link');
        el.setAttribute('rel', rel);
        document.head.appendChild(el);
      }
      el.setAttribute('href', href);
    }

    /* ── Titre de la page ── */
    document.title = produit
      ? `${titre} — ${boutique.nom_boutique}`
      : `${titre} — Boutique en ligne`;

    /* ── SEO standard ── */
    setMeta('[name="description"]', desc);
    setMeta('[name="theme-color"]', couleur);
    setLink('canonical', url);

    /* ── Open Graph ── */
    setMeta('[property="og:type"]',        'website');
    setMeta('[property="og:url"]',         url);
    setMeta('[property="og:title"]',       titre);
    setMeta('[property="og:description"]', desc);
    setMeta('[property="og:site_name"]',   boutique.nom_boutique || 'SalesBoard');
    setMeta('[property="og:locale"]',      'fr_FR');
    if (image) {
      setMeta('[property="og:image"]',        image);
      setMeta('[property="og:image:width"]',  '1200');
      setMeta('[property="og:image:height"]', '630');
      setMeta('[property="og:image:alt"]',    titre);
    }

    /* ── Twitter / X Cards ── */
    setMeta('[name="twitter:card"]',        image ? 'summary_large_image' : 'summary');
    setMeta('[name="twitter:title"]',       titre);
    setMeta('[name="twitter:description"]', desc);
    if (image) {
      setMeta('[name="twitter:image"]',     image);
      setMeta('[name="twitter:image:alt"]', titre);
    }

    /* ── Nettoyage au démontage ── */
    return () => {
      document.title = 'SalesBoard';
    };
  }, [boutique, produit]);
}
