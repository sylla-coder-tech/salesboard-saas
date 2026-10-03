import { supabase } from '../../../lib/supabaseClient';

/**
 * Charge les N derniers messages de l'utilisateur courant.
 * @param {number} limit - Nombre de messages à charger (défaut 100)
 */
export async function loadConversationHistory(limit = 100) {
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) return [];

  const { data, error } = await supabase
    .from('ai_conversations')
    .select('id, role, content, created_at')
    .eq('user_id', user.id)
    .order('created_at', { ascending: true })
    .limit(limit);

  if (error) {
    console.error('Erreur chargement historique IA :', error.message);
    return [];
  }

  return (data || []).map((row) => ({
    id: row.id,
    role: row.role,
    text: row.content,
    created_at: row.created_at,
  }));
}

/**
 * Sauvegarde un message en base.
 * @param {'user'|'assistant'} role
 * @param {string} content
 * @param {string} entrepriseId - ID de l'entreprise (passé en paramètre pour éviter un appel réseau)
 */
export async function saveMessage(role, content, entrepriseId) {
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) return null;

  // entrepriseId est passé depuis l'appelant (AiChatPage) pour éviter
  // de rappeler getMyProfile() à chaque message envoyé.
  if (!entrepriseId) return null;

  const { data, error } = await supabase
    .from('ai_conversations')
    .insert({
      user_id: user.id,
      entreprise_id: entrepriseId,
      role,
      content,
    })
    .select('id')
    .single();

  if (error) {
    console.error('Erreur sauvegarde message IA :', error.message);
    return null;
  }

  return data?.id || null;
}

/**
 * Supprime tout l'historique de l'utilisateur courant.
 */
export async function clearConversationHistory() {
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) return;

  const { error } = await supabase
    .from('ai_conversations')
    .delete()
    .eq('user_id', user.id);

  if (error) {
    console.error('Erreur suppression historique IA :', error.message);
  }
}
