// This component displays the Volunteer Guide chatbot.
import { useEffect, useState } from 'react';
import { Bot, Send, Sparkles, X } from 'lucide-react';
import { Link } from 'react-router-dom';
import { api } from '../lib/api.js';

// Manage the chat window, messages, onboarding, and backend requests.
export default function Chatbot() {
  const [open, setOpen] = useState(false);
  const [message, setMessage] = useState('');
  const [busy, setBusy] = useState(false);
  const [messages, setMessages] = useState([{ from: 'bot', text: 'Namaste! I can help with current Volunteer Nepal opportunities and general volunteering guidance. What would you like to know?' }]);

  // Show onboarding guidance immediately after registration.
  useEffect(() => {
    // Read the saved onboarding response and place it in the chat window.
    function showOnboarding(event) {
      let onboarding = event?.detail;
      if (!onboarding) {
        try {
          onboarding = JSON.parse(sessionStorage.getItem('volunterr_onboarding') || 'null');
        } catch {
          onboarding = null;
        }
      }
      if (!onboarding?.welcome) return;

      setMessages([{
        from: 'bot',
        text: `${onboarding.welcome}\n\n${onboarding.guidance}\n\nHere are three useful next steps:`,
        nextSteps: onboarding.nextSteps || [],
        ai: onboarding.poweredByAI
      }]);
      setOpen(true);
      sessionStorage.removeItem('volunterr_onboarding');
    }

    window.addEventListener('volunterr:onboarding', showOnboarding);
    showOnboarding();
    return () => window.removeEventListener('volunterr:onboarding', showOnboarding);
  }, []);

  // Allow dashboard links to open the chatbot.
  useEffect(() => {
    const openChatbot = () => setOpen(true);
    window.addEventListener('volunterr:chatbot-open', openChatbot);
    return () => window.removeEventListener('volunterr:chatbot-open', openChatbot);
  }, []);

  // Send the message and recent conversation to the backend chatbot.
  async function submit(event) {
    event.preventDefault();
    const text = message.trim();
    if (!text || busy) return;
    // Show the user's message immediately while the backend is working.
    setMessages((items) => [...items, { from: 'user', text }]);
    setMessage('');
    setBusy(true);
    try {
      // Send only six recent messages so follow-up questions have context.
      const history = messages.slice(-6).map((item) => ({
        role: item.from === 'bot' ? 'assistant' : 'user',
        content: [
          item.text,
          item.suggestions?.length ? `Opportunities shown: ${item.suggestions.map((suggestion) => suggestion.title).join(', ')}` : ''
        ].filter(Boolean).join('\n')
      }));
      // The backend safely combines MongoDB facts with volunteering guidance.
      const data = await api('/ai/chat', { method: 'POST', body: { message: text, history } });
      setMessages((items) => [...items, { from: 'bot', text: data.answer, ai: data.poweredByAI, suggestions: data.suggestions || [] }]);
    } catch (error) {
      // Display network or API errors as a normal chatbot message.
      setMessages((items) => [...items, { from: 'bot', text: error.message }]);
    } finally { setBusy(false); }
  }

  return (
    <>
      {open && <section className="chat-panel" aria-label="Volunteer assistant">
        <header><div><span className="chat-avatar"><Sparkles size={17} /></span><div><strong>Volunteer guide</strong><small>Here to help</small></div></div><button onClick={() => setOpen(false)}><X size={19} /></button></header>
        <div className="chat-messages">
          {messages.map((item, index) => <div key={index} className={`chat-message ${item.from}`}>
            <span>{item.text}</span>
            {item.suggestions?.length > 0 && <div className="chat-suggestions">
              {item.suggestions.map((suggestion) => <Link key={suggestion._id} to={`/opportunities/${suggestion._id}`} onClick={() => setOpen(false)}>
                <strong>{suggestion.title}</strong>
                <small>{suggestion.location}</small>
                <em>{suggestion.reason}</em>
              </Link>)}
            </div>}
            {item.nextSteps?.length > 0 && <div className="chat-suggestions">
              {item.nextSteps.map((step, stepIndex) => step.to
                ? <Link key={step.title} to={step.to} onClick={() => setOpen(false)}>
                  <strong>{stepIndex + 1}. {step.title}</strong>
                  <small>{step.detail}</small>
                </Link>
                : <div className="chat-step" key={step.title}>
                  <strong>{stepIndex + 1}. {step.title}</strong>
                  <small>{step.detail}</small>
                </div>)}
            </div>}
          </div>)}
          {busy && <div className="chat-message bot typing">Thinking<span>...</span></div>}
        </div>
        <form onSubmit={submit}><input value={message} onChange={(e) => setMessage(e.target.value)} placeholder="Ask about volunteering..." /><button disabled={busy} aria-label="Send"><Send size={18} /></button></form>
      </section>}
      <button className="chat-trigger" onClick={() => setOpen(!open)} aria-label="Open volunteer assistant">{open ? <X /> : <Bot />}</button>
    </>
  );
}
