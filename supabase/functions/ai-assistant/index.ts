import 'jsr:@supabase/functions-js/edge-runtime.d.ts'
import { createClient } from 'npm:@supabase/supabase-js@2'

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
  'Access-Control-Allow-Methods': 'POST, OPTIONS',
  'Content-Type': 'application/json',
}

function jsonResponse(body: Record<string, unknown>, status = 200) {
  return new Response(JSON.stringify(body), {
    status,
    headers: corsHeaders,
  })
}

function buildSystemPrompt(context: Record<string, unknown> | null): string {
  const base = `Tu es un assistant business expert intégré dans SalesBoard, une application de gestion commerciale.

Ton rôle UNIQUE :
1. Analyser les données commerciales de l'entreprise (ventes, produits, bénéfices, stocks, crédits, dépenses) et donner des conseils précis basés sur ces données réelles.
2. Répondre uniquement aux questions liées au commerce, à la gestion d'entreprise, aux ventes, au marketing, à la stratégie commerciale, à la comptabilité, à la finance d'entreprise, à la négociation, à la relation client, à la logistique et au développement business.
3. Si la question n'a AUCUN lien avec le commerce ou la gestion d'entreprise, réponds : "Je suis uniquement disponible pour les questions commerciales et de gestion d'entreprise. Posez-moi une question sur vos ventes, votre stock, vos finances ou votre stratégie business."

Sujets STRICTEMENT INTERDITS (refuse poliment) :
- Culture générale, histoire, géographie, sciences, sport, politique, religion
- Divertissement, célébrités, films, musique
- Santé personnelle, recettes, voyages personnels
- Tout sujet sans lien direct avec le commerce ou la gestion d'entreprise

Règles STRICTES sur la qualité des réponses :
- Réponds TOUJOURS en français.
- Sois DIRECT et CONCIS. Va droit au but, sans introduction inutile.
- NE RÉPÈTE JAMAIS deux fois la même idée sous des formulations différentes. Une idée = une fois.
- NE génère PAS de listes génériques avec des conseils évidents. Sois spécifique.
- Si l'utilisateur décrit un problème concret, identifie LA cause probable la plus réaliste et propose 2-3 actions concrètes et actionnables.
- Utilise les données commerciales fournies pour personnaliser la réponse.
- Format idéal : 3-6 phrases directes, ou une liste courte de 2-3 points vraiment différents.
- Pour les questions sur les ventes par statut, utilise la section "Ventes par statut" des données fournies.`

  if (!context) return base

  const {
    entreprise_nom,
    plan_abonnement,
    chiffre_affaires,
    benefice_net,
    caisse_disponible,
    total_depenses,
    credits_en_cours,
    nombre_total_ventes,
    top_produits,
    alertes_stock,
    alertes_credits,
    ventes_par_statut,
    period_label,
  } = context

  // Top 10 produits
  const topProduitsText = Array.isArray(top_produits) && top_produits.length > 0
    ? top_produits
        .slice(0, 10)
        .map((p: Record<string, unknown>, i: number) =>
          `  ${i + 1}. ${p.nom} (Réf: ${p.reference}) — CA: ${p.chiffre_affaires} GNF, Bénéfice: ${p.benefice_total} GNF, Qté vendue: ${p.quantite_vendue}`
        )
        .join('\n')
    : '  Aucune donnée disponible'

  // Toutes les alertes stock
  const alertesStockText = Array.isArray(alertes_stock) && alertes_stock.length > 0
    ? alertes_stock
        .map((a: Record<string, unknown>) => `  - ${a.nom} (${a.reference}) : ${a.stock} unité(s) restante(s)`)
        .join('\n')
    : '  Aucune alerte stock'

  // Top 10 crédits
  const alertesCreditsText = Array.isArray(alertes_credits) && alertes_credits.length > 0
    ? alertes_credits
        .slice(0, 10)
        .map((c: Record<string, unknown>) => `  - ${c.client_nom} : ${c.reste_a_payer} GNF à récupérer`)
        .join('\n')
    : '  Aucun crédit en attente'

  // Ventes par statut
  let ventesParStatutText = '  Données non disponibles'
  if (ventes_par_statut && typeof ventes_par_statut === 'object') {
    const s = ventes_par_statut as Record<string, unknown>
    const payee = s.payee as Record<string, unknown> | undefined
    const en_attente = s.en_attente as Record<string, unknown> | undefined
    const livree = s.livree as Record<string, unknown> | undefined

    ventesParStatutText = [
      `  - Payées : ${payee?.nombre ?? 0} vente(s), total ${payee?.montant ?? 0} GNF`,
      `  - En attente : ${en_attente?.nombre ?? 0} vente(s), total ${en_attente?.montant ?? 0} GNF`,
      `  - Livrées : ${livree?.nombre ?? 0} vente(s), total ${livree?.montant ?? 0} GNF`,
    ].join('\n')
  }

  return `${base}

--- DONNÉES COMMERCIALES DE L'ENTREPRISE (période : ${period_label || 'récente'}) ---

Entreprise : ${entreprise_nom || 'Non renseigné'}
Plan : ${plan_abonnement || 'Non renseigné'}

Résumé financier :
- Chiffre d'affaires : ${chiffre_affaires || 0} GNF
- Bénéfice net : ${benefice_net || 0} GNF
- Caisse disponible : ${caisse_disponible || 0} GNF
- Total dépenses : ${total_depenses || 0} GNF
- Crédits en cours (à récupérer) : ${credits_en_cours || 0} GNF
- Nombre total de ventes : ${nombre_total_ventes || 0}

Ventes par statut (période sélectionnée) :
${ventesParStatutText}

Top produits (classés par bénéfice) :
${topProduitsText}

Alertes stock faible (stock ≤ 5 unités) :
${alertesStockText}

Crédits à relancer :
${alertesCreditsText}

---
Utilise ces données pour répondre aux questions commerciales spécifiques à cette entreprise.
Pour les questions sur le nombre ou le montant de ventes par statut (payée, en attente, livrée), utilise la section "Ventes par statut" ci-dessus.
Pour les questions générales ou études de marché, utilise tes connaissances globales.`
}

Deno.serve(async (req) => {
  try {
    console.log('[ai-assistant] Requête reçue:', req.method)

    if (req.method === 'OPTIONS') {
      return new Response('ok', { headers: corsHeaders })
    }

    // Vérifier l'authentification
    const authHeader = req.headers.get('Authorization')
    if (!authHeader) {
      console.log('[ai-assistant] Pas de header Authorization')
      return jsonResponse({ error: 'Non autorisé.' }, 401)
    }

    console.log('[ai-assistant] Auth header présent')

    const supabaseUrl = Deno.env.get('SUPABASE_URL')
    const supabaseKey = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')
    const groqApiKey = Deno.env.get('GROQ_API_KEY')

    console.log('[ai-assistant] SUPABASE_URL:', supabaseUrl ? 'OK' : 'MANQUANT')
    console.log('[ai-assistant] SUPABASE_SERVICE_ROLE_KEY:', supabaseKey ? 'OK' : 'MANQUANT')
    console.log('[ai-assistant] GROQ_API_KEY:', groqApiKey ? 'OK' : 'MANQUANT')

    if (!supabaseUrl || !supabaseKey) {
      return jsonResponse({ error: 'Variables Supabase manquantes.' }, 500)
    }

    if (!groqApiKey) {
      return jsonResponse({ error: 'Clé API Groq non configurée.' }, 500)
    }

    const supabase = createClient(supabaseUrl, supabaseKey)

    // Vérifier le token utilisateur
    const token = authHeader.replace('Bearer ', '')
    const { data: { user }, error: authError } = await supabase.auth.getUser(token)

    console.log('[ai-assistant] Auth user:', user ? user.id : 'ERREUR', authError?.message || '')

    if (authError || !user) {
      return jsonResponse({ error: 'Session invalide.' }, 401)
    }

    const { messages, context } = await req.json()

    console.log('[ai-assistant] Messages reçus:', messages?.length || 0)

    if (!messages || !Array.isArray(messages) || messages.length === 0) {
      return jsonResponse({ error: 'Messages manquants.' }, 400)
    }

    const systemPrompt = buildSystemPrompt(context || null)

    // Formater l'historique des messages pour Groq
    const groqMessages = [
      { role: 'system', content: systemPrompt },
      ...messages.map((m: { role: string; text: string }) => ({
        role: m.role === 'assistant' ? 'assistant' : 'user',
        content: m.text,
      })),
    ]

    // Appel à l'API Groq
    console.log('[ai-assistant] Appel Groq en cours...')
    const groqResponse = await fetch('https://api.groq.com/openai/v1/chat/completions', {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${groqApiKey}`,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        model: 'groq/compound',
        messages: groqMessages,
        max_tokens: 1024,
        temperature: 0.5,
      }),
    })

    console.log('[ai-assistant] Groq status:', groqResponse.status)

    if (!groqResponse.ok) {
      const errorData = await groqResponse.json()
      console.log('[ai-assistant] Groq erreur:', JSON.stringify(errorData))
      return jsonResponse(
        { error: errorData?.error?.message || "Erreur lors de l\u2019appel \u00e0 Groq." },
        500
      )
    }

    const groqData = await groqResponse.json()
    console.log('[ai-assistant] Groq réponse reçue OK')
    const answer = groqData?.choices?.[0]?.message?.content || 'Aucune réponse générée.'

    return jsonResponse({ answer })

  } catch (err) {
    return jsonResponse(
      { error: err instanceof Error ? err.message : 'Erreur interne.' },
      500
    )
  }
})
