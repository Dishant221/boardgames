import { useCallback, useEffect, useRef, useState } from 'react';
import { useParams, useNavigate, useSearchParams, Link } from 'react-router-dom';
import { Send, Phone, PhoneOff, Mic, MicOff, Plus, Trash2, Volume2, VolumeX } from 'lucide-react';
import AppShell from '../components/AppShell';
import { CardView } from '../components/Cards';
import { ErrorNote } from '../components/Section';
import { assistantApi, errorMessage } from '../utils/api';
import { useLocationStore } from '../store/locationStore';
import { useAuthStore } from '../store/authStore';
import { createRecognizer, speak, stopSpeaking, speechSupported, type SpeechRecognitionLike } from '../lib/speech';
import { miniMarkdown, fmtDate } from '../lib/format';
import type { ChatMessage, Conversation } from '../lib/types';

/**
 * Chat + Call. Both talk to the same /assistant/chat endpoint; call mode adds
 * browser speech recognition + synthesis and asks for shorter, speakable replies.
 */
export default function Assistant() {
  const { conversationId } = useParams<{ conversationId?: string }>();
  const [params, setParams] = useSearchParams();
  const navigate = useNavigate();
  const { position, locate } = useLocationStore();
  const prefs = useAuthStore((s) => s.preferences);

  const [convs, setConvs] = useState<Conversation[]>([]);
  const [messages, setMessages] = useState<ChatMessage[]>([]);
  const [input, setInput] = useState('');
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [provider, setProvider] = useState<string | null>(null);

  const [callMode, setCallMode] = useState(params.get('mode') === 'call');
  const [listening, setListening] = useState(false);
  const [speaking, setSpeaking] = useState(false);
  const [muted, setMuted] = useState(false);
  const [interim, setInterim] = useState('');
  const recognizer = useRef<SpeechRecognitionLike | null>(null);
  const bottom = useRef<HTMLDivElement>(null);
  const tripId = params.get('trip') ?? undefined;

  const refreshConvs = useCallback(() => {
    assistantApi.conversations().then((r) => setConvs(r.data.data)).catch(() => undefined);
  }, []);

  useEffect(() => {
    refreshConvs();
  }, [refreshConvs]);

  useEffect(() => {
    if (!conversationId) {
      setMessages([]);
      return;
    }
    assistantApi
      .conversation(conversationId)
      .then((r) => setMessages(r.data.data.messages))
      .catch((e) => setError(errorMessage(e)));
  }, [conversationId]);

  useEffect(() => {
    bottom.current?.scrollIntoView({ behavior: 'smooth' });
  }, [messages, busy]);

  const send = useCallback(
    async (text: string, mode: 'chat' | 'call' = callMode ? 'call' : 'chat') => {
      const t = text.trim();
      if (!t || busy) return;
      setBusy(true);
      setError(null);
      setInput('');
      const optimistic: ChatMessage = { id: `tmp_${Date.now()}`, conversation_id: conversationId ?? '', role: 'user', content: t, cards: null, created_at: new Date().toISOString(), pending: true };
      setMessages((m) => [...m, optimistic]);
      try {
        const loc = position ?? (await locate({ share: false })) ?? undefined;
        const r = await assistantApi.chat({ conversation_id: conversationId, message: t, mode, location: loc ? { lat: loc.lat, lng: loc.lng, accuracy_m: loc.accuracy_m } : undefined, trip_id: tripId });
        const data = r.data.data;
        setProvider(data.provider);
        setMessages((m) => [...m.filter((x) => x.id !== optimistic.id), data.message, data.reply]);
        if (!conversationId) {
          navigate(`/assistant/${data.conversation_id}${callMode ? '?mode=call' : ''}${tripId ? `${callMode ? '&' : '?'}trip=${tripId}` : ''}`, { replace: true });
        }
        refreshConvs();
        if (mode === 'call' && !muted) {
          setSpeaking(true);
          speak(data.reply.content, {
            lang: prefs?.language && prefs.language !== 'en' ? prefs.language : 'en-US',
            onend: () => {
              setSpeaking(false);
              if (callMode) startListening();
            }
          });
        }
      } catch (e) {
        setError(errorMessage(e));
        setMessages((m) => m.filter((x) => x.id !== optimistic.id));
      } finally {
        setBusy(false);
      }
    },
    // eslint-disable-next-line react-hooks/exhaustive-deps
    [busy, callMode, conversationId, position, locate, muted, navigate, prefs?.language, refreshConvs, tripId]
  );

  // Pre-filled question from ?q=
  useEffect(() => {
    const q = params.get('q');
    if (q && !conversationId && !busy) {
      params.delete('q');
      setParams(params, { replace: true });
      send(q, params.get('mode') === 'call' ? 'call' : 'chat');
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  // ---------------------------------------------------------------- voice
  const startListening = useCallback(() => {
    if (!speechSupported()) {
      setError('Voice is not supported in this browser. Try Chrome, Edge or Safari.');
      return;
    }
    stopSpeaking();
    setSpeaking(false);
    const r = createRecognizer(prefs?.language && prefs.language !== 'en' ? prefs.language : 'en-US');
    if (!r) return;
    recognizer.current = r;
    let finalText = '';
    r.onresult = (e) => {
      let interimText = '';
      for (let i = e.resultIndex; i < e.results.length; i++) {
        const res = e.results[i];
        if (res.isFinal) finalText += res[0].transcript;
        else interimText += res[0].transcript;
      }
      setInterim(interimText || finalText);
    };
    r.onend = () => {
      setListening(false);
      setInterim('');
      if (finalText.trim()) send(finalText, 'call');
    };
    r.onerror = (e) => {
      setListening(false);
      if (e.error !== 'no-speech' && e.error !== 'aborted') setError(`Microphone: ${e.error}`);
    };
    try {
      r.start();
      setListening(true);
    } catch {
      setListening(false);
    }
  }, [prefs?.language, send]);

  const stopListening = () => {
    recognizer.current?.stop();
    setListening(false);
  };

  const toggleCall = () => {
    if (callMode) {
      stopListening();
      stopSpeaking();
      setSpeaking(false);
      setCallMode(false);
      params.delete('mode');
      setParams(params, { replace: true });
    } else {
      setCallMode(true);
      params.set('mode', 'call');
      setParams(params, { replace: true });
      if (messages.length === 0 && !muted) {
        setSpeaking(true);
        speak('Hello, I am your local guide. Where are you, and what do you need?', { onend: () => { setSpeaking(false); startListening(); } });
      } else startListening();
    }
  };

  useEffect(() => () => { stopSpeaking(); recognizer.current?.abort(); }, []);

  const newConversation = () => {
    stopSpeaking();
    navigate(`/assistant${callMode ? '?mode=call' : ''}`);
    setMessages([]);
  };

  const deleteConv = async (id: string) => {
    await assistantApi.deleteConversation(id);
    refreshConvs();
    if (id === conversationId) newConversation();
  };

  return (
    <AppShell dark={callMode}>
      <div className="grid gap-6 lg:grid-cols-[260px_1fr]">
        {/* Sidebar */}
        <aside className={`${callMode ? 'marble-dark' : 'marble'} hidden h-fit max-h-[75vh] overflow-y-auto p-3 lg:block`}>
          <button onClick={newConversation} className={`${callMode ? 'btn-gilt' : 'btn-ink'} mb-3 w-full`}>
            <Plus size={15} /> New conversation
          </button>
          <ul className="space-y-1">
            {convs.map((c) => (
              <li key={c.id} className="group flex items-center gap-1">
                <Link to={`/assistant/${c.id}${callMode ? '?mode=call' : ''}`} className={`flex-1 truncate rounded px-2 py-1.5 text-sm ${c.id === conversationId ? (callMode ? 'bg-gilt text-ink' : 'bg-terracotta text-ivory') : callMode ? 'hover:bg-ivory/10' : 'hover:bg-parchment'}`}>
                  {c.mode === 'call' ? '📞 ' : ''}{c.title}
                  <div className={`text-[10px] ${c.id === conversationId ? 'opacity-80' : 'opacity-60'}`}>{fmtDate(c.updated_at)}</div>
                </Link>
                <button onClick={() => deleteConv(c.id)} className="p-1 opacity-0 group-hover:opacity-70 hover:!opacity-100"><Trash2 size={13} /></button>
              </li>
            ))}
          </ul>
        </aside>

        {/* Conversation */}
        <section className={`${callMode ? 'marble-dark' : 'marble'} flex min-h-[70vh] flex-col`}>
          <header className={`flex flex-wrap items-center gap-2 border-b px-4 py-3 ${callMode ? 'border-gilt/20' : 'border-umber/10'}`}>
            <div>
              <div className="small-caps text-xs text-gold">{callMode ? 'Call mode' : 'Chat'}</div>
              <h2 className="font-serif text-xl font-semibold">Your local guide</h2>
            </div>
            <div className="ml-auto flex items-center gap-2">
              {provider && <span className={`hidden sm:inline text-[10px] ${callMode ? 'text-ivory/50' : 'text-umber/60'}`}>via {provider}</span>}
              {callMode && (
                <button onClick={() => { setMuted((m) => !m); stopSpeaking(); }} className="btn-ghost !border-gilt/40 !text-ivory" title={muted ? 'Unmute voice' : 'Mute voice'}>
                  {muted ? <VolumeX size={15} /> : <Volume2 size={15} />}
                </button>
              )}
              <button onClick={toggleCall} className={callMode ? 'btn-primary' : 'btn-gilt'}>
                {callMode ? <><PhoneOff size={15} /> Hang up</> : <><Phone size={15} /> Call the guide</>}
              </button>
            </div>
          </header>

          {callMode && (
            <div className="flex flex-col items-center gap-3 border-b border-gilt/20 px-4 py-6">
              <button onClick={listening ? stopListening : startListening} className={`orb grid h-32 w-32 place-items-center rounded-full ${listening ? 'orb-listening' : speaking ? 'orb-speaking' : ''}`} aria-label={listening ? 'Stop listening' : 'Start listening'}>
                {listening ? <Mic size={36} className="text-ivory drop-shadow" /> : <MicOff size={32} className="text-ivory/80" />}
              </button>
              <div className="font-serif text-lg text-ivory/90">
                {listening ? interim || 'Listening…' : speaking ? 'Speaking…' : busy ? 'Thinking…' : 'Tap the orb and speak'}
              </div>
              <p className="max-w-md text-center text-xs text-ivory/50">Voice runs in your browser (Web Speech API). Replies are short and spoken aloud; the cards below stay for reference.</p>
            </div>
          )}

          <div className="flex-1 space-y-5 overflow-y-auto px-4 py-4">
            {messages.length === 0 && !busy && (
              <div className={`mx-auto max-w-lg py-10 text-center font-serif ${callMode ? 'text-ivory/80' : 'text-umber'}`}>
                <p className="text-2xl">Ask me like you would ask a friend who lives here.</p>
                <p className="mt-2 text-sm opacity-80">“Where can I eat well nearby without tourists?” · “How do I get to the station?” · “Is the museum open on Monday?” · “Plan my afternoon.”</p>
                <div className="mt-5 flex flex-wrap justify-center gap-2">
                  {['What is worth seeing within 10 minutes walk?', 'Best local breakfast near me', 'I need a pharmacy', 'Cheap flights to Rome next weekend'].map((s) => (
                    <button key={s} onClick={() => send(s)} className={`chip ${callMode ? '!border-gilt/40 !bg-transparent !text-ivory/80' : ''}`}>{s}</button>
                  ))}
                </div>
              </div>
            )}
            {messages.map((m) => (
              <Message key={m.id} m={m} dark={callMode} />
            ))}
            {busy && (
              <div className={`flex items-center gap-2 text-sm ${callMode ? 'text-ivory/70' : 'text-umber/70'}`}>
                <span className="h-2 w-2 animate-bounce rounded-full bg-gilt" />
                <span className="h-2 w-2 animate-bounce rounded-full bg-gilt [animation-delay:.15s]" />
                <span className="h-2 w-2 animate-bounce rounded-full bg-gilt [animation-delay:.3s]" />
                <span className="ml-1 font-serif italic">consulting maps, weather and local knowledge…</span>
              </div>
            )}
            <div ref={bottom} />
          </div>

          <ErrorNote message={error} onClose={() => setError(null)} />

          <form
            onSubmit={(e) => {
              e.preventDefault();
              send(input);
            }}
            className={`flex gap-2 border-t p-3 ${callMode ? 'border-gilt/20' : 'border-umber/10'}`}
          >
            <input value={input} onChange={(e) => setInput(e.target.value)} className="input flex-1" placeholder={callMode ? 'Or type instead of speaking…' : 'Ask about food, sights, directions, safety, bookings…'} disabled={busy} />
            <button disabled={busy || !input.trim()} className={callMode ? 'btn-gilt' : 'btn-primary'}>
              <Send size={15} />
            </button>
          </form>
        </section>
      </div>
    </AppShell>
  );
}

function Message({ m, dark }: { m: ChatMessage; dark: boolean }) {
  const isUser = m.role === 'user';
  return (
    <div className={`flex ${isUser ? 'justify-end' : 'justify-start'}`}>
      <div className={`max-w-[92%] sm:max-w-[80%] ${isUser ? '' : 'w-full'}`}>
        <div
          className={`rounded-xl px-4 py-3 text-[15px] leading-relaxed shadow-card ${
            isUser ? (dark ? 'bg-gilt text-ink' : 'bg-terracotta text-ivory') : dark ? 'bg-ivory/10 text-ivory' : 'bg-ivory text-ink border border-parchment'
          } ${m.pending ? 'opacity-60' : ''}`}
        >
          {isUser ? <p>{m.content}</p> : <div className="prose-gt" dangerouslySetInnerHTML={{ __html: miniMarkdown(m.content) }} />}
        </div>
        {m.cards && m.cards.length > 0 && (
          <div className={`mt-3 space-y-3 ${dark ? 'rounded-xl bg-ivory p-3 text-ink' : ''}`}>
            {m.cards.map((c, i) => (
              <CardView key={i} card={c} />
            ))}
          </div>
        )}
      </div>
    </div>
  );
}
