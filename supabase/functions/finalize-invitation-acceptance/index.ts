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

function buildDisplayName(email: string) {
  if (!email) return 'Utilisateur'
  return email.split('@')[0]
}

Deno.serve(async (req) => {
  try {
    if (req.method === 'OPTIONS') {
      return new Response('ok', { headers: corsHeaders })
    }

    const { invitation_token, user_id, email } = await req.json()

    if (!invitation_token || !user_id || !email) {
      return jsonResponse(
        {
          error: 'PARAMS_MISSING',
          message: "Le token d'invitation, l'user_id et l'email sont obligatoires.",
        },
        400
      )
    }

    const supabaseAdmin = createClient(
      Deno.env.get('SUPABASE_URL')!,
      Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!
    )

    const cleanEmail = String(email).trim().toLowerCase()

    const { data: invitation, error: invitationError } = await supabaseAdmin
      .from('invitations_entreprise')
      .select('*')
      .eq('token', invitation_token)
      .order('created_at', { ascending: false })
      .limit(1)
      .maybeSingle()

    if (invitationError) {
      return jsonResponse(
        {
          error: invitationError.message,
          message: "Impossible de charger l'invitation.",
        },
        400
      )
    }

    if (!invitation) {
      return jsonResponse(
        {
          error: 'INVITATION_NOT_FOUND',
          message: 'Invitation introuvable.',
        },
        404
      )
    }

    if (String(invitation.email || '').trim().toLowerCase() !== cleanEmail) {
      return jsonResponse(
        {
          error: 'EMAIL_MISMATCH',
          message: "L'email connecté ne correspond pas à l'email invité.",
        },
        400
      )
    }

    if (invitation.statut !== 'en_attente') {
      return jsonResponse(
        {
          error: 'INVITATION_NOT_AVAILABLE',
          message: "Cette invitation n'est plus disponible.",
        },
        400
      )
    }

    if (invitation.expire_at && new Date(invitation.expire_at).getTime() < Date.now()) {
      return jsonResponse(
        {
          error: 'INVITATION_EXPIRED',
          message: 'Cette invitation a expiré.',
        },
        400
      )
    }

    const nomComplet = buildDisplayName(cleanEmail)

    const { error: profileError } = await supabaseAdmin
      .from('profils')
      .upsert(
        {
          id: user_id,
          entreprise_id: invitation.entreprise_id,
          role: invitation.role,
          nom_complet: nomComplet,
          role_plateforme: null,
        },
        { onConflict: 'id' }
      )

    if (profileError) {
      return jsonResponse(
        {
          error: profileError.message,
          message: 'Erreur lors de la mise à jour du profil.',
        },
        400
      )
    }

    const { error: memberError } = await supabaseAdmin
      .from('membres_entreprise')
      .upsert(
        {
          entreprise_id: invitation.entreprise_id,
          user_id,
          role: invitation.role,
          statut: 'actif',
        },
        { onConflict: 'entreprise_id,user_id' }
      )

    if (memberError) {
      return jsonResponse(
        {
          error: memberError.message,
          message: "Erreur lors de l'ajout dans les membres d'entreprise.",
        },
        400
      )
    }

    const { error: invitationUpdateError } = await supabaseAdmin
      .from('invitations_entreprise')
      .update({ statut: 'acceptee' })
      .eq('id', invitation.id)

    if (invitationUpdateError) {
      return jsonResponse(
        {
          error: invitationUpdateError.message,
          message: "Erreur lors de la mise à jour du statut de l'invitation.",
        },
        400
      )
    }

    return jsonResponse({
      success: true,
      message: 'Compte activé avec succès.',
    })
  } catch (err) {
    return jsonResponse(
      {
        error: err instanceof Error ? err.message : 'Erreur interne',
        message: "Une erreur interne s'est produite pendant l'activation.",
      },
      500
    )
  }
})