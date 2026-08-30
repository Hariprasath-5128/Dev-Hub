import React, { useRef, useState, useEffect } from 'react';
import axios from 'axios';
import { motion, AnimatePresence } from 'framer-motion';
import { MessageSquare, X, Send, Loader2, ShieldAlert, Sparkles, ListChecks } from 'lucide-react';

const API_BASE = '/api';

/**
 * Floating chat widget backed by the NLP/Chatbot Agent (/api/chat).
 * RBAC is enforced server-side: a patient is always answered about their own
 * data (patientId omitted from the request), while a doctor/admin must pass
 * the patientId of whichever patient they're asking about.
 *
 * @param {string|null} patientId - required for doctor/admin; omit for a patient asking about themselves.
 * @param {boolean} hasToken - whether this session has a real RBAC session token.
 * @param {string} label - button/header label, e.g. "Ask about Nisha G".
 */
export default function ChatWidget({ patientId = null, hasToken = true, label = 'VitalsGuard Assistant' }) {
  const [open, setOpen] = useState(false);
  const [messages, setMessages] = useState([]);
  const [input, setInput] = useState('');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  const [useAi, setUseAi] = useState(true);
  const scrollRef = useRef(null);

  useEffect(() => {
    if (scrollRef.current) {
      scrollRef.current.scrollTop = scrollRef.current.scrollHeight;
    }
  }, [messages, loading, open]);

  async function sendMessage(e) {
    e?.preventDefault();
    const text = input.trim();
    if (!text || loading) return;

    setError('');
    setMessages((prev) => [...prev, { role: 'user', text }]);
    setInput('');
    setLoading(true);

    try {
      const res = await axios.post(`${API_BASE}/chat`, {
        message: text,
        use_ai: useAi,
        ...(patientId ? { patient_id: patientId } : {}),
      });
      setMessages((prev) => [...prev, {
        role: 'assistant', text: res.data.answer, sources: res.data.sources, mode: res.data.mode,
      }]);
    } catch (err) {
      const status = err.response?.status;
      const detail = status === 401
        ? 'Your session has expired or is missing its login token. Please log out and log back in to keep using the assistant.'
        : (err.response?.data?.detail || err.message || 'Something went wrong.');
      setError(detail);
      setMessages((prev) => [...prev, { role: 'error', text: detail }]);
    } finally {
      setLoading(false);
    }
  }

  return (
    <>
      <motion.button
        onClick={() => setOpen((v) => !v)}
        whileTap={{ scale: 0.95 }}
        style={{
          position: 'fixed', bottom: 24, right: 24, zIndex: 1000,
          width: 56, height: 56, borderRadius: '50%', border: 'none',
          background: 'linear-gradient(135deg, #4f8ef7, #7b5cf0)',
          color: '#fff', display: 'flex', alignItems: 'center', justifyContent: 'center',
          boxShadow: '0 8px 24px rgba(79,142,247,0.4)', cursor: 'pointer',
        }}
        aria-label="Open chat assistant"
      >
        {open ? <X size={22} /> : <MessageSquare size={22} />}
      </motion.button>

      <AnimatePresence>
        {open && (
          <motion.div
            initial={{ opacity: 0, y: 20, scale: 0.97 }}
            animate={{ opacity: 1, y: 0, scale: 1 }}
            exit={{ opacity: 0, y: 20, scale: 0.97 }}
            style={{
              position: 'fixed', bottom: 92, right: 24, zIndex: 1000,
              width: 360, maxWidth: 'calc(100vw - 48px)', height: 480,
              background: '#fff', borderRadius: 18, boxShadow: '0 16px 48px rgba(20,30,60,0.25)',
              display: 'flex', flexDirection: 'column', overflow: 'hidden',
              border: '1px solid rgba(79,142,247,0.15)',
            }}
          >
            <div style={{
              padding: '14px 16px', background: 'linear-gradient(135deg, #4f8ef7, #7b5cf0)',
              color: '#fff', display: 'flex', alignItems: 'center', justifyContent: 'space-between', gap: 8,
            }}>
              <span style={{ fontWeight: 700, fontSize: 14 }}>{label}</span>
              <button
                type="button"
                onClick={() => setUseAi((v) => !v)}
                title={useAi ? 'Using AI agents — click to switch to rule-based (no LLM) answers' : 'Using rule-based answers (no LLM) — click to switch back to AI'}
                style={{
                  display: 'flex', alignItems: 'center', gap: 5, fontSize: 11, fontWeight: 700,
                  background: 'rgba(255,255,255,0.18)', border: 'none', borderRadius: 999,
                  padding: '5px 10px', color: '#fff', cursor: 'pointer', flexShrink: 0,
                }}
              >
                {useAi ? <Sparkles size={12} /> : <ListChecks size={12} />}
                {useAi ? 'AI' : 'Rule-based'}
              </button>
            </div>

            <div ref={scrollRef} style={{ flex: 1, overflowY: 'auto', padding: 14, display: 'flex', flexDirection: 'column', gap: 10 }}>
              {!hasToken && (
                <div style={{ background: '#fff3f0', color: '#b3401f', padding: 10, borderRadius: 10, fontSize: 12.5, display: 'flex', gap: 8, alignItems: 'flex-start' }}>
                  <ShieldAlert size={16} style={{ flexShrink: 0, marginTop: 1 }} />
                  <span>This demo session isn't signed in against the backend, so the assistant can't verify who you are yet. Log in normally to use it.</span>
                </div>
              )}

              {messages.length === 0 && hasToken && (
                <div style={{ color: '#7c8aa5', fontSize: 13, textAlign: 'center', marginTop: 20 }}>
                  Ask about your latest vitals, a recent reading, or a medical term — answers are grounded in your own data only.
                </div>
              )}

              {messages.map((m, i) => (
                <div key={i} style={{ alignSelf: m.role === 'user' ? 'flex-end' : 'flex-start', maxWidth: '85%' }}>
                  <div
                    style={{
                      background: m.role === 'user' ? '#4f8ef7' : m.role === 'error' ? '#fdecea' : '#f1f4fa',
                      color: m.role === 'user' ? '#fff' : m.role === 'error' ? '#c0392b' : '#22415f',
                      padding: '9px 12px', borderRadius: 12, fontSize: 13.5, lineHeight: 1.4,
                    }}
                  >
                    {m.text}
                  </div>
                  {m.role === 'assistant' && m.mode === 'rule_based' && (
                    <div style={{ display: 'flex', alignItems: 'center', gap: 4, fontSize: 10.5, color: '#94a3b8', marginTop: 3, marginLeft: 2 }}>
                      <ListChecks size={11} /> answered without AI
                    </div>
                  )}
                </div>
              ))}

              {loading && (
                <div style={{ alignSelf: 'flex-start', display: 'flex', alignItems: 'center', gap: 6, color: '#7c8aa5', fontSize: 12.5 }}>
                  <Loader2 size={14} className="animate-spin" style={{ animation: 'spin 1s linear infinite' }} />
                  Thinking…
                </div>
              )}
            </div>

            <form onSubmit={sendMessage} style={{ display: 'flex', gap: 8, padding: 12, borderTop: '1px solid #eef1f6' }}>
              <input
                value={input}
                onChange={(e) => setInput(e.target.value)}
                disabled={!hasToken || loading}
                placeholder={hasToken ? 'Ask a question…' : 'Sign in to chat'}
                style={{
                  flex: 1, border: '1px solid #dfe6f2', borderRadius: 10, padding: '9px 12px',
                  fontSize: 13.5, outline: 'none', color: '#22415f',
                }}
              />
              <button
                type="submit"
                disabled={!hasToken || loading || !input.trim()}
                style={{
                  width: 38, height: 38, borderRadius: 10, border: 'none',
                  background: (!hasToken || loading || !input.trim()) ? '#c9d4e6' : '#4f8ef7',
                  color: '#fff', display: 'flex', alignItems: 'center', justifyContent: 'center',
                  cursor: (!hasToken || loading || !input.trim()) ? 'not-allowed' : 'pointer',
                }}
                aria-label="Send"
              >
                <Send size={16} />
              </button>
            </form>
          </motion.div>
        )}
      </AnimatePresence>
    </>
  );
}
