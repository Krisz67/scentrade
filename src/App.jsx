import { useState, useEffect, useRef } from "react";
import { supabase } from "./supabase";

// ─── DESIGN TOKENS ────────────────────────────────────────────────────────────
const T = {
  h:   "#f5ead8",  // heading – meleg krém
  pri: "#d4a84b",  // primary gold
  sec: "#9a8060",  // secondary – bézs
  ter: "#6b5540",  // tertiary
  dim: "#3d2e1e",  // dimmed / placeholder
  inv: "#0d0a06",  // inverse
};

const B = {
  deep:  "#080604",
  main:  "#0e0b08",
  card:  "#151009",
  hover: "#1c1510",
  bor:   "#241c12",
  borHi: "#2e2418",
};

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

// ─── AUTH HOOK ────────────────────────────────────────────────────────────────
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
  return { user, profile, loading, setProfile };
}

// ─── NEW FEATURE: PERFUME PYRAMID (ILLATJEGY VIZUALIZÁCIÓ) ─────────────────────
function PerfumePyramid({ notes }) {
  const defaultNotes = {
    top: ["Bergamott", "Mandarin", "Bors"],
    heart: ["Jázmin", "Rózsa", "Patchouli"],
    base: ["Vanília", "Ámbra", "Pézsma", "Szantálfa"]
  };
  const activeNotes = notes || defaultNotes;

  const rowStyle = { display: "flex", flexDirection: "column", alignItems: "center", padding: "12px", borderBottom: `1px solid ${B.bor}`, position: "relative" };
  const labelStyle = { fontFamily: "'DM Mono',monospace", fontSize: 9, color: ACC.gold, letterSpacing: 2, textTransform: "uppercase", marginBottom: 6 };
  const tagsContainer = { display: "flex", gap: 6, flexWrap: "wrap", justifyContent: "center" };

  return (
    <div style={{ background: B.card, border: `1px solid ${B.bor}`, borderRadius: 14, overflow: "hidden", marginTop: 24 }}>
      <div style={{ padding: "16px 20px 8px", borderBottom: `1px solid ${B.bor}`, background: B.main }}>
        <span style={{ fontFamily: "'Playfair Display',serif", fontSize: 16, color: T.h }}>Illatpiramis & Jegyek</span>
      </div>
      
      {/* Fejjegy - Csúcs */}
      <div style={{ ...rowStyle, background: "rgba(212,168,75,0.02)" }}>
        <div style={labelStyle}>Fejjegy (Első benyomás)</div>
        <div style={tagsContainer}>
          {activeNotes.top.map(n => <span key={n} style={{ fontSize: 12, color: T.h, background: B.borHi, padding: "3px 9px", borderRadius: 4 }}>🍋 {n}</span>)}
        </div>
      </div>

      {/* Szívjegy - Közép */}
      <div style={{ ...rowStyle, background: "rgba(212,168,75,0.04)" }}>
        <div style={labelStyle}>Szívjegy (A parfüm lelke)</div>
        <div style={tagsContainer}>
          {activeNotes.heart.map(n => <span key={n} style={{ fontSize: 12, color: T.h, background: B.borHi, padding: "3px 9px", borderRadius: 4 }}>🌸 {n}</span>)}
        </div>
      </div>

      {/* Alapjegy - Alap */}
      <div style={{ ...rowStyle, borderBottom: "none", background: "rgba(212,168,75,0.06)" }}>
        <div style={labelStyle}>Alapjegy (Tartósság)</div>
        <div style={tagsContainer}>
          {activeNotes.base.map(n => <span key={n} style={{ fontSize: 12, color: T.h, background: B.borHi, padding: "3px 9px", borderRadius: 4 }}>🪵 {n}</span>)}
        </div>
      </div>
    </div>
  );
}

// ─── NEW FEATURE: SMART MATCH INDEX (SZEMÉLYRE SZABOTT ILLATEGYEZÉS) ───────────
function SmartMatchIndex({ listing, wishlist }) {
  if (!wishlist || wishlist.length === 0) return null;

  // Egyszerű de hatékony relevanciagenerátor a márkanév vagy kulcsszavak alapján
  const hasBrandMatch = wishlist.some(w => w.raw?.toLowerCase().includes(listing.brand?.toLowerCase()));
  const hasNameMatch  = wishlist.some(w => w.raw?.toLowerCase().includes(listing.name?.toLowerCase()));
  
  let matchPercentage = 35; // Alap bázis egyezés ha a kategória egyezik
  if (hasBrandMatch) matchPercentage += 35;
  if (hasNameMatch) matchPercentage += 25;
  if (matchPercentage > 95) matchPercentage = 98; // Luxus kerekítés

  const getColor = (pct) => pct >= 75 ? ACC.green : pct >= 50 ? ACC.gold : T.sec;

  return (
    <div style={{ background: `${getColor(matchPercentage)}08`, border: `1px solid ${getColor(matchPercentage)}33`, borderRadius: 12, padding: "14px 18px", display: "flex", alignItems: "center", justifyContent: "space-between", marginBottom: 16 }}>
      <div>
        <div style={{ fontFamily: "'Playfair Display',serif", fontSize: 16, color: T.h, display: "flex", alignItems: "center", gap: 6 }}>
          ✨ {matchPercentage}% Match
        </div>
        <div style={{ fontFamily: "'DM Mono',monospace", fontSize: 9, color: T.sec, marginTop: 2 }}>ILLATEGYEZÉSI INDEX AZ ÍZLÉSEDDEL</div>
      </div>
      <div style={{ width: 44, height: 44, borderRadius: "50%", border: `2px solid ${getColor(matchPercentage)}22`, display: "flex", alignItems: "center", justifyContent: "center", position: "relative" }}>
        <svg width="44" height="44" viewBox="0 0 44 44" style={{ transform: "rotate(-90deg)", position: "absolute", top: -2, left: -2 }}>
          <circle cx="22" cy="22" r="20" fill="none" stroke={getColor(matchPercentage)} strokeWidth="2" strokeDasharray="125" strokeDashoffset={125 - (125 * matchPercentage) / 100} style={{ transition: "stroke-dashoffset 1s ease" }}/>
        </svg>
        <span style={{ fontSize: 11, fontWeight: "bold", color: getColor(matchPercentage) }}>★</span>
      </div>
    </div>
  );
}

// ─── NEW FEATURE: MARKET PRICE INDEX (PIACI ÁR JELZŐ) ─────────────────────────
function MarketPriceIndex({ currentPrice, brand, allListings }) {
  // Kiszámolja az azonos márkájú parfümök átlagárát a platformon futó adatokból
  const brandListings = allListings.filter(l => l.brand?.toLowerCase() === brand?.toLowerCase() && l.price);
  if (brandListings.length < 2) return null; // Nincs elég adat az összehasonlításhoz

  const avgPrice = brandListings.reduce((sum, l) => sum + l.price, 0) / brandListings.length;
  const diffPct = ((currentPrice - avgPrice) / avgPrice) * 100;

  let statusText = "Átlagos piaci ár";
  let statusColor = ACC.gold;
  if (diffPct < -12) { statusText = "Kifejezetten jó ár (Átlag alatt)"; statusColor = ACC.green; }
  else if (diffPct > 12) { statusText = "Prémium árazás (Átlag felett)"; statusColor = ACC.blue; }

  return (
    <div style={{ marginTop: 8, marginBottom: 18 }}>
      <div style={{ display: "flex", justifyContent: "space-between", fontSize: 10, fontFamily: "'DM Mono',monospace", color: T.ter, marginBottom: 4 }}>
        <span>PIACI REZONANCIA:</span>
        <span style={{ color: statusColor, fontWeight: 700 }}>{statusText}</span>
      </div>
      <div style={{ height: 4, background: B.borHi, borderRadius: 2, position: "relative" }}>
        <div style={{ position: "absolute", left: `${Math.min(90, Math.max(10, 50 + diffPct))}%`, top: -3, width: 10, height: 10, borderRadius: "50%", background: statusColor, boxShadow: `0 0 8px ${statusColor}` }}/>
      </div>
    </div>
  );
}

// ─── HELPERS & LIQUID SLIDERS ──────────────────────────────────────────────────
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
            <rect x="10" y={liqY} width="60" height={liqH+10} fill="url(#sl-l)" style={{transition:"y .5s, height .5s"}}/>
          </g>
          <path d="M18 40 Q14 44 12 52 L10 148 Q10 152 14 152 L66 152 Q70 152 70 148 L68 52 Q66 44 62 40 Z" fill="url(#sl-s)"/>
        </svg>
      </div>
      <div style={{ flex: 1 }}>
        <div style={{ fontFamily: "'Playfair Display',serif", fontSize: 20, color: T.h, marginBottom: 4 }}>{fillLbl(pct)}</div>
        <input type="range" min={1} max={100} value={pct} onChange={e => onChange(Number(e.target.value))}
          style={{ width:"100%",height:5,appearance:"none",background:`linear-gradient(90deg,${ACC.gold} ${pct}%,${B.borHi} ${pct}%)`,borderRadius:3,outline:"none",cursor:"pointer"}}/>
      </div>
    </div>
  );
}

function BottleCompact({ pct = 90 }) {
  const liq = bottleLiq(pct); const liqH=(pct/100)*108; const liqY=40+(108-liqH);
  return (
    <div style={{ display:"flex",alignItems:"center",gap:10,marginBottom:12 }}>
      <svg width="22" height="70" viewBox="0 0 80 160" fill="none">
        <defs><clipPath id="cp-c"><path d="M18 40 Q14 44 12 52 L10 148 Q10 152 14 152 L66 152 Q70 152 70 148 L68 52 Q66 44 62 40 Z"/></clipPath></defs>
        <rect x="28" y="6" width="24" height="14" rx="3" fill="#1e1a13" stroke="#2e2418" strokeWidth="1"/>
        <path d="M18 40 Q14 44 12 52 L10 148 Q10 152 14 152 L66 152 Q70 152 70 148 L68 52 Q66 44 62 40 Z" fill="#0f0d09" stroke="#2a2218" strokeWidth="1.5"/>
        <g clipPath="url(#cp-c)"><rect x="10" y={liqY} width="60" height={liqH+10} fill="url(#sl-l)"/></g>
      </svg>
      <div><div style={{ fontFamily:"'Playfair Display',serif",fontSize:17,color:ACC.gold }}>{pct}%</div></div>
    </div>
  );
}

function BottleDetail({ pct = 90 }) {
  const liq = bottleLiq(pct); const liqH=(pct/100)*108; const liqY=40+(108-liqH);
  return (
    <div style={{ background:B.card,border:`1px solid ${B.bor}`,borderRadius:12,padding:"18px 22px",display:"flex",alignItems:"center",gap:22,marginBottom:28 }}>
      <svg width="52" height="104" viewBox="0 0 80 160" fill="none">
        <defs><clipPath id="dt-c"><path d="M18 40 Q14 44 12 52 L10 148 Q10 152 14 152 L66 152 Q70 152 70 148 L68 52 Q66 44 62 40 Z"/></clipPath></defs>
        <rect x="28" y="6" width="24" height="14" rx="3" fill="#1e1a13" stroke="#2e2418" strokeWidth="1"/>
        <g clipPath="url(#dt-c)"><rect x="10" y={liqY} width="60" height={liqH+10} fill="#c9952a"/></g>
      </svg>
      <div><div style={{ fontFamily:"'Playfair Display',serif",fontSize:26,color:ACC.gold }}>{pct}% tele</div></div>
    </div>
  );
}

// ─── TOAST HOOK ───────────────────────────────────────────────────────────────
function useToast() {
  const [t, setT] = useState(null);
  const show = (m, type="error") => { setT({ m, type }); setTimeout(() => setT(null), 4000); };
  const Container = () => t ? (
    <div style={{ position:"fixed", bottom: 24, right: 24, zIndex: 9999, background: t.type==="error"?"#2a0e0e":"#0c2414", border:`1px solid ${ACC.gold}`, padding:"12px 24px", borderRadius:8, fontFamily:"'DM Mono',monospace", fontSize:12, color:"#fff" }}>{t.m}</div>
  ) : null;
  return { show, ToastContainer: Container };
}

// ─── NAVIGÁCIÓ ────────────────────────────────────────────────────────────────
function Nav({ profile, page, go, openLogin, unreadCount }) {
  const rank = getRank(profile?.sales || 0);
  return (
    <nav style={{ position:"fixed",top:0,left:0,right:0,zIndex:100,height:60,background:"rgba(8,6,4,.97)",backdropFilter:"blur(20px)",borderBottom:`1px solid ${B.bor}`,display:"flex",alignItems:"center",justifyContent:"space-between",padding:"0 32px" }}>
      <div onClick={()=>go("home")} style={{ cursor:"pointer",display:"flex",alignItems:"center",gap:10 }}>
        <span style={{ fontFamily:"'Playfair Display',serif",fontSize:22,fontWeight:700,color:ACC.gold,letterSpacing:2 }}>SCENTRADE</span>
      </div>
      <div style={{ display:"flex",gap:4,alignItems:"center" }}>
        {[["home","Főoldal"],["market","Piac"],["sell","+ Hirdetés"]].map(([p,l])=>(
          <button key={p} onClick={()=>go(p)} style={{ background:page===p?ACC.goldLo:"transparent",border:"none",color:page===p?ACC.gold:T.sec,padding:"7px 14px",borderRadius:7,cursor:"pointer",fontFamily:"'DM Mono',monospace",fontSize:10 }}>{l}</button>
        ))}
        {profile ? (
          <button onClick={()=>go("profile_own")} style={{ background:"transparent",border:`1px solid ${rank.color}35`,borderRadius:22,padding:"3px 12px",cursor:"pointer",color:"#fff" }}>Mon Profil</button>
        ) : (
          <button onClick={openLogin} style={{ background:ACC.gold,border:"none",color:T.inv,padding:"8px 16px",borderRadius:7,cursor:"pointer" }}>Belépés</button>
        )}
      </div>
    </nav>
  );
}

// ─── CARD KOMPONENS ───────────────────────────────────────────────────────────
function Card({ l, u, onClick }) {
  return (
    <div onClick={onClick} style={{ background:B.card,border:`1px solid ${B.bor}`,borderRadius:14,padding:"22px 20px",cursor:"pointer",display:"flex",flexDirection:"column" }}>
      <div style={{ display:"flex",gap:6,marginBottom:10 }}><Pill text={l.brand}/></div>
      <div style={{ fontFamily:"'Playfair Display',serif",fontSize:19,color:T.h,fontWeight:600 }}>{l.name}</div>
      <div style={{ fontFamily:"'Playfair Display',serif",fontSize:21,color:ACC.gold,marginTop:12 }}>{(l.price||0).toLocaleString()} Ft</div>
    </div>
  );
}

// ─── HOME (FŐOLDAL) ───────────────────────────────────────────────────────────
function Home({ go, listings }) {
  return (
    <div style={{ paddingTop:120, textAlign:"center" }}>
      <h1 style={{ fontFamily:"'Playfair Display',serif", fontSize:64, color:T.h }}>Elegancia & Illat.</h1>
      <button onClick={()=>go("market")} style={{ background:ACC.gold, border:"none", padding:"14px 28px", borderRadius:8, cursor:"pointer", marginTop:24 }}>Piac megtekintése</button>
    </div>
  );
}

// ─── MARKET (PIACOT BÖNGÉSZŐ OLDAL) ─────────────────────────────────────────────
function Market({ listings, profiles, go, setSelId }) {
  return (
    <div style={{ paddingTop:80, padding:"40px" }}>
      <div style={{ display:"grid", gridTemplateColumns:"repeat(auto-fill,minmax(250px,1fr))", gap:20 }}>
        {listings.map(l => <Card key={l.id} l={l} u={profiles[l.user_id]} onClick={()=>{setSelId(l.id); go("detail");}} />)}
      </div>
    </div>
  );
}

// ─── DETAIL (ADATLAP + 3 ÚJ INTEGRÁLT FEATURE VIZUÁLISAN) ──────────────────────
function Detail({ l, u, curProfile, go, wishlist, allListings }) {
  return (
    <div style={{ paddingTop:100, maxWidth:900, margin:"0 auto", padding:"0 20px" }}>
      <button onClick={()=>go("market")} style={{ background:"none", border:"none", color:T.sec, cursor:"pointer", marginBottom:20 }}>← Vissza</button>
      
      {/* FEATURE 2: Smart Match Index a jobb oszlop vagy kiemelt fejléc felett */}
      <SmartMatchIndex listing={l} wishlist={wishlist} />

      <div style={{ display:"grid", gridTemplateColumns:"1fr 320px", gap:40 }}>
        <div>
          <span style={{ fontFamily:"'DM Mono',monospace", color:T.sec }}>{l.brand}</span>
          <h1 style={{ fontFamily:"'Playfair Display',serif", fontSize:44, color:T.h, margin:"8px 0" }}>{l.name}</h1>
          
          <div style={{ fontSize:32, color:ACC.gold, fontWeight:"bold" }}>
            {l.price?.toLocaleString()} Ft
          </div>
          
          {/* FEATURE 3: Market Price Index közvetlenül az ár alatt */}
          <MarketPriceIndex currentPrice={l.price} brand={l.brand} allListings={allListings} />

          <p style={{ color:T.h, lineHeight:1.8, marginTop:20 }}>{l.description}</p>
          
          {/* FEATURE 1: Parfüm Piramis az illatjegyek vizuális lebontásához */}
          <PerfumePyramid notes={l.notes} />
        </div>

        <div style={{ background:B.card, padding:20, borderRadius:12, height:"fit-content" }}>
          <div style={{ fontFamily:"'Playfair Display',serif", fontSize:20, color:T.h, marginBottom:10 }}>Eladó: {u?.name}</div>
          <Stars v={u?.rating || 5} />
          <button style={{ width:"100%", background:ACC.gold, border:"none", padding:12, borderRadius:8, marginTop:20, fontWeight:"bold" }}>Kapcsolatfelvétel</button>
        </div>
      </div>
    </div>
  );
}

// ─── PROFILE (PROFIL ÉS KÍVÁNSÁGLISTA ELEMEK) ──────────────────────────────────
function Profile({ pu, curProfile, wishlist, onAddWish, onRemoveWish }) {
  const wishRef = useRef(null);
  return (
    <div style={{ paddingTop:100, maxWidth:600, margin:"0 auto" }}>
      <h1 style={{ fontFamily:"'Playfair Display',serif", color:T.h }}>{pu.name} profilja</h1>
      <div style={{ marginTop:40 }}>
        <h3>Kívánságlistád (Befolyásolja a Smart Match funkciót)</h3>
        <div style={{ display:"flex", gap:10, margin:"15px 0" }}>
          <input ref={wishRef} placeholder="Márka vagy konkrét illat..." style={{ flex:1, background:B.card, border:`1px solid ${B.bor}`, padding:12, borderRadius:6, color:"#fff" }} />
          <button onClick={()=>{onAddWish(wishRef.current.value); wishRef.current.value="";}} style={{ background:ACC.gold, border:"none", padding:"0 20px", borderRadius:6 }}>Hozzáad</button>
        </div>
        <div>
          {wishlist.map(w => (
            <div key={w.id} style={{ background:B.card, padding:12, marginBottom:8, borderRadius:6, display:"flex", justifyContent:"space-between" }}>
              <span>🌟 {w.raw}</span>
              <button onClick={()=>onRemoveWish(w.id)} style={{ background:"none", border:"none", color:ACC.red, cursor:"pointer" }}>Törlés</button>
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}

// ─── APP (FŐ VEZÉRLŐ) ──────────────────────────────────────────────────────────
export default function App() {
  const [page, setPage] = useState("home");
  const { profile, loading: authLoading } = useAuth();
  const [listings, setListings] = useState([]);
  const [profiles, setProfiles] = useState({});
  const [selectedId, setSelId] = useState(null);
  const [wishlist, setWishlist] = useState([]);
  const { show, ToastContainer } = useToast();

  useEffect(() => {
    // Mock vagy Supabase adatok feltöltése demonstrációs jelleggel
    const mockListings = [
      { id: 1, user_id: "u1", brand: "Creed", name: "Aventus", price: 78000, description: "Klasszikus prémium tétel, félig üvegben.", notes: { top: ["Ananász", "Bergamott"], heart: ["Nyírfa", "Patchouli"], base: ["Pézsma", "Tölgymoha"] } },
      { id: 2, user_id: "u1", brand: "Creed", name: "Green Irish Tweed", price: 62000, description: "Friss, elegáns, tavaszi zöld illat.", notes: { top: ["Citrom", "Verbena"], heart: ["Ibolya levelek"], base: ["Szantálfa", "Ámbra"] } },
      { id: 3, user_id: "u2", brand: "Tom Ford", name: "Lost Cherry", price: 85000, description: "Édes, likőrös cseresznye.", notes: { top: ["Meggy", "Keserű mandula"], heart: ["Szilva", "Török rózsa"], base: ["Tonkabab", "Vanília"] } }
    ];
    setListings(mockListings);
    setProfiles({ u1: { name: "Gábor_Illat", sales: 12, rating: 4.8 }, u2: { name: "NicheGoddess", sales: 2, rating: 5.0 } });
  }, []);

  const handleAddWish = (val) => {
    if(!val) return;
    setWishlist(p => [...p, { id: Date.now(), raw: val }]);
    show("Kívánságlista frissítve! Az Illategyezés azonnal kalkulálódik.", "success");
  };

  const handleRemoveWish = (id) => {
    setWishlist(p => p.filter(w => w.id !== id));
  };

  if (authLoading) return <div style={{ background:B.deep, minHeight:"100vh" }}/>;
  const currentListing = listings.find(l => l.id === selectedId);

  return (
    <div style={{ background: B.deep, color: T.sec, minHeight: "100vh", antialiased: "true" }}>
      <Nav profile={profile} page={page} go={setPage} openLogin={() => setPage("profile_own")} unreadCount={0} />
      
      {page === "home" && <Home go={setPage} listings={listings} />}
      {page === "market" && <Market listings={listings} profiles={profiles} go={setPage} setSelId={setSelId} />}
      
      {page === "detail" && currentListing && (
        <Detail l={currentListing} u={profiles[currentListing.user_id]} curProfile={profile} go={setPage} wishlist={wishlist} allListings={listings} />
      )}
      
      {page === "profile_own" && (
        <Profile pu={profile || { name: "Teszt Felhasználó" }} curProfile={profile} wishlist={wishlist} onAddWish={handleAddWish} onRemoveWish={handleRemoveWish} />
      )}

      <ToastContainer />
    </div>
  );
}
