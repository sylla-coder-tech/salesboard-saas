import 'jsr:@supabase/functions-js/edge-runtime.d.ts'
import { createClient } from 'npm:@supabase/supabase-js@2'

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
  'Access-Control-Allow-Methods': 'POST, OPTIONS',
  'Content-Type': 'application/json',
}

function jsonResponse(body: Record<string, unknown>, status = 200) {
  return new Response(JSON.stringify(body), { status, headers: corsHeaders })
}

/**
 * Génère un numéro de commande unique format CMD-YYYY-NNNN
 * Cherche le dernier numéro de l'année en cours et incrémente.
 * Ex : CMD-2024-0001, CMD-2024-0042, CMD-2025-0001
 */
async function genererNumeroCommande(
  supabase: ReturnType<typeof createClient>,
  entrepriseId: string
): Promise<string> {
  const annee = new Date().getFullYear().toString()
  const prefixe = `CMD-${annee}-`

  // Cherche le numéro le plus élevé de l'année pour cette entreprise
  const { data } = await supabase
    .from('commandes')
    .select('numero_commande')
    .eq('entreprise_id', entrepriseId)
    .like('numero_commande', `${prefixe}%`)
    .order('numero_commande', { ascending: false })
    .limit(1)
    .maybeSingle()

  let sequence = 1
  if (data?.numero_commande) {
    // Extrait la partie numérique : "CMD-2024-0042" → 42
    const partie = data.numero_commande.replace(prefixe, '')
    const dernier = parseInt(partie, 10)
    if (!isNaN(dernier)) sequence = dernier + 1
  }

  // Formate sur 4 chiffres minimum : 1 → "0001", 100 → "0100"
  const sequenceStr = sequence.toString().padStart(4, '0')
  return `${prefixe}${sequenceStr}`
}

Deno.serve(async (req) => {
  if (req.method === 'OPTIONS') {
    return new Response('ok', { headers: corsHeaders })
  }

  try {
    const {
      entreprise_id,
      boutique_id,
      client_nom,
      client_telephone,
      client_adresse,
      lignes,
      total,
      notes,
      frais_livraison,
      livraison_incluse,
    } = await req.json()

    // Validation basique
    if (!entreprise_id || !boutique_id || !client_nom || !client_telephone || !lignes?.length) {
      return jsonResponse({ error: 'Données manquantes.' }, 400)
    }

    // Utilise la service role key pour bypasser le RLS
    const supabase = createClient(
      Deno.env.get('SUPABASE_URL')!,
      Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!
    )

    // Vérifie que la boutique existe et est active
    const { data: boutique, error: boutiqueError } = await supabase
      .from('boutiques')
      .select('id, actif, entreprise_id')
      .eq('id', boutique_id)
      .eq('actif', true)
      .maybeSingle()

    if (boutiqueError || !boutique) {
      return jsonResponse({ error: 'Boutique introuvable ou inactive.' }, 404)
    }

    // Génère le numéro de commande unique
    const numero_commande = await genererNumeroCommande(supabase, entreprise_id)

    // Insère la commande avec le numéro
    const { data, error } = await supabase
      .from('commandes')
      .insert([{
        entreprise_id,
        boutique_id,
        numero_commande,
        client_nom: String(client_nom).trim(),
        client_telephone: String(client_telephone).trim(),
        client_adresse: client_adresse ? String(client_adresse).trim() : null,
        lignes,
        total: Number(total) || 0,
        notes: notes ? String(notes).trim() : null,
        frais_livraison: Number(frais_livraison) || 0,
        livraison_incluse: Boolean(livraison_incluse),
        statut: 'en_attente',
      }])
      .select()
      .single()

    if (error) {
      return jsonResponse({ error: error.message }, 500)
    }

    return jsonResponse({ success: true, commande: data })

  } catch (err) {
    return jsonResponse({ error: err instanceof Error ? err.message : 'Erreur interne.' }, 500)
  }
})
