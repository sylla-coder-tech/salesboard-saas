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

    const { entreprise_id, email, role, redirectTo } = await req.json()

    if (!entreprise_id || !email || !role) {
      return jsonResponse(
        {
          step: 'validation',
          error: 'PARAMS_MISSING',
          message: 'Entreprise, email et rôle sont obligatoires.',
        },
        400
      )
    }

    const supabaseAdmin = createClient(
      Deno.env.get('PROJECT_URL')!,
      Deno.env.get('PROJECT_SERVICE_ROLE_KEY')!
    )

    const cleanEmail = String(email).trim().toLowerCase()
    const cleanRole = String(role).trim().toLowerCase()
    const token = crypto.randomUUID()

    // 1) Vérifier si email déjà utilisé dans auth
    const { data: existingUsers, error: listUsersError } =
      await supabaseAdmin.auth.admin.listUsers()

    if (listUsersError) {
      return jsonResponse(
        {
          step: 'list_users',
          error: listUsersError.message,
          message: "Impossible de vérifier si l'email existe déjà.",
        },
        500
      )
    }

    const alreadyUsed = (existingUsers?.users || []).some(
      (user) => String(user.email || '').toLowerCase() === cleanEmail
    )

    if (alreadyUsed) {
      return jsonResponse(
        {
          step: 'email_already_used',
          error: 'EMAIL_ALREADY_USED',
          message: 'Cet email est déjà utilisé par un compte existant.',
        },
        400
      )
    }

    // 2) Vérifier si une invitation active existe déjà
    const { data: existingInvitation, error: existingInvitationError } =
      await supabaseAdmin
        .from('invitations_entreprise')
        .select('*')
        .eq('entreprise_id', entreprise_id)
        .eq('email', cleanEmail)
        .eq('statut', 'en_attente')
        .maybeSingle()

    if (existingInvitationError) {
      return jsonResponse(
        {
          step: 'check_existing_invitation',
          error: existingInvitationError.message,
          message: "Impossible de vérifier les invitations existantes.",
        },
        500
      )
    }

    if (existingInvitation) {
      return jsonResponse(
        {
          step: 'invitation_already_exists',
          error: 'INVITATION_ALREADY_EXISTS',
          message:
            'Une invitation en attente existe déjà pour cet email. Supprimez-la ou attendez son expiration avant d’en envoyer une nouvelle.',
        },
        400
      )
    }

    // 3) Enregistrer d’abord l’invitation
    const invitationPayload = {
      entreprise_id,
      email: cleanEmail,
      role: cleanRole,
      token,
      statut: 'en_attente',
      expire_at: new Date(Date.now() + 7 * 24 * 60 * 60 * 1000).toISOString(),
      email_envoye: false,
      email_erreur: null,
    }

    const { data: invitationData, error: invitationError } = await supabaseAdmin
      .from('invitations_entreprise')
      .insert(invitationPayload)
      .select()
      .single()

    if (invitationError) {
      return jsonResponse(
        {
          step: 'insert_invitation',
          error: invitationError.message,
          details: invitationError.details,
          hint: invitationError.hint,
          code: invitationError.code,
          message: "Impossible d'enregistrer l'invitation.",
        },
        400
      )
    }

    // 4) Construire un redirectTo FIABLE avec le token métier
    const baseRedirect =
      redirectTo || 'http://localhost:5173/accept-invitation'

    const safeRedirectTo = baseRedirect.includes('?')
      ? `${baseRedirect}&token=${encodeURIComponent(token)}`
      : `${baseRedirect}?token=${encodeURIComponent(token)}`

    // 5) Tenter d’envoyer l’email
    const { error: inviteError } = await supabaseAdmin.auth.admin.inviteUserByEmail(
      cleanEmail,
      {
        redirectTo: safeRedirectTo,
        data: {
          entreprise_id,
          invited_role: cleanRole,
          invitation_token: token,
        },
      }
    )

    if (inviteError) {
      const lowerMessage = String(inviteError.message || '').toLowerCase()

      let friendlyMessage =
        "L'invitation a été enregistrée, mais l'email n'a pas pu être envoyé."

      if (lowerMessage.includes('rate limit')) {
        friendlyMessage =
          "Invitation enregistrée, mais l'email n'a pas pu être envoyé immédiatement à cause de la limite d'envoi. Réessayez plus tard ou utilisez le SMTP personnalisé."
      } else if (
        lowerMessage.includes('email address') ||
        lowerMessage.includes('invalid')
      ) {
        friendlyMessage = 'Adresse email invalide ou refusée par le système.'
      } else if (lowerMessage.includes('email rate limit exceeded')) {
        friendlyMessage =
          "Limite d'envoi d'emails atteinte sur le provider actuel."
      }

      await supabaseAdmin
        .from('invitations_entreprise')
        .update({
          email_envoye: false,
          email_erreur: inviteError.message,
        })
        .eq('id', invitationData.id)

      return jsonResponse(
        {
          step: 'invite_user_by_email',
          error: inviteError.message,
          message: friendlyMessage,
          invitation_saved: true,
          email_sent: false,
        },
        400
      )
    }

    // 6) Marquer l’email comme envoyé
    await supabaseAdmin
      .from('invitations_entreprise')
      .update({
        email_envoye: true,
        email_erreur: null,
      })
      .eq('id', invitationData.id)

    return jsonResponse({
      success: true,
      message: 'Invitation envoyée avec succès.',
      invitation_saved: true,
      email_sent: true,
      token,
      redirect_to_used: safeRedirectTo,
    })
  } catch (err) {
    return jsonResponse(
      {
        step: 'unexpected',
        error: err instanceof Error ? err.message : 'Erreur interne',
        message: "Une erreur interne s'est produite pendant l'envoi de l'invitation.",
      },
      500
    )
  }
})