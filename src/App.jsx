// SCENTRADE – Light Luxury Redesign
// Paletta: tört fehér + fekete + sötétszürke + arany accent
// Font: Playfair Display (display) + Manrope (body/mono)

import { useState, useEffect, useRef } from "react";

// ─── SUPABASE CLIENT (native fetch, no npm) ───────────────────────────────────
const SUPA_URL = "https://godjaksujnzekgpbpywk.supabase.co";
const SUPA_KEY = "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6ImdvZGpha3N1am56ZWtncGJweXdrIiwicm9sZSI6ImFub24iLCJpYXQiOjE3Nzg1MDA3MDYsImV4cCI6MjA5NDA3NjcwNn0.b5KmrSZ5sjePZCls-dEZ00yJI8gbMs0MNPI2RxetPC8";

function makeSupabase(url, key) {
  const baseH = { "apikey": key, "Content-Type": "application/json" };
  function authH() {
    const tok = supabase.auth._session?.access_token;
    return tok ? { ...baseH, "Authorization": `Bearer ${tok}` } : { ...baseH, "Authorization": `Bearer ${key}` };
  }
  function rest(t) { return `${url}/rest/v1/${t}`; }

  const auth = {
    _session: null,
    _listeners: [],
    async getSession() {
      try { const r = localStorage.getItem("sb-sess"); if(r) { this._session=JSON.parse(r); return {data:{session:this._session}}; } } catch(e){}
      return {data:{session:null}};
    },
    onAuthStateChange(cb) {
      this._listeners.push(cb);
      return {data:{subscription:{unsubscribe:()=>{this._listeners=this._listeners.filter(l=>l!==cb);}}}};
    },
    _emit(ev,sess) {
      this._session=sess;
      try{ if(sess) localStorage.setItem("sb-sess",JSON.stringify(sess)); else localStorage.removeItem("sb-sess"); }catch(e){}
      this._listeners.forEach(cb=>cb(ev,sess));
    },
    async signInWithPassword({email,password}) {
      const r=await fetch(`${url}/auth/v1/token?grant_type=password`,{method:"POST",headers:{...baseH},body:JSON.stringify({email,password})});
      const d=await r.json();
      if(!r.ok) return {error:{message:d.error_description||d.msg||"Hiba"}};
      this._emit("SIGNED_IN",d);
      return {data:d,error:null};
    },
    async signUp({email,password,options}) {
      const r=await fetch(`${url}/auth/v1/signup`,{method:"POST",headers:{...baseH},body:JSON.stringify({email,password,data:options?.data||{}})});
      const d=await r.json();
      if(!r.ok) return {data:{},error:{message:d.error_description||d.msg||"Hiba"}};
      if(d.access_token) this._emit("SIGNED_IN",d);
      return {data:{user:d.user||d,session:d.access_token?d:null},error:null};
    },
    async signOut() {
      const tok=this._session?.access_token;
      if(tok) try{ await fetch(`${url}/auth/v1/logout`,{method:"POST",headers:{...baseH,"Authorization":`Bearer ${tok}`}}); }catch(e){}
      this._emit("SIGNED_OUT",null);
    },
  };

  function from(table) {
    let filters=[], sel="*", ord=null, lim=null, isSingle=false, isHead=false;
    const b = {
      select(c,o){sel=c||"*";isHead=o?.head||false;return b;},
      eq(c,v){filters.push(`${c}=eq.${encodeURIComponent(v)}`);return b;},
      neq(c,v){filters.push(`${c}=neq.${encodeURIComponent(v)}`);return b;},
      ilike(c,v){filters.push(`${c}=ilike.${encodeURIComponent(v)}`);return b;},
      in(c,vs){filters.push(`${c}=in.(${vs.map(v=>encodeURIComponent(v)).join(",")})`);return b;},
      or(expr){filters.push(`or=(${expr})`);return b;},
      order(c,o){ord=`${c}.${o?.ascending===false?"desc":"asc"}`;return b;},
      limit(n){lim=n;return b;},
      single(){isSingle=true;return b;},
      async _fetch(method,body){
        let qs=`select=${sel}`;
        filters.forEach(f=>{qs+=`&${f}`;});
        if(ord) qs+=`&order=${ord}`;
        if(lim) qs+=`&limit=${lim}`;
        const h={...authH()};
        if(isHead||isSingle) h["Prefer"]="count=exact";
        const r=await fetch(`${rest(table)}?${qs}`,{method,headers:h,body:body?JSON.stringify(body):undefined});
        if(r.status===204) return {data:null,error:null,count:0};
        const txt=await r.text();
        let d=null; try{d=JSON.parse(txt);}catch(e){d=txt;}
        if(!r.ok) return {data:null,error:{message:typeof d==="string"?d:JSON.stringify(d)}};
        const cnt=parseInt(r.headers.get("content-range")?.split("/")[1]||"0");
        if(isSingle&&Array.isArray(d)) d=d[0]||null;
        return {data:d,error:null,count:cnt};
      },
      then(res,rej){return b._fetch("GET").then(res,rej);},
      async insert(body){
        const r=await fetch(`${rest(table)}`,{method:"POST",headers:{...authH(),"Prefer":"return=representation"},body:JSON.stringify(Array.isArray(body)?body:[body])});
        const txt=await r.text(); let d=null; try{d=JSON.parse(txt);}catch(e){}
        if(!r.ok) return {data:null,error:{message:typeof d==="string"?d:JSON.stringify(d)}};
        const result=Array.isArray(d)?d[0]:d;
        const ret={data:result,error:null};
        ret.select=()=>({single:()=>({then:(res)=>res(ret)})});
        return ret;
      },
      async update(body){
        let qs=`select=${sel}`; filters.forEach(f=>{qs+=`&${f}`;});
        const r=await fetch(`${rest(table)}?${qs}`,{method:"PATCH",headers:{...authH(),"Prefer":"return=representation"},body:JSON.stringify(body)});
        const txt=await r.text(); let d=null; try{d=JSON.parse(txt);}catch(e){}
        if(!r.ok) return {data:null,error:{message:typeof d==="string"?d:JSON.stringify(d)}};
        return {data:Array.isArray(d)?d[0]:d,error:null};
      },
      async upsert(body){
        const r=await fetch(`${rest(table)}`,{method:"POST",headers:{...authH(),"Prefer":"return=representation,resolution=merge-duplicates"},body:JSON.stringify(Array.isArray(body)?body:[body])});
        const txt=await r.text(); let d=null; try{d=JSON.parse(txt);}catch(e){}
        if(!r.ok) return {data:null,error:{message:typeof d==="string"?d:JSON.stringify(d)}};
        return {data:Array.isArray(d)?d[0]:d,error:null};
      },
      async delete(){
        let qs="select=id"; filters.forEach(f=>{qs+=`&${f}`;});
        const r=await fetch(`${rest(table)}?${qs}`,{method:"DELETE",headers:authH()});
        return {error:r.ok?null:{message:"Delete failed"}};
      },
    };
    return b;
  }

  function channel(name){
    const ch={on(){return ch;},subscribe(){return ch;}};
    return ch;
  }
  function removeChannel(){}
  function functions(){return {invoke:async()=>({})}}

  return {auth,from,channel,removeChannel,functions:functions()};
}

const supabase = makeSupabase(SUPA_URL, SUPA_KEY);

// ─── DESIGN TOKENS ────────────────────────────────────────────────────────────
const T = {
  heading: "#0f0e0d",
  body:    "#2c2825",
  muted:   "#6b6560",
  faint:   "#9e9890",
  inverse: "#faf8f4",
};
const B = {
  canvas:  "#faf8f4",   // tört fehér
  paper:   "#f5f2ec",   // kártyák
  warm:    "#ede9e0",   // hover állapot
  border:  "#e3ddd4",
  borderDk:"#c9c1b4",
};
const ACC = {
  gold:    "#b8943f",
  goldPale:"#b8943f18",
  goldMid: "#b8943f35",
  goldWarm:"#d4a84b",
  ink:     "#1a1714",
  red:     "#c0453a",
  redPale: "#c0453a12",
  green:   "#3a7a52",
  greenPale:"#3a7a5212",
};

// ─── RANK ─────────────────────────────────────────────────────────────────────
function getRank(sales = 0) {
  if (sales >= 50) return { label: "Illatmester", icon: "◆", color: ACC.gold    };
  if (sales >= 5)  return { label: "Parfümista",  icon: "◇", color: T.muted     };
  return                  { label: "Újonc",       icon: "○", color: T.faint     };
}

function RankBadge({ sales = 0, size = "sm" }) {
  const r = getRank(sales);
  const lg = size === "lg";
  return (
    <span style={{
      display: "inline-flex", alignItems: "center", gap: lg ? 5 : 4,
      border: `1px solid ${r.color}55`,
      borderRadius: 3, padding: lg ? "4px 10px" : "2px 7px",
      fontFamily: "'Manrope',sans-serif", fontSize: lg ? 10 : 9,
      color: r.color, fontWeight: 700, letterSpacing: 1.5,
      textTransform: "uppercase", whiteSpace: "nowrap",
      background: r.color + "08",
    }}>
      <span style={{ fontSize: lg ? 9 : 8 }}>{r.icon}</span>
      {r.label}
    </span>
  );
}

function RankProgress({ sales = 0 }) {
  const r = getRank(sales);
  let next = null, pct = 100;
  if (sales < 5)               { next = { label: "Parfümista",  at: 5  }; pct = Math.round((sales / 5) * 100); }
  if (sales >= 5 && sales < 50) { next = { label: "Illatmester", at: 50 }; pct = Math.round(((sales - 5) / 45) * 100); }
  return (
    <div style={{ border: `1px solid ${B.border}`, borderRadius: 8, padding: "20px 24px", background: B.paper }}>
      <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", marginBottom: 14 }}>
        <RankBadge sales={sales} size="lg" />
        <span style={{ fontFamily: "'Manrope',sans-serif", fontSize: 12, color: T.muted }}>{sales} eladás</span>
      </div>
      {next && (
        <>
          <div style={{ display: "flex", justifyContent: "space-between", marginBottom: 8 }}>
            <span style={{ fontFamily: "'Manrope',sans-serif", fontSize: 10, color: T.faint, letterSpacing: 1 }}>KÖVETKEZŐ: {next.label.toUpperCase()}</span>
            <span style={{ fontFamily: "'Manrope',sans-serif", fontSize: 10, color: ACC.gold }}>{next.at - sales} eladás hiányzik</span>
          </div>
          <div style={{ height: 2, background: B.border, borderRadius: 2 }}>
            <div style={{ height: "100%", width: `${pct}%`, borderRadius: 2, background: `linear-gradient(90deg,${ACC.gold}60,${ACC.gold})`, transition: "width .6s ease" }} />
          </div>
        </>
      )}
      {!next && <p style={{ fontFamily: "'Manrope',sans-serif", fontSize: 10, color: ACC.gold, letterSpacing: 1 }}>◆ LEGMAGASABB RANG ELÉRVE</p>}
    </div>
  );
}

// ─── HELPERS ──────────────────────────────────────────────────────────────────
function Stars({ v = 5, size = 13, interactive = false, onChange }) {
  const [hov, setHov] = useState(0);
  return (
    <span style={{ fontSize: size, letterSpacing: 3, cursor: interactive ? "pointer" : "default" }}>
      {[1,2,3,4,5].map(i => (
        <span key={i}
          style={{ color: i <= (hov || Math.round(v)) ? ACC.gold : B.borderDk }}
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
      <div style={{
        width: size, height: size, borderRadius: "50%",
        background: `linear-gradient(135deg,${B.warm},${B.border})`,
        display: "flex", alignItems: "center", justifyContent: "center",
        fontFamily: "'Playfair Display',serif", fontWeight: 700,
        fontSize: size * .34, color: T.muted,
        border: `1.5px solid ${rank.color}40`,
      }}>{initials}</div>
      {size >= 36 && (
        <span style={{
          position: "absolute", bottom: -2, right: -2,
          fontSize: size * 0.28, lineHeight: 1,
          background: B.canvas, borderRadius: "50%",
          padding: "1px", color: rank.color,
        }}>{rank.icon}</span>
      )}
    </div>
  );
}

function Pill({ text, bg = ACC.goldPale, col = ACC.gold }) {
  return (
    <span style={{
      background: bg, color: col, fontSize: 9, fontWeight: 700,
      padding: "3px 9px", borderRadius: 3, letterSpacing: 1.2,
      textTransform: "uppercase", fontFamily: "'Manrope',sans-serif",
      whiteSpace: "nowrap", border: `1px solid ${col}25`,
    }}>{text}</span>
  );
}

function Modal({ onClose, children }) {
  return (
    <div style={{
      position: "fixed", inset: 0, zIndex: 200,
      background: "rgba(15,14,13,.55)", backdropFilter: "blur(12px)",
      display: "flex", alignItems: "center", justifyContent: "center", padding: 20,
    }} onClick={onClose}>
      <div onClick={e => e.stopPropagation()} style={{
        background: B.canvas, border: `1px solid ${B.border}`,
        borderRadius: 12, padding: "44px 40px",
        width: "100%", maxWidth: 520, maxHeight: "90vh", overflowY: "auto",
        boxShadow: "0 24px 80px rgba(0,0,0,.18)",
      }}>{children}</div>
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
  const cfg = {
    error:   { bg: "#fff5f5", border: `${ACC.red}30`,   text: ACC.red    },
    success: { bg: "#f2faf6", border: `${ACC.green}30`, text: ACC.green  },
    info:    { bg: "#faf8f0", border: `${ACC.gold}30`,  text: ACC.gold   },
  };
  const c = cfg[type] || cfg.error;
  return (
    <div style={{
      background: c.bg, border: `1px solid ${c.border}`,
      borderRadius: 8, padding: "14px 18px", maxWidth: 360,
      boxShadow: "0 4px 24px rgba(0,0,0,.1)",
      display: "flex", alignItems: "flex-start", gap: 10,
    }}>
      <span style={{ color: c.text, fontSize: 14, flexShrink: 0 }}>
        {type === "success" ? "✓" : type === "info" ? "◆" : "✕"}
      </span>
      <p style={{ color: c.text, fontFamily: "'Manrope',sans-serif", fontSize: 13, lineHeight: 1.6, flex: 1 }}>{message}</p>
      <button onClick={onClose} style={{ background: "none", border: "none", color: c.text, cursor: "pointer", fontSize: 16, opacity: .4, padding: 0 }}>×</button>
    </div>
  );
}
function useToast() {
  const [toasts, setToasts] = useState([]);
  const show = (message, type = "error") => { const id = Date.now(); setToasts(p => [...p, { id, message, type }]); };
  const remove = id => setToasts(p => p.filter(t => t.id !== id));
  const ToastContainer = () => (
    <div style={{ position: "fixed", bottom: 28, right: 28, zIndex: 9999, display: "flex", flexDirection: "column", gap: 8 }}>
      {toasts.map(t => <Toast key={t.id} message={t.message} type={t.type} onClose={() => remove(t.id)} />)}
    </div>
  );
  return { show, ToastContainer };
}

// ─── BOTTLE COMPONENTS ────────────────────────────────────────────────────────
function bottleLiq(pct) {
  if (pct >= 80) return { top:"#d4a84b", mid:"#b8943f", bot:"#8a6e28" };
  if (pct >= 50) return { top:"#c9924a", mid:"#a87030", bot:"#7a4e18" };
  if (pct >= 20) return { top:"#c0854a", mid:"#9a6228", bot:"#6e4010" };
  return              { top:"#b07040", mid:"#8a5020", bot:"#5c300a" };
}
function fillLbl(pct) {
  if (pct===100) return "Bontatlan"; if (pct>=90) return "Szinte tele";
  if (pct>=75) return "Háromnegyedes"; if (pct>=50) return "Feles";
  if (pct>=25) return "Negyed körüli"; if (pct>=10) return "Kevés maradt";
  return "Majdnem üres";
}

function BottleSlider({ value = 90, onChange }) {
  const pct = Math.min(100, Math.max(1, value));
  const liq = bottleLiq(pct);
  const liqH = (pct/100)*108, liqY = 40+(108-liqH);
  return (
    <div style={{ border: `1px solid ${B.border}`, borderRadius: 10, padding: "24px 28px", display: "flex", gap: 32, alignItems: "center", background: B.paper }}>
      <div style={{ flexShrink: 0, filter: "drop-shadow(0 8px 20px rgba(0,0,0,.08))" }}>
        <svg width="80" height="160" viewBox="0 0 80 160" fill="none">
          <defs>
            <linearGradient id="sl-l" x1="0" y1="0" x2="0" y2="1">
              <stop offset="0%" stopColor={liq.top} stopOpacity=".9"/>
              <stop offset="60%" stopColor={liq.mid} stopOpacity=".85"/>
              <stop offset="100%" stopColor={liq.bot} stopOpacity=".9"/>
            </linearGradient>
            <linearGradient id="sl-g" x1="0" y1="0" x2="1" y2="0">
              <stop offset="0%" stopColor="#fff" stopOpacity=".12"/>
              <stop offset="30%" stopColor="#fff" stopOpacity=".22"/>
              <stop offset="100%" stopColor="#fff" stopOpacity=".04"/>
            </linearGradient>
            <clipPath id="sl-c"><path d="M18 40 Q14 44 12 52 L10 148 Q10 152 14 152 L66 152 Q70 152 70 148 L68 52 Q66 44 62 40 Z"/></clipPath>
          </defs>
          <rect x="28" y="6" width="24" height="14" rx="3" fill={B.warm} stroke={B.borderDk} strokeWidth="1"/>
          <rect x="31" y="4" width="18" height="4" rx="2" fill={ACC.gold} opacity=".6"/>
          <path d="M30 20 L26 40 L54 40 L50 20 Z" fill={B.paper} stroke={B.border} strokeWidth="1"/>
          <path d="M18 40 Q14 44 12 52 L10 148 Q10 152 14 152 L66 152 Q70 152 70 148 L68 52 Q66 44 62 40 Z" fill={B.canvas} stroke={B.borderDk} strokeWidth="1.5"/>
          <g clipPath="url(#sl-c)">
            <rect x="10" y={liqY} width="60" height={liqH+10} fill="url(#sl-l)" style={{transition:"y .5s cubic-bezier(.34,1.56,.64,1),height .5s cubic-bezier(.34,1.56,.64,1)"}}/>
            {pct>3&&pct<98&&<ellipse cx="40" cy={liqY} rx="28" ry="3" fill={liq.top} opacity=".35" style={{transition:"cy .5s cubic-bezier(.34,1.56,.64,1)"}}/>}
          </g>
          <path d="M18 40 Q14 44 12 52 L10 148 Q10 152 14 152 L66 152 Q70 152 70 148 L68 52 Q66 44 62 40 Z" fill="url(#sl-g)"/>
          <path d="M16 55 L14 140" stroke="#fff" strokeWidth="2" strokeOpacity=".3" strokeLinecap="round"/>
          <text x="40" y="108" textAnchor="middle" fontFamily="'Manrope',sans-serif" fontSize="12" fontWeight="700" fill={pct>50?"rgba(255,255,255,.85)":T.muted} style={{userSelect:"none"}}>{pct}%</text>
        </svg>
      </div>
      <div style={{ flex: 1 }}>
        <div style={{ fontFamily: "'Playfair Display',serif", fontSize: 22, color: T.heading, marginBottom: 3 }}>{fillLbl(pct)}</div>
        <div style={{ fontFamily: "'Manrope',sans-serif", fontSize: 10, color: T.faint, letterSpacing: 2, marginBottom: 24, textTransform: "uppercase" }}>Töltöttségi szint</div>
        <input type="range" min={1} max={100} value={pct} onChange={e => onChange(Number(e.target.value))}
          style={{ width:"100%",height:2,appearance:"none",WebkitAppearance:"none",background:`linear-gradient(90deg,${ACC.gold} ${pct}%,${B.border} ${pct}%)`,borderRadius:2,outline:"none",cursor:"pointer"}}/>
        <div style={{ display:"flex",justifyContent:"space-between",marginTop:6,fontFamily:"'Manrope',sans-serif",fontSize:9,color:T.faint }}>
          {["0%","25%","50%","75%","100%"].map(l=><span key={l}>{l}</span>)}
        </div>
        <div style={{ display:"flex",gap:6,marginTop:16,flexWrap:"wrap" }}>
          {[{label:"Bontatlan",v:100},{label:"~¾",v:75},{label:"~½",v:50},{label:"~¼",v:25}].map(({label,v})=>(
            <button key={v} onClick={()=>onChange(v)} style={{
              background: pct===v?ACC.goldPale:"transparent",
              border:`1px solid ${pct===v?ACC.gold:B.border}`,
              color: pct===v?ACC.gold:T.muted,
              padding:"5px 12px",borderRadius:4,cursor:"pointer",
              fontFamily:"'Manrope',sans-serif",fontSize:10,letterSpacing:.5,
              transition:"all .15s",
            }}>{label}</button>
          ))}
        </div>
        {pct<20&&<div style={{ marginTop:14,padding:"9px 14px",background:ACC.redPale,border:`1px solid ${ACC.red}25`,borderRadius:6,fontFamily:"'Manrope',sans-serif",fontSize:11,color:ACC.red }}>⚠ Alacsony szint – légy pontos a vevő miatt!</div>}
      </div>
    </div>
  );
}

function BottleCompact({ pct = 90 }) {
  const liq = bottleLiq(pct);
  const liqH = (pct/100)*108, liqY = 40+(108-liqH);
  const col = pct>=80?ACC.gold:pct>=50?"#c0924a":pct>=25?"#b07040":ACC.red;
  return (
    <div style={{ display:"flex",alignItems:"center",gap:8,marginBottom:10 }}>
      <svg width="20" height="64" viewBox="0 0 80 160" fill="none">
        <defs>
          <linearGradient id="cp-l" x1="0" y1="0" x2="0" y2="1">
            <stop offset="0%" stopColor={liq.top} stopOpacity=".88"/>
            <stop offset="100%" stopColor={liq.bot} stopOpacity=".8"/>
          </linearGradient>
          <clipPath id="cp-c"><path d="M18 40 Q14 44 12 52 L10 148 Q10 152 14 152 L66 152 Q70 152 70 148 L68 52 Q66 44 62 40 Z"/></clipPath>
        </defs>
        <rect x="28" y="6" width="24" height="14" rx="3" fill={B.warm} stroke={B.border} strokeWidth="1"/>
        <path d="M30 20 L26 40 L54 40 L50 20 Z" fill={B.paper} stroke={B.border} strokeWidth="1"/>
        <path d="M18 40 Q14 44 12 52 L10 148 Q10 152 14 152 L66 152 Q70 152 70 148 L68 52 Q66 44 62 40 Z" fill={B.canvas} stroke={B.borderDk} strokeWidth="1.5"/>
        <g clipPath="url(#cp-c)"><rect x="10" y={liqY} width="60" height={liqH+10} fill="url(#cp-l)"/></g>
      </svg>
      <div>
        <div style={{ fontFamily:"'Playfair Display',serif",fontSize:15,color:col,fontWeight:600 }}>{pct}%</div>
        <div style={{ fontFamily:"'Manrope',sans-serif",fontSize:9,color:T.faint,letterSpacing:1.2 }}>TELE</div>
      </div>
    </div>
  );
}

function BottleDetail({ pct = 90 }) {
  const liq = bottleLiq(pct);
  const liqH=(pct/100)*108, liqY=40+(108-liqH);
  const col = pct>=80?ACC.gold:pct>=50?"#c0924a":pct>=25?"#b07040":ACC.red;
  return (
    <div style={{ border:`1px solid ${B.border}`,borderRadius:10,padding:"18px 22px",display:"flex",alignItems:"center",gap:22,marginBottom:28,background:B.paper }}>
      <svg width="52" height="104" viewBox="0 0 80 160" fill="none" style={{ flexShrink:0 }}>
        <defs>
          <linearGradient id="dt-l" x1="0" y1="0" x2="0" y2="1">
            <stop offset="0%" stopColor={liq.top} stopOpacity=".9"/>
            <stop offset="100%" stopColor={liq.bot} stopOpacity=".8"/>
          </linearGradient>
          <clipPath id="dt-c"><path d="M18 40 Q14 44 12 52 L10 148 Q10 152 14 152 L66 152 Q70 152 70 148 L68 52 Q66 44 62 40 Z"/></clipPath>
        </defs>
        <rect x="28" y="6" width="24" height="14" rx="3" fill={B.warm} stroke={B.borderDk} strokeWidth="1"/>
        <rect x="31" y="4" width="18" height="4" rx="2" fill={ACC.gold} opacity=".6"/>
        <path d="M30 20 L26 40 L54 40 L50 20 Z" fill={B.paper} stroke={B.border} strokeWidth="1"/>
        <path d="M18 40 Q14 44 12 52 L10 148 Q10 152 14 152 L66 152 Q70 152 70 148 L68 52 Q66 44 62 40 Z" fill={B.canvas} stroke={B.borderDk} strokeWidth="1.5"/>
        <g clipPath="url(#dt-c)">
          <rect x="10" y={liqY} width="60" height={liqH+10} fill="url(#dt-l)"/>
          {pct>3&&pct<98&&<ellipse cx="40" cy={liqY} rx="28" ry="3" fill={liq.top} opacity=".3"/>}
        </g>
        <path d="M16 55 L14 140" stroke="#fff" strokeWidth="2" strokeOpacity=".25" strokeLinecap="round"/>
        <text x="40" y="108" textAnchor="middle" fontFamily="'Manrope',sans-serif" fontSize="12" fontWeight="700" fill={pct>50?"rgba(255,255,255,.8)":T.muted} style={{userSelect:"none"}}>{pct}%</text>
      </svg>
      <div>
        <div style={{ fontFamily:"'Playfair Display',serif",fontSize:28,color:col,fontWeight:600,marginBottom:4 }}>{pct}% tele</div>
        <div style={{ fontFamily:"'Manrope',sans-serif",fontSize:10,color:T.faint,letterSpacing:2,marginBottom:12,textTransform:"uppercase" }}>Töltöttségi szint</div>
        <div style={{ width:160,height:2,background:B.border,borderRadius:2 }}>
          <div style={{ height:"100%",width:`${pct}%`,background:`linear-gradient(90deg,${col}60,${col})`,borderRadius:2,transition:"width .5s ease" }}/>
        </div>
      </div>
    </div>
  );
}

// ─── CONSTANTS ────────────────────────────────────────────────────────────────
const COND       = { mint:"Bontatlan/Mint",excellent:"Kiváló",good:"Jó",fair:"Közepes" };
const COND_COLOR = { mint:ACC.green,excellent:"#4a78b0",good:ACC.gold,fair:ACC.red };
const CATS       = ["Összes","woody","oriental","floral","fresh","aromatic"];
const DECANT_SZ  = [1,2,3,5,10,15,20];
const ICONS      = ["✨","🏺","🫙","🌸","🌿","🍂","☀️","🌑","🥀","💀","🎷","🏔","🌊","🍋","🔥"];

// ─── NAV ──────────────────────────────────────────────────────────────────────
function Nav({ profile, page, go, openLogin, unreadCount }) {
  const [scrolled, setScrolled] = useState(false);
  useEffect(() => {
    const fn = () => setScrolled(window.scrollY > 20);
    window.addEventListener("scroll", fn);
    return () => window.removeEventListener("scroll", fn);
  }, []);
  const rank = getRank(profile?.sales || 0);
  return (
    <nav style={{
      position:"fixed",top:0,left:0,right:0,zIndex:100,height:62,
      background: scrolled ? "rgba(250,248,244,.96)" : B.canvas,
      backdropFilter: "blur(16px)",
      borderBottom:`1px solid ${scrolled ? B.border : "transparent"}`,
      display:"flex",alignItems:"center",justifyContent:"space-between",
      padding:"0 40px",
      transition:"border-color .3s, background .3s",
    }}>
      <div onClick={()=>go("home")} style={{ cursor:"pointer",display:"flex",alignItems:"center",gap:10 }}>
        <span style={{ fontFamily:"'Playfair Display',serif",fontSize:22,fontWeight:700,color:T.heading,letterSpacing:3 }}>SCENTRADE</span>
        <span style={{ width:1,height:16,background:B.borderDk,margin:"0 4px" }}/>
        <span style={{ fontFamily:"'Manrope',sans-serif",fontSize:10,color:T.faint,letterSpacing:3 }}>HU</span>
      </div>
      <div style={{ display:"flex",gap:2,alignItems:"center" }}>
        {[["home","Főoldal"],["market","Piac"]].map(([p,l])=>(
          <button key={p} onClick={()=>go(p)} style={{
            background:"transparent",
            border:"none",
            color: page===p ? T.heading : T.muted,
            padding:"8px 14px",borderRadius:6,cursor:"pointer",
            fontFamily:"'Manrope',sans-serif",fontSize:12,fontWeight: page===p ? 700 : 500,
            letterSpacing:.3,
            borderBottom: page===p ? `2px solid ${ACC.gold}` : "2px solid transparent",
            transition:"all .15s",
          }}>{l}</button>
        ))}
        <button onClick={()=>go("sell")} style={{
          background:ACC.ink,border:"none",color:B.canvas,
          padding:"8px 18px",borderRadius:6,cursor:"pointer",
          fontFamily:"'Manrope',sans-serif",fontSize:12,fontWeight:700,
          letterSpacing:.3,marginLeft:8,
          transition:"opacity .15s",
        }}>+ Hirdetés</button>
        {profile ? (
          <>
            <button onClick={()=>go("messages")} style={{ background:"transparent",border:"none",cursor:"pointer",color:T.muted,fontSize:18,position:"relative",padding:"4px 10px",marginLeft:4 }}>
              ✉
              {unreadCount>0&&<span style={{ position:"absolute",top:1,right:3,background:ACC.gold,borderRadius:10,minWidth:15,height:15,display:"flex",alignItems:"center",justifyContent:"center",fontFamily:"'Manrope',sans-serif",fontSize:8,color:"#fff",fontWeight:700,padding:"0 4px" }}>{unreadCount>9?"9+":unreadCount}</span>}
            </button>
            <button onClick={()=>go("profile_own")} style={{ background:"transparent",border:`1px solid ${B.borderDk}`,borderRadius:24,padding:"4px 12px 4px 5px",cursor:"pointer",display:"flex",alignItems:"center",gap:8,marginLeft:4 }}>
              <Ava u={profile} size={28}/>
              <span style={{ fontFamily:"'Manrope',sans-serif",fontSize:12,fontWeight:600,color:T.body }}>{profile.name?.split(" ")[0]}</span>
            </button>
          </>
        ) : (
          <button onClick={openLogin} style={{ background:"transparent",border:`1px solid ${B.borderDk}`,color:T.body,padding:"8px 18px",borderRadius:6,cursor:"pointer",fontFamily:"'Manrope',sans-serif",fontSize:12,fontWeight:600,marginLeft:8 }}>Belépés</button>
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
      style={{
        background: hov ? B.warm : B.paper,
        border:`1px solid ${hov?B.borderDk:B.border}`,
        borderRadius:10,padding:"26px 22px 20px",
        cursor:onClick?"pointer":"default",
        transition:"all .22s ease",
        transform: hov?"translateY(-2px)":"none",
        boxShadow: hov?"0 8px 32px rgba(0,0,0,.07)":"0 1px 4px rgba(0,0,0,.03)",
        opacity:isSold?.55:1,position:"relative",overflow:"hidden",
      }}>
      {(isSold||isPend)&&(
        <div style={{
          position:"absolute",top:0,left:0,right:0,padding:"4px 0",textAlign:"center",
          background: isSold?"#f2faf6":"#fefaf0",
          borderBottom:`1px solid ${isSold?ACC.green:ACC.gold}28`,
          fontFamily:"'Manrope',sans-serif",fontSize:9,letterSpacing:1.5,
          color:isSold?ACC.green:ACC.gold, fontWeight:700,
        }}>{isSold?"✓ ELADVA":"⏳ FÜGGŐBEN"}</div>
      )}
      <div style={{ display:"flex",gap:5,marginBottom:14,flexWrap:"wrap",marginTop:(isSold||isPend)?24:0 }}>
        <Pill text={isBuy?"Keresett":"Eladó"} bg={isBuy?"#eef4fb":"#faf8f0"} col={isBuy?"#4a78b0":ACC.gold}/>
        <Pill text={isDecant?"Dekant":"Teljes"} bg={isDecant?"#fff5ee":"#f2faf6"} col={isDecant?"#c0724a":ACC.green}/>
        {l.condition&&<Pill text={COND[l.condition]} bg={COND_COLOR[l.condition]+"12"} col={COND_COLOR[l.condition]}/>}
        {l.swap_ok&&<Pill text="Csere OK" bg="#f5f0fb" col="#7a5ab0"/>}
      </div>
      <div style={{ fontSize:40,marginBottom:12 }}>{l.icon||"🫙"}</div>
      <div style={{ fontFamily:"'Manrope',sans-serif",fontSize:10,color:T.faint,letterSpacing:2.5,marginBottom:3,fontWeight:600 }}>{(l.brand||"").toUpperCase()}</div>
      <div style={{ fontFamily:"'Playfair Display',serif",fontSize:20,color:T.heading,lineHeight:1.2,marginBottom:6 }}>{l.name}</div>
      <div style={{ fontSize:12,color:T.faint,marginBottom:14,fontFamily:"'Manrope',sans-serif" }}>{isDecant?`${l.decant_ml}ml dekant`:`${l.size||""}${l.fill?` · ${l.fill}% tele`:""}`}</div>
      {!isDecant&&l.fill&&<BottleCompact pct={l.fill}/>}
      <div style={{ fontFamily:"'Playfair Display',serif",fontSize:22,color:T.heading,marginBottom:16,marginTop:"auto",fontWeight:600 }}>
        {(l.price||0).toLocaleString("hu-HU")} Ft
        {isDecant&&<span style={{ fontSize:12,color:T.faint,fontFamily:"'Manrope',sans-serif",marginLeft:6 }}>/ {l.decant_ml}ml</span>}
      </div>
      <div style={{ display:"flex",alignItems:"center",justifyContent:"space-between",paddingTop:14,borderTop:`1px solid ${B.border}` }}>
        <div style={{ display:"flex",alignItems:"center",gap:8,flexWrap:"wrap" }}>
          <Ava u={u} size={24}/>
          <span style={{ fontSize:12,color:T.muted,fontFamily:"'Manrope',sans-serif",fontWeight:500 }}>{u?.name?.split(" ")[0]||"?"}</span>
          {u?.verified&&<span style={{ color:ACC.gold,fontSize:11 }}>✓</span>}
          <RankBadge sales={u?.sales||0}/>
        </div>
        <span style={{ fontSize:10,color:T.faint,fontFamily:"'Manrope',sans-serif" }}>👁 {l.views||0}</span>
      </div>
    </div>
  );
}

// ─── HOME ─────────────────────────────────────────────────────────────────────
function Home({ go, listings, profiles }) {
  const featured=listings.filter(l=>l.type==="sell"&&l.status!=="sold").slice(0,4);
  const decants=listings.filter(l=>l.listing_type==="decant"&&l.status!=="sold").slice(0,3);
  return (
    <div style={{ paddingTop:62 }}>
      {/* Hero */}
      <section style={{ minHeight:"80vh",display:"flex",flexDirection:"column",alignItems:"center",justifyContent:"center",textAlign:"center",position:"relative",overflow:"hidden",padding:"100px 24px 80px",background:B.canvas }}>
        {/* Subtle decorative lines */}
        <div style={{ position:"absolute",inset:0,backgroundImage:`repeating-linear-gradient(0deg,transparent,transparent 79px,${B.border}50 79px,${B.border}50 80px)`,pointerEvents:"none",opacity:.4 }}/>
        <p style={{ fontFamily:"'Manrope',sans-serif",fontSize:10,color:ACC.gold,letterSpacing:5,marginBottom:28,fontWeight:700,textTransform:"uppercase",position:"relative" }}>Magyar Parfüm Közösség</p>
        <h1 style={{ fontFamily:"'Playfair Display',serif",fontSize:"clamp(48px,8vw,96px)",fontWeight:400,color:T.heading,lineHeight:1.0,marginBottom:20,letterSpacing:-1,position:"relative",maxWidth:820 }}>
          Adj. Végy.<br/><em style={{ color:ACC.gold,fontStyle:"italic" }}>Szaglászkodj.</em>
        </h1>
        <div style={{ width:60,height:1,background:ACC.gold,margin:"0 auto 28px",position:"relative" }}/>
        <p style={{ color:T.muted,fontSize:16,maxWidth:480,lineHeight:1.9,marginBottom:52,fontFamily:"'Manrope',sans-serif",position:"relative" }}>
          Niche és designer parfümök, <strong style={{ color:T.body,fontWeight:600 }}>dekantok</strong> és teljes üvegek biztonságos adásvételéhez.
        </p>
        <div style={{ display:"flex",gap:12,flexWrap:"wrap",justifyContent:"center",position:"relative" }}>
          <button onClick={()=>go("market")} style={{
            background:ACC.ink,border:"none",color:B.canvas,
            padding:"16px 44px",borderRadius:6,cursor:"pointer",
            fontFamily:"'Manrope',sans-serif",fontSize:14,fontWeight:700,letterSpacing:.5,
            boxShadow:"0 4px 20px rgba(0,0,0,.12)",
          }}>Böngéssz a piacon →</button>
          <button onClick={()=>go("sell")} style={{
            background:"transparent",border:`1px solid ${B.borderDk}`,color:T.body,
            padding:"16px 44px",borderRadius:6,cursor:"pointer",
            fontFamily:"'Manrope',sans-serif",fontSize:14,fontWeight:600,letterSpacing:.5,
          }}>Hirdetést feladok</button>
        </div>
      </section>

      {/* Stats strip */}
      <div style={{ background:ACC.ink,padding:"24px 60px",display:"flex",gap:60,justifyContent:"center",flexWrap:"wrap" }}>
        {[["Hirdetés","élőben"],["Értékelés","közösségtől"],["Csere","lehetséges"]].map(([n,l])=>(
          <div key={l} style={{ textAlign:"center" }}>
            <div style={{ fontFamily:"'Playfair Display',serif",fontSize:26,color:ACC.goldWarm,fontWeight:400 }}>∞</div>
            <div style={{ fontFamily:"'Manrope',sans-serif",fontSize:10,color:"rgba(250,248,244,.5)",letterSpacing:2,fontWeight:600,textTransform:"uppercase",marginTop:3 }}>{l}</div>
          </div>
        ))}
      </div>

      {featured.length>0&&(
        <section style={{ padding:"72px 48px",maxWidth:1200,margin:"0 auto" }}>
          <div style={{ display:"flex",justifyContent:"space-between",alignItems:"baseline",marginBottom:40 }}>
            <div>
              <p style={{ fontFamily:"'Manrope',sans-serif",fontSize:10,color:ACC.gold,letterSpacing:3,fontWeight:700,marginBottom:8 }}>KIEMELTEK</p>
              <h2 style={{ fontFamily:"'Playfair Display',serif",fontSize:36,color:T.heading,fontWeight:400 }}>Friss eladások</h2>
            </div>
            <button onClick={()=>go("market")} style={{ background:"none",border:`1px solid ${B.borderDk}`,color:T.muted,cursor:"pointer",fontFamily:"'Manrope',sans-serif",fontSize:11,letterSpacing:1,fontWeight:600,padding:"7px 16px",borderRadius:4 }}>MIND →</button>
          </div>
          <div style={{ display:"grid",gridTemplateColumns:"repeat(auto-fill,minmax(272px,1fr))",gap:18 }}>
            {featured.map(l=><Card key={l.id} l={l} u={profiles[l.user_id]} onClick={()=>{}}/>)}
          </div>
        </section>
      )}

      {decants.length>0&&(
        <section style={{ padding:"0 48px 80px",maxWidth:1200,margin:"0 auto" }}>
          <div style={{ background:B.paper,border:`1px solid ${B.border}`,borderRadius:12,padding:"44px 40px" }}>
            <p style={{ fontFamily:"'Manrope',sans-serif",fontSize:10,color:ACC.gold,letterSpacing:3,fontWeight:700,marginBottom:8 }}>DEKANTOK</p>
            <h2 style={{ fontFamily:"'Playfair Display',serif",fontSize:32,color:T.heading,fontWeight:400,marginBottom:30 }}>Kipróbálnád először?</h2>
            <div style={{ display:"grid",gridTemplateColumns:"repeat(auto-fill,minmax(258px,1fr))",gap:16 }}>
              {decants.map(l=><Card key={l.id} l={l} u={profiles[l.user_id]} onClick={()=>{}}/>)}
            </div>
          </div>
        </section>
      )}

      <footer style={{ borderTop:`1px solid ${B.border}`,padding:"30px 48px",display:"flex",justifyContent:"space-between",alignItems:"center",flexWrap:"wrap",gap:12 }}>
        <span style={{ fontFamily:"'Playfair Display',serif",fontSize:16,color:T.heading,fontWeight:600,letterSpacing:2 }}>SCENTRADE</span>
        <p style={{ fontFamily:"'Manrope',sans-serif",fontSize:11,color:T.faint,letterSpacing:1 }}>© 2025 · Parfüm közösségi platform</p>
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
    return(!sq||(l.brand||"").toLowerCase().includes(sq)||(l.name||"").toLowerCase().includes(sq))&&
      (cat==="Összes"||l.category===cat)&&(typeF==="all"||l.type===typeF)&&(listF==="all"||l.listing_type===listF);
  }).sort((a,b)=>sort==="newest"?new Date(b.created_at)-new Date(a.created_at):sort==="price_asc"?a.price-b.price:b.price-a.price);

  const inp={
    background:B.canvas,border:`1px solid ${B.border}`,color:T.body,
    padding:"9px 14px",borderRadius:6,fontFamily:"'Manrope',sans-serif",
    fontSize:13,outline:"none",fontWeight:500,
  };
  return (
    <div style={{ paddingTop:62,minHeight:"100vh",background:B.canvas }}>
      <div style={{ background:B.paper,borderBottom:`1px solid ${B.border}`,padding:"32px 48px" }}>
        <div style={{ maxWidth:1200,margin:"0 auto" }}>
          <p style={{ fontFamily:"'Manrope',sans-serif",fontSize:10,color:ACC.gold,letterSpacing:3,fontWeight:700,marginBottom:8 }}>MARKETPLACE</p>
          <h1 style={{ fontFamily:"'Playfair Display',serif",fontSize:44,color:T.heading,fontWeight:400,marginBottom:28 }}>Piac</h1>
          <div style={{ display:"flex",gap:8,flexWrap:"wrap",alignItems:"center" }}>
            <input value={q} onChange={e=>setQ(e.target.value)} placeholder="Keresés márka, név..." style={{...inp,width:220}}/>
            {[
              [typeF,setTypeF,[["all","Eladó + Keresett"],["sell","Csak eladó"],["buy","Csak keresett"]]],
              [listF,setListF,[["all","Teljes + Dekant"],["full","Csak teljes"],["decant","Csak dekant"]]],
              [sort,setSort,[["newest","Legújabb"],["price_asc","Legolcsóbb"],["price_desc","Legdrágább"]]],
            ].map(([val,setter,opts],i)=>(
              <select key={i} value={val} onChange={e=>setter(e.target.value)} style={{...inp,cursor:"pointer"}}>
                {opts.map(([v,l])=><option key={v} value={v}>{l}</option>)}
              </select>
            ))}
            <button onClick={()=>setHideS(v=>!v)} style={{
              background:!hideS?ACC.goldPale:"transparent",
              border:`1px solid ${!hideS?ACC.gold:B.borderDk}`,
              color:!hideS?ACC.gold:T.muted,
              padding:"9px 14px",borderRadius:6,cursor:"pointer",
              fontFamily:"'Manrope',sans-serif",fontSize:12,fontWeight:600,
            }}>{hideS?"Eladottak mutatása":"Eladottak elrejtése"}</button>
          </div>
          <div style={{ display:"flex",gap:5,marginTop:16,flexWrap:"wrap" }}>
            {CATS.map(c=>(
              <button key={c} onClick={()=>setCat(c)} style={{
                background:cat===c?ACC.ink:"transparent",
                border:`1px solid ${cat===c?ACC.ink:B.border}`,
                color:cat===c?B.canvas:T.muted,
                padding:"5px 14px",borderRadius:4,cursor:"pointer",
                fontFamily:"'Manrope',sans-serif",fontSize:10,letterSpacing:1,
                textTransform:"uppercase",fontWeight:cat===c?700:500,
                transition:"all .15s",
              }}>{c}</button>
            ))}
          </div>
        </div>
      </div>
      <div style={{ padding:"36px 48px",maxWidth:1200,margin:"0 auto" }}>
        <p style={{ fontFamily:"'Manrope',sans-serif",fontSize:11,color:T.faint,marginBottom:24,letterSpacing:1,fontWeight:600 }}>{filtered.length} HIRDETÉS</p>
        <div style={{ display:"grid",gridTemplateColumns:"repeat(auto-fill,minmax(272px,1fr))",gap:18 }}>
          {filtered.map(l=><Card key={l.id} l={l} u={profiles[l.user_id]} onClick={()=>{setSelId(l.id);go("detail");}}/>)}
        </div>
        {filtered.length===0&&<div style={{ textAlign:"center",padding:"90px 0",color:T.faint,fontFamily:"'Manrope',sans-serif",fontSize:13 }}>{listings.length===0?"Még nincsenek hirdetések. Légy az első!":"Nincs találat."}</div>}
      </div>
    </div>
  );
}

// ─── REVIEW MODAL ────────────────────────────────────────────────────────────
function ReviewModal({ targetUser, fromUser, listingId, transactionType="full", onClose, onDone }) {
  const [rating, setRating] = useState(5);
  const textRef = useRef(null);
  const [saving, setSaving] = useState(false);

  async function submit() {
    const text = textRef.current?.value?.trim() || "";
    setSaving(true);
    // Insert review
    await supabase.from("reviews").insert({
      from_user: fromUser.id,
      to_user:   targetUser.id,
      rating,
      text,
      transaction_type: transactionType,
      listing_id: listingId,
    });
    // Recalculate avg rating for target user
    const { data: revs } = await supabase.from("reviews").select("rating").eq("to_user", targetUser.id);
    if (revs?.length) {
      const avg = (revs.reduce((s,r)=>s+r.rating,0)/revs.length).toFixed(2);
      await supabase.from("profiles").update({ rating: parseFloat(avg), rating_count: revs.length }).eq("id", targetUser.id);
    }
    setSaving(false);
    onDone?.();
    onClose();
  }

  return (
    <Modal onClose={onClose}>
      <div style={{ display:"flex", alignItems:"center", gap:14, marginBottom:24 }}>
        <Ava u={targetUser} size={52}/>
        <div>
          <p style={{ fontFamily:"'Manrope',sans-serif", fontSize:10, color:T.faint, letterSpacing:2, fontWeight:700, marginBottom:4 }}>ÉRTÉKELÉS</p>
          <p style={{ fontFamily:"'Playfair Display',serif", fontSize:24, color:T.heading }}>{targetUser.name}</p>
        </div>
      </div>
      <Pill text="✓ Verified Purchase" bg={ACC.greenPale} col={ACC.green}/>
      <div style={{ margin:"22px 0" }}>
        <Stars v={rating} size={34} interactive onChange={setRating}/>
        <p style={{ fontFamily:"'Manrope',sans-serif", fontSize:11, color:T.faint, marginTop:6 }}>{["","Nagyon rossz","Rossz","Elfogadható","Jó","Kiváló"][rating]}</p>
      </div>
      <textarea ref={textRef} rows={4} placeholder="Hogyan ment az üzlet? Csomagolás, gyorsaság, kommunikáció..."
        style={{ background:B.paper, border:`1px solid ${B.border}`, color:T.body, padding:"13px 15px", borderRadius:7, width:"100%", fontFamily:"'Manrope',sans-serif", fontSize:14, resize:"vertical", outline:"none", boxSizing:"border-box", marginBottom:18, lineHeight:1.7 }}/>
      <button onClick={submit} disabled={saving} style={{ background:ACC.ink, border:"none", color:B.canvas, padding:"14px", width:"100%", borderRadius:7, cursor:"pointer", fontFamily:"'Manrope',sans-serif", fontSize:14, fontWeight:700, opacity:saving?.6:1 }}>
        {saving?"Küldés...":"Értékelés elküldése →"}
      </button>
    </Modal>
  );
}

// ─── DETAIL ───────────────────────────────────────────────────────────────────
function Detail({ l, u, curProfile, go, setProfileId, setActiveChatWith, onStatusChange, onListingUpdate }) {
  const [showOffer, setShowOffer]   = useState(false);
  const [offerVal, setOfferVal]     = useState("");
  const [faved, setFaved]           = useState(false);
  const [status, setStatus]         = useState(l.status || "active");
  const [views, setViews]           = useState(l.views || 0);
  const [buyerId, setBuyerId]       = useState(l.buyer_id || null);

  // Sold flow state
  const [showSoldModal, setShowSoldModal]   = useState(false);
  const [buyerSearch, setBuyerSearch]       = useState("");
  const [searchResults, setSearchResults]   = useState([]);
  const [selectedBuyer, setSelectedBuyer]   = useState(null);
  const [searchLoading, setSearchLoading]   = useState(false);
  const [msgPartners, setMsgPartners]       = useState([]);
  const [loadingPartners, setLoadingPartners] = useState(false);

  // Review modals
  const [showSellerReview, setShowSellerReview] = useState(false); // vevő értékeli az eladót
  const [showBuyerReview, setShowBuyerReview]   = useState(false); // eladó értékeli a vevőt
  const [confirmedBuyer, setConfirmedBuyer]     = useState(null);  // a megerősített vevő profile

  const isDecant = l.listing_type === "decant";
  const isOwn    = curProfile?.id === l.user_id;
  const isBuyer  = curProfile?.id === buyerId && status === "sold";

  // ── Nézettség növelése mountkor (saját hirdetésnél nem számít)
  useEffect(() => {
    if (!l.id || isOwn) return;
    const newViews = (l.views || 0) + 1;
    supabase.from("listings").update({ views: newViews }).eq("id", l.id);
    setViews(newViews);
    onListingUpdate?.(l.id, { views: newViews });
  }, [l.id]);

  async function openMsg() {
    if (!curProfile) { go("login"); return; }
    setActiveChatWith(u.id); go("messages");
  }

  // Eladva gomb → modal megnyitása + üzenetpartnerek betöltése
  async function openSoldModal() {
    setShowSoldModal(true);
    setLoadingPartners(true);
    setBuyerSearch(""); setSearchResults([]); setSelectedBuyer(null);
    const { data } = await supabase.from("messages").select("*")
      .or(`from_user.eq.${curProfile.id},to_user.eq.${curProfile.id}`)
      .order("created_at", { ascending:false });
    if (data) {
      const seen = new Set(), ids = [];
      data.forEach(m => { const p = m.from_user===curProfile.id?m.to_user:m.from_user; if(!seen.has(p)){seen.add(p);ids.push(p);}});
      if (ids.length) {
        const { data:pd } = await supabase.from("profiles").select("id,name,sales,email").in("id", ids);
        setMsgPartners(pd || []);
      }
    }
    setLoadingPartners(false);
  }

  async function searchBuyer(q) {
    setBuyerSearch(q);
    if (q.trim().length < 2) { setSearchResults([]); return; }
    setSearchLoading(true);
    const { data } = await supabase.from("profiles").select("id,name,sales").ilike("name", `%${q}%`).neq("id", curProfile.id).limit(6);
    setSearchResults(data || []);
    setSearchLoading(false);
  }

  async function confirmSold() {
    if (!selectedBuyer) return;
    await supabase.from("listings").update({ status:"sold", buyer_id:selectedBuyer.id }).eq("id", l.id);
    // Eladások számlálója nő az eladónál
    await supabase.from("profiles").update({ sales:(u?.sales||0)+1 }).eq("id", curProfile.id);
    setStatus("sold");
    setBuyerId(selectedBuyer.id);
    onStatusChange?.(l.id, "sold");
    setShowSoldModal(false);
    setConfirmedBuyer(selectedBuyer);
    // Eladó azonnal értékelheti a vevőt
    setShowBuyerReview(true);
  }

  async function changeStatus(s) {
    if (s === "sold") { openSoldModal(); return; }
    await supabase.from("listings").update({ status:s }).eq("id", l.id);
    setStatus(s); onStatusChange?.(l.id, s);
  }

  const sCol = status==="sold"?ACC.green:status==="pending"?ACC.gold:T.muted;

  return (
    <div style={{ paddingTop:62, maxWidth:980, margin:"0 auto", padding:"80px 40px", background:B.canvas }}>
      <button onClick={()=>go("market")} style={{ background:"none", border:"none", color:T.faint, cursor:"pointer", fontFamily:"'Manrope',sans-serif", fontSize:11, letterSpacing:1, marginBottom:36, fontWeight:600, display:"flex", alignItems:"center", gap:6 }}>← VISSZA A PIACRA</button>
      <div style={{ display:"grid", gridTemplateColumns:"1fr 300px", gap:52 }}>
        <div>
          <div style={{ display:"flex", gap:6, flexWrap:"wrap", marginBottom:24 }}>
            <Pill text={l.type==="buy"?"Keresett":"Eladó"} bg={l.type==="buy"?"#eef4fb":"#faf8f0"} col={l.type==="buy"?"#4a78b0":ACC.gold}/>
            <Pill text={isDecant?"Dekant":"Teljes üveg"} bg={isDecant?"#fff5ee":"#f2faf6"} col={isDecant?"#c0724a":ACC.green}/>
            {l.condition&&<Pill text={COND[l.condition]} bg={COND_COLOR[l.condition]+"12"} col={COND_COLOR[l.condition]}/>}
            {status!=="active"&&<Pill text={status==="sold"?"Eladva":"Függőben"} bg={sCol+"12"} col={sCol}/>}
            {l.swap_ok&&<Pill text="Csere OK" bg="#f5f0fb" col="#7a5ab0"/>}
          </div>
          <div style={{ fontSize:72, marginBottom:20 }}>{l.icon||"🫙"}</div>
          <p style={{ fontFamily:"'Manrope',sans-serif", fontSize:10, color:T.faint, letterSpacing:3, marginBottom:5, fontWeight:700 }}>{(l.brand||"").toUpperCase()}</p>
          <h1 style={{ fontFamily:"'Playfair Display',serif", fontSize:52, color:T.heading, fontWeight:400, lineHeight:1.05, marginBottom:8 }}>{l.name}</h1>
          <p style={{ color:T.faint, marginBottom:28, fontSize:14, fontFamily:"'Manrope',sans-serif" }}>{isDecant?`${l.decant_ml}ml spray dekant`:`${l.size||""}`}</p>
          {!isDecant&&l.fill&&<BottleDetail pct={l.fill}/>}
          <div style={{ fontFamily:"'Playfair Display',serif", fontSize:48, color:T.heading, marginBottom:36, fontWeight:600 }}>{(l.price||0).toLocaleString("hu-HU")} Ft</div>
          <div style={{ border:`1px solid ${B.border}`, borderRadius:8, padding:"22px 26px", marginBottom:24, background:B.paper }}>
            <p style={{ fontFamily:"'Manrope',sans-serif", fontSize:10, color:T.faint, letterSpacing:2, marginBottom:14, fontWeight:700 }}>LEÍRÁS</p>
            <p style={{ color:T.body, lineHeight:1.9, fontSize:15, fontFamily:"'Manrope',sans-serif" }}>{l.description}</p>
          </div>
          {l.tags?.length>0&&(
            <div style={{ display:"flex", flexWrap:"wrap", gap:6, marginBottom:24 }}>
              {l.tags.map(t=><span key={t} style={{ background:B.paper, border:`1px solid ${B.border}`, color:T.muted, padding:"4px 12px", borderRadius:3, fontSize:11, fontFamily:"'Manrope',sans-serif", fontWeight:500 }}>#{t}</span>)}
            </div>
          )}
          {isOwn&&(
            <div style={{ border:`1px solid ${B.border}`, borderRadius:8, padding:"20px 24px", background:B.paper }}>
              <p style={{ fontFamily:"'Manrope',sans-serif", fontSize:10, color:T.faint, letterSpacing:2, marginBottom:16, fontWeight:700 }}>HIRDETÉS STÁTUSZA</p>
              <div style={{ display:"flex", gap:8, flexWrap:"wrap" }}>
                {[["active","Aktív",T.muted],["pending","Függőben",ACC.gold],["sold","Eladva",ACC.green]].map(([s,label,c])=>(
                  <button key={s} onClick={()=>changeStatus(s)}
                    style={{ background:status===s?c+"12":"transparent", border:`1px solid ${status===s?c+"44":B.border}`, color:status===s?c:T.faint, padding:"8px 16px", borderRadius:5, cursor:"pointer", fontFamily:"'Manrope',sans-serif", fontSize:11, fontWeight:status===s?700:500, transition:"all .15s" }}>{label}</button>
                ))}
              </div>
            </div>
          )}
        </div>

        {/* Jobb panel */}
        <div style={{ display:"flex", flexDirection:"column", gap:12 }}>
          <div style={{ border:`1px solid ${B.border}`, borderRadius:8, padding:"22px 20px", background:B.paper }}>
            <p style={{ fontFamily:"'Manrope',sans-serif", fontSize:10, color:T.faint, letterSpacing:2, marginBottom:18, fontWeight:700 }}>ELADÓ</p>
            <div style={{ display:"flex", gap:12, alignItems:"center", marginBottom:16, cursor:"pointer" }} onClick={()=>{setProfileId(u?.id);go("profile");}}>
              <Ava u={u} size={50}/>
              <div>
                <div style={{ fontFamily:"'Playfair Display',serif", fontSize:20, color:T.heading }}>{u?.name}{u?.verified&&<span style={{color:ACC.gold,fontSize:13}}> ✓</span>}</div>
                <div style={{ fontSize:12, color:T.faint, marginTop:2, fontFamily:"'Manrope',sans-serif" }}>📍 {u?.location}</div>
              </div>
            </div>
            <div style={{ marginBottom:12 }}>
              {isAdmin(u)?<RankBadge isAdmin size="lg"/>:<RankBadge sales={u?.sales||0} size="lg"/>}
              {!isAdmin(u)&&<span style={{ fontFamily:"'Manrope',sans-serif", fontSize:11, color:T.muted, marginLeft:8 }}>{u?.sales||0} eladás</span>}
            </div>
            <div style={{ display:"flex", alignItems:"center", gap:8 }}>
              <Stars v={u?.rating||0} size={14}/>
              <span style={{ fontSize:12, color:T.muted, fontFamily:"'Manrope',sans-serif" }}>{u?.rating||0} · {u?.rating_count||0} értékelés</span>
            </div>
            {/* Nézettség */}
            <div style={{ marginTop:14, paddingTop:12, borderTop:`1px solid ${B.border}`, display:"flex", alignItems:"center", gap:6 }}>
              <span style={{ fontSize:13 }}>👁</span>
              <span style={{ fontFamily:"'Manrope',sans-serif", fontSize:12, color:T.faint }}>{views} megtekintés</span>
            </div>
          </div>

          {/* Vevő gombjai */}
          {!isOwn&&status!=="sold"&&(
            <>
              <button onClick={openMsg} style={{ background:ACC.ink, border:"none", color:B.canvas, padding:"14px", borderRadius:7, cursor:"pointer", fontFamily:"'Manrope',sans-serif", fontSize:14, fontWeight:700 }}>✉ Üzenet küldése</button>
              <button onClick={()=>setFaved(!faved)} style={{ background:"transparent", border:`1px solid ${faved?ACC.gold:B.borderDk}`, color:faved?ACC.gold:T.muted, padding:"12px", borderRadius:7, cursor:"pointer", fontFamily:"'Manrope',sans-serif", fontSize:12, fontWeight:600 }}>{faved?"♥ Kedvelve":"♡ Kedvelés"}</button>
              <button onClick={()=>setShowOffer(!showOffer)} style={{ background:"transparent", border:`1px solid ${B.border}`, color:T.muted, padding:"12px", borderRadius:7, cursor:"pointer", fontFamily:"'Manrope',sans-serif", fontSize:12, fontWeight:600 }}>Ajánlat küldése</button>
              {showOffer&&(
                <div style={{ border:`1px solid ${B.border}`, borderRadius:7, padding:14, background:B.paper }}>
                  <input value={offerVal} onChange={e=>setOfferVal(e.target.value)} placeholder="Ajánlott ár (Ft)" type="number"
                    style={{ background:B.canvas, border:`1px solid ${B.border}`, color:T.body, padding:"10px 13px", borderRadius:5, width:"100%", fontFamily:"'Manrope',sans-serif", fontSize:14, marginBottom:8, boxSizing:"border-box", outline:"none" }}/>
                  <button onClick={openMsg} style={{ background:ACC.goldPale, border:`1px solid ${ACC.goldMid}`, color:ACC.gold, padding:"9px", width:"100%", borderRadius:5, cursor:"pointer", fontFamily:"'Manrope',sans-serif", fontSize:11, fontWeight:700 }}>Ajánlat üzenetben →</button>
                </div>
              )}
            </>
          )}

          {/* Vevő értékeli az eladót — ha ez a hirdetés vevője */}
          {isBuyer&&(
            <button onClick={()=>setShowSellerReview(true)} style={{ background:`linear-gradient(135deg,${ACC.gold},#8a6a20)`, border:"none", color:"#fff", padding:"14px", borderRadius:7, cursor:"pointer", fontFamily:"'Manrope',sans-serif", fontSize:13, fontWeight:700 }}>
              ⭐ Értékelem az eladót
            </button>
          )}

          {status==="sold"&&!isBuyer&&(
            <div style={{ background:ACC.greenPale, border:`1px solid ${ACC.green}30`, borderRadius:7, padding:"16px", textAlign:"center" }}>
              <p style={{ fontFamily:"'Manrope',sans-serif", fontSize:12, color:ACC.green, letterSpacing:1, fontWeight:700 }}>✓ ELADVA</p>
            </div>
          )}

          <div style={{ border:`1px solid ${B.border}`, borderRadius:7, padding:"16px 18px", background:B.paper }}>
            <p style={{ fontFamily:"'Manrope',sans-serif", fontSize:9, color:T.faint, letterSpacing:1.5, marginBottom:12, fontWeight:700 }}>BIZTONSÁGOS VÁSÁRLÁS</p>
            {["Valódi értékelések","PM alapú egyeztetés","Hitelesített jelvény","Átverés bejelentés"].map(txt=>(
              <div key={txt} style={{ display:"flex", gap:10, fontSize:12, color:T.muted, marginBottom:7, fontFamily:"'Manrope',sans-serif" }}>
                <span style={{color:ACC.gold,flexShrink:0}}>✓</span>{txt}
              </div>
            ))}
          </div>
        </div>
      </div>

      {/* ── ELADVA MODAL: vevő kiválasztása ── */}
      {showSoldModal&&(
        <Modal onClose={()=>setShowSoldModal(false)}>
          <h2 style={{ fontFamily:"'Playfair Display',serif", fontSize:26, color:T.heading, fontWeight:400, marginBottom:8 }}>Kinek adtad el?</h2>
          <p style={{ fontFamily:"'Manrope',sans-serif", fontSize:12, color:T.muted, marginBottom:22, lineHeight:1.7 }}>Keresd meg névvel, vagy válaszd ki az üzenetpartnereid közül.</p>

          {/* Keresés */}
          <div style={{ marginBottom:20 }}>
            <p style={{ fontFamily:"'Manrope',sans-serif", fontSize:10, color:T.faint, letterSpacing:2, marginBottom:8, fontWeight:700, textTransform:"uppercase" }}>Keresés névvel</p>
            <div style={{ position:"relative" }}>
              <input value={buyerSearch} onChange={e=>searchBuyer(e.target.value)} placeholder="pl. illatmester_bp" autoComplete="off"
                style={{ width:"100%", background:B.paper, border:`1px solid ${B.border}`, color:T.body, padding:"12px 15px", borderRadius:7, fontFamily:"'Manrope',sans-serif", fontSize:14, outline:"none", boxSizing:"border-box" }}/>
              {searchLoading&&<span style={{ position:"absolute", right:14, top:"50%", transform:"translateY(-50%)", color:T.faint, fontSize:12 }}>…</span>}
            </div>
            {searchResults.length>0&&(
              <div style={{ marginTop:8, display:"flex", flexDirection:"column", gap:6 }}>
                {searchResults.map(p=>(
                  <div key={p.id} onClick={()=>{setSelectedBuyer(p);setBuyerSearch(p.name);setSearchResults([]);}}
                    style={{ display:"flex", alignItems:"center", gap:12, padding:"10px 14px", borderRadius:7, cursor:"pointer", background:selectedBuyer?.id===p.id?ACC.goldPale:B.paper, border:`1px solid ${selectedBuyer?.id===p.id?ACC.gold:B.border}` }}>
                    <Ava u={p} size={32}/><div style={{ flex:1 }}><div style={{ fontFamily:"'Playfair Display',serif", fontSize:16, color:T.heading }}>{p.name}</div><RankBadge sales={p.sales||0}/></div>
                    {selectedBuyer?.id===p.id&&<span style={{ color:ACC.gold, fontSize:16 }}>✓</span>}
                  </div>
                ))}
              </div>
            )}
          </div>

          {/* Elválasztó */}
          <div style={{ display:"flex", alignItems:"center", gap:12, marginBottom:20 }}>
            <div style={{ flex:1, height:1, background:B.border }}/><span style={{ fontFamily:"'Manrope',sans-serif", fontSize:10, color:T.faint, letterSpacing:2 }}>VAGY</span><div style={{ flex:1, height:1, background:B.border }}/>
          </div>

          {/* Üzenetpartnerek */}
          <p style={{ fontFamily:"'Manrope',sans-serif", fontSize:10, color:T.faint, letterSpacing:2, marginBottom:10, fontWeight:700, textTransform:"uppercase" }}>Üzenetpartnereid</p>
          {loadingPartners?(
            <p style={{ color:T.faint, fontFamily:"'Manrope',sans-serif", fontSize:12, padding:"16px 0" }}>Betöltés...</p>
          ):(
            <div style={{ display:"flex", flexDirection:"column", gap:6, marginBottom:20, maxHeight:220, overflowY:"auto" }}>
              {msgPartners.length===0&&<p style={{ color:T.faint, fontFamily:"'Manrope',sans-serif", fontSize:12, padding:"8px 0" }}>Még nincs üzenetpartnered.</p>}
              {msgPartners.map(p=>(
                <div key={p.id} onClick={()=>{setSelectedBuyer(p);setBuyerSearch("");setSearchResults([]);}}
                  style={{ display:"flex", alignItems:"center", gap:12, padding:"10px 14px", borderRadius:7, cursor:"pointer", background:selectedBuyer?.id===p.id?ACC.goldPale:B.paper, border:`1px solid ${selectedBuyer?.id===p.id?ACC.gold:B.border}`, transition:"all .15s" }}>
                  <Ava u={p} size={34}/><div style={{ flex:1 }}><div style={{ fontFamily:"'Playfair Display',serif", fontSize:16, color:T.heading }}>{p.name}</div><RankBadge sales={p.sales||0}/></div>
                  {selectedBuyer?.id===p.id&&<span style={{ color:ACC.gold, fontSize:16 }}>✓</span>}
                </div>
              ))}
            </div>
          )}

          {selectedBuyer&&(
            <div style={{ background:ACC.greenPale, border:`1px solid ${ACC.green}30`, borderRadius:8, padding:"10px 14px", marginBottom:14, display:"flex", alignItems:"center", gap:12 }}>
              <Ava u={selectedBuyer} size={30}/>
              <div><p style={{ fontFamily:"'Manrope',sans-serif", fontSize:9, color:ACC.green, letterSpacing:1, fontWeight:700, marginBottom:2 }}>KIVÁLASZTOTT VEVŐ</p><p style={{ fontFamily:"'Playfair Display',serif", fontSize:15, color:T.heading }}>{selectedBuyer.name}</p></div>
              <button onClick={()=>setSelectedBuyer(null)} style={{ marginLeft:"auto", background:"none", border:"none", color:T.faint, cursor:"pointer", fontSize:18 }}>×</button>
            </div>
          )}

          <button onClick={confirmSold} disabled={!selectedBuyer}
            style={{ background:selectedBuyer?`linear-gradient(135deg,${ACC.green},#2a6a3a)`:B.warm, border:"none", color:selectedBuyer?"#fff":T.faint, padding:"15px", width:"100%", borderRadius:7, cursor:selectedBuyer?"pointer":"not-allowed", fontFamily:"'Manrope',sans-serif", fontSize:14, fontWeight:700, transition:"all .2s" }}>
            {selectedBuyer?`✓ Eladva – ${selectedBuyer.name}`:"Válassz vevőt a megerősítéshez"}
          </button>
        </Modal>
      )}

      {/* ── Eladó értékeli a VEVŐT (confirmedBuyer) ── */}
      {showBuyerReview&&confirmedBuyer&&curProfile&&(
        <ReviewModal
          targetUser={confirmedBuyer}
          fromUser={curProfile}
          listingId={l.id}
          transactionType="verified"
          onClose={()=>setShowBuyerReview(false)}
          onDone={()=>{}}
        />
      )}

      {/* ── Vevő értékeli az ELADÓT ── */}
      {showSellerReview&&u&&curProfile&&(
        <ReviewModal
          targetUser={u}
          fromUser={curProfile}
          listingId={l.id}
          transactionType="verified"
          onClose={()=>setShowSellerReview(false)}
          onDone={()=>{}}
        />
      )}
    </div>
  );
}

// ─── PROFILE ──────────────────────────────────────────────────────────────────
function Profile({ pu, curProfile, go, listings, setActiveChatWith, onSignOut }) {
  const [tab,setTab]=useState("listings");
  const [reviews,setReviews]=useState([]);
  const [showRM,setShowRM]=useState(false);
  const [myRating,setMyRating]=useState(5);
  const [myText,setMyText]=useState("");
  const [wishlist,setWishlist]=useState([]);
  const wishRef=useRef(null);
  const isOwn=curProfile?.id===pu?.id;
  const uls=listings.filter(l=>l.user_id===pu?.id);

  useEffect(()=>{
    if(!pu?.id)return;
    supabase.from("reviews").select("*").eq("to_user",pu.id).order("created_at",{ascending:false}).then(({data})=>setReviews(data||[]));
    supabase.from("wishlists").select("*").eq("user_id",pu.id).order("created_at",{ascending:false}).then(({data})=>setWishlist(data||[]));
  },[pu?.id]);

  if(!pu)return null;
  const avg=reviews.length?(reviews.reduce((s,r)=>s+r.rating,0)/reviews.length).toFixed(1):(pu.rating||0).toFixed(1);

  return (
    <div style={{ paddingTop:62,maxWidth:980,margin:"0 auto",padding:"80px 40px",background:B.canvas }}>
      <div style={{ display:"flex",gap:32,alignItems:"flex-start",marginBottom:48,flexWrap:"wrap",paddingBottom:40,borderBottom:`1px solid ${B.border}` }}>
        <Ava u={pu} size={88}/>
        <div style={{ flex:1 }}>
          <div style={{ display:"flex",gap:12,alignItems:"center",flexWrap:"wrap",marginBottom:10 }}>
            <h1 style={{ fontFamily:"'Playfair Display',serif",fontSize:40,color:T.heading,fontWeight:400 }}>{pu.name}</h1>
            {pu.verified&&<Pill text="Hitelesített" bg={ACC.goldPale} col={ACC.gold}/>}
            <RankBadge sales={pu.sales||0} size="lg"/>
          </div>
          <div style={{ display:"flex",gap:10,alignItems:"center",marginBottom:12 }}>
            <Stars v={Number(avg)} size={16}/>
            <span style={{ fontFamily:"'Playfair Display',serif",fontSize:20,color:ACC.gold }}>{avg}</span>
            <span style={{ color:T.faint,fontSize:13,fontFamily:"'Manrope',sans-serif" }}>({reviews.length} értékelés)</span>
          </div>
          <p style={{ color:T.faint,fontSize:13,marginBottom:10,fontFamily:"'Manrope',sans-serif" }}>📍 {pu.location} · Tag: {pu.created_at?.slice(0,7)} óta</p>
          <p style={{ color:T.muted,fontSize:14,lineHeight:1.85,maxWidth:500,fontFamily:"'Manrope',sans-serif" }}>{pu.bio}</p>
        </div>
        <div style={{ display:"flex",flexDirection:"column",gap:8 }}>
          {!isOwn&&curProfile&&(
            <>
              <button onClick={()=>{setActiveChatWith(pu.id);go("messages");}} style={{ background:ACC.ink,border:"none",color:B.canvas,padding:"10px 22px",borderRadius:6,cursor:"pointer",fontFamily:"'Manrope',sans-serif",fontSize:12,fontWeight:700 }}>✉ ÜZENET</button>
              <button onClick={()=>setShowRM(true)} style={{ background:"transparent",border:`1px solid ${B.borderDk}`,color:T.body,padding:"10px 22px",borderRadius:6,cursor:"pointer",fontFamily:"'Manrope',sans-serif",fontSize:12,fontWeight:600 }}>⭐ ÉRTÉKELÉS</button>
            </>
          )}
          {isOwn&&<button onClick={onSignOut} style={{ background:"transparent",border:`1px solid ${ACC.red}30`,color:ACC.red,padding:"10px 22px",borderRadius:6,cursor:"pointer",fontFamily:"'Manrope',sans-serif",fontSize:12,fontWeight:600 }}>Kijelentkezés</button>}
        </div>
      </div>

      {isOwn&&<div style={{ marginBottom:36 }}><RankProgress sales={pu.sales||0}/></div>}

      {/* Tabs */}
      <div style={{ display:"flex",borderBottom:`1px solid ${B.border}`,marginBottom:36 }}>
        {[["listings",`Hirdetések (${uls.length})`],["reviews",`Értékelések (${reviews.length})`],["wishlist",`Kívánlista (${wishlist.length})`]].map(([k,l])=>(
          <button key={k} onClick={()=>setTab(k)} style={{
            background:"transparent",border:"none",
            borderBottom:tab===k?`2px solid ${ACC.gold}`:"2px solid transparent",
            color:tab===k?T.heading:T.faint,
            padding:"12px 20px",cursor:"pointer",
            fontFamily:"'Manrope',sans-serif",fontSize:12,
            fontWeight:tab===k?700:500,letterSpacing:.3,
            marginBottom:-1,
          }}>{l}</button>
        ))}
      </div>

      {tab==="listings"&&(
        <div style={{ display:"grid",gridTemplateColumns:"repeat(auto-fill,minmax(262px,1fr))",gap:16 }}>
          {uls.map(l=><Card key={l.id} l={l} u={pu}/>)}
          {uls.length===0&&<p style={{ color:T.faint,fontFamily:"'Manrope',sans-serif",fontSize:13 }}>Nincs hirdetés.</p>}
        </div>
      )}
      {tab==="reviews"&&(
        <div style={{ display:"flex",flexDirection:"column",gap:14 }}>
          {reviews.map((r,i)=>(
            <div key={i} style={{ border:`1px solid ${B.border}`,borderRadius:8,padding:"18px 22px",background:B.paper }}>
              <div style={{ display:"flex",justifyContent:"space-between",marginBottom:10 }}><Stars v={r.rating}/><span style={{ color:T.faint,fontFamily:"'Manrope',sans-serif",fontSize:11 }}>{r.created_at?.slice(0,7)}</span></div>
              <p style={{ color:T.body,fontSize:14,lineHeight:1.8,fontFamily:"'Manrope',sans-serif" }}>{r.text}</p>
            </div>
          ))}
          {reviews.length===0&&<p style={{ color:T.faint,fontFamily:"'Manrope',sans-serif",fontSize:13 }}>Még nincs értékelés.</p>}
        </div>
      )}
      {tab==="wishlist"&&(
        <div>
          <div style={{ border:`1px solid ${B.border}`,borderRadius:8,padding:"22px 26px",marginBottom:28,background:B.paper }}>
            <p style={{ fontFamily:"'Playfair Display',serif",fontSize:20,color:T.heading,marginBottom:8 }}>🌟 Kívánlista</p>
            <p style={{ fontFamily:"'Manrope',sans-serif",fontSize:12,color:T.muted,lineHeight:1.8 }}>Ha valaki feltölti valamelyik keresett parfümodet, automatikus értesítést kapsz.</p>
          </div>
          {isOwn&&(
            <div style={{ display:"flex",gap:10,marginBottom:24 }}>
              <input ref={wishRef} placeholder="pl. Creed Aventus  vagy  Dior Sauvage" defaultValue="" autoComplete="off"
                style={{ flex:1,background:B.paper,border:`1px solid ${B.border}`,color:T.body,padding:"12px 15px",borderRadius:7,fontFamily:"'Manrope',sans-serif",fontSize:14,outline:"none" }}/>
              <button style={{ background:ACC.ink,border:"none",color:B.canvas,padding:"12px 20px",borderRadius:7,cursor:"pointer",fontFamily:"'Manrope',sans-serif",fontSize:12,fontWeight:700,whiteSpace:"nowrap" }}>+ Hozzáad</button>
            </div>
          )}
          <div style={{ display:"flex",flexDirection:"column",gap:8 }}>
            {wishlist.map(w=>(
              <div key={w.id} style={{ border:`1px solid ${B.border}`,borderRadius:8,padding:"14px 18px",display:"flex",alignItems:"center",justifyContent:"space-between",gap:14,background:B.paper }}>
                <div style={{ display:"flex",alignItems:"center",gap:14 }}>
                  <span style={{ fontSize:20 }}>🌟</span>
                  <div>
                    <div style={{ fontFamily:"'Playfair Display',serif",fontSize:16,color:T.heading }}>{w.raw}</div>
                    <div style={{ fontFamily:"'Manrope',sans-serif",fontSize:9,color:T.faint,marginTop:2,letterSpacing:1.2,fontWeight:600 }}>ÉRTESÍTÉST KÉREK HA MEGJELENIK</div>
                  </div>
                </div>
                {isOwn&&<button style={{ background:"transparent",border:`1px solid ${ACC.red}25`,color:ACC.red,padding:"5px 11px",borderRadius:4,cursor:"pointer",fontFamily:"'Manrope',sans-serif",fontSize:10,fontWeight:600 }}>Töröl</button>}
              </div>
            ))}
            {wishlist.length===0&&<p style={{ color:T.faint,fontFamily:"'Manrope',sans-serif",fontSize:13,textAlign:"center",padding:"40px 0" }}>{isOwn?"Még nincs kívánságod. Adj hozzá parfümöket fentebb!":"Ennek a felhasználónak nincs nyilvános kívánlistája."}</p>}
          </div>
        </div>
      )}

      {showRM&&(
        <Modal onClose={()=>setShowRM(false)}>
          <h2 style={{ fontFamily:"'Playfair Display',serif",fontSize:28,color:T.heading,fontWeight:400,marginBottom:22 }}>Értékelés írása</h2>
          <div style={{ marginBottom:22 }}><Stars v={myRating} size={30} interactive onChange={setMyRating}/></div>
          <textarea value={myText} onChange={e=>setMyText(e.target.value)} rows={4} placeholder="Írd le tapasztalatod..."
            style={{ background:B.paper,border:`1px solid ${B.border}`,color:T.body,padding:"13px 15px",borderRadius:7,width:"100%",fontFamily:"'Manrope',sans-serif",fontSize:14,resize:"vertical",outline:"none",boxSizing:"border-box",marginBottom:18,lineHeight:1.7 }}/>
          <button onClick={()=>setShowRM(false)} style={{ background:ACC.ink,border:"none",color:B.canvas,padding:"14px",width:"100%",borderRadius:7,cursor:"pointer",fontFamily:"'Manrope',sans-serif",fontSize:14,fontWeight:700 }}>Értékelés küldése →</button>
        </Modal>
      )}
    </div>
  );
}

// ─── MESSAGES (simplified) ────────────────────────────────────────────────────
function Messages({ curProfile, activeChatWith, setActiveChatWith }) {
  const [chat,setChat]=useState([]); const [newMsg,setNewMsg]=useState("");
  const bottomRef=useRef(null);
  useEffect(()=>{bottomRef.current?.scrollIntoView({behavior:"smooth"});},[chat]);

  return (
    <div style={{ paddingTop:62,height:"100dvh",display:"flex",overflow:"hidden",background:B.canvas }}>
      <div style={{ width:300,borderRight:`1px solid ${B.border}`,display:"flex",flexDirection:"column",background:B.paper }}>
        <div style={{ padding:"20px",borderBottom:`1px solid ${B.border}` }}>
          <p style={{ fontFamily:"'Playfair Display',serif",fontSize:22,color:T.heading }}>Üzenetek</p>
        </div>
        <div style={{ flex:1,display:"flex",alignItems:"center",justifyContent:"center" }}>
          <p style={{ color:T.faint,fontFamily:"'Manrope',sans-serif",fontSize:12,textAlign:"center",padding:20 }}>Üzeneteid megjelennek itt a valódi alkalmazásban.</p>
        </div>
      </div>
      <div style={{ flex:1,display:"flex",flexDirection:"column" }}>
        <div style={{ flex:1,display:"flex",alignItems:"center",justifyContent:"center",flexDirection:"column",gap:16 }}>
          <span style={{ fontSize:48,opacity:.1 }}>✉</span>
          <p style={{ color:T.faint,fontFamily:"'Manrope',sans-serif",fontSize:13 }}>Válassz egy beszélgetést</p>
        </div>
        <div style={{ padding:"12px 16px",borderTop:`1px solid ${B.border}`,display:"flex",gap:10,background:B.paper }}>
          <input value={newMsg} onChange={e=>setNewMsg(e.target.value)} placeholder="Írj üzenetet..."
            style={{ flex:1,background:B.canvas,border:`1px solid ${B.border}`,color:T.body,padding:"12px 15px",borderRadius:8,fontFamily:"'Manrope',sans-serif",fontSize:14,outline:"none" }}/>
          <button onClick={()=>setNewMsg("")} style={{ background:ACC.ink,border:"none",color:B.canvas,padding:"12px 18px",borderRadius:8,cursor:"pointer",fontFamily:"'Manrope',sans-serif",fontWeight:700,fontSize:16 }}>→</button>
        </div>
      </div>
    </div>
  );
}

// ─── SELL FIELD ───────────────────────────────────────────────────────────────
function SellField({ label, error, children }) {
  return (
    <div style={{ marginBottom:22 }}>
      <div style={{ fontFamily:"'Manrope',sans-serif",fontSize:10,color:error?ACC.red:T.faint,letterSpacing:2,marginBottom:8,textTransform:"uppercase",fontWeight:700 }}>
        {label}{error&&<span style={{ marginLeft:8,textTransform:"none",letterSpacing:0,fontSize:11,fontWeight:500 }}>— {error}</span>}
      </div>
      {children}
    </div>
  );
}

// ─── SELL ─────────────────────────────────────────────────────────────────────
function Sell({ curProfile, go, setListings, showToast }) {
  const [sType,setSType]=useState("sell"); const [sListingType,setSLT]=useState("full");
  const [sSize,setSSize]=useState("100ml"); const [sFill,setSFill]=useState(90);
  const [sCondition,setSCond]=useState("excellent"); const [sDecantMl,setSDecantMl]=useState("5");
  const [sCategory,setSCategory]=useState("woody"); const [sIcon,setSIcon]=useState("✨");
  const [sSwap,setSSwap]=useState(false); const [loading,setLoading]=useState(false); const [errors,setErrors]=useState({});
  const refBrand=useRef(null); const refName=useRef(null); const refPrice=useRef(null); const refDesc=useRef(null); const refTags=useRef(null);

  const inp={
    background:B.paper,border:`1px solid ${B.border}`,color:T.body,
    padding:"13px 15px",borderRadius:7,fontFamily:"'Manrope',sans-serif",
    fontSize:16,width:"100%",boxSizing:"border-box",outline:"none",
  };
  const errB={border:`1px solid ${ACC.red}55`};

  function submit() {
    const brand=refBrand.current?.value?.trim()||""; const name=refName.current?.value?.trim()||"";
    const price=refPrice.current?.value||""; const desc=refDesc.current?.value?.trim()||"";
    const e={};
    if(!brand)e.brand="Kötelező"; if(!name)e.name="Kötelező";
    if(!price||Number(price)<=0)e.price="Adj meg érvényes árat"; if(!desc)e.description="Kötelező";
    if(Object.keys(e).length>0){setErrors(e);showToast("Töltsd ki a kötelező mezőket!","error");return;}
    showToast("Hirdetés sikeresen közzétéve!","success");
    setTimeout(()=>go("market"),900);
  }

  return (
    <div style={{ paddingTop:62,maxWidth:700,margin:"0 auto",padding:"80px 24px 100px",background:B.canvas }}>
      <p style={{ fontFamily:"'Manrope',sans-serif",fontSize:10,color:ACC.gold,letterSpacing:3,fontWeight:700,marginBottom:8,textTransform:"uppercase" }}>ÚJ HIRDETÉS</p>
      <h1 style={{ fontFamily:"'Playfair Display',serif",fontSize:44,color:T.heading,fontWeight:400,marginBottom:10 }}>Hirdetés feladása</h1>
      <p style={{ color:T.faint,fontSize:13,marginBottom:48,fontFamily:"'Manrope',sans-serif" }}>Minden mező kitöltése gyorsabb eladást hoz.</p>

      <SellField label="Mit szeretnél?">
        <div style={{ display:"flex",gap:8 }}>
          {[["sell","🏷 Eladom"],["buy","🔍 Keresem"]].map(([t,l])=>(
            <button key={t} onClick={()=>setSType(t)} style={{ flex:1,background:sType===t?ACC.ink:"transparent",border:`1px solid ${sType===t?ACC.ink:B.borderDk}`,color:sType===t?B.canvas:T.muted,padding:"13px",borderRadius:7,cursor:"pointer",fontFamily:"'Manrope',sans-serif",fontSize:13,fontWeight:sType===t?700:500,transition:"all .15s" }}>{l}</button>
          ))}
        </div>
      </SellField>

      <SellField label="Hirdetés típusa">
        <div style={{ display:"flex",gap:8 }}>
          {[["full","🫙 Teljes üveg"],["decant","💧 Dekant"]].map(([t,l])=>(
            <button key={t} onClick={()=>setSLT(t)} style={{ flex:1,background:sListingType===t?ACC.ink:"transparent",border:`1px solid ${sListingType===t?ACC.ink:B.borderDk}`,color:sListingType===t?B.canvas:T.muted,padding:"13px",borderRadius:7,cursor:"pointer",fontFamily:"'Manrope',sans-serif",fontSize:13,fontWeight:sListingType===t?700:500,transition:"all .15s" }}>{l}</button>
          ))}
        </div>
      </SellField>

      <SellField label="Márka *" error={errors.brand}>
        <input ref={refBrand} defaultValue="" placeholder="pl. Creed" autoComplete="off" style={{...inp,...(errors.brand?errB:{})}}/>
      </SellField>
      <SellField label="Parfüm neve *" error={errors.name}>
        <input ref={refName} defaultValue="" placeholder="pl. Aventus" autoComplete="off" style={{...inp,...(errors.name?errB:{})}}/>
      </SellField>

      <div style={{ display:"grid",gridTemplateColumns:"1fr 1fr",gap:12 }}>
        {sListingType==="full"&&(
          <SellField label="Méret">
            <select value={sSize} onChange={e=>setSSize(e.target.value)} style={{...inp,cursor:"pointer"}}>
              {["30ml","50ml","75ml","100ml","125ml","150ml","200ml"].map(s=><option key={s}>{s}</option>)}
            </select>
          </SellField>
        )}
        {sListingType==="decant"&&(
          <SellField label="Dekant (ml)">
            <select value={sDecantMl} onChange={e=>setSDecantMl(e.target.value)} style={{...inp,cursor:"pointer"}}>
              {DECANT_SZ.map(s=><option key={s} value={s}>{s}ml</option>)}
            </select>
          </SellField>
        )}
        <SellField label="Kategória">
          <select value={sCategory} onChange={e=>setSCategory(e.target.value)} style={{...inp,cursor:"pointer"}}>
            {["woody","oriental","floral","fresh","aromatic"].map(c=><option key={c}>{c}</option>)}
          </select>
        </SellField>
        {sListingType==="full"&&sType==="sell"&&(
          <SellField label="Állapot">
            <select value={sCondition} onChange={e=>setSCond(e.target.value)} style={{...inp,cursor:"pointer"}}>
              {Object.entries(COND).map(([k,v])=><option key={k} value={k}>{v}</option>)}
            </select>
          </SellField>
        )}
      </div>

      {sListingType==="full"&&sType==="sell"&&(
        <SellField label="Töltöttségi szint">
          <BottleSlider value={sFill} onChange={setSFill}/>
        </SellField>
      )}

      <SellField label="Ár (Ft) *" error={errors.price}>
        <input ref={refPrice} defaultValue="" placeholder="pl. 35000" type="number" inputMode="numeric" style={{...inp,...(errors.price?errB:{})}}/>
      </SellField>
      <SellField label="Leírás *" error={errors.description}>
        <textarea ref={refDesc} defaultValue="" rows={5} placeholder="Batch, állapot részletei, csere lehetőség..." style={{...inp,resize:"vertical",...(errors.description?errB:{})}}/>
      </SellField>
      <SellField label="Tagek (vesszővel)">
        <input ref={refTags} defaultValue="" placeholder="creed, niche, woody" autoComplete="off" style={inp}/>
      </SellField>

      <div style={{ marginBottom:24 }}>
        <div onClick={()=>setSSwap(v=>!v)} style={{ display:"flex",gap:14,alignItems:"center",cursor:"pointer" }}>
          <div style={{ width:22,height:22,borderRadius:5,flexShrink:0,background:sSwap?"#f5f0fb":"transparent",border:`1.5px solid ${sSwap?"#7a5ab0":B.borderDk}`,display:"flex",alignItems:"center",justifyContent:"center",transition:"all .15s" }}>
            {sSwap&&<span style={{ color:"#7a5ab0",fontSize:13,fontWeight:700 }}>✓</span>}
          </div>
          <div>
            <div style={{ fontFamily:"'Manrope',sans-serif",fontSize:13,color:sSwap?"#7a5ab0":T.body,fontWeight:600 }}>Csere is érdekel</div>
            <div style={{ fontFamily:"'Manrope',sans-serif",fontSize:11,color:T.faint,marginTop:2 }}>Más parfümre is cserélném</div>
          </div>
        </div>
      </div>

      <SellField label="Ikon">
        <div style={{ display:"flex",flexWrap:"wrap",gap:6 }}>
          {ICONS.map(ic=>(
            <button key={ic} onClick={()=>setSIcon(ic)} style={{ background:sIcon===ic?ACC.goldPale:B.paper,border:`1px solid ${sIcon===ic?ACC.gold:B.border}`,borderRadius:7,padding:"8px 12px",cursor:"pointer",fontSize:20,transition:"all .15s" }}>{ic}</button>
          ))}
        </div>
      </SellField>

      <button onClick={submit} disabled={loading} style={{ background:ACC.ink,border:"none",color:B.canvas,padding:"18px",width:"100%",borderRadius:8,cursor:"pointer",fontFamily:"'Manrope',sans-serif",fontSize:15,fontWeight:700,marginTop:12,opacity:loading?.6:1,letterSpacing:.3 }}>
        {loading?"Feltöltés...":"Hirdetés közzététele →"}
      </button>
    </div>
  );
}

// ─── GUEST WALL ───────────────────────────────────────────────────────────────
function GuestWall({ go }) {
  return (
    <div style={{ paddingTop:62,minHeight:"100vh",display:"flex",alignItems:"center",justifyContent:"center",background:B.canvas }}>
      <div style={{ border:`1px solid ${B.border}`,borderRadius:12,padding:"64px 52px",maxWidth:460,textAlign:"center",background:B.paper,boxShadow:"0 8px 40px rgba(0,0,0,.06)" }}>
        <div style={{ fontSize:48,marginBottom:22 }}>🔒</div>
        <h2 style={{ fontFamily:"'Playfair Display',serif",fontSize:32,color:T.heading,fontWeight:400,marginBottom:14 }}>Belépés szükséges</h2>
        <p style={{ color:T.muted,fontFamily:"'Manrope',sans-serif",fontSize:13,lineHeight:2,marginBottom:36 }}>Hirdetés feladásához be kell jelentkezned.<br/>A piacot vendégként is böngészheted.</p>
        <button onClick={()=>go("login")} style={{ background:ACC.ink,border:"none",color:B.canvas,padding:"14px 40px",borderRadius:7,cursor:"pointer",fontFamily:"'Manrope',sans-serif",fontSize:14,fontWeight:700,marginBottom:12,width:"100%" }}>Belépés / Regisztráció →</button>
        <button onClick={()=>go("market")} style={{ background:"transparent",border:`1px solid ${B.border}`,color:T.muted,padding:"12px 40px",borderRadius:7,cursor:"pointer",fontFamily:"'Manrope',sans-serif",fontSize:12,fontWeight:600,width:"100%" }}>Vissza a piacra</button>
      </div>
    </div>
  );
}

// ─── LOGIN ────────────────────────────────────────────────────────────────────
function Login({ go, showToast }) {
  const [mode,setMode]=useState("login"); const [email,setEmail]=useState(""); const [pass,setPass]=useState("");
  const [name,setName]=useState(""); const [loc,setLoc]=useState(""); const [tos,setTos]=useState(false); const [loading,setLoading]=useState(false);

  const inp={background:B.paper,border:`1px solid ${B.border}`,color:T.body,padding:"13px 15px",borderRadius:7,fontFamily:"'Manrope',sans-serif",fontSize:16,width:"100%",boxSizing:"border-box",outline:"none",marginBottom:12};
  const lbl={fontFamily:"'Manrope',sans-serif",fontSize:10,color:T.faint,letterSpacing:2,display:"block",marginBottom:6,textTransform:"uppercase",fontWeight:700};

  return (
    <div style={{ paddingTop:62,minHeight:"100vh",display:"flex",alignItems:"center",justifyContent:"center",padding:"80px 24px",background:B.canvas }}>
      <div style={{ border:`1px solid ${B.border}`,borderRadius:12,padding:"56px 48px",width:"100%",maxWidth:440,boxShadow:"0 8px 40px rgba(0,0,0,.06)",background:B.paper }}>
        <div style={{ textAlign:"center",marginBottom:40 }}>
          <h2 style={{ fontFamily:"'Playfair Display',serif",fontSize:36,color:T.heading,fontWeight:400,marginBottom:4 }}>{mode==="login"?"Belépés":"Regisztráció"}</h2>
          <p style={{ fontFamily:"'Manrope',sans-serif",fontSize:12,color:T.faint }}>SCENTRADE · Magyar Parfüm Közösség</p>
        </div>
        <div style={{ display:"flex",background:B.warm,borderRadius:7,padding:3,marginBottom:32 }}>
          {[["login","Belépés"],["register","Regisztráció"]].map(([m,l])=>(
            <button key={m} onClick={()=>setMode(m)} style={{ flex:1,padding:"9px",borderRadius:5,border:"none",cursor:"pointer",background:mode===m?B.canvas:"transparent",color:mode===m?T.heading:T.faint,fontFamily:"'Manrope',sans-serif",fontSize:12,fontWeight:mode===m?700:500,transition:"all .15s",boxShadow:mode===m?"0 1px 4px rgba(0,0,0,.06)":"none" }}>{l}</button>
          ))}
        </div>
        {mode==="register"&&(<><label style={lbl}>Felhasználónév *</label><input value={name} onChange={e=>setName(e.target.value)} placeholder="pl. illatmester_bp" style={inp}/><label style={lbl}>Helyszín</label><input value={loc} onChange={e=>setLoc(e.target.value)} placeholder="pl. Budapest" style={inp}/></>)}
        <label style={lbl}>Email cím *</label>
        <input value={email} onChange={e=>setEmail(e.target.value)} placeholder="pelda@email.hu" type="email" style={inp}/>
        <label style={lbl}>Jelszó *</label>
        <input value={pass} onChange={e=>setPass(e.target.value)} placeholder="••••••••" type="password" style={{...inp,marginBottom:mode==="register"?12:20}}/>
        {mode==="register"&&(
          <div style={{ marginBottom:24 }}>
            <label style={{ display:"flex",gap:12,alignItems:"flex-start",cursor:"pointer" }}>
              <div onClick={()=>setTos(v=>!v)} style={{ width:20,height:20,borderRadius:4,flexShrink:0,marginTop:1,background:tos?ACC.goldPale:"transparent",border:`1.5px solid ${tos?ACC.gold:B.borderDk}`,display:"flex",alignItems:"center",justifyContent:"center",cursor:"pointer",transition:"all .15s" }}>
                {tos&&<span style={{ color:ACC.gold,fontSize:12,fontWeight:700 }}>✓</span>}
              </div>
              <span style={{ fontFamily:"'Manrope',sans-serif",fontSize:12,color:T.muted,lineHeight:1.7 }}>Elfogadom az <span style={{ color:ACC.gold,textDecoration:"underline",cursor:"pointer" }}>ÁSZF</span>-t és az <span style={{ color:ACC.gold,textDecoration:"underline",cursor:"pointer" }}>Adatkezelési tájékoztatót</span>. *</span>
            </label>
          </div>
        )}
        <button disabled={loading||(mode==="register"&&!tos)}
          style={{ background:(mode==="register"&&!tos)?B.warm:ACC.ink,border:"none",color:(mode==="register"&&!tos)?T.faint:B.canvas,padding:"15px",width:"100%",borderRadius:7,cursor:(mode==="register"&&!tos)?"not-allowed":"pointer",fontFamily:"'Manrope',sans-serif",fontSize:14,fontWeight:700,marginBottom:18,opacity:loading?.6:1,transition:"all .2s",letterSpacing:.3 }}>
          {loading?"...":mode==="login"?"Belépés →":"Regisztráció →"}
        </button>
        <p style={{ color:T.faint,fontSize:11,fontFamily:"'Manrope',sans-serif",textAlign:"center",cursor:"pointer",letterSpacing:.5,fontWeight:600 }} onClick={()=>setMode(mode==="login"?"register":"login")}>
          {mode==="login"?"Még nincs fiókod? Regisztrálj":"Már van fiókod? Lépj be"}
        </p>
      </div>
    </div>
  );
}

// ─── ROOT ─────────────────────────────────────────────────────────────────────
export default function App() {
  const {user,profile,loading} = useAuth();
  const [page,setPage]         = useState("home");
  const [listings,setListings] = useState([]);
  const [profiles,setProfiles] = useState({});
  const [selId,setSelId]       = useState(null);
  const [profileId,setProfileId] = useState(null);
  const [activeChatWith,setACW]  = useState(null);
  const [unread,setUnread]       = useState(0);
  const {show:showToast,ToastContainer} = useToast();

  useEffect(()=>{ loadListings(); },[]);
  useEffect(()=>{ if(profile){ loadUnread(); return setupUnreadSub(); } },[profile?.id]);

  async function loadListings() {
    const {data}=await supabase.from("listings").select("*").order("created_at",{ascending:false});
    if(!data)return;
    setListings(data);
    const ids=[...new Set(data.map(l=>l.user_id))];
    if(ids.length){
      const {data:pd}=await supabase.from("profiles").select("*").in("id",ids);
      if(pd){const m={};pd.forEach(p=>{m[p.id]=p;});setProfiles(m);}
    }
  }

  async function loadUnread() {
    if(!profile)return;
    const {count}=await supabase.from("messages").select("*",{count:"exact",head:true}).eq("to_user",profile.id).eq("read",false);
    setUnread(count||0);
  }

  function setupUnreadSub() {
    if(!profile)return;
    const sub=supabase.channel("unread-"+profile.id)
      .on("postgres_changes",{event:"*",schema:"public",table:"messages",filter:`to_user=eq.${profile.id}`},()=>loadUnread())
      .subscribe();
    return ()=>supabase.removeChannel(sub);
  }

  async function signOut() { await supabase.auth.signOut(); setPage("home"); }

  function go(p) {
    if(p==="sell"&&!profile){ setPage("guest_wall"); window.scrollTo(0,0); return; }
    if(p==="admin"&&!isAdmin(profile)){ return; }
    setPage(p); window.scrollTo(0,0);
  }

  function updateListing(id, fields) {
    setListings(p=>p.map(l=>l.id===id?{...l,...fields}:l));
  }

  const selListing  = listings.find(l=>l.id===selId);
  const profileUser = profileId ? (profiles[profileId]||null) : null;
  const allProfiles = profile ? {...profiles,[profile.id]:profile} : profiles;

  if(loading)return(
    <div style={{ background:B.canvas,minHeight:"100vh",display:"flex",alignItems:"center",justifyContent:"center" }}>
      <span style={{ color:ACC.gold,fontFamily:"'Playfair Display',serif",fontSize:26 }}>◈</span>
    </div>
  );

  return (
    <div style={{ background:B.canvas,minHeight:"100vh",color:T.body }}>
      <style>{`
        @import url('https://fonts.googleapis.com/css2?family=Playfair+Display:ital,wght@0,400;0,600;0,700;1,400;1,600&family=Manrope:wght@400;500;600;700&display=swap');
        *,*::before,*::after{box-sizing:border-box;margin:0;padding:0;}
        body{background:#faf8f4;}
        input,textarea,select{font-size:16px!important;font-family:'Manrope',sans-serif;}
        input::placeholder,textarea::placeholder{color:#c5bfb8;}
        ::-webkit-scrollbar{width:5px;}
        ::-webkit-scrollbar-track{background:#f5f2ec;}
        ::-webkit-scrollbar-thumb{background:#e3ddd4;border-radius:3px;}
        select option{background:#faf8f4;color:#2c2825;}
        button{transition:opacity .15s,background .15s,border-color .15s,color .15s;}
        button:hover{opacity:.85;}
        input[type=range]::-webkit-slider-thumb{appearance:none;width:16px;height:16px;border-radius:50%;background:#b8943f;cursor:pointer;border:2px solid #faf8f4;box-shadow:0 1px 6px rgba(184,148,63,.4);}
        input[type=range]::-moz-range-thumb{width:16px;height:16px;border-radius:50%;background:#b8943f;cursor:pointer;border:2px solid #faf8f4;}
        @keyframes fadeUp{from{opacity:0;transform:translateY(10px)}to{opacity:1;transform:translateY(0)}}
        a{color:inherit;}
      `}</style>

      <Nav profile={profile} page={page} go={go} openLogin={()=>go("login")} unreadCount={unread}/>
      <ToastContainer/>

      {page==="home"        && <Home go={go} listings={listings} profiles={allProfiles}/>}
      {page==="market"      && <Market listings={listings} profiles={allProfiles} go={go} setSelId={setSelId}/>}
      {page==="detail"      && selListing && <Detail l={selListing} u={allProfiles[selListing.user_id]} curProfile={profile} go={go} setProfileId={setProfileId} setActiveChatWith={setACW} onStatusChange={(id,s)=>updateListing(id,{status:s})} onListingUpdate={updateListing} showToast={showToast}/>}
      {page==="profile"     && profileUser && <Profile pu={profileUser} curProfile={profile} go={go} listings={listings} setActiveChatWith={setACW} onSignOut={signOut}/>}
      {page==="profile_own" && profile     && <Profile pu={profile} curProfile={profile} go={go} listings={listings} setActiveChatWith={setACW} onSignOut={signOut}/>}
      {page==="messages"    && profile     && <Messages curProfile={profile} activeChatWith={activeChatWith} setActiveChatWith={setACW}/>}
      {page==="sell"        && profile     && <Sell curProfile={profile} go={go} setListings={setListings} showToast={showToast}/>}
      {page==="admin"       && isAdmin(profile) && <AdminDashboard listings={listings} profiles={allProfiles} go={go} setSelId={setSelId} setListings={setListings} setProfiles={setProfiles} showToast={showToast}/>}
      {page==="guest_wall"  && <GuestWall go={go}/>}
      {page==="login"       && <Login go={go} showToast={showToast}/>}
    </div>
  );
}
