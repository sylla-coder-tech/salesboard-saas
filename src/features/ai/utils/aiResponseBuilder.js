function formatGNF(value) {
  return new Intl.NumberFormat('fr-FR').format(Number(value || 0)) + ' GNF';
}

export function buildGreetingAnswer(aiData) {
  return `Bonjour. Je suis votre assistant commercial ${aiData?.entreprise?.ia_niveau === 'premium' ? 'premium' : 'pro'}. Je peux vous aider sur vos ventes, bénéfices, produits, stocks, crédits et performances.`;
}

export function buildForbiddenAnswer() {
  return `Je suis un assistant dédié uniquement à la gestion commerciale. Posez-moi une question sur vos ventes, produits, bénéfices, stocks, crédits, dépenses ou performances commerciales.`;
}

export function buildGlobalSummary(aiData, periodLabel) {
  const resume = aiData.resume;

  return `Sur ${periodLabel}, votre chiffre d’affaires est de ${formatGNF(
    resume.chiffre_affaires
  )}, votre coût total est de ${formatGNF(
    resume.cout_total
  )}, et votre bénéfice net estimé est de ${formatGNF(
    resume.benefice_net
  )}. Les dépenses s’élèvent à ${formatGNF(
    resume.total_depenses
  )}, et les crédits encore à récupérer sont de ${formatGNF(
    resume.credits_en_cours
  )}.`;
}

export function buildGlobalRevenueAnswer(aiData, periodLabel) {
  return `Votre chiffre d’affaires sur ${periodLabel} est de ${formatGNF(
    aiData.resume.chiffre_affaires
  )}.`;
}

export function buildGlobalProfitAnswer(aiData, periodLabel) {
  return `Votre bénéfice net réalisé sur ${periodLabel} est de ${formatGNF(
    aiData.resume.benefice_net
  )}. Le bénéfice généré uniquement par les produits vendus est de ${formatGNF(
    aiData.resume.benefice_produits
  )}.`;
}

export function buildBusinessHealthJudgmentAnswer(aiData, periodLabel) {
  const resume = aiData.resume;
  const beneficeNet = Number(resume.benefice_net || 0);
  const chiffreAffaires = Number(resume.chiffre_affaires || 0);
  const credits = Number(resume.credits_en_cours || 0);
  const stockAlerts = Number(resume.nombre_alertes_stock || 0);

  if (chiffreAffaires <= 0) {
    return `Sur ${periodLabel}, votre activité semble faible car aucun chiffre d’affaires significatif n’a été détecté. Il faut surtout relancer les ventes.`;
  }

  if (beneficeNet > 0 && credits === 0 && stockAlerts <= 1) {
    return `Sur ${periodLabel}, la situation de votre commerce est plutôt bonne. Vous êtes bénéficiaire avec ${formatGNF(
      beneficeNet
    )}, vos crédits à récupérer sont faibles ou nuls, et votre stock reste globalement maîtrisé.`;
  }

  if (beneficeNet > 0 && (credits > 0 || stockAlerts > 1)) {
    return `Sur ${periodLabel}, votre commerce est dans une situation globalement correcte car vous restez bénéficiaire avec ${formatGNF(
      beneficeNet
    )}. Cependant, il faut surveiller ${credits > 0 ? 'les crédits clients' : 'le stock'} pour éviter une dégradation.`;
  }

  if (beneficeNet === 0) {
    return `Sur ${periodLabel}, la situation de votre commerce est moyenne. Vous n’êtes pas en perte, mais votre bénéfice net est nul. Il faut améliorer la marge ou augmenter les ventes.`;
  }

  return `Sur ${periodLabel}, la situation de votre commerce est à surveiller. Votre bénéfice net est négatif (${formatGNF(
    beneficeNet
  )}). Il faut revoir les coûts, les dépenses et la rentabilité des produits.`;
}

export function buildTopProfitableProductAnswer(aiData, periodLabel) {
  const top = aiData.top_produits?.[0];

  if (!top) {
    return `Je ne trouve aucun produit vendu sur ${periodLabel}.`;
  }

  return `Sur ${periodLabel}, votre produit le plus rentable est "${top.nom}", avec un chiffre d’affaires de ${formatGNF(
    top.chiffre_affaires
  )}, un coût total de ${formatGNF(top.cout_total)} et un bénéfice de ${formatGNF(
    top.benefice_total
  )}.`;
}

export function buildBestSellingProductAnswer(aiData, periodLabel) {
  const items = [...(aiData.top_produits || [])].sort(
    (a, b) => (b.quantite_vendue || 0) - (a.quantite_vendue || 0)
  );
  const top = items[0];

  if (!top) {
    return `Je ne trouve aucun produit vendu sur ${periodLabel}.`;
  }

  return `Sur ${periodLabel}, le produit le plus vendu est "${top.nom}" avec ${top.quantite_vendue} unité(s) vendue(s) et un chiffre d’affaires de ${formatGNF(
    top.chiffre_affaires
  )}.`;
}

export function buildWorstSellingProductAnswer(aiData, periodLabel) {
  const items = [...(aiData.top_produits || [])].sort(
    (a, b) => (a.quantite_vendue || 0) - (b.quantite_vendue || 0)
  );
  const item = items[0];

  if (!item) {
    return `Je ne trouve aucun produit vendu sur ${periodLabel}.`;
  }

  return `Sur ${periodLabel}, le produit le moins vendu est "${item.nom}" avec ${item.quantite_vendue} unité(s) vendue(s).`;
}

export function buildLowestProfitProductAnswer(aiData, periodLabel) {
  const items = [...(aiData.top_produits || [])].sort(
    (a, b) => (a.benefice_total || 0) - (b.benefice_total || 0)
  );
  const item = items[0];

  if (!item) {
    return `Je ne trouve aucun produit vendu sur ${periodLabel}.`;
  }

  return `Sur ${periodLabel}, le produit le moins rentable est "${item.nom}" avec un bénéfice de ${formatGNF(
    item.benefice_total
  )}.`;
}

export function buildTopProductsAnswer(aiData, periodLabel) {
  const items = aiData.top_produits?.slice(0, 5) || [];

  if (items.length === 0) {
    return `Je ne trouve aucun produit vendu sur ${periodLabel}.`;
  }

  const text = items
    .map(
      (item, index) =>
        `${index + 1}. ${item.nom} : CA ${formatGNF(item.chiffre_affaires)}, bénéfice ${formatGNF(
          item.benefice_total
        )}, quantité ${item.quantite_vendue}`
    )
    .join(' | ');

  return `Sur ${periodLabel}, voici vos produits les plus performants : ${text}`;
}

export function buildLowStockAnswer(aiData) {
  const items = aiData.alertes_stock || [];

  if (items.length === 0) {
    return `Aucun produit n’est actuellement en stock faible selon le seuil défini.`;
  }

  const text = items
    .slice(0, 5)
    .map((item) => `${item.nom} (${item.stock} restant)`)
    .join(', ');

  return `Les produits à réapprovisionner en priorité sont : ${text}.`;
}

export function buildStockHealthSummary(aiData) {
  const count = aiData.alertes_stock?.length || 0;

  if (count === 0) {
    return `Votre stock est globalement dans une bonne situation. Je ne détecte actuellement aucun produit en stock faible selon le seuil défini.`;
  }

  if (count === 1) {
    const item = aiData.alertes_stock[0];
    return `Votre stock nécessite une attention légère. Le produit "${item.nom}" est en stock faible avec ${item.stock} restant.`;
  }

  return `Votre stock nécessite une vigilance. Je détecte ${count} produit(s) en stock faible, avec en priorité : ${aiData.alertes_stock
    .slice(0, 3)
    .map((item) => `${item.nom} (${item.stock})`)
    .join(', ')}.`;
}

export function buildCreditAlertsAnswer(aiData) {
  const items = aiData.alertes_credits || [];

  if (items.length === 0) {
    return `Je ne détecte aucun crédit en attente sur cette période.`;
  }

  const text = items
    .slice(0, 5)
    .map((item) => `${item.client_nom} : ${formatGNF(item.reste_a_payer)}`)
    .join(', ');

  return `Les principaux crédits à relancer sont : ${text}.`;
}

export function buildCreditTotalDueAnswer(aiData, periodLabel) {
  return `Sur ${periodLabel}, le montant total encore à récupérer auprès des clients est de ${formatGNF(
    aiData.resume.credits_en_cours
  )}.`;
}

export function buildExpensesAnswer(aiData, periodLabel) {
  return `Sur ${periodLabel}, le total des dépenses est de ${formatGNF(
    aiData.resume.total_depenses
  )}.`;
}

export function buildQuantitySummaryAnswer(aiData, periodLabel) {
  const total = (aiData.top_produits || []).reduce(
    (sum, item) => sum + Number(item.quantite_vendue || 0),
    0
  );

  return `Sur ${periodLabel}, vous avez vendu ${total} article(s) au total.`;
}

export function buildProductAnswer(result, type, periodLabel) {
  if (type === 'product_revenue') {
    return `Le produit "${result.nom}" a généré un chiffre d’affaires de ${formatGNF(
      result.chiffre_affaires
    )} sur ${periodLabel}.`;
  }

  if (type === 'product_profit') {
    return `Le produit "${result.nom}" a généré un bénéfice total estimé à ${formatGNF(
      result.benefice_total
    )} sur ${periodLabel}, avec un coût total de ${formatGNF(result.cout_total)}.`;
  }

  if (type === 'product_quantity') {
    return `Le produit "${result.nom}" a été vendu à ${result.quantite_vendue} unité(s) sur ${periodLabel}.`;
  }

  return `Je n’ai pas pu analyser ce produit.`;
}

export function buildSoldProductsAnswer(aiData, periodLabel) {
  const items = aiData.top_produits || [];

  if (items.length === 0) {
    return `Je ne trouve aucun produit vendu sur ${periodLabel}.`;
  }

  const text = items
    .map(
      (item, index) =>
        `${index + 1}. ${item.nom} (${item.reference}) : ${item.quantite_vendue} unité(s), chiffre d’affaires ${formatGNF(item.chiffre_affaires)}`
    )
    .join(' | ');

  return `Voici la liste des produits vendus sur ${periodLabel} : ${text}`;
}
export function buildProductStockAnswer(product) {
  return `Le produit "${product.nom}" a actuellement un stock de ${Number(product.stock || 0)} unité(s).`;
}

export function buildOutOfStockProductsAnswer(products = []) {
  if (!products.length) {
    return `Je ne détecte actuellement aucun produit en rupture de stock.`;
  }

  const text = products
    .slice(0, 10)
    .map((item) => `${item.nom} (${item.reference || '-'})`)
    .join(', ');

  return `Les produits en rupture de stock sont : ${text}.`;
}

export function buildTopDebtorClientAnswer(aiData, periodLabel) {
  const items = aiData.alertes_credits || [];
  if (!items.length) {
    return `Je ne détecte aucun client débiteur sur ${periodLabel}.`;
  }

  const top = items[0];
  return `Sur ${periodLabel}, le client qui doit le plus est "${top.client_nom}" avec ${new Intl.NumberFormat('fr-FR').format(Number(top.reste_a_payer || 0))} GNF à payer.`;
}

export function buildPendingSalesAnswer(aiData, periodLabel) {
  return `Sur ${periodLabel}, je peux analyser les ventes enregistrées, mais le détail des ventes en attente doit être ajouté au moteur si vous voulez un calcul exact par statut depuis la source.`;
}

export function buildPaidSalesAnswer(aiData, periodLabel) {
  return `Sur ${periodLabel}, je peux analyser les ventes payées, mais le calcul exact par statut dépend du détail complet des lignes par statut dans votre source actuelle.`;
}

export function buildUrgentRecommendationsAnswer(aiData) {
  const recos = [];

  if ((aiData.alertes_stock || []).length > 0) {
    recos.push(
      `réapprovisionner ${aiData.alertes_stock
        .slice(0, 2)
        .map((p) => p.nom)
        .join(', ')}`
    );
  }

  if ((aiData.alertes_credits || []).length > 0) {
    recos.push(
      `relancer ${aiData.alertes_credits
        .slice(0, 2)
        .map((c) => c.client_nom)
        .join(', ')}`
    );
  }

  if (Number(aiData?.resume?.benefice_net || 0) <= 0) {
    recos.push(`réduire les dépenses et revoir les marges`);
  }

  if (!recos.length) {
    return `Aucune alerte urgente majeure n’est détectée pour le moment. Continuez à surveiller vos ventes, votre stock et vos crédits.`;
  }

  return `Mes actions prioritaires pour maintenant sont : ${recos.join(' ; ')}.`;
}

export function buildCompareProductsAnswer(productA, productB, periodLabel) {
  const betterRevenue =
    Number(productA.chiffre_affaires || 0) >= Number(productB.chiffre_affaires || 0)
      ? productA
      : productB;

  const betterProfit =
    Number(productA.benefice_total || 0) >= Number(productB.benefice_total || 0)
      ? productA
      : productB;

  return `Sur ${periodLabel}, "${productA.nom}" a généré ${new Intl.NumberFormat('fr-FR').format(
    Number(productA.chiffre_affaires || 0)
  )} GNF de chiffre d’affaires et ${new Intl.NumberFormat('fr-FR').format(
    Number(productA.benefice_total || 0)
  )} GNF de bénéfice, tandis que "${productB.nom}" a généré ${new Intl.NumberFormat('fr-FR').format(
    Number(productB.chiffre_affaires || 0)
  )} GNF de chiffre d’affaires et ${new Intl.NumberFormat('fr-FR').format(
    Number(productB.benefice_total || 0)
  )} GNF de bénéfice. Le meilleur en chiffre d’affaires est "${betterRevenue.nom}" et le plus rentable est "${betterProfit.nom}".`;
}