"use client";
import { useState, useRef, useEffect, useCallback } from "react";

/* ─── Helpers ─── */
const formatTime = () =>
  new Date().toLocaleTimeString("en-US", { hour: "2-digit", minute: "2-digit", second: "2-digit", hour12: false });
const formatDate = () =>
  new Date().toLocaleDateString("en-US", { weekday: "short", year: "numeric", month: "short", day: "numeric" });

/* ─── Voice Output ─── */
function speak(text, onEnd) {
  if (typeof window === "undefined" || !window.speechSynthesis) return;
  window.speechSynthesis.cancel();
  const clean = text.replace(/[*#_`>]/g, "").replace(/\n+/g, ". ");
  const utter = new SpeechSynthesisUtterance(clean);
  utter.rate = 0.92;
  utter.pitch = 0.85;
  utter.volume = 1;
  // Try to pick a deep/clear voice
  const voices = window.speechSynthesis.getVoices();
  const preferred = voices.find(v => /Google UK English Male|Daniel|Alex|en-GB/i.test(v.name));
  if (preferred) utter.voice = preferred;
  utter.onend = onEnd || null;
  window.speechSynthesis.speak(utter);
}

/* ─── Subcomponents ─── */
const HexGrid = () => (
  <svg style={{ position: "fixed", inset: 0, width: "100%", height: "100%", opacity: 0.03, pointerEvents: "none", zIndex: 0 }}>
    <defs>
      <pattern id="hex" x="0" y="0" width="56" height="48" patternUnits="userSpaceOnUse">
        <polygon points="28,2 54,16 54,40 28,54 2,40 2,16" fill="none" stroke="#00d4ff" strokeWidth="0.8" />
      </pattern>
    </defs>
    <rect width="100%" height="100%" fill="url(#hex)" />
  </svg>
);

const TypingDots = () => (
  <div style={{ display: "flex", gap: 5, alignItems: "center", padding: "10px 14px" }}>
    {[0, 1, 2].map(i => (
      <div key={i} style={{
        width: 7, height: 7, borderRadius: "50%", background: "#00d4ff",
        animation: `pulse 1.2s ease-in-out ${i * 0.2}s infinite`,
        boxShadow: "0 0 8px #00d4ff"
      }} />
    ))}
    <span style={{ color: "#00d4ff", fontSize: "0.7rem", marginLeft: 8, fontFamily: "monospace", letterSpacing: "0.12em" }}>
      ANALYZING...
    </span>
  </div>
);

const SUGGESTIONS = [
  "Give me today's tech brief",
  "Help with Article 43 content",
  "Draft a client proposal",
  "Upwork profile tips",
  "Automate my daily tasks",
];

/* ─── Main Component ─── */
export default function JarvisPage() {
  const [messages, setMessages] = useState([
    {
      role: "assistant",
      content: "Good day, Brian. J.A.R.V.I.S. online. All systems operational.\n\nI'm ready to assist — speak or type your command.",
    },
  ]);
  const [input, setInput] = useState("");
  const [loading, setLoading] = useState(false);
  const [time, setTime] = useState("00:00:00");
  const [voiceOn, setVoiceOn] = useState(true);
  const [listening, setListening] = useState(false);
  const [transcript, setTranscript] = useState("");
  const [speaking, setSpeaking] = useState(false);
  const [statusText, setStatusText] = useState("ALL SYSTEMS NOMINAL");

  const messagesEndRef = useRef(null);
  const inputRef = useRef(null);
  const recognitionRef = useRef(null);

  // Clock
  useEffect(() => {
    setTime(formatTime());
    const t = setInterval(() => setTime(formatTime()), 1000);
    return () => clearInterval(t);
  }, []);

  // Scroll to bottom
  useEffect(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: "smooth" });
  }, [messages, loading]);

  // Init voices
  useEffect(() => {
    if (typeof window !== "undefined" && window.speechSynthesis) {
      window.speechSynthesis.getVoices();
      window.speechSynthesis.onvoiceschanged = () => window.speechSynthesis.getVoices();
    }
  }, []);

  // Speak first message
  useEffect(() => {
    if (voiceOn) {
      setTimeout(() => {
        setSpeaking(true);
        speak(messages[0].content, () => setSpeaking(false));
      }, 800);
    }
  }, []); // eslint-disable-line

  /* ─── Send Message ─── */
  const sendMessage = useCallback(async (text) => {
    const msg = text || input.trim();
    if (!msg || loading) return;

    const newMessages = [...messages, { role: "user", content: msg }];
    setMessages(newMessages);
    setInput("");
    setTranscript("");
    setLoading(true);
    setStatusText("PROCESSING...");

    try {
      const res = await fetch("/api/chat", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ messages: newMessages.map(m => ({ role: m.role, content: m.content })) }),
      });
      const data = await res.json();
      const reply = data.content || data.error || "System anomaly. Please retry.";
      setMessages(prev => [...prev, { role: "assistant", content: reply }]);
      setStatusText("ALL SYSTEMS NOMINAL");
      if (voiceOn) {
        setSpeaking(true);
        speak(reply, () => setSpeaking(false));
      }
    } catch {
      const err = "Connection lost. Please check your network.";
      setMessages(prev => [...prev, { role: "assistant", content: err }]);
      setStatusText("CONNECTION ERROR");
    } finally {
      setLoading(false);
    }
  }, [input, loading, messages, voiceOn]);

  /* ─── Voice Input ─── */
  const toggleListen = useCallback(() => {
    if (typeof window === "undefined") return;
    const SR = window.SpeechRecognition || window.webkitSpeechRecognition;
    if (!SR) { alert("Speech recognition not supported in this browser. Use Chrome on Android."); return; }

    if (listening) {
      recognitionRef.current?.stop();
      setListening(false);
      setStatusText("ALL SYSTEMS NOMINAL");
      return;
    }

    // Stop any ongoing speech
    window.speechSynthesis?.cancel();
    setSpeaking(false);

    const rec = new SR();
    rec.lang = "en-US";
    rec.continuous = false;
    rec.interimResults = true;
    recognitionRef.current = rec;

    rec.onstart = () => { setListening(true); setStatusText("LISTENING..."); };
    rec.onresult = (e) => {
      const t = Array.from(e.results).map(r => r[0].transcript).join("");
      setTranscript(t);
      setInput(t);
    };
    rec.onend = () => {
      setListening(false);
      setStatusText("ALL SYSTEMS NOMINAL");
      // Auto-send if we got something
      const finalText = recognitionRef.current?._lastTranscript;
      if (finalText) sendMessage(finalText);
    };
    rec.onerror = (e) => {
      setListening(false);
      setStatusText(e.error === "not-allowed" ? "MIC ACCESS DENIED" : "VOICE ERROR");
    };
    // Track last transcript for auto-send
    rec.addEventListener("result", (e) => {
      if (e.results[e.results.length - 1].isFinal) {
        recognitionRef.current._lastTranscript = e.results[e.results.length - 1][0].transcript;
      }
    });

    rec.start();
  }, [listening, sendMessage]);

  const clearChat = () => {
    window.speechSynthesis?.cancel();
    setSpeaking(false);
    setMessages([{ role: "assistant", content: "Memory cleared. J.A.R.V.I.S. reinitialized. Ready, Brian." }]);
  };

  /* ─── Render ─── */
  return (
    <>
      <style>{`
        *, *::before, *::after { box-sizing: border-box; margin: 0; padding: 0; }
        html, body { height: 100%; overflow: hidden; }

        @keyframes pulse {
          0%, 100% { opacity: 0.3; transform: scale(0.8); }
          50% { opacity: 1; transform: scale(1.2); }
        }
        @keyframes fadeUp {
          from { opacity: 0; transform: translateY(12px); }
          to   { opacity: 1; transform: translateY(0); }
        }
        @keyframes scan {
          0%   { top: -2px; }
          100% { top: 100vh; }
        }
        @keyframes arcGlow {
          0%, 100% { box-shadow: 0 0 8px #00d4ff44; }
          50%       { box-shadow: 0 0 24px #00d4ff99, 0 0 48px #00d4ff33; }
        }
        @keyframes micPulse {
          0%, 100% { box-shadow: 0 0 0 0 #ff4a4a66; }
          50%       { box-shadow: 0 0 0 12px #ff4a4a00; }
        }
        @keyframes speakPulse {
          0%, 100% { box-shadow: 0 0 0 0 #00d4ff44; }
          50%       { box-shadow: 0 0 0 10px #00d4ff00; }
        }

        .app {
          height: 100dvh;
          display: flex;
          flex-direction: column;
          background: radial-gradient(ellipse at 15% 40%, #001a2e 0%, #020b14 65%);
          color: #e0f4ff;
          font-family: 'Rajdhani', sans-serif;
          position: relative;
          overflow: hidden;
        }

        /* scanline */
        .scanline {
          position: fixed; left: 0; right: 0; height: 2px;
          background: linear-gradient(90deg, transparent, #00d4ff88, transparent);
          animation: scan 5s linear infinite;
          pointer-events: none; z-index: 1; opacity: 0.35;
        }

        /* corner brackets */
        .corner { position: fixed; width: 52px; height: 52px; opacity: 0.18; pointer-events: none; z-index: 2; }
        .corner.tl { top: 10px; left: 10px; border-top: 1px solid #00d4ff; border-left: 1px solid #00d4ff; }
        .corner.tr { top: 10px; right: 10px; border-top: 1px solid #00d4ff; border-right: 1px solid #00d4ff; }
        .corner.bl { bottom: 10px; left: 10px; border-bottom: 1px solid #00d4ff; border-left: 1px solid #00d4ff; }
        .corner.br { bottom: 10px; right: 10px; border-bottom: 1px solid #00d4ff; border-right: 1px solid #00d4ff; }

        /* header */
        .header {
          display: flex; align-items: center; justify-content: space-between;
          padding: 10px 18px 8px;
          border-bottom: 1px solid #00d4ff1a;
          background: linear-gradient(180deg, #001929 0%, transparent 100%);
          flex-shrink: 0; z-index: 10;
        }
        .logo { display: flex; align-items: center; gap: 10px; }
        .arc {
          width: 38px; height: 38px; border-radius: 50%;
          border: 2px solid #00d4ff; display: flex; align-items: center; justify-content: center;
          position: relative; animation: arcGlow 2.5s ease-in-out infinite;
        }
        .arc::before {
          content: ''; position: absolute;
          width: 24px; height: 24px; border-radius: 50%; border: 1px solid #00d4ff66;
        }
        .arc::after {
          content: ''; width: 10px; height: 10px; border-radius: 50%;
          background: radial-gradient(circle, #fff 0%, #00d4ff 60%, transparent 100%);
          box-shadow: 0 0 14px #00d4ff, 0 0 28px #00d4ff88;
        }
        .title h1 {
          font-size: 1.2rem; font-weight: 700; letter-spacing: 0.22em;
          color: #00d4ff; text-shadow: 0 0 16px #00d4ff55; line-height: 1;
        }
        .title p {
          font-family: 'Share Tech Mono', monospace; font-size: 0.55rem;
          color: #4a9db5; letter-spacing: 0.12em; margin-top: 2px;
        }
        .htime { text-align: right; font-family: 'Share Tech Mono', monospace; }
        .htime .clk { font-size: 1.1rem; color: #00d4ff; letter-spacing: 0.08em; }
        .htime .dt  { font-size: 0.55rem; color: #4a9db5; margin-top: 1px; }

        /* status */
        .statusbar {
          display: flex; align-items: center; gap: 8px;
          padding: 5px 18px; background: #00d4ff08;
          border-bottom: 1px solid #00d4ff0f;
          flex-shrink: 0; z-index: 10;
        }
        .sdot { width: 6px; height: 6px; border-radius: 50%; background: #00ff88; box-shadow: 0 0 6px #00ff88; animation: pulse 2s infinite; }
        .sdot.red { background: #ff4a4a; box-shadow: 0 0 6px #ff4a4a; }
        .sdot.orange { background: #ffa500; box-shadow: 0 0 6px #ffa500; }
        .stxt { font-family: 'Share Tech Mono', monospace; font-size: 0.6rem; color: #4a9db5; letter-spacing: 0.12em; flex: 1; }
        .clrbtn {
          background: none; border: 1px solid #00d4ff22; color: #4a9db5;
          font-family: 'Share Tech Mono', monospace; font-size: 0.55rem;
          letter-spacing: 0.1em; padding: 2px 8px; cursor: pointer; border-radius: 2px;
          transition: all 0.2s;
        }
        .clrbtn:hover { border-color: #00d4ff66; color: #00d4ff; background: #00d4ff0f; }

        /* messages */
        .msgs {
          flex: 1; overflow-y: auto; padding: 16px 14px;
          display: flex; flex-direction: column; gap: 14px;
          z-index: 10; position: relative;
        }
        .msgs::-webkit-scrollbar { width: 3px; }
        .msgs::-webkit-scrollbar-thumb { background: #00d4ff33; border-radius: 4px; }

        .msg { display: flex; gap: 9px; animation: fadeUp 0.28s ease-out; }
        .msg.user { flex-direction: row-reverse; align-self: flex-end; }
        .msg.bot  { align-self: flex-start; }

        .av {
          width: 28px; height: 28px; border-radius: 50%;
          display: flex; align-items: center; justify-content: center;
          font-size: 0.55rem; font-weight: 700; flex-shrink: 0; margin-top: 2px;
        }
        .av.bot  { border: 1px solid #00d4ff55; color: #00d4ff; background: #00d4ff0d; font-family: 'Share Tech Mono', monospace; }
        .av.user { background: #0d2840; border: 1px solid #2a5a8a; color: #7ab8d4; font-size: 0.65rem; }

        .bbl {
          padding: 10px 13px; border-radius: 2px; line-height: 1.55;
          font-size: 0.92rem; font-weight: 400; white-space: pre-wrap; max-width: 75vw;
        }
        .bbl.bot {
          background: linear-gradient(135deg, #001929, #001420);
          border: 1px solid #00d4ff1a; border-left: 2px solid #00d4ff;
          color: #c8e8f4;
        }
        .bbl.user {
          background: linear-gradient(135deg, #0d2840, #091d30);
          border: 1px solid #2a5a8a33; border-right: 2px solid #4a8aaa;
          color: #a8cce0;
        }

        /* input area */
        .inputarea {
          padding: 10px 14px 16px; flex-shrink: 0; z-index: 10;
          border-top: 1px solid #00d4ff1a;
          background: linear-gradient(0deg, #001929 0%, transparent 100%);
        }
        .inputrow { display: flex; gap: 8px; align-items: flex-end; }
        .inputwrap { flex: 1; position: relative; }
        .inputlabel {
          font-family: 'Share Tech Mono', monospace; font-size: 0.55rem;
          color: #4a9db5; letter-spacing: 0.12em; margin-bottom: 5px;
        }
        textarea {
          width: 100%; background: #001420;
          border: 1px solid #00d4ff2a; border-bottom: 2px solid #00d4ff55;
          color: #c8e8f4; font-family: 'Rajdhani', sans-serif;
          font-size: 0.95rem; font-weight: 500; padding: 10px 12px;
          resize: none; outline: none; border-radius: 2px;
          transition: border-color 0.2s, box-shadow 0.2s; line-height: 1.4;
        }
        textarea::placeholder { color: #2a5a7a; }
        textarea:focus { border-color: #00d4ff55; border-bottom-color: #00d4ff; box-shadow: 0 0 0 1px #00d4ff1a; }

        /* voice & send buttons */
        .iconbtn {
          width: 44px; height: 44px; border-radius: 2px; flex-shrink: 0;
          display: flex; align-items: center; justify-content: center;
          cursor: pointer; border: 1px solid; transition: all 0.2s;
          font-size: 1.1rem; background: none;
        }
        .micbtn {
          border-color: ${/* will be overridden inline */ "#ff4a4a66"};
          color: #ff4a4a;
        }
        .micbtn.active { animation: micPulse 1s ease-in-out infinite; border-color: #ff4a4a; background: #ff4a4a11; }
        .sendbtn { border-color: #00d4ff44; color: #00d4ff; background: linear-gradient(135deg, #002a3a, #001420); }
        .sendbtn:hover:not(:disabled) { border-color: #00d4ff; box-shadow: 0 0 18px #00d4ff33; }
        .sendbtn:disabled { opacity: 0.35; cursor: not-allowed; }

        /* voice toggle */
        .voicetoggle {
          display: flex; align-items: center; gap: 6px;
          font-family: 'Share Tech Mono', monospace; font-size: 0.55rem;
          color: #4a9db5; cursor: pointer; margin-top: 8px;
          background: none; border: none; padding: 0;
        }
        .vtdot {
          width: 8px; height: 8px; border-radius: 50%;
          border: 1px solid; transition: all 0.2s;
        }

        /* suggestions */
        .suggests {
          display: flex; gap: 6px; margin-top: 8px; flex-wrap: nowrap;
          overflow-x: auto; padding-bottom: 2px;
        }
        .suggests::-webkit-scrollbar { display: none; }
        .sug {
          background: #00d4ff08; border: 1px solid #00d4ff18;
          color: #4a9db5; font-family: 'Share Tech Mono', monospace;
          font-size: 0.55rem; letter-spacing: 0.06em; padding: 4px 9px;
          cursor: pointer; border-radius: 2px; transition: all 0.2s; white-space: nowrap;
          flex-shrink: 0;
        }
        .sug:hover { border-color: #00d4ff44; color: #00d4ff; background: #00d4ff11; }

        /* transcript preview */
        .transcript {
          font-family: 'Share Tech Mono', monospace; font-size: 0.6rem;
          color: #00d4ff88; padding: 4px 0; letter-spacing: 0.06em;
          min-height: 16px;
        }
      `}</style>

      <div className="app">
        <HexGrid />
        <div className="scanline" />
        <div className="corner tl" /><div className="corner tr" />
        <div className="corner bl" /><div className="corner br" />

        {/* Header */}
        <header className="header">
          <div className="logo">
            <div className="arc" />
            <div className="title">
              <h1>J.A.R.V.I.S.</h1>
              <p>DIGITAL CRAFT CONSULTANCY · AI CORE</p>
            </div>
          </div>
          <div className="htime">
            <div className="clk">{time}</div>
            <div className="dt">{formatDate()}</div>
          </div>
        </header>

        {/* Status bar */}
        <div className="statusbar">
          <div className={`sdot ${statusText.includes("ERROR") ? "red" : listening ? "orange" : ""}`} />
          <span className="stxt">
            {listening ? "🎙 LISTENING..." : speaking ? "🔊 SPEAKING..." : statusText}
          </span>
          <button className="clrbtn" onClick={clearChat}>CLEAR</button>
        </div>

        {/* Messages */}
        <div className="msgs">
          {messages.map((m, i) => (
            <div key={i} className={`msg ${m.role === "assistant" ? "bot" : "user"}`}>
              <div className={`av ${m.role === "assistant" ? "bot" : "user"}`}>
                {m.role === "assistant" ? "JAR" : "YOU"}
              </div>
              <div className={`bbl ${m.role === "assistant" ? "bot" : "user"}`}>{m.content}</div>
            </div>
          ))}
          {loading && (
            <div className="msg bot">
              <div className="av bot">JAR</div>
              <div className="bbl bot" style={{ padding: 0 }}><TypingDots /></div>
            </div>
          )}
          <div ref={messagesEndRef} />
        </div>

        {/* Input Area */}
        <div className="inputarea">
          <div className="inputrow">
            {/* Mic Button */}
            <button
              className={`iconbtn micbtn ${listening ? "active" : ""}`}
              style={{ borderColor: listening ? "#ff4a4a" : "#ff4a4a44", color: listening ? "#ff4a4a" : "#ff4a4a88" }}
              onClick={toggleListen}
              title="Hold to speak"
            >
              🎙
            </button>

            <div className="inputwrap">
              <div className="inputlabel">▸ COMMAND</div>
              {transcript && <div className="transcript">▸ {transcript}</div>}
              <textarea
                ref={inputRef}
                rows={2}
                value={input}
                onChange={e => setInput(e.target.value)}
                onKeyDown={e => { if (e.key === "Enter" && !e.shiftKey) { e.preventDefault(); sendMessage(); } }}
                placeholder="Speak or type your command..."
                disabled={loading}
              />
            </div>

            {/* Send Button */}
            <button
              className="iconbtn sendbtn"
              onClick={() => sendMessage()}
              disabled={loading || !input.trim()}
            >
              ▶
            </button>
          </div>

          {/* Voice toggle */}
          <button className="voicetoggle" onClick={() => { setVoiceOn(v => !v); window.speechSynthesis?.cancel(); setSpeaking(false); }}>
            <div className="vtdot" style={{ background: voiceOn ? "#00d4ff" : "transparent", borderColor: voiceOn ? "#00d4ff" : "#4a9db5" }} />
            VOICE OUTPUT {voiceOn ? "ON" : "OFF"}
          </button>

          {/* Suggestions */}
          <div className="suggests">
            {SUGGESTIONS.map(s => (
              <button key={s} className="sug" onClick={() => setInput(s)}>{s}</button>
            ))}
          </div>
        </div>
      </div>
    </>
  );
}
