export const aiIntentLibrary = [
  {
    type: 'greeting',
    keywords: ['bonjour', 'salut', 'hello', 'bonsoir'],
  },

  {
    type: 'business_health_judgment',
    keywords: [
      'cela est bon ou mauvais pour mon commerce',
      'cela est bon ou mauvais',
      'cest bon ou mauvais pour mon commerce',
      'c’est bon ou mauvais pour mon commerce',
      'est-ce bon ou mauvais pour mon commerce',
      'est ce bon ou mauvais pour mon commerce',
      'mes résultats sont bons ou mauvais',
      'mes resultats sont bons ou mauvais',
      'ma situation est bonne ou mauvaise',
      'est-ce que mon commerce va bien',
      'est ce que mon commerce va bien',
      'est-ce rentable',
      'est ce rentable',
      'mon commerce va bien ou pas',
    ],
  },

  {
    type: 'sold_products_list',
    keywords: [
      'liste des produits vendus',
      'produits vendus',
      'qu’ai-je vendu',
      "qu'ai-je vendu",
      'ce que j’ai vendu',
      "ce que j'ai vendu",
      'liste des ventes',
      'quels produits ont été vendus',
      'quels produits ont ete vendus',
    ],
  },

  {
    type: 'global_revenue',
    keywords: [
      'quel est mon chiffre d’affaires',
      'quel est mon chiffre affaire',
      'combien de chiffre d’affaires',
      'combien de chiffre affaire',
      'quel est le ca',
      'revenu global',
      'combien j’ai vendu',
      "combien j'ai vendu",
      'montant vendu',
    ],
  },

  {
    type: 'global_profit',
    keywords: [
      'quel est le bénéfice réalisé',
      'quel est le benefice realise',
      'quel est mon bénéfice',
      'quel est mon benefice',
      'combien de bénéfice',
      'combien de benefice',
      'profit global',
      'combien j’ai gagné',
      "combien j'ai gagné",
      'combien j’ai gagne',
      "combien j'ai gagne",
    ],
  },

  {
    type: 'product_revenue',
    keywords: [
      'quel est le chiffre d’affaires du produit',
      'quel est le chiffre affaire du produit',
      'combien a rapporté le produit',
      'combien a rapporte le produit',
      'revenu du produit',
      'ca du produit',
    ],
  },

  {
    type: 'product_profit',
    keywords: [
      'quel est le bénéfice du produit',
      'quel est le benefice du produit',
      'quel bénéfice ai-je obtenu sur le produit',
      'quel benefice ai-je obtenu sur le produit',
      'marge du produit',
      'profit du produit',
    ],
  },

  {
    type: 'product_quantity',
    keywords: [
      'quantité vendue du produit',
      'quantite vendue du produit',
      'combien d’unités du produit',
      "combien d'unites du produit",
      'combien a été vendu',
      'combien a ete vendu',
    ],
  },

  {
    type: 'product_stock',
    keywords: [
      'stock du produit',
      'combien reste du produit',
      'combien reste en stock',
      'stock restant du produit',
      'quantité en stock du produit',
      'quantite en stock du produit',
    ],
  },

  {
    type: 'compare_products',
    keywords: [
      'compare les produits',
      'comparaison entre',
      'quel produit est meilleur entre',
      'compare',
    ],
  },

  {
    type: 'top_profitable_product',
    keywords: [
      'produit le plus rentable',
      'plus rentable',
      'quel produit rapporte le plus',
      'quel produit est le plus rentable',
    ],
  },

  {
    type: 'best_selling_product',
    keywords: [
      'produit le plus vendu',
      'meilleure vente',
      'quel produit se vend le plus',
      'best seller',
    ],
  },

  {
    type: 'worst_selling_product',
    keywords: [
      'produit le moins vendu',
      'quel produit se vend moins',
      'quel produit vend moins',
      'moins vendu',
    ],
  },

  {
    type: 'lowest_profit_product',
    keywords: [
      'produit le moins rentable',
      'quel produit rapporte moins',
      'plus faible bénéfice produit',
      'plus faible benefice produit',
    ],
  },

  {
    type: 'top_products',
    keywords: [
      'top produits',
      'meilleurs produits',
      'produits les plus vendus',
    ],
  },

  {
    type: 'out_of_stock_products',
    keywords: [
      'produits en rupture',
      'rupture de stock',
      'quels produits sont en rupture',
      'stock à zéro',
      'stock a zero',
    ],
  },

  {
    type: 'stock_health_summary',
    keywords: [
      'stock faible',
      'réapprovisionner',
      'reapprovisionner',
      'état du stock',
      'etat du stock',
      'est-ce que mon stock est bon',
      'mon stock va bien',
    ],
  },

  {
    type: 'credit_alerts',
    keywords: [
      'crédit',
      'credit',
      'à relancer',
      'a relancer',
      'impayé',
      'impaye',
      'quels crédits sont à relancer',
      'quels credits sont a relancer',
      'combien me doivent les clients',
      'reste à payer clients',
      'reste a payer clients',
    ],
  },

  {
    type: 'credit_total_due',
    keywords: [
      'total des crédits',
      'total des credits',
      'combien me doivent',
      'total à récupérer',
      'total a recuperer',
    ],
  },

  {
    type: 'top_debtor_client',
    keywords: [
      'quel client doit le plus',
      'client le plus endetté',
      'client le plus endette',
      'plus gros débiteur',
      'plus gros debiteur',
    ],
  },

  {
    type: 'expenses_summary',
    keywords: [
      'dépense',
      'depense',
      'charges',
      'combien ai-je dépensé',
      'combien ai-je depense',
    ],
  },

  {
    type: 'sales_count_or_quantity_summary',
    keywords: [
      'combien de produits vendus',
      'quantité totale vendue',
      'quantite totale vendue',
      'nombre d’articles vendus',
      "nombre d'articles vendus",
    ],
  },

  {
    type: 'pending_sales_summary',
    keywords: [
      'ventes en attente',
      'combien de ventes en attente',
      'montant des ventes en attente',
    ],
  },

  {
    type: 'paid_sales_summary',
    keywords: [
      'ventes payées',
      'ventes payees',
      'ventes encaissées',
      'ventes encaissees',
    ],
  },

  {
    type: 'urgent_recommendations',
    keywords: [
      'que dois-je faire maintenant',
      'quoi faire maintenant',
      'actions urgentes',
      'recommandations urgentes',
      'que me conseilles-tu',
      'que me conseilles tu',
    ],
  },

  {
    type: 'global_summary',
    keywords: [
      'résumé',
      'resume',
      'situation commerciale',
      'analyse globale',
      'bilan',
      'performance',
      'montre-moi ma situation',
      'montre moi ma situation',
    ],
  },
];