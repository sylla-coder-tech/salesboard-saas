import { useEffect, useRef, useState } from 'react';
import { askCommercialAssistant } from '../services/aiChatService';

const periodOptions = [
  { value: 'today', label: "Aujourd'hui" },
  { value: 'yesterday', label: 'Hier' },
  { value: '7days', label: '7 derniers jours' },
  { value: '30days', label: '30 derniers jours' },
  { value: 'year', label: 'Cette année' },
];

const starterQuestions = [
  'Quel est mon produit le plus rentable ?',
  'Quel est le bénéfice réalisé ?',
  'Quel est mon chiffre d’affaires ?',
  'Quels produits dois-je réapprovisionner ?',
  'Quels crédits sont à relancer ?',
  'Fais moi la liste des produits vendus hier',
];

const initialMessages = [
  {
    role: 'assistant',
    text:
      "Bonjour. Je suis votre assistant commercial. Posez-moi une question sur vos ventes, produits, bénéfices, stocks, crédits, dépenses ou performances.",
  },
];

export default function AiChatPage() {
  const [period, setPeriod] = useState('30days');
  const [input, setInput] = useState('');
  const [loading, setLoading] = useState(false);
  const [messages, setMessages] = useState(initialMessages);

  const messagesEndRef = useRef(null);
  const textareaRef = useRef(null);

  useEffect(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, [messages, loading]);

  function resetConversation() {
    setMessages(initialMessages);
    setInput('');
    textareaRef.current?.focus();
  }

  async function sendMessage(textToSend) {
    const content = String(textToSend || '').trim();
    if (!content || loading) return;

    const nextMessages = [...messages, { role: 'user', text: content }];
    setMessages(nextMessages);
    setInput('');
    setLoading(true);

    try {
      const result = await askCommercialAssistant(content, period);

      setMessages([
        ...nextMessages,
        {
          role: 'assistant',
          text: result.answer,
        },
      ]);
    } catch (err) {
      setMessages([
        ...nextMessages,
        {
          role: 'assistant',
          text:
            err.message ||
            "Une erreur est survenue pendant l’analyse de votre demande.",
        },
      ]);
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

  return (
    <section className="page-card">
      <div className="section-head" style={{ alignItems: 'flex-start', gap: '16px' }}>
        <div>
          <h2>Assistant IA Commercial</h2>
          <p>
            Discutez directement avec votre assistant pour analyser vos ventes,
            bénéfices, produits, crédits, stocks et performances commerciales.
          </p>
        </div>

        <div
          style={{
            display: 'flex',
            flexWrap: 'wrap',
            gap: '12px',
            alignItems: 'end',
          }}
        >
          <div className="report-filter-box">
            <label>Période</label>
            <select
              value={period}
              onChange={(e) => setPeriod(e.target.value)}
              className="report-select"
              disabled={loading}
            >
              {periodOptions.map((option) => (
                <option key={option.value} value={option.value}>
                  {option.label}
                </option>
              ))}
            </select>
          </div>

          <button
            type="button"
            className="secondary-outline-btn"
            onClick={resetConversation}
            disabled={loading}
          >
            Vider la conversation
          </button>
        </div>
      </div>

      <div
        style={{
          marginBottom: '18px',
          display: 'flex',
          flexWrap: 'wrap',
          gap: '10px',
        }}
      >
        {starterQuestions.map((question) => (
          <button
            key={question}
            type="button"
            className="secondary-outline-btn"
            onClick={() => sendMessage(question)}
            disabled={loading}
            style={{
              borderRadius: '999px',
            }}
          >
            {question}
          </button>
        ))}
      </div>

      <div
        style={{
          border: '1px solid #e4e7ec',
          borderRadius: '20px',
          padding: '18px',
          minHeight: '420px',
          maxHeight: '580px',
          overflowY: 'auto',
          background: 'linear-gradient(180deg, #f8fafc 0%, #f9fafb 100%)',
          display: 'flex',
          flexDirection: 'column',
          gap: '16px',
          marginBottom: '18px',
        }}
      >
        {messages.map((message, index) => {
          const isUser = message.role === 'user';

          return (
            <div
              key={index}
              style={{
                display: 'flex',
                flexDirection: 'column',
                alignItems: isUser ? 'flex-end' : 'flex-start',
                gap: '6px',
              }}
            >
              <span
                style={{
                  fontSize: '12px',
                  fontWeight: 700,
                  color: isUser ? '#344054' : '#667085',
                  paddingInline: '6px',
                }}
              >
                {isUser ? 'Vous' : 'Assistant'}
              </span>

              <div
                style={{
                  maxWidth: '85%',
                  background: isUser ? '#111827' : '#ffffff',
                  color: isUser ? '#ffffff' : '#101828',
                  padding: '14px 16px',
                  borderRadius: isUser
                    ? '18px 18px 6px 18px'
                    : '18px 18px 18px 6px',
                  boxShadow: isUser
                    ? 'none'
                    : '0 8px 24px rgba(16, 24, 40, 0.06)',
                  lineHeight: 1.7,
                  whiteSpace: 'pre-wrap',
                  border: isUser ? 'none' : '1px solid #eef2f6',
                }}
              >
                {message.text}
              </div>
            </div>
          );
        })}

        {loading ? (
          <div
            style={{
              display: 'flex',
              flexDirection: 'column',
              alignItems: 'flex-start',
              gap: '6px',
            }}
          >
            <span
              style={{
                fontSize: '12px',
                fontWeight: 700,
                color: '#667085',
                paddingInline: '6px',
              }}
            >
              Assistant
            </span>

            <div
              style={{
                background: '#ffffff',
                padding: '14px 16px',
                borderRadius: '18px 18px 18px 6px',
                boxShadow: '0 8px 24px rgba(16, 24, 40, 0.06)',
                border: '1px solid #eef2f6',
              }}
            >
              Analyse commerciale en cours...
            </div>
          </div>
        ) : null}

        <div ref={messagesEndRef} />
      </div>

      <form onSubmit={handleSubmit}>
        <div
          style={{
            border: '1px solid #e4e7ec',
            borderRadius: '18px',
            padding: '14px',
            background: '#ffffff',
          }}
        >
          <label
            style={{
              display: 'block',
              marginBottom: '10px',
              fontSize: '14px',
              fontWeight: 600,
              color: '#344054',
            }}
          >
            Votre question
          </label>

          <textarea
            ref={textareaRef}
            rows="4"
            placeholder="Ex : Quel bénéfice ai-je obtenu sur le produit moto ?"
            value={input}
            onChange={(e) => setInput(e.target.value)}
            onKeyDown={handleKeyDown}
            disabled={loading}
            style={{
              width: '100%',
              border: '1px solid #d0d5dd',
              borderRadius: '14px',
              padding: '14px',
              resize: 'vertical',
              outline: 'none',
              fontFamily: 'inherit',
              fontSize: '15px',
              lineHeight: 1.6,
              marginBottom: '14px',
              background: '#fcfcfd',
            }}
          />

          <div
            style={{
              display: 'flex',
              justifyContent: 'space-between',
              alignItems: 'center',
              gap: '12px',
              flexWrap: 'wrap',
            }}
          >
            <div
              style={{
                fontSize: '13px',
                color: '#667085',
              }}
            >
              Entrée pour envoyer · Shift + Entrée pour aller à la ligne
            </div>

            <button className="primary-btn" type="submit" disabled={loading}>
              {loading ? 'Analyse...' : 'Envoyer'}
            </button>
          </div>
        </div>
      </form>
    </section>
  );
}