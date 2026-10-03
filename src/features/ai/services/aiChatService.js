import { getAiCommercialData, getProductRevenueAnalysis } from './aiService';
import { aiIntentLibrary } from '../config/aiIntentLibrary';
import { detectPeriodFromMessage, getPeriodLabel } from '../utils/aiPeriodParser';
import { extractProductName, extractTwoProductNames } from '../utils/aiEntityParser';
import {
  buildGreetingAnswer,
  buildForbiddenAnswer,
  buildGlobalSummary,
  buildGlobalRevenueAnswer,
  buildGlobalProfitAnswer,
  buildBusinessHealthJudgmentAnswer,
  buildTopProfitableProductAnswer,
  buildBestSellingProductAnswer,
  buildWorstSellingProductAnswer,
  buildLowestProfitProductAnswer,
  buildTopProductsAnswer,
  buildLowStockAnswer,
  buildStockHealthSummary,
  buildCreditAlertsAnswer,
  buildCreditTotalDueAnswer,
  buildExpensesAnswer,
  buildQuantitySummaryAnswer,
  buildProductAnswer,
  buildSoldProductsAnswer,
  buildProductStockAnswer,
  buildOutOfStockProductsAnswer,
  buildTopDebtorClientAnswer,
  buildPendingSalesAnswer,
  buildPaidSalesAnswer,
  buildUrgentRecommendationsAnswer,
  buildCompareProductsAnswer,
} from '../utils/aiResponseBuilder';

function normalizeText(value) {
  return String(value || '').trim().toLowerCase();
}

function detectIntent(message) {
  const text = normalizeText(message);

  for (const intent of aiIntentLibrary) {
    const matched = (intent.keywords || []).some((keyword) => text.includes(keyword));
    if (matched) {
      return { type: intent.type };
    }
  }

  return { type: 'unknown' };
}

function isProductIntent(type) {
  return ['product_revenue', 'product_profit', 'product_quantity', 'product_stock'].includes(type);
}

function getAllowedTypes() {
  return [
    'greeting',
    'business_health_judgment',
    'sold_products_list',
    'global_revenue',
    'global_profit',
    'product_revenue',
    'product_profit',
    'product_quantity',
    'product_stock',
    'compare_products',
    'top_profitable_product',
    'best_selling_product',
    'worst_selling_product',
    'lowest_profit_product',
    'top_products',
    'out_of_stock_products',
    'stock_health_summary',
    'credit_alerts',
    'credit_total_due',
    'top_debtor_client',
    'expenses_summary',
    'sales_count_or_quantity_summary',
    'pending_sales_summary',
    'paid_sales_summary',
    'urgent_recommendations',
    'global_summary',
  ];
}

function findProductInStock(aiData, productName) {
  const search = normalizeText(productName);
  const products = aiData?.raw_produits || [];
  return products.find((p) => normalizeText(p.nom).includes(search));
}

function buildAnswerByIntent(intentType, aiData, periodLabel, message) {
  if (intentType === 'greeting') return buildGreetingAnswer(aiData);
  if (intentType === 'business_health_judgment') return buildBusinessHealthJudgmentAnswer(aiData, periodLabel);
  if (intentType === 'global_summary') return buildGlobalSummary(aiData, periodLabel);
  if (intentType === 'global_revenue') return buildGlobalRevenueAnswer(aiData, periodLabel);
  if (intentType === 'global_profit') return buildGlobalProfitAnswer(aiData, periodLabel);
  if (intentType === 'top_profitable_product') return buildTopProfitableProductAnswer(aiData, periodLabel);
  if (intentType === 'best_selling_product') return buildBestSellingProductAnswer(aiData, periodLabel);
  if (intentType === 'worst_selling_product') return buildWorstSellingProductAnswer(aiData, periodLabel);
  if (intentType === 'lowest_profit_product') return buildLowestProfitProductAnswer(aiData, periodLabel);
  if (intentType === 'top_products') return buildTopProductsAnswer(aiData, periodLabel);
  if (intentType === 'out_of_stock_products') {
    const out = (aiData.raw_produits || []).filter((p) => Number(p.stock || 0) <= 0);
    return buildOutOfStockProductsAnswer(out);
  }
  if (intentType === 'stock_health_summary') return buildStockHealthSummary(aiData);
  if (intentType === 'credit_alerts') return buildCreditAlertsAnswer(aiData);
  if (intentType === 'credit_total_due') return buildCreditTotalDueAnswer(aiData, periodLabel);
  if (intentType === 'top_debtor_client') return buildTopDebtorClientAnswer(aiData, periodLabel);
  if (intentType === 'expenses_summary') return buildExpensesAnswer(aiData, periodLabel);
  if (intentType === 'sales_count_or_quantity_summary') return buildQuantitySummaryAnswer(aiData, periodLabel);
  if (intentType === 'pending_sales_summary') return buildPendingSalesAnswer(aiData, periodLabel);
  if (intentType === 'paid_sales_summary') return buildPaidSalesAnswer(aiData, periodLabel);
  if (intentType === 'urgent_recommendations') return buildUrgentRecommendationsAnswer(aiData);
  if (intentType === 'sold_products_list') return buildSoldProductsAnswer(aiData, periodLabel);

  if (intentType === 'compare_products') {
    const names = extractTwoProductNames(message);
    if (names.length < 2) {
      return 'Précisez les deux produits à comparer.';
    }
    const productA = getProductRevenueAnalysis(aiData, names[0]);
    const productB = getProductRevenueAnalysis(aiData, names[1]);
    return buildCompareProductsAnswer(productA, productB, periodLabel);
  }

  if (isProductIntent(intentType)) {
    const productName = extractProductName(message);

    if (!productName) {
      return 'Précisez le nom du produit que vous voulez analyser.';
    }

    if (intentType === 'product_stock') {
      const found = findProductInStock(aiData, productName);
      if (!found) return 'Produit introuvable dans le stock.';
      return buildProductStockAnswer(found);
    }

    const result = getProductRevenueAnalysis(aiData, productName);
    return buildProductAnswer(result, intentType, periodLabel);
  }

  return buildForbiddenAnswer();
}

export async function askCommercialAssistant(message, fallbackPeriod = '30days') {
  const cleanMessage = String(message || '').trim();

  if (!cleanMessage) {
    throw new Error('Votre message est vide.');
  }

  const intent = detectIntent(cleanMessage);
  const allowedTypes = getAllowedTypes();

  if (!allowedTypes.includes(intent.type)) {
    return {
      type: 'forbidden',
      answer: buildForbiddenAnswer(),
    };
  }

  const detectedPeriod = detectPeriodFromMessage(cleanMessage, fallbackPeriod);
  const periodLabel = getPeriodLabel(detectedPeriod);
  const aiData = await getAiCommercialData(detectedPeriod);

  if (!aiData?.entreprise?.ia_active) {
    return {
      type: 'forbidden',
      answer: `Votre plan actuel ne permet pas d’utiliser l’assistant IA commercial.`,
    };
  }

  try {
    const answer = buildAnswerByIntent(intent.type, aiData, periodLabel, cleanMessage);

    return {
      type: intent.type,
      answer,
      aiData,
      period: detectedPeriod,
      periodLabel,
    };
  } catch (err) {
    return {
      type: 'error',
      answer:
        err.message ||
        "Je n'ai pas pu traiter cette demande commerciale correctement.",
      aiData,
      period: detectedPeriod,
      periodLabel,
    };
  }
}