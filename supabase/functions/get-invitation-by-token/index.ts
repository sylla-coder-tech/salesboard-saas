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

Deno.serve(async (req) => {
  try {
    if (req.method === 'OPTIONS') {
      return new Response('ok', { headers: corsHeaders })
    }

    const { token } = await req.json()

    if (!token) {
      return jsonResponse(
        {
          error: 'TOKEN_MISSING',
          message: "Le token d'invitation est obligatoire.",
        },
        400
      )
    }

    const supabaseAdmin = createClient(
      Deno.env.get('SUPABASE_URL')!,
      Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!
    )

    const { data, error } = await supabaseAdmin
      .from('invitations_entreprise')
      .select('id, email, role, statut, expire_at, entreprise_id, token, created_at')
      .eq('token', String(token).trim())
      .order('created_at', { ascending: false })
      .limit(1)
      .maybeSingle()

    if (error) {
      return jsonResponse(
        {
          error: error.message,
          message: "Impossible de charger l'invitation.",
        },
        400
      )
    }

    if (!data) {
      return jsonResponse(
        {
          error: 'INVITATION_NOT_FOUND',
          message: 'Invitation introuvable.',
        },
        404
      )
    }

    return jsonResponse({
      success: true,
      invitation: data,
    })
  } catch (err) {
    return jsonResponse(
      {
        error: err instanceof Error ? err.message : 'Erreur interne',
        message: "Une erreur interne s'est produite pendant le chargement de l'invitation.",
      },
      500
    )
  }
})