cat > /mnt/user-data/outputs/scentrade-redesign.jsx << 'ENDOFFILE'
import { useState, useEffect, useRef } from "react";

// Supabase via CDN script tag – loaded in useEffect
let _supabase = null;
function getSupabase() {
  if (_supabase) return _supabase;
  if (window.supabase) {
    _supabase = window.supabase.createClient(
      "https://godjaksujnzekgpbpywk.supabase.co",
      "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6ImdvZGpha3N1am56ZWtncGJweXdrIiwicm9sZSI6ImFub24iLCJpYXQiOjE3Nzg1MDA3MDYsImV4cCI6MjA5NDA3NjcwNn0.b5KmrSZ5sjePZCls-dEZ00yJI8gbMs0MNPI2RxetPC8"
    );
  }
  return _supabase;
}

const ADMIN_EMAIL = "rapi.krisztian@gmail.com";

// ─── TOKENS ──────────────────────────────────────────────────────────────────
const T = { heading:"#0f0e0d", body:"#2c2825", muted:"#6b6560", faint:"#9e9890", inverse:"#faf8f4" };
const B = { canvas:"#faf8f4", paper:"#f5f2ec", warm:"#ede9e0", border:"#e3ddd4", borderDk:"#c9c1b4" };
const A = {
  gold:"#b8943f", goldPale:"#b8943f18", goldMid:"#b8943f35", goldWarm:"#d4a84b",
  ink:"#1a1714", red:"#c0453a", redPale:"#c0453a12",
  green:"#3a7a52", greenPale:"#3a7a5212",
  admin:"#7c3aed", adminPale:"#7c3aed12", adminMid:"#7c3aed35",
};

const COND = { mint:"Bontatlan", excellent:"Kiváló", good:"Jó", fair:"Közepes" };
const COND_COL = { mint:A.green, excellent:"#4a78b0", good:A.gold, fair:A.red };
const CATS = ["Összes","woody","oriental","floral","fresh","aromatic"];
const ICONS = ["✨","🏺","🫙","🌸","🌿","🍂","☀️","🌑","🥀","💀","🎷","🏔","🌊","🍋","🔥"];

function isAdmin(p) { return p?.email === ADMIN_EMAIL; }
function getRank(s=0) {
  if (s>=50) return {label:"Illatmester",icon:"◆",color:A.gold};
  if (s>=5)  return {label:"Parfümista", icon:"◇",color:T.muted};
  return            {label:"Újonc",      icon:"○",color:T.faint};
}

// ─── SMALL COMPONENTS ────────────────────────────────────────────────────────
function Pill({text,bg=A.goldPale,col=A.gold}) {
  return <span style={{background:bg,color:col,fontSize:9,fontWeight:700,padding:"3px 9px",borderRadius:3,letterSpacing:1.2,textTransform:"uppercase",fontFamily:"'Manrope',sans-serif",whiteSpace:"nowrap",border:`1px solid ${col}25`}}>{text}</span>;
}

function Stars({v=5,size=13,interactive=false,onChange}) {
  const [hov,setHov]=useState(0);
  return <span style={{fontSize:size,letterSpacing:3,cursor:interactive?"pointer":"default"}}>
    {[1,2,3,4,5].map(i=><span key={i} style={{color:i<=(hov||Math.round(v))?A.gold:B.borderDk}}
      onMouseEnter={()=>interactive&&setHov(i)} onMouseLeave={()=>interactive&&setHov(0)}
      onClick={()=>interactive&&onChange?.(i)}>★</span>)}
  </span>;
}

function Ava({u,size=38}) {
  const initials = u?.name ? u.name.split(" ").map(w=>w[0]).join("").slice(0,2).toUpperCase() : "?";
  const rank = getRank(u?.sales||0);
  const admin = isAdmin(u);
  return <div style={{position:"relative",flexShrink:0}}>
    <div style={{width:size,height:size,borderRadius:"50%",background:`linear-gradient(135deg,${B.warm},${B.border})`,display:"flex",alignItems:"center",justifyContent:"center",fontFamily:"'Playfair Display',serif",fontWeight:700,fontSize:size*.34,color:T.muted,border:`1.5px solid ${admin?A.adminMid:rank.color+"40"}`}}>{initials}</div>
    {size>=36&&<span style={{position:"absolute",bottom:-2,right:-2,fontSize:size*0.28,lineHeight:1,background:B.canvas,borderRadius:"50%",padding:"1px",color:admin?A.admin:rank.color}}>{admin?"⚡":rank.icon}</span>}
  </div>;
}

function RankBadge({sales=0,size="sm",admin=false}) {
  const r = admin ? {label:"Admin",icon:"⚡",color:A.admin,bg:A.adminPale,border:A.adminMid} : (() => { const rk=getRank(sales); return {label:rk.label,icon:rk.icon,color:rk.color,bg:rk.color+"08",border:rk.color+"55"}; })();
  const lg = size==="lg";
  return <span style={{display:"inline-flex",alignItems:"center",gap:lg?5:4,border:`1px solid ${r.border}`,borderRadius:3,padding:lg?"4px 10px":"2px 7px",fontFamily:"'Manrope',sans-serif",fontSize:lg?10:9,color:r.color,fontWeight:700,letterSpacing:1.5,textTransform:"uppercase",whiteSpace:"nowrap",background:r.bg}}>
    <span style={{fontSize:lg?9:8}}>{r.icon}</span>{r.label}
  </span>;
}

function Modal({onClose,children}) {
  return <div style={{position:"fixed",inset:0,zIndex:200,background:"rgba(15,14,13,.55)",backdropFilter:"blur(12px)",display:"flex",alignItems:"center",justifyContent:"center",padding:20}} onClick={onClose}>
    <div onClick={e=>e.stopPropagation()} style={{background:B.canvas,border:`1px solid ${B.border}`,borderRadius:12,padding:"44px 40px",width:"100%",maxWidth:520,maxHeight:"90vh",overflowY:"auto",boxShadow:"0 24px 80px rgba(0,0,0,.18)"}}>{children}</div>
  </div>;
}

function Toast({message,type="error",onClose}) {
  useEffect(()=>{ const t=setTimeout(onClose,4500); return ()=>clearTimeout(t); },[onClose]);
  const cfg={error:{bg:"#fff5f5",border:`${A.red}30`,text:A.red},success:{bg:"#f2faf6",border:`${A.green}30`,text:A.green},info:{bg:"#faf8f0",border:`${A.gold}30`,text:A.gold}};
  const c=cfg[type]||cfg.error;
  return <div style={{background:c.bg,border:`1px solid ${c.border}`,borderRadius:8,padding:"14px 18px",maxWidth:360,boxShadow:"0 4px 24px rgba(0,0,0,.1)",display:"flex",alignItems:"flex-start",gap:10}}>
    <span style={{color:c.text,fontSize:14,flexShrink:0}}>{type==="success"?"✓":type==="info"?"◆":"✕"}</span>
    <p style={{color:c.text,fontFamily:"'Manrope',sans-serif",fontSize:13,lineHeight:1.6,flex:1}}>{message}</p>
    <button onClick={onClose} style={{background:"none",border:"none",color:c.text,cursor:"pointer",fontSize:16,opacity:.4,padding:0}}>×</button>
  </div>;
}

function useToast() {
  const [toasts,setToasts]=useState([]);
  const show=(msg,type="error")=>{ const id=Date.now(); setToasts(p=>[...p,{id,msg,type}]); };
  const rm=id=>setToasts(p=>p.filter(t=>t.id!==id));
  const ToastContainer=()=><div style={{position:"fixed",bottom:28,right:28,zIndex:9999,display:"flex",flexDirection:"column",gap:8}}>
    {toasts.map(t=><Toast key={t.id} message={t.msg} type={t.type} onClose={()=>rm(t.id)}/>)}
  </div>;
  return {show,ToastContainer};
}

// ─── BOTTLE ──────────────────────────────────────────────────────────────────
function bottleCol(pct) {
  if(pct>=80) return {top:"#d4a84b",mid:"#b8943f",bot:"#8a6e28"};
  if(pct>=50) return {top:"#c9924a",mid:"#a87030",bot:"#7a4e18"};
  if(pct>=20) return {top:"#c0854a",mid:"#9a6228",bot:"#6e4010"};
  return {top:"#b07040",mid:"#8a5020",bot:"#5c300a"};
}
function fillLabel(pct) {
  if(pct===100) return "Bontatlan"; if(pct>=90) return "Szinte tele";
  if(pct>=75) return "Háromnegyedes"; if(pct>=50) return "Feles";
  if(pct>=25) return "Negyed körüli"; return pct>=10?"Kevés maradt":"Majdnem üres";
}

function BottleCompact({pct=90}) {
  const c=bottleCol(pct), lH=(pct/100)*108, lY=40+(108-lH);
  const col=pct>=80?A.gold:pct>=50?"#c0924a":pct>=25?"#b07040":A.red;
  return <div style={{display:"flex",alignItems:"center",gap:8,marginBottom:10}}>
    <svg width="20" height="64" viewBox="0 0 80 160" fill="none">
      <defs>
        <linearGradient id="cpl" x1="0" y1="0" x2="0" y2="1"><stop offset="0%" stopColor={c.top} stopOpacity=".88"/><stop offset="100%" stopColor={c.bot} stopOpacity=".8"/></linearGradient>
        <clipPath id="cpc"><path d="M18 40 Q14 44 12 52 L10 148 Q10 152 14 152 L66 152 Q70 152 70 148 L68 52 Q66 44 62 40 Z"/></clipPath>
      </defs>
      <rect x="28" y="6" width="24" height="14" rx="3" fill={B.warm} stroke={B.border} strokeWidth="1"/>
      <path d="M30 20 L26 40 L54 40 L50 20 Z" fill={B.paper} stroke={B.border} strokeWidth="1"/>
      <path d="M18 40 Q14 44 12 52 L10 148 Q10 152 14 152 L66 152 Q70 152 70 148 L68 52 Q66 44 62 40 Z" fill={B.canvas} stroke={B.borderDk} strokeWidth="1.5"/>
      <g clipPath="url(#cpc)"><rect x="10" y={lY} width="60" height={lH+10} fill="url(#cpl)"/></g>
    </svg>
    <div>
      <div style={{fontFamily:"'Playfair Display',serif",fontSize:15,color:col,fontWeight:600}}>{pct}%</div>
      <div style={{fontFamily:"'Manrope',sans-serif",fontSize:9,color:T.faint,letterSpacing:1.2}}>TELE</div>
    </div>
  </div>;
}

function BottleDetail({pct=90}) {
  const c=bottleCol(pct), lH=(pct/100)*108, lY=40+(108-lH);
  const col=pct>=80?A.gold:pct>=50?"#c0924a":pct>=25?"#b07040":A.red;
  return <div style={{border:`1px solid ${B.border}`,borderRadius:10,padding:"18px 22px",display:"flex",alignItems:"center",gap:22,marginBottom:28,background:B.paper}}>
    <svg width="52" height="104" viewBox="0 0 80 160" fill="none" style={{flexShrink:0}}>
      <defs>
        <linearGradient id="dtl" x1="0" y1="0" x2="0" y2="1"><stop offset="0%" stopColor={c.top} stopOpacity=".9"/><stop offset="100%" stopColor={c.bot} stopOpacity=".8"/></linearGradient>
        <clipPath id="dtc"><path d="M18 40 Q14 44 12 52 L10 148 Q10 152 14 152 L66 152 Q70 152 70 148 L68 52 Q66 44 62 40 Z"/></clipPath>
      </defs>
      <rect x="28" y="6" width="24" height="14" rx="3" fill={B.warm} stroke={B.borderDk} strokeWidth="1"/>
      <rect x="31" y="4" width="18" height="4" rx="2" fill={A.gold} opacity=".6"/>
      <path d="M30 20 L26 40 L54 40 L50 20 Z" fill={B.paper} stroke={B.border} strokeWidth="1"/>
      <path d="M18 40 Q14 44 12 52 L10 148 Q10 152 14 152 L66 152 Q70 152 70 148 L68 52 Q66 44 62 40 Z" fill={B.canvas} stroke={B.borderDk} strokeWidth="1.5"/>
      <g clipPath="url(#dtc)">
        <rect x="10" y={lY} width="60" height={lH+10} fill="url(#dtl)"/>
        {pct>3&&pct<98&&<ellipse cx="40" cy={lY} rx="28" ry="3" fill={c.top} opacity=".3"/>}
      </g>
      <text x="40" y="108" textAnchor="middle" fontFamily="'Manrope',sans-serif" fontSize="12" fontWeight="700" fill={pct>50?"rgba(255,255,255,.8)":T.muted} style={{userSelect:"none"}}>{pct}%</text>
    </svg>
    <div>
      <div style={{fontFamily:"'Playfair Display',serif",fontSize:28,color:col,fontWeight:600,marginBottom:4}}>{pct}% tele</div>
      <div style={{fontFamily:"'Manrope',sans-serif",fontSize:10,color:T.faint,letterSpacing:2,marginBottom:12,textTransform:"uppercase"}}>Töltöttségi szint</div>
      <div style={{width:160,height:2,background:B.border,borderRadius:2}}>
        <div style={{height:"100%",width:`${pct}%`,background:`linear-gradient(90deg,${col}60,${col})`,borderRadius:2}}/>
      </div>
    </div>
  </div>;
}

function BottleSlider({value=90,onChange}) {
  const pct=Math.min(100,Math.max(1,value));
  const c=bottleCol(pct), lH=(pct/100)*108, lY=40+(108-lH);
  return <div style={{border:`1px solid ${B.border}`,borderRadius:10,padding:"24px 28px",display:"flex",gap:32,alignItems:"center",background:B.paper}}>
    <svg width="80" height="160" viewBox="0 0 80 160" fill="none" style={{flexShrink:0}}>
      <defs>
        <linearGradient id="sll" x1="0" y1="0" x2="0" y2="1"><stop offset="0%" stopColor={c.top} stopOpacity=".9"/><stop offset="60%" stopColor={c.mid} stopOpacity=".85"/><stop offset="100%" stopColor={c.bot} stopOpacity=".9"/></linearGradient>
        <clipPath id="slc"><path d="M18 40 Q14 44 12 52 L10 148 Q10 152 14 152 L66 152 Q70 152 70 148 L68 52 Q66 44 62 40 Z"/></clipPath>
      </defs>
      <rect x="28" y="6" width="24" height="14" rx="3" fill={B.warm} stroke={B.borderDk} strokeWidth="1"/>
      <rect x="31" y="4" width="18" height="4" rx="2" fill={A.gold} opacity=".6"/>
      <path d="M30 20 L26 40 L54 40 L50 20 Z" fill={B.paper} stroke={B.border} strokeWidth="1"/>
      <path d="M18 40 Q14 44 12 52 L10 148 Q10 152 14 152 L66 152 Q70 152 70 148 L68 52 Q66 44 62 40 Z" fill={B.canvas} stroke={B.borderDk} strokeWidth="1.5"/>
      <g clipPath="url(#slc)">
        <rect x="10" y={lY} width="60" height={lH+10} fill="url(#sll)"/>
        {pct>3&&pct<98&&<ellipse cx="40" cy={lY} rx="28" ry="3" fill={c.top} opacity=".35"/>}
      </g>
      <text x="40" y="108" textAnchor="middle" fontFamily="'Manrope',sans-serif" fontSize="12" fontWeight="700" fill={pct>50?"rgba(255,255,255,.85)":T.muted} style={{userSelect:"none"}}>{pct}%</text>
    </svg>
    <div style={{flex:1}}>
      <div style={{fontFamily:"'Playfair Display',serif",fontSize:22,color:T.heading,marginBottom:3}}>{fillLabel(pct)}</div>
      <div style={{fontFamily:"'Manrope',sans-serif",fontSize:10,color:T.faint,letterSpacing:2,marginBottom:24,textTransform:"uppercase"}}>Töltöttségi szint</div>
      <input type="range" min={1} max={100} value={pct} onChange={e=>onChange(Number(e.target.value))}
        style={{width:"100%",height:2,appearance:"none",WebkitAppearance:"none",background:`linear-gradient(90deg,${A.gold} ${pct}%,${B.border} ${pct}%)`,borderRadius:2,outline:"none",cursor:"pointer"}}/>
      <div style={{display:"flex",justifyContent:"space-between",marginTop:6,fontFamily:"'Manrope',sans-serif",fontSize:9,color:T.faint}}>
        {["0%","25%","50%","75%","100%"].map(l=><span key={l}>{l}</span>)}
      </div>
      <div style={{display:"flex",gap:6,marginTop:16,flexWrap:"wrap"}}>
        {[{label:"Bontatlan",v:100},{label:"~¾",v:75},{label:"~½",v:50},{label:"~¼",v:25}].map(({label,v})=>(
          <button key={v} onClick={()=>onChange(v)} style={{background:pct===v?A.goldPale:"transparent",border:`1px solid ${pct===v?A.gold:B.border}`,color:pct===v?A.gold:T.muted,padding:"5px 12px",borderRadius:4,cursor:"pointer",fontFamily:"'Manrope',sans-serif",fontSize:10,transition:"all .15s"}}>{label}</button>
        ))}
      </div>
    </div>
  </div>;
}

// ─── NAV ─────────────────────────────────────────────────────────────────────
function Nav({profile,page,go,openLogin,unread}) {
  const [scrolled,setScrolled]=useState(false);
  useEffect(()=>{ const fn=()=>setScrolled(window.scrollY>20); window.addEventListener("scroll",fn); return ()=>window.removeEventListener("scroll",fn); },[]);
  const admin=isAdmin(profile);
  return <nav style={{position:"fixed",top:0,left:0,right:0,zIndex:100,height:62,background:scrolled?"rgba(250,248,244,.96)":B.canvas,backdropFilter:"blur(16px)",borderBottom:`1px solid ${scrolled?B.border:"transparent"}`,display:"flex",alignItems:"center",justifyContent:"space-between",padding:"0 40px",transition:"all .3s"}}>
    <div onClick={()=>go("home")} style={{cursor:"pointer",display:"flex",alignItems:"center",gap:10}}>
      <span style={{fontFamily:"'Playfair Display',serif",fontSize:22,fontWeight:700,color:T.heading,letterSpacing:3}}>SCENTRADE</span>
      <span style={{width:1,height:16,background:B.borderDk,margin:"0 4px"}}/>
      <span style={{fontFamily:"'Manrope',sans-serif",fontSize:10,color:T.faint,letterSpacing:3}}>HU</span>
    </div>
    <div style={{display:"flex",gap:2,alignItems:"center"}}>
      {[["home","Főoldal"],["market","Piac"]].map(([p,l])=>(
        <button key={p} onClick={()=>go(p)} style={{background:"transparent",border:"none",borderBottom:page===p?`2px solid ${A.gold}`:"2px solid transparent",color:page===p?T.heading:T.muted,padding:"8px 14px",cursor:"pointer",fontFamily:"'Manrope',sans-serif",fontSize:12,fontWeight:page===p?700:500,transition:"all .15s"}}>{l}</button>
      ))}
      {admin&&<button onClick={()=>go("admin")} style={{background:page==="admin"?A.adminPale:"transparent",border:`1px solid ${page==="admin"?A.adminMid:"transparent"}`,color:page==="admin"?A.admin:T.muted,padding:"7px 13px",borderRadius:6,cursor:"pointer",fontFamily:"'Manrope',sans-serif",fontSize:12,fontWeight:600,marginLeft:4}}>⚡ Admin</button>}
      <button onClick={()=>go("sell")} style={{background:A.ink,border:"none",color:B.canvas,padding:"8px 18px",borderRadius:6,cursor:"pointer",fontFamily:"'Manrope',sans-serif",fontSize:12,fontWeight:700,marginLeft:8}}>+ Hirdetés</button>
      {profile ? (
        <>
          <button onClick={()=>go("messages")} style={{background:"transparent",border:"none",cursor:"pointer",color:T.muted,fontSize:18,position:"relative",padding:"4px 10px",marginLeft:4}}>
            ✉
            {unread>0&&<span style={{position:"absolute",top:1,right:3,background:A.gold,borderRadius:10,minWidth:15,height:15,display:"flex",alignItems:"center",justifyContent:"center",fontFamily:"'Manrope',sans-serif",fontSize:8,color:"#fff",fontWeight:700,padding:"0 4px"}}>{unread>9?"9+":unread}</span>}
          </button>
          <button onClick={()=>go("profile_own")} style={{background:"transparent",border:`1px solid ${admin?A.adminMid:B.borderDk}`,borderRadius:24,padding:"4px 12px 4px 5px",cursor:"pointer",display:"flex",alignItems:"center",gap:8,marginLeft:4}}>
            <Ava u={profile} size={28}/>
            <span style={{fontFamily:"'Manrope',sans-serif",fontSize:12,fontWeight:600,color:admin?A.admin:T.body}}>{profile.name?.split(" ")[0]}</span>
          </button>
        </>
      ) : (
        <button onClick={openLogin} style={{background:"transparent",border:`1px solid ${B.borderDk}`,color:T.body,padding:"8px 18px",borderRadius:6,cursor:"pointer",fontFamily:"'Manrope',sans-serif",fontSize:12,fontWeight:600,marginLeft:8}}>Belépés</button>
      )}
    </div>
  </nav>;
}

// ─── CARD ────────────────────────────────────────────────────────────────────
function Card({l,u,onClick,adminMode,onAdminDelete,onAdminPin}) {
  const [hov,setHov]=useState(false);
  const isD=l.listing_type==="decant",isBuy=l.type==="buy",isSold=l.status==="sold",isPend=l.status==="pending";
  return <div onClick={onClick} onMouseEnter={()=>setHov(true)} onMouseLeave={()=>setHov(false)}
    style={{background:hov?B.warm:B.paper,border:`1px solid ${l.pinned?A.goldMid:hov?B.borderDk:B.border}`,borderRadius:10,padding:"26px 22px 20px",cursor:onClick?"pointer":"default",transition:"all .22s",transform:hov?"translateY(-2px)":"none",boxShadow:hov?"0 8px 32px rgba(0,0,0,.07)":l.pinned?"0 0 0 2px "+A.goldMid:"none",opacity:isSold?.55:1,position:"relative",overflow:"hidden"}}>
    {l.pinned&&<div style={{position:"absolute",top:0,left:0,right:0,height:3,background:`linear-gradient(90deg,${A.gold},${A.goldWarm})`}}/>}
    {(isSold||isPend)&&<div style={{position:"absolute",top:l.pinned?3:0,left:0,right:0,padding:"4px 0",textAlign:"center",background:isSold?"#f2faf6":"#fefaf0",borderBottom:`1px solid ${isSold?A.green:A.gold}28`,fontFamily:"'Manrope',sans-serif",fontSize:9,letterSpacing:1.5,color:isSold?A.green:A.gold,fontWeight:700}}>{isSold?"✓ ELADVA":"⏳ FÜGGŐBEN"}</div>}
    <div style={{display:"flex",gap:5,marginBottom:14,flexWrap:"wrap",marginTop:(isSold||isPend||l.pinned)?24:0}}>
      {l.pinned&&<Pill text="📌 Kiemelt" bg={A.goldPale} col={A.gold}/>}
      <Pill text={isBuy?"Keresett":"Eladó"} bg={isBuy?"#eef4fb":"#faf8f0"} col={isBuy?"#4a78b0":A.gold}/>
      <Pill text={isD?"Dekant":"Teljes"} bg={isD?"#fff5ee":"#f2faf6"} col={isD?"#c0724a":A.green}/>
      {l.condition&&<Pill text={COND[l.condition]} bg={COND_COL[l.condition]+"12"} col={COND_COL[l.condition]}/>}
      {l.swap_ok&&<Pill text="Csere OK" bg="#f5f0fb" col="#7a5ab0"/>}
    </div>
    <div style={{fontSize:40,marginBottom:12}}>{l.icon||"🫙"}</div>
    <div style={{fontFamily:"'Manrope',sans-serif",fontSize:10,color:T.faint,letterSpacing:2.5,marginBottom:3,fontWeight:600}}>{(l.brand||"").toUpperCase()}</div>
    <div style={{fontFamily:"'Playfair Display',serif",fontSize:20,color:T.heading,lineHeight:1.2,marginBottom:6}}>{l.name}</div>
    <div style={{fontSize:12,color:T.faint,marginBottom:14,fontFamily:"'Manrope',sans-serif"}}>{isD?`${l.decant_ml}ml dekant`:`${l.size||""}${l.fill?` · ${l.fill}% tele`:""}`}</div>
    {!isD&&l.fill&&<BottleCompact pct={l.fill}/>}
    <div style={{fontFamily:"'Playfair Display',serif",fontSize:22,color:T.heading,marginBottom:16,marginTop:"auto",fontWeight:600}}>
      {(l.price||0).toLocaleString("hu-HU")} Ft
      {isD&&<span style={{fontSize:12,color:T.faint,fontFamily:"'Manrope',sans-serif",marginLeft:6}}>/ {l.decant_ml}ml</span>}
    </div>
    <div style={{display:"flex",alignItems:"center",justifyContent:"space-between",paddingTop:14,borderTop:`1px solid ${B.border}`}}>
      <div style={{display:"flex",alignItems:"center",gap:8,flexWrap:"wrap"}}>
        <Ava u={u} size={24}/>
        <span style={{fontSize:12,color:T.muted,fontFamily:"'Manrope',sans-serif",fontWeight:500}}>{u?.name?.split(" ")[0]||"?"}</span>
        {isAdmin(u)?<RankBadge admin/>:<RankBadge sales={u?.sales||0}/>}
      </div>
      <span style={{fontSize:10,color:T.faint,fontFamily:"'Manrope',sans-serif"}}>👁 {l.views||0}</span>
    </div>
    {adminMode&&<div onClick={e=>e.stopPropagation()} style={{display:"flex",gap:6,marginTop:14,paddingTop:12,borderTop:`1px solid ${B.border}`}}>
      <button onClick={()=>onAdminPin?.(l)} style={{flex:1,background:l.pinned?A.goldPale:"transparent",border:`1px solid ${l.pinned?A.gold:B.borderDk}`,color:l.pinned?A.gold:T.muted,padding:"6px",borderRadius:5,cursor:"pointer",fontFamily:"'Manrope',sans-serif",fontSize:10,fontWeight:700}}>{l.pinned?"📌 Kitűzve":"📌 Kiemel"}</button>
      <button onClick={()=>onAdminDelete?.(l)} style={{flex:1,background:A.redPale,border:`1px solid ${A.red}30`,color:A.red,padding:"6px",borderRadius:5,cursor:"pointer",fontFamily:"'Manrope',sans-serif",fontSize:10,fontWeight:700}}>🗑 Törlés</button>
    </div>}
  </div>;
}

// ─── HOME ────────────────────────────────────────────────────────────────────
function Home({go,listings,profiles}) {
  const pinned=listings.filter(l=>l.pinned&&l.status!=="sold");
  const featured=listings.filter(l=>l.type==="sell"&&l.status!=="sold"&&!l.pinned).slice(0,4);
  const decants=listings.filter(l=>l.listing_type==="decant"&&l.status!=="sold").slice(0,3);
  return <div style={{paddingTop:62}}>
    <section style={{minHeight:"80vh",display:"flex",flexDirection:"column",alignItems:"center",justifyContent:"center",textAlign:"center",position:"relative",overflow:"hidden",padding:"100px 24px 80px",background:B.canvas}}>
      <div style={{position:"absolute",inset:0,backgroundImage:`repeating-linear-gradient(0deg,transparent,transparent 79px,${B.border}50 79px,${B.border}50 80px)`,pointerEvents:"none",opacity:.4}}/>
      <p style={{fontFamily:"'Manrope',sans-serif",fontSize:10,color:A.gold,letterSpacing:5,marginBottom:28,fontWeight:700,textTransform:"uppercase",position:"relative"}}>Magyar Parfüm Közösség</p>
      <h1 style={{fontFamily:"'Playfair Display',serif",fontSize:"clamp(48px,8vw,96px)",fontWeight:400,color:T.heading,lineHeight:1.0,marginBottom:20,letterSpacing:-1,position:"relative",maxWidth:820}}>
        Adj. Végy.<br/><em style={{color:A.gold,fontStyle:"italic"}}>Szaglászkodj.</em>
      </h1>
      <div style={{width:60,height:1,background:A.gold,margin:"0 auto 28px",position:"relative"}}/>
      <p style={{color:T.muted,fontSize:16,maxWidth:480,lineHeight:1.9,marginBottom:52,fontFamily:"'Manrope',sans-serif",position:"relative"}}>
        Niche és designer parfümök, <strong style={{color:T.body,fontWeight:600}}>dekantok</strong> és teljes üvegek biztonságos adásvételéhez.
      </p>
      <div style={{display:"flex",gap:12,flexWrap:"wrap",justifyContent:"center",position:"relative"}}>
        <button onClick={()=>go("market")} style={{background:A.ink,border:"none",color:B.canvas,padding:"16px 44px",borderRadius:6,cursor:"pointer",fontFamily:"'Manrope',sans-serif",fontSize:14,fontWeight:700,boxShadow:"0 4px 20px rgba(0,0,0,.12)"}}>Böngéssz a piacon →</button>
        <button onClick={()=>go("sell")} style={{background:"transparent",border:`1px solid ${B.borderDk}`,color:T.body,padding:"16px 44px",borderRadius:6,cursor:"pointer",fontFamily:"'Manrope',sans-serif",fontSize:14,fontWeight:600}}>Hirdetést feladok</button>
      </div>
    </section>
    {pinned.length>0&&<section style={{padding:"64px 48px 0",maxWidth:1200,margin:"0 auto"}}>
      <p style={{fontFamily:"'Manrope',sans-serif",fontSize:10,color:A.gold,letterSpacing:3,fontWeight:700,marginBottom:12}}>📌 KIEMELT HIRDETÉSEK</p>
      <div style={{display:"grid",gridTemplateColumns:"repeat(auto-fill,minmax(272px,1fr))",gap:18}}>
        {pinned.map(l=><Card key={l.id} l={l} u={profiles[l.user_id]}/>)}
      </div>
    </section>}
    {featured.length>0&&<section style={{padding:"64px 48px",maxWidth:1200,margin:"0 auto"}}>
      <div style={{display:"flex",justifyContent:"space-between",alignItems:"baseline",marginBottom:36}}>
        <div><p style={{fontFamily:"'Manrope',sans-serif",fontSize:10,color:A.gold,letterSpacing:3,fontWeight:700,marginBottom:8}}>KIEMELTEK</p><h2 style={{fontFamily:"'Playfair Display',serif",fontSize:36,color:T.heading,fontWeight:400}}>Friss eladások</h2></div>
        <button onClick={()=>go("market")} style={{background:"none",border:`1px solid ${B.borderDk}`,color:T.muted,cursor:"pointer",fontFamily:"'Manrope',sans-serif",fontSize:11,letterSpacing:1,fontWeight:600,padding:"7px 16px",borderRadius:4}}>MIND →</button>
      </div>
      <div style={{display:"grid",gridTemplateColumns:"repeat(auto-fill,minmax(272px,1fr))",gap:18}}>
        {featured.map(l=><Card key={l.id} l={l} u={profiles[l.user_id]}/>)}
      </div>
    </section>}
    {decants.length>0&&<section style={{padding:"0 48px 80px",maxWidth:1200,margin:"0 auto"}}>
      <div style={{background:B.paper,border:`1px solid ${B.border}`,borderRadius:12,padding:"44px 40px"}}>
        <p style={{fontFamily:"'Manrope',sans-serif",fontSize:10,color:A.gold,letterSpacing:3,fontWeight:700,marginBottom:8}}>DEKANTOK</p>
        <h2 style={{fontFamily:"'Playfair Display',serif",fontSize:32,color:T.heading,fontWeight:400,marginBottom:30}}>Kipróbálnád először?</h2>
        <div style={{display:"grid",gridTemplateColumns:"repeat(auto-fill,minmax(258px,1fr))",gap:16}}>
          {decants.map(l=><Card key={l.id} l={l} u={profiles[l.user_id]}/>)}
        </div>
      </div>
    </section>}
    <footer style={{borderTop:`1px solid ${B.border}`,padding:"30px 48px",display:"flex",justifyContent:"space-between",alignItems:"center",flexWrap:"wrap",gap:12}}>
      <span style={{fontFamily:"'Playfair Display',serif",fontSize:16,color:T.heading,fontWeight:600,letterSpacing:2}}>SCENTRADE</span>
      <p style={{fontFamily:"'Manrope',sans-serif",fontSize:11,color:T.faint,letterSpacing:1}}>© 2025 · Parfüm közösségi platform</p>
    </footer>
  </div>;
}

// ─── MARKET ──────────────────────────────────────────────────────────────────
function Market({listings,profiles,go,setSelId}) {
  const [q,setQ]=useState(""),cat=useState("Összes"),typeF=useState("all"),listF=useState("all"),sort=useState("newest"),hideS=useState(true);
  const [catV,setCat]=cat; const [typeV,setType]=typeF; const [listV,setList]=listF; const [sortV,setSort]=sort; const [hideSV,setHideS]=hideS;
  const filtered=listings.filter(l=>{
    if(hideSV&&l.status==="sold") return false;
    const sq=q.toLowerCase();
    return (!sq||(l.brand||"").toLowerCase().includes(sq)||(l.name||"").toLowerCase().includes(sq))&&
      (catV==="Összes"||l.category===catV)&&(typeV==="all"||l.type===typeV)&&(listV==="all"||l.listing_type===listV);
  }).sort((a,b)=>{
    if(a.pinned&&!b.pinned) return -1; if(!a.pinned&&b.pinned) return 1;
    return sortV==="newest"?new Date(b.created_at)-new Date(a.created_at):sortV==="price_asc"?a.price-b.price:b.price-a.price;
  });
  const inp={background:B.canvas,border:`1px solid ${B.border}`,color:T.body,padding:"9px 14px",borderRadius:6,fontFamily:"'Manrope',sans-serif",fontSize:13,outline:"none",fontWeight:500};
  return <div style={{paddingTop:62,minHeight:"100vh",background:B.canvas}}>
    <div style={{background:B.paper,borderBottom:`1px solid ${B.border}`,padding:"32px 48px"}}>
      <div style={{maxWidth:1200,margin:"0 auto"}}>
        <p style={{fontFamily:"'Manrope',sans-serif",fontSize:10,color:A.gold,letterSpacing:3,fontWeight:700,marginBottom:8}}>MARKETPLACE</p>
        <h1 style={{fontFamily:"'Playfair Display',serif",fontSize:44,color:T.heading,fontWeight:400,marginBottom:28}}>Piac</h1>
        <div style={{display:"flex",gap:8,flexWrap:"wrap",alignItems:"center"}}>
          <input value={q} onChange={e=>setQ(e.target.value)} placeholder="Keresés márka, név..." style={{...inp,width:220}}/>
          <select value={typeV} onChange={e=>setType(e.target.value)} style={{...inp,cursor:"pointer"}}>
            <option value="all">Eladó + Keresett</option><option value="sell">Csak eladó</option><option value="buy">Csak keresett</option>
          </select>
          <select value={listV} onChange={e=>setList(e.target.value)} style={{...inp,cursor:"pointer"}}>
            <option value="all">Teljes + Dekant</option><option value="full">Csak teljes</option><option value="decant">Csak dekant</option>
          </select>
          <select value={sortV} onChange={e=>setSort(e.target.value)} style={{...inp,cursor:"pointer"}}>
            <option value="newest">Legújabb</option><option value="price_asc">Legolcsóbb</option><option value="price_desc">Legdrágább</option>
          </select>
          <button onClick={()=>setHideS(v=>!v)} style={{background:!hideSV?A.goldPale:"transparent",border:`1px solid ${!hideSV?A.gold:B.borderDk}`,color:!hideSV?A.gold:T.muted,padding:"9px 14px",borderRadius:6,cursor:"pointer",fontFamily:"'Manrope',sans-serif",fontSize:12,fontWeight:600}}>{hideSV?"Eladottak mutatása":"Eladottak elrejtése"}</button>
        </div>
        <div style={{display:"flex",gap:5,marginTop:16,flexWrap:"wrap"}}>
          {CATS.map(c=><button key={c} onClick={()=>setCat(c)} style={{background:catV===c?A.ink:"transparent",border:`1px solid ${catV===c?A.ink:B.border}`,color:catV===c?B.canvas:T.muted,padding:"5px 14px",borderRadius:4,cursor:"pointer",fontFamily:"'Manrope',sans-serif",fontSize:10,letterSpacing:1,textTransform:"uppercase",fontWeight:catV===c?700:500,transition:"all .15s"}}>{c}</button>)}
        </div>
      </div>
    </div>
    <div style={{padding:"36px 48px",maxWidth:1200,margin:"0 auto"}}>
      <p style={{fontFamily:"'Manrope',sans-serif",fontSize:11,color:T.faint,marginBottom:24,letterSpacing:1,fontWeight:600}}>{filtered.length} HIRDETÉS</p>
      <div style={{display:"grid",gridTemplateColumns:"repeat(auto-fill,minmax(272px,1fr))",gap:18}}>
        {filtered.map(l=><Card key={l.id} l={l} u={profiles[l.user_id]} onClick={()=>{setSelId(l.id);go("detail");}}/>)}
      </div>
      {filtered.length===0&&<div style={{textAlign:"center",padding:"90px 0",color:T.faint,fontFamily:"'Manrope',sans-serif",fontSize:13}}>{listings.length===0?"Még nincsenek hirdetések.":"Nincs találat."}</div>}
    </div>
  </div>;
}

// ─── DETAIL ──────────────────────────────────────────────────────────────────
function Detail({l,u,curProfile,go,setProfileId,setActiveChatWith,onUpdate,showToast}) {
  const [status,setStatus]=useState(l.status||"active");
  const [views,setViews]=useState(l.views||0);
  const [faved,setFaved]=useState(false);
  const [showOffer,setShowOffer]=useState(false);
  const [offerVal,setOfferVal]=useState("");
  const [buyerId,setBuyerId]=useState(l.buyer_id||null);
  const [showSoldModal,setShowSoldModal]=useState(false);
  const [msgPartners,setMsgPartners]=useState([]);
  const [selectedBuyer,setSelectedBuyer]=useState(null);
  const [buyerQ,setBuyerQ]=useState("");
  const [buyerResults,setBuyerResults]=useState([]);
  const [loadingP,setLoadingP]=useState(false);
  const [showReview,setShowReview]=useState(null); // "seller"|"buyer" + target
  const [reviewRating,setReviewRating]=useState(5);
  const reviewTextRef=useRef(null);
  const sb=getSupabase();
  const isOwn=curProfile?.id===l.user_id;
  const isBuyer=curProfile?.id===buyerId&&status==="sold";

  useEffect(()=>{
    if(!l.id||isOwn||!sb) return;
    const newV=(l.views||0)+1;
    sb.from("listings").update({views:newV}).eq("id",l.id);
    setViews(newV);
    onUpdate?.(l.id,{views:newV});
  },[l.id]);

  async function openSoldModal() {
    setShowSoldModal(true); setLoadingP(true); setBuyerQ(""); setBuyerResults([]); setSelectedBuyer(null);
    const {data}=await sb.from("messages").select("from_user,to_user").or(`from_user.eq.${curProfile.id},to_user.eq.${curProfile.id}`).order("created_at",{ascending:false});
    if(data){
      const seen=new Set(),ids=[];
      data.forEach(m=>{const p=m.from_user===curProfile.id?m.to_user:m.from_user;if(!seen.has(p)){seen.add(p);ids.push(p);}});
      if(ids.length){const {data:pd}=await sb.from("profiles").select("id,name,sales").in("id",ids);setMsgPartners(pd||[]);}
    }
    setLoadingP(false);
  }

  async function searchBuyer(q) {
    setBuyerQ(q);
    if(q.trim().length<2){setBuyerResults([]);return;}
    const {data}=await sb.from("profiles").select("id,name,sales").ilike("name",`%${q}%`).neq("id",curProfile.id).limit(6);
    setBuyerResults(data||[]);
  }

  async function confirmSold() {
    if(!selectedBuyer) return;
    await sb.from("listings").update({status:"sold",buyer_id:selectedBuyer.id}).eq("id",l.id);
    await sb.from("profiles").update({sales:(u?.sales||0)+1}).eq("id",curProfile.id);
    setStatus("sold"); setBuyerId(selectedBuyer.id); onUpdate?.(l.id,{status:"sold",buyer_id:selectedBuyer.id});
    setShowSoldModal(false);
    setShowReview({side:"buyer",target:selectedBuyer});
  }

  async function submitReview() {
    if(!showReview||!curProfile||!sb) return;
    const text=reviewTextRef.current?.value?.trim()||"";
    await sb.from("reviews").insert({from_user:curProfile.id,to_user:showReview.target.id,rating:reviewRating,text,listing_id:l.id,transaction_type:"verified"});
    const {data:revs}=await sb.from("reviews").select("rating").eq("to_user",showReview.target.id);
    if(revs?.length){const avg=(revs.reduce((s,r)=>s+r.rating,0)/revs.length).toFixed(2);await sb.from("profiles").update({rating:parseFloat(avg),rating_count:revs.length}).eq("id",showReview.target.id);}
    setShowReview(null); showToast?.("Értékelés elküldve!","success");
  }

  async function changeStatus(s) {
    if(s==="sold"){openSoldModal();return;}
    await sb?.from("listings").update({status:s}).eq("id",l.id);
    setStatus(s); onUpdate?.(l.id,{status:s});
  }

  const sCol=status==="sold"?A.green:status==="pending"?A.gold:T.muted;
  const isD=l.listing_type==="decant";

  return <div style={{paddingTop:62,maxWidth:980,margin:"0 auto",padding:"80px 40px",background:B.canvas}}>
    <button onClick={()=>go("market")} style={{background:"none",border:"none",color:T.faint,cursor:"pointer",fontFamily:"'Manrope',sans-serif",fontSize:11,letterSpacing:1,marginBottom:36,fontWeight:600}}>← VISSZA A PIACRA</button>
    <div style={{display:"grid",gridTemplateColumns:"1fr 300px",gap:52}}>
      <div>
        <div style={{display:"flex",gap:6,flexWrap:"wrap",marginBottom:24}}>
          {l.pinned&&<Pill text="📌 Kiemelt" bg={A.goldPale} col={A.gold}/>}
          <Pill text={l.type==="buy"?"Keresett":"Eladó"} bg={l.type==="buy"?"#eef4fb":"#faf8f0"} col={l.type==="buy"?"#4a78b0":A.gold}/>
          <Pill text={isD?"Dekant":"Teljes üveg"} bg={isD?"#fff5ee":"#f2faf6"} col={isD?"#c0724a":A.green}/>
          {l.condition&&<Pill text={COND[l.condition]} bg={COND_COL[l.condition]+"12"} col={COND_COL[l.condition]}/>}
          {status!=="active"&&<Pill text={status==="sold"?"Eladva":"Függőben"} bg={sCol+"12"} col={sCol}/>}
          {l.swap_ok&&<Pill text="Csere OK" bg="#f5f0fb" col="#7a5ab0"/>}
        </div>
        <div style={{fontSize:72,marginBottom:20}}>{l.icon||"🫙"}</div>
        <p style={{fontFamily:"'Manrope',sans-serif",fontSize:10,color:T.faint,letterSpacing:3,marginBottom:5,fontWeight:700}}>{(l.brand||"").toUpperCase()}</p>
        <h1 style={{fontFamily:"'Playfair Display',serif",fontSize:52,color:T.heading,fontWeight:400,lineHeight:1.05,marginBottom:8}}>{l.name}</h1>
        <p style={{color:T.faint,marginBottom:28,fontSize:14,fontFamily:"'Manrope',sans-serif"}}>{isD?`${l.decant_ml}ml spray dekant`:l.size||""}</p>
        {!isD&&l.fill&&<BottleDetail pct={l.fill}/>}
        <div style={{fontFamily:"'Playfair Display',serif",fontSize:48,color:T.heading,marginBottom:36,fontWeight:600}}>{(l.price||0).toLocaleString("hu-HU")} Ft</div>
        <div style={{border:`1px solid ${B.border}`,borderRadius:8,padding:"22px 26px",marginBottom:24,background:B.paper}}>
          <p style={{fontFamily:"'Manrope',sans-serif",fontSize:10,color:T.faint,letterSpacing:2,marginBottom:14,fontWeight:700}}>LEÍRÁS</p>
          <p style={{color:T.body,lineHeight:1.9,fontSize:15,fontFamily:"'Manrope',sans-serif"}}>{l.description}</p>
        </div>
        {l.tags?.length>0&&<div style={{display:"flex",flexWrap:"wrap",gap:6,marginBottom:24}}>{l.tags.map(t=><span key={t} style={{background:B.paper,border:`1px solid ${B.border}`,color:T.muted,padding:"4px 12px",borderRadius:3,fontSize:11,fontFamily:"'Manrope',sans-serif",fontWeight:500}}>#{t}</span>)}</div>}
        {isOwn&&<div style={{border:`1px solid ${B.border}`,borderRadius:8,padding:"20px 24px",background:B.paper}}>
          <p style={{fontFamily:"'Manrope',sans-serif",fontSize:10,color:T.faint,letterSpacing:2,marginBottom:16,fontWeight:700}}>HIRDETÉS STÁTUSZA</p>
          <div style={{display:"flex",gap:8,flexWrap:"wrap"}}>
            {[["active","Aktív",T.muted],["pending","Függőben",A.gold],["sold","Eladva",A.green]].map(([s,label,c])=>(
              <button key={s} onClick={()=>changeStatus(s)} style={{background:status===s?c+"12":"transparent",border:`1px solid ${status===s?c+"44":B.border}`,color:status===s?c:T.faint,padding:"8px 16px",borderRadius:5,cursor:"pointer",fontFamily:"'Manrope',sans-serif",fontSize:11,fontWeight:status===s?700:500,transition:"all .15s"}}>{label}</button>
            ))}
          </div>
        </div>}
      </div>
      <div style={{display:"flex",flexDirection:"column",gap:12}}>
        <div style={{border:`1px solid ${B.border}`,borderRadius:8,padding:"22px 20px",background:B.paper}}>
          <p style={{fontFamily:"'Manrope',sans-serif",fontSize:10,color:T.faint,letterSpacing:2,marginBottom:18,fontWeight:700}}>ELADÓ</p>
          <div style={{display:"flex",gap:12,alignItems:"center",marginBottom:16,cursor:"pointer"}} onClick={()=>{setProfileId(u?.id);go("profile");}}>
            <Ava u={u} size={50}/>
            <div>
              <div style={{fontFamily:"'Playfair Display',serif",fontSize:20,color:T.heading}}>{u?.name}{u?.verified&&<span style={{color:A.gold,fontSize:13}}> ✓</span>}</div>
              <div style={{fontSize:12,color:T.faint,marginTop:2,fontFamily:"'Manrope',sans-serif"}}>📍 {u?.location}</div>
            </div>
          </div>
          {isAdmin(u)?<RankBadge admin size="lg"/>:<RankBadge sales={u?.sales||0} size="lg"/>}
          <div style={{display:"flex",alignItems:"center",gap:8,marginTop:10}}>
            <Stars v={u?.rating||0} size={14}/>
            <span style={{fontSize:12,color:T.muted,fontFamily:"'Manrope',sans-serif"}}>{(u?.rating||0).toFixed(1)} · {u?.rating_count||0} értékelés</span>
          </div>
          <div style={{marginTop:12,paddingTop:12,borderTop:`1px solid ${B.border}`,display:"flex",alignItems:"center",gap:6}}>
            <span style={{fontSize:13}}>👁</span>
            <span style={{fontFamily:"'Manrope',sans-serif",fontSize:12,color:T.faint}}>{views} megtekintés</span>
          </div>
        </div>
        {!isOwn&&status!=="sold"&&<>
          <button onClick={()=>{if(!curProfile){go("login");return;}setActiveChatWith(u.id);go("messages");}} style={{background:A.ink,border:"none",color:B.canvas,padding:"14px",borderRadius:7,cursor:"pointer",fontFamily:"'Manrope',sans-serif",fontSize:14,fontWeight:700}}>✉ Üzenet küldése</button>
          <button onClick={()=>setFaved(!faved)} style={{background:"transparent",border:`1px solid ${faved?A.gold:B.borderDk}`,color:faved?A.gold:T.muted,padding:"12px",borderRadius:7,cursor:"pointer",fontFamily:"'Manrope',sans-serif",fontSize:12,fontWeight:600}}>{faved?"♥ Kedvelve":"♡ Kedvelés"}</button>
          <button onClick={()=>setShowOffer(!showOffer)} style={{background:"transparent",border:`1px solid ${B.border}`,color:T.muted,padding:"12px",borderRadius:7,cursor:"pointer",fontFamily:"'Manrope',sans-serif",fontSize:12,fontWeight:600}}>Ajánlat küldése</button>
          {showOffer&&<div style={{border:`1px solid ${B.border}`,borderRadius:7,padding:14,background:B.paper}}>
            <input value={offerVal} onChange={e=>setOfferVal(e.target.value)} placeholder="Ajánlott ár (Ft)" type="number"
              style={{background:B.canvas,border:`1px solid ${B.border}`,color:T.body,padding:"10px 13px",borderRadius:5,width:"100%",fontFamily:"'Manrope',sans-serif",fontSize:14,marginBottom:8,boxSizing:"border-box",outline:"none"}}/>
            <button onClick={()=>{if(!curProfile){go("login");return;}setActiveChatWith(u.id);go("messages");}} style={{background:A.goldPale,border:`1px solid ${A.goldMid}`,color:A.gold,padding:"9px",width:"100%",borderRadius:5,cursor:"pointer",fontFamily:"'Manrope',sans-serif",fontSize:11,fontWeight:700}}>Ajánlat üzenetben →</button>
          </div>}
        </>}
        {isBuyer&&<button onClick={()=>setShowReview({side:"seller",target:u})} style={{background:`linear-gradient(135deg,${A.gold},#8a6a20)`,border:"none",color:"#fff",padding:"14px",borderRadius:7,cursor:"pointer",fontFamily:"'Manrope',sans-serif",fontSize:13,fontWeight:700}}>⭐ Értékelem az eladót</button>}
        {status==="sold"&&!isBuyer&&<div style={{background:A.greenPale,border:`1px solid ${A.green}30`,borderRadius:7,padding:"16px",textAlign:"center"}}><p style={{fontFamily:"'Manrope',sans-serif",fontSize:12,color:A.green,letterSpacing:1,fontWeight:700}}>✓ ELADVA</p></div>}
        <div style={{border:`1px solid ${B.border}`,borderRadius:7,padding:"16px 18px",background:B.paper}}>
          <p style={{fontFamily:"'Manrope',sans-serif",fontSize:9,color:T.faint,letterSpacing:1.5,marginBottom:12,fontWeight:700}}>BIZTONSÁGOS VÁSÁRLÁS</p>
          {["Valódi értékelések","PM alapú egyeztetés","Hitelesített jelvény","Átverés bejelentés"].map(txt=><div key={txt} style={{display:"flex",gap:10,fontSize:12,color:T.muted,marginBottom:7,fontFamily:"'Manrope',sans-serif"}}><span style={{color:A.gold,flexShrink:0}}>✓</span>{txt}</div>)}
        </div>
      </div>
    </div>

    {/* ELADVA MODAL */}
    {showSoldModal&&<Modal onClose={()=>setShowSoldModal(false)}>
      <h2 style={{fontFamily:"'Playfair Display',serif",fontSize:26,color:T.heading,fontWeight:400,marginBottom:8}}>Kinek adtad el?</h2>
      <p style={{fontFamily:"'Manrope',sans-serif",fontSize:12,color:T.muted,marginBottom:22,lineHeight:1.7}}>Keresd meg névvel, vagy válaszd ki az üzenetpartnereid közül.</p>
      <div style={{marginBottom:20}}>
        <input value={buyerQ} onChange={e=>searchBuyer(e.target.value)} placeholder="pl. illatmester_bp" autoComplete="off"
          style={{width:"100%",background:B.paper,border:`1px solid ${B.border}`,color:T.body,padding:"12px 15px",borderRadius:7,fontFamily:"'Manrope',sans-serif",fontSize:14,outline:"none",boxSizing:"border-box"}}/>
        {buyerResults.length>0&&<div style={{marginTop:8,display:"flex",flexDirection:"column",gap:6}}>
          {buyerResults.map(p=><div key={p.id} onClick={()=>{setSelectedBuyer(p);setBuyerQ(p.name);setBuyerResults([]);}}
            style={{display:"flex",alignItems:"center",gap:12,padding:"10px 14px",borderRadius:7,cursor:"pointer",background:selectedBuyer?.id===p.id?A.goldPale:B.paper,border:`1px solid ${selectedBuyer?.id===p.id?A.gold:B.border}`}}>
            <Ava u={p} size={32}/><span style={{fontFamily:"'Playfair Display',serif",fontSize:16,color:T.heading,flex:1}}>{p.name}</span>
            {selectedBuyer?.id===p.id&&<span style={{color:A.gold}}>✓</span>}
          </div>)}
        </div>}
      </div>
      <div style={{display:"flex",alignItems:"center",gap:12,marginBottom:20}}>
        <div style={{flex:1,height:1,background:B.border}}/><span style={{fontFamily:"'Manrope',sans-serif",fontSize:10,color:T.faint,letterSpacing:2}}>VAGY</span><div style={{flex:1,height:1,background:B.border}}/>
      </div>
      <p style={{fontFamily:"'Manrope',sans-serif",fontSize:10,color:T.faint,letterSpacing:2,marginBottom:10,fontWeight:700,textTransform:"uppercase"}}>Üzenetpartnereid</p>
      {loadingP?<p style={{color:T.faint,fontFamily:"'Manrope',sans-serif",fontSize:12,padding:"12px 0"}}>Betöltés...</p>:(
        <div style={{display:"flex",flexDirection:"column",gap:6,marginBottom:20,maxHeight:200,overflowY:"auto"}}>
          {msgPartners.length===0&&<p style={{color:T.faint,fontFamily:"'Manrope',sans-serif",fontSize:12}}>Még nincs üzenetpartnered.</p>}
          {msgPartners.map(p=><div key={p.id} onClick={()=>{setSelectedBuyer(p);setBuyerQ("");setBuyerResults([]);}}
            style={{display:"flex",alignItems:"center",gap:12,padding:"10px 14px",borderRadius:7,cursor:"pointer",background:selectedBuyer?.id===p.id?A.goldPale:B.paper,border:`1px solid ${selectedBuyer?.id===p.id?A.gold:B.border}`,transition:"all .15s"}}>
            <Ava u={p} size={34}/><span style={{fontFamily:"'Playfair Display',serif",fontSize:16,color:T.heading,flex:1}}>{p.name}</span>
            {selectedBuyer?.id===p.id&&<span style={{color:A.gold}}>✓</span>}
          </div>)}
        </div>
      )}
      <button onClick={confirmSold} disabled={!selectedBuyer}
        style={{background:selectedBuyer?`linear-gradient(135deg,${A.green},#2a6a3a)`:B.warm,border:"none",color:selectedBuyer?"#fff":T.faint,padding:"15px",width:"100%",borderRadius:7,cursor:selectedBuyer?"pointer":"not-allowed",fontFamily:"'Manrope',sans-serif",fontSize:14,fontWeight:700}}>
        {selectedBuyer?`✓ Eladva – ${selectedBuyer.name}`:"Válassz vevőt"}
      </button>
    </Modal>}

    {/* ÉRTÉKELÉS MODAL */}
    {showReview&&<Modal onClose={()=>setShowReview(null)}>
      <div style={{display:"flex",alignItems:"center",gap:14,marginBottom:24}}>
        <Ava u={showReview.target} size={52}/>
        <div>
          <p style={{fontFamily:"'Manrope',sans-serif",fontSize:10,color:T.faint,letterSpacing:2,fontWeight:700,marginBottom:4}}>ÉRTÉKELÉS</p>
          <p style={{fontFamily:"'Playfair Display',serif",fontSize:24,color:T.heading}}>{showReview.target.name}</p>
        </div>
      </div>
      <Pill text="✓ Verified Purchase" bg={A.greenPale} col={A.green}/>
      <div style={{margin:"22px 0"}}>
        <Stars v={reviewRating} size={34} interactive onChange={setReviewRating}/>
        <p style={{fontFamily:"'Manrope',sans-serif",fontSize:11,color:T.faint,marginTop:6}}>{["","Nagyon rossz","Rossz","Elfogadható","Jó","Kiváló"][reviewRating]}</p>
      </div>
      <textarea ref={reviewTextRef} rows={4} placeholder="Hogyan ment az üzlet? Csomagolás, gyorsaság, kommunikáció..."
        style={{background:B.paper,border:`1px solid ${B.border}`,color:T.body,padding:"13px 15px",borderRadius:7,width:"100%",fontFamily:"'Manrope',sans-serif",fontSize:14,resize:"vertical",outline:"none",boxSizing:"border-box",marginBottom:18,lineHeight:1.7}}/>
      <button onClick={submitReview} style={{background:A.ink,border:"none",color:B.canvas,padding:"14px",width:"100%",borderRadius:7,cursor:"pointer",fontFamily:"'Manrope',sans-serif",fontSize:14,fontWeight:700}}>Értékelés elküldése →</button>
    </Modal>}
  </div>;
}

// ─── PROFILE ─────────────────────────────────────────────────────────────────
function Profile({pu,curProfile,go,listings,setActiveChatWith,onSignOut}) {
  const [tab,setTab]=useState("listings");
  const [reviews,setReviews]=useState([]);
  const [wishlist,setWishlist]=useState([]);
  const [showRM,setShowRM]=useState(false);
  const [myRating,setMyRating]=useState(5);
  const [myText,setMyText]=useState("");
  const wishRef=useRef(null);
  const sb=getSupabase();
  const isOwn=curProfile?.id===pu?.id;
  const uls=listings.filter(l=>l.user_id===pu?.id);
  useEffect(()=>{
    if(!pu?.id||!sb)return;
    sb.from("reviews").select("*").eq("to_user",pu.id).order("created_at",{ascending:false}).then(({data})=>setReviews(data||[]));
    sb.from("wishlists").select("*").eq("user_id",pu.id).order("created_at",{ascending:false}).then(({data})=>setWishlist(data||[]));
  },[pu?.id]);
  async function submitReview(){
    if(!curProfile||!sb)return;
    await sb.from("reviews").insert({from_user:curProfile.id,to_user:pu.id,rating:myRating,text:myText,transaction_type:"full"});
    setShowRM(false);setMyText("");
    const {data}=await sb.from("reviews").select("*").eq("to_user",pu.id);setReviews(data||[]);
  }
  async function addWish(){
    const val=wishRef.current?.value?.trim();if(!val||!curProfile||!sb)return;
    const {data}=await sb.from("wishlists").insert({user_id:curProfile.id,raw:val}).select().single();
    if(data){setWishlist(p=>[data,...p]);wishRef.current.value="";}
  }
  async function removeWish(id){
    await sb?.from("wishlists").delete().eq("id",id);setWishlist(p=>p.filter(w=>w.id!==id));
  }
  if(!pu)return null;
  const avg=reviews.length?(reviews.reduce((s,r)=>s+r.rating,0)/reviews.length).toFixed(1):(pu.rating||0).toFixed(1);
  const admin=isAdmin(pu);
  return <div style={{paddingTop:62,maxWidth:980,margin:"0 auto",padding:"80px 40px",background:B.canvas}}>
    <div style={{display:"flex",gap:32,alignItems:"flex-start",marginBottom:48,flexWrap:"wrap",paddingBottom:40,borderBottom:`1px solid ${B.border}`}}>
      <Ava u={pu} size={88}/>
      <div style={{flex:1}}>
        <div style={{display:"flex",gap:12,alignItems:"center",flexWrap:"wrap",marginBottom:10}}>
          <h1 style={{fontFamily:"'Playfair Display',serif",fontSize:40,color:T.heading,fontWeight:400}}>{pu.name}</h1>
          {pu.verified&&<Pill text="Hitelesített" bg={A.goldPale} col={A.gold}/>}
          {admin?<RankBadge admin size="lg"/>:<RankBadge sales={pu.sales||0} size="lg"/>}
          {pu.banned&&<Pill text="Tiltott" bg={A.redPale} col={A.red}/>}
        </div>
        <div style={{display:"flex",gap:10,alignItems:"center",marginBottom:12}}>
          <Stars v={Number(avg)} size={16}/>
          <span style={{fontFamily:"'Playfair Display',serif",fontSize:20,color:A.gold}}>{avg}</span>
          <span style={{color:T.faint,fontSize:13,fontFamily:"'Manrope',sans-serif"}}>({reviews.length} értékelés)</span>
        </div>
        <p style={{color:T.faint,fontSize:13,marginBottom:10,fontFamily:"'Manrope',sans-serif"}}>📍 {pu.location} · Tag: {pu.created_at?.slice(0,7)} óta</p>
        <p style={{color:T.muted,fontSize:14,lineHeight:1.85,maxWidth:500,fontFamily:"'Manrope',sans-serif"}}>{pu.bio}</p>
      </div>
      <div style={{display:"flex",flexDirection:"column",gap:8}}>
        {!isOwn&&curProfile&&<>
          <button onClick={()=>{setActiveChatWith(pu.id);go("messages");}} style={{background:A.ink,border:"none",color:B.canvas,padding:"10px 22px",borderRadius:6,cursor:"pointer",fontFamily:"'Manrope',sans-serif",fontSize:12,fontWeight:700}}>✉ ÜZENET</button>
          <button onClick={()=>setShowRM(true)} style={{background:"transparent",border:`1px solid ${B.borderDk}`,color:T.body,padding:"10px 22px",borderRadius:6,cursor:"pointer",fontFamily:"'Manrope',sans-serif",fontSize:12,fontWeight:600}}>⭐ ÉRTÉKELÉS</button>
        </>}
        {isOwn&&<button onClick={onSignOut} style={{background:"transparent",border:`1px solid ${A.red}30`,color:A.red,padding:"10px 22px",borderRadius:6,cursor:"pointer",fontFamily:"'Manrope',sans-serif",fontSize:12,fontWeight:600}}>Kijelentkezés</button>}
      </div>
    </div>
    <div style={{display:"flex",borderBottom:`1px solid ${B.border}`,marginBottom:36}}>
      {[["listings",`Hirdetések (${uls.length})`],["reviews",`Értékelések (${reviews.length})`],["wishlist",`Kívánlista (${wishlist.length})`]].map(([k,l])=>(
        <button key={k} onClick={()=>setTab(k)} style={{background:"transparent",border:"none",borderBottom:tab===k?`2px solid ${A.gold}`:"2px solid transparent",color:tab===k?T.heading:T.faint,padding:"12px 20px",cursor:"pointer",fontFamily:"'Manrope',sans-serif",fontSize:12,fontWeight:tab===k?700:500,marginBottom:-1}}>{l}</button>
      ))}
    </div>
    {tab==="listings"&&<div style={{display:"grid",gridTemplateColumns:"repeat(auto-fill,minmax(262px,1fr))",gap:16}}>
      {uls.map(l=><Card key={l.id} l={l} u={pu}/>)}
      {uls.length===0&&<p style={{color:T.faint,fontFamily:"'Manrope',sans-serif",fontSize:13}}>Nincs hirdetés.</p>}
    </div>}
    {tab==="reviews"&&<div style={{display:"flex",flexDirection:"column",gap:14}}>
      {reviews.map((r,i)=><div key={i} style={{border:`1px solid ${B.border}`,borderRadius:8,padding:"18px 22px",background:B.paper}}>
        <div style={{display:"flex",justifyContent:"space-between",marginBottom:10}}><Stars v={r.rating}/><span style={{color:T.faint,fontFamily:"'Manrope',sans-serif",fontSize:11}}>{r.created_at?.slice(0,7)}</span></div>
        <p style={{color:T.body,fontSize:14,lineHeight:1.8,fontFamily:"'Manrope',sans-serif"}}>{r.text}</p>
      </div>)}
      {reviews.length===0&&<p style={{color:T.faint,fontFamily:"'Manrope',sans-serif",fontSize:13}}>Még nincs értékelés.</p>}
    </div>}
    {tab==="wishlist"&&<div>
      {isOwn&&<div style={{display:"flex",gap:10,marginBottom:24}}>
        <input ref={wishRef} placeholder="pl. Creed Aventus" defaultValue="" autoComplete="off"
          style={{flex:1,background:B.paper,border:`1px solid ${B.border}`,color:T.body,padding:"12px 15px",borderRadius:7,fontFamily:"'Manrope',sans-serif",fontSize:14,outline:"none"}}/>
        <button onClick={addWish} style={{background:A.ink,border:"none",color:B.canvas,padding:"12px 20px",borderRadius:7,cursor:"pointer",fontFamily:"'Manrope',sans-serif",fontSize:12,fontWeight:700,whiteSpace:"nowrap"}}>+ Hozzáad</button>
      </div>}
      <div style={{display:"flex",flexDirection:"column",gap:8}}>
        {wishlist.map(w=><div key={w.id} style={{border:`1px solid ${B.border}`,borderRadius:8,padding:"14px 18px",display:"flex",alignItems:"center",justifyContent:"space-between",gap:14,background:B.paper}}>
          <div style={{display:"flex",alignItems:"center",gap:14}}>
            <span style={{fontSize:20}}>🌟</span>
            <div><div style={{fontFamily:"'Playfair Display',serif",fontSize:16,color:T.heading}}>{w.raw}</div><div style={{fontFamily:"'Manrope',sans-serif",fontSize:9,color:T.faint,marginTop:2,letterSpacing:1.2,fontWeight:600}}>ÉRTESÍTÉST KÉREK</div></div>
          </div>
          {isOwn&&<button onClick={()=>removeWish(w.id)} style={{background:"transparent",border:`1px solid ${A.red}25`,color:A.red,padding:"5px 11px",borderRadius:4,cursor:"pointer",fontFamily:"'Manrope',sans-serif",fontSize:10,fontWeight:600}}>Töröl</button>}
        </div>)}
        {wishlist.length===0&&<p style={{color:T.faint,fontFamily:"'Manrope',sans-serif",fontSize:13,textAlign:"center",padding:"40px 0"}}>{isOwn?"Adj hozzá parfümöket!":"Nincs nyilvános kívánlista."}</p>}
      </div>
    </div>}
    {showRM&&<Modal onClose={()=>setShowRM(false)}>
      <h2 style={{fontFamily:"'Playfair Display',serif",fontSize:28,color:T.heading,fontWeight:400,marginBottom:22}}>Értékelés írása</h2>
      <div style={{marginBottom:22}}><Stars v={myRating} size={30} interactive onChange={setMyRating}/></div>
      <textarea value={myText} onChange={e=>setMyText(e.target.value)} rows={4} placeholder="Írd le tapasztalatod..."
        style={{background:B.paper,border:`1px solid ${B.border}`,color:T.body,padding:"13px 15px",borderRadius:7,width:"100%",fontFamily:"'Manrope',sans-serif",fontSize:14,resize:"vertical",outline:"none",boxSizing:"border-box",marginBottom:18,lineHeight:1.7}}/>
      <button onClick={submitReview} style={{background:A.ink,border:"none",color:B.canvas,padding:"14px",width:"100%",borderRadius:7,cursor:"pointer",fontFamily:"'Manrope',sans-serif",fontSize:14,fontWeight:700}}>Értékelés küldése →</button>
    </Modal>}
  </div>;
}

// ─── MESSAGES ────────────────────────────────────────────────────────────────
function Messages({curProfile,activeChatWith,setActiveChatWith}) {
  const [convs,setConvs]=useState([]);
  const [pp,setPP]=useState({});
  const [chat,setChat]=useState([]);
  const [newMsg,setNewMsg]=useState("");
  const bottomRef=useRef(null);
  const sb=getSupabase();
  useEffect(()=>{if(curProfile?.id&&sb){loadConvs();}},[curProfile?.id]);
  useEffect(()=>{if(activeChatWith&&sb)loadChat(activeChatWith);},[activeChatWith]);
  useEffect(()=>{bottomRef.current?.scrollIntoView({behavior:"smooth"});},[chat]);
  async function loadConvs(){
    const {data}=await sb.from("messages").select("*").or(`from_user.eq.${curProfile.id},to_user.eq.${curProfile.id}`).order("created_at",{ascending:false});
    if(!data)return;
    const seen=new Set(),cs=[];
    data.forEach(m=>{const p=m.from_user===curProfile.id?m.to_user:m.from_user;if(!seen.has(p)){seen.add(p);cs.push({partnerId:p,lastMsg:m});}});
    setConvs(cs);
    const ids=[...seen];
    if(ids.length){const {data:pd}=await sb.from("profiles").select("*").in("id",ids);if(pd){const m={};pd.forEach(p=>{m[p.id]=p;});setPP(m);}}
  }
  async function loadChat(pid){
    const {data}=await sb.from("messages").select("*").or(`and(from_user.eq.${curProfile.id},to_user.eq.${pid}),and(from_user.eq.${pid},to_user.eq.${curProfile.id})`).order("created_at",{ascending:true});
    setChat(data||[]);
    await sb.from("messages").update({read:true}).eq("to_user",curProfile.id).eq("from_user",pid).eq("read",false);
    loadConvs();
  }
  async function send(){
    const txt=newMsg.trim();if(!txt||!activeChatWith||!sb)return;setNewMsg("");
    await sb.from("messages").insert({from_user:curProfile.id,to_user:activeChatWith,text:txt,read:false,delivered:true});
    loadChat(activeChatWith);
  }
  const totalUnread=convs.filter(c=>c.lastMsg.to_user===curProfile.id&&!c.lastMsg.read).length;
  const activeP=pp[activeChatWith];
  return <div style={{paddingTop:62,height:"100dvh",display:"flex",overflow:"hidden",background:B.canvas}}>
    <div style={{width:300,borderRight:`1px solid ${B.border}`,display:"flex",flexDirection:"column",background:B.paper,flexShrink:0}}>
      <div style={{padding:"20px",borderBottom:`1px solid ${B.border}`,display:"flex",alignItems:"center",justifyContent:"space-between"}}>
        <p style={{fontFamily:"'Playfair Display',serif",fontSize:22,color:T.heading}}>Üzenetek</p>
        {totalUnread>0&&<span style={{background:A.gold,borderRadius:12,padding:"2px 9px",fontFamily:"'Manrope',sans-serif",fontSize:10,color:"#fff",fontWeight:700}}>{totalUnread}</span>}
      </div>
      <div style={{overflowY:"auto",flex:1}}>
        {convs.length===0&&<p style={{padding:"28px 20px",color:T.faint,fontFamily:"'Manrope',sans-serif",fontSize:12}}>Még nincs üzeneted.</p>}
        {convs.map(({partnerId,lastMsg})=>{
          const u=pp[partnerId],active=activeChatWith===partnerId,isU=lastMsg.to_user===curProfile.id&&!lastMsg.read;
          return <div key={partnerId} onClick={()=>setActiveChatWith(partnerId)}
            style={{padding:"14px 20px",cursor:"pointer",display:"flex",gap:12,alignItems:"center",background:active?B.warm:isU?"#faf5e8":"transparent",borderLeft:active?`3px solid ${A.gold}`:isU?`3px solid ${A.gold}55`:"3px solid transparent",borderBottom:`1px solid ${B.border}`}}>
            <Ava u={u||{name:"?"}} size={40}/>
            <div style={{flex:1,minWidth:0}}>
              <div style={{display:"flex",justifyContent:"space-between",alignItems:"center",marginBottom:4}}>
                <span style={{fontFamily:"'Manrope',sans-serif",fontSize:13,color:isU?T.heading:T.muted,fontWeight:isU?700:500}}>{u?.name||"…"}</span>
                <span style={{fontFamily:"'Manrope',sans-serif",fontSize:10,color:isU?A.gold:T.faint}}>{new Date(lastMsg.created_at).toLocaleDateString("hu-HU",{month:"short",day:"numeric"})}</span>
              </div>
              <div style={{fontSize:12,color:isU?T.muted:T.faint,overflow:"hidden",textOverflow:"ellipsis",whiteSpace:"nowrap",fontWeight:isU?600:400,fontFamily:"'Manrope',sans-serif"}}>{lastMsg.from_user===curProfile.id?"Te: ":""}{lastMsg.text}</div>
            </div>
            {isU&&<div style={{background:A.gold,borderRadius:"50%",width:8,height:8,flexShrink:0}}/>}
          </div>;
        })}
      </div>
    </div>
    <div style={{flex:1,display:"flex",flexDirection:"column",background:B.canvas,minWidth:0}}>
      {activeChatWith?<>
        <div style={{padding:"14px 20px",borderBottom:`1px solid ${B.border}`,display:"flex",alignItems:"center",gap:12,background:B.paper,flexShrink:0}}>
          <Ava u={activeP||{name:"?"}} size={40}/>
          <div style={{fontFamily:"'Playfair Display',serif",fontSize:19,color:T.heading,flex:1}}>{activeP?.name||"…"}</div>
          {activeP&&(isAdmin(activeP)?<RankBadge admin/>:<RankBadge sales={activeP.sales||0}/>)}
        </div>
        <div style={{flex:1,overflowY:"auto",padding:"20px 16px",display:"flex",flexDirection:"column",gap:8}}>
          {chat.map((m,i)=>{
            const me=m.from_user===curProfile.id;
            return <div key={m.id||i} style={{display:"flex",justifyContent:me?"flex-end":"flex-start"}}>
              <div style={{maxWidth:"78%",padding:"11px 15px",background:me?B.warm:B.paper,border:`1px solid ${me?B.borderDk:B.border}`,borderRadius:me?"16px 16px 4px 16px":"16px 16px 16px 4px"}}>
                <p style={{color:T.body,fontSize:14,lineHeight:1.6,margin:0,fontFamily:"'Manrope',sans-serif"}}>{m.text}</p>
                <div style={{display:"flex",alignItems:"center",justifyContent:"flex-end",gap:5,marginTop:5}}>
                  <span style={{color:T.faint,fontSize:10,fontFamily:"'Manrope',sans-serif"}}>{new Date(m.created_at).toLocaleTimeString("hu-HU",{hour:"2-digit",minute:"2-digit"})}</span>
                  {me&&<span style={{fontSize:10,color:m.read?A.gold:T.faint}}>✓✓</span>}
                </div>
              </div>
            </div>;
          })}
          <div ref={bottomRef}/>
        </div>
        <div style={{padding:"12px 16px",borderTop:`1px solid ${B.border}`,display:"flex",gap:10,background:B.paper,flexShrink:0}}>
          <input value={newMsg} onChange={e=>setNewMsg(e.target.value)} onKeyDown={e=>e.key==="Enter"&&!e.shiftKey&&send()} placeholder="Írj üzenetet..."
            style={{flex:1,background:B.canvas,border:`1px solid ${B.border}`,color:T.body,padding:"12px 15px",borderRadius:8,fontFamily:"'Manrope',sans-serif",fontSize:14,outline:"none"}}/>
          <button onClick={send} style={{background:A.ink,border:"none",color:B.canvas,padding:"12px 18px",borderRadius:8,cursor:"pointer",fontFamily:"'Manrope',sans-serif",fontWeight:700,fontSize:16}}>→</button>
        </div>
      </>:<div style={{flex:1,display:"flex",alignItems:"center",justifyContent:"center",flexDirection:"column",gap:16}}>
        <span style={{fontSize:48,opacity:.1}}>✉</span>
        <p style={{color:T.faint,fontFamily:"'Manrope',sans-serif",fontSize:13}}>Válassz egy beszélgetést</p>
      </div>}
    </div>
  </div>;
}

// ─── SELL ────────────────────────────────────────────────────────────────────
function SellField({label,error,children}) {
  return <div style={{marginBottom:22}}>
    <div style={{fontFamily:"'Manrope',sans-serif",fontSize:10,color:error?A.red:T.faint,letterSpacing:2,marginBottom:8,textTransform:"uppercase",fontWeight:700}}>
      {label}{error&&<span style={{marginLeft:8,textTransform:"none",letterSpacing:0,fontSize:11,fontWeight:500}}>— {error}</span>}
    </div>
    {children}
  </div>;
}

function Sell({curProfile,go,setListings,showToast}) {
  const [sType,setSType]=useState("sell"),sLT=useState("full"),sFill=useState(90),sCond=useState("excellent"),sDecant=useState("5"),sCat=useState("woody"),sIcon=useState("✨"),sSwap=useState(false);
  const [listingType,setLT]=sLT; const [fill,setFill]=sFill; const [cond,setCond]=sCond; const [decant,setDecant]=sDecant; const [cat,setCat]=sCat; const [icon,setIcon]=sIcon; const [swap,setSwap]=sSwap;
  const [sSize,setSSize]=useState("100ml");
  const [loading,setLoading]=useState(false),errors=useState({});
  const [errs,setErrs]=errors;
  const refBrand=useRef(),refName=useRef(),refPrice=useRef(),refDesc=useRef(),refTags=useRef();
  const sb=getSupabase();
  const inp={background:B.paper,border:`1px solid ${B.border}`,color:T.body,padding:"13px 15px",borderRadius:7,fontFamily:"'Manrope',sans-serif",fontSize:16,width:"100%",boxSizing:"border-box",outline:"none"};
  async function submit(){
    if(!curProfile){go("login");return;}
    const brand=refBrand.current?.value?.trim()||"",name=refName.current?.value?.trim()||"",price=refPrice.current?.value||"",desc=refDesc.current?.value?.trim()||"",tags=refTags.current?.value||"";
    const e={};
    if(!brand)e.brand="Kötelező";if(!name)e.name="Kötelező";if(!price||Number(price)<=0)e.price="Érvényes ár kell";if(!desc)e.description="Kötelező";
    if(Object.keys(e).length>0){setErrs(e);showToast?.("Töltsd ki a kötelező mezőket!","error");return;}
    setErrs({});setLoading(true);
    const isDec=listingType==="decant";
    const {data,error}=await sb.from("listings").insert({
      user_id:curProfile.id,type:sType,listing_type:listingType,brand,name,
      size:isDec?null:sSize,fill:(!isDec&&sType==="sell")?Number(fill):null,
      condition:(!isDec&&sType==="sell")?cond:null,
      price:Number(price),decant_ml:isDec?Number(decant):null,
      description:desc,category:cat,tags:tags.split(",").map(t=>t.trim()).filter(Boolean),
      icon,views:0,favorites:0,status:"active",swap_ok:swap,pinned:false,
    }).select().single();
    setLoading(false);
    if(error){showToast?.("Hiba: "+(error.message||JSON.stringify(error)),"error");return;}
    if(data)setListings(p=>[data,...p]);
    showToast?.("Hirdetés közzétéve!","success");
    setTimeout(()=>go("market"),800);
  }
  return <div style={{paddingTop:62,maxWidth:700,margin:"0 auto",padding:"80px 24px 100px",background:B.canvas}}>
    <p style={{fontFamily:"'Manrope',sans-serif",fontSize:10,color:A.gold,letterSpacing:3,fontWeight:700,marginBottom:8,textTransform:"uppercase"}}>ÚJ HIRDETÉS</p>
    <h1 style={{fontFamily:"'Playfair Display',serif",fontSize:44,color:T.heading,fontWeight:400,marginBottom:40}}>Hirdetés feladása</h1>
    <SellField label="Mit szeretnél?">
      <div style={{display:"flex",gap:8}}>
        {[["sell","🏷 Eladom"],["buy","🔍 Keresem"]].map(([t,l])=>(
          <button key={t} onClick={()=>setSType(t)} style={{flex:1,background:sType===t?A.ink:"transparent",border:`1px solid ${sType===t?A.ink:B.borderDk}`,color:sType===t?B.canvas:T.muted,padding:"13px",borderRadius:7,cursor:"pointer",fontFamily:"'Manrope',sans-serif",fontSize:13,fontWeight:sType===t?700:500,transition:"all .15s"}}>{l}</button>
        ))}
      </div>
    </SellField>
    <SellField label="Típusa">
      <div style={{display:"flex",gap:8}}>
        {[["full","🫙 Teljes üveg"],["decant","💧 Dekant"]].map(([t,l])=>(
          <button key={t} onClick={()=>setLT(t)} style={{flex:1,background:listingType===t?A.ink:"transparent",border:`1px solid ${listingType===t?A.ink:B.borderDk}`,color:listingType===t?B.canvas:T.muted,padding:"13px",borderRadius:7,cursor:"pointer",fontFamily:"'Manrope',sans-serif",fontSize:13,fontWeight:listingType===t?700:500,transition:"all .15s"}}>{l}</button>
        ))}
      </div>
    </SellField>
    <SellField label="Márka *" error={errs.brand}><input ref={refBrand} defaultValue="" placeholder="pl. Creed" autoComplete="off" style={{...inp,...(errs.brand?{border:`1px solid ${A.red}55`}:{})}}/></SellField>
    <SellField label="Parfüm neve *" error={errs.name}><input ref={refName} defaultValue="" placeholder="pl. Aventus" autoComplete="off" style={{...inp,...(errs.name?{border:`1px solid ${A.red}55`}:{})}}/></SellField>
    <div style={{display:"grid",gridTemplateColumns:"1fr 1fr",gap:12}}>
      {listingType==="full"&&<SellField label="Méret"><select value={sSize} onChange={e=>setSSize(e.target.value)} style={{...inp,cursor:"pointer"}}>{["30ml","50ml","75ml","100ml","125ml","150ml","200ml"].map(s=><option key={s}>{s}</option>)}</select></SellField>}
      {listingType==="decant"&&<SellField label="Dekant (ml)"><select value={decant} onChange={e=>setDecant(e.target.value)} style={{...inp,cursor:"pointer"}}>{[1,2,3,5,10,15,20].map(s=><option key={s} value={s}>{s}ml</option>)}</select></SellField>}
      <SellField label="Kategória"><select value={cat} onChange={e=>setCat(e.target.value)} style={{...inp,cursor:"pointer"}}>{["woody","oriental","floral","fresh","aromatic"].map(c=><option key={c}>{c}</option>)}</select></SellField>
      {listingType==="full"&&sType==="sell"&&<SellField label="Állapot"><select value={cond} onChange={e=>setCond(e.target.value)} style={{...inp,cursor:"pointer"}}>{Object.entries(COND).map(([k,v])=><option key={k} value={k}>{v}</option>)}</select></SellField>}
    </div>
    {listingType==="full"&&sType==="sell"&&<SellField label="Töltöttségi szint"><BottleSlider value={fill} onChange={setFill}/></SellField>}
    <SellField label="Ár (Ft) *" error={errs.price}><input ref={refPrice} defaultValue="" placeholder="pl. 35000" type="number" inputMode="numeric" style={{...inp,...(errs.price?{border:`1px solid ${A.red}55`}:{})}}/></SellField>
    <SellField label="Leírás *" error={errs.description}><textarea ref={refDesc} defaultValue="" rows={5} placeholder="Batch, állapot, csere lehetőség..." style={{...inp,resize:"vertical",...(errs.description?{border:`1px solid ${A.red}55`}:{})}}/></SellField>
    <SellField label="Tagek (vesszővel)"><input ref={refTags} defaultValue="" placeholder="creed, niche, woody" autoComplete="off" style={inp}/></SellField>
    <div style={{marginBottom:24}}>
      <div onClick={()=>setSwap(v=>!v)} style={{display:"flex",gap:14,alignItems:"center",cursor:"pointer"}}>
        <div style={{width:22,height:22,borderRadius:5,flexShrink:0,background:swap?"#f5f0fb":"transparent",border:`1.5px solid ${swap?"#7a5ab0":B.borderDk}`,display:"flex",alignItems:"center",justifyContent:"center",transition:"all .15s"}}>{swap&&<span style={{color:"#7a5ab0",fontSize:13,fontWeight:700}}>✓</span>}</div>
        <span style={{fontFamily:"'Manrope',sans-serif",fontSize:13,color:swap?"#7a5ab0":T.body,fontWeight:600}}>Csere is érdekel</span>
      </div>
    </div>
    <SellField label="Ikon">
      <div style={{display:"flex",flexWrap:"wrap",gap:6}}>
        {ICONS.map(ic=><button key={ic} onClick={()=>setIcon(ic)} style={{background:icon===ic?A.goldPale:B.paper,border:`1px solid ${icon===ic?A.gold:B.border}`,borderRadius:7,padding:"8px 12px",cursor:"pointer",fontSize:20}}>{ic}</button>)}
      </div>
    </SellField>
    <button onClick={submit} disabled={loading} style={{background:A.ink,border:"none",color:B.canvas,padding:"18px",width:"100%",borderRadius:8,cursor:"pointer",fontFamily:"'Manrope',sans-serif",fontSize:15,fontWeight:700,marginTop:12,opacity:loading?.6:1}}>
      {loading?"Feltöltés...":"Hirdetés közzététele →"}
    </button>
  </div>;
}

// ─── ADMIN ───────────────────────────────────────────────────────────────────
function Admin({listings,profiles,go,setSelId,setListings,setProfiles,showToast}) {
  const [tab,setTab]=useState("overview");
  const [users,setUsers]=useState([]);
  const [confirmDel,setConfirmDel]=useState(null);
  const [confirmBan,setConfirmBan]=useState(null);
  const sb=getSupabase();
  useEffect(()=>{ if(sb) sb.from("profiles").select("*").order("created_at",{ascending:false}).then(({data})=>setUsers(data||[])); },[]);
  async function handleDelete(l){
    await sb?.from("listings").delete().eq("id",l.id);
    setListings(p=>p.filter(x=>x.id!==l.id));setConfirmDel(null);showToast?.("Hirdetés törölve.","success");
  }
  async function handlePin(l){
    const nv=!l.pinned;
    await sb?.from("listings").update({pinned:nv}).eq("id",l.id);
    setListings(p=>p.map(x=>x.id===l.id?{...x,pinned:nv}:x));showToast?.(nv?"Kiemelve.":"Kiemelés eltávolítva.","success");
  }
  async function handleBan(u){
    const nv=!u.banned;
    await sb?.from("profiles").update({banned:nv}).eq("id",u.id);
    setUsers(p=>p.map(x=>x.id===u.id?{...x,banned:nv}:x));setProfiles(p=>({...p,[u.id]:{...(p[u.id]||{}),banned:nv}}));setConfirmBan(null);showToast?.(nv?`${u.name} tiltva.`:`${u.name} feloldva.`,"success");
  }
  const total=listings.length,active=listings.filter(l=>l.status==="active").length,sold=listings.filter(l=>l.status==="sold").length;
  const revenue=listings.filter(l=>l.status==="sold").reduce((s,l)=>s+(l.price||0),0);
  return <div style={{paddingTop:62,maxWidth:1200,margin:"0 auto",padding:"80px 40px",background:B.canvas}}>
    <span style={{background:A.adminPale,border:`1px solid ${A.adminMid}`,color:A.admin,padding:"4px 12px",borderRadius:4,fontFamily:"'Manrope',sans-serif",fontSize:11,fontWeight:700,letterSpacing:1.5}}>⚡ ADMIN PANEL</span>
    <h1 style={{fontFamily:"'Playfair Display',serif",fontSize:44,color:T.heading,fontWeight:400,marginBottom:36,marginTop:12}}>Dashboard</h1>
    <div style={{display:"flex",borderBottom:`1px solid ${B.border}`,marginBottom:36}}>
      {[["overview","Áttekintés"],["listings","Hirdetések"],["users","Felhasználók"]].map(([k,l])=>(
        <button key={k} onClick={()=>setTab(k)} style={{background:"transparent",border:"none",borderBottom:tab===k?`2px solid ${A.admin}`:"2px solid transparent",color:tab===k?A.admin:T.faint,padding:"12px 20px",cursor:"pointer",fontFamily:"'Manrope',sans-serif",fontSize:12,fontWeight:tab===k?700:500,marginBottom:-1}}>{l}</button>
      ))}
    </div>
    {tab==="overview"&&<div>
      <div style={{display:"grid",gridTemplateColumns:"repeat(auto-fill,minmax(180px,1fr))",gap:16,marginBottom:40}}>
        {[["Összes hirdetés",total,T.heading],["Aktív",active,A.green],["Eladott",sold,A.gold],["Felhasználók",users.length,T.heading],["Tiltott",users.filter(u=>u.banned).length,A.red],["Forgalom",revenue.toLocaleString("hu-HU")+" Ft",A.gold]].map(([label,val,col])=>(
          <div key={label} style={{background:B.paper,border:`1px solid ${B.border}`,borderRadius:10,padding:"20px 22px"}}>
            <div style={{fontFamily:"'Manrope',sans-serif",fontSize:10,color:T.faint,letterSpacing:2,fontWeight:700,textTransform:"uppercase",marginBottom:8}}>{label}</div>
            <div style={{fontFamily:"'Playfair Display',serif",fontSize:32,color:col,fontWeight:600}}>{val}</div>
          </div>
        ))}
      </div>
    </div>}
    {tab==="listings"&&<div style={{display:"grid",gridTemplateColumns:"repeat(auto-fill,minmax(272px,1fr))",gap:18}}>
      {listings.map(l=><Card key={l.id} l={l} u={profiles[l.user_id]} onClick={()=>{setSelId(l.id);go("detail");}} adminMode onAdminDelete={l=>setConfirmDel(l)} onAdminPin={handlePin}/>)}
    </div>}
    {tab==="users"&&<div style={{display:"flex",flexDirection:"column",gap:10}}>
      {users.map(u=><div key={u.id} style={{display:"flex",alignItems:"center",gap:16,padding:"16px 20px",border:`1px solid ${u.banned?A.red+"30":B.border}`,borderRadius:10,background:u.banned?A.redPale:B.paper}}>
        <Ava u={u} size={44}/>
        <div style={{flex:1}}>
          <div style={{display:"flex",alignItems:"center",gap:10,marginBottom:4,flexWrap:"wrap"}}>
            <span style={{fontFamily:"'Playfair Display',serif",fontSize:18,color:T.heading}}>{u.name}</span>
            {isAdmin(u)?<RankBadge admin/>:<RankBadge sales={u.sales||0}/>}
            {u.banned&&<Pill text="Tiltott" bg={A.redPale} col={A.red}/>}
            {u.verified&&<Pill text="Hitelesített" bg={A.goldPale} col={A.gold}/>}
          </div>
          <div style={{fontFamily:"'Manrope',sans-serif",fontSize:12,color:T.faint}}>{u.email} · {u.location||"–"} · {u.sales||0} eladás</div>
        </div>
        {!isAdmin(u)&&<button onClick={()=>setConfirmBan(u)} style={{background:u.banned?A.greenPale:A.redPale,border:`1px solid ${u.banned?A.green:A.red}30`,color:u.banned?A.green:A.red,padding:"8px 16px",borderRadius:6,cursor:"pointer",fontFamily:"'Manrope',sans-serif",fontSize:11,fontWeight:700,whiteSpace:"nowrap"}}>{u.banned?"✓ Feloldás":"⛔ Tiltás"}</button>}
      </div>)}
    </div>}
    {confirmDel&&<Modal onClose={()=>setConfirmDel(null)}>
      <h2 style={{fontFamily:"'Playfair Display',serif",fontSize:26,color:T.heading,fontWeight:400,marginBottom:12}}>Hirdetés törlése</h2>
      <p style={{fontFamily:"'Manrope',sans-serif",fontSize:14,color:T.muted,lineHeight:1.7,marginBottom:28}}>Biztosan törlöd: <strong style={{color:T.heading}}>{confirmDel.brand} {confirmDel.name}</strong>?</p>
      <div style={{display:"flex",gap:10}}>
        <button onClick={()=>handleDelete(confirmDel)} style={{flex:1,background:A.red,border:"none",color:"#fff",padding:"13px",borderRadius:7,cursor:"pointer",fontFamily:"'Manrope',sans-serif",fontSize:13,fontWeight:700}}>Igen, törlöm</button>
        <button onClick={()=>setConfirmDel(null)} style={{flex:1,background:"transparent",border:`1px solid ${B.borderDk}`,color:T.muted,padding:"13px",borderRadius:7,cursor:"pointer",fontFamily:"'Manrope',sans-serif",fontSize:13}}>Mégse</button>
      </div>
    </Modal>}
    {confirmBan&&<Modal onClose={()=>setConfirmBan(null)}>
      <h2 style={{fontFamily:"'Playfair Display',serif",fontSize:26,color:T.heading,fontWeight:400,marginBottom:12}}>{confirmBan.banned?"Tiltás feloldása":"Felhasználó tiltása"}</h2>
      <p style={{fontFamily:"'Manrope',sans-serif",fontSize:14,color:T.muted,lineHeight:1.7,marginBottom:28}}><strong style={{color:T.heading}}>{confirmBan.name}</strong></p>
      <div style={{display:"flex",gap:10}}>
        <button onClick={()=>handleBan(confirmBan)} style={{flex:1,background:confirmBan.banned?A.green:A.red,border:"none",color:"#fff",padding:"13px",borderRadius:7,cursor:"pointer",fontFamily:"'Manrope',sans-serif",fontSize:13,fontWeight:700}}>{confirmBan.banned?"Feloldás":"Tiltás"}</button>
        <button onClick={()=>setConfirmBan(null)} style={{flex:1,background:"transparent",border:`1px solid ${B.borderDk}`,color:T.muted,padding:"13px",borderRadius:7,cursor:"pointer",fontFamily:"'Manrope',sans-serif",fontSize:13}}>Mégse</button>
      </div>
    </Modal>}
  </div>;
}

// ─── LOGIN ───────────────────────────────────────────────────────────────────
function Login({go,showToast}) {
  const [mode,setMode]=useState("login"),email=useState(""),pass=useState(""),passC=useState(""),name=useState(""),loc=useState(""),tos=useState(false),loading=useState(false),regState=useState("idle");
  const [emailV,setEmail]=email;const [passV,setPass]=pass;const [passCv,setPassC]=passC;const [nameV,setName]=name;const [locV,setLoc]=loc;const [tosV,setTos]=tos;const [loadingV,setLoading]=loading;const [regStateV,setRegState]=regState;
  const sb=getSupabase();
  function sw(m){setMode(m);setEmail("");setPass("");setPassC("");setName("");setLoc("");setTos(false);}
  async function doLogin(){
    if(!sb){showToast?.("Supabase nem elérhető","error");return;}
    setLoading(true);
    const {error}=await sb.auth.signInWithPassword({email:emailV,password:passV});
    setLoading(false);
    if(error){showToast?.(error.message||"Hibás adatok","error");}else{go("home");}
  }
  async function doRegister(){
    if(!nameV.trim()){showToast?.("Add meg a neved!","error");return;}
    if(passV!==passCv){showToast?.("A jelszavak nem egyeznek!","error");return;}
    if(!tosV){showToast?.("ÁSZF szükséges!","error");return;}
    if(!sb){showToast?.("Supabase nem elérhető","error");return;}
    setLoading(true);
    const {data:sd,error}=await sb.auth.signUp({email:emailV,password:passV,options:{data:{name:nameV,location:locV}}});
    if(error){setLoading(false);showToast?.(error.message,"error");return;}
    if(sd?.user){await sb.from("profiles").upsert({id:sd.user.id,name:nameV.trim(),location:locV.trim(),email:emailV,bio:"",verified:false,rating:0,rating_count:0,sales:0,banned:false});}
    setLoading(false);
    if(sd?.session){go("home");}else{setRegState("confirm");}
  }
  const inp={background:B.paper,border:`1px solid ${B.border}`,color:T.body,padding:"13px 15px",borderRadius:7,fontFamily:"'Manrope',sans-serif",fontSize:16,width:"100%",boxSizing:"border-box",outline:"none",marginBottom:12};
  const lbl={fontFamily:"'Manrope',sans-serif",fontSize:10,color:T.faint,letterSpacing:2,display:"block",marginBottom:6,textTransform:"uppercase",fontWeight:700};
  if(regStateV==="confirm")return <div style={{paddingTop:62,minHeight:"100vh",display:"flex",alignItems:"center",justifyContent:"center",background:B.canvas}}>
    <div style={{border:`1px solid ${B.border}`,borderRadius:12,padding:"56px 48px",maxWidth:440,textAlign:"center",background:B.paper}}>
      <div style={{fontSize:48,marginBottom:22}}>✉</div>
      <h2 style={{fontFamily:"'Playfair Display',serif",fontSize:30,color:T.heading,fontWeight:400,marginBottom:16}}>Erősítsd meg az emailed</h2>
      <p style={{color:T.muted,fontFamily:"'Manrope',sans-serif",fontSize:13,lineHeight:2,marginBottom:32}}>Linket küldtünk: <span style={{color:A.gold}}>{emailV}</span></p>
      <button onClick={()=>{sw("login");setRegState("idle");}} style={{background:A.ink,border:"none",color:B.canvas,padding:"14px",width:"100%",borderRadius:7,cursor:"pointer",fontFamily:"'Manrope',sans-serif",fontSize:14,fontWeight:700}}>Bejelentkezéshez →</button>
    </div>
  </div>;
  return <div style={{paddingTop:62,minHeight:"100vh",display:"flex",alignItems:"center",justifyContent:"center",padding:"80px 24px",background:B.canvas}}>
    <div style={{border:`1px solid ${B.border}`,borderRadius:12,padding:"56px 48px",width:"100%",maxWidth:440,boxShadow:"0 8px 40px rgba(0,0,0,.06)",background:B.paper}}>
      <div style={{textAlign:"center",marginBottom:40}}>
        <h2 style={{fontFamily:"'Playfair Display',serif",fontSize:36,color:T.heading,fontWeight:400,marginBottom:4}}>{mode==="login"?"Belépés":"Regisztráció"}</h2>
        <p style={{fontFamily:"'Manrope',sans-serif",fontSize:12,color:T.faint}}>SCENTRADE · Magyar Parfüm Közösség</p>
      </div>
      <div style={{display:"flex",background:B.warm,borderRadius:7,padding:3,marginBottom:32}}>
        {[["login","Belépés"],["register","Regisztráció"]].map(([m,l])=>(
          <button key={m} onClick={()=>sw(m)} style={{flex:1,padding:"9px",borderRadius:5,border:"none",cursor:"pointer",background:mode===m?B.canvas:"transparent",color:mode===m?T.heading:T.faint,fontFamily:"'Manrope',sans-serif",fontSize:12,fontWeight:mode===m?700:500,boxShadow:mode===m?"0 1px 4px rgba(0,0,0,.06)":"none"}}>{l}</button>
        ))}
      </div>
      {mode==="register"&&<><label style={lbl}>Felhasználónév *</label><input value={nameV} onChange={e=>setName(e.target.value)} placeholder="pl. illatmester_bp" style={inp}/><label style={lbl}>Helyszín</label><input value={locV} onChange={e=>setLoc(e.target.value)} placeholder="pl. Budapest" style={inp}/></>}
      <label style={lbl}>Email *</label>
      <input value={emailV} onChange={e=>setEmail(e.target.value)} placeholder="pelda@email.hu" type="email" autoComplete="email" style={inp}/>
      <label style={lbl}>Jelszó *</label>
      <input value={passV} onChange={e=>setPass(e.target.value)} placeholder="••••••••" type="password" onKeyDown={e=>e.key==="Enter"&&mode==="login"&&doLogin()} style={{...inp,marginBottom:mode==="register"?12:20}}/>
      {mode==="register"&&<>
        <label style={lbl}>Jelszó mégegyszer *</label>
        <input value={passCv} onChange={e=>setPassC(e.target.value)} placeholder="••••••••" type="password" style={{...inp,border:`1px solid ${passCv&&passCv!==passV?A.red+"55":B.border}`,marginBottom:16}}/>
        <label style={{display:"flex",gap:12,alignItems:"flex-start",cursor:"pointer",marginBottom:20}}>
          <div onClick={()=>setTos(v=>!v)} style={{width:20,height:20,borderRadius:4,flexShrink:0,marginTop:1,background:tosV?A.goldPale:"transparent",border:`1.5px solid ${tosV?A.gold:B.borderDk}`,display:"flex",alignItems:"center",justifyContent:"center",cursor:"pointer"}}>
            {tosV&&<span style={{color:A.gold,fontSize:12,fontWeight:700}}>✓</span>}
          </div>
          <span style={{fontFamily:"'Manrope',sans-serif",fontSize:12,color:T.muted,lineHeight:1.7}}>Elfogadom az ÁSZF-t és az Adatkezelési tájékoztatót. *</span>
        </label>
      </>}
      <button onClick={mode==="login"?doLogin:doRegister} disabled={loadingV||(mode==="register"&&!tosV)}
        style={{background:(mode==="register"&&!tosV)?B.warm:A.ink,border:"none",color:(mode==="register"&&!tosV)?T.faint:B.canvas,padding:"15px",width:"100%",borderRadius:7,cursor:(mode==="register"&&!tosV)?"not-allowed":"pointer",fontFamily:"'Manrope',sans-serif",fontSize:14,fontWeight:700,marginBottom:16,opacity:loadingV?.6:1}}>
        {loadingV?"...":mode==="login"?"Belépés →":"Regisztráció →"}
      </button>
      <p style={{color:T.faint,fontSize:11,fontFamily:"'Manrope',sans-serif",textAlign:"center",cursor:"pointer",fontWeight:600}} onClick={()=>sw(mode==="login"?"register":"login")}>
        {mode==="login"?"Még nincs fiókod? Regisztrálj":"Már van fiókod? Lépj be"}
      </p>
    </div>
  </div>;
}

// ─── GUEST WALL ──────────────────────────────────────────────────────────────
function GuestWall({go}) {
  return <div style={{paddingTop:62,minHeight:"100vh",display:"flex",alignItems:"center",justifyContent:"center",background:B.canvas}}>
    <div style={{border:`1px solid ${B.border}`,borderRadius:12,padding:"64px 52px",maxWidth:460,textAlign:"center",background:B.paper}}>
      <div style={{fontSize:48,marginBottom:22}}>🔒</div>
      <h2 style={{fontFamily:"'Playfair Display',serif",fontSize:32,color:T.heading,fontWeight:400,marginBottom:14}}>Belépés szükséges</h2>
      <p style={{color:T.muted,fontFamily:"'Manrope',sans-serif",fontSize:13,lineHeight:2,marginBottom:36}}>Hirdetés feladásához be kell jelentkezned.</p>
      <button onClick={()=>go("login")} style={{background:A.ink,border:"none",color:B.canvas,padding:"14px 40px",borderRadius:7,cursor:"pointer",fontFamily:"'Manrope',sans-serif",fontSize:14,fontWeight:700,marginBottom:12,width:"100%"}}>Belépés / Regisztráció →</button>
      <button onClick={()=>go("market")} style={{background:"transparent",border:`1px solid ${B.border}`,color:T.muted,padding:"12px 40px",borderRadius:7,cursor:"pointer",fontFamily:"'Manrope',sans-serif",fontSize:12,fontWeight:600,width:"100%"}}>Vissza a piacra</button>
    </div>
  </div>;
}

// ─── AUTH HOOK ───────────────────────────────────────────────────────────────
function useAuth() {
  const [profile,setProfile]=useState(null);
  const [loading,setLoading]=useState(true);
  useEffect(()=>{
    // Load supabase script then init session
    if(!window.supabase){
      const s=document.createElement("script");
      s.src="https://cdn.jsdelivr.net/npm/@supabase/supabase-js@2/dist/umd/supabase.min.js";
      s.onload=()=>initSession();
      s.onerror=()=>setLoading(false);
      document.head.appendChild(s);
    } else {
      initSession();
    }
  },[]);
  async function initSession(){
    const sb=getSupabase();
    if(!sb){setLoading(false);return;}
    const {data:{session}}=await sb.auth.getSession();
    if(session?.user) await fetchProfile(session.user);
    else setLoading(false);
    sb.auth.onAuthStateChange(async(_,session)=>{
      if(session?.user) await fetchProfile(session.user);
      else {setProfile(null);setLoading(false);}
    });
  }
  async function fetchProfile(user){
    const sb=getSupabase();
    const {data}=await sb.from("profiles").select("*").eq("id",user.id).single();
    setProfile(data?{...data,email:user.email}:{id:user.id,email:user.email,name:user.email});
    setLoading(false);
  }
  return {profile,loading};
}

// ─── ROOT ────────────────────────────────────────────────────────────────────
export default function App() {
  const {profile,loading}=useAuth();
  const [page,setPage]=useState("home");
  const [listings,setListings]=useState([]);
  const [profiles,setProfiles]=useState({});
  const [selId,setSelId]=useState(null);
  const [profileId,setProfileId]=useState(null);
  const [activeChatWith,setACW]=useState(null);
  const [unread,setUnread]=useState(0);
  const {show:showToast,ToastContainer}=useToast();

  useEffect(()=>{ loadListings(); },[]);
  useEffect(()=>{ if(profile) loadUnread(); },[profile?.id]);

  async function loadListings(){
    const sb=getSupabase();if(!sb)return;
    const {data}=await sb.from("listings").select("*").order("created_at",{ascending:false});
    if(!data)return;
    setListings(data);
    const ids=[...new Set(data.map(l=>l.user_id))];
    if(ids.length){const {data:pd}=await sb.from("profiles").select("*").in("id",ids);if(pd){const m={};pd.forEach(p=>{m[p.id]=p;});setProfiles(m);}}
  }
  async function loadUnread(){
    const sb=getSupabase();if(!sb||!profile)return;
    const {count}=await sb.from("messages").select("*",{count:"exact",head:true}).eq("to_user",profile.id).eq("read",false);
    setUnread(count||0);
  }
  async function signOut(){const sb=getSupabase();await sb?.auth.signOut();setProfile&&setPage("home");}
  function go(p){
    if(p==="sell"&&!profile){setPage("guest_wall");window.scrollTo(0,0);return;}
    if(p==="admin"&&!isAdmin(profile)){return;}
    setPage(p);window.scrollTo(0,0);
  }
  function upd(id,fields){setListings(p=>p.map(l=>l.id===id?{...l,...fields}:l));}
  const sel=listings.find(l=>l.id===selId);
  const pu=profileId?(profiles[profileId]||null):null;
  const allP=profile?{...profiles,[profile.id]:profile}:profiles;

  if(loading)return <div style={{background:B.canvas,minHeight:"100vh",display:"flex",alignItems:"center",justifyContent:"center"}}>
    <div style={{textAlign:"center"}}>
      <div style={{fontFamily:"'Playfair Display',serif",fontSize:32,color:A.gold,marginBottom:16}}>◈</div>
      <div style={{fontFamily:"'Manrope',sans-serif",fontSize:12,color:T.faint}}>Betöltés...</div>
    </div>
  </div>;

  return <div style={{background:B.canvas,minHeight:"100vh",color:T.body}}>
    <style>{`
      @import url('https://fonts.googleapis.com/css2?family=Playfair+Display:ital,wght@0,400;0,600;0,700;1,400&family=Manrope:wght@400;500;600;700&display=swap');
      *,*::before,*::after{box-sizing:border-box;margin:0;padding:0;}
      body{background:#faf8f4;}
      input,textarea,select{font-size:16px!important;font-family:'Manrope',sans-serif;}
      input::placeholder,textarea::placeholder{color:#c5bfb8;}
      ::-webkit-scrollbar{width:5px;}::-webkit-scrollbar-track{background:#f5f2ec;}::-webkit-scrollbar-thumb{background:#e3ddd4;border-radius:3px;}
      select option{background:#faf8f4;color:#2c2825;}
      button{transition:opacity .15s,background .15s,border-color .15s,color .15s;}
      button:hover{opacity:.85;}
      input[type=range]::-webkit-slider-thumb{appearance:none;width:16px;height:16px;border-radius:50%;background:#b8943f;cursor:pointer;border:2px solid #faf8f4;}
      a{color:inherit;}
    `}</style>
    <Nav profile={profile} page={page} go={go} openLogin={()=>go("login")} unread={unread}/>
    <ToastContainer/>
    {page==="home"        && <Home go={go} listings={listings} profiles={allP}/>}
    {page==="market"      && <Market listings={listings} profiles={allP} go={go} setSelId={setSelId}/>}
    {page==="detail"      && sel && <Detail l={sel} u={allP[sel.user_id]} curProfile={profile} go={go} setProfileId={setProfileId} setActiveChatWith={setACW} onUpdate={upd} showToast={showToast}/>}
    {page==="profile"     && pu && <Profile pu={pu} curProfile={profile} go={go} listings={listings} setActiveChatWith={setACW} onSignOut={signOut}/>}
    {page==="profile_own" && profile && <Profile pu={profile} curProfile={profile} go={go} listings={listings} setActiveChatWith={setACW} onSignOut={signOut}/>}
    {page==="messages"    && profile && <Messages curProfile={profile} activeChatWith={activeChatWith} setActiveChatWith={setACW}/>}
    {page==="sell"        && profile && <Sell curProfile={profile} go={go} setListings={setListings} showToast={showToast}/>}
    {page==="admin"       && isAdmin(profile) && <Admin listings={listings} profiles={allP} go={go} setSelId={setSelId} setListings={setListings} setProfiles={setProfiles} showToast={showToast}/>}
    {page==="guest_wall"  && <GuestWall go={go}/>}
    {page==="login"       && <Login go={go} showToast={showToast}/>}
  </div>;
}
ENDOFFILE
echo "Done: $(wc -l < /mnt/user-data/outputs/scentrade-redesign.jsx) lines"