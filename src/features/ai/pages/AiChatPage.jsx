import { useEffect, useRef, useState } from 'react';
import { useOutletContext } from 'react-router-dom';
import { clearConversationHistory, loadConversationHistory, saveMessage } from '../services/aiHistoryService';
import { askGroqAssistant } from '../services/aiGroqService';

const periodOptions = [
  { value: 'today', label: "Aujourd'hui" },
  { value: '7days', label: '7 derniers jours' },
  { value: '30days', label: '30 derniers jours' },
  { value: 'year', label: 'Cette année' },
];

const starterQuestions = [
  'Quel est mon produit le plus rentable ?',
  'Quel est mon bénéfice net ?',
  'Quels produits dois-je réapprovisionner ?',
  'Quels crédits sont à relancer ?',
  'Fais-moi une étude de marché sur les motos',
  'Comment augmenter mes ventes ?',
];

const WELCOME_MESSAGE = {
  role: 'assistant',
  text: "Bonjour 👋 Je suis votre assistant IA. Posez-moi une question sur vos ventes, produits, bénéfices, stocks, crédits — ou sur n'importe quel sujet business : étude de marché, stratégie, prix, etc.",
  isWelcome: true,
};

// ── Rendu Markdown léger (sans dépendance externe) ──────────────────────────
function renderMarkdown(text) {
  if (!text) return [];

  const lines = text.split('\n');
  const elements = [];
  let i = 0;

  while (i < lines.length) {
    const line = lines[i];

    // Titre ## ou ###
    if (/^#{2,3}\s/.test(line)) {
      const content = line.replace(/^#{2,3}\s/, '');
      elements.push(
        <p key={i} style={{ fontWeight: 700, fontSize: '15px', margin: '10px 0 4px' }}>
          {parseInline(content)}
        </p>
      );
      i++;
      continue;
    }

    // Titre #
    if (/^#\s/.test(line)) {
      const content = line.replace(/^#\s/, '');
      elements.push(
        <p key={i} style={{ fontWeight: 700, fontSize: '16px', margin: '12px 0 4px' }}>
          {parseInline(content)}
        </p>
      );
      i++;
      continue;
    }

    // Liste à puces (* ou - ou •)
    if (/^[\*\-•]\s/.test(line)) {
      const items = [];
      while (i < lines.length && /^[\*\-•]\s/.test(lines[i])) {
        items.push(lines[i].replace(/^[\*\-•]\s/, ''));
        i++;
      }
      elements.push(
        <ul key={`ul-${i}`} style={{ paddingLeft: '20px', margin: '6px 0' }}>
          {items.map((item, idx) => (
            <li key={idx} style={{ marginBottom: '4px' }}>
              {parseInline(item)}
            </li>
          ))}
        </ul>
      );
      continue;
    }

    // Liste numérotée (1. 2. etc.)
    if (/^\d+\.\s/.test(line)) {
      const items = [];
      while (i < lines.length && /^\d+\.\s/.test(lines[i])) {
        items.push(lines[i].replace(/^\d+\.\s/, ''));
        i++;
      }
      elements.push(
        <ol key={`ol-${i}`} style={{ paddingLeft: '20px', margin: '6px 0' }}>
          {items.map((item, idx) => (
            <li key={idx} style={{ marginBottom: '4px' }}>
              {parseInline(item)}
            </li>
          ))}
        </ol>
      );
      continue;
    }

    // Ligne vide
    if (line.trim() === '') {
      elements.push(<div key={i} style={{ height: '6px' }} />);
      i++;
      continue;
    }

    // Paragraphe normal
    elements.push(
      <p key={i} style={{ margin: '2px 0', lineHeight: 1.7 }}>
        {parseInline(line)}
      </p>
    );
    i++;
  }

  return elements;
}

// Parse le gras (**texte**), l'italique (*texte*) et le code inline (`code`)
function parseInline(text) {
  const parts = [];
  // Regex qui capture **gras**, *italique*, `code`
  const regex = /(\*\*(.+?)\*\*|\*(.+?)\*|`(.+?)`)/g;
  let lastIndex = 0;
  let match;

  while ((match = regex.exec(text)) !== null) {
    // Texte avant le match
    if (match.index > lastIndex) {
      parts.push(text.slice(lastIndex, match.index));
    }

    if (match[0].startsWith('**')) {
      parts.push(<strong key={match.index}>{match[2]}</strong>);
    } else if (match[0].startsWith('*')) {
      parts.push(<em key={match.index}>{match[3]}</em>);
    } else if (match[0].startsWith('`')) {
      parts.push(
        <code
          key={match.index}
          style={{
            background: '#f0f2f5',
            borderRadius: '4px',
            padding: '1px 5px',
            fontFamily: 'monospace',
            fontSize: '13px',
          }}
        >
          {match[4]}
        </code>
      );
    }

    lastIndex = match.index + match[0].length;
  }

  // Reste du texte
  if (lastIndex < text.length) {
    parts.push(text.slice(lastIndex));
  }

  return parts.length === 1 && typeof parts[0] === 'string' ? parts[0] : parts;
}

// ── Keyframe pulse définie une seule fois hors du render ────────────────────
const PULSE_STYLE = `
  @keyframes ai-pulse {
    0%, 100% { transform: scale(1); opacity: 0.5; }
    50% { transform: scale(1.3); opacity: 1; }
  }
`;

// ── Composant bulle de message ───────────────────────────────────────────────
function MessageBubble({ message }) {
  const isUser = message.role === 'user';

  return (
    <div
      style={{
        display: 'flex',
        flexDirection: 'column',
        alignItems: isUser ? 'flex-end' : 'flex-start',
        gap: '4px',
      }}
    >
      <span
        style={{
          fontSize: '11px',
          fontWeight: 700,
          color: isUser ? '#6b7280' : '#7c3aed',
          paddingInline: '4px',
          letterSpacing: '0.3px',
        }}
      >
        {isUser ? 'Vous' : '✦ Assistant IA'}
      </span>

      <div
        style={{
          maxWidth: '88%',
          background: isUser ? '#1d1d1f' : '#ffffff',
          color: isUser ? '#ffffff' : '#111827',
          padding: '12px 16px',
          borderRadius: isUser ? '18px 18px 4px 18px' : '18px 18px 18px 4px',
          boxShadow: isUser ? 'none' : '0 2px 12px rgba(0,0,0,0.07)',
          border: isUser ? 'none' : '1px solid #e9ecef',
          fontSize: '14px',
          lineHeight: 1.7,
        }}
      >
        {isUser ? (
          <span style={{ whiteSpace: 'pre-wrap' }}>{message.text}</span>
        ) : (
          <div>{renderMarkdown(message.text)}</div>
        )}
      </div>

      {message.created_at ? (
        <span style={{ fontSize: '11px', color: '#9ca3af', paddingInline: '4px' }}>
          {new Date(message.created_at).toLocaleTimeString('fr-FR', {
            hour: '2-digit',
            minute: '2-digit',
          })}
        </span>
      ) : null}
    </div>
  );
}

// ── Page principale ──────────────────────────────────────────────────────────
export default function AiChatPage() {
  const { entreprise } = useOutletContext() || {};
  const entrepriseId = entreprise?.id || null;

  const [period, setPeriod] = useState('30days');
  const [input, setInput] = useState('');
  const [loading, setLoading] = useState(false);
  const [loadingHistory, setLoadingHistory] = useState(true);
  const [messages, setMessages] = useState([WELCOME_MESSAGE]);
  const [error, setError] = useState('');
  const [inputFocused, setInputFocused] = useState(false);

  const messagesEndRef = useRef(null);
  const textareaRef = useRef(null);

  // Charger l'historique au montage
  useEffect(() => {
    async function init() {
      setLoadingHistory(true);
      const history = await loadConversationHistory(100);
      if (history.length > 0) {
        setMessages([WELCOME_MESSAGE, ...history]);
      }
      setLoadingHistory(false);
    }
    init();
  }, []);

  // Scroll automatique
  useEffect(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, [messages, loading]);

  async function resetConversation() {
    await clearConversationHistory();
    setMessages([WELCOME_MESSAGE]);
    setInput('');
    setError('');
    textareaRef.current?.focus();
  }

  async function sendMessage(textToSend) {
    const content = String(textToSend || '').trim();
    if (!content || loading) return;

    setError('');

    const newUserMessage = { role: 'user', text: content, created_at: new Date().toISOString() };
    const nextMessages = [...messages, newUserMessage];
    setMessages(nextMessages);
    setInput('');
    setLoading(true);

    // Sauvegarder le message utilisateur en base
    saveMessage('user', content, entrepriseId);

    // Construire l'historique à envoyer à l'API (sans le message d'accueil)
    const historyForApi = nextMessages
      .filter((m) => !m.isWelcome)
      .map((m) => ({ role: m.role, text: m.text }));

    try {
      const answer = await askGroqAssistant(historyForApi, period);

      const assistantMessage = {
        role: 'assistant',
        text: answer,
        created_at: new Date().toISOString(),
      };

      setMessages((prev) => [...prev, assistantMessage]);

      // Sauvegarder la réponse en base
      saveMessage('assistant', answer, entrepriseId);
    } catch (err) {
      setError(err.message || 'Une erreur est survenue. Vérifiez votre connexion et réessayez.');
      setMessages(nextMessages.slice(0, -1));
    } finally {
      setLoading(false);
      textareaRef.current?.focus();
    }
  }

  function handleSubmit(e) {
    e.preventDefault();
    sendMessage(input);
  }

  function handleKeyDown(e) {
    if (e.key === 'Enter' && !e.shiftKey) {
      e.preventDefault();
      sendMessage(input);
    }
  }

  // Nombre de messages réels (sans le message d'accueil)
  const messageCount = messages.filter((m) => !m.isWelcome).length;

  return (
    <>
      <style>{PULSE_STYLE}</style>
      <section className="page-card">
        {/* En-tête */}
        <div
          className="section-head"
          style={{ alignItems: 'flex-start', gap: '16px', flexWrap: 'wrap' }}
        >
          <div>
            <h2>Assistant IA</h2>
            <p>
              Analysez vos données commerciales ou posez n'importe quelle question business :
              étude de marché, stratégie, prix, conseils, etc.
            </p>
          </div>

          <div style={{ display: 'flex', flexWrap: 'wrap', gap: '10px', alignItems: 'flex-end' }}>
            <div className="report-filter-box">
              <label>Période des données</label>
              <select
                value={period}
                onChange={(e) => setPeriod(e.target.value)}
                className="report-select"
                disabled={loading}
              >
                {periodOptions.map((opt) => (
                  <option key={opt.value} value={opt.value}>
                    {opt.label}
                  </option>
                ))}
              </select>
            </div>

            <button
              type="button"
              className="secondary-outline-btn"
              onClick={resetConversation}
              disabled={loading}
              title="Effacer tout l'historique et recommencer"
            >
              Nouvelle conversation
            </button>

            {messageCount > 0 ? (
              <span className="list-count-badge">
                {messageCount} message{messageCount !== 1 ? 's' : ''}
              </span>
            ) : null}
          </div>
        </div>

        {/* Questions suggérées */}
        <div style={{ marginBottom: '16px', display: 'flex', flexWrap: 'wrap', gap: '8px' }}>
          {starterQuestions.map((q) => (
            <button
              key={q}
              type="button"
              className="secondary-outline-btn"
              onClick={() => sendMessage(q)}
              disabled={loading || loadingHistory}
              style={{ borderRadius: '999px', fontSize: '13px' }}
            >
              {q}
            </button>
          ))}
        </div>

        {/* Zone de conversation */}
        <div
          style={{
            border: '1px solid #e4e7ec',
            borderRadius: '16px',
            padding: '20px',
            minHeight: '440px',
            maxHeight: '580px',
            overflowY: 'auto',
            background: '#f8fafc',
            display: 'flex',
            flexDirection: 'column',
            gap: '18px',
            marginBottom: '16px',
          }}
        >
          {loadingHistory ? (
            <div style={{ color: '#9ca3af', fontSize: '14px', textAlign: 'center', marginTop: '40px' }}>
              Chargement de l'historique...
            </div>
          ) : (
            <>
              {messages.map((message, index) => (
                <MessageBubble key={message.id || index} message={message} />
              ))}

              {loading ? (
                <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'flex-start', gap: '4px' }}>
                  <span style={{ fontSize: '11px', fontWeight: 700, color: '#7c3aed', paddingInline: '4px' }}>
                    ✦ Assistant IA
                  </span>
                  <div
                    style={{
                      background: '#ffffff',
                      padding: '12px 16px',
                      borderRadius: '18px 18px 18px 4px',
                      border: '1px solid #e9ecef',
                      display: 'flex',
                      gap: '6px',
                      alignItems: 'center',
                    }}
                  >
                    {[0, 1, 2].map((i) => (
                      <span
                        key={i}
                        style={{
                          width: '7px',
                          height: '7px',
                          borderRadius: '50%',
                          background: '#7c3aed',
                          display: 'inline-block',
                          animation: `ai-pulse 1.2s ease-in-out ${i * 0.2}s infinite`,
                          opacity: 0.7,
                        }}
                      />
                    ))}
                  </div>
                </div>
              ) : null}
            </>
          )}

          <div ref={messagesEndRef} />
        </div>

        {error ? (
          <p className="error-text" style={{ marginBottom: '12px' }}>
            {error}
          </p>
        ) : null}

        {/* Zone de saisie */}
        <form onSubmit={handleSubmit}>
          <div
            style={{
              border: `1.5px solid ${inputFocused ? '#7c3aed' : '#e4e7ec'}`,
              borderRadius: '16px',
              padding: '12px 14px',
              background: '#ffffff',
              display: 'flex',
              flexDirection: 'column',
              gap: '10px',
              transition: 'border-color 0.2s',
            }}
          >
            <textarea
              ref={textareaRef}
              rows="3"
              placeholder="Posez votre question... (Ex : Quel est mon bénéfice ce mois ? ou : Fais-moi une étude de marché sur les téléphones)"
              value={input}
              onChange={(e) => setInput(e.target.value)}
              onKeyDown={handleKeyDown}
              onFocus={() => setInputFocused(true)}
              onBlur={() => setInputFocused(false)}
              disabled={loading || loadingHistory}
              style={{
                width: '100%',
                border: 'none',
                outline: 'none',
                fontFamily: 'inherit',
                fontSize: '14px',
                lineHeight: 1.6,
                resize: 'none',
                background: 'transparent',
                color: '#111827',
              }}
            />

            <div
              style={{
                display: 'flex',
                justifyContent: 'space-between',
                alignItems: 'center',
                gap: '12px',
              }}
            >
              <span style={{ fontSize: '12px', color: '#9ca3af' }}>
                Entrée pour envoyer · Shift + Entrée pour sauter une ligne
              </span>

              <button
                className="primary-btn"
                type="submit"
                disabled={loading || loadingHistory || !input.trim()}
                style={{ minWidth: '90px' }}
              >
                {loading ? 'En cours...' : 'Envoyer ↵'}
              </button>
            </div>
          </div>
        </form>
      </section>
    </>
  );
}
