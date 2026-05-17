import { useState, useEffect, useRef } from "react";
import { supabase } from "./supabase";

// ─── DESIGN TOKENS ────────────────────────────────────────────────────────────
// Szöveg hierarchia
const T = {
  h:   "#f5ead8",  // heading – meleg krém
  pri: "#d4a84b",  // primary gold
  sec: "#9a8060",  // secondary – bézs, jól olvasható
  ter: "#6b5540",  // tertiary
  dim: "#3d2e1e",  // dimmed / placeholder
  inv: "#0d0a06",  // inverse (sötét szöveg világos bgre)
};
// Háttér hierarchia
const B = {
  deep:  "#080604",
  main:  "#0e0b08",
  card:  "#151009",
  hover: "#1c1510",
  bor:   "#241c12",
  borHi: "#2e2418",
};
// Accent színek
const ACC = {
  gold:     "#d4a84b",
  goldLo:   "#d4a84b22",
  goldMd:   "#d4a84b44",
  red:      "#e07060",
  redLo:    "#e0706018",
  green:    "#6ec98a",
  greenLo:  "#6ec98a18",
  blue:     "#7ec4e8",
  blueLo:   "#7ec4e818",
  violet:   "#a78bfa",
  violetLo: "#a78bfa18",
};

// ─── RANK SYSTEM ──────────────────────────────────────────────────────────────
function getRank(sales = 0) {
  if (sales >= 50) return { label: "Illatmester", icon: "🏆", color: ACC.gold,  bg: ACC.goldLo,   border: ACC.goldMd };
  if (sales >= 5)  return { label: "Parfümista",  icon: "🧴", color: ACC.blue,  bg: ACC.blueLo,   border: "#7ec4e840" };
  return                  { label: "Újonc",       icon: "🌱", color: ACC.green, bg: ACC.greenLo,  border: "#6ec98a40" };
}

function RankBadge({ sales = 0, size = "sm" }) {
  const rank = getRank(sales);
  const isLg = size === "lg";
  return (
    <span style={{
      display: "inline-flex", alignItems: "center", gap: isLg ? 6 : 4,
      background: rank.bg, border: `1px solid ${rank.border}`,
      borderRadius: 20, padding: isLg ? "5px 13px" : "2px 9px",
      fontFamily: "'DM Mono',monospace", fontSize: isLg ? 11 : 9,
      color: rank.color, fontWeight: 700, letterSpacing: 1,
      textTransform: "uppercase", whiteSpace: "nowrap"
    }}>
      <span style={{ fontSize: isLg ? 14 : 10 }}>{rank.icon}</span>
      {rank.label}
    </span>
  );
}

function RankProgress({ sales = 0 }) {
  const rank = getRank(sales);
  let next = null, pct = 100;
  if (sales < 5)               { next = { label: "Parfümista",  icon: "🧴", at: 5  }; pct = Math.round((sales / 5) * 100); }
  if (sales >= 5 && sales < 50) { next = { label: "Illatmester", icon: "🏆", at: 50 }; pct = Math.round(((sales - 5) / 45) * 100); }
  return (
    <div style={{ background: B.card, border: `1px solid ${B.bor}`, borderRadius: 12, padding: "20px 22px" }}>
      <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", marginBottom: 14 }}>
        <RankBadge sales={sales} size="lg" />
        <span style={{ fontFamily: "'DM Mono',monospace", fontSize: 11, color: T.sec }}>{sales} eladás</span>
      </div>
      {next && (
        <>
          <div style={{ display: "flex", justifyContent: "space-between", marginBottom: 8 }}>
            <span style={{ fontFamily: "'DM Mono',monospace", fontSize: 10, color: T.ter, letterSpacing: 1 }}>KÖVETKEZŐ: {next.icon} {next.label.toUpperCase()}</span>
            <span style={{ fontFamily: "'DM Mono',monospace", fontSize: 10, color: rank.color }}>{next.at - sales} eladás hiányzik</span>
          </div>
          <div style={{ height: 3, background: B.borHi, borderRadius: 2 }}>
            <div style={{ height: "100%", width: `${pct}%`, borderRadius: 2, background: `linear-gradient(90deg,${rank.color}88,${rank.color})`, transition: "width .6s ease" }} />
          </div>
        </>
      )}
      {!next && <p style={{ fontFamily: "'DM Mono',monospace", fontSize: 10, color: ACC.gold, letterSpacing: 1 }}>✦ LEGMAGASABB RANG ELÉRVE</p>}
    </div>
  );
}

// ─── AUTH ─────────────────────────────────────────────────────────────────────
function useAuth() {
  const [user, setUser]       = useState(null);
  const [profile, setProfile] = useState(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    supabase.auth.getSession().then(({ data: { session } }) => {
      setUser(session?.user ?? null);
      if (session?.user) fetchProfile(session.user.id);
      else setLoading(false);
    });
    const { data: { subscription } } = supabase.auth.onAuthStateChange((_e, session) => {
      setUser(session?.user ?? null);
      if (session?.user) fetchProfile(session.user.id);
      else { setProfile(null); setLoading(false); }
    });
    return () => subscription.unsubscribe();
  }, []);

  async function fetchProfile(uid) {
    const { data } = await supabase.from("profiles").select("*").eq("id", uid).single();
    setProfile(data); setLoading(false);
  }
  return { user, profile, loading };
}

// ─── HELPERS ──────────────────────────────────────────────────────────────────
function Stars({ v = 5, size = 13, interactive = false, onChange }) {
  const [hov, setHov] = useState(0);
  return (
    <span style={{ fontSize: size, letterSpacing: 2, cursor: interactive ? "pointer" : "default" }}>
      {[1,2,3,4,5].map(i => (
        <span key={i} style={{ color: i <= (hov || Math.round(v)) ? ACC.gold : B.borHi }}
          onMouseEnter={() => interactive && setHov(i)}
          onMouseLeave={() => interactive && setHov(0)}
          onClick={() => interactive && onChange?.(i)}>★</span>
      ))}
    </span>
  );
}

function Ava({ u, size = 38 }) {
  const initials = u?.name ? u.name.split(" ").map(w => w[0]).join("").slice(0,2).toUpperCase() : "?";
  const rank = getRank(u?.sales || 0);
  return (
    <div style={{ position: "relative", flexShrink: 0 }}>
      <div style={{ width: size, height: size, borderRadius: "50%", background: "linear-gradient(135deg,#c9952a,#6a4a10)", display: "flex", alignItems: "center", justifyContent: "center", fontFamily: "'Playfair Display',serif", fontWeight: 700, fontSize: size * .36, color: "#0d0b08", border: `2px solid ${rank.color}60` }}>{initials}</div>
      {size >= 36 && <span style={{ position: "absolute", bottom: -2, right: -2, fontSize: size * 0.32, lineHeight: 1, background: B.main, borderRadius: "50%", padding: "1px" }}>{rank.icon}</span>}
    </div>
  );
}

function Pill({ text, bg = ACC.goldLo, col = ACC.gold }) {
  return (
    <span style={{ background: bg, color: col, fontSize: 10, fontWeight: 700, padding: "3px 10px", borderRadius: 20, letterSpacing: 1, textTransform: "uppercase", fontFamily: "'DM Mono',monospace", whiteSpace: "nowrap", border: `1px solid ${col}30` }}>{text}</span>
  );
}

function Modal({ onClose, children }) {
  return (
    <div style={{ position: "fixed", inset: 0, zIndex: 200, background: "rgba(4,3,2,.92)", backdropFilter: "blur(8px)", display: "flex", alignItems: "center", justifyContent: "center", padding: 20 }} onClick={onClose}>
      <div onClick={e => e.stopPropagation()} style={{ background: "#120f0a", border: `1px solid ${B.borHi}`, borderRadius: 18, padding: "40px 36px", width: "100%", maxWidth: 520, maxHeight: "90vh", overflowY: "auto", boxShadow: "0 32px 80px #000000b0" }}>{children}</div>
    </div>
  );
}

function relTime(dateStr) {
  const d = Date.now() - new Date(dateStr).getTime();
  const m = Math.floor(d/60000), h = Math.floor(d/3600000), day = Math.floor(d/86400000);
  if (m < 1) return "most"; if (m < 60) return `${m}p`; if (h < 24) return `${h}ó`;
  if (day < 7) return `${day}n`;
  return new Date(dateStr).toLocaleDateString("hu-HU", { month: "short", day: "numeric" });
}

// ─── TOAST ────────────────────────────────────────────────────────────────────
function Toast({ message, type = "error", onClose }) {
  useEffect(() => { const t = setTimeout(onClose, 4500); return () => clearTimeout(t); }, [onClose]);
  const cfg = { error: { bg:"#2a0e0e", border:`${ACC.red}40`, text: ACC.red }, success: { bg:"#0c2414", border:`${ACC.green}40`, text: ACC.green }, info: { bg:"#0c1a28", border:`${ACC.blue}40`, text: ACC.blue } };
  const c = cfg[type] || cfg.error;
  return (
    <div style={{ background: c.bg, border: `1px solid ${c.border}`, borderRadius: 12, padding: "14px 20px", maxWidth: 380, boxShadow: "0 8px 32px #00000080", animation: "slideUp .25s ease", display: "flex", alignItems: "flex-start", gap: 12 }}>
      <span style={{ color: c.text, fontSize: 16, flexShrink: 0 }}>{type==="success"?"✓":type==="info"?"ℹ":"✕"}</span>
      <p style={{ color: c.text, fontFamily: "'DM Mono',monospace", fontSize: 12, lineHeight: 1.6, flex: 1 }}>{message}</p>
      <button onClick={onClose} style={{ background: "none", border: "none", color: c.text, cursor: "pointer", fontSize: 16, opacity: .5, padding: 0 }}>×</button>
    </div>
  );
}
function useToast() {
  const [toasts, setToasts] = useState([]);
  const show = (message, type = "error") => { const id = Date.now(); setToasts(p => [...p, { id, message, type }]); };
  const remove = id => setToasts(p => p.filter(t => t.id !== id));
  const ToastContainer = () => (
    <div style={{ position: "fixed", bottom: 28, right: 28, zIndex: 9999, display: "flex", flexDirection: "column", gap: 10 }}>
      {toasts.map(t => <Toast key={t.id} message={t.message} type={t.type} onClose={() => remove(t.id)} />)}
    </div>
  );
  return { show, ToastContainer };
}

// ─── PARFÜMÜVEG ───────────────────────────────────────────────────────────────
function bottleLiq(pct) {
  if (pct >= 80) return { top:"#e8c87a", mid:"#c9952a", bot:"#7a5810" };
  if (pct >= 50) return { top:"#e0b860", mid:"#b87820", bot:"#6a4808" };
  if (pct >= 20) return { top:"#d4a050", mid:"#a06418", bot:"#5a3806" };
  return              { top:"#c08040", mid:"#884810", bot:"#482804" };
}
function fillLbl(pct) {
  if (pct===100) return "Tele – bontatlan"; if (pct>=90) return "Szinte tele";
  if (pct>=75) return "Háromnegyedes";      if (pct>=50) return "Feles";
  if (pct>=25) return "Negyed körüli";      if (pct>=10) return "Kevés maradt";
  return "Majdnem üres";
}

function BottleSlider({ value = 90, onChange }) {
  const pct = Math.min(100, Math.max(1, value));
  const liq = bottleLiq(pct);
  const liqH = (pct/100)*108, liqY = 40+(108-liqH);
  return (
    <div style={{ background: B.card, border: `1px solid ${B.bor}`, borderRadius: 14, padding: "26px 30px", display: "flex", gap: 34, alignItems: "center" }}>
      <div style={{ flexShrink: 0, filter: "drop-shadow(0 10px 28px #00000070)" }}>
        <svg width="80" height="160" viewBox="0 0 80 160" fill="none">
          <defs>
            <linearGradient id="sl-l" x1="0" y1="0" x2="0" y2="1">
              <stop offset="0%" stopColor={liq.top} stopOpacity=".92"/><stop offset="50%" stopColor={liq.mid} stopOpacity=".88"/><stop offset="100%" stopColor={liq.bot} stopOpacity=".96"/>
            </linearGradient>
            <linearGradient id="sl-s" x1="0" y1="0" x2="1" y2="0">
              <stop offset="0%" stopColor="#fff" stopOpacity=".04"/><stop offset="28%" stopColor="#fff" stopOpacity=".12"/><stop offset="72%" stopColor="#fff" stopOpacity=".03"/><stop offset="100%" stopColor="#fff" stopOpacity=".06"/>
            </linearGradient>
            <clipPath id="sl-c"><path d="M18 40 Q14 44 12 52 L10 148 Q10 152 14 152 L66 152 Q70 152 70 148 L68 52 Q66 44 62 40 Z"/></clipPath>
          </defs>
          <rect x="28" y="6" width="24" height="14" rx="3" fill="#1e1a13" stroke="#2e2418" strokeWidth="1"/>
          <rect x="31" y="4" width="18" height="4" rx="2" fill={ACC.gold} opacity=".5"/>
          <path d="M30 20 L26 40 L54 40 L50 20 Z" fill="#141009" stroke="#221e18" strokeWidth="1"/>
          <path d="M18 40 Q14 44 12 52 L10 148 Q10 152 14 152 L66 152 Q70 152 70 148 L68 52 Q66 44 62 40 Z" fill="#0f0d09" stroke="#2a2218" strokeWidth="1.5"/>
          <g clipPath="url(#sl-c)">
            <rect x="10" y={liqY} width="60" height={liqH+10} fill="url(#sl-l)" style={{transition:"y .5s cubic-bezier(.34,1.56,.64,1),height .5s cubic-bezier(.34,1.56,.64,1)"}}/>
            {pct>3&&pct<98&&<ellipse cx="40" cy={liqY} rx="28" ry="3.5" fill={liq.top} opacity=".4" style={{transition:"cy .5s cubic-bezier(.34,1.56,.64,1)"}}/>}
          </g>
          <path d="M18 40 Q14 44 12 52 L10 148 Q10 152 14 152 L66 152 Q70 152 70 148 L68 52 Q66 44 62 40 Z" fill="url(#sl-s)"/>
          <path d="M16 55 L14 140" stroke="#fff" strokeWidth="1.5" strokeOpacity=".06" strokeLinecap="round"/>
          <text x="40" y="106" textAnchor="middle" fontFamily="'DM Mono',monospace" fontSize="14" fontWeight="700" fill={pct>45?"#0d0b08":ACC.gold} style={{userSelect:"none"}}>{pct}%</text>
        </svg>
      </div>
      <div style={{ flex: 1 }}>
        <div style={{ fontFamily: "'Playfair Display',serif", fontSize: 20, color: T.h, marginBottom: 4 }}>{fillLbl(pct)}</div>
        <div style={{ fontFamily: "'DM Mono',monospace", fontSize: 10, color: T.sec, letterSpacing: 2, marginBottom: 24, textTransform: "uppercase" }}>Töltöttségi szint</div>
        <input type="range" min={1} max={100} value={pct} onChange={e => onChange(Number(e.target.value))}
          style={{ width:"100%",height:5,appearance:"none",WebkitAppearance:"none",background:`linear-gradient(90deg,${ACC.gold} ${pct}%,${B.borHi} ${pct}%)`,borderRadius:3,outline:"none",cursor:"pointer"}}/>
        <div style={{ display:"flex",justifyContent:"space-between",marginTop:8,fontFamily:"'DM Mono',monospace",fontSize:9,color:T.ter }}>
          {["0%","25%","50%","75%","100%"].map(l=><span key={l}>{l}</span>)}
        </div>
        <div style={{ display:"flex",gap:7,marginTop:18,flexWrap:"wrap" }}>
          {[{label:"Bontatlan",v:100},{label:"~¾",v:75},{label:"~½",v:50},{label:"~¼",v:25}].map(({label,v})=>(
            <button key={v} onClick={()=>onChange(v)} style={{ background:pct===v?ACC.goldLo:"transparent",border:`1px solid ${pct===v?ACC.goldMd:B.bor}`,color:pct===v?ACC.gold:T.ter,padding:"5px 12px",borderRadius:6,cursor:"pointer",fontFamily:"'DM Mono',monospace",fontSize:10,letterSpacing:1,transition:"all .15s" }}>{label}</button>
          ))}
        </div>
        {pct<20&&<div style={{ marginTop:14,padding:"9px 14px",background:ACC.redLo,border:`1px solid ${ACC.red}30`,borderRadius:8,fontFamily:"'DM Mono',monospace",fontSize:10,color:ACC.red,letterSpacing:1 }}>⚠ Alacsony szint – légy pontos a vevő miatt!</div>}
      </div>
    </div>
  );
}

function BottleCompact({ pct = 90 }) {
  const liq = bottleLiq(pct); const liqH=(pct/100)*108; const liqY=40+(108-liqH);
  const col = pct>=80?ACC.gold:pct>=50?"#e0b060":pct>=25?"#d4924a":ACC.red;
  return (
    <div style={{ display:"flex",alignItems:"center",gap:10,marginBottom:12 }}>
      <svg width="22" height="70" viewBox="0 0 80 160" fill="none">
        <defs>
          <linearGradient id="cp-l" x1="0" y1="0" x2="0" y2="1"><stop offset="0%" stopColor={liq.top} stopOpacity=".9"/><stop offset="100%" stopColor={liq.bot} stopOpacity=".8"/></linearGradient>
          <clipPath id="cp-c"><path d="M18 40 Q14 44 12 52 L10 148 Q10 152 14 152 L66 152 Q70 152 70 148 L68 52 Q66 44 62 40 Z"/></clipPath>
        </defs>
        <rect x="28" y="6" width="24" height="14" rx="3" fill="#1e1a13" stroke="#2e2418" strokeWidth="1"/>
        <path d="M30 20 L26 40 L54 40 L50 20 Z" fill="#141009" stroke="#221e18" strokeWidth="1"/>
        <path d="M18 40 Q14 44 12 52 L10 148 Q10 152 14 152 L66 152 Q70 152 70 148 L68 52 Q66 44 62 40 Z" fill="#0f0d09" stroke="#2a2218" strokeWidth="1.5"/>
        <g clipPath="url(#cp-c)"><rect x="10" y={liqY} width="60" height={liqH+10} fill="url(#cp-l)"/></g>
      </svg>
      <div>
        <div style={{ fontFamily:"'Playfair Display',serif",fontSize:17,color:col,fontWeight:600 }}>{pct}%</div>
        <div style={{ fontFamily:"'DM Mono',monospace",fontSize:9,color:T.sec,letterSpacing:1 }}>TELE</div>
      </div>
    </div>
  );
}

function BottleDetail({ pct = 90 }) {
  const liq = bottleLiq(pct); const liqH=(pct/100)*108; const liqY=40+(108-liqH);
  const col = pct>=80?ACC.gold:pct>=50?"#e0b060":pct>=25?"#d4924a":ACC.red;
  return (
    <div style={{ background:B.card,border:`1px solid ${B.bor}`,borderRadius:12,padding:"18px 22px",display:"flex",alignItems:"center",gap:22,marginBottom:28 }}>
      <svg width="52" height="104" viewBox="0 0 80 160" fill="none" style={{ filter:"drop-shadow(0 6px 16px #00000060)",flexShrink:0 }}>
        <defs>
          <linearGradient id="dt-l" x1="0" y1="0" x2="0" y2="1"><stop offset="0%" stopColor={liq.top} stopOpacity=".9"/><stop offset="100%" stopColor={liq.bot} stopOpacity=".8"/></linearGradient>
          <clipPath id="dt-c"><path d="M18 40 Q14 44 12 52 L10 148 Q10 152 14 152 L66 152 Q70 152 70 148 L68 52 Q66 44 62 40 Z"/></clipPath>
        </defs>
        <rect x="28" y="6" width="24" height="14" rx="3" fill="#1e1a13" stroke="#2e2418" strokeWidth="1"/>
        <rect x="31" y="4" width="18" height="4" rx="2" fill={ACC.gold} opacity=".5"/>
        <path d="M30 20 L26 40 L54 40 L50 20 Z" fill="#141009" stroke="#221e18" strokeWidth="1"/>
        <path d="M18 40 Q14 44 12 52 L10 148 Q10 152 14 152 L66 152 Q70 152 70 148 L68 52 Q66 44 62 40 Z" fill="#0f0d09" stroke="#2a2218" strokeWidth="1.5"/>
        <g clipPath="url(#dt-c)">
          <rect x="10" y={liqY} width="60" height={liqH+10} fill="url(#dt-l)"/>
          {pct>3&&pct<98&&<ellipse cx="40" cy={liqY} rx="28" ry="3" fill={liq.top} opacity=".35"/>}
        </g>
        <path d="M16 55 L14 140" stroke="#fff" strokeWidth="1.5" strokeOpacity=".06" strokeLinecap="round"/>
        <text x="40" y="106" textAnchor="middle" fontFamily="'DM Mono',monospace" fontSize="13" fontWeight="700" fill={pct>45?"#0d0b08":ACC.gold} style={{userSelect:"none"}}>{pct}%</text>
      </svg>
      <div>
        <div style={{ fontFamily:"'Playfair Display',serif",fontSize:26,color:col,fontWeight:600,marginBottom:4 }}>{pct}% tele</div>
        <div style={{ fontFamily:"'DM Mono',monospace",fontSize:10,color:T.sec,letterSpacing:2,marginBottom:12,textTransform:"uppercase" }}>Töltöttségi szint</div>
        <div style={{ width:160,height:3,background:B.borHi,borderRadius:2 }}>
          <div style={{ height:"100%",width:`${pct}%`,background:`linear-gradient(90deg,${col}66,${col})`,borderRadius:2,transition:"width .5s ease" }}/>
        </div>
      </div>
    </div>
  );
}

// ─── CONSTANTS ────────────────────────────────────────────────────────────────
const COND       = { mint:"Bontatlan/Mint",excellent:"Kiváló",good:"Jó",fair:"Közepes" };
const COND_COLOR = { mint:ACC.green,excellent:ACC.blue,good:"#ffd97e",fair:ACC.red };
const CATS       = ["Összes","woody","oriental","floral","fresh","aromatic"];
const DECANT_SZ  = [1,2,3,5,10,15,20];
const ICONS      = ["✨","🏺","🫙","🌸","🌿","🍂","☀️","🌑","🥀","💀","🎷","🏔","🌊","🍋","🔥"];

// ─── NAV ──────────────────────────────────────────────────────────────────────
function Nav({ profile, page, go, openLogin, unreadCount }) {
  const rank = getRank(profile?.sales || 0);
  return (
    <nav style={{ position:"fixed",top:0,left:0,right:0,zIndex:100,height:60,background:"rgba(8,6,4,.97)",backdropFilter:"blur(20px)",borderBottom:`1px solid ${B.bor}`,display:"flex",alignItems:"center",justifyContent:"space-between",padding:"0 32px" }}>
      <div onClick={()=>go("home")} style={{ cursor:"pointer",display:"flex",alignItems:"center",gap:10 }}>
        <span style={{ fontSize:22,color:ACC.gold }}>◈</span>
        <span style={{ fontFamily:"'Playfair Display',serif",fontSize:22,fontWeight:700,color:ACC.gold,letterSpacing:2 }}>SCENTRADE</span>
        <span style={{ fontFamily:"'DM Mono',monospace",fontSize:9,color:T.ter,letterSpacing:3,marginTop:2 }}>HU</span>
      </div>
      <div style={{ display:"flex",gap:4,alignItems:"center" }}>
        {[["home","Főoldal"],["market","Piac"],["sell","+ Hirdetés"]].map(([p,l])=>(
          <button key={p} onClick={()=>go(p)} style={{ background:page===p?ACC.goldLo:"transparent",border:`1px solid ${page===p?ACC.goldMd:"transparent"}`,color:page===p?ACC.gold:T.sec,padding:"7px 14px",borderRadius:7,cursor:"pointer",fontFamily:"'DM Mono',monospace",fontSize:10,letterSpacing:1,textTransform:"uppercase" }}>{l}</button>
        ))}
        {profile ? (
          <>
            <button onClick={()=>go("messages")} style={{ background:"transparent",border:"none",cursor:"pointer",color:T.sec,fontSize:17,position:"relative",padding:"4px 10px" }}>
              ✉
              {unreadCount>0&&<span style={{ position:"absolute",top:0,right:3,background:ACC.gold,borderRadius:10,minWidth:16,height:16,display:"flex",alignItems:"center",justifyContent:"center",fontFamily:"'DM Mono',monospace",fontSize:8,color:T.inv,fontWeight:700,padding:"0 4px" }}>{unreadCount>9?"9+":unreadCount}</span>}
            </button>
            <button onClick={()=>go("profile_own")} style={{ background:"transparent",border:`1px solid ${rank.color}35`,borderRadius:22,padding:"3px 12px 3px 4px",cursor:"pointer",display:"flex",alignItems:"center",gap:8 }}>
              <Ava u={profile} size={28}/>
              <span style={{ fontFamily:"'DM Mono',monospace",fontSize:10,color:rank.color }}>{profile.name?.split(" ")[0]}</span>
              <span style={{ fontSize:13 }}>{rank.icon}</span>
            </button>
          </>
        ) : (
          <button onClick={openLogin} style={{ background:`linear-gradient(135deg,${ACC.gold},#8a5f1a)`,border:"none",color:T.inv,padding:"8px 20px",borderRadius:7,cursor:"pointer",fontFamily:"'DM Mono',monospace",fontSize:10,fontWeight:700,letterSpacing:1 }}>Belépés</button>
        )}
      </div>
    </nav>
  );
}

// ─── CARD ─────────────────────────────────────────────────────────────────────
function Card({ l, u, onClick }) {
  const [hov, setHov] = useState(false);
  const isDecant=l.listing_type==="decant",isBuy=l.type==="buy",isSold=l.status==="sold",isPend=l.status==="pending";
  return (
    <div onClick={onClick} onMouseEnter={()=>setHov(true)} onMouseLeave={()=>setHov(false)}
      style={{ background:hov?B.hover:B.card,border:`1px solid ${hov?B.borHi:B.bor}`,borderRadius:14,padding:"22px 20px 18px",cursor:onClick?"pointer":"default",transition:"all .2s",transform:hov?"translateY(-3px)":"none",boxShadow:hov?"0 16px 48px #00000060":"none",display:"flex",flexDirection:"column",opacity:isSold?.6:1,position:"relative",overflow:"hidden" }}>
      {(isSold||isPend)&&<div style={{ position:"absolute",top:0,left:0,right:0,padding:"5px 0",textAlign:"center",background:isSold?ACC.greenLo:"#ffd97e12",borderBottom:`1px solid ${isSold?ACC.green:"#ffd97e"}28`,fontFamily:"'DM Mono',monospace",fontSize:9,letterSpacing:2,color:isSold?ACC.green:"#ffd97e" }}>{isSold?"✓ ELADVA":"⏳ FÜGGŐBEN"}</div>}
      <div style={{ display:"flex",gap:6,marginBottom:14,flexWrap:"wrap",marginTop:(isSold||isPend)?24:0 }}>
        <Pill text={isBuy?"Keresett":"Eladó"} bg={isBuy?ACC.blueLo:ACC.goldLo} col={isBuy?ACC.blue:ACC.gold}/>
        <Pill text={isDecant?"Dekant":"Teljes"} bg={isDecant?"#c87a2018":"#38a16a18"} col={isDecant?"#e09040":ACC.green}/>
        {l.condition&&<Pill text={COND[l.condition]} bg={COND_COLOR[l.condition]+"18"} col={COND_COLOR[l.condition]}/>}
        {l.swap_ok&&<Pill text="Csere OK" bg={ACC.violetLo} col={ACC.violet}/>}
      </div>
      <div style={{ fontSize:36,marginBottom:10 }}>{l.icon||"🫙"}</div>
      <div style={{ fontFamily:"'DM Mono',monospace",fontSize:10,color:T.sec,letterSpacing:2,marginBottom:3 }}>{(l.brand||"").toUpperCase()}</div>
      <div style={{ fontFamily:"'Playfair Display',serif",fontSize:19,color:T.h,fontWeight:600,lineHeight:1.2,marginBottom:5 }}>{l.name}</div>
      <div style={{ fontSize:12,color:T.ter,marginBottom:14 }}>{isDecant?`${l.decant_ml}ml dekant`:`${l.size||""}${l.fill?` · ${l.fill}% tele`:""}`}</div>
      {!isDecant&&l.fill&&<BottleCompact pct={l.fill}/>}
      <div style={{ fontFamily:"'Playfair Display',serif",fontSize:23,color:ACC.gold,marginBottom:16,marginTop:"auto" }}>
        {(l.price||0).toLocaleString("hu-HU")} Ft
        {isDecant&&<span style={{ fontSize:12,color:T.ter,fontFamily:"'DM Mono',monospace",marginLeft:7 }}>/ {l.decant_ml}ml</span>}
      </div>
      <div style={{ display:"flex",alignItems:"center",justifyContent:"space-between" }}>
        <div style={{ display:"flex",alignItems:"center",gap:7,flexWrap:"wrap" }}>
          <Ava u={u} size={24}/>
          <span style={{ fontSize:12,color:T.sec }}>{u?.name?.split(" ")[0]||"?"}</span>
          {u?.verified&&<span style={{ color:ACC.gold,fontSize:11 }}>✓</span>}
          <RankBadge sales={u?.sales||0}/>
        </div>
        <span style={{ fontSize:10,color:T.ter,fontFamily:"'DM Mono',monospace" }}>👁 {l.views||0}</span>
      </div>
    </div>
  );
}

// ─── HOME ─────────────────────────────────────────────────────────────────────
function Home({ go, listings, profiles }) {
  const featured=listings.filter(l=>l.type==="sell"&&l.status!=="sold").slice(0,4);
  const decants=listings.filter(l=>l.listing_type==="decant"&&l.status!=="sold").slice(0,3);
  return (
    <div style={{ paddingTop:60 }}>
      <section style={{ minHeight:"78vh",display:"flex",flexDirection:"column",alignItems:"center",justifyContent:"center",textAlign:"center",position:"relative",overflow:"hidden",padding:"80px 24px 60px" }}>
        <div style={{ position:"absolute",inset:0,background:"radial-gradient(ellipse 55% 45% at 50% 52%,#c9952a0d 0%,transparent 70%)",pointerEvents:"none" }}/>
        <p style={{ fontFamily:"'DM Mono',monospace",fontSize:10,color:ACC.gold,letterSpacing:6,marginBottom:24,textTransform:"uppercase" }}>Magyar Parfüm Közösség</p>
        <h1 style={{ fontFamily:"'Playfair Display',serif",fontSize:"clamp(52px,9vw,106px)",fontWeight:400,color:T.h,lineHeight:1.0,marginBottom:24,letterSpacing:-1 }}>
          Adj. Végy.<br/><em style={{ color:ACC.gold }}>Szaglászkodj.</em>
        </h1>
        <p style={{ color:T.sec,fontSize:16,maxWidth:500,lineHeight:1.9,marginBottom:48 }}>
          Niche és designer parfümök, <strong style={{ color:T.h }}>dekantok</strong> és teljes üvegek biztonságos adásvételéhez.
        </p>
        <div style={{ display:"flex",gap:14,flexWrap:"wrap",justifyContent:"center" }}>
          <button onClick={()=>go("market")} style={{ background:`linear-gradient(135deg,${ACC.gold},#8a5f1a)`,border:"none",color:T.inv,padding:"16px 40px",borderRadius:8,cursor:"pointer",fontFamily:"'Playfair Display',serif",fontSize:18,fontWeight:700 }}>Böngéssz a piacon →</button>
          <button onClick={()=>go("sell")}   style={{ background:"transparent",border:`1px solid ${ACC.goldMd}`,color:ACC.gold,padding:"16px 40px",borderRadius:8,cursor:"pointer",fontFamily:"'Playfair Display',serif",fontSize:18 }}>Hirdetést feladok</button>
        </div>
      </section>
      {featured.length>0&&(
        <section style={{ padding:"64px 44px",maxWidth:1200,margin:"0 auto" }}>
          <div style={{ display:"flex",justifyContent:"space-between",alignItems:"baseline",marginBottom:36 }}>
            <h2 style={{ fontFamily:"'Playfair Display',serif",fontSize:36,color:T.h,fontWeight:400 }}>Kiemelt eladások</h2>
            <button onClick={()=>go("market")} style={{ background:"none",border:"none",color:ACC.gold,cursor:"pointer",fontFamily:"'DM Mono',monospace",fontSize:11,letterSpacing:2 }}>MIND →</button>
          </div>
          <div style={{ display:"grid",gridTemplateColumns:"repeat(auto-fill,minmax(270px,1fr))",gap:20 }}>
            {featured.map(l=><Card key={l.id} l={l} u={profiles[l.user_id]} onClick={()=>{}}/>)}
          </div>
        </section>
      )}
      {decants.length>0&&(
        <section style={{ padding:"0 44px 72px",maxWidth:1200,margin:"0 auto" }}>
          <div style={{ background:"linear-gradient(135deg,#100c07,#1a1208)",border:`1px solid ${B.borHi}`,borderRadius:18,padding:"44px 40px" }}>
            <h2 style={{ fontFamily:"'Playfair Display',serif",fontSize:32,color:T.h,fontWeight:400,marginBottom:30 }}>Friss dekantok</h2>
            <div style={{ display:"grid",gridTemplateColumns:"repeat(auto-fill,minmax(258px,1fr))",gap:18 }}>
              {decants.map(l=><Card key={l.id} l={l} u={profiles[l.user_id]} onClick={()=>{}}/>)}
            </div>
          </div>
        </section>
      )}
      <footer style={{ borderTop:`1px solid ${B.bor}`,padding:"30px 44px",textAlign:"center" }}>
        <p style={{ fontFamily:"'DM Mono',monospace",fontSize:10,color:T.ter,letterSpacing:2 }}>SCENTRADE HU · 2025 · Parfüm közösségi platform</p>
      </footer>
    </div>
  );
}

// ─── MARKET ───────────────────────────────────────────────────────────────────
function Market({ listings, profiles, go, setSelId }) {
  const [q,setQ]=useState(""); const [cat,setCat]=useState("Összes"); const [typeF,setTypeF]=useState("all");
  const [listF,setListF]=useState("all"); const [sort,setSort]=useState("newest"); const [hideS,setHideS]=useState(true);
  const filtered=listings.filter(l=>{
    if(hideS&&l.status==="sold") return false;
    const sq=q.toLowerCase();
    return(!sq||(l.brand||"").toLowerCase().includes(sq)||(l.name||"").toLowerCase().includes(sq))&&(cat==="Összes"||l.category===cat)&&(typeF==="all"||l.type===typeF)&&(listF==="all"||l.listing_type===listF);
  }).sort((a,b)=>sort==="newest"?new Date(b.created_at)-new Date(a.created_at):sort==="price_asc"?a.price-b.price:b.price-a.price);
  const inp={background:B.card,border:`1px solid ${B.bor}`,color:T.h,padding:"9px 14px",borderRadius:8,fontFamily:"'DM Mono',monospace",fontSize:11,outline:"none"};
  return (
    <div style={{ paddingTop:60,minHeight:"100vh" }}>
      <div style={{ background:B.main,borderBottom:`1px solid ${B.bor}`,padding:"28px 40px" }}>
        <div style={{ maxWidth:1200,margin:"0 auto" }}>
          <h1 style={{ fontFamily:"'Playfair Display',serif",fontSize:40,color:T.h,fontWeight:400,marginBottom:24 }}>Piac</h1>
          <div style={{ display:"flex",gap:10,flexWrap:"wrap",alignItems:"center" }}>
            <input value={q} onChange={e=>setQ(e.target.value)} placeholder="Keresés márka, név..." style={{...inp,width:220}}/>
            <select value={typeF} onChange={e=>setTypeF(e.target.value)} style={{...inp,cursor:"pointer"}}>
              <option value="all">Eladó + Keresett</option><option value="sell">Csak eladó</option><option value="buy">Csak keresett</option>
            </select>
            <select value={listF} onChange={e=>setListF(e.target.value)} style={{...inp,cursor:"pointer"}}>
              <option value="all">Teljes üveg + Dekant</option><option value="full">Csak teljes üveg</option><option value="decant">Csak dekant</option>
            </select>
            <select value={sort} onChange={e=>setSort(e.target.value)} style={{...inp,cursor:"pointer"}}>
              <option value="newest">Legújabb</option><option value="price_asc">Legolcsóbb</option><option value="price_desc">Legdrágább</option>
            </select>
            <button onClick={()=>setHideS(v=>!v)} style={{ background:hideS?"transparent":ACC.goldLo,border:`1px solid ${hideS?B.bor:ACC.goldMd}`,color:hideS?T.sec:ACC.gold,padding:"9px 14px",borderRadius:8,cursor:"pointer",fontFamily:"'DM Mono',monospace",fontSize:10,letterSpacing:1 }}>
              {hideS?"Eladottak mutatása":"Eladottak elrejtése"}
            </button>
          </div>
          <div style={{ display:"flex",gap:6,marginTop:14,flexWrap:"wrap" }}>
            {CATS.map(c=>(
              <button key={c} onClick={()=>setCat(c)} style={{ background:cat===c?ACC.goldLo:"transparent",border:`1px solid ${cat===c?ACC.goldMd:B.bor}`,color:cat===c?ACC.gold:T.ter,padding:"5px 13px",borderRadius:6,cursor:"pointer",fontFamily:"'DM Mono',monospace",fontSize:9,letterSpacing:1,textTransform:"uppercase" }}>{c}</button>
            ))}
          </div>
        </div>
      </div>
      <div style={{ padding:"32px 40px",maxWidth:1200,margin:"0 auto" }}>
        <p style={{ fontFamily:"'DM Mono',monospace",fontSize:10,color:T.ter,marginBottom:20,letterSpacing:1 }}>{filtered.length} HIRDETÉS</p>
        <div style={{ display:"grid",gridTemplateColumns:"repeat(auto-fill,minmax(272px,1fr))",gap:20 }}>
          {filtered.map(l=><Card key={l.id} l={l} u={profiles[l.user_id]} onClick={()=>{setSelId(l.id);go("detail");}}/>)}
        </div>
        {filtered.length===0&&<div style={{ textAlign:"center",padding:"90px 0",color:T.ter,fontFamily:"'DM Mono',monospace",fontSize:12 }}>{listings.length===0?"Még nincsenek hirdetések. Légy az első!":"Nincs találat."}</div>}
      </div>
    </div>
  );
}

// ─── DETAIL ───────────────────────────────────────────────────────────────────
function Detail({ l, u, curProfile, go, setProfileId, setActiveChatWith, onStatusChange }) {
  const [showOffer,setShowOffer]=useState(false); const [offerVal,setOfferVal]=useState(""); const [faved,setFaved]=useState(false);
  const [status,setStatus]=useState(l.status||"active");
  const isDecant=l.listing_type==="decant",isOwn=curProfile?.id===l.user_id;

  async function openMsg() { if(!curProfile){go("login");return;} setActiveChatWith(u.id);go("messages"); }
  async function changeStatus(s) { await supabase.from("listings").update({status:s}).eq("id",l.id); setStatus(s); onStatusChange?.(l.id,s); }

  const sCol=status==="sold"?ACC.green:status==="pending"?"#ffd97e":ACC.gold;
  return (
    <div style={{ paddingTop:60,maxWidth:980,margin:"0 auto",padding:"80px 40px" }}>
      <button onClick={()=>go("market")} style={{ background:"none",border:"none",color:T.sec,cursor:"pointer",fontFamily:"'DM Mono',monospace",fontSize:10,letterSpacing:1,marginBottom:32 }}>← VISSZA A PIACRA</button>
      <div style={{ display:"grid",gridTemplateColumns:"1fr 320px",gap:44 }}>
        <div>
          <div style={{ display:"flex",gap:8,flexWrap:"wrap",marginBottom:22 }}>
            <Pill text={l.type==="buy"?"Keresett":"Eladó"} bg={l.type==="buy"?ACC.blueLo:ACC.goldLo} col={l.type==="buy"?ACC.blue:ACC.gold}/>
            <Pill text={isDecant?"Dekant":"Teljes üveg"} bg={isDecant?"#c87a2018":"#38a16a18"} col={isDecant?"#e09040":ACC.green}/>
            {l.condition&&<Pill text={COND[l.condition]} bg={COND_COLOR[l.condition]+"18"} col={COND_COLOR[l.condition]}/>}
            {status!=="active"&&<Pill text={status==="sold"?"Eladva":"Függőben"} bg={sCol+"18"} col={sCol}/>}
            {l.swap_ok&&<Pill text="Csere OK" bg={ACC.violetLo} col={ACC.violet}/>}
          </div>
          <div style={{ fontSize:68,marginBottom:20 }}>{l.icon||"🫙"}</div>
          <p style={{ fontFamily:"'DM Mono',monospace",fontSize:11,color:T.sec,letterSpacing:3,marginBottom:4 }}>{(l.brand||"").toUpperCase()}</p>
          <h1 style={{ fontFamily:"'Playfair Display',serif",fontSize:50,color:T.h,fontWeight:400,lineHeight:1.05,marginBottom:8 }}>{l.name}</h1>
          <p style={{ color:T.sec,marginBottom:26,fontSize:14 }}>{isDecant?`${l.decant_ml}ml spray dekant`:`${l.size||""}`}</p>
          {!isDecant&&l.fill&&<BottleDetail pct={l.fill}/>}
          <div style={{ fontFamily:"'Playfair Display',serif",fontSize:48,color:ACC.gold,marginBottom:36 }}>{(l.price||0).toLocaleString("hu-HU")} Ft</div>
          <div style={{ background:B.card,border:`1px solid ${B.bor}`,borderRadius:12,padding:"22px 26px",marginBottom:24 }}>
            <p style={{ fontFamily:"'DM Mono',monospace",fontSize:10,color:T.sec,letterSpacing:2,marginBottom:14 }}>LEÍRÁS</p>
            <p style={{ color:T.h,lineHeight:1.9,fontSize:15 }}>{l.description}</p>
          </div>
          {l.tags?.length>0&&(
            <div style={{ display:"flex",flexWrap:"wrap",gap:8,marginBottom:24 }}>
              {l.tags.map(t=><span key={t} style={{ background:B.card,border:`1px solid ${B.bor}`,color:T.sec,padding:"4px 13px",borderRadius:20,fontSize:12,fontFamily:"'DM Mono',monospace" }}>#{t}</span>)}
            </div>
          )}
          {isOwn&&(
            <div style={{ background:B.card,border:`1px solid ${B.bor}`,borderRadius:12,padding:"20px 24px" }}>
              <p style={{ fontFamily:"'DM Mono',monospace",fontSize:10,color:T.sec,letterSpacing:2,marginBottom:16 }}>HIRDETÉS STÁTUSZA</p>
              <div style={{ display:"flex",gap:9,flexWrap:"wrap" }}>
                {[["active","Aktív",ACC.gold],["pending","Függőben","#ffd97e"],["sold","Eladva",ACC.green]].map(([s,label,c])=>(
                  <button key={s} onClick={()=>changeStatus(s)} style={{ background:status===s?c+"18":"transparent",border:`1px solid ${status===s?c+"44":B.bor}`,color:status===s?c:T.ter,padding:"8px 18px",borderRadius:8,cursor:"pointer",fontFamily:"'DM Mono',monospace",fontSize:10,letterSpacing:1,transition:"all .15s" }}>{label}</button>
                ))}
              </div>
            </div>
          )}
        </div>
        <div style={{ display:"flex",flexDirection:"column",gap:14 }}>
          <div style={{ background:B.card,border:`1px solid ${B.bor}`,borderRadius:14,padding:"24px 22px" }}>
            <p style={{ fontFamily:"'DM Mono',monospace",fontSize:10,color:T.sec,letterSpacing:2,marginBottom:20 }}>ELADÓ</p>
            <div style={{ display:"flex",gap:14,alignItems:"center",marginBottom:16,cursor:"pointer" }} onClick={()=>{setProfileId(u?.id);go("profile");}}>
              <Ava u={u} size={52}/>
              <div>
                <div style={{ fontFamily:"'Playfair Display',serif",fontSize:21,color:T.h }}>{u?.name}{u?.verified&&<span style={{ color:ACC.gold,fontSize:14 }}> ✓</span>}</div>
                <div style={{ fontSize:12,color:T.sec,marginTop:3 }}>📍 {u?.location}</div>
              </div>
            </div>
            <div style={{ marginBottom:14 }}>
              <RankBadge sales={u?.sales||0} size="lg"/>
              <span style={{ fontFamily:"'DM Mono',monospace",fontSize:11,color:T.sec,marginLeft:10 }}>{u?.sales||0} eladás</span>
            </div>
            <div style={{ display:"flex",alignItems:"center",gap:8 }}>
              <Stars v={u?.rating||0} size={16}/><span style={{ fontSize:13,color:T.sec }}>{u?.rating||0} · {u?.rating_count||0} értékelés</span>
            </div>
          </div>
          {!isOwn&&status!=="sold"&&(
            <>
              <button onClick={openMsg} style={{ background:`linear-gradient(135deg,${ACC.gold},#8a5f1a)`,border:"none",color:T.inv,padding:"15px",borderRadius:10,cursor:"pointer",fontFamily:"'Playfair Display',serif",fontSize:17,fontWeight:700 }}>✉ Üzenet küldése</button>
              <button onClick={()=>setFaved(!faved)} style={{ background:"transparent",border:`1px solid ${faved?ACC.goldMd:B.bor}`,color:faved?ACC.gold:T.sec,padding:"12px",borderRadius:10,cursor:"pointer",fontFamily:"'DM Mono',monospace",fontSize:11,letterSpacing:1 }}>{faved?"♥ KEDVELVE":"♡ KEDVELÉS"}</button>
              <button onClick={()=>setShowOffer(!showOffer)} style={{ background:"transparent",border:`1px solid ${ACC.goldMd}`,color:ACC.gold,padding:"12px",borderRadius:10,cursor:"pointer",fontFamily:"'DM Mono',monospace",fontSize:11,letterSpacing:1 }}>AJÁNLAT KÜLDÉSE</button>
              {showOffer&&(
                <div style={{ background:B.card,border:`1px solid ${B.bor}`,borderRadius:10,padding:16 }}>
                  <input value={offerVal} onChange={e=>setOfferVal(e.target.value)} placeholder="Ajánlott ár (Ft)" type="number" style={{ background:B.main,border:`1px solid ${B.bor}`,color:T.h,padding:"9px 13px",borderRadius:7,width:"100%",fontFamily:"'DM Mono',monospace",fontSize:12,marginBottom:9,boxSizing:"border-box",outline:"none" }}/>
                  <button onClick={openMsg} style={{ background:ACC.goldLo,border:`1px solid ${ACC.goldMd}`,color:ACC.gold,padding:"9px",width:"100%",borderRadius:7,cursor:"pointer",fontFamily:"'DM Mono',monospace",fontSize:11 }}>Ajánlat üzenetben →</button>
                </div>
              )}
            </>
          )}
          {status==="sold"&&<div style={{ background:ACC.greenLo,border:`1px solid ${ACC.green}30`,borderRadius:10,padding:"16px",textAlign:"center" }}><p style={{ fontFamily:"'DM Mono',monospace",fontSize:12,color:ACC.green,letterSpacing:1 }}>✓ ELADVA</p></div>}
          <div style={{ background:B.card,border:`1px solid ${B.bor}`,borderRadius:10,padding:"16px 20px" }}>
            <p style={{ fontFamily:"'DM Mono',monospace",fontSize:10,color:T.sec,letterSpacing:1,marginBottom:12 }}>BIZTONSÁGOS VÁSÁRLÁS</p>
            {["Valódi értékelések","PM alapú egyeztetés","Hitelesített eladói jelvény","Átverés bejelentés"].map(txt=>(
              <div key={txt} style={{ display:"flex",gap:10,fontSize:12,color:T.sec,marginBottom:8 }}><span style={{ color:ACC.gold }}>✓</span>{txt}</div>
            ))}
          </div>
        </div>
      </div>
    </div>
  );
}

// ─── PROFILE ──────────────────────────────────────────────────────────────────
function Profile({ pu, curProfile, go, listings, setActiveChatWith, onSignOut }) {
  const [tab,setTab]=useState("listings"); const [reviews,setReviews]=useState([]); const [showRM,setShowRM]=useState(false);
  const [myRating,setMyRating]=useState(5); const [myText,setMyText]=useState("");
  const isOwn=curProfile?.id===pu?.id; const uls=listings.filter(l=>l.user_id===pu?.id);
  useEffect(()=>{if(!pu?.id)return;supabase.from("reviews").select("*").eq("to_user",pu.id).then(({data})=>setReviews(data||[]));},[pu?.id]);
  async function submitReview() {
    if(!curProfile)return;
    await supabase.from("reviews").insert({from_user:curProfile.id,to_user:pu.id,rating:myRating,text:myText,transaction_type:"full"});
    setShowRM(false);setMyText("");
    const {data}=await supabase.from("reviews").select("*").eq("to_user",pu.id);setReviews(data||[]);
  }
  if(!pu)return null;
  const avg=reviews.length?(reviews.reduce((s,r)=>s+r.rating,0)/reviews.length).toFixed(1):(pu.rating||0).toFixed(1);
  return (
    <div style={{ paddingTop:60,maxWidth:980,margin:"0 auto",padding:"80px 40px" }}>
      <div style={{ display:"flex",gap:28,alignItems:"flex-start",marginBottom:40,flexWrap:"wrap" }}>
        <Ava u={pu} size={92}/>
        <div style={{ flex:1 }}>
          <div style={{ display:"flex",gap:12,alignItems:"center",flexWrap:"wrap",marginBottom:12 }}>
            <h1 style={{ fontFamily:"'Playfair Display',serif",fontSize:42,color:T.h,fontWeight:400 }}>{pu.name}</h1>
            {pu.verified&&<Pill text="Hitelesített"/>}
            <RankBadge sales={pu.sales||0} size="lg"/>
          </div>
          <div style={{ display:"flex",gap:10,alignItems:"center",marginBottom:12 }}>
            <Stars v={Number(avg)} size={18}/>
            <span style={{ fontFamily:"'Playfair Display',serif",fontSize:21,color:ACC.gold }}>{avg}</span>
            <span style={{ color:T.sec,fontSize:14 }}>({reviews.length} értékelés)</span>
          </div>
          <p style={{ color:T.sec,fontSize:13,marginBottom:12 }}>📍 {pu.location} · Tag: {pu.created_at?.slice(0,7)} óta</p>
          <p style={{ color:T.sec,fontSize:14,lineHeight:1.85,maxWidth:500 }}>{pu.bio}</p>
        </div>
        <div style={{ display:"flex",flexDirection:"column",gap:9 }}>
          {!isOwn&&curProfile&&(
            <>
              <button onClick={()=>{setActiveChatWith(pu.id);go("messages");}} style={{ background:`linear-gradient(135deg,${ACC.gold},#8a5f1a)`,border:"none",color:T.inv,padding:"10px 24px",borderRadius:9,cursor:"pointer",fontFamily:"'DM Mono',monospace",fontSize:10,fontWeight:700,letterSpacing:1 }}>✉ ÜZENET</button>
              <button onClick={()=>setShowRM(true)} style={{ background:"transparent",border:`1px solid ${ACC.goldMd}`,color:ACC.gold,padding:"10px 24px",borderRadius:9,cursor:"pointer",fontFamily:"'DM Mono',monospace",fontSize:10,letterSpacing:1 }}>⭐ ÉRTÉKELÉS</button>
            </>
          )}
          {isOwn&&<button onClick={onSignOut} style={{ background:"transparent",border:`1px solid ${ACC.red}38`,color:ACC.red,padding:"10px 24px",borderRadius:9,cursor:"pointer",fontFamily:"'DM Mono',monospace",fontSize:10,letterSpacing:1 }}>KIJELENTKEZÉS</button>}
        </div>
      </div>
      {isOwn&&<div style={{ marginBottom:36 }}><RankProgress sales={pu.sales||0}/></div>}
      <div style={{ display:"flex",borderBottom:`1px solid ${B.bor}`,marginBottom:32 }}>
        {[["listings",`Hirdetések (${uls.length})`],["reviews",`Értékelések (${reviews.length})`]].map(([k,l])=>(
          <button key={k} onClick={()=>setTab(k)} style={{ background:"transparent",border:"none",borderBottom:tab===k?`2px solid ${ACC.gold}`:"2px solid transparent",color:tab===k?ACC.gold:T.sec,padding:"13px 24px",cursor:"pointer",fontFamily:"'DM Mono',monospace",fontSize:10,letterSpacing:1,textTransform:"uppercase" }}>{l}</button>
        ))}
      </div>
      {tab==="listings"&&<div style={{ display:"grid",gridTemplateColumns:"repeat(auto-fill,minmax(262px,1fr))",gap:18 }}>{uls.map(l=><Card key={l.id} l={l} u={pu}/>)}{uls.length===0&&<p style={{ color:T.ter,fontFamily:"'DM Mono',monospace",fontSize:12 }}>Nincs hirdetés.</p>}</div>}
      {tab==="reviews"&&(
        <div style={{ display:"flex",flexDirection:"column",gap:16 }}>
          {reviews.map((r,i)=>(
            <div key={i} style={{ background:B.card,border:`1px solid ${B.bor}`,borderRadius:12,padding:"20px 24px" }}>
              <div style={{ display:"flex",justifyContent:"space-between",marginBottom:12 }}><Stars v={r.rating}/><span style={{ color:T.ter,fontFamily:"'DM Mono',monospace",fontSize:10 }}>{r.created_at?.slice(0,7)}</span></div>
              <p style={{ color:T.sec,fontSize:14,lineHeight:1.8 }}>{r.text}</p>
            </div>
          ))}
          {reviews.length===0&&<p style={{ color:T.ter,fontFamily:"'DM Mono',monospace",fontSize:12 }}>Még nincs értékelés.</p>}
        </div>
      )}
      {showRM&&(
        <Modal onClose={()=>setShowRM(false)}>
          <h2 style={{ fontFamily:"'Playfair Display',serif",fontSize:28,color:T.h,fontWeight:400,marginBottom:24 }}>Értékelés írása</h2>
          <div style={{ marginBottom:22 }}><Stars v={myRating} size={30} interactive onChange={setMyRating}/></div>
          <textarea value={myText} onChange={e=>setMyText(e.target.value)} rows={4} placeholder="Írd le tapasztalatod..." style={{ background:B.card,border:`1px solid ${B.bor}`,color:T.h,padding:"13px 15px",borderRadius:9,width:"100%",fontFamily:"'DM Mono',monospace",fontSize:12,resize:"vertical",outline:"none",boxSizing:"border-box",marginBottom:18 }}/>
          <button onClick={submitReview} style={{ background:`linear-gradient(135deg,${ACC.gold},#8a5f1a)`,border:"none",color:T.inv,padding:"14px",width:"100%",borderRadius:9,cursor:"pointer",fontFamily:"'Playfair Display',serif",fontSize:17,fontWeight:700 }}>Értékelés küldése →</button>
        </Modal>
      )}
    </div>
  );
}

// ─── MESSAGES ─────────────────────────────────────────────────────────────────
function Messages({ curProfile, profiles, activeChatWith, setActiveChatWith }) {
  const [convs,setConvs]=useState([]); const [chat,setChat]=useState([]); const [newMsg,setNewMsg]=useState("");
  const bottomRef=useRef(null);
  useEffect(()=>{
    if(!curProfile?.id)return;
    loadConvs();
    const sub=supabase.channel("msg-rt-"+curProfile.id)
      .on("postgres_changes",{event:"INSERT",schema:"public",table:"messages",filter:`to_user=eq.${curProfile.id}`},payload=>{
        if(activeChatWith===payload.new.from_user){supabase.from("messages").update({read:true,read_at:new Date().toISOString()}).eq("id",payload.new.id).then(()=>loadChat(activeChatWith));}
        else loadConvs();
      })
      .on("postgres_changes",{event:"UPDATE",schema:"public",table:"messages",filter:`from_user=eq.${curProfile.id}`},()=>{if(activeChatWith)loadChat(activeChatWith);})
      .subscribe();
    return ()=>supabase.removeChannel(sub);
  },[curProfile?.id,activeChatWith]);
  useEffect(()=>{if(activeChatWith)loadChat(activeChatWith);},[activeChatWith]);
  useEffect(()=>{bottomRef.current?.scrollIntoView({behavior:"smooth"});},[chat]);

  async function loadConvs() {
    const {data}=await supabase.from("messages").select("*").or(`from_user.eq.${curProfile.id},to_user.eq.${curProfile.id}`).order("created_at",{ascending:false});
    if(!data)return;
    const seen=new Set(),cs=[];
    data.forEach(m=>{const p=m.from_user===curProfile.id?m.to_user:m.from_user;if(!seen.has(p)){seen.add(p);cs.push({partnerId:p,lastMsg:m});}});
    setConvs(cs);
  }
  async function loadChat(pid) {
    const {data}=await supabase.from("messages").select("*").or(`and(from_user.eq.${curProfile.id},to_user.eq.${pid}),and(from_user.eq.${pid},to_user.eq.${curProfile.id})`).order("created_at",{ascending:true});
    setChat(data||[]);
    await supabase.from("messages").update({read:true,read_at:new Date().toISOString()}).eq("to_user",curProfile.id).eq("from_user",pid).eq("read",false);
    loadConvs();
  }
  async function send() {
    if(!newMsg.trim()||!activeChatWith)return;
    await supabase.from("messages").insert({from_user:curProfile.id,to_user:activeChatWith,text:newMsg.trim(),read:false,delivered:true});
    const tu=profiles[activeChatWith];
    if(tu?.email)await supabase.functions.invoke("send-message-email",{body:{to_email:tu.email,to_name:tu.name,from_name:curProfile.name,message_text:newMsg.trim()}});
    setNewMsg("");loadChat(activeChatWith);
  }
  const totalUnread=convs.filter(c=>c.lastMsg.to_user===curProfile.id&&!c.lastMsg.read).length;
  return (
    <div style={{ paddingTop:60,height:"100vh",display:"flex" }}>
      <div style={{ width:304,background:B.main,borderRight:`1px solid ${B.bor}`,overflowY:"auto",flexShrink:0 }}>
        <div style={{ padding:"20px 20px 16px",borderBottom:`1px solid ${B.bor}`,display:"flex",alignItems:"center",justifyContent:"space-between" }}>
          <p style={{ fontFamily:"'Playfair Display',serif",fontSize:23,color:T.h }}>Üzenetek</p>
          {totalUnread>0&&<span style={{ background:ACC.gold,borderRadius:12,padding:"2px 9px",fontFamily:"'DM Mono',monospace",fontSize:10,color:T.inv,fontWeight:700 }}>{totalUnread}</span>}
        </div>
        {convs.length===0&&<p style={{ padding:"24px 20px",color:T.ter,fontFamily:"'DM Mono',monospace",fontSize:11 }}>Még nincs üzeneted.</p>}
        {convs.map(({partnerId,lastMsg})=>{
          const u=profiles[partnerId];if(!u)return null;
          const active=activeChatWith===partnerId,isUnread=lastMsg.to_user===curProfile.id&&!lastMsg.read;
          return(
            <div key={partnerId} onClick={()=>setActiveChatWith(partnerId)}
              style={{ padding:"14px 20px",cursor:"pointer",display:"flex",gap:12,alignItems:"center",background:active?B.hover:isUnread?"#130f09":"transparent",borderLeft:active?`2px solid ${ACC.gold}`:isUnread?`2px solid ${ACC.gold}55`:"2px solid transparent",borderBottom:`1px solid ${B.bor}`,transition:"all .15s" }}>
              <Ava u={u} size={38}/>
              <div style={{ flex:1,minWidth:0 }}>
                <div style={{ display:"flex",justifyContent:"space-between",alignItems:"center",marginBottom:3 }}>
                  <span style={{ fontFamily:"'DM Mono',monospace",fontSize:11,color:isUnread?T.h:ACC.gold,fontWeight:isUnread?700:400 }}>{u.name}</span>
                  <span style={{ fontFamily:"'DM Mono',monospace",fontSize:9,color:isUnread?ACC.gold:T.ter }}>{relTime(lastMsg.created_at)}</span>
                </div>
                <div style={{ fontSize:12,color:isUnread?T.sec:T.ter,overflow:"hidden",textOverflow:"ellipsis",whiteSpace:"nowrap",fontWeight:isUnread?600:400 }}>
                  {lastMsg.from_user===curProfile.id?"Te: ":""}{lastMsg.text}
                </div>
              </div>
              {isUnread&&<div style={{ background:ACC.gold,borderRadius:"50%",width:8,height:8,flexShrink:0 }}/>}
            </div>
          );
        })}
      </div>
      <div style={{ flex:1,display:"flex",flexDirection:"column",background:B.deep,minWidth:0 }}>
        {activeChatWith&&profiles[activeChatWith]?(
          <>
            <div style={{ padding:"14px 24px",borderBottom:`1px solid ${B.bor}`,display:"flex",alignItems:"center",gap:14,background:B.main }}>
              <Ava u={profiles[activeChatWith]} size={38}/>
              <div style={{ fontFamily:"'Playfair Display',serif",fontSize:20,color:T.h }}>{profiles[activeChatWith].name}</div>
              <RankBadge sales={profiles[activeChatWith]?.sales||0}/>
            </div>
            <div style={{ flex:1,overflowY:"auto",padding:"24px",display:"flex",flexDirection:"column",gap:8 }}>
              {chat.map((m,i)=>{
                const me=m.from_user===curProfile.id;
                const sIcon=m.read?"✓✓":m.delivered?"✓✓":"✓",sCol=m.read?ACC.gold:m.delivered?T.ter:T.dim;
                return(
                  <div key={i} style={{ display:"flex",justifyContent:me?"flex-end":"flex-start" }}>
                    <div style={{ maxWidth:"68%",padding:"11px 15px",background:me?"#1e1608":B.card,border:`1px solid ${me?ACC.goldMd:B.bor}`,borderRadius:me?"14px 14px 3px 14px":"14px 14px 14px 3px" }}>
                      <p style={{ color:T.h,fontSize:14,lineHeight:1.65,margin:0 }}>{m.text}</p>
                      <div style={{ display:"flex",alignItems:"center",justifyContent:"flex-end",gap:5,marginTop:6 }}>
                        <span style={{ color:T.ter,fontSize:10,fontFamily:"'DM Mono',monospace" }}>{new Date(m.created_at).toLocaleTimeString("hu-HU",{hour:"2-digit",minute:"2-digit"})}</span>
                        {me&&<><span style={{ fontSize:10,color:sCol,letterSpacing:-2,transition:"color .4s" }}>{sIcon}</span>{m.read&&<span style={{ fontFamily:"'DM Mono',monospace",fontSize:8,color:ACC.gold+"88",letterSpacing:1 }}>látta</span>}</>}
                      </div>
                    </div>
                  </div>
                );
              })}
              <div ref={bottomRef}/>
            </div>
            <div style={{ padding:"14px 24px",borderTop:`1px solid ${B.bor}`,display:"flex",gap:10,background:B.main }}>
              <input value={newMsg} onChange={e=>setNewMsg(e.target.value)} onKeyDown={e=>e.key==="Enter"&&send()} placeholder="Írj üzenetet... (Enter = küldés)" style={{ flex:1,background:B.card,border:`1px solid ${B.bor}`,color:T.h,padding:"12px 17px",borderRadius:9,fontFamily:"'DM Mono',monospace",fontSize:12,outline:"none" }}/>
              <button onClick={send} style={{ background:`linear-gradient(135deg,${ACC.gold},#8a5f1a)`,border:"none",color:T.inv,padding:"12px 20px",borderRadius:9,cursor:"pointer",fontFamily:"'DM Mono',monospace",fontWeight:700,fontSize:15 }}>→</button>
            </div>
          </>
        ):(
          <div style={{ flex:1,display:"flex",alignItems:"center",justifyContent:"center",flexDirection:"column",gap:16 }}>
            <span style={{ fontSize:52,opacity:.15 }}>✉</span>
            <p style={{ color:T.ter,fontFamily:"'DM Mono',monospace",fontSize:12 }}>Válassz egy beszélgetést</p>
          </div>
        )}
      </div>
    </div>
  );
}

// ─── SELL ─────────────────────────────────────────────────────────────────────
function Sell({ curProfile, go, setListings, showToast }) {
  // iOS FIX: minden mező külön state – így nem rendereli újra a teljes formot
  // és a billentyűzet nem ugrik el gépelés közben
  const [sType, setSType]         = useState("sell");
  const [sListingType, setSLT]    = useState("full");
  const [sBrand, setSBrand]       = useState("");
  const [sName, setSName]         = useState("");
  const [sSize, setSSize]         = useState("100ml");
  const [sFill, setSFill]         = useState(90);
  const [sCondition, setSCond]    = useState("excellent");
  const [sPrice, setSPrice]       = useState("");
  const [sDecantMl, setSDecantMl] = useState("5");
  const [sCategory, setSCategory] = useState("woody");
  const [sDesc, setSDesc]         = useState("");
  const [sTags, setSTags]         = useState("");
  const [sIcon, setSIcon]         = useState("✨");
  const [sSwap, setSSwap]         = useState(false);
  const [loading, setLoading]     = useState(false);
  const [errors, setErrors]       = useState({});
  const [images, setImages]       = useState([]);

  function validate() {
    const e = {};
    if (!sBrand.trim())                   e.brand       = "A márka megadása kötelező";
    if (!sName.trim())                    e.name        = "A név megadása kötelező";
    if (!sPrice || Number(sPrice) <= 0)   e.price       = "Adj meg érvényes árat";
    if (!sDesc.trim())                    e.description = "Írj egy rövid leírást";
    return e;
  }

  async function uploadImages(lid) {
    const urls = [];
    for (const img of images) {
      const ext = img.name.split(".").pop();
      const path = `${curProfile.id}/${lid}/${Date.now()}.${ext}`;
      const { error } = await supabase.storage.from("listing-images").upload(path, img);
      if (!error) { const { data } = supabase.storage.from("listing-images").getPublicUrl(path); urls.push(data.publicUrl); }
    }
    return urls;
  }

  async function submit() {
    if (!curProfile) { go("login"); return; }
    const e = validate();
    if (Object.keys(e).length > 0) { setErrors(e); showToast("Töltsd ki a kötelező mezőket!", "error"); return; }
    setErrors({}); setLoading(true);
    const isDec = sListingType === "decant";
    const { data, error } = await supabase.from("listings").insert({
      user_id:      curProfile.id,
      type:         sType,
      listing_type: sListingType,
      brand:        sBrand.trim(),
      name:         sName.trim(),
      size:         isDec ? null : sSize,
      fill:         (!isDec && sType === "sell") ? Number(sFill) : null,
      condition:    (!isDec && sType === "sell") ? sCondition : null,
      price:        Number(sPrice),
      decant_ml:    isDec ? Number(sDecantMl) : null,
      description:  sDesc.trim(),
      category:     sCategory,
      tags:         sTags.split(",").map(t => t.trim()).filter(Boolean),
      icon:         sIcon,
      views:        0,
      favorites:    0,
      status:       "active",
      swap_ok:      sSwap,
    }).select().single();
    if (error) { setLoading(false); showToast("Hiba: " + error.message, "error"); return; }
    if (images.length > 0) {
      const urls = await uploadImages(data.id);
      await supabase.from("listings").update({ image_urls: urls }).eq("id", data.id);
      data.image_urls = urls;
    }
    setLoading(false);
    setListings(p => [data, ...p]);
    showToast("Hirdetés sikeresen közzétéve!", "success");
    setTimeout(() => go("market"), 900);
  }

  const inp = { background: B.card, border: `1px solid ${B.bor}`, color: T.h, padding: "11px 15px", borderRadius: 9, fontFamily: "'DM Mono',monospace", fontSize: 16, width: "100%", boxSizing: "border-box", outline: "none" };
  const errB = { border: `1px solid ${ACC.red}55` };

  function F({ label, errKey, children }) {
    return (
      <div style={{ marginBottom: 22 }}>
        <label style={{ fontFamily: "'DM Mono',monospace", fontSize: 10, color: errors[errKey] ? ACC.red : T.sec, letterSpacing: 2, display: "block", marginBottom: 9, textTransform: "uppercase" }}>
          {label}{errors[errKey] && <span style={{ marginLeft: 8, textTransform: "none", letterSpacing: 0, fontSize: 11 }}>— {errors[errKey]}</span>}
        </label>
        {children}
      </div>
    );
  }

  return (
    <div style={{ paddingTop: 60, maxWidth: 740, margin: "0 auto", padding: "80px 20px 100px" }}>
      <h1 style={{ fontFamily: "'Playfair Display',serif", fontSize: 40, color: T.h, fontWeight: 400, marginBottom: 10 }}>Hirdetés feladása</h1>
      <p style={{ color: T.sec, fontSize: 14, marginBottom: 40, fontFamily: "'DM Mono',monospace" }}>Minden mező kitöltése gyorsabb eladást hoz.</p>

      {/* Típus választó */}
      <F label="Mit szeretnél?">
        <div style={{ display: "flex", gap: 10 }}>
          {[["sell","🏷 Eladom"],["buy","🔍 Keresem"]].map(([t,l]) => (
            <button key={t} onClick={() => setSType(t)} style={{ flex: 1, background: sType===t?ACC.goldLo:"transparent", border: `1px solid ${sType===t?ACC.goldMd:B.bor}`, color: sType===t?ACC.gold:T.sec, padding: "14px", borderRadius: 9, cursor: "pointer", fontFamily: "'DM Mono',monospace", fontSize: 12 }}>{l}</button>
          ))}
        </div>
      </F>

      <F label="Hirdetés típusa">
        <div style={{ display: "flex", gap: 10 }}>
          {[["full","🫙 Teljes üveg"],["decant","💧 Dekant"]].map(([t,l]) => (
            <button key={t} onClick={() => setSLT(t)} style={{ flex: 1, background: sListingType===t?ACC.goldLo:"transparent", border: `1px solid ${sListingType===t?ACC.goldMd:B.bor}`, color: sListingType===t?ACC.gold:T.sec, padding: "14px", borderRadius: 9, cursor: "pointer", fontFamily: "'DM Mono',monospace", fontSize: 12 }}>{l}</button>
          ))}
        </div>
      </F>

      {/* Szöveges mezők – mind külön state, iOS-biztos */}
      <F label="Márka *" errKey="brand">
        <input
          value={sBrand}
          onChange={e => setSBrand(e.target.value)}
          placeholder="pl. Creed"
          autoComplete="off" autoCorrect="off" autoCapitalize="words" spellCheck="false"
          style={{ ...inp, ...(errors.brand ? errB : {}) }}
        />
      </F>

      <F label="Parfüm neve *" errKey="name">
        <input
          value={sName}
          onChange={e => setSName(e.target.value)}
          placeholder="pl. Aventus"
          autoComplete="off" autoCorrect="off" autoCapitalize="words" spellCheck="false"
          style={{ ...inp, ...(errors.name ? errB : {}) }}
        />
      </F>

      <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 14 }}>
        {sListingType === "full" && (
          <F label="Méret">
            <select value={sSize} onChange={e => setSSize(e.target.value)} style={{ ...inp, cursor: "pointer" }}>
              {["30ml","50ml","75ml","100ml","125ml","150ml","200ml","Egyéb"].map(s => <option key={s}>{s}</option>)}
            </select>
          </F>
        )}
        {sListingType === "decant" && (
          <F label="Dekant méret (ml)">
            <select value={sDecantMl} onChange={e => setSDecantMl(e.target.value)} style={{ ...inp, cursor: "pointer" }}>
              {DECANT_SZ.map(s => <option key={s} value={s}>{s}ml</option>)}
            </select>
          </F>
        )}
        <F label="Kategória">
          <select value={sCategory} onChange={e => setSCategory(e.target.value)} style={{ ...inp, cursor: "pointer" }}>
            {["woody","oriental","floral","fresh","aromatic"].map(c => <option key={c}>{c}</option>)}
          </select>
        </F>
        {sListingType === "full" && sType === "sell" && (
          <F label="Állapot">
            <select value={sCondition} onChange={e => setSCond(e.target.value)} style={{ ...inp, cursor: "pointer" }}>
              {Object.entries(COND).map(([k,v]) => <option key={k} value={k}>{v}</option>)}
            </select>
          </F>
        )}
      </div>

      {/* Üveg töltöttség csúszka */}
      {sListingType === "full" && sType === "sell" && (
        <F label="Töltöttségi szint">
          <BottleSlider value={sFill} onChange={setSFill} />
        </F>
      )}

      <F label="Ár (Ft) *" errKey="price">
        <input
          value={sPrice}
          onChange={e => setSPrice(e.target.value)}
          placeholder="pl. 35000"
          type="number"
          inputMode="numeric"
          style={{ ...inp, ...(errors.price ? errB : {}) }}
        />
      </F>

      <F label="Leírás *" errKey="description">
        <textarea
          value={sDesc}
          onChange={e => setSDesc(e.target.value)}
          rows={5}
          placeholder="Batch, állapot részletei, csere lehetőség..."
          style={{ ...inp, resize: "vertical", ...(errors.description ? errB : {}) }}
        />
      </F>

      <F label="Tagek (vesszővel)">
        <input
          value={sTags}
          onChange={e => setSTags(e.target.value)}
          placeholder="creed, niche, woody"
          autoComplete="off" autoCorrect="off" spellCheck="false"
          style={inp}
        />
      </F>

      {/* Csere checkbox */}
      <div style={{ marginBottom: 26 }}>
        <div onClick={() => setSSwap(v => !v)} style={{ display: "flex", gap: 14, alignItems: "center", cursor: "pointer" }}>
          <div style={{ width: 24, height: 24, borderRadius: 7, flexShrink: 0, background: sSwap ? ACC.violetLo : B.card, border: `1.5px solid ${sSwap ? ACC.violet : B.bor}`, display: "flex", alignItems: "center", justifyContent: "center", transition: "all .15s" }}>
            {sSwap && <span style={{ color: ACC.violet, fontSize: 14, fontWeight: 700 }}>✓</span>}
          </div>
          <div>
            <div style={{ fontFamily: "'DM Mono',monospace", fontSize: 12, color: sSwap ? ACC.violet : T.sec, letterSpacing: 1 }}>Csere is érdekel</div>
            <div style={{ fontFamily: "'DM Mono',monospace", fontSize: 10, color: T.ter, marginTop: 3 }}>Más parfümre is cserélném</div>
          </div>
        </div>
      </div>

      {/* Fotók */}
      <F label="Fotók (max 5)">
        <input type="file" accept="image/*" multiple onChange={e => setImages(Array.from(e.target.files).slice(0,5))} style={{ color: ACC.gold, fontFamily: "'DM Mono',monospace", fontSize: 13 }} />
        {images.length > 0 && (
          <div style={{ display: "flex", gap: 8, marginTop: 12, flexWrap: "wrap" }}>
            {images.map((img, i) => (
              <div key={i} style={{ position: "relative" }}>
                <img src={URL.createObjectURL(img)} style={{ width: 84, height: 84, objectFit: "cover", borderRadius: 9, border: `1px solid ${B.bor}` }} alt="" />
                <button onClick={() => setImages(p => p.filter((_,j) => j !== i))} style={{ position: "absolute", top: -7, right: -7, background: ACC.red, border: "none", borderRadius: "50%", width: 22, height: 22, cursor: "pointer", color: "white", fontSize: 14, display: "flex", alignItems: "center", justifyContent: "center" }}>×</button>
              </div>
            ))}
          </div>
        )}
      </F>

      {/* Ikon */}
      <F label="Ikon">
        <div style={{ display: "flex", flexWrap: "wrap", gap: 8 }}>
          {ICONS.map(ic => (
            <button key={ic} onClick={() => setSIcon(ic)} style={{ background: sIcon===ic?ACC.goldLo:B.card, border: `1px solid ${sIcon===ic?ACC.goldMd:B.bor}`, borderRadius: 9, padding: "9px 13px", cursor: "pointer", fontSize: 22 }}>{ic}</button>
          ))}
        </div>
      </F>

      <button onClick={submit} disabled={loading} style={{ background: `linear-gradient(135deg,${ACC.gold},#8a5f1a)`, border: "none", color: T.inv, padding: "18px", width: "100%", borderRadius: 10, cursor: "pointer", fontFamily: "'Playfair Display',serif", fontSize: 20, fontWeight: 700, marginTop: 12, opacity: loading ? 0.6 : 1 }}>
        {loading ? "Feltöltés..." : "Hirdetés közzététele →"}
      </button>
    </div>
  );
}

// ─── GUEST WALL ───────────────────────────────────────────────────────────────
function GuestWall({ go }) {
  return (
    <div style={{ paddingTop:60,minHeight:"100vh",display:"flex",alignItems:"center",justifyContent:"center" }}>
      <div style={{ background:B.card,border:`1px solid ${B.bor}`,borderRadius:22,padding:"64px 52px",maxWidth:480,textAlign:"center",boxShadow:"0 28px 80px #00000070" }}>
        <div style={{ fontSize:56,marginBottom:22 }}>🔒</div>
        <h2 style={{ fontFamily:"'Playfair Display',serif",fontSize:32,color:T.h,fontWeight:400,marginBottom:16 }}>Belépés szükséges</h2>
        <p style={{ color:T.sec,fontFamily:"'DM Mono',monospace",fontSize:12,lineHeight:2,marginBottom:36 }}>Hirdetés feladásához be kell jelentkezned.<br/>A piacot vendégként is böngészheted.</p>
        <button onClick={()=>go("login")} style={{ background:`linear-gradient(135deg,${ACC.gold},#8a5f1a)`,border:"none",color:T.inv,padding:"15px 40px",borderRadius:9,cursor:"pointer",fontFamily:"'Playfair Display',serif",fontSize:18,fontWeight:700,marginBottom:14,width:"100%" }}>Belépés / Regisztráció →</button>
        <button onClick={()=>go("market")} style={{ background:"transparent",border:`1px solid ${B.bor}`,color:T.sec,padding:"13px 40px",borderRadius:9,cursor:"pointer",fontFamily:"'DM Mono',monospace",fontSize:11,letterSpacing:1,width:"100%" }}>VISSZA A PIACRA</button>
      </div>
    </div>
  );
}

// ─── LOGIN ────────────────────────────────────────────────────────────────────
function Login({ go, showToast }) {
  const [mode,setMode]=useState("login"); const [email,setEmail]=useState(""); const [pass,setPass]=useState("");
  const [passConfirm,setPCfm]=useState(""); const [name,setName]=useState(""); const [loc,setLoc]=useState("");
  const [tos,setTos]=useState(false); const [loading,setLoading]=useState(false); const [regState,setRegState]=useState("idle");

  function sw(m){setMode(m);setEmail("");setPass("");setPCfm("");setName("");setLoc("");setTos(false);}
  function ve(e){return/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(e);}

  async function doLogin() {
    if(!ve(email)){showToast("Adj meg érvényes email címet!","error");return;}
    if(pass.length<6){showToast("A jelszónak legalább 6 karakter kell!","error");return;}
    setLoading(true);
    const {error}=await supabase.auth.signInWithPassword({email,password:pass});
    setLoading(false);
    if(error){
      if(error.message.includes("Invalid login")||error.message.includes("invalid_credentials"))showToast("Hibás email cím vagy jelszó.","error");
      else if(error.message.includes("Email not confirmed"))showToast("Erősítsd meg az email címed!","info");
      else showToast(error.message,"error");
    }else go("home");
  }
  async function doRegister() {
    if(!name.trim()){showToast("Add meg a felhasználóneved!","error");return;}
    if(!ve(email)){showToast("Adj meg érvényes email címet!","error");return;}
    if(pass.length<6){showToast("A jelszónak legalább 6 karakter kell!","error");return;}
    if(pass!==passConfirm){showToast("A két jelszó nem egyezik!","error");return;}
    if(!tos){showToast("El kell fogadnod az ÁSZF-et!","error");return;}
    setLoading(true);
    const {data:sd,error}=await supabase.auth.signUp({email,password:pass,options:{data:{name,location:loc}}});
    if(error){setLoading(false);showToast(error.message.includes("already registered")?"Ez az email már regisztrált!":error.message,"error");return;}
    if(sd.session){
      await supabase.from("profiles").upsert({id:sd.user.id,name:name.trim(),location:loc.trim(),email,bio:"",verified:false,rating:0,rating_count:0,sales:0});
      setLoading(false);showToast("Sikeres regisztráció! Üdv a Scentrade-n!","success");
      setTimeout(()=>window.location.reload(),900);
    }else{
      if(sd.user)await supabase.from("profiles").upsert({id:sd.user.id,name:name.trim(),location:loc.trim(),email,bio:"",verified:false,rating:0,rating_count:0,sales:0});
      setLoading(false);setRegState("confirm");
    }
  }

  // iOS FIX: fontSize 16px – ez alatt iOS automatikusan zoomol és ledobja a billentyűzetet
  const inp={background:B.card,border:`1px solid ${B.bor}`,color:T.h,padding:"13px 16px",borderRadius:9,fontFamily:"'DM Mono',monospace",fontSize:16,width:"100%",boxSizing:"border-box",outline:"none",marginBottom:10};
  const lbl={fontFamily:"'DM Mono',monospace",fontSize:9,color:T.sec,letterSpacing:2,display:"block",marginBottom:6,textTransform:"uppercase"};

  if(regState==="confirm")return(
    <div style={{ paddingTop:60,minHeight:"100vh",display:"flex",alignItems:"center",justifyContent:"center" }}>
      <div style={{ background:B.card,border:`1px solid ${B.bor}`,borderRadius:18,padding:"56px 48px",width:440,textAlign:"center",boxShadow:"0 28px 80px #00000070" }}>
        <div style={{ fontSize:56,marginBottom:22 }}>✉</div>
        <h2 style={{ fontFamily:"'Playfair Display',serif",fontSize:30,color:T.h,fontWeight:400,marginBottom:16 }}>Erősítsd meg az email címed</h2>
        <p style={{ color:T.sec,fontFamily:"'DM Mono',monospace",fontSize:12,lineHeight:2,marginBottom:32 }}>Küldtünk egy megerősítő linket ide:<br/><span style={{ color:ACC.gold }}>{email}</span><br/><br/>Klikkelj a linkre, majd lépj be!</p>
        <button onClick={()=>{setMode("login");setRegState("idle");}} style={{ background:`linear-gradient(135deg,${ACC.gold},#8a5f1a)`,border:"none",color:T.inv,padding:"14px",width:"100%",borderRadius:9,cursor:"pointer",fontFamily:"'Playfair Display',serif",fontSize:17,fontWeight:700,marginBottom:14 }}>Bejelentkezéshez →</button>
        <p style={{ color:T.ter,fontSize:11,fontFamily:"'DM Mono',monospace",cursor:"pointer" }} onClick={()=>setRegState("idle")}>Vissza a regisztrációhoz</p>
      </div>
    </div>
  );

  return(
    <div style={{ paddingTop:60,minHeight:"100vh",display:"flex",alignItems:"center",justifyContent:"center",padding:"80px 24px" }}>
      <div style={{ background:B.card,border:`1px solid ${B.bor}`,borderRadius:18,padding:"56px 48px",width:"100%",maxWidth:460,boxShadow:"0 28px 80px #00000070" }}>
        <div style={{ textAlign:"center",marginBottom:40 }}>
          <span style={{ fontSize:40,color:ACC.gold }}>◈</span>
          <h2 style={{ fontFamily:"'Playfair Display',serif",fontSize:34,color:T.h,fontWeight:400,marginTop:10 }}>{mode==="login"?"Belépés":"Regisztráció"}</h2>
        </div>
        <div style={{ display:"flex",background:B.main,borderRadius:9,padding:3,marginBottom:30 }}>
          {[["login","Belépés"],["register","Regisztráció"]].map(([m,l])=>(
            <button key={m} onClick={()=>sw(m)} style={{ flex:1,padding:"9px",borderRadius:7,border:"none",cursor:"pointer",background:mode===m?B.hover:"transparent",color:mode===m?ACC.gold:T.ter,fontFamily:"'DM Mono',monospace",fontSize:10,letterSpacing:1,transition:"all .15s" }}>{l}</button>
          ))}
        </div>
        {mode==="register"&&(<><label style={lbl}>Felhasználónév *</label><input value={name} onChange={e=>setName(e.target.value)} placeholder="pl. illatmester_bp" style={inp}/><label style={lbl}>Helyszín</label><input value={loc} onChange={e=>setLoc(e.target.value)} placeholder="pl. Budapest" style={inp}/></>)}
        <label style={lbl}>Email cím *</label>
        <input value={email} onChange={e=>setEmail(e.target.value)} placeholder="pelda@email.hu" type="email" style={inp}/>
        <label style={lbl}>Jelszó *</label>
        <input value={pass} onChange={e=>setPass(e.target.value)} placeholder="••••••••" type="password" onKeyDown={e=>e.key==="Enter"&&mode==="login"&&doLogin()} style={inp}/>
        {mode==="register"&&(
          <>
            <label style={lbl}>Jelszó mégegyszer *</label>
            <input value={passConfirm} onChange={e=>setPCfm(e.target.value)} placeholder="••••••••" type="password" onKeyDown={e=>e.key==="Enter"&&doRegister()} style={{...inp,border:`1px solid ${passConfirm&&passConfirm!==pass?ACC.red+"55":B.bor}`}}/>
            {passConfirm&&passConfirm!==pass&&<p style={{ color:ACC.red,fontFamily:"'DM Mono',monospace",fontSize:10,marginTop:-6,marginBottom:10 }}>A jelszavak nem egyeznek</p>}
            <div style={{ marginTop:10,marginBottom:22 }}>
              <label style={{ display:"flex",gap:13,alignItems:"flex-start",cursor:"pointer" }}>
                <div onClick={()=>setTos(v=>!v)} style={{ width:20,height:20,borderRadius:5,flexShrink:0,marginTop:1,background:tos?ACC.goldLo:B.card,border:`1.5px solid ${tos?ACC.gold:B.bor}`,display:"flex",alignItems:"center",justifyContent:"center",cursor:"pointer",transition:"all .15s" }}>
                  {tos&&<span style={{ color:ACC.gold,fontSize:12,fontWeight:700 }}>✓</span>}
                </div>
                <span style={{ fontFamily:"'DM Mono',monospace",fontSize:11,color:T.sec,lineHeight:1.7 }}>
                  Elfogadom az <a href="#aszf" onClick={e=>e.stopPropagation()} style={{ color:ACC.gold,textDecoration:"underline" }}>ÁSZF</a>-t és az <a href="#adatkezeles" onClick={e=>e.stopPropagation()} style={{ color:ACC.gold,textDecoration:"underline" }}>Adatkezelési tájékoztatót</a>. *
                </span>
              </label>
            </div>
          </>
        )}
        <button onClick={mode==="login"?doLogin:doRegister} disabled={loading||(mode==="register"&&!tos)}
          style={{ background:(mode==="register"&&!tos)?"#3a2810":`linear-gradient(135deg,${ACC.gold},#8a5f1a)`,border:"none",color:(mode==="register"&&!tos)?T.ter:T.inv,padding:"15px",width:"100%",borderRadius:9,cursor:(mode==="register"&&!tos)?"not-allowed":"pointer",fontFamily:"'Playfair Display',serif",fontSize:19,fontWeight:700,marginBottom:16,marginTop:mode==="login"?16:0,opacity:loading?.6:1,transition:"all .2s" }}>
          {loading?"...":mode==="login"?"Belépés →":"Regisztráció →"}
        </button>
        <p style={{ color:T.ter,fontSize:11,fontFamily:"'DM Mono',monospace",textAlign:"center",cursor:"pointer",letterSpacing:1 }} onClick={()=>sw(mode==="login"?"register":"login")}>
          {mode==="login"?"MÉG NINCS FIÓKOD? → REGISZTRÁLJ":"MÁR VAN FIÓKOD? → LÉPJ BE"}
        </p>
      </div>
    </div>
  );
}

// ─── ROOT ─────────────────────────────────────────────────────────────────────
export default function App() {
  const {user,profile,loading}=useAuth();
  const [page,setPage]=useState("home"); const [listings,setListings]=useState([]); const [profiles,setProfiles]=useState({});
  const [selId,setSelId]=useState(null); const [profileId,setProfileId]=useState(null);
  const [activeChatWith,setACW]=useState(null); const [unread,setUnread]=useState(0);
  const {show:showToast,ToastContainer}=useToast();

  useEffect(()=>{loadListings();},[]);
  useEffect(()=>{if(profile){loadUnread();return setupUnreadSub();}},[profile?.id]);

  async function loadListings() {
    const {data}=await supabase.from("listings").select("*").order("created_at",{ascending:false});
    if(!data)return;setListings(data);
    const ids=[...new Set(data.map(l=>l.user_id))];
    if(ids.length){const {data:pd}=await supabase.from("profiles").select("*").in("id",ids);if(pd){const m={};pd.forEach(p=>{m[p.id]=p;});setProfiles(m);}}
  }
  async function loadUnread() {
    if(!profile)return;
    const {count}=await supabase.from("messages").select("*",{count:"exact",head:true}).eq("to_user",profile.id).eq("read",false);
    setUnread(count||0);
  }
  function setupUnreadSub() {
    if(!profile)return;
    const sub=supabase.channel("unread-"+profile.id).on("postgres_changes",{event:"*",schema:"public",table:"messages",filter:`to_user=eq.${profile.id}`},()=>loadUnread()).subscribe();
    return ()=>supabase.removeChannel(sub);
  }
  function handleStatusChange(lid,s){setListings(p=>p.map(l=>l.id===lid?{...l,status:s}:l));}
  async function signOut(){await supabase.auth.signOut();setPage("home");}
  function go(p){if(p==="sell"&&!profile){setPage("guest_wall");window.scrollTo(0,0);return;}setPage(p);window.scrollTo(0,0);}

  const selListing=listings.find(l=>l.id===selId);
  const profileUser=profileId?profiles[profileId]:null;
  const allProfiles=profile?{...profiles,[profile.id]:profile}:profiles;

  if(loading)return(
    <div style={{ background:B.deep,minHeight:"100vh",display:"flex",alignItems:"center",justifyContent:"center" }}>
      <span style={{ color:ACC.gold,fontFamily:"'Playfair Display',serif",fontSize:26,animation:"pulse 1.2s ease infinite" }}>◈</span>
    </div>
  );

  return(
    <div style={{ background:B.main,minHeight:"100vh",color:T.h }}>
      <style>{`
        @import url('https://fonts.googleapis.com/css2?family=Playfair+Display:ital,wght@0,400;0,600;0,700;1,400&family=DM+Mono:wght@400;500;700&display=swap');
        *,*::before,*::after{box-sizing:border-box;margin:0;padding:0;}
        body{background:#0e0b08;}
        input,textarea,select{font-size:16px!important;}
        input::placeholder,textarea::placeholder{color:#3d2e1e;}
        ::-webkit-scrollbar{width:4px;}
        ::-webkit-scrollbar-track{background:#080604;}
        ::-webkit-scrollbar-thumb{background:#241c12;border-radius:2px;}
        select option{background:#151009;color:#f5ead8;}
        button{transition:opacity .15s,background .15s,border-color .15s,color .15s;}
        button:hover{opacity:.88;}
        input[type=range]::-webkit-slider-thumb{appearance:none;width:18px;height:18px;border-radius:50%;background:#d4a84b;cursor:pointer;border:2px solid #0e0b08;box-shadow:0 0 10px #d4a84b60;}
        input[type=range]::-moz-range-thumb{width:18px;height:18px;border-radius:50%;background:#d4a84b;cursor:pointer;border:2px solid #0e0b08;}
        @keyframes slideUp{from{transform:translateY(16px);opacity:0}to{transform:translateY(0);opacity:1}}
        @keyframes pulse{0%,100%{opacity:.3}50%{opacity:1}}
        a{color:inherit;}
      `}</style>
      <Nav profile={profile||(user?{name:user.email}:null)} page={page} go={go} openLogin={()=>go("login")} unreadCount={unread}/>
      <ToastContainer/>
      {page==="home"        &&<Home go={go} listings={listings} profiles={allProfiles}/>}
      {page==="market"      &&<Market listings={listings} profiles={allProfiles} go={go} setSelId={setSelId}/>}
      {page==="detail"      &&selListing&&<Detail l={selListing} u={allProfiles[selListing.user_id]} curProfile={profile} go={go} setProfileId={setProfileId} setActiveChatWith={setACW} onStatusChange={handleStatusChange}/>}
      {page==="profile"     &&profileUser&&<Profile pu={profileUser} curProfile={profile} go={go} listings={listings} setActiveChatWith={setACW} onSignOut={signOut}/>}
      {page==="profile_own" &&profile    &&<Profile pu={profile} curProfile={profile} go={go} listings={listings} setActiveChatWith={setACW} onSignOut={signOut}/>}
      {page==="messages"    &&profile    &&<Messages curProfile={profile} profiles={allProfiles} activeChatWith={activeChatWith} setActiveChatWith={setACW}/>}
      {page==="sell"        &&profile    &&<Sell curProfile={profile} go={go} setListings={setListings} showToast={showToast}/>}
      {page==="guest_wall"  &&            <GuestWall go={go}/>}
      {page==="login"       &&            <Login go={go} showToast={showToast}/>}
    </div>
  );
}
