import { useState, useEffect, useRef } from "react";
import { supabase } from "./supabase";

// ─── AUTH HOOKS ───────────────────────────────────────────────────────────────
function useAuth() {
  const [user, setUser] = useState(null);
  const [profile, setProfile] = useState(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    // persistSession: true by default in Supabase JS v2 – session is stored in localStorage automatically
    supabase.auth.getSession().then(({ data: { session } }) => {
      setUser(session?.user ?? null);
      if (session?.user) fetchProfile(session.user.id);
      else setLoading(false);
    });

    const { data: { subscription } } = supabase.auth.onAuthStateChange((_event, session) => {
      setUser(session?.user ?? null);
      if (session?.user) fetchProfile(session.user.id);
      else { setProfile(null); setLoading(false); }
    });

    return () => subscription.unsubscribe();
  }, []);

  async function fetchProfile(userId) {
    const { data } = await supabase.from("profiles").select("*").eq("id", userId).single();
    setProfile(data);
    setLoading(false);
  }

  return { user, profile, loading, refetchProfile: () => user && fetchProfile(user.id) };
}

// ─── HELPERS ──────────────────────────────────────────────────────────────────
function Stars({ v = 5, size = 13, interactive = false, onChange }) {
  const [hov, setHov] = useState(0);
  return (
    <span style={{ fontSize: size, letterSpacing: 1, cursor: interactive ? "pointer" : "default" }}>
      {[1,2,3,4,5].map(i => (
        <span key={i}
          style={{ color: i <= (hov || Math.round(v)) ? "#c9952a" : "#2a2218" }}
          onMouseEnter={() => interactive && setHov(i)}
          onMouseLeave={() => interactive && setHov(0)}
          onClick={() => interactive && onChange?.(i)}>★</span>
      ))}
    </span>
  );
}

function Ava({ u, size = 38 }) {
  const initials = u?.name ? u.name.split(" ").map(w=>w[0]).join("").slice(0,2).toUpperCase() : "?";
  return (
    <div style={{ width:size, height:size, borderRadius:"50%",
      background:"linear-gradient(135deg,#c9952a,#7a5810)",
      display:"flex", alignItems:"center", justifyContent:"center",
      fontFamily:"'Playfair Display',serif", fontWeight:700,
      fontSize:size*.36, color:"#0d0b08", flexShrink:0,
      border:"1.5px solid #c9952a50" }}>
      {initials}
    </div>
  );
}

function Pill({ text, bg="#c9952a18", col="#c9952a", size=10 }) {
  return (
    <span style={{ background:bg, color:col, fontSize:size, fontWeight:700,
      padding:"2px 9px", borderRadius:20, letterSpacing:1,
      textTransform:"uppercase", fontFamily:"'DM Mono',monospace", whiteSpace:"nowrap" }}>
      {text}
    </span>
  );
}

function FillBar({ pct }) {
  const col = pct >= 80 ? "#7effa0" : pct >= 50 ? "#ffd97e" : "#ff9e7e";
  return (
    <div>
      <div style={{ display:"flex", justifyContent:"space-between", marginBottom:4 }}>
        <span style={{ fontFamily:"'DM Mono',monospace", fontSize:10, color:"#4a3e2e", letterSpacing:1 }}>TELI SZINT</span>
        <span style={{ fontFamily:"'DM Mono',monospace", fontSize:10, color:col }}>{pct}%</span>
      </div>
      <div style={{ height:3, background:"#1e1a13", borderRadius:2 }}>
        <div style={{ height:"100%", width:`${pct}%`, background:`linear-gradient(90deg,${col}88,${col})`, borderRadius:2 }} />
      </div>
    </div>
  );
}

function Modal({ onClose, children }) {
  return (
    <div style={{ position:"fixed", inset:0, zIndex:200, background:"rgba(5,4,3,.88)",
      backdropFilter:"blur(6px)", display:"flex", alignItems:"center",
      justifyContent:"center", padding:20 }} onClick={onClose}>
      <div onClick={e=>e.stopPropagation()} style={{ background:"#100e0b",
        border:"1px solid #2a2218", borderRadius:16, padding:"36px 32px",
        width:"100%", maxWidth:520, maxHeight:"90vh", overflowY:"auto",
        boxShadow:"0 24px 80px #00000090" }}>
        {children}
      </div>
    </div>
  );
}

// ─── TOAST NOTIFICATION ───────────────────────────────────────────────────────
function Toast({ message, type = "error", onClose }) {
  useEffect(() => {
    const t = setTimeout(onClose, 4500);
    return () => clearTimeout(t);
  }, [onClose]);

  const colors = {
    error: { bg:"#2a0f0f", border:"#ff9e7e40", text:"#ff9e7e" },
    success: { bg:"#0f2a14", border:"#7effa040", text:"#7effa0" },
    info: { bg:"#0f1a2a", border:"#7ec4ff40", text:"#7ec4ff" },
  };
  const c = colors[type] || colors.error;

  return (
    <div style={{
      background:c.bg, border:`1px solid ${c.border}`,
      borderRadius:10, padding:"14px 20px", maxWidth:360,
      boxShadow:"0 8px 32px #00000060",
      animation:"slideUp .25s ease",
      display:"flex", alignItems:"flex-start", gap:12
    }}>
      <span style={{ color:c.text, fontSize:16, flexShrink:0 }}>
        {type === "success" ? "✓" : type === "info" ? "ℹ" : "✕"}
      </span>
      <p style={{ color:c.text, fontFamily:"'DM Mono',monospace", fontSize:12, lineHeight:1.6, flex:1 }}>{message}</p>
      <button onClick={onClose} style={{ background:"none", border:"none", color:c.text, cursor:"pointer", fontSize:14, opacity:.5, flexShrink:0, padding:0 }}>×</button>
    </div>
  );
}

function useToast() {
  const [toasts, setToasts] = useState([]);
  const show = (message, type = "error") => {
    const id = Date.now();
    setToasts(prev => [...prev, { id, message, type }]);
  };
  const remove = (id) => setToasts(prev => prev.filter(t => t.id !== id));
  const ToastContainer = () => (
    <div style={{ position:"fixed", bottom:28, right:28, zIndex:9999, display:"flex", flexDirection:"column", gap:10 }}>
      {toasts.map(t => <Toast key={t.id} message={t.message} type={t.type} onClose={() => remove(t.id)} />)}
    </div>
  );
  return { show, ToastContainer };
}

const COND = { mint:"Bontatlan/Mint", excellent:"Kiváló", good:"Jó", fair:"Közepes" };
const COND_COLOR = { mint:"#7effa0", excellent:"#7ed4ff", good:"#ffd97e", fair:"#ff9e7e" };
const CATS = ["Összes","woody","oriental","floral","fresh","aromatic"];
const DECANT_SIZES = [1,2,3,5,10,15,20];
const ICONS = ["✨","🏺","🫙","🌸","🌿","🍂","☀️","🌑","🥀","💀","🎷","🏔","🌊","🍋","🔥"];

// ─── NAV ──────────────────────────────────────────────────────────────────────
function Nav({ profile, page, go, openLogin, unreadCount }) {
  return (
    <nav style={{ position:"fixed", top:0, left:0, right:0, zIndex:100, height:58,
      background:"rgba(8,7,5,.95)", backdropFilter:"blur(16px)",
      borderBottom:"1px solid #c9952a18",
      display:"flex", alignItems:"center", justifyContent:"space-between", padding:"0 28px" }}>
      <div onClick={() => go("home")} style={{ cursor:"pointer", display:"flex", alignItems:"center", gap:9 }}>
        <span style={{ fontSize:20, color:"#c9952a" }}>◈</span>
        <span style={{ fontFamily:"'Playfair Display',serif", fontSize:21, fontWeight:700, color:"#c9952a", letterSpacing:2 }}>SCENTRADE</span>
        <span style={{ fontFamily:"'DM Mono',monospace", fontSize:9, color:"#3a3020", letterSpacing:3, marginTop:2 }}>HU</span>
      </div>
      <div style={{ display:"flex", gap:4, alignItems:"center" }}>
        {[["home","Főoldal"],["market","Piac"],["sell","+ Hirdetés"]].map(([p,l]) => (
          <button key={p} onClick={() => go(p)} style={{
            background:page===p?"#c9952a18":"transparent",
            border:page===p?"1px solid #c9952a38":"1px solid transparent",
            color:page===p?"#c9952a":"#6a5a40",
            padding:"6px 13px", borderRadius:6, cursor:"pointer",
            fontFamily:"'DM Mono',monospace", fontSize:10, letterSpacing:1, textTransform:"uppercase" }}>
            {l}
          </button>
        ))}
        {profile ? (
          <>
            <button onClick={() => go("messages")} style={{
              background:"transparent", border:"none", cursor:"pointer",
              color:"#6a5a40", fontSize:16, position:"relative", padding:"4px 9px" }}>
              ✉
              {unreadCount > 0 && <span style={{ position:"absolute", top:2, right:5,
                background:"#c9952a", borderRadius:"50%", width:7, height:7 }} />}
            </button>
            <button onClick={() => go("profile_own")} style={{
              background:"transparent", border:"1px solid #c9952a38", borderRadius:20,
              padding:"3px 11px 3px 4px", cursor:"pointer", display:"flex", alignItems:"center", gap:7 }}>
              <Ava u={profile} size={26} />
              <span style={{ fontFamily:"'DM Mono',monospace", fontSize:10, color:"#c9952a" }}>
                {profile.name?.split(" ")[0]}
              </span>
            </button>
          </>
        ) : (
          <button onClick={openLogin} style={{
            background:"linear-gradient(135deg,#c9952a,#7a5810)", border:"none",
            color:"#0d0b08", padding:"7px 18px", borderRadius:6, cursor:"pointer",
            fontFamily:"'DM Mono',monospace", fontSize:10, fontWeight:700, letterSpacing:1 }}>
            Belépés
          </button>
        )}
      </div>
    </nav>
  );
}

// ─── LISTING CARD ─────────────────────────────────────────────────────────────
function Card({ l, u, onClick }) {
  const [hov, setHov] = useState(false);
  const isDecant = l.listing_type === "decant";
  const isBuy = l.type === "buy";
  return (
    <div onClick={onClick}
      onMouseEnter={() => setHov(true)} onMouseLeave={() => setHov(false)}
      style={{ background:hov?"#131008":"#0f0d09",
        border:`1px solid ${hov?"#c9952a40":"#1e1a13"}`,
        borderRadius:12, padding:"20px 18px 16px", cursor:onClick?"pointer":"default",
        transition:"all .2s", transform:hov?"translateY(-2px)":"none",
        boxShadow:hov?"0 12px 40px #00000055":"none",
        display:"flex", flexDirection:"column" }}>
      <div style={{ display:"flex", gap:6, marginBottom:12, flexWrap:"wrap" }}>
        <Pill text={isBuy?"Keresett":"Eladó"} bg={isBuy?"#3a8bc418":"#c9952a18"} col={isBuy?"#6bb3d4":"#c9952a"} />
        <Pill text={isDecant?"Dekant":"Teljes üveg"} bg={isDecant?"#c87a2018":"#38a16a18"} col={isDecant?"#e09040":"#5ec98a"} />
        {l.condition && <Pill text={COND[l.condition]} bg={COND_COLOR[l.condition]+"18"} col={COND_COLOR[l.condition]} />}
      </div>
      <div style={{ fontSize:34, marginBottom:8 }}>{l.icon || "🫙"}</div>
      <div style={{ fontFamily:"'DM Mono',monospace", fontSize:10, color:"#4a3820", letterSpacing:2, marginBottom:3 }}>{(l.brand||"").toUpperCase()}</div>
      <div style={{ fontFamily:"'Playfair Display',serif", fontSize:18, color:"#f0e4cc", fontWeight:600, lineHeight:1.2, marginBottom:4 }}>{l.name}</div>
      <div style={{ fontSize:11, color:"#4a3820", marginBottom:12 }}>
        {isDecant ? `${l.decant_ml}ml dekant` : `${l.size || ""}${l.fill ? ` · ${l.fill}% tele` : ""}`}
      </div>
      {!isDecant && l.fill && <div style={{ marginBottom:14 }}><FillBar pct={l.fill} /></div>}
      <div style={{ fontFamily:"'Playfair Display',serif", fontSize:22, color:"#c9952a", marginBottom:14, marginTop:"auto" }}>
        {(l.price||0).toLocaleString("hu-HU")} Ft
        {isDecant && <span style={{ fontSize:12, color:"#7a6040", fontFamily:"'DM Mono',monospace", marginLeft:6 }}>/ {l.decant_ml}ml</span>}
      </div>
      <div style={{ display:"flex", alignItems:"center", justifyContent:"space-between" }}>
        <div style={{ display:"flex", alignItems:"center", gap:6 }}>
          <Ava u={u} size={22} />
          <span style={{ fontSize:11, color:"#7a6040" }}>{u?.name?.split(" ")[0] || "?"}</span>
          {u?.verified && <span style={{ color:"#c9952a", fontSize:10 }}>✓</span>}
        </div>
        <span style={{ fontSize:10, color:"#2e2418", fontFamily:"'DM Mono',monospace" }}>👁 {l.views||0}</span>
      </div>
    </div>
  );
}

// ─── HOME ─────────────────────────────────────────────────────────────────────
function Home({ go, listings, profiles }) {
  const featured = listings.filter(l=>l.type==="sell").slice(0,4);
  const decants = listings.filter(l=>l.listing_type==="decant").slice(0,3);
  return (
    <div style={{ paddingTop:58 }}>
      <section style={{ minHeight:"76vh", display:"flex", flexDirection:"column",
        alignItems:"center", justifyContent:"center", textAlign:"center",
        position:"relative", overflow:"hidden", padding:"80px 20px 60px" }}>
        <div style={{ position:"absolute", inset:0, background:"radial-gradient(ellipse 50% 40% at 50% 50%, #c9952a0e 0%, transparent 68%)", pointerEvents:"none" }} />
        <p style={{ fontFamily:"'DM Mono',monospace", fontSize:10, color:"#c9952a", letterSpacing:6, marginBottom:22, textTransform:"uppercase" }}>Magyar Parfüm Közösség</p>
        <h1 style={{ fontFamily:"'Playfair Display',serif", fontSize:"clamp(52px,9vw,104px)",
          fontWeight:400, color:"#f0e4cc", lineHeight:1.0, marginBottom:22, letterSpacing:-1 }}>
          Adj. Végy.<br /><em style={{ color:"#c9952a" }}>Szaglászkodj.</em>
        </h1>
        <p style={{ color:"#5a4830", fontSize:15, maxWidth:500, lineHeight:1.85, marginBottom:46 }}>
          Niche és designer parfümök, <strong style={{ color:"#9a7830" }}>dekantok</strong> és teljes üvegek biztonságos adásvételéhez.
        </p>
        <div style={{ display:"flex", gap:12, flexWrap:"wrap", justifyContent:"center" }}>
          <button onClick={() => go("market")} style={{
            background:"linear-gradient(135deg,#c9952a,#7a5810)", border:"none",
            color:"#0d0b08", padding:"15px 36px", borderRadius:7, cursor:"pointer",
            fontFamily:"'Playfair Display',serif", fontSize:17, fontWeight:700 }}>
            Böngéssz a piacon →
          </button>
          <button onClick={() => go("sell")} style={{
            background:"transparent", border:"1px solid #c9952a48",
            color:"#c9952a", padding:"15px 36px", borderRadius:7, cursor:"pointer",
            fontFamily:"'Playfair Display',serif", fontSize:17 }}>
            Hirdetést feladok
          </button>
        </div>
      </section>

      {featured.length > 0 && (
        <section style={{ padding:"64px 40px", maxWidth:1160, margin:"0 auto" }}>
          <div style={{ display:"flex", justifyContent:"space-between", alignItems:"baseline", marginBottom:34 }}>
            <h2 style={{ fontFamily:"'Playfair Display',serif", fontSize:34, color:"#f0e4cc", fontWeight:400 }}>Kiemelt eladások</h2>
            <button onClick={() => go("market")} style={{ background:"none", border:"none", color:"#c9952a", cursor:"pointer", fontFamily:"'DM Mono',monospace", fontSize:10, letterSpacing:2 }}>MIND →</button>
          </div>
          <div style={{ display:"grid", gridTemplateColumns:"repeat(auto-fill,minmax(265px,1fr))", gap:18 }}>
            {featured.map(l => <Card key={l.id} l={l} u={profiles[l.user_id]} onClick={() => {}} />)}
          </div>
        </section>
      )}

      {decants.length > 0 && (
        <section style={{ padding:"0 40px 64px", maxWidth:1160, margin:"0 auto" }}>
          <div style={{ background:"linear-gradient(135deg,#100c07,#1a1208)", border:"1px solid #c9952a20", borderRadius:16, padding:"40px 36px" }}>
            <h2 style={{ fontFamily:"'Playfair Display',serif", fontSize:30, color:"#f0e4cc", fontWeight:400, marginBottom:28 }}>Friss dekantok</h2>
            <div style={{ display:"grid", gridTemplateColumns:"repeat(auto-fill,minmax(250px,1fr))", gap:16 }}>
              {decants.map(l => <Card key={l.id} l={l} u={profiles[l.user_id]} onClick={() => {}} />)}
            </div>
          </div>
        </section>
      )}

      <footer style={{ borderTop:"1px solid #1a1610", padding:"28px 40px", textAlign:"center" }}>
        <p style={{ fontFamily:"'DM Mono',monospace", fontSize:10, color:"#2a2018", letterSpacing:2 }}>
          SCENTRADE HU · 2025 · Parfüm közösségi platform
        </p>
      </footer>
    </div>
  );
}

// ─── MARKET ───────────────────────────────────────────────────────────────────
function Market({ listings, profiles, go, setSelId }) {
  const [q, setQ] = useState("");
  const [cat, setCat] = useState("Összes");
  const [typeF, setTypeF] = useState("all");
  const [listF, setListF] = useState("all");
  const [sort, setSort] = useState("newest");

  const filtered = listings.filter(l => {
    const sq = q.toLowerCase();
    const mq = !sq || (l.brand||"").toLowerCase().includes(sq) || (l.name||"").toLowerCase().includes(sq);
    const mc = cat==="Összes" || l.category===cat;
    const mt = typeF==="all" || l.type===typeF;
    const ml = listF==="all" || l.listing_type===listF;
    return mq && mc && mt && ml;
  }).sort((a,b) => sort==="newest" ? new Date(b.created_at)-new Date(a.created_at) : sort==="price_asc" ? a.price-b.price : b.price-a.price);

  const inp = { background:"#141009", border:"1px solid #221e18", color:"#f0e4cc",
    padding:"9px 13px", borderRadius:7, fontFamily:"'DM Mono',monospace", fontSize:11, outline:"none" };

  return (
    <div style={{ paddingTop:58, minHeight:"100vh" }}>
      <div style={{ background:"#0c0a07", borderBottom:"1px solid #1a1610", padding:"26px 36px" }}>
        <div style={{ maxWidth:1160, margin:"0 auto" }}>
          <h1 style={{ fontFamily:"'Playfair Display',serif", fontSize:38, color:"#f0e4cc", fontWeight:400, marginBottom:22 }}>Piac</h1>
          <div style={{ display:"flex", gap:10, flexWrap:"wrap", alignItems:"center" }}>
            <input value={q} onChange={e=>setQ(e.target.value)} placeholder="Keresés márka, név..." style={{...inp,width:210}} />
            <select value={typeF} onChange={e=>setTypeF(e.target.value)} style={{...inp,cursor:"pointer"}}>
              <option value="all">Eladó + Keresett</option>
              <option value="sell">Csak eladó</option>
              <option value="buy">Csak keresett</option>
            </select>
            <select value={listF} onChange={e=>setListF(e.target.value)} style={{...inp,cursor:"pointer"}}>
              <option value="all">Teljes üveg + Dekant</option>
              <option value="full">Csak teljes üveg</option>
              <option value="decant">Csak dekant</option>
            </select>
            <select value={sort} onChange={e=>setSort(e.target.value)} style={{...inp,cursor:"pointer"}}>
              <option value="newest">Legújabb</option>
              <option value="price_asc">Legolcsóbb</option>
              <option value="price_desc">Legdrágább</option>
            </select>
          </div>
          <div style={{ display:"flex", gap:5, marginTop:12, flexWrap:"wrap" }}>
            {CATS.map(c => (
              <button key={c} onClick={() => setCat(c)} style={{
                background:cat===c?"#c9952a18":"transparent",
                border:cat===c?"1px solid #c9952a38":"1px solid #221e18",
                color:cat===c?"#c9952a":"#3a2e20",
                padding:"5px 12px", borderRadius:6, cursor:"pointer",
                fontFamily:"'DM Mono',monospace", fontSize:9, letterSpacing:1, textTransform:"uppercase" }}>{c}</button>
            ))}
          </div>
        </div>
      </div>
      <div style={{ padding:"30px 36px", maxWidth:1160, margin:"0 auto" }}>
        <p style={{ fontFamily:"'DM Mono',monospace", fontSize:10, color:"#2e2418", marginBottom:18, letterSpacing:1 }}>{filtered.length} HIRDETÉS</p>
        <div style={{ display:"grid", gridTemplateColumns:"repeat(auto-fill,minmax(268px,1fr))", gap:18 }}>
          {filtered.map(l => (
            <Card key={l.id} l={l} u={profiles[l.user_id]}
              onClick={() => { setSelId(l.id); go("detail"); }} />
          ))}
        </div>
        {filtered.length===0 && (
          <div style={{ textAlign:"center", padding:"80px 0", color:"#2e2418", fontFamily:"'DM Mono',monospace" }}>
            {listings.length===0 ? "Még nincsenek hirdetések. Légy az első!" : "Nincs találat."}
          </div>
        )}
      </div>
    </div>
  );
}

// ─── DETAIL ───────────────────────────────────────────────────────────────────
function Detail({ l, u, curProfile, go, setProfileId, setActiveChatWith }) {
  const [showOffer, setShowOffer] = useState(false);
  const [offerVal, setOfferVal] = useState("");
  const [faved, setFaved] = useState(false);
  const isDecant = l.listing_type === "decant";

  async function openMsg() {
    if (!curProfile) { go("login"); return; }
    setActiveChatWith(u.id);
    go("messages");
  }

  return (
    <div style={{ paddingTop:58, maxWidth:980, margin:"0 auto", padding:"80px 36px 80px" }}>
      <button onClick={() => go("market")} style={{ background:"none", border:"none", color:"#4a3820", cursor:"pointer", fontFamily:"'DM Mono',monospace", fontSize:10, letterSpacing:1, marginBottom:30 }}>← VISSZA</button>
      <div style={{ display:"grid", gridTemplateColumns:"1fr 310px", gap:40 }}>
        <div>
          <div style={{ display:"flex", gap:8, flexWrap:"wrap", marginBottom:20 }}>
            <Pill text={l.type==="buy"?"Keresett":"Eladó"} bg={l.type==="buy"?"#3a8bc418":"#c9952a18"} col={l.type==="buy"?"#6bb3d4":"#c9952a"} />
            <Pill text={isDecant?"Dekant":"Teljes üveg"} bg={isDecant?"#c87a2018":"#38a16a18"} col={isDecant?"#e09040":"#5ec98a"} />
            {l.condition && <Pill text={COND[l.condition]} bg={COND_COLOR[l.condition]+"18"} col={COND_COLOR[l.condition]} />}
          </div>
          <div style={{ fontSize:64, marginBottom:18 }}>{l.icon || "🫙"}</div>
          <p style={{ fontFamily:"'DM Mono',monospace", fontSize:10, color:"#4a3820", letterSpacing:3 }}>{(l.brand||"").toUpperCase()}</p>
          <h1 style={{ fontFamily:"'Playfair Display',serif", fontSize:48, color:"#f0e4cc", fontWeight:400, lineHeight:1.05, marginBottom:6 }}>{l.name}</h1>
          <p style={{ color:"#4a3820", marginBottom:24 }}>
            {isDecant ? `${l.decant_ml}ml spray dekant` : `${l.size||""}${l.fill ? ` · ${l.fill}% tele` : ""}`}
          </p>
          {!isDecant && l.fill && <div style={{ marginBottom:24 }}><FillBar pct={l.fill} /></div>}
          <div style={{ fontFamily:"'Playfair Display',serif", fontSize:44, color:"#c9952a", marginBottom:32 }}>
            {(l.price||0).toLocaleString("hu-HU")} Ft
          </div>
          <div style={{ background:"#0f0d09", border:"1px solid #1a1610", borderRadius:10, padding:"20px 22px", marginBottom:22 }}>
            <p style={{ fontFamily:"'DM Mono',monospace", fontSize:10, color:"#3a2e20", letterSpacing:2, marginBottom:12 }}>LEÍRÁS</p>
            <p style={{ color:"#b8a070", lineHeight:1.9, fontSize:14 }}>{l.description}</p>
          </div>
          {l.tags && l.tags.length > 0 && (
            <div style={{ display:"flex", flexWrap:"wrap", gap:7, marginBottom:22 }}>
              {l.tags.map(t => (
                <span key={t} style={{ background:"#181410", border:"1px solid #221e18", color:"#4a3820",
                  padding:"3px 11px", borderRadius:20, fontSize:11, fontFamily:"'DM Mono',monospace" }}>#{t}</span>
              ))}
            </div>
          )}
        </div>
        <div style={{ display:"flex", flexDirection:"column", gap:12 }}>
          <div style={{ background:"#0f0d09", border:"1px solid #1a1610", borderRadius:12, padding:"22px 20px" }}>
            <p style={{ fontFamily:"'DM Mono',monospace", fontSize:10, color:"#2e2418", letterSpacing:2, marginBottom:18 }}>ELADÓ</p>
            <div style={{ display:"flex", gap:12, alignItems:"center", marginBottom:14, cursor:"pointer" }}
              onClick={() => { setProfileId(u?.id); go("profile"); }}>
              <Ava u={u} size={48} />
              <div>
                <div style={{ fontFamily:"'Playfair Display',serif", fontSize:20, color:"#f0e4cc" }}>
                  {u?.name} {u?.verified && <span style={{ color:"#c9952a", fontSize:13 }}>✓</span>}
                </div>
                <div style={{ fontSize:11, color:"#4a3820" }}>📍 {u?.location}</div>
              </div>
            </div>
            <Stars v={u?.rating || 0} size={15} />
            <span style={{ fontSize:12, color:"#7a6040", marginLeft:8 }}>{u?.rating || 0} · {u?.rating_count || 0} értékelés</span>
          </div>
          <button onClick={openMsg} style={{
            background:"linear-gradient(135deg,#c9952a,#7a5810)", border:"none",
            color:"#0d0b08", padding:"14px", borderRadius:8, cursor:"pointer",
            fontFamily:"'Playfair Display',serif", fontSize:16, fontWeight:700 }}>
            ✉ Üzenet küldése
          </button>
          <button onClick={() => setFaved(!faved)} style={{
            background:"transparent", border:`1px solid ${faved?"#c9952a60":"#2a2218"}`,
            color:faved?"#c9952a":"#4a3820", padding:"11px", borderRadius:8, cursor:"pointer",
            fontFamily:"'DM Mono',monospace", fontSize:10, letterSpacing:1 }}>
            {faved?"♥ KEDVELVE":"♡ KEDVELÉS"}
          </button>
          <button onClick={() => setShowOffer(!showOffer)} style={{
            background:"transparent", border:"1px solid #c9952a38",
            color:"#c9952a", padding:"11px", borderRadius:8, cursor:"pointer",
            fontFamily:"'DM Mono',monospace", fontSize:10, letterSpacing:1 }}>
            AJÁNLAT KÜLDÉSE
          </button>
          {showOffer && (
            <div style={{ background:"#0f0d09", border:"1px solid #221e18", borderRadius:8, padding:14 }}>
              <input value={offerVal} onChange={e=>setOfferVal(e.target.value)}
                placeholder="Ajánlott ár (Ft)" type="number"
                style={{ background:"#0a0806", border:"1px solid #221e18", color:"#f0e4cc",
                  padding:"8px 12px", borderRadius:6, width:"100%", fontFamily:"'DM Mono',monospace",
                  fontSize:12, marginBottom:8, boxSizing:"border-box", outline:"none" }} />
              <button onClick={() => { openMsg(); }} style={{
                background:"#c9952a18", border:"1px solid #c9952a38", color:"#c9952a",
                padding:"8px", width:"100%", borderRadius:6, cursor:"pointer",
                fontFamily:"'DM Mono',monospace", fontSize:11 }}>
                Ajánlat küldése üzenetben →
              </button>
            </div>
          )}
          <div style={{ background:"#0a0806", border:"1px solid #1a1610", borderRadius:8, padding:"14px 16px" }}>
            <p style={{ fontFamily:"'DM Mono',monospace", fontSize:9, color:"#2e2418", letterSpacing:1, marginBottom:10 }}>BIZTONSÁGOS VÁSÁRLÁS</p>
            {["Valódi értékelések","PM alapú egyeztetés","Hitelesített eladói jelvény","Átverés bejelentés"].map(t => (
              <div key={t} style={{ display:"flex", gap:8, fontSize:11, color:"#4a3820", marginBottom:6 }}>
                <span style={{ color:"#c9952a" }}>✓</span>{t}
              </div>
            ))}
          </div>
        </div>
      </div>
    </div>
  );
}

// ─── PROFILE ──────────────────────────────────────────────────────────────────
function Profile({ pu, curProfile, go, listings, setActiveChatWith, onSignOut }) {
  const [tab, setTab] = useState("listings");
  const [reviews, setReviews] = useState([]);
  const [showReviewModal, setShowReviewModal] = useState(false);
  const [myRating, setMyRating] = useState(5);
  const [myText, setMyText] = useState("");
  const isOwn = curProfile?.id === pu?.id;
  const uls = listings.filter(l => l.user_id === pu?.id);

  useEffect(() => {
    if (!pu?.id) return;
    supabase.from("reviews").select("*").eq("to_user", pu.id).then(({ data }) => setReviews(data || []));
  }, [pu?.id]);

  async function submitReview() {
    if (!curProfile) return;
    await supabase.from("reviews").insert({
      from_user: curProfile.id, to_user: pu.id,
      rating: myRating, text: myText, transaction_type: "full"
    });
    setShowReviewModal(false);
    setMyText("");
    const { data } = await supabase.from("reviews").select("*").eq("to_user", pu.id);
    setReviews(data || []);
  }

  if (!pu) return null;
  const avg = reviews.length ? (reviews.reduce((s,r)=>s+r.rating,0)/reviews.length).toFixed(1) : (pu.rating||0).toFixed(1);

  return (
    <div style={{ paddingTop:58, maxWidth:960, margin:"0 auto", padding:"80px 36px 80px" }}>
      <div style={{ display:"flex", gap:26, alignItems:"flex-start", marginBottom:46, flexWrap:"wrap" }}>
        <Ava u={pu} size={88} />
        <div style={{ flex:1 }}>
          <div style={{ display:"flex", gap:10, alignItems:"center", flexWrap:"wrap", marginBottom:7 }}>
            <h1 style={{ fontFamily:"'Playfair Display',serif", fontSize:40, color:"#f0e4cc", fontWeight:400 }}>{pu.name}</h1>
            {pu.verified && <Pill text="Hitelesített" />}
          </div>
          <div style={{ display:"flex", gap:10, alignItems:"center", marginBottom:10 }}>
            <Stars v={Number(avg)} size={17} />
            <span style={{ fontFamily:"'Playfair Display',serif", fontSize:20, color:"#c9952a" }}>{avg}</span>
            <span style={{ color:"#4a3820", fontSize:13 }}>({reviews.length} értékelés)</span>
          </div>
          <p style={{ color:"#4a3820", fontSize:13, marginBottom:10 }}>📍 {pu.location} · Tag: {pu.created_at?.slice(0,7)} óta</p>
          <p style={{ color:"#9a8060", fontSize:14, lineHeight:1.8, maxWidth:480 }}>{pu.bio}</p>
        </div>
        <div style={{ display:"flex", flexDirection:"column", gap:8 }}>
          {!isOwn && curProfile && (
            <>
              <button onClick={() => { setActiveChatWith(pu.id); go("messages"); }} style={{
                background:"linear-gradient(135deg,#c9952a,#7a5810)", border:"none",
                color:"#0d0b08", padding:"10px 22px", borderRadius:8, cursor:"pointer",
                fontFamily:"'DM Mono',monospace", fontSize:10, fontWeight:700, letterSpacing:1 }}>
                ✉ ÜZENET
              </button>
              <button onClick={() => setShowReviewModal(true)} style={{
                background:"transparent", border:"1px solid #c9952a38", color:"#c9952a",
                padding:"9px 22px", borderRadius:8, cursor:"pointer",
                fontFamily:"'DM Mono',monospace", fontSize:10, letterSpacing:1 }}>
                ⭐ ÉRTÉKELÉS
              </button>
            </>
          )}
          {isOwn && (
            <button onClick={onSignOut} style={{
              background:"transparent", border:"1px solid #ff6b6b38", color:"#ff6b6b",
              padding:"9px 22px", borderRadius:8, cursor:"pointer",
              fontFamily:"'DM Mono',monospace", fontSize:10, letterSpacing:1 }}>
              KIJELENTKEZÉS
            </button>
          )}
        </div>
      </div>

      <div style={{ display:"flex", borderBottom:"1px solid #1a1610", marginBottom:30 }}>
        {[["listings",`Hirdetések (${uls.length})`],["reviews",`Értékelések (${reviews.length})`]].map(([k,l]) => (
          <button key={k} onClick={() => setTab(k)} style={{
            background:"transparent", border:"none",
            borderBottom:tab===k?"2px solid #c9952a":"2px solid transparent",
            color:tab===k?"#c9952a":"#4a3820",
            padding:"12px 22px", cursor:"pointer",
            fontFamily:"'DM Mono',monospace", fontSize:10, letterSpacing:1, textTransform:"uppercase" }}>
            {l}
          </button>
        ))}
      </div>

      {tab==="listings" && (
        <div style={{ display:"grid", gridTemplateColumns:"repeat(auto-fill,minmax(258px,1fr))", gap:16 }}>
          {uls.map(l => <Card key={l.id} l={l} u={pu} />)}
          {uls.length===0 && <p style={{ color:"#2e2418", fontFamily:"'DM Mono',monospace", fontSize:11 }}>Nincs hirdetés.</p>}
        </div>
      )}

      {tab==="reviews" && (
        <div style={{ display:"flex", flexDirection:"column", gap:14 }}>
          {reviews.map((r,i) => (
            <div key={i} style={{ background:"#0f0d09", border:"1px solid #1a1610", borderRadius:10, padding:"18px 22px" }}>
              <div style={{ display:"flex", justifyContent:"space-between", marginBottom:10 }}>
                <div style={{ display:"flex", gap:10, alignItems:"center" }}>
                  <Stars v={r.rating} />
                </div>
                <span style={{ color:"#2e2418", fontFamily:"'DM Mono',monospace", fontSize:10 }}>{r.created_at?.slice(0,7)}</span>
              </div>
              <p style={{ color:"#b8a070", fontSize:14, lineHeight:1.75 }}>{r.text}</p>
            </div>
          ))}
          {reviews.length===0 && <p style={{ color:"#2e2418", fontFamily:"'DM Mono',monospace", fontSize:11 }}>Még nincs értékelés.</p>}
        </div>
      )}

      {showReviewModal && (
        <Modal onClose={() => setShowReviewModal(false)}>
          <h2 style={{ fontFamily:"'Playfair Display',serif", fontSize:26, color:"#f0e4cc", fontWeight:400, marginBottom:22 }}>Értékelés írása</h2>
          <div style={{ marginBottom:20 }}>
            <Stars v={myRating} size={28} interactive onChange={setMyRating} />
          </div>
          <textarea value={myText} onChange={e=>setMyText(e.target.value)} rows={4}
            placeholder="Írd le tapasztalatod..."
            style={{ background:"#141009", border:"1px solid #221e18", color:"#f0e4cc",
              padding:"12px 14px", borderRadius:8, width:"100%", fontFamily:"'DM Mono',monospace",
              fontSize:12, resize:"vertical", outline:"none", boxSizing:"border-box", marginBottom:16 }} />
          <button onClick={submitReview} style={{
            background:"linear-gradient(135deg,#c9952a,#7a5810)", border:"none",
            color:"#0d0b08", padding:"13px", width:"100%", borderRadius:8, cursor:"pointer",
            fontFamily:"'Playfair Display',serif", fontSize:16, fontWeight:700 }}>
            Értékelés küldése →
          </button>
        </Modal>
      )}
    </div>
  );
}

// ─── MESSAGES ─────────────────────────────────────────────────────────────────
function Messages({ curProfile, profiles, activeChatWith, setActiveChatWith }) {
  const [conversations, setConversations] = useState([]);
  const [chat, setChat] = useState([]);
  const [newMsg, setNewMsg] = useState("");
  const bottomRef = useRef(null);

  useEffect(() => {
    if (!curProfile?.id) return;
    loadConversations();
    const sub = supabase.channel("messages")
      .on("postgres_changes", { event:"INSERT", schema:"public", table:"messages" }, () => {
        loadConversations();
        if (activeChatWith) loadChat(activeChatWith);
      }).subscribe();
    return () => supabase.removeChannel(sub);
  }, [curProfile?.id, activeChatWith]);

  useEffect(() => {
    if (activeChatWith) loadChat(activeChatWith);
  }, [activeChatWith]);

  useEffect(() => { bottomRef.current?.scrollIntoView({ behavior:"smooth" }); }, [chat]);

  async function loadConversations() {
    const { data } = await supabase.from("messages")
      .select("*")
      .or(`from_user.eq.${curProfile.id},to_user.eq.${curProfile.id}`)
      .order("created_at", { ascending:false });
    if (!data) return;
    const seen = new Set();
    const convs = [];
    data.forEach(m => {
      const partner = m.from_user === curProfile.id ? m.to_user : m.from_user;
      if (!seen.has(partner)) { seen.add(partner); convs.push({ partnerId:partner, lastMsg:m }); }
    });
    setConversations(convs);
  }

  async function loadChat(partnerId) {
    const { data } = await supabase.from("messages")
      .select("*")
      .or(`and(from_user.eq.${curProfile.id},to_user.eq.${partnerId}),and(from_user.eq.${partnerId},to_user.eq.${curProfile.id})`)
      .order("created_at", { ascending:true });
    setChat(data || []);
  }

  async function send() {
    if (!newMsg.trim() || !activeChatWith) return;
    await supabase.from("messages").insert({
      from_user: curProfile.id, to_user: activeChatWith, text: newMsg.trim()
    });

    const toUser = profiles[activeChatWith];
    if (toUser?.email) {
      await supabase.functions.invoke("send-message-email", {
        body: {
          to_email: toUser.email,
          to_name: toUser.name,
          from_name: curProfile.name,
          message_text: newMsg.trim()
        }
      });
    }

    setNewMsg("");
    loadChat(activeChatWith);
  }

  return (
    <div style={{ paddingTop:58, height:"100vh", display:"flex" }}>
      <div style={{ width:280, background:"#0c0a07", borderRight:"1px solid #1a1610", overflowY:"auto", flexShrink:0 }}>
        <div style={{ padding:"20px 18px 14px", borderBottom:"1px solid #1a1610" }}>
          <p style={{ fontFamily:"'Playfair Display',serif", fontSize:22, color:"#f0e4cc" }}>Üzenetek</p>
        </div>
        {conversations.length===0 && (
          <p style={{ padding:"22px 18px", color:"#2e2418", fontFamily:"'DM Mono',monospace", fontSize:10 }}>Még nincs üzeneted.</p>
        )}
        {conversations.map(({ partnerId, lastMsg }) => {
          const u = profiles[partnerId];
          if (!u) return null;
          const active = activeChatWith===partnerId;
          return (
            <div key={partnerId} onClick={() => setActiveChatWith(partnerId)} style={{
              padding:"14px 18px", cursor:"pointer", display:"flex", gap:11, alignItems:"center",
              background:active?"#131008":"transparent",
              borderLeft:active?"2px solid #c9952a":"2px solid transparent",
              borderBottom:"1px solid #131008" }}>
              <Ava u={u} size={36} />
              <div style={{ flex:1, minWidth:0 }}>
                <div style={{ fontFamily:"'DM Mono',monospace", fontSize:11, color:"#c9952a", marginBottom:2 }}>{u.name}</div>
                <div style={{ fontSize:11, color:"#2e2418", overflow:"hidden", textOverflow:"ellipsis", whiteSpace:"nowrap" }}>{lastMsg.text}</div>
              </div>
            </div>
          );
        })}
      </div>

      <div style={{ flex:1, display:"flex", flexDirection:"column", background:"#0a0806", minWidth:0 }}>
        {activeChatWith && profiles[activeChatWith] ? (
          <>
            <div style={{ padding:"14px 22px", borderBottom:"1px solid #1a1610", display:"flex", alignItems:"center", gap:12 }}>
              <Ava u={profiles[activeChatWith]} size={36} />
              <div style={{ fontFamily:"'Playfair Display',serif", fontSize:19, color:"#f0e4cc" }}>{profiles[activeChatWith].name}</div>
            </div>
            <div style={{ flex:1, overflowY:"auto", padding:"22px", display:"flex", flexDirection:"column", gap:10 }}>
              {chat.map((m,i) => {
                const me = m.from_user===curProfile.id;
                return (
                  <div key={i} style={{ display:"flex", justifyContent:me?"flex-end":"flex-start" }}>
                    <div style={{ maxWidth:"68%", padding:"10px 14px",
                      background:me?"#1e1508":"#141009",
                      border:`1px solid ${me?"#c9952a28":"#1e1a13"}`,
                      borderRadius:me?"14px 14px 3px 14px":"14px 14px 14px 3px" }}>
                      <p style={{ color:"#f0e4cc", fontSize:14, lineHeight:1.6, margin:0 }}>{m.text}</p>
                      <p style={{ color:"#2e2418", fontSize:10, fontFamily:"'DM Mono',monospace", margin:"5px 0 0", textAlign:"right" }}>
                        {new Date(m.created_at).toLocaleTimeString("hu-HU",{hour:"2-digit",minute:"2-digit"})}
                      </p>
                    </div>
                  </div>
                );
              })}
              <div ref={bottomRef} />
            </div>
            <div style={{ padding:"14px 22px", borderTop:"1px solid #1a1610", display:"flex", gap:10 }}>
              <input value={newMsg} onChange={e=>setNewMsg(e.target.value)}
                onKeyDown={e=>e.key==="Enter"&&send()}
                placeholder="Írj üzenetet... (Enter = küldés)"
                style={{ flex:1, background:"#141009", border:"1px solid #221e18", color:"#f0e4cc",
                  padding:"12px 16px", borderRadius:8, fontFamily:"'DM Mono',monospace", fontSize:12, outline:"none" }} />
              <button onClick={send} style={{
                background:"linear-gradient(135deg,#c9952a,#7a5810)", border:"none",
                color:"#0d0b08", padding:"12px 18px", borderRadius:8, cursor:"pointer",
                fontFamily:"'DM Mono',monospace", fontWeight:700 }}>→</button>
            </div>
          </>
        ) : (
          <div style={{ flex:1, display:"flex", alignItems:"center", justifyContent:"center", flexDirection:"column", gap:14 }}>
            <span style={{ fontSize:48, opacity:.2 }}>✉</span>
            <p style={{ color:"#2e2418", fontFamily:"'DM Mono',monospace", fontSize:11 }}>Válassz egy beszélgetést</p>
          </div>
        )}
      </div>
    </div>
  );
}

// ─── SELL ─────────────────────────────────────────────────────────────────────
function Sell({ curProfile, go, setListings, showToast }) {
  const [form, setForm] = useState({
    type:"sell", listing_type:"full", brand:"", name:"",
    size:"100ml", fill:90, condition:"excellent", price:"",
    decant_ml:5, category:"woody", description:"", tags:"", icon:"✨"
  });
  const [loading, setLoading] = useState(false);
  const [errors, setErrors] = useState({});
  const [images, setImages] = useState([]);

  function validate() {
    const e = {};
    if (!form.brand.trim()) e.brand = "A márka megadása kötelező";
    if (!form.name.trim()) e.name = "A név megadása kötelező";
    if (!form.price || Number(form.price) <= 0) e.price = "Adj meg érvényes árat";
    if (!form.description.trim()) e.description = "Írj egy rövid leírást";
    return e;
  }

  async function uploadImages(listingId) {
    const urls = [];
    for (const img of images) {
      const ext = img.name.split(".").pop();
      const path = `${curProfile.id}/${listingId}/${Date.now()}.${ext}`;
      const { error } = await supabase.storage.from("listing-images").upload(path, img);
      if (!error) {
        const { data } = supabase.storage.from("listing-images").getPublicUrl(path);
        urls.push(data.publicUrl);
      }
    }
    return urls;
  }

  async function submit() {
    if (!curProfile) { go("login"); return; }
    const e = validate();
    if (Object.keys(e).length > 0) {
      setErrors(e);
      showToast("Töltsd ki a kötelező mezőket!", "error");
      return;
    }
    setErrors({});
    setLoading(true);
    const isDecant = form.listing_type === "decant";
    const { data, error } = await supabase.from("listings").insert({
      user_id: curProfile.id,
      type: form.type,
      listing_type: form.listing_type,
      brand: form.brand.trim(),
      name: form.name.trim(),
      size: isDecant ? null : form.size,
      fill: (!isDecant && form.type==="sell") ? Number(form.fill) : null,
      condition: (!isDecant && form.type==="sell") ? form.condition : null,
      price: Number(form.price),
      decant_ml: isDecant ? Number(form.decant_ml) : null,
      description: form.description.trim(),
      category: form.category,
      tags: form.tags.split(",").map(t=>t.trim()).filter(Boolean),
      icon: form.icon,
      views: 0, favorites: 0
    }).select().single();

    if (error) {
      setLoading(false);
      showToast("Hiba a feltöltés során: " + error.message, "error");
      return;
    }

    if (images.length > 0) {
      const urls = await uploadImages(data.id);
      await supabase.from("listings").update({ image_urls: urls }).eq("id", data.id);
      data.image_urls = urls;
    }

    setLoading(false);
    setListings(prev => [data, ...prev]);
    showToast("Hirdetés sikeresen közzétéve!", "success");
    setTimeout(() => go("market"), 900);
  }

  const errStyle = { border:"1px solid #ff9e7e60" };
  const inp = { background:"#141009", border:"1px solid #221e18", color:"#f0e4cc",
    padding:"10px 14px", borderRadius:8, fontFamily:"'DM Mono',monospace", fontSize:12,
    width:"100%", boxSizing:"border-box", outline:"none" };
  const F = ({label, errKey, children}) => (
    <div style={{ marginBottom:18 }}>
      <label style={{ fontFamily:"'DM Mono',monospace", fontSize:10, color: errors[errKey] ? "#ff9e7e" : "#4a3820",
        letterSpacing:2, display:"block", marginBottom:7, textTransform:"uppercase" }}>
        {label}{errors[errKey] && <span style={{ marginLeft:8, textTransform:"none", letterSpacing:0 }}>— {errors[errKey]}</span>}
      </label>
      {children}
    </div>
  );

  return (
    <div style={{ paddingTop:58, maxWidth:720, margin:"0 auto", padding:"80px 36px 90px" }}>
      <h1 style={{ fontFamily:"'Playfair Display',serif", fontSize:44, color:"#f0e4cc", fontWeight:400, marginBottom:8 }}>Hirdetés feladása</h1>
      <p style={{ color:"#4a3820", fontSize:13, marginBottom:42, fontFamily:"'DM Mono',monospace" }}>Minden mező kitöltése gyorsabb eladást hoz.</p>

      <F label="Mit szeretnél?">
        <div style={{ display:"flex", gap:10 }}>
          {[["sell","🏷 Eladom"],["buy","🔍 Keresem"]].map(([t,l]) => (
            <button key={t} onClick={() => setForm({...form,type:t})} style={{
              flex:1, background:form.type===t?"#c9952a18":"transparent",
              border:form.type===t?"1px solid #c9952a40":"1px solid #221e18",
              color:form.type===t?"#c9952a":"#4a3820",
              padding:"12px", borderRadius:8, cursor:"pointer", fontFamily:"'DM Mono',monospace", fontSize:11 }}>{l}</button>
          ))}
        </div>
      </F>

      <F label="Hirdetés típusa">
        <div style={{ display:"flex", gap:10 }}>
          {[["full","🫙 Teljes üveg"],["decant","💧 Dekant"]].map(([t,l]) => (
            <button key={t} onClick={() => setForm({...form,listing_type:t})} style={{
              flex:1, background:form.listing_type===t?"#c9952a18":"transparent",
              border:form.listing_type===t?"1px solid #c9952a40":"1px solid #221e18",
              color:form.listing_type===t?"#c9952a":"#4a3820",
              padding:"12px", borderRadius:8, cursor:"pointer", fontFamily:"'DM Mono',monospace", fontSize:11 }}>{l}</button>
          ))}
        </div>
      </F>

      <div style={{ display:"grid", gridTemplateColumns:"1fr 1fr", gap:14 }}>
        <F label="Márka *" errKey="brand">
          <input value={form.brand} onChange={e=>setForm({...form,brand:e.target.value})}
            placeholder="pl. Creed" style={{...inp, ...(errors.brand ? errStyle : {})}} />
        </F>
        <F label="Név *" errKey="name">
          <input value={form.name} onChange={e=>setForm({...form,name:e.target.value})}
            placeholder="pl. Aventus" style={{...inp, ...(errors.name ? errStyle : {})}} />
        </F>
        {form.listing_type==="full" && (
          <F label="Méret">
            <select value={form.size} onChange={e=>setForm({...form,size:e.target.value})} style={{...inp,cursor:"pointer"}}>
              {["30ml","50ml","75ml","100ml","125ml","150ml","200ml","Egyéb"].map(s=><option key={s}>{s}</option>)}
            </select>
          </F>
        )}
        {form.listing_type==="decant" && (
          <F label="Dekant méret (ml)">
            <select value={form.decant_ml} onChange={e=>setForm({...form,decant_ml:e.target.value})} style={{...inp,cursor:"pointer"}}>
              {DECANT_SIZES.map(s=><option key={s} value={s}>{s}ml</option>)}
            </select>
          </F>
        )}
        <F label="Kategória">
          <select value={form.category} onChange={e=>setForm({...form,category:e.target.value})} style={{...inp,cursor:"pointer"}}>
            {["woody","oriental","floral","fresh","aromatic"].map(c=><option key={c}>{c}</option>)}
          </select>
        </F>
      </div>

      {form.listing_type==="full" && form.type==="sell" && (
        <div style={{ display:"grid", gridTemplateColumns:"1fr 1fr", gap:14 }}>
          <F label={`Teli szint: ${form.fill}%`}>
            <input type="range" min={5} max={100} value={form.fill}
              onChange={e=>setForm({...form,fill:e.target.value})}
              style={{ width:"100%", accentColor:"#c9952a", marginTop:4 }} />
          </F>
          <F label="Állapot">
            <select value={form.condition} onChange={e=>setForm({...form,condition:e.target.value})} style={{...inp,cursor:"pointer"}}>
              {Object.entries(COND).map(([k,v])=><option key={k} value={k}>{v}</option>)}
            </select>
          </F>
        </div>
      )}

      <F label="Ár (Ft) *" errKey="price">
        <input value={form.price} onChange={e=>setForm({...form,price:e.target.value})}
          placeholder="pl. 35000" type="number"
          style={{...inp, ...(errors.price ? errStyle : {})}} />
      </F>

      <F label="Leírás *" errKey="description">
        <textarea value={form.description} onChange={e=>setForm({...form,description:e.target.value})}
          rows={4} placeholder="Batch, állapot részletei, csere lehetőség..."
          style={{...inp, resize:"vertical", ...(errors.description ? errStyle : {})}} />
      </F>

      <F label="Tagek (vesszővel elválasztva)">
        <input value={form.tags} onChange={e=>setForm({...form,tags:e.target.value})} placeholder="creed, niche, woody" style={inp} />
      </F>

      <F label="Fotók (max 5)">
        <input type="file" accept="image/*" multiple
          onChange={e => setImages(Array.from(e.target.files).slice(0,5))}
          style={{ color:"#c9952a", fontFamily:"'DM Mono',monospace", fontSize:12 }} />
        {images.length > 0 && (
          <div style={{ display:"flex", gap:8, marginTop:10, flexWrap:"wrap" }}>
            {images.map((img,i) => (
              <div key={i} style={{ position:"relative" }}>
                <img src={URL.createObjectURL(img)}
                  style={{ width:80, height:80, objectFit:"cover", borderRadius:8, border:"1px solid #221e18" }} />
                <button onClick={() => setImages(prev => prev.filter((_,j)=>j!==i))}
                  style={{ position:"absolute", top:-6, right:-6, background:"#ff6b6b",
                    border:"none", borderRadius:"50%", width:18, height:18,
                    cursor:"pointer", color:"white", fontSize:11 }}>×</button>
              </div>
            ))}
          </div>
        )}
      </F>

      <F label="Ikon">
        <div style={{ display:"flex", flexWrap:"wrap", gap:8 }}>
          {ICONS.map(ic => (
            <button key={ic} onClick={() => setForm({...form,icon:ic})} style={{
              background:form.icon===ic?"#c9952a18":"#141009",
              border:form.icon===ic?"1px solid #c9952a40":"1px solid #221e18",
              borderRadius:8, padding:"8px 12px", cursor:"pointer", fontSize:20 }}>{ic}</button>
          ))}
        </div>
      </F>

      <button onClick={submit} disabled={loading} style={{
        background:"linear-gradient(135deg,#c9952a,#7a5810)", border:"none",
        color:"#0d0b08", padding:"16px", width:"100%", borderRadius:8, cursor:"pointer",
        fontFamily:"'Playfair Display',serif", fontSize:19, fontWeight:700, marginTop:10,
        opacity:loading?0.6:1 }}>
        {loading ? "Feltöltés..." : "Hirdetés közzététele →"}
      </button>
    </div>
  );
}

// ─── GUEST WALL — hirdetés feladás blokkolva bejelentkezés nélkül ─────────────
function GuestWall({ go }) {
  return (
    <div style={{ paddingTop:58, minHeight:"100vh", display:"flex", alignItems:"center", justifyContent:"center" }}>
      <div style={{ background:"#0f0d09", border:"1px solid #c9952a20", borderRadius:20,
        padding:"60px 48px", maxWidth:460, textAlign:"center",
        boxShadow:"0 24px 80px #00000060" }}>
        <div style={{ fontSize:52, marginBottom:20 }}>🔒</div>
        <h2 style={{ fontFamily:"'Playfair Display',serif", fontSize:30, color:"#f0e4cc",
          fontWeight:400, marginBottom:14 }}>Belépés szükséges</h2>
        <p style={{ color:"#5a4830", fontFamily:"'DM Mono',monospace", fontSize:12,
          lineHeight:1.9, marginBottom:32 }}>
          Hirdetés feladásához be kell jelentkezned.<br />
          A piacot vendégként is böngészheted.
        </p>
        <button onClick={() => go("login")} style={{
          background:"linear-gradient(135deg,#c9952a,#7a5810)", border:"none",
          color:"#0d0b08", padding:"14px 36px", borderRadius:8, cursor:"pointer",
          fontFamily:"'Playfair Display',serif", fontSize:17, fontWeight:700, marginBottom:14,
          width:"100%" }}>
          Belépés / Regisztráció →
        </button>
        <button onClick={() => go("market")} style={{
          background:"transparent", border:"1px solid #2a2218",
          color:"#4a3820", padding:"12px 36px", borderRadius:8, cursor:"pointer",
          fontFamily:"'DM Mono',monospace", fontSize:11, letterSpacing:1, width:"100%" }}>
          VISSZA A PIACRA
        </button>
      </div>
    </div>
  );
}

// ─── LOGIN / REGISTER ─────────────────────────────────────────────────────────
function Login({ go, showToast }) {
  const [mode, setMode] = useState("login");
  const [email, setEmail] = useState("");
  const [pass, setPass] = useState("");
  const [passConfirm, setPassConfirm] = useState("");
  const [name, setName] = useState("");
  const [location, setLocation] = useState("");
  const [tosAccepted, setTosAccepted] = useState(false);
  const [loading, setLoading] = useState(false);
  const [regState, setRegState] = useState("idle"); // "idle" | "confirm"

  // Reset fields when switching mode
  function switchMode(m) {
    setMode(m);
    setEmail(""); setPass(""); setPassConfirm(""); setName(""); setLocation("");
    setTosAccepted(false);
  }

  function validateEmail(e) { return /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(e); }

  async function doLogin() {
    if (!validateEmail(email)) { showToast("Adj meg érvényes email címet!", "error"); return; }
    if (pass.length < 6) { showToast("A jelszónak legalább 6 karakter kell!", "error"); return; }
    setLoading(true);
    const { error } = await supabase.auth.signInWithPassword({ email, password: pass });
    setLoading(false);
    if (error) {
      if (error.message.includes("Invalid login") || error.message.includes("invalid_credentials")) {
        showToast("Hibás email cím vagy jelszó.", "error");
      } else if (error.message.includes("Email not confirmed")) {
        showToast("Erősítsd meg az email címed a bejelentkezés előtt!", "info");
      } else {
        showToast(error.message, "error");
      }
    } else {
      go("home");
    }
  }

  async function doRegister() {
    // ── Validation
    if (!name.trim()) { showToast("Add meg a felhasználóneved!", "error"); return; }
    if (!validateEmail(email)) { showToast("Adj meg érvényes email címet!", "error"); return; }
    if (pass.length < 6) { showToast("A jelszónak legalább 6 karakter kell!", "error"); return; }
    if (pass !== passConfirm) { showToast("A két jelszó nem egyezik!", "error"); return; }
    if (!tosAccepted) { showToast("El kell fogadnod az ÁSZF-et és az Adatkezelési tájékoztatót!", "error"); return; }

    setLoading(true);

    const { data: signUpData, error } = await supabase.auth.signUp({
      email,
      password: pass,
      options: { data: { name, location } }
    });

    if (error) {
      setLoading(false);
      if (error.message.includes("already registered") || error.message.includes("User already registered")) {
        showToast("Ez az email cím már regisztrált. Lépj be!", "error");
      } else {
        showToast(error.message, "error");
      }
      return;
    }

    // Email confirmation OFF → session immediate
    if (signUpData.session) {
      await supabase.from("profiles").upsert({
        id: signUpData.user.id, name: name.trim(), location: location.trim(),
        email, bio: "", verified: false, rating: 0, rating_count: 0, sales: 0
      });
      setLoading(false);
      showToast("Sikeres regisztráció! Üdv a Scentrade-n!", "success");
      setTimeout(() => window.location.reload(), 900);
    } else {
      // Email confirmation ON
      if (signUpData.user) {
        await supabase.from("profiles").upsert({
          id: signUpData.user.id, name: name.trim(), location: location.trim(),
          email, bio: "", verified: false, rating: 0, rating_count: 0, sales: 0
        });
      }
      setLoading(false);
      setRegState("confirm");
    }
  }

  const inp = { background:"#141009", border:"1px solid #221e18", color:"#f0e4cc",
    padding:"12px 16px", borderRadius:8, fontFamily:"'DM Mono',monospace", fontSize:12,
    width:"100%", boxSizing:"border-box", outline:"none", marginBottom:10 };

  // ── Email confirm screen
  if (regState === "confirm") {
    return (
      <div style={{ paddingTop:58, minHeight:"100vh", display:"flex", alignItems:"center", justifyContent:"center" }}>
        <div style={{ background:"#0f0d09", border:"1px solid #1a1610", borderRadius:16,
          padding:"52px 44px", width:420, textAlign:"center", boxShadow:"0 24px 80px #00000060" }}>
          <div style={{ fontSize:52, marginBottom:20 }}>✉</div>
          <h2 style={{ fontFamily:"'Playfair Display',serif", fontSize:28, color:"#f0e4cc", fontWeight:400, marginBottom:14 }}>
            Erősítsd meg az email címed
          </h2>
          <p style={{ color:"#6a5a40", fontFamily:"'DM Mono',monospace", fontSize:12, lineHeight:1.9, marginBottom:28 }}>
            Küldtünk egy megerősítő linket ide:<br />
            <span style={{ color:"#c9952a" }}>{email}</span><br /><br />
            Klikkelj a linkre, majd gyere vissza és lépj be!
          </p>
          <button onClick={() => { setMode("login"); setRegState("idle"); }} style={{
            background:"linear-gradient(135deg,#c9952a,#7a5810)", border:"none",
            color:"#0d0b08", padding:"13px", width:"100%", borderRadius:8, cursor:"pointer",
            fontFamily:"'Playfair Display',serif", fontSize:16, fontWeight:700, marginBottom:12 }}>
            Bejelentkezéshez →
          </button>
          <p style={{ color:"#3a3020", fontSize:11, fontFamily:"'DM Mono',monospace", cursor:"pointer" }}
            onClick={() => setRegState("idle")}>
            Vissza a regisztrációhoz
          </p>
        </div>
      </div>
    );
  }

  return (
    <div style={{ paddingTop:58, minHeight:"100vh", display:"flex", alignItems:"center", justifyContent:"center", padding:"80px 20px" }}>
      <div style={{ background:"#0f0d09", border:"1px solid #1a1610", borderRadius:16,
        padding:"52px 44px", width:"100%", maxWidth:440, boxShadow:"0 24px 80px #00000060" }}>

        {/* ── Header */}
        <div style={{ textAlign:"center", marginBottom:36 }}>
          <span style={{ fontSize:38, color:"#c9952a" }}>◈</span>
          <h2 style={{ fontFamily:"'Playfair Display',serif", fontSize:32, color:"#f0e4cc", fontWeight:400, marginTop:10 }}>
            {mode==="login" ? "Belépés" : "Regisztráció"}
          </h2>
        </div>

        {/* ── Mode tabs */}
        <div style={{ display:"flex", background:"#0a0806", borderRadius:8, padding:3, marginBottom:28 }}>
          {[["login","Belépés"],["register","Regisztráció"]].map(([m,l]) => (
            <button key={m} onClick={() => switchMode(m)} style={{
              flex:1, padding:"8px", borderRadius:6, border:"none", cursor:"pointer",
              background:mode===m?"#1a1508":"transparent",
              color:mode===m?"#c9952a":"#3a3020",
              fontFamily:"'DM Mono',monospace", fontSize:10, letterSpacing:1,
              transition:"all .15s" }}>
              {l}
            </button>
          ))}
        </div>

        {/* ── Register-only fields */}
        {mode==="register" && (
          <>
            <div style={{ marginBottom:4 }}>
              <label style={{ fontFamily:"'DM Mono',monospace", fontSize:9, color:"#3a3020", letterSpacing:2, display:"block", marginBottom:6 }}>FELHASZNÁLÓNÉV *</label>
              <input value={name} onChange={e=>setName(e.target.value)}
                placeholder="pl. illatmester_bp" style={inp} />
            </div>
            <div style={{ marginBottom:4 }}>
              <label style={{ fontFamily:"'DM Mono',monospace", fontSize:9, color:"#3a3020", letterSpacing:2, display:"block", marginBottom:6 }}>HELYSZÍN</label>
              <input value={location} onChange={e=>setLocation(e.target.value)}
                placeholder="pl. Budapest" style={inp} />
            </div>
          </>
        )}

        {/* ── Common fields */}
        <div style={{ marginBottom:4 }}>
          <label style={{ fontFamily:"'DM Mono',monospace", fontSize:9, color:"#3a3020", letterSpacing:2, display:"block", marginBottom:6 }}>EMAIL CÍM *</label>
          <input value={email} onChange={e=>setEmail(e.target.value)}
            placeholder="pelda@email.hu" type="email" style={inp} />
        </div>

        <div style={{ marginBottom:4 }}>
          <label style={{ fontFamily:"'DM Mono',monospace", fontSize:9, color:"#3a3020", letterSpacing:2, display:"block", marginBottom:6 }}>JELSZÓ * <span style={{ color:"#2a2018", letterSpacing:0, textTransform:"none" }}>(min. 6 karakter)</span></label>
          <input value={pass} onChange={e=>setPass(e.target.value)}
            placeholder="••••••••" type="password"
            onKeyDown={e => e.key==="Enter" && mode==="login" && doLogin()}
            style={inp} />
        </div>

        {/* ── Register: password confirm */}
        {mode==="register" && (
          <div style={{ marginBottom:4 }}>
            <label style={{ fontFamily:"'DM Mono',monospace", fontSize:9, color:"#3a3020", letterSpacing:2, display:"block", marginBottom:6 }}>JELSZÓ MÉGEGYSZER *</label>
            <input value={passConfirm} onChange={e=>setPassConfirm(e.target.value)}
              placeholder="••••••••" type="password"
              onKeyDown={e => e.key==="Enter" && doRegister()}
              style={{
                ...inp,
                border: passConfirm && passConfirm !== pass ? "1px solid #ff9e7e60" : "1px solid #221e18",
                marginBottom: 0
              }} />
            {passConfirm && passConfirm !== pass && (
              <p style={{ color:"#ff9e7e", fontFamily:"'DM Mono',monospace", fontSize:10, marginTop:5, marginBottom:0 }}>
                A jelszavak nem egyeznek
              </p>
            )}
          </div>
        )}

        {/* ── Register: ToS checkbox */}
        {mode==="register" && (
          <div style={{ marginTop:18, marginBottom:24 }}>
            <label style={{ display:"flex", gap:12, alignItems:"flex-start", cursor:"pointer" }}>
              {/* Custom checkbox */}
              <div onClick={() => setTosAccepted(v=>!v)} style={{
                width:18, height:18, borderRadius:4, flexShrink:0, marginTop:1,
                background: tosAccepted ? "#c9952a" : "#141009",
                border: `1.5px solid ${tosAccepted ? "#c9952a" : "#3a3020"}`,
                display:"flex", alignItems:"center", justifyContent:"center",
                cursor:"pointer", transition:"all .15s" }}>
                {tosAccepted && <span style={{ color:"#0d0b08", fontSize:11, fontWeight:700, lineHeight:1 }}>✓</span>}
              </div>
              <span style={{ fontFamily:"'DM Mono',monospace", fontSize:11, color:"#4a3820", lineHeight:1.7 }}>
                Elolvastam és elfogadom az{" "}
                <a href="#aszf" onClick={e=>e.stopPropagation()}
                  style={{ color:"#c9952a", textDecoration:"underline" }}>ÁSZF</a>
                {"-t és az "}
                <a href="#adatkezeles" onClick={e=>e.stopPropagation()}
                  style={{ color:"#c9952a", textDecoration:"underline" }}>Adatkezelési tájékoztatót</a>
                . *
              </span>
            </label>
          </div>
        )}

        {/* ── Submit */}
        <button
          onClick={mode==="login" ? doLogin : doRegister}
          disabled={loading || (mode==="register" && !tosAccepted)}
          style={{
            background: (mode==="register" && !tosAccepted)
              ? "linear-gradient(135deg,#5a4510,#3a2a08)"
              : "linear-gradient(135deg,#c9952a,#7a5810)",
            border:"none",
            color:"#0d0b08", padding:"14px", width:"100%", borderRadius:8,
            cursor: (mode==="register" && !tosAccepted) ? "not-allowed" : "pointer",
            fontFamily:"'Playfair Display',serif", fontSize:18, fontWeight:700,
            marginBottom:14, marginTop: mode==="login" ? 14 : 0,
            opacity: loading ? 0.6 : 1,
            transition:"all .2s" }}>
          {loading ? "..." : mode==="login" ? "Belépés →" : "Regisztráció →"}
        </button>

        {/* ── Switch link */}
        <p style={{ color:"#2a2018", fontSize:11, fontFamily:"'DM Mono',monospace", textAlign:"center",
          cursor:"pointer", letterSpacing:1 }}
          onClick={() => switchMode(mode==="login" ? "register" : "login")}>
          {mode==="login" ? "MÉG NINCS FIÓKOD? → REGISZTRÁLJ" : "MÁR VAN FIÓKOD? → LÉPJ BE"}
        </p>
      </div>
    </div>
  );
}

// ─── ROOT APP ─────────────────────────────────────────────────────────────────
export default function App() {
  const { user, profile, loading, refetchProfile } = useAuth();
  const [page, setPage] = useState("home");
  const [listings, setListings] = useState([]);
  const [profiles, setProfiles] = useState({});
  const [selId, setSelId] = useState(null);
  const [profileId, setProfileId] = useState(null);
  const [activeChatWith, setActiveChatWith] = useState(null);
  const [unread, setUnread] = useState(0);
  const { show: showToast, ToastContainer } = useToast();

  useEffect(() => { loadListings(); }, []);
  useEffect(() => { if (profile) loadUnread(); }, [profile]);

  async function loadListings() {
    const { data } = await supabase.from("listings").select("*").order("created_at", { ascending:false });
    if (!data) return;
    setListings(data);
    const ids = [...new Set(data.map(l=>l.user_id))];
    if (ids.length > 0) {
      const { data: pdata } = await supabase.from("profiles").select("*").in("id", ids);
      if (pdata) {
        const map = {};
        pdata.forEach(p => { map[p.id] = p; });
        setProfiles(map);
      }
    }
  }

  async function loadUnread() {
    const { count } = await supabase.from("messages")
      .select("*", { count:"exact", head:true })
      .eq("to_user", profile.id).eq("read", false);
    setUnread(count || 0);
  }

  async function signOut() {
    await supabase.auth.signOut();
    setPage("home");
  }

  function go(p) {
    // Guard: hirdetés feladás csak bejelentkezve
    if (p === "sell" && !profile) {
      setPage("guest_wall");
      window.scrollTo(0,0);
      return;
    }
    setPage(p);
    window.scrollTo(0,0);
  }

  const selListing = listings.find(l=>l.id===selId);
  const profileUser = profileId ? profiles[profileId] : null;
  const allProfiles = profile ? { ...profiles, [profile.id]: profile } : profiles;

  if (loading) return (
    <div style={{ background:"#0a0806", minHeight:"100vh", display:"flex", alignItems:"center", justifyContent:"center" }}>
      <span style={{ color:"#c9952a", fontFamily:"'Playfair Display',serif", fontSize:24, animation:"pulse 1.2s ease infinite" }}>◈</span>
    </div>
  );

  return (
    <div style={{ background:"#0a0806", minHeight:"100vh", color:"#f0e4cc" }}>
      <style>{`
        @import url('https://fonts.googleapis.com/css2?family=Playfair+Display:ital,wght@0,400;0,600;0,700;1,400&family=DM+Mono:wght@400;500&display=swap');
        *{box-sizing:border-box;margin:0;padding:0;}
        body{background:#0a0806;}
        input::placeholder,textarea::placeholder{color:#2a2018;}
        ::-webkit-scrollbar{width:4px;}
        ::-webkit-scrollbar-track{background:#0a0806;}
        ::-webkit-scrollbar-thumb{background:#221e18;border-radius:2px;}
        select option{background:#141009;color:#f0e4cc;}
        button{transition:opacity .15s;}
        button:hover{opacity:.88;}
        @keyframes slideUp{from{transform:translateY(16px);opacity:0}to{transform:translateY(0);opacity:1}}
        @keyframes pulse{0%,100%{opacity:.4}50%{opacity:1}}
        a{color:inherit;}
      `}</style>

      <Nav 
        profile={profile || (user ? { name: user.email } : null)} 
        page={page} 
        go={go} 
        openLogin={() => go("login")} 
        unreadCount={unread} 
/>

      <ToastContainer />

      {page==="home" && <Home go={go} listings={listings} profiles={allProfiles} />}
      {page==="market" && <Market listings={listings} profiles={allProfiles} go={go} setSelId={setSelId} />}
      {page==="detail" && selListing && (
        <Detail l={selListing} u={allProfiles[selListing.user_id]} curProfile={profile}
          go={go} setProfileId={setProfileId} setActiveChatWith={setActiveChatWith} />
      )}
      {page==="profile" && profileUser && (
        <Profile pu={profileUser} curProfile={profile} go={go}
          listings={listings} setActiveChatWith={setActiveChatWith} onSignOut={signOut} />
      )}
      {page==="profile_own" && profile && (
        <Profile pu={profile} curProfile={profile} go={go}
          listings={listings} setActiveChatWith={setActiveChatWith} onSignOut={signOut} />
      )}
      {page==="messages" && profile && (
        <Messages curProfile={profile} profiles={allProfiles}
          activeChatWith={activeChatWith} setActiveChatWith={setActiveChatWith} />
      )}
      {page==="sell" && profile && (
        <Sell curProfile={profile} go={go} setListings={setListings} showToast={showToast} />
      )}
      {page==="guest_wall" && (
        <GuestWall go={go} />
      )}
      {page==="login" && <Login go={go} showToast={showToast} />}
    </div>
  );
}
