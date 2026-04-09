"use client";
import { useState, useRef, useEffect } from "react";

// ─── Palette ────────────────────────────────────────────────────────────────
const C = {
  // Warm terracotta / amber primaries
  brand:       "#C4673A",
  brandLight:  "#F5EBE0",
  brandMid:    "#E8C5A8",
  brandDark:   "#8B3E1E",

  // Warm neutrals
  sand:        "#FAF6F0",
  sandDark:    "#EDE4D8",
  sandDeep:    "#D9CBBА",

  // Accent — warm sage (complementary, not cool)
  sage:        "#7A9E8A",
  sageLight:   "#EAF2EC",
  sageMid:     "#B8D4C0",

  // Amber highlight
  amber:       "#D4883A",
  amberLight:  "#FDF3E7",

  // Text
  text:        "#2C2418",
  textSec:     "#6B5A48",
  textTert:    "#9C8878",

  white:       "#FFFCF8",
  danger:      "#B03A2E",
};

const F = {
  display: "'Georgia', 'Times New Roman', serif",
  sans: "'system-ui', '-apple-system', sans-serif",
};

// ─── OCD Categories ──────────────────────────────────────────────────────────
const OCD_CATEGORIES = [
  { id: "checking",      plain: "Worrying I left something unsafe",     clinical: "Checking OCD" },
  { id: "contamination", plain: "Fear of germs, dirt or spreading harm", clinical: "Contamination OCD" },
  { id: "intrusive",     plain: "Thoughts I don't want in my head",      clinical: "Intrusive Thoughts" },
  { id: "symmetry",      plain: "Things need to feel exactly right",     clinical: "Symmetry / 'Just Right'" },
  { id: "reassurance",   plain: "Needing others to tell me it's okay",   clinical: "Reassurance Seeking" },
  { id: "existential",   plain: "Getting stuck in \"what if\" loops",    clinical: "Existential OCD" },
  { id: "harm",          plain: "Fear I might hurt someone I love",      clinical: "Harm OCD" },
  { id: "health",        plain: "Constant worry about being ill",        clinical: "Health Anxiety / OCD" },
];

// ─── System prompt ────────────────────────────────────────────────────────────
function buildSystemPrompt(profile: any) {
  const name = profile.youngPersonName || "them";
  const age  = profile.youngPersonAge  || "a young person";
  const cats = profile.categories?.length
    ? profile.categories.map(id => OCD_CATEGORIES.find(c => c.id === id)?.clinical).filter(Boolean).join(", ")
    : "not yet specified";

  return `You are OLIE — a calm, grounded tool helping ${name} (age ${age}) examine OCD thought patterns.

Known patterns for ${name}: ${cats}.

CRITICAL RULES:
- NEVER reassure about thought content. Never say "that won't happen", "you're safe", "you're not a bad person". That is reassurance and worsens OCD.
- Your job is to illuminate the PATTERN, not evaluate whether the feared outcome is likely.
- Use plain language. When you use clinical terms like ERP or exposure and response prevention, briefly explain them in the same sentence.
- Tone: calm, warm, age-appropriate for a ${age}-year-old. No exclamation marks. No "great!" or "well done!". Short sentences.
- Validate how hard this feels WITHOUT validating the feared content.
- If ${name} expresses suicidal ideation or describes genuine imminent danger, provide crisis resources immediately: Samaritans 116 123, text SHOUT to 85258, or A&E.

YOUR TASK:
Guide ${name} through examining their thought by gently exploring:
1. What the thought or urge actually is
2. What they fear will happen if they don't act
3. Whether there's real-world evidence, or whether the thought just feels certain
4. Whether they've had this thought before, and whether rituals made it go away permanently
5. Whether completing the ritual would feel done, or whether there'd be a "just one more" pull
6. Whether this is solving a real problem or temporarily reducing anxiety

Ask ONE question at a time. Keep responses to 2–4 short sentences. Use ${name}'s name occasionally but not every message.

After 5–8 exchanges, provide a brief pattern summary: what OCD pattern this resembles, what OCD is doing here in plain language, a suggested response, and a reminder that discomfort is not danger.

Begin by asking what's going through ${name}'s mind right now. Just ask — no preamble.`;
}

// ─── Offline tree ─────────────────────────────────────────────────────────────
const OFFLINE_TREE = {
  start:        { q: (n) => `What's going through your mind right now, ${n}? Describe the thought, image, doubt — whatever feels closest.`, next: "category" },
  category:     { choices: true },
  checking:     { q: () => "What are you being told will happen if you don't check? What's the feared outcome?", next: "evidence" },
  contamination:{ q: () => "What does the thought say will happen if you don't wash or avoid?", next: "evidence" },
  intrusive:    { q: () => "Intrusive thoughts feel very real and alarming — that's what they're designed to do. What is the thought telling you might happen?", next: "evidence" },
  symmetry:     { q: () => "What does it feel like will happen if things aren't arranged or completed just right?", next: "evidence" },
  reassurance:  { q: () => "What question are you trying to settle by checking or asking? What would feel like an answer?", next: "evidence" },
  existential:  { q: () => "These loops can feel overwhelming. What would it mean if the thought were true — what's underneath it?", next: "evidence" },
  harm:         { q: () => "That kind of thought is particularly distressing to carry. What is the thought telling you you might do or have done?", next: "evidence" },
  health:       { q: () => "What does the thought tell you is wrong, or what it says will happen if you don't check?", next: "evidence" },
  evidence:     { q: () => "Has this specific feared outcome actually happened before? Or does it feel certain without real evidence?", next: "history" },
  history:      { q: () => "Have you had this thought before? When you did the ritual or got reassurance — did it go away permanently, or come back?", next: "completion" },
  completion:   { q: () => "If you did the ritual right now — would it feel completely done? Or would there be a pull to do it just once more?", next: "summary" },
};

const SUMMARIES = {
  checking:     { pattern: "Checking loop", clinical: "Checking OCD", explanation: "OCD is presenting a feared outcome and offering temporary relief through checking. Checking confirms safety briefly — but also teaches your brain the danger was real, so the doubt returns stronger.", erp: "The most helpful thing right now is to resist checking and sit with the uncertainty. The anxiety will peak and reduce on its own." },
  contamination:{ pattern: "Contamination pattern", clinical: "Contamination OCD", explanation: "OCD is generating a sense of threat and offering washing or avoidance as the solution. The relief is real but temporary — and avoidance expands over time.", erp: "Try to tolerate the feeling without washing or avoiding, allowing your nervous system to learn that the discomfort fades on its own." },
  intrusive:    { pattern: "Intrusive thought pattern", clinical: "Intrusive Thoughts / Pure O", explanation: "OCD latches onto what you find most unacceptable and generates thoughts about it. The content is not a reflection of your character. Trying to suppress or neutralise it makes it more frequent.", erp: "Acknowledge the thought without engaging with it, reassuring yourself, or pushing it away. Notice it, and redirect your attention." },
  symmetry:     { pattern: "Symmetry / 'just right' pattern", clinical: "Symmetry OCD", explanation: "OCD is generating a feeling of incompleteness that can only be resolved a specific way. The relief when it feels 'right' is real — but the threshold for 'right' rises over time.", erp: "Try to tolerate the 'not just right' feeling without acting on it. Let the discomfort be present." },
  reassurance:  { pattern: "Reassurance-seeking loop", clinical: "Reassurance Seeking", explanation: "OCD generates a doubt that feels impossible to tolerate, and reassurance offers brief relief. But it confirms the doubt was worth worrying about, and the doubt returns needing more.", erp: "Resist seeking reassurance and sit with not knowing. Uncertainty is uncomfortable — it is not dangerous." },
  existential:  { pattern: "Existential loop", clinical: "Existential OCD", explanation: "OCD attaches to unanswerable questions and creates the feeling you must resolve them to feel safe. Each attempt to answer generates a new question.", erp: "Disengage from the loop rather than try to answer it. Notice the urge to think it through, and redirect without resolving." },
  harm:         { pattern: "Harm OCD pattern", clinical: "Harm OCD", explanation: "Harm OCD generates fears about hurting people you love — which is distressing precisely because it is the opposite of what you want. The distress itself is evidence that the thought doesn't reflect your desires.", erp: "Acknowledge the thought without analysing it or seeking reassurance about it." },
  health:       { pattern: "Health anxiety pattern", clinical: "Health Anxiety / OCD", explanation: "OCD attaches threat to bodily sensations and offers checking or Googling as relief. Checking temporarily reduces anxiety but increases sensitivity to the next sensation.", erp: "Resist checking or researching symptoms. Allow the uncertainty about your health to be present without acting on it." },
};

// ─── Logo ─────────────────────────────────────────────────────────────────────
function OlieLogo({ size = "md" }) {
  const isLg = size === "lg";
  return (
    <div style={{ display: "flex", alignItems: "center", gap: isLg ? 10 : 7 }}>
      <div style={{
        width: isLg ? 44 : 32, height: isLg ? 44 : 32,
        borderRadius: "50%",
        background: C.brand,
        display: "flex", alignItems: "center", justifyContent: "center",
        flexShrink: 0,
      }}>
        <span style={{
          color: C.white, fontFamily: F.display,
          fontSize: isLg ? 22 : 16, fontWeight: 400,
          lineHeight: 1, letterSpacing: "-0.02em"
        }}>O</span>
      </div>
      <div>
        <span style={{
          fontFamily: F.display, fontSize: isLg ? 22 : 16,
          color: C.text, letterSpacing: "-0.02em", fontWeight: 400
        }}>OLIE</span>
        {isLg && (
          <p style={{ fontFamily: F.sans, fontSize: 11, color: C.textTert, margin: 0, letterSpacing: "0.04em", marginTop: 1 }}>
            Overcome Life's Intrusive Episodes
          </p>
        )}
      </div>
    </div>
  );
}

// ─── ERP explainer pill ───────────────────────────────────────────────────────
function ErpExplainer() {
  const [open, setOpen] = useState(false);
  return (
    <div style={{ marginBottom: 16 }}>
      <button onClick={() => setOpen(o => !o)} style={{
        display: "flex", alignItems: "center", gap: 6,
        background: C.amberLight, border: `1px solid ${C.brandMid}`,
        borderRadius: 99, padding: "5px 12px", cursor: "pointer",
        fontFamily: F.sans, fontSize: 13, color: C.brand
      }}>
        <span style={{ fontSize: 14 }}>?</span>
        What is ERP?
        <span style={{ fontSize: 11, color: C.textTert }}>{open ? "▲" : "▼"}</span>
      </button>
      {open && (
        <div style={{
          marginTop: 8, padding: "12px 14px",
          background: C.amberLight, border: `1px solid ${C.brandMid}`,
          borderRadius: 10, fontFamily: F.sans
        }}>
          <p style={{ fontSize: 14, color: C.text, margin: "0 0 8px", lineHeight: 1.7 }}>
            <strong style={{ fontWeight: 500 }}>ERP — Exposure and Response Prevention</strong> — is the gold-standard treatment for OCD.
          </p>
          <p style={{ fontSize: 14, color: C.textSec, margin: "0 0 8px", lineHeight: 1.7 }}>
            The idea is that OCD works by creating anxiety and then offering a ritual (checking, washing, asking, arranging) as the way to get relief. ERP gently asks you to face the anxiety-triggering situation <em>without</em> doing the ritual — so your brain learns that the discomfort passes on its own, and that the feared outcome doesn't actually follow.
          </p>
          <p style={{ fontSize: 14, color: C.textSec, margin: 0, lineHeight: 1.7 }}>
            OLIE doesn't do ERP — that's best done with a trained therapist. But it uses ERP principles to help you examine what's happening in a thought or urge before deciding what to do.
          </p>
        </div>
      )}
    </div>
  );
}

// ─── Small components ─────────────────────────────────────────────────────────
function TypingDots() {
  return (
    <div style={{ display: "flex", gap: 5, alignItems: "center", padding: "4px 2px" }}>
      {[0,1,2].map(i => (
        <div key={i} style={{
          width: 7, height: 7, borderRadius: "50%", background: C.brandMid,
          animation: "oliedot 1.3s ease-in-out infinite",
          animationDelay: `${i * 0.18}s`
        }} />
      ))}
      <style>{`@keyframes oliedot{0%,80%,100%{opacity:0.25;transform:scale(0.85)}40%{opacity:1;transform:scale(1)}}`}</style>
    </div>
  );
}

function Bubble({ role, content, isTyping }) {
  const isUser = role === "user";
  return (
    <div style={{ display: "flex", justifyContent: isUser ? "flex-end" : "flex-start", marginBottom: 14 }}>
      {!isUser && (
        <div style={{
          width: 26, height: 26, borderRadius: "50%", background: C.brand,
          display: "flex", alignItems: "center", justifyContent: "center",
          marginRight: 8, flexShrink: 0, marginTop: 2
        }}>
          <span style={{ color: C.white, fontSize: 13, fontFamily: F.display }}>O</span>
        </div>
      )}
      <div style={{
        maxWidth: "78%", padding: "10px 14px",
        borderRadius: isUser ? "18px 18px 4px 18px" : "18px 18px 18px 4px",
        background: isUser ? C.brand : C.white,
        color: isUser ? C.white : C.text,
        border: isUser ? "none" : `1px solid ${C.sandDark}`,
        fontSize: 15, lineHeight: 1.65, fontFamily: F.sans,
        boxShadow: isUser ? "none" : "0 1px 3px rgba(0,0,0,0.05)"
      }}>
        {isTyping ? <TypingDots /> : content}
      </div>
    </div>
  );
}

function CategoryChip({ cat, selected, onToggle }) {
  return (
    <button onClick={() => onToggle(cat.id)} style={{
      display: "flex", flexDirection: "column", alignItems: "flex-start",
      padding: "10px 12px", borderRadius: 10, cursor: "pointer", textAlign: "left",
      background: selected ? C.brandLight : C.white,
      border: `1.5px solid ${selected ? C.brand : C.sandDark}`,
      transition: "all 0.15s", width: "100%", position: "relative"
    }}>
      <span style={{ fontSize: 14, color: C.text, fontFamily: F.sans, fontWeight: selected ? 500 : 400, paddingRight: 20 }}>{cat.plain}</span>
      <span style={{ fontSize: 11, color: C.textTert, fontFamily: F.sans, marginTop: 2 }}>{cat.clinical}</span>
      {selected && (
        <span style={{ position: "absolute", right: 12, top: "50%", transform: "translateY(-50%)", color: C.brand, fontSize: 16 }}>✓</span>
      )}
    </button>
  );
}

function Input({ label, value, onChange, type = "text", placeholder = "" }) {
  return (
    <div style={{ marginBottom: 14 }}>
      <label style={{ display: "block", fontSize: 13, color: C.textSec, fontFamily: F.sans, marginBottom: 5, fontWeight: 500 }}>{label}</label>
      <input type={type} value={value} onChange={e => onChange(e.target.value)} placeholder={placeholder}
        style={{
          width: "100%", padding: "10px 12px", borderRadius: 8, boxSizing: "border-box",
          border: `1.5px solid ${C.sandDark}`, background: C.white,
          fontSize: 15, color: C.text, fontFamily: F.sans, outline: "none",
        }} />
    </div>
  );
}

function PrimaryBtn({ children, onClick, disabled, style: s = {} }) {
  return (
    <button onClick={onClick} disabled={disabled} style={{
      width: "100%", padding: "13px", borderRadius: 10,
      background: disabled ? C.sandDark : C.brand,
      color: disabled ? C.textTert : C.white,
      border: "none", fontSize: 15, fontWeight: 500,
      fontFamily: F.sans, cursor: disabled ? "default" : "pointer",
      transition: "all 0.15s", ...s
    }}>{children}</button>
  );
}

function GhostBtn({ children, onClick, style: s = {} }) {
  return (
    <button onClick={onClick} style={{
      width: "100%", padding: "12px", borderRadius: 10,
      background: "transparent", color: C.textSec,
      border: `1.5px solid ${C.sandDark}`, fontSize: 14,
      fontFamily: F.sans, cursor: "pointer", ...s
    }}>{children}</button>
  );
}

function PageHeader({ title, onBack, rightEl }) {
  return (
    <div style={{
      padding: "13px 16px", borderBottom: `1px solid ${C.sandDark}`,
      display: "flex", alignItems: "center", justifyContent: "space-between",
      background: C.white, position: "sticky", top: 0, zIndex: 10
    }}>
      {onBack
        ? <button onClick={onBack} style={{ background: "none", border: "none", cursor: "pointer", color: C.textSec, fontSize: 14, fontFamily: F.sans, padding: 0 }}>← Back</button>
        : <span style={{ width: 40 }} />}
      <OlieLogo size="sm" />
      {rightEl || <span style={{ width: 40 }} />}
    </div>
  );
}

function SummaryCard({ category }) {
  const s = SUMMARIES[category] || SUMMARIES.checking;
  return (
    <div>
      <div style={{ background: C.brandLight, border: `1px solid ${C.brandMid}`, borderRadius: 12, padding: "1.25rem", marginBottom: 12 }}>
        <p style={{ fontSize: 11, color: C.brand, margin: "0 0 3px", textTransform: "uppercase", letterSpacing: "0.07em", fontFamily: F.sans }}>pattern identified</p>
        <p style={{ fontSize: 18, fontWeight: 400, margin: "0 0 3px", color: C.text, fontFamily: F.display }}>{s.pattern}</p>
        <p style={{ fontSize: 12, color: C.textTert, margin: "0 0 14px", fontFamily: F.sans }}>{s.clinical}</p>
        <p style={{ fontSize: 14, color: C.textSec, margin: "0 0 14px", lineHeight: 1.75, fontFamily: F.sans }}>{s.explanation}</p>
        <div style={{ background: C.white, border: `1px solid ${C.sandDark}`, borderRadius: 8, padding: "10px 12px", marginBottom: 10 }}>
          <p style={{ fontSize: 11, color: C.brand, margin: "0 0 4px", textTransform: "uppercase", letterSpacing: "0.07em", fontFamily: F.sans }}>suggested response</p>
          <p style={{ fontSize: 14, color: C.text, margin: 0, lineHeight: 1.75, fontFamily: F.sans }}>{s.erp}</p>
        </div>
        <p style={{ fontSize: 13, color: C.textTert, margin: 0, fontStyle: "italic", fontFamily: F.sans }}>Discomfort is not danger. Uncertainty is not the same as threat.</p>
      </div>
      <div style={{ border: `1px solid ${C.sandDark}`, borderRadius: 10, padding: "10px 14px", background: C.white }}>
        <p style={{ fontSize: 13, color: C.textSec, margin: 0, lineHeight: 1.7, fontFamily: F.sans }}>
          OLIE is for psychoeducation only — not therapy or diagnosis. A therapist trained in <strong style={{ fontWeight: 500 }}>ERP (Exposure and Response Prevention)</strong> is the most effective support for OCD.
          <br /><br />
          Crisis support: <strong style={{ fontWeight: 500 }}>Samaritans 116 123</strong> · Text SHOUT to <strong style={{ fontWeight: 500 }}>85258</strong>
        </p>
      </div>
    </div>
  );
}

// ─── Main App ─────────────────────────────────────────────────────────────────
const EMPTY_PROFILE = {
  youngPersonName: "", youngPersonAge: "", youngPersonEmail: "",
  carerName: "", carerEmail: "", categories: [], onboarded: false
};

export default function App() {
  const [profile, setProfile]   = useState(() => { try { const s = localStorage.getItem("olie_profile"); return s ? JSON.parse(s) : EMPTY_PROFILE; } catch { return EMPTY_PROFILE; } });
  const [screen, setScreen]     = useState(profile.onboarded ? "home" : "onboard_0");
  const [draft, setDraft]       = useState({ ...profile });
  const [messages, setMessages] = useState([]);
  const [input, setInput]       = useState("");
  const [loading, setLoading]   = useState(false);
  const [summaryCategory, setSummaryCategory] = useState(null);
  const [offlineMode, setOfflineMode]   = useState(false);
  const [offlineStep, setOfflineStep]   = useState("start");
  const [offlineCategory, setOfflineCategory] = useState(null);
  const [sendingEmail, setSendingEmail] = useState(false);
  const [emailSent, setEmailSent]       = useState(false);
  const [emailError, setEmailError]     = useState("");
  const messagesEnd = useRef(null);
  const inputRef    = useRef(null);

  useEffect(() => { messagesEnd.current?.scrollIntoView({ behavior: "smooth" }); }, [messages, loading]);
  useEffect(() => { if (screen === "chat") inputRef.current?.focus(); }, [screen]);

  function saveProfile(p) { setProfile(p); try { localStorage.setItem("olie_profile", JSON.stringify(p)); } catch {} }
  function updateDraft(k, v) { setDraft(d => ({ ...d, [k]: v })); }
  function toggleCategory(id) { setDraft(d => ({ ...d, categories: d.categories.includes(id) ? d.categories.filter(c => c !== id) : [...d.categories, id] })); }

  // ── Onboarding ─────────────────────────────────────────────────────────────
  const STEPS = [
    {
      title: "About you",
      content: () => (
        <>
          <Input label="Your first name" value={draft.youngPersonName} onChange={v => updateDraft("youngPersonName", v)} placeholder="e.g. Ollie" />
          <Input label="Your age" value={draft.youngPersonAge} onChange={v => updateDraft("youngPersonAge", v)} type="number" placeholder="e.g. 15" />
          <Input label="Your email (optional)" value={draft.youngPersonEmail} onChange={v => updateDraft("youngPersonEmail", v)} type="email" placeholder="for your session summary" />
        </>
      ),
      canProgress: () => draft.youngPersonName.trim().length > 0
    },
    {
      title: "What you experience",
      subtitle: "Tick anything that feels familiar. You can change this later.",
      content: () => (
        <div style={{ display: "flex", flexDirection: "column", gap: 8 }}>
          {OCD_CATEGORIES.map(cat => <CategoryChip key={cat.id} cat={cat} selected={draft.categories.includes(cat.id)} onToggle={toggleCategory} />)}
        </div>
      ),
      canProgress: () => true
    },
    {
      title: "Parent or carer",
      subtitle: "So they can receive a copy of your session summary — only when you choose to share it.",
      content: () => (
        <>
          <Input label="Their name" value={draft.carerName} onChange={v => updateDraft("carerName", v)} placeholder="e.g. Dad, Mum, Dr Smith" />
          <Input label="Their email" value={draft.carerEmail} onChange={v => updateDraft("carerEmail", v)} type="email" placeholder="their@email.com" />
        </>
      ),
      canProgress: () => true
    }
  ];

  const stepScreens = ["onboard_0", "onboard_1", "onboard_2"];
  const stepIdx = stepScreens.indexOf(screen);

  if (stepIdx >= 0) {
    const step = STEPS[stepIdx];
    const isLast = stepIdx === STEPS.length - 1;
    return (
      <div style={{ minHeight: "100vh", background: C.sand, display: "flex", justifyContent: "center" }}>
        <div style={{ width: "100%", maxWidth: 520, background: C.white, minHeight: "100vh", display: "flex", flexDirection: "column" }}>
          <div style={{ padding: "1.75rem 1.5rem 1rem" }}>
            <OlieLogo size="lg" />
            <div style={{ display: "flex", gap: 5, margin: "1.5rem 0 1.75rem" }}>
              {STEPS.map((_, i) => (
                <div key={i} style={{ height: 3, flex: 1, borderRadius: 99, background: i <= stepIdx ? C.brand : C.sandDark, transition: "background 0.3s" }} />
              ))}
            </div>
            {stepIdx === 0 && (
              <div style={{ background: C.brandLight, border: `1px solid ${C.brandMid}`, borderRadius: 10, padding: "12px 14px", marginBottom: "1.5rem" }}>
                <p style={{ fontSize: 14, color: C.textSec, margin: 0, lineHeight: 1.7, fontFamily: F.sans }}>
                  OLIE helps you look at thoughts and urges that feel hard to shake — not to judge them, but to understand the pattern behind them.
                </p>
              </div>
            )}
            <h2 style={{ fontSize: 17, fontWeight: 500, color: C.text, margin: "0 0 4px", fontFamily: F.sans }}>{step.title}</h2>
            {step.subtitle && <p style={{ fontSize: 13, color: C.textTert, margin: "0 0 14px", fontFamily: F.sans }}>{step.subtitle}</p>}
            {!step.subtitle && <div style={{ marginBottom: 14 }} />}
            {step.content()}
          </div>
          <div style={{ padding: "1rem 1.5rem 2rem", marginTop: "auto" }}>
            <PrimaryBtn disabled={!step.canProgress()} onClick={() => {
              if (isLast) { const p = { ...draft, onboarded: true }; saveProfile(p); setScreen("home"); }
              else setScreen(stepScreens[stepIdx + 1]);
            }}>
              {isLast ? "Let's go" : "Continue"}
            </PrimaryBtn>
            {stepIdx > 0 && <GhostBtn style={{ marginTop: 8 }} onClick={() => setScreen(stepScreens[stepIdx - 1])}>Back</GhostBtn>}
            {stepIdx === 0 && (
              <p style={{ fontSize: 12, color: C.textTert, textAlign: "center", margin: "12px 0 0", fontFamily: F.sans, lineHeight: 1.6 }}>
                Your details stay on this device only, unless you choose to share a summary.
              </p>
            )}
          </div>
        </div>
      </div>
    );
  }

  // ── Chat logic ──────────────────────────────────────────────────────────────
  async function startChat() {
    setScreen("chat"); setMessages([]); setLoading(true);
    setSummaryCategory(null); setOfflineMode(false);
    setOfflineStep("start"); setOfflineCategory(null);
    setEmailSent(false); setEmailError("");

    try {
      const res = await fetch("/api/chat", {
        method: "POST", headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ model: "claude-sonnet-4-20250514", max_tokens: 1000, system: buildSystemPrompt(profile), messages: [{ role: "user", content: "I want to examine a thought I'm having." }] })
      });
      if (!res.ok) throw new Error();
      const data = await res.json();
      setMessages([{ role: "assistant", content: data.content?.find(b => b.type === "text")?.text || "" }]);
    } catch {
      setOfflineMode(true);
      setMessages([{ role: "assistant", content: OFFLINE_TREE.start.q(profile.youngPersonName || "there") }]);
      setOfflineStep("category");
    }
    setLoading(false);
  }

  function detectCategory(msgs) {
    const t = msgs.map(m => m.content).join(" ").toLowerCase();
    if (t.includes("harm ocd") || t.includes("hurt someone")) return "harm";
    if (t.includes("health") || t.includes("symptom")) return "health";
    if (t.includes("check")) return "checking";
    if (t.includes("contamin") || t.includes("wash")) return "contamination";
    if (t.includes("intrusive") || t.includes("taboo")) return "intrusive";
    if (t.includes("symmetry") || t.includes("just right")) return "symmetry";
    if (t.includes("reassur")) return "reassurance";
    if (t.includes("existential") || t.includes("loop")) return "existential";
    return profile.categories?.[0] || "checking";
  }

  async function sendMessage() {
    const text = input.trim();
    if (!text || loading) return;
    setInput("");
    const newMsgs = [...messages.filter(m => m.content !== "__summary_button__"), { role: "user", content: text }];
    setMessages(newMsgs);
    setLoading(true);

    if (offlineMode) {
      await new Promise(r => setTimeout(r, 700));
      const step = OFFLINE_TREE[offlineStep];
      if (!step || offlineStep === "summary") {
        const cat = offlineCategory || detectCategory(newMsgs);
        setSummaryCategory(cat);
        setMessages([...newMsgs, { role: "assistant", content: "Based on what you've shared, I can see a pattern here." }, { role: "assistant", content: "__summary_button__" }]);
        setLoading(false); return;
      }
      if (step.next === "summary") {
        const cat = offlineCategory || detectCategory(newMsgs);
        setSummaryCategory(cat);
        const finalMsg = OFFLINE_TREE.completion.q();
        setMessages([...newMsgs, { role: "assistant", content: finalMsg }, { role: "assistant", content: "__summary_button__" }]);
        setLoading(false); return;
      }
      setOfflineStep(step.next);
      setMessages([...newMsgs, { role: "assistant", content: OFFLINE_TREE[step.next].q(profile.youngPersonName || "there") }]);
      setLoading(false); return;
    }

    try {
      const res = await fetch("/api/chat", {
        method: "POST", headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ model: "claude-sonnet-4-20250514", max_tokens: 1000, system: buildSystemPrompt(profile), messages: newMsgs.map(m => ({ role: m.role, content: m.content })) })
      });
      if (!res.ok) throw new Error();
      const data = await res.json();
      const reply = data.content?.find(b => b.type === "text")?.text || "";
      const isSummaryTurn = newMsgs.length >= 16 || (reply.toLowerCase().includes("pattern") && reply.length > 500);

      if (isSummaryTurn) {
        const cat = detectCategory([...newMsgs, { role: "assistant", content: reply }]);
        setSummaryCategory(cat);
        setMessages([...newMsgs, { role: "assistant", content: reply }, { role: "assistant", content: "__summary_button__" }]);
      } else {
        setMessages([...newMsgs, { role: "assistant", content: reply }]);
      }
    } catch {
      setOfflineMode(true);
      setMessages([...newMsgs, { role: "assistant", content: OFFLINE_TREE[offlineStep]?.q(profile.youngPersonName || "there") || "Has this thought come up before?" }]);
    }
    setLoading(false);
  }

  function handleOfflineChoice(cat) {
    setOfflineCategory(cat.id);
    const newMsgs = [...messages, { role: "user", content: cat.plain }];
    setMessages(newMsgs);
    setOfflineStep("evidence");
    setTimeout(() => {
      setMessages(m => [...m, { role: "assistant", content: OFFLINE_TREE[cat.id].q(profile.youngPersonName || "there") }]);
    }, 500);
  }

  async function sendEmails() {
    setSendingEmail(true); setEmailError("");
    const s = SUMMARIES[summaryCategory] || SUMMARIES.checking;
    const transcript = messages.filter(m => m.content !== "__summary_button__").map(m => `${m.role === "user" ? (profile.youngPersonName || "You") : "OLIE"}: ${m.content}`).join("\n\n");
    try {
      const res = await fetch("/api/send-summary", {
        method: "POST", headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ profile, summary: s, transcript, category: summaryCategory })
      });
      if (!res.ok) throw new Error();
      setEmailSent(true);
    } catch {
      setEmailError("Couldn't send right now. Please try again or screenshot this page.");
    }
    setSendingEmail(false);
  }

  const wrap = (children) => (
    <div style={{ minHeight: "100vh", background: C.sand, display: "flex", justifyContent: "center" }}>
      <div style={{ width: "100%", maxWidth: 520, background: C.white, minHeight: "100vh", display: "flex", flexDirection: "column" }}>
        {children}
      </div>
    </div>
  );

  // ── Home ────────────────────────────────────────────────────────────────────
  if (screen === "home") {
    const name = profile.youngPersonName || "there";
    const cats = profile.categories?.map(id => OCD_CATEGORIES.find(c => c.id === id)).filter(Boolean) || [];
    return wrap(
      <>
        <div style={{ padding: "1.75rem 1.5rem 1rem" }}>
          <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", marginBottom: "1.75rem" }}>
            <OlieLogo size="lg" />
          </div>

          <p style={{ fontSize: 16, color: C.textSec, lineHeight: 1.75, margin: "0 0 1.5rem", fontFamily: F.sans }}>
            Hi {name}. When a thought or urge is hard to shake, OLIE can help you look at what's happening — not whether the fear is real, but what pattern it might be following.
          </p>

          <ErpExplainer />

          {cats.length > 0 && (
            <div style={{ marginBottom: "1.5rem" }}>
              <p style={{ fontSize: 12, color: C.textTert, margin: "0 0 8px", fontFamily: F.sans, textTransform: "uppercase", letterSpacing: "0.06em" }}>your patterns</p>
              <div style={{ display: "flex", flexWrap: "wrap", gap: 6 }}>
                {cats.map(c => (
                  <span key={c.id} style={{ fontSize: 12, padding: "4px 10px", borderRadius: 99, background: C.brandLight, border: `1px solid ${C.brandMid}`, color: C.brand, fontFamily: F.sans }}>{c.plain}</span>
                ))}
              </div>
            </div>
          )}

          <PrimaryBtn onClick={startChat} style={{ marginBottom: 10 }}>
            Something's on my mind
          </PrimaryBtn>
          <GhostBtn onClick={() => { setDraft({ ...profile }); setScreen("edit_profile"); }}>
            Edit my profile
          </GhostBtn>
        </div>
        <div style={{ padding: "0 1.5rem 2rem", marginTop: "auto" }}>
          <p style={{ fontSize: 12, color: C.textTert, textAlign: "center", fontFamily: F.sans, lineHeight: 1.6, margin: 0 }}>
            OLIE is a psychoeducation tool, not therapy.<br />
            Crisis support: Samaritans <strong style={{ fontWeight: 500 }}>116 123</strong> · Text SHOUT to <strong style={{ fontWeight: 500 }}>85258</strong>
          </p>
        </div>
      </>
    );
  }

  // ── Edit profile ────────────────────────────────────────────────────────────
  if (screen === "edit_profile") {
    return wrap(
      <>
        <PageHeader title="" onBack={() => setScreen("home")} />
        <div style={{ padding: "1.5rem", overflowY: "auto", flex: 1 }}>
          <p style={{ fontSize: 13, color: C.textSec, fontFamily: F.sans, margin: "0 0 12px", fontWeight: 500 }}>About you</p>
          <Input label="Your name" value={draft.youngPersonName} onChange={v => updateDraft("youngPersonName", v)} />
          <Input label="Your age" value={draft.youngPersonAge} onChange={v => updateDraft("youngPersonAge", v)} type="number" />
          <Input label="Your email" value={draft.youngPersonEmail} onChange={v => updateDraft("youngPersonEmail", v)} type="email" />
          <p style={{ fontSize: 13, color: C.textSec, fontFamily: F.sans, margin: "20px 0 12px", fontWeight: 500 }}>What you experience</p>
          <div style={{ display: "flex", flexDirection: "column", gap: 8, marginBottom: 20 }}>
            {OCD_CATEGORIES.map(cat => <CategoryChip key={cat.id} cat={cat} selected={draft.categories.includes(cat.id)} onToggle={toggleCategory} />)}
          </div>
          <p style={{ fontSize: 13, color: C.textSec, fontFamily: F.sans, margin: "0 0 12px", fontWeight: 500 }}>Parent or carer</p>
          <Input label="Their name" value={draft.carerName} onChange={v => updateDraft("carerName", v)} />
          <Input label="Their email" value={draft.carerEmail} onChange={v => updateDraft("carerEmail", v)} type="email" />
        </div>
        <div style={{ padding: "1rem 1.5rem 2rem" }}>
          <PrimaryBtn onClick={() => { saveProfile({ ...draft }); setScreen("home"); }}>Save changes</PrimaryBtn>
          <GhostBtn style={{ marginTop: 8 }} onClick={() => setScreen("home")}>Cancel</GhostBtn>
        </div>
      </>
    );
  }

  // ── Chat ────────────────────────────────────────────────────────────────────
  if (screen === "chat") {
    const showChoices = offlineMode && offlineStep === "category" && !loading && messages.filter(m => m.role === "user").length === 0;
    return wrap(
      <>
        <PageHeader onBack={() => setScreen("home")} rightEl={
          offlineMode ? <span style={{ fontSize: 11, color: C.textTert, background: C.sand, padding: "3px 8px", borderRadius: 99, border: `1px solid ${C.sandDark}`, fontFamily: F.sans }}>offline</span> : null
        } />
        <div style={{ flex: 1, overflowY: "auto", padding: "1.25rem 1rem" }}>
          {loading && messages.length === 0 && <Bubble role="assistant" isTyping />}
          {messages.map((m, i) =>
            m.content === "__summary_button__" ? (
              <div key={i} style={{ display: "flex", justifyContent: "center", margin: "8px 0 16px" }}>
                <button onClick={() => setScreen("summary")} style={{
                  padding: "10px 28px", borderRadius: 99,
                  background: C.brand, color: C.white, border: "none",
                  fontSize: 14, fontFamily: F.sans, cursor: "pointer",
                  boxShadow: "0 2px 8px rgba(196,103,58,0.3)"
                }}>
                  See your summary →
                </button>
              </div>
            ) : (
              <Bubble key={i} role={m.role} content={m.content} />
            )
          )}
          {showChoices && (
            <div style={{ marginBottom: 16 }}>
              <p style={{ fontSize: 13, color: C.textTert, fontFamily: F.sans, margin: "0 0 8px" }}>Choose what feels closest:</p>
              {OCD_CATEGORIES.map(c => (
                <button key={c.id} onClick={() => handleOfflineChoice(c)} style={{
                  display: "block", width: "100%", textAlign: "left",
                  padding: "10px 13px", marginBottom: 7,
                  background: C.white, border: `1.5px solid ${C.sandDark}`,
                  borderRadius: 9, cursor: "pointer", fontFamily: F.sans
                }}>
                  <span style={{ display: "block", fontSize: 14, color: C.text }}>{c.plain}</span>
                  <span style={{ fontSize: 11, color: C.textTert }}>{c.clinical}</span>
                </button>
              ))}
            </div>
          )}
          {loading && messages.length > 0 && <Bubble role="assistant" isTyping />}
          <div ref={messagesEnd} />
        </div>
        <div style={{ padding: "10px 12px", borderTop: `1px solid ${C.sandDark}`, display: "flex", gap: 8, background: C.white }}>
          <textarea ref={inputRef} value={input}
            onChange={e => setInput(e.target.value)}
            onKeyDown={e => { if (e.key === "Enter" && !e.shiftKey) { e.preventDefault(); sendMessage(); } }}
            placeholder="Type here…" rows={1}
            style={{ flex: 1, padding: "9px 12px", borderRadius: 9, border: `1.5px solid ${C.sandDark}`, background: C.sand, fontSize: 15, color: C.text, resize: "none", outline: "none", fontFamily: F.sans, lineHeight: 1.5 }}
          />
          <button onClick={sendMessage} disabled={!input.trim() || loading} style={{
            padding: "0 16px", borderRadius: 9,
            background: input.trim() && !loading ? C.brand : C.sandDark,
            color: input.trim() && !loading ? C.white : C.textTert,
            border: "none", fontSize: 14, fontFamily: F.sans,
            cursor: input.trim() && !loading ? "pointer" : "default",
            transition: "all 0.15s"
          }}>Send</button>
        </div>
      </>
    );
  }

  // ── Summary ─────────────────────────────────────────────────────────────────
  if (screen === "summary") {
    const name = profile.youngPersonName || "you";
    const hasEmails = profile.youngPersonEmail || profile.carerEmail;
    return wrap(
      <>
        <PageHeader onBack={() => setScreen("home")} />
        <div style={{ flex: 1, overflowY: "auto", padding: "1.25rem 1rem" }}>
          <p style={{ fontSize: 15, color: C.textSec, lineHeight: 1.75, margin: "0 0 1.25rem", fontFamily: F.sans }}>
            Here's what the pattern looks like based on what you shared, {name}.
          </p>
          <SummaryCard category={summaryCategory} />
          {hasEmails && (
            <div style={{ marginTop: 16, border: `1px solid ${C.sandDark}`, borderRadius: 10, padding: "1rem", background: C.white }}>
              <p style={{ fontSize: 14, fontWeight: 500, color: C.text, margin: "0 0 4px", fontFamily: F.sans }}>Send session summary</p>
              <p style={{ fontSize: 13, color: C.textSec, margin: "0 0 12px", lineHeight: 1.6, fontFamily: F.sans }}>
                {[profile.youngPersonEmail, profile.carerEmail].filter(Boolean).join(" and ")}
              </p>
              {emailSent
                ? <p style={{ fontSize: 14, color: C.brand, fontFamily: F.sans, margin: 0 }}>✓ Summary sent.</p>
                : <>
                    <PrimaryBtn onClick={sendEmails} disabled={sendingEmail}>{sendingEmail ? "Sending…" : "Send to both"}</PrimaryBtn>
                    {emailError && <p style={{ fontSize: 13, color: C.danger, margin: "8px 0 0", fontFamily: F.sans }}>{emailError}</p>}
                  </>
              }
            </div>
          )}
        </div>
        <div style={{ padding: "1rem 1rem 2rem" }}>
          <PrimaryBtn onClick={() => setScreen("home")}>Back to home</PrimaryBtn>
          <GhostBtn style={{ marginTop: 8 }} onClick={startChat}>Start a new session</GhostBtn>
        </div>
      </>
    );
  }

  return null;
}
