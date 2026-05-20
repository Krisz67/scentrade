cat > /mnt/user-data/outputs/scentrade-final.jsx << 'ENDOFFILE'
import { useState, useEffect, useRef } from "react";

// ─── SUPABASE ────────────────────────────────────────────────────────────────
const SUPABASE_URL = "https://godjaksujnzekgpbpywk.supabase.co";
const SUPABASE_KEY = "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6ImdvZGpha3N1am56ZWtncGJweXdrIiwicm9sZSI6ImFub24iLCJpYXQiOjE3Nzg1MDA3MDYsImV4cCI6MjA5NDA3NjcwNn0.b5KmrSZ5sjePZCls-dEZ00yJI8gbMs0MNPI2RxetPC8";
const ADMIN_EMAIL  = "rapi.krisztian@gmail.com";

// Native REST client — no CDN/npm needed
const sb = (() => {
  let session = null;
  try { const s = localStorage.getItem("_sb_sess"); if (s) session = JSON.parse(s); } catch(e){}

  const listeners = [];
  function h() {
    const tok = session?.access_token;
    return { "apikey": SUPABASE_KEY, "Authorization": `Bearer ${tok || SUPABASE_KEY}`, "Content-Type": "application/json" };
  }

  async function rpc(path, method="GET", body=null, extra={}) {
    const r = await fetch(`${SUPABASE_URL}/rest/v1/${path}`, { method, headers:{...h(),...extra}, body: body ? JSON.stringify(body) : undefined });
    if (r.status === 204) return { data: null, error: null, count: 0 };
    const txt = await r.text();
    let d; try { d = JSON.parse(txt); } catch(e) { d = txt; }
    const cr = r.headers.get("content-range");
    const count = cr ? parseInt(cr.split("/")[1]||"0") : 0;
    return r.ok ? { data: d, error: null, count } : { data: null, error: { message: d?.message || d?.error_description || JSON.stringify(d) } };
  }

  function from(table) {
    const f = { filters:[], sel:"*", ord:null, lim:null, single:false };
    const b = {
      select(c,o){ f.sel=c||"*"; return b; },
      eq(c,v){ f.filters.push(`${c}=eq.${encodeURIComponent(v)}`); return b; },
      neq(c,v){ f.filters.push(`${c}=neq.${encodeURIComponent(v)}`); return b; },
      ilike(c,v){ f.filters.push(`${c}=ilike.${encodeURIComponent(v)}`); return b; },
      in(c,vs){ f.filters.push(`${c}=in.(${vs.map(v=>encodeURIComponent(v)).join(",")})`); return b; },
      or(e){ f.filters.push(`or=(${e})`); return b; },
      order(c,o){ f.ord=`${c}.${o?.ascending===false?"desc":"asc"}`; return b; },
      limit(n){ f.lim=n; return b; },
      single(){ f.single=true; return b; },
      _qs(base="") {
        let q = `select=${f.sel}`; f.filters.forEach(x=>q+=`&${x}`);
        if(f.ord) q+=`&order=${f.ord}`; if(f.lim) q+=`&limit=${f.lim}`;
        return `${table}?${q}${base}`;
      },
      then(res,rej) {
        const extra = f.single ? {"Prefer":"count=exact"} : {};
        return rpc(b._qs(), "GET", null, extra).then(r=>{
          if(f.single&&Array.isArray(r.data)) r.data=r.data[0]||null;
          res(r);
        }, rej);
      },
      async insert(body){
        const arr = Array.isArray(body)?body:[body];
        const r = await rpc(table, "POST", arr, {"Prefer":"return=representation"});
        if(!r.error&&Array.isArray(r.data)) r.data=r.data[0]||null;
        r.select=()=>({single:()=>({then:(res)=>res(r)})});
        return r;
      },
      async update(body){
        const r = await rpc(b._qs(), "PATCH", body, {"Prefer":"return=representation"});
        if(!r.error&&Array.isArray(r.data)) r.data=r.data[0]||null;
        return r;
      },
      async upsert(body){
        const arr = Array.isArray(body)?body:[body];
        const r = await rpc(table, "POST", arr, {"Prefer":"return=representation,resolution=merge-duplicates"});
        if(!r.error&&Array.isArray(r.data)) r.data=r.data[0]||null;
        return r;
      },
      async delete(){ return rpc(b._qs("&select=id"), "DELETE"); },
    };
    return b;
  }

  const auth = {
    getSession() { return Promise.resolve({ data:{ session }}); },
    onAuthStateChange(cb){ listeners.push(cb); return { data:{ subscription:{ unsubscribe(){ const i=listeners.indexOf(cb); if(i>-1)listeners.splice(i,1); } } } }; },
    async signInWithPassword({email,password}){
      const r = await fetch(`${SUPABASE_URL}/auth/v1/token?grant_type=password`, { method:"POST", headers:{ "apikey":SUPABASE_KEY,"Content-Type":"application/json" }, body:JSON.stringify({email,password}) });
      const d = await r.json();
      if(!r.ok) return { error:{ message:d.error_description||d.msg||"Hibás email vagy jelszó" } };
      session = d;
      try{ localStorage.setItem("_sb_sess",JSON.stringify(d)); }catch(e){}
      listeners.forEach(cb=>cb("SIGNED_IN",d));
      return { data:d, error:null };
    },
    async signUp({email,password,options}){
      const r = await fetch(`${SUPABASE_URL}/auth/v1/signup`, { method:"POST", headers:{"apikey":SUPABASE_KEY,"Content-Type":"application/json"}, body:JSON.stringify({email,password,data:options?.data||{}}) });
      const d = await r.json();
      if(!r.ok) return { data:{}, error:{ message:d.error_description||d.msg||"Hiba" } };
      if(d.access_token){ session=d; try{localStorage.setItem("_sb_sess",JSON.stringify(d));}catch(e){} listeners.forEach(cb=>cb("SIGNED_IN",d)); }
      return { data:{ user:d.user||d, session:d.access_token?d:null }, error:null };
    },
    async signOut(){
      try{ await fetch(`${SUPABASE_URL}/auth/v1/logout`,{method:"POST",headers:h()}); }catch(e){}
      session=null; try{localStorage.removeItem("_sb_sess");}catch(e){}
      listeners.forEach(cb=>cb("SIGNED_OUT",null));
    },
  };

  return { from, auth };
})();

// ─── TOKENS ──────────────────────────────────────────────────────────────────
const T = { h:"#0f0e0d", b:"#2c2825", m:"#6b6560", f:"#9e9890", inv:"#faf8f4" };
const B = { c:"#faf8f4", p:"#f5f2ec", w:"#ede9e0", bor:"#e3ddd4", borD:"#c9c1b4" };
const AC = {
  g:"#b8943f", gP:"#b8943f18", gM:"#b8943f35", gW:"#d4a84b",
  ink:"#1a1714", r:"#c0453a", rP:"#c0453a12",
  gr:"#3a7a52", grP:"#3a7a5212",
  adm:"#7c3aed", admP:"#7c3aed12", admM:"#7c3aed35",
};

const COND = { mint:"Bontatlan", excellent:"Kiváló", good:"Jó", fair:"Közepes" };
const COND_C = { mint:AC.gr, excellent:"#4a78b0", good:AC.g, fair:AC.r };
const CATS = ["Összes","woody","oriental","floral","fresh","aromatic"];
const ICONS = ["✨","🏺","🫙","🌸","🌿","🍂","☀️","🌑","🥀","💀","🎷","🏔","🌊","🍋","🔥"];

const isAdmin = p => p?.email === ADMIN_EMAIL;
const getRank = (s=0) => s>=50?{l:"Illatmester",i:"◆",c:AC.g}:s>=5?{l:"Parfümista",i:"◇",c:T.m}:{l:"Újonc",i:"○",c:T.f};

// ─── MICRO COMPONENTS ────────────────────────────────────────────────────────
const Pill = ({text,bg=AC.gP,col=AC.g}) =>
  <span style={{background:bg,color:col,fontSize:9,fontWeight:700,padding:"3px 9px",borderRadius:3,letterSpacing:1.2,textTransform:"uppercase",fontFamily:"Manrope,sans-serif",whiteSpace:"nowrap",border:`1px solid ${col}25`}}>{text}</span>;

const Stars = ({v=5,size=13,onChange}) => {
  const [hov,setHov] = useState(0);
  return <span style={{fontSize:size,letterSpacing:3,cursor:onChange?"pointer":"default"}}>
    {[1,2,3,4,5].map(i=>
      <span key={i} style={{color:i<=(hov||Math.round(v))?AC.g:B.borD}}
        onMouseEnter={()=>onChange&&setHov(i)} onMouseLeave={()=>onChange&&setHov(0)}
        onClick={()=>onChange?.(i)}>★</span>
    )}
  </span>;
};

const Ava = ({u,size=38}) => {
  const init = u?.name?u.name.split(" ").map(w=>w[0]).join("").slice(0,2).toUpperCase():"?";
  const rk = getRank(u?.sales||0);
  const adm = isAdmin(u);
  return <div style={{position:"relative",flexShrink:0}}>
    <div style={{width:size,height:size,borderRadius:"50%",background:`linear-gradient(135deg,${B.w},${B.bor})`,display:"flex",alignItems:"center",justifyContent:"center",fontFamily:"'Playfair Display',serif",fontWeight:700,fontSize:size*.34,color:T.m,border:`1.5px solid ${adm?AC.admM:rk.c+"40"}`}}>{init}</div>
    {size>=36&&<span style={{position:"absolute",bottom:-2,right:-2,fontSize:size*.28,lineHeight:1,background:B.c,borderRadius:"50%",padding:"1px",color:adm?AC.adm:rk.c}}>{adm?"⚡":rk.i}</span>}
  </div>;
};

const RankBadge = ({sales=0,adm=false,lg=false}) => {
  const r = adm?{l:"Admin",i:"⚡",c:AC.adm,bg:AC.admP,bd:AC.admM}:(()=>{const rk=getRank(sales);return{l:rk.l,i:rk.i,c:rk.c,bg:rk.c+"08",bd:rk.c+"55"};})();
  return <span style={{display:"inline-flex",alignItems:"center",gap:lg?5:4,border:`1px solid ${r.bd}`,borderRadius:3,padding:lg?"4px 10px":"2px 7px",fontFamily:"Manrope,sans-serif",fontSize:lg?10:9,color:r.c,fontWeight:700,letterSpacing:1.5,textTransform:"uppercase",whiteSpace:"nowrap",background:r.bg}}>
    <span style={{fontSize:lg?9:8}}>{r.i}</span>{r.l}
  </span>;
};

const Modal = ({onClose,children}) =>
  <div style={{position:"fixed",inset:0,zIndex:200,background:"rgba(15,14,13,.55)",backdropFilter:"blur(12px)",display:"flex",alignItems:"center",justifyContent:"center",padding:20}} onClick={onClose}>
    <div onClick={e=>e.stopPropagation()} style={{background:B.c,border:`1px solid ${B.bor}`,borderRadius:12,padding:"44px 40px",width:"100%",maxWidth:520,maxHeight:"90vh",overflowY:"auto",boxShadow:"0 24px 80px rgba(0,0,0,.18)"}}>{children}</div>
  </div>;

function useToast() {
  const [ts,setTs] = useState([]);
  const show = (msg,type="info") => setTs(p=>[...p,{id:Date.now(),msg,type}]);
  const rm = id => setTs(p=>p.filter(t=>t.id!==id));
  const TC = () => <div style={{position:"fixed",bottom:28,right:28,zIndex:9999,display:"flex",flexDirection:"column",gap:8}}>
    {ts.map(t=>{
      const cfg={success:{bg:"#f2faf6",bor:AC.gr+"30",col:AC.gr},error:{bg:"#fff5f5",bor:AC.r+"30",col:AC.r},info:{bg:"#faf8f0",bor:AC.g+"30",col:AC.g}};
      const c=cfg[t.type]||cfg.info;
      return <div key={t.id} style={{background:c.bg,border:`1px solid ${c.bor}`,borderRadius:8,padding:"12px 16px",maxWidth:340,boxShadow:"0 4px 20px rgba(0,0,0,.08)",display:"flex",gap:10,alignItems:"flex-start"}}>
        <span style={{color:c.col,fontSize:14}}>{t.type==="success"?"✓":t.type==="error"?"✕":"◆"}</span>
        <p style={{color:c.col,fontFamily:"Manrope,sans-serif",fontSize:13,lineHeight:1.5,flex:1}}>{t.msg}</p>
        <button onClick={()=>rm(t.id)} style={{background:"none",border:"none",color:c.col,cursor:"pointer",fontSize:16,opacity:.4,padding:0,lineHeight:1}}>×</button>
      </div>;
    })}
  </div>;
  return {show,TC};
}

// ─── BOTTLE ──────────────────────────────────────────────────────────────────
const bCol = pct => pct>=80?{t:"#d4a84b",m:"#b8943f",b:"#8a6e28"}:pct>=50?{t:"#c9924a",m:"#a87030",b:"#7a4e18"}:pct>=20?{t:"#c0854a",m:"#9a6228",b:"#6e4010"}:{t:"#b07040",m:"#8a5020",b:"#5c300a"};
const bLbl = pct => pct===100?"Bontatlan":pct>=90?"Szinte tele":pct>=75?"Háromnegyedes":pct>=50?"Feles":pct>=25?"Negyed körüli":pct>=10?"Kevés maradt":"Majdnem üres";

const BottleCompact = ({pct=90}) => {
  const c=bCol(pct),lH=(pct/100)*108,lY=40+(108-lH);
  const col=pct>=80?AC.g:pct>=50?"#c0924a":pct>=25?"#b07040":AC.r;
  return <div style={{display:"flex",alignItems:"center",gap:8,marginBottom:10}}>
    <svg width="20" height="64" viewBox="0 0 80 160" fill="none">
      <defs><linearGradient id="bcl" x1="0" y1="0" x2="0" y2="1"><stop offset="0%" stopColor={c.t} stopOpacity=".88"/><stop offset="100%" stopColor={c.b} stopOpacity=".8"/></linearGradient><clipPath id="bcc"><path d="M18 40 Q14 44 12 52 L10 148 Q10 152 14 152 L66 152 Q70 152 70 148 L68 52 Q66 44 62 40 Z"/></clipPath></defs>
      <rect x="28" y="6" width="24" height="14" rx="3" fill={B.w} stroke={B.bor} strokeWidth="1"/>
      <path d="M30 20 L26 40 L54 40 L50 20 Z" fill={B.p} stroke={B.bor} strokeWidth="1"/>
      <path d="M18 40 Q14 44 12 52 L10 148 Q10 152 14 152 L66 152 Q70 152 70 148 L68 52 Q66 44 62 40 Z" fill={B.c} stroke={B.borD} strokeWidth="1.5"/>
      <g clipPath="url(#bcc)"><rect x="10" y={lY} width="60" height={lH+10} fill="url(#bcl)"/></g>
    </svg>
    <div><div style={{fontFamily:"'Playfair Display',serif",fontSize:15,color:col,fontWeight:600}}>{pct}%</div><div style={{fontFamily:"Manrope,sans-serif",fontSize:9,color:T.f}}>TELE</div></div>
  </div>;
};

const BottleDetail = ({pct=90}) => {
  const c=bCol(pct),lH=(pct/100)*108,lY=40+(108-lH);
  const col=pct>=80?AC.g:pct>=50?"#c0924a":pct>=25?"#b07040":AC.r;
  return <div style={{border:`1px solid ${B.bor}`,borderRadius:10,padding:"18px 22px",display:"flex",alignItems:"center",gap:22,marginBottom:28,background:B.p}}>
    <svg width="52" height="104" viewBox="0 0 80 160" fill="none" style={{flexShrink:0}}>
      <defs><linearGradient id="bdl" x1="0" y1="0" x2="0" y2="1"><stop offset="0%" stopColor={c.t} stopOpacity=".9"/><stop offset="100%" stopColor={c.b} stopOpacity=".8"/></linearGradient><clipPath id="bdc"><path d="M18 40 Q14 44 12 52 L10 148 Q10 152 14 152 L66 152 Q70 152 70 148 L68 52 Q66 44 62 40 Z"/></clipPath></defs>
      <rect x="28" y="6" width="24" height="14" rx="3" fill={B.w} stroke={B.borD} strokeWidth="1"/>
      <rect x="31" y="4" width="18" height="4" rx="2" fill={AC.g} opacity=".6"/>
      <path d="M30 20 L26 40 L54 40 L50 20 Z" fill={B.p} stroke={B.bor} strokeWidth="1"/>
      <path d="M18 40 Q14 44 12 52 L10 148 Q10 152 14 152 L66 152 Q70 152 70 148 L68 52 Q66 44 62 40 Z" fill={B.c} stroke={B.borD} strokeWidth="1.5"/>
      <g clipPath="url(#bdc)"><rect x="10" y={lY} width="60" height={lH+10} fill="url(#bdl)"/>{pct>3&&pct<98&&<ellipse cx="40" cy={lY} rx="28" ry="3" fill={c.t} opacity=".3"/>}</g>
      <text x="40" y="108" textAnchor="middle" fontFamily="Manrope,sans-serif" fontSize="12" fontWeight="700" fill={pct>50?"rgba(255,255,255,.8)":T.m}>{pct}%</text>
    </svg>
    <div>
      <div style={{fontFamily:"'Playfair Display',serif",fontSize:28,color:col,fontWeight:600,marginBottom:4}}>{pct}% tele</div>
      <div style={{width:160,height:2,background:B.bor,borderRadius:2,marginTop:12}}><div style={{height:"100%",width:`${pct}%`,background:`linear-gradient(90deg,${col}60,${col})`,borderRadius:2}}/></div>
    </div>
  </div>;
};

const BottleSlider = ({value=90,onChange}) => {
  const pct=Math.min(100,Math.max(1,value)),c=bCol(pct),lH=(pct/100)*108,lY=40+(108-lH);
  return <div style={{border:`1px solid ${B.bor}`,borderRadius:10,padding:"24px 28px",display:"flex",gap:32,alignItems:"center",background:B.p}}>
    <svg width="80" height="160" viewBox="0 0 80 160" fill="none" style={{flexShrink:0}}>
      <defs><linearGradient id="bsl" x1="0" y1="0" x2="0" y2="1"><stop offset="0%" stopColor={c.t} stopOpacity=".9"/><stop offset="60%" stopColor={c.m} stopOpacity=".85"/><stop offset="100%" stopColor={c.b} stopOpacity=".9"/></linearGradient><clipPath id="bsc"><path d="M18 40 Q14 44 12 52 L10 148 Q10 152 14 152 L66 152 Q70 152 70 148 L68 52 Q66 44 62 40 Z"/></clipPath></defs>
      <rect x="28" y="6" width="24" height="14" rx="3" fill={B.w} stroke={B.borD} strokeWidth="1"/>
      <rect x="31" y="4" width="18" height="4" rx="2" fill={AC.g} opacity=".6"/>
      <path d="M30 20 L26 40 L54 40 L50 20 Z" fill={B.p} stroke={B.bor} strokeWidth="1"/>
      <path d="M18 40 Q14 44 12 52 L10 148 Q10 152 14 152 L66 152 Q70 152 70 148 L68 52 Q66 44 62 40 Z" fill={B.c} stroke={B.borD} strokeWidth="1.5"/>
      <g clipPath="url(#bsc)"><rect x="10" y={lY} width="60" height={lH+10} fill="url(#bsl)"/>{pct>3&&pct<98&&<ellipse cx="40" cy={lY} rx="28" ry="3" fill={c.t} opacity=".35"/>}</g>
      <text x="40" y="108" textAnchor="middle" fontFamily="Manrope,sans-serif" fontSize="12" fontWeight="700" fill={pct>50?"rgba(255,255,255,.85)":T.m}>{pct}%</text>
    </svg>
    <div style={{flex:1}}>
      <div style={{fontFamily:"'Playfair Display',serif",fontSize:22,color:T.h,marginBottom:3}}>{bLbl(pct)}</div>
      <div style={{fontFamily:"Manrope,sans-serif",fontSize:10,color:T.f,letterSpacing:2,marginBottom:24,textTransform:"uppercase"}}>Töltöttségi szint</div>
      <input type="range" min={1} max={100} value={pct} onChange={e=>onChange(Number(e.target.value))}
        style={{width:"100%",height:2,appearance:"none",WebkitAppearance:"none",background:`linear-gradient(90deg,${AC.g} ${pct}%,${B.bor} ${pct}%)`,borderRadius:2,outline:"none",cursor:"pointer"}}/>
      <div style={{display:"flex",gap:6,marginTop:18,flexWrap:"wrap"}}>
        {[{l:"Bontatlan",v:100},{l:"~¾",v:75},{l:"~½",v:50},{l:"~¼",v:25}].map(x=>
          <button key={x.v} onClick={()=>onChange(x.v)} style={{background:pct===x.v?AC.gP:"transparent",border:`1px solid ${pct===x.v?AC.g:B.bor}`,color:pct===x.v?AC.g:T.m,padding:"5px 12px",borderRadius:4,cursor:"pointer",fontFamily:"Manrope,sans-serif",fontSize:10}}>{x.l}</button>
        )}
      </div>
    </div>
  </div>;
};

// ─── NAV ─────────────────────────────────────────────────────────────────────
function Nav({profile,page,go,openLogin,unread}) {
  const [sc,setSc] = useState(false);
  useEffect(()=>{ const fn=()=>setSc(window.scrollY>20); window.addEventListener("scroll",fn); return ()=>window.removeEventListener("scroll",fn); },[]);
  const adm = isAdmin(profile);
  const btn = (p,l) => <button onClick={()=>go(p)} style={{background:"transparent",border:"none",borderBottom:page===p?`2px solid ${AC.g}`:"2px solid transparent",color:page===p?T.h:T.m,padding:"8px 14px",cursor:"pointer",fontFamily:"Manrope,sans-serif",fontSize:12,fontWeight:page===p?700:500}}>{l}</button>;
  return <nav style={{position:"fixed",top:0,left:0,right:0,zIndex:100,height:62,background:sc?"rgba(250,248,244,.96)":B.c,backdropFilter:"blur(16px)",borderBottom:`1px solid ${sc?B.bor:"transparent"}`,display:"flex",alignItems:"center",justifyContent:"space-between",padding:"0 40px",transition:"all .3s"}}>
    <div onClick={()=>go("home")} style={{cursor:"pointer",display:"flex",alignItems:"center",gap:10}}>
      <span style={{fontFamily:"'Playfair Display',serif",fontSize:22,fontWeight:700,color:T.h,letterSpacing:3}}>SCENTRADE</span>
      <span style={{width:1,height:16,background:B.borD,margin:"0 4px"}}/>
      <span style={{fontFamily:"Manrope,sans-serif",fontSize:10,color:T.f,letterSpacing:3}}>HU</span>
    </div>
    <div style={{display:"flex",gap:2,alignItems:"center"}}>
      {btn("home","Főoldal")}{btn("market","Piac")}
      {adm&&<button onClick={()=>go("admin")} style={{background:page==="admin"?AC.admP:"transparent",border:`1px solid ${page==="admin"?AC.admM:"transparent"}`,color:page==="admin"?AC.adm:T.m,padding:"7px 13px",borderRadius:6,cursor:"pointer",fontFamily:"Manrope,sans-serif",fontSize:12,fontWeight:600,marginLeft:4}}>⚡ Admin</button>}
      <button onClick={()=>go("sell")} style={{background:AC.ink,border:"none",color:B.c,padding:"8px 18px",borderRadius:6,cursor:"pointer",fontFamily:"Manrope,sans-serif",fontSize:12,fontWeight:700,marginLeft:8}}>+ Hirdetés</button>
      {profile ? <>
        <button onClick={()=>go("messages")} style={{background:"transparent",border:"none",cursor:"pointer",color:T.m,fontSize:18,position:"relative",padding:"4px 10px",marginLeft:4}}>
          ✉{unread>0&&<span style={{position:"absolute",top:1,right:3,background:AC.g,borderRadius:10,minWidth:15,height:15,display:"flex",alignItems:"center",justifyContent:"center",fontFamily:"Manrope,sans-serif",fontSize:8,color:"#fff",fontWeight:700,padding:"0 4px"}}>{unread>9?"9+":unread}</span>}
        </button>
        <button onClick={()=>go("profile_own")} style={{background:"transparent",border:`1px solid ${adm?AC.admM:B.borD}`,borderRadius:24,padding:"4px 12px 4px 5px",cursor:"pointer",display:"flex",alignItems:"center",gap:8,marginLeft:4}}>
          <Ava u={profile} size={28}/>
          <span style={{fontFamily:"Manrope,sans-serif",fontSize:12,fontWeight:600,color:adm?AC.adm:T.b}}>{profile.name?.split(" ")[0]}</span>
        </button>
      </> : <button onClick={openLogin} style={{background:"transparent",border:`1px solid ${B.borD}`,color:T.b,padding:"8px 18px",borderRadius:6,cursor:"pointer",fontFamily:"Manrope,sans-serif",fontSize:12,fontWeight:600,marginLeft:8}}>Belépés</button>}
    </div>
  </nav>;
}

// ─── CARD ────────────────────────────────────────────────────────────────────
function Card({l,u,onClick,adminMode,onAdminDelete,onAdminPin}) {
  const [hov,setHov] = useState(false);
  const isD=l.listing_type==="decant",isBuy=l.type==="buy",isSold=l.status==="sold",isPend=l.status==="pending";
  return <div onClick={onClick} onMouseEnter={()=>setHov(true)} onMouseLeave={()=>setHov(false)}
    style={{background:hov?B.w:B.p,border:`1px solid ${l.pinned?AC.gM:hov?B.borD:B.bor}`,borderRadius:10,padding:"26px 22px 20px",cursor:onClick?"pointer":"default",transition:"all .22s",transform:hov?"translateY(-2px)":"none",boxShadow:hov?"0 8px 32px rgba(0,0,0,.07)":l.pinned?`0 0 0 2px ${AC.gM}`:"none",opacity:isSold?.55:1,position:"relative",overflow:"hidden"}}>
    {l.pinned&&<div style={{position:"absolute",top:0,left:0,right:0,height:3,background:`linear-gradient(90deg,${AC.g},${AC.gW})`}}/>}
    {(isSold||isPend)&&<div style={{position:"absolute",top:l.pinned?3:0,left:0,right:0,padding:"4px 0",textAlign:"center",background:isSold?"#f2faf6":"#fefaf0",borderBottom:`1px solid ${isSold?AC.gr:AC.g}28`,fontFamily:"Manrope,sans-serif",fontSize:9,letterSpacing:1.5,color:isSold?AC.gr:AC.g,fontWeight:700}}>{isSold?"✓ ELADVA":"⏳ FÜGGŐBEN"}</div>}
    <div style={{display:"flex",gap:5,marginBottom:14,flexWrap:"wrap",marginTop:(isSold||isPend||l.pinned)?24:0}}>
      {l.pinned&&<Pill text="📌 Kiemelt" bg={AC.gP} col={AC.g}/>}
      <Pill text={isBuy?"Keresett":"Eladó"} bg={isBuy?"#eef4fb":"#faf8f0"} col={isBuy?"#4a78b0":AC.g}/>
      <Pill text={isD?"Dekant":"Teljes"} bg={isD?"#fff5ee":"#f2faf6"} col={isD?"#c0724a":AC.gr}/>
      {l.condition&&<Pill text={COND[l.condition]} bg={COND_C[l.condition]+"12"} col={COND_C[l.condition]}/>}
      {l.swap_ok&&<Pill text="Csere OK" bg="#f5f0fb" col="#7a5ab0"/>}
    </div>
    <div style={{fontSize:40,marginBottom:12}}>{l.icon||"🫙"}</div>
    <div style={{fontFamily:"Manrope,sans-serif",fontSize:10,color:T.f,letterSpacing:2.5,marginBottom:3,fontWeight:600}}>{(l.brand||"").toUpperCase()}</div>
    <div style={{fontFamily:"'Playfair Display',serif",fontSize:20,color:T.h,lineHeight:1.2,marginBottom:6}}>{l.name}</div>
    <div style={{fontSize:12,color:T.f,marginBottom:14,fontFamily:"Manrope,sans-serif"}}>{isD?`${l.decant_ml}ml dekant`:`${l.size||""}${l.fill?` · ${l.fill}% tele`:""}`}</div>
    {!isD&&l.fill&&<BottleCompact pct={l.fill}/>}
    <div style={{fontFamily:"'Playfair Display',serif",fontSize:22,color:T.h,marginBottom:16,marginTop:"auto",fontWeight:600}}>
      {(l.price||0).toLocaleString("hu-HU")} Ft{isD&&<span style={{fontSize:12,color:T.f,fontFamily:"Manrope,sans-serif",marginLeft:6}}>/ {l.decant_ml}ml</span>}
    </div>
    <div style={{display:"flex",alignItems:"center",justifyContent:"space-between",paddingTop:14,borderTop:`1px solid ${B.bor}`}}>
      <div style={{display:"flex",alignItems:"center",gap:8}}>
        <Ava u={u} size={24}/>
        <span style={{fontSize:12,color:T.m,fontFamily:"Manrope,sans-serif",fontWeight:500}}>{u?.name?.split(" ")[0]||"?"}</span>
        {isAdmin(u)?<RankBadge adm/>:<RankBadge sales={u?.sales||0}/>}
      </div>
      <span style={{fontSize:11,color:T.f,fontFamily:"Manrope,sans-serif"}}>👁 {l.views||0}</span>
    </div>
    {adminMode&&<div onClick={e=>e.stopPropagation()} style={{display:"flex",gap:6,marginTop:14,paddingTop:12,borderTop:`1px solid ${B.bor}`}}>
      <button onClick={()=>onAdminPin?.(l)} style={{flex:1,background:l.pinned?AC.gP:"transparent",border:`1px solid ${l.pinned?AC.g:B.borD}`,color:l.pinned?AC.g:T.m,padding:"6px",borderRadius:5,cursor:"pointer",fontFamily:"Manrope,sans-serif",fontSize:10,fontWeight:700}}>{l.pinned?"📌 Kitűzve":"📌 Kiemel"}</button>
      <button onClick={()=>onAdminDelete?.(l)} style={{flex:1,background:AC.rP,border:`1px solid ${AC.r}30`,color:AC.r,padding:"6px",borderRadius:5,cursor:"pointer",fontFamily:"Manrope,sans-serif",fontSize:10,fontWeight:700}}>🗑 Törlés</button>
    </div>}
  </div>;
}

// ─── HOME ────────────────────────────────────────────────────────────────────
function Home({go,listings,profiles}) {
  const pinned  = listings.filter(l=>l.pinned&&l.status!=="sold");
  const featured = listings.filter(l=>l.type==="sell"&&l.status!=="sold"&&!l.pinned).slice(0,4);
  const decants = listings.filter(l=>l.listing_type==="decant"&&l.status!=="sold").slice(0,3);
  return <div style={{paddingTop:62}}>
    <section style={{minHeight:"80vh",display:"flex",flexDirection:"column",alignItems:"center",justifyContent:"center",textAlign:"center",position:"relative",overflow:"hidden",padding:"100px 24px 80px",background:B.c}}>
      <div style={{position:"absolute",inset:0,backgroundImage:`repeating-linear-gradient(0deg,transparent,transparent 79px,${B.bor}55 79px,${B.bor}55 80px)`,pointerEvents:"none",opacity:.5}}/>
      <p style={{fontFamily:"Manrope,sans-serif",fontSize:10,color:AC.g,letterSpacing:5,marginBottom:28,fontWeight:700,textTransform:"uppercase",position:"relative"}}>Magyar Parfüm Közösség</p>
      <h1 style={{fontFamily:"'Playfair Display',serif",fontSize:"clamp(48px,8vw,96px)",fontWeight:400,color:T.h,lineHeight:1.0,marginBottom:20,letterSpacing:-1,position:"relative",maxWidth:820}}>
        Adj. Végy.<br/><em style={{color:AC.g}}>Szaglászkodj.</em>
      </h1>
      <div style={{width:60,height:1,background:AC.g,margin:"0 auto 28px",position:"relative"}}/>
      <p style={{color:T.m,fontSize:16,maxWidth:480,lineHeight:1.9,marginBottom:52,fontFamily:"Manrope,sans-serif",position:"relative"}}>Niche és designer parfümök, <strong style={{color:T.b,fontWeight:600}}>dekantok</strong> és teljes üvegek biztonságos adásvételéhez.</p>
      <div style={{display:"flex",gap:12,flexWrap:"wrap",justifyContent:"center",position:"relative"}}>
        <button onClick={()=>go("market")} style={{background:AC.ink,border:"none",color:B.c,padding:"16px 44px",borderRadius:6,cursor:"pointer",fontFamily:"Manrope,sans-serif",fontSize:14,fontWeight:700,boxShadow:"0 4px 20px rgba(0,0,0,.12)"}}>Böngéssz a piacon →</button>
        <button onClick={()=>go("sell")} style={{background:"transparent",border:`1px solid ${B.borD}`,color:T.b,padding:"16px 44px",borderRadius:6,cursor:"pointer",fontFamily:"Manrope,sans-serif",fontSize:14,fontWeight:600}}>Hirdetést feladok</button>
      </div>
    </section>
    {pinned.length>0&&<section style={{padding:"60px 48px 0",maxWidth:1200,margin:"0 auto"}}>
      <p style={{fontFamily:"Manrope,sans-serif",fontSize:10,color:AC.g,letterSpacing:3,fontWeight:700,marginBottom:20}}>📌 KIEMELT HIRDETÉSEK</p>
      <div style={{display:"grid",gridTemplateColumns:"repeat(auto-fill,minmax(272px,1fr))",gap:18}}>
        {pinned.map(l=><Card key={l.id} l={l} u={profiles[l.user_id]}/>)}
      </div>
    </section>}
    {featured.length>0&&<section style={{padding:"60px 48px",maxWidth:1200,margin:"0 auto"}}>
      <div style={{display:"flex",justifyContent:"space-between",alignItems:"baseline",marginBottom:36}}>
        <h2 style={{fontFamily:"'Playfair Display',serif",fontSize:36,color:T.h,fontWeight:400}}>Friss eladások</h2>
        <button onClick={()=>go("market")} style={{background:"none",border:`1px solid ${B.borD}`,color:T.m,cursor:"pointer",fontFamily:"Manrope,sans-serif",fontSize:11,fontWeight:600,padding:"7px 16px",borderRadius:4}}>MIND →</button>
      </div>
      <div style={{display:"grid",gridTemplateColumns:"repeat(auto-fill,minmax(272px,1fr))",gap:18}}>
        {featured.map(l=><Card key={l.id} l={l} u={profiles[l.user_id]}/>)}
      </div>
    </section>}
    {decants.length>0&&<section style={{padding:"0 48px 80px",maxWidth:1200,margin:"0 auto"}}>
      <div style={{background:B.p,border:`1px solid ${B.bor}`,borderRadius:12,padding:"44px 40px"}}>
        <h2 style={{fontFamily:"'Playfair Display',serif",fontSize:32,color:T.h,fontWeight:400,marginBottom:30}}>Dekantok</h2>
        <div style={{display:"grid",gridTemplateColumns:"repeat(auto-fill,minmax(258px,1fr))",gap:16}}>
          {decants.map(l=><Card key={l.id} l={l} u={profiles[l.user_id]}/>)}
        </div>
      </div>
    </section>}
    <footer style={{borderTop:`1px solid ${B.bor}`,padding:"28px 48px",display:"flex",justifyContent:"space-between",alignItems:"center"}}>
      <span style={{fontFamily:"'Playfair Display',serif",fontSize:16,color:T.h,fontWeight:600,letterSpacing:2}}>SCENTRADE</span>
      <p style={{fontFamily:"Manrope,sans-serif",fontSize:11,color:T.f}}>© 2025 · Parfüm közösségi platform</p>
    </footer>
  </div>;
}

// ─── MARKET ──────────────────────────────────────────────────────────────────
function Market({listings,profiles,go,setSelId}) {
  const [q,setQ]=useState(""); const [cat,setCat]=useState("Összes"); const [typeF,setTypeF]=useState("all");
  const [listF,setListF]=useState("all"); const [sort,setSort]=useState("newest"); const [hideS,setHideS]=useState(true);
  const filtered = listings.filter(l=>{
    if(hideS&&l.status==="sold") return false;
    const sq=q.toLowerCase();
    return(!sq||(l.brand||"").toLowerCase().includes(sq)||(l.name||"").toLowerCase().includes(sq))&&
      (cat==="Összes"||l.category===cat)&&(typeF==="all"||l.type===typeF)&&(listF==="all"||l.listing_type===listF);
  }).sort((a,b)=>{
    if(a.pinned&&!b.pinned) return -1; if(!a.pinned&&b.pinned) return 1;
    return sort==="newest"?new Date(b.created_at)-new Date(a.created_at):sort==="price_asc"?a.price-b.price:b.price-a.price;
  });
  const inp={background:B.c,border:`1px solid ${B.bor}`,color:T.b,padding:"9px 14px",borderRadius:6,fontFamily:"Manrope,sans-serif",fontSize:13,outline:"none",fontWeight:500};
  return <div style={{paddingTop:62,minHeight:"100vh",background:B.c}}>
    <div style={{background:B.p,borderBottom:`1px solid ${B.bor}`,padding:"32px 48px"}}>
      <div style={{maxWidth:1200,margin:"0 auto"}}>
        <h1 style={{fontFamily:"'Playfair Display',serif",fontSize:44,color:T.h,fontWeight:400,marginBottom:28}}>Piac</h1>
        <div style={{display:"flex",gap:8,flexWrap:"wrap",alignItems:"center"}}>
          <input value={q} onChange={e=>setQ(e.target.value)} placeholder="Keresés márka, név..." style={{...inp,width:220}}/>
          <select value={typeF} onChange={e=>setTypeF(e.target.value)} style={{...inp,cursor:"pointer"}}>
            <option value="all">Eladó + Keresett</option><option value="sell">Csak eladó</option><option value="buy">Csak keresett</option>
          </select>
          <select value={listF} onChange={e=>setListF(e.target.value)} style={{...inp,cursor:"pointer"}}>
            <option value="all">Teljes + Dekant</option><option value="full">Csak teljes</option><option value="decant">Csak dekant</option>
          </select>
          <select value={sort} onChange={e=>setSort(e.target.value)} style={{...inp,cursor:"pointer"}}>
            <option value="newest">Legújabb</option><option value="price_asc">Legolcsóbb</option><option value="price_desc">Legdrágább</option>
          </select>
          <button onClick={()=>setHideS(v=>!v)} style={{background:!hideS?AC.gP:"transparent",border:`1px solid ${!hideS?AC.g:B.borD}`,color:!hideS?AC.g:T.m,padding:"9px 14px",borderRadius:6,cursor:"pointer",fontFamily:"Manrope,sans-serif",fontSize:12,fontWeight:600}}>{hideS?"Eladottak mutatása":"Elrejtés"}</button>
        </div>
        <div style={{display:"flex",gap:5,marginTop:16,flexWrap:"wrap"}}>
          {CATS.map(c=><button key={c} onClick={()=>setCat(c)} style={{background:cat===c?AC.ink:"transparent",border:`1px solid ${cat===c?AC.ink:B.bor}`,color:cat===c?B.c:T.m,padding:"5px 14px",borderRadius:4,cursor:"pointer",fontFamily:"Manrope,sans-serif",fontSize:10,letterSpacing:1,textTransform:"uppercase",fontWeight:cat===c?700:500,transition:"all .15s"}}>{c}</button>)}
        </div>
      </div>
    </div>
    <div style={{padding:"36px 48px",maxWidth:1200,margin:"0 auto"}}>
      <p style={{fontFamily:"Manrope,sans-serif",fontSize:11,color:T.f,marginBottom:24,fontWeight:600}}>{filtered.length} HIRDETÉS</p>
      <div style={{display:"grid",gridTemplateColumns:"repeat(auto-fill,minmax(272px,1fr))",gap:18}}>
        {filtered.map(l=><Card key={l.id} l={l} u={profiles[l.user_id]} onClick={()=>{setSelId(l.id);go("detail");}}/>)}
      </div>
      {!filtered.length&&<p style={{textAlign:"center",padding:"80px 0",color:T.f,fontFamily:"Manrope,sans-serif",fontSize:13}}>{listings.length?"Nincs találat.":"Még nincsenek hirdetések."}</p>}
    </div>
  </div>;
}

// ─── DETAIL ──────────────────────────────────────────────────────────────────
function Detail({l,u,curProfile,go,setProfileId,setActiveChatWith,onUpd,showToast}) {
  const [status,setStatus]=useState(l.status||"active");
  const [views,setViews]=useState(l.views||0);
  const [faved,setFaved]=useState(false);
  const [showOffer,setShowOffer]=useState(false);
  const [offer,setOffer]=useState("");
  const [buyerId,setBuyerId]=useState(l.buyer_id||null);
  const [soldModal,setSoldModal]=useState(false);
  const [partners,setPartners]=useState([]);
  const [selBuyer,setSelBuyer]=useState(null);
  const [buyerQ,setBuyerQ]=useState("");
  const [buyerRes,setBuyerRes]=useState([]);
  const [loadP,setLoadP]=useState(false);
  const [review,setReview]=useState(null);
  const [rvRating,setRvRating]=useState(5);
  const rvRef=useRef(null);
  const isOwn=curProfile?.id===l.user_id;
  const isBuyer=curProfile?.id===buyerId&&status==="sold";
  const isD=l.listing_type==="decant";

  useEffect(()=>{
    if(!l.id||isOwn) return;
    const nv=(l.views||0)+1;
    sb.from("listings").update({views:nv}).eq("id",l.id);
    setViews(nv); onUpd?.(l.id,{views:nv});
  },[l.id]);

  async function openSoldModal(){
    setSoldModal(true);setLoadP(true);setBuyerQ("");setBuyerRes([]);setSelBuyer(null);
    const {data}=await sb.from("messages").select("from_user,to_user").or(`from_user.eq.${curProfile.id},to_user.eq.${curProfile.id}`).order("created_at",{ascending:false});
    if(data){
      const seen=new Set(),ids=[];
      data.forEach(m=>{const p=m.from_user===curProfile.id?m.to_user:m.from_user;if(!seen.has(p)){seen.add(p);ids.push(p);}});
      if(ids.length){const {data:pd}=await sb.from("profiles").select("id,name,sales").in("id",ids);setPartners(pd||[]);}
    }
    setLoadP(false);
  }
  async function searchBuyer(q){
    setBuyerQ(q);
    if(q.trim().length<2){setBuyerRes([]);return;}
    const {data}=await sb.from("profiles").select("id,name,sales").ilike("name",`%${q}%`).neq("id",curProfile.id).limit(6);
    setBuyerRes(data||[]);
  }
  async function confirmSold(){
    if(!selBuyer) return;
    await sb.from("listings").update({status:"sold",buyer_id:selBuyer.id}).eq("id",l.id);
    await sb.from("profiles").update({sales:(u?.sales||0)+1}).eq("id",curProfile.id);
    setStatus("sold");setBuyerId(selBuyer.id);onUpd?.(l.id,{status:"sold",buyer_id:selBuyer.id});
    setSoldModal(false);
    setReview({side:"buyer",target:selBuyer});
  }
  async function submitReview(){
    if(!review||!curProfile) return;
    const text=rvRef.current?.value?.trim()||"";
    await sb.from("reviews").insert({from_user:curProfile.id,to_user:review.target.id,rating:rvRating,text,listing_id:l.id,transaction_type:"verified"});
    const {data:revs}=await sb.from("reviews").select("rating").eq("to_user",review.target.id);
    if(revs?.length){
      const avg=(revs.reduce((s,r)=>s+r.rating,0)/revs.length).toFixed(2);
      await sb.from("profiles").update({rating:parseFloat(avg),rating_count:revs.length}).eq("id",review.target.id);
    }
    setReview(null);showToast?.("Értékelés elküldve!","success");
  }
  async function changeStatus(s){
    if(s==="sold"){openSoldModal();return;}
    await sb.from("listings").update({status:s}).eq("id",l.id);
    setStatus(s);onUpd?.(l.id,{status:s});
  }
  const sCol=status==="sold"?AC.gr:status==="pending"?AC.g:T.m;
  const sep = <div style={{display:"flex",alignItems:"center",gap:12,margin:"16px 0"}}><div style={{flex:1,height:1,background:B.bor}}/><span style={{fontFamily:"Manrope,sans-serif",fontSize:10,color:T.f,letterSpacing:2}}>VAGY</span><div style={{flex:1,height:1,background:B.bor}}/></div>;

  return <div style={{paddingTop:62,maxWidth:980,margin:"0 auto",padding:"80px 40px",background:B.c}}>
    <button onClick={()=>go("market")} style={{background:"none",border:"none",color:T.f,cursor:"pointer",fontFamily:"Manrope,sans-serif",fontSize:11,letterSpacing:1,marginBottom:36,fontWeight:600}}>← VISSZA A PIACRA</button>
    <div style={{display:"grid",gridTemplateColumns:"1fr 300px",gap:52}}>
      <div>
        <div style={{display:"flex",gap:6,flexWrap:"wrap",marginBottom:24}}>
          {l.pinned&&<Pill text="📌 Kiemelt" bg={AC.gP} col={AC.g}/>}
          <Pill text={l.type==="buy"?"Keresett":"Eladó"} bg={l.type==="buy"?"#eef4fb":"#faf8f0"} col={l.type==="buy"?"#4a78b0":AC.g}/>
          <Pill text={isD?"Dekant":"Teljes üveg"} bg={isD?"#fff5ee":"#f2faf6"} col={isD?"#c0724a":AC.gr}/>
          {l.condition&&<Pill text={COND[l.condition]} bg={COND_C[l.condition]+"12"} col={COND_C[l.condition]}/>}
          {status!=="active"&&<Pill text={status==="sold"?"Eladva":"Függőben"} bg={sCol+"12"} col={sCol}/>}
          {l.swap_ok&&<Pill text="Csere OK" bg="#f5f0fb" col="#7a5ab0"/>}
        </div>
        <div style={{fontSize:72,marginBottom:20}}>{l.icon||"🫙"}</div>
        <p style={{fontFamily:"Manrope,sans-serif",fontSize:10,color:T.f,letterSpacing:3,marginBottom:5,fontWeight:700}}>{(l.brand||"").toUpperCase()}</p>
        <h1 style={{fontFamily:"'Playfair Display',serif",fontSize:52,color:T.h,fontWeight:400,lineHeight:1.05,marginBottom:8}}>{l.name}</h1>
        <p style={{color:T.f,marginBottom:28,fontSize:14,fontFamily:"Manrope,sans-serif"}}>{isD?`${l.decant_ml}ml spray dekant`:l.size||""}</p>
        {!isD&&l.fill&&<BottleDetail pct={l.fill}/>}
        <div style={{fontFamily:"'Playfair Display',serif",fontSize:48,color:T.h,marginBottom:36,fontWeight:600}}>{(l.price||0).toLocaleString("hu-HU")} Ft</div>
        <div style={{border:`1px solid ${B.bor}`,borderRadius:8,padding:"22px 26px",marginBottom:24,background:B.p}}>
          <p style={{fontFamily:"Manrope,sans-serif",fontSize:10,color:T.f,letterSpacing:2,marginBottom:14,fontWeight:700}}>LEÍRÁS</p>
          <p style={{color:T.b,lineHeight:1.9,fontSize:15,fontFamily:"Manrope,sans-serif"}}>{l.description}</p>
        </div>
        {l.tags?.length>0&&<div style={{display:"flex",flexWrap:"wrap",gap:6,marginBottom:24}}>{l.tags.map(t=><span key={t} style={{background:B.p,border:`1px solid ${B.bor}`,color:T.m,padding:"4px 12px",borderRadius:3,fontSize:11,fontFamily:"Manrope,sans-serif",fontWeight:500}}>#{t}</span>)}</div>}
        {isOwn&&<div style={{border:`1px solid ${B.bor}`,borderRadius:8,padding:"20px 24px",background:B.p}}>
          <p style={{fontFamily:"Manrope,sans-serif",fontSize:10,color:T.f,letterSpacing:2,marginBottom:16,fontWeight:700}}>STÁTUSZ</p>
          <div style={{display:"flex",gap:8,flexWrap:"wrap"}}>
            {[["active","Aktív",T.m],["pending","Függőben",AC.g],["sold","Eladva",AC.gr]].map(([s,label,c])=>
              <button key={s} onClick={()=>changeStatus(s)} style={{background:status===s?c+"12":"transparent",border:`1px solid ${status===s?c+"44":B.bor}`,color:status===s?c:T.f,padding:"8px 16px",borderRadius:5,cursor:"pointer",fontFamily:"Manrope,sans-serif",fontSize:11,fontWeight:status===s?700:500,transition:"all .15s"}}>{label}</button>
            )}
          </div>
        </div>}
      </div>
      <div style={{display:"flex",flexDirection:"column",gap:12}}>
        <div style={{border:`1px solid ${B.bor}`,borderRadius:8,padding:"22px 20px",background:B.p}}>
          <p style={{fontFamily:"Manrope,sans-serif",fontSize:10,color:T.f,letterSpacing:2,marginBottom:18,fontWeight:700}}>ELADÓ</p>
          <div style={{display:"flex",gap:12,alignItems:"center",marginBottom:16,cursor:"pointer"}} onClick={()=>{setProfileId(u?.id);go("profile");}}>
            <Ava u={u} size={50}/>
            <div>
              <div style={{fontFamily:"'Playfair Display',serif",fontSize:20,color:T.h}}>{u?.name}{u?.verified&&<span style={{color:AC.g,fontSize:13}}> ✓</span>}</div>
              <div style={{fontSize:12,color:T.f,marginTop:2,fontFamily:"Manrope,sans-serif"}}>📍 {u?.location}</div>
            </div>
          </div>
          {isAdmin(u)?<RankBadge adm lg/>:<RankBadge sales={u?.sales||0} lg/>}
          <div style={{display:"flex",alignItems:"center",gap:8,marginTop:10}}>
            <Stars v={u?.rating||0} size={14}/>
            <span style={{fontSize:12,color:T.m,fontFamily:"Manrope,sans-serif"}}>{(u?.rating||0).toFixed(1)} · {u?.rating_count||0} értékelés</span>
          </div>
          <div style={{marginTop:12,paddingTop:12,borderTop:`1px solid ${B.bor}`,display:"flex",alignItems:"center",gap:6}}>
            <span>👁</span><span style={{fontFamily:"Manrope,sans-serif",fontSize:12,color:T.f}}>{views} megtekintés</span>
          </div>
        </div>
        {!isOwn&&status!=="sold"&&<>
          <button onClick={()=>{if(!curProfile){go("login");return;}setActiveChatWith(u.id);go("messages");}} style={{background:AC.ink,border:"none",color:B.c,padding:"14px",borderRadius:7,cursor:"pointer",fontFamily:"Manrope,sans-serif",fontSize:14,fontWeight:700}}>✉ Üzenet küldése</button>
          <button onClick={()=>setFaved(!faved)} style={{background:"transparent",border:`1px solid ${faved?AC.g:B.borD}`,color:faved?AC.g:T.m,padding:"12px",borderRadius:7,cursor:"pointer",fontFamily:"Manrope,sans-serif",fontSize:12,fontWeight:600}}>{faved?"♥ Kedvelve":"♡ Kedvelés"}</button>
          <button onClick={()=>setShowOffer(!showOffer)} style={{background:"transparent",border:`1px solid ${B.bor}`,color:T.m,padding:"12px",borderRadius:7,cursor:"pointer",fontFamily:"Manrope,sans-serif",fontSize:12,fontWeight:600}}>Ajánlat küldése</button>
          {showOffer&&<div style={{border:`1px solid ${B.bor}`,borderRadius:7,padding:14,background:B.p}}>
            <input value={offer} onChange={e=>setOffer(e.target.value)} placeholder="Ajánlott ár (Ft)" type="number"
              style={{background:B.c,border:`1px solid ${B.bor}`,color:T.b,padding:"10px 13px",borderRadius:5,width:"100%",fontFamily:"Manrope,sans-serif",fontSize:14,marginBottom:8,boxSizing:"border-box",outline:"none"}}/>
            <button onClick={()=>{if(!curProfile){go("login");return;}setActiveChatWith(u.id);go("messages");}} style={{background:AC.gP,border:`1px solid ${AC.gM}`,color:AC.g,padding:"9px",width:"100%",borderRadius:5,cursor:"pointer",fontFamily:"Manrope,sans-serif",fontSize:11,fontWeight:700}}>Ajánlat üzenetben →</button>
          </div>}
        </>}
        {isBuyer&&<button onClick={()=>setReview({side:"seller",target:u})} style={{background:`linear-gradient(135deg,${AC.g},#8a6a20)`,border:"none",color:"#fff",padding:"14px",borderRadius:7,cursor:"pointer",fontFamily:"Manrope,sans-serif",fontSize:13,fontWeight:700}}>⭐ Értékelem az eladót</button>}
        {status==="sold"&&!isBuyer&&<div style={{background:AC.grP,border:`1px solid ${AC.gr}30`,borderRadius:7,padding:"16px",textAlign:"center"}}><p style={{fontFamily:"Manrope,sans-serif",fontSize:12,color:AC.gr,letterSpacing:1,fontWeight:700}}>✓ ELADVA</p></div>}
        <div style={{border:`1px solid ${B.bor}`,borderRadius:7,padding:"14px 18px",background:B.p}}>
          <p style={{fontFamily:"Manrope,sans-serif",fontSize:9,color:T.f,letterSpacing:1.5,marginBottom:10,fontWeight:700}}>BIZTONSÁGOS VÁSÁRLÁS</p>
          {["Valódi értékelések","PM alapú egyeztetés","Hitelesített jelvény","Átverés bejelentés"].map(txt=><div key={txt} style={{display:"flex",gap:10,fontSize:12,color:T.m,marginBottom:6,fontFamily:"Manrope,sans-serif"}}><span style={{color:AC.g}}>✓</span>{txt}</div>)}
        </div>
      </div>
    </div>

    {soldModal&&<Modal onClose={()=>setSoldModal(false)}>
      <h2 style={{fontFamily:"'Playfair Display',serif",fontSize:26,color:T.h,fontWeight:400,marginBottom:8}}>Kinek adtad el?</h2>
      <p style={{fontFamily:"Manrope,sans-serif",fontSize:12,color:T.m,marginBottom:20,lineHeight:1.7}}>Keresd meg névvel, vagy válaszd az üzenetpartnereid közül.</p>
      <input value={buyerQ} onChange={e=>searchBuyer(e.target.value)} placeholder="Keresés névvel..." autoComplete="off"
        style={{width:"100%",background:B.p,border:`1px solid ${B.bor}`,color:T.b,padding:"12px 15px",borderRadius:7,fontFamily:"Manrope,sans-serif",fontSize:14,outline:"none",boxSizing:"border-box",marginBottom:8}}/>
      {buyerRes.length>0&&<div style={{display:"flex",flexDirection:"column",gap:6,marginBottom:12}}>
        {buyerRes.map(p=><div key={p.id} onClick={()=>{setSelBuyer(p);setBuyerQ(p.name);setBuyerRes([]);}}
          style={{display:"flex",alignItems:"center",gap:12,padding:"10px 14px",borderRadius:7,cursor:"pointer",background:selBuyer?.id===p.id?AC.gP:B.p,border:`1px solid ${selBuyer?.id===p.id?AC.g:B.bor}`}}>
          <Ava u={p} size={32}/><span style={{fontFamily:"'Playfair Display',serif",fontSize:16,color:T.h,flex:1}}>{p.name}</span>
          {selBuyer?.id===p.id&&<span style={{color:AC.g}}>✓</span>}
        </div>)}
      </div>}
      {sep}
      <p style={{fontFamily:"Manrope,sans-serif",fontSize:10,color:T.f,letterSpacing:2,marginBottom:10,fontWeight:700}}>ÜZENETPARTNEREID</p>
      {loadP?<p style={{color:T.f,fontFamily:"Manrope,sans-serif",fontSize:12,padding:"10px 0"}}>Betöltés...</p>:(
        <div style={{display:"flex",flexDirection:"column",gap:6,marginBottom:20,maxHeight:200,overflowY:"auto"}}>
          {!partners.length&&<p style={{color:T.f,fontFamily:"Manrope,sans-serif",fontSize:12}}>Még nincs üzenetpartnered.</p>}
          {partners.map(p=><div key={p.id} onClick={()=>{setSelBuyer(p);setBuyerQ("");setBuyerRes([]);}}
            style={{display:"flex",alignItems:"center",gap:12,padding:"10px 14px",borderRadius:7,cursor:"pointer",background:selBuyer?.id===p.id?AC.gP:B.p,border:`1px solid ${selBuyer?.id===p.id?AC.g:B.bor}`,transition:"all .15s"}}>
            <Ava u={p} size={34}/><span style={{fontFamily:"'Playfair Display',serif",fontSize:16,color:T.h,flex:1}}>{p.name}</span>
            {selBuyer?.id===p.id&&<span style={{color:AC.g}}>✓</span>}
          </div>)}
        </div>
      )}
      <button onClick={confirmSold} disabled={!selBuyer}
        style={{background:selBuyer?`linear-gradient(135deg,${AC.gr},#2a6a3a)`:B.w,border:"none",color:selBuyer?"#fff":T.f,padding:"15px",width:"100%",borderRadius:7,cursor:selBuyer?"pointer":"not-allowed",fontFamily:"Manrope,sans-serif",fontSize:14,fontWeight:700}}>
        {selBuyer?`✓ Eladva – ${selBuyer.name}`:"Válassz vevőt"}
      </button>
    </Modal>}

    {review&&<Modal onClose={()=>setReview(null)}>
      <div style={{display:"flex",alignItems:"center",gap:14,marginBottom:22}}>
        <Ava u={review.target} size={52}/>
        <div><p style={{fontFamily:"Manrope,sans-serif",fontSize:10,color:T.f,letterSpacing:2,fontWeight:700,marginBottom:4}}>ÉRTÉKELÉS</p><p style={{fontFamily:"'Playfair Display',serif",fontSize:24,color:T.h}}>{review.target.name}</p></div>
      </div>
      <Pill text="✓ Verified Purchase" bg={AC.grP} col={AC.gr}/>
      <div style={{margin:"22px 0"}}>
        <Stars v={rvRating} size={34} onChange={setRvRating}/>
        <p style={{fontFamily:"Manrope,sans-serif",fontSize:11,color:T.f,marginTop:6}}>{["","Nagyon rossz","Rossz","Elfogadható","Jó","Kiváló"][rvRating]}</p>
      </div>
      <textarea ref={rvRef} rows={4} placeholder="Hogyan ment az üzlet? Csomagolás, gyorsaság, kommunikáció..."
        style={{background:B.p,border:`1px solid ${B.bor}`,color:T.b,padding:"13px 15px",borderRadius:7,width:"100%",fontFamily:"Manrope,sans-serif",fontSize:14,resize:"vertical",outline:"none",boxSizing:"border-box",marginBottom:18,lineHeight:1.7}}/>
      <button onClick={submitReview} style={{background:AC.ink,border:"none",color:B.c,padding:"14px",width:"100%",borderRadius:7,cursor:"pointer",fontFamily:"Manrope,sans-serif",fontSize:14,fontWeight:700}}>Értékelés elküldése →</button>
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
  const isOwn=curProfile?.id===pu?.id;
  const uls=listings.filter(l=>l.user_id===pu?.id);
  const adm=isAdmin(pu);
  useEffect(()=>{
    if(!pu?.id) return;
    sb.from("reviews").select("*").eq("to_user",pu.id).order("created_at",{ascending:false}).then(({data})=>setReviews(data||[]));
    sb.from("wishlists").select("*").eq("user_id",pu.id).order("created_at",{ascending:false}).then(({data})=>setWishlist(data||[]));
  },[pu?.id]);
  async function submitReview(){
    if(!curProfile) return;
    await sb.from("reviews").insert({from_user:curProfile.id,to_user:pu.id,rating:myRating,text:myText,transaction_type:"full"});
    setShowRM(false);setMyText("");
    const {data}=await sb.from("reviews").select("*").eq("to_user",pu.id);setReviews(data||[]);
  }
  async function addWish(){
    const v=wishRef.current?.value?.trim();if(!v||!curProfile)return;
    const {data}=await sb.from("wishlists").insert({user_id:curProfile.id,raw:v}).select().single();
    if(data){setWishlist(p=>[data,...p]);wishRef.current.value="";}
  }
  async function rmWish(id){ await sb.from("wishlists").delete().eq("id",id); setWishlist(p=>p.filter(w=>w.id!==id)); }
  if(!pu) return null;
  const avg=reviews.length?(reviews.reduce((s,r)=>s+r.rating,0)/reviews.length).toFixed(1):(pu.rating||0).toFixed(1);
  return <div style={{paddingTop:62,maxWidth:980,margin:"0 auto",padding:"80px 40px",background:B.c}}>
    <div style={{display:"flex",gap:32,alignItems:"flex-start",marginBottom:48,flexWrap:"wrap",paddingBottom:40,borderBottom:`1px solid ${B.bor}`}}>
      <Ava u={pu} size={88}/>
      <div style={{flex:1}}>
        <div style={{display:"flex",gap:12,alignItems:"center",flexWrap:"wrap",marginBottom:10}}>
          <h1 style={{fontFamily:"'Playfair Display',serif",fontSize:40,color:T.h,fontWeight:400}}>{pu.name}</h1>
          {pu.verified&&<Pill text="Hitelesített" bg={AC.gP} col={AC.g}/>}
          {adm?<RankBadge adm lg/>:<RankBadge sales={pu.sales||0} lg/>}
          {pu.banned&&<Pill text="Tiltott" bg={AC.rP} col={AC.r}/>}
        </div>
        <div style={{display:"flex",gap:10,alignItems:"center",marginBottom:12}}>
          <Stars v={Number(avg)} size={16}/><span style={{fontFamily:"'Playfair Display',serif",fontSize:20,color:AC.g}}>{avg}</span>
          <span style={{color:T.f,fontSize:13,fontFamily:"Manrope,sans-serif"}}>({reviews.length} értékelés)</span>
        </div>
        <p style={{color:T.f,fontSize:13,marginBottom:10,fontFamily:"Manrope,sans-serif"}}>📍 {pu.location} · Tag: {pu.created_at?.slice(0,7)} óta</p>
        <p style={{color:T.m,fontSize:14,lineHeight:1.85,maxWidth:500,fontFamily:"Manrope,sans-serif"}}>{pu.bio}</p>
      </div>
      <div style={{display:"flex",flexDirection:"column",gap:8}}>
        {!isOwn&&curProfile&&<>
          <button onClick={()=>{setActiveChatWith(pu.id);go("messages");}} style={{background:AC.ink,border:"none",color:B.c,padding:"10px 22px",borderRadius:6,cursor:"pointer",fontFamily:"Manrope,sans-serif",fontSize:12,fontWeight:700}}>✉ ÜZENET</button>
          <button onClick={()=>setShowRM(true)} style={{background:"transparent",border:`1px solid ${B.borD}`,color:T.b,padding:"10px 22px",borderRadius:6,cursor:"pointer",fontFamily:"Manrope,sans-serif",fontSize:12,fontWeight:600}}>⭐ ÉRTÉKELÉS</button>
        </>}
        {isOwn&&<button onClick={onSignOut} style={{background:"transparent",border:`1px solid ${AC.r}30`,color:AC.r,padding:"10px 22px",borderRadius:6,cursor:"pointer",fontFamily:"Manrope,sans-serif",fontSize:12,fontWeight:600}}>Kijelentkezés</button>}
      </div>
    </div>
    <div style={{display:"flex",borderBottom:`1px solid ${B.bor}`,marginBottom:36}}>
      {[["listings",`Hirdetések (${uls.length})`],["reviews",`Értékelések (${reviews.length})`],["wishlist",`Kívánlista (${wishlist.length})`]].map(([k,l])=>
        <button key={k} onClick={()=>setTab(k)} style={{background:"transparent",border:"none",borderBottom:tab===k?`2px solid ${AC.g}`:"2px solid transparent",color:tab===k?T.h:T.f,padding:"12px 20px",cursor:"pointer",fontFamily:"Manrope,sans-serif",fontSize:12,fontWeight:tab===k?700:500,marginBottom:-1}}>{l}</button>
      )}
    </div>
    {tab==="listings"&&<div style={{display:"grid",gridTemplateColumns:"repeat(auto-fill,minmax(262px,1fr))",gap:16}}>
      {uls.map(l=><Card key={l.id} l={l} u={pu}/>)}
      {!uls.length&&<p style={{color:T.f,fontFamily:"Manrope,sans-serif",fontSize:13}}>Nincs hirdetés.</p>}
    </div>}
    {tab==="reviews"&&<div style={{display:"flex",flexDirection:"column",gap:14}}>
      {reviews.map((r,i)=><div key={i} style={{border:`1px solid ${B.bor}`,borderRadius:8,padding:"18px 22px",background:B.p}}>
        <div style={{display:"flex",justifyContent:"space-between",marginBottom:10}}><Stars v={r.rating}/><span style={{color:T.f,fontFamily:"Manrope,sans-serif",fontSize:11}}>{r.created_at?.slice(0,7)}</span></div>
        <p style={{color:T.b,fontSize:14,lineHeight:1.8,fontFamily:"Manrope,sans-serif"}}>{r.text}</p>
      </div>)}
      {!reviews.length&&<p style={{color:T.f,fontFamily:"Manrope,sans-serif",fontSize:13}}>Még nincs értékelés.</p>}
    </div>}
    {tab==="wishlist"&&<div>
      {isOwn&&<div style={{display:"flex",gap:10,marginBottom:24}}>
        <input ref={wishRef} placeholder="pl. Creed Aventus" defaultValue="" autoComplete="off"
          style={{flex:1,background:B.p,border:`1px solid ${B.bor}`,color:T.b,padding:"12px 15px",borderRadius:7,fontFamily:"Manrope,sans-serif",fontSize:14,outline:"none"}}/>
        <button onClick={addWish} style={{background:AC.ink,border:"none",color:B.c,padding:"12px 20px",borderRadius:7,cursor:"pointer",fontFamily:"Manrope,sans-serif",fontSize:12,fontWeight:700,whiteSpace:"nowrap"}}>+ Hozzáad</button>
      </div>}
      <div style={{display:"flex",flexDirection:"column",gap:8}}>
        {wishlist.map(w=><div key={w.id} style={{border:`1px solid ${B.bor}`,borderRadius:8,padding:"14px 18px",display:"flex",alignItems:"center",justifyContent:"space-between",background:B.p}}>
          <div style={{display:"flex",alignItems:"center",gap:14}}>
            <span style={{fontSize:20}}>🌟</span>
            <div><div style={{fontFamily:"'Playfair Display',serif",fontSize:16,color:T.h}}>{w.raw}</div><div style={{fontFamily:"Manrope,sans-serif",fontSize:9,color:T.f,marginTop:2,letterSpacing:1.2,fontWeight:600}}>ÉRTESÍTÉST KÉREK</div></div>
          </div>
          {isOwn&&<button onClick={()=>rmWish(w.id)} style={{background:"transparent",border:`1px solid ${AC.r}25`,color:AC.r,padding:"5px 11px",borderRadius:4,cursor:"pointer",fontFamily:"Manrope,sans-serif",fontSize:10,fontWeight:600}}>Töröl</button>}
        </div>)}
        {!wishlist.length&&<p style={{color:T.f,fontFamily:"Manrope,sans-serif",fontSize:13,textAlign:"center",padding:"40px 0"}}>{isOwn?"Adj hozzá parfümöket!":"Nincs nyilvános kívánlista."}</p>}
      </div>
    </div>}
    {showRM&&<Modal onClose={()=>setShowRM(false)}>
      <h2 style={{fontFamily:"'Playfair Display',serif",fontSize:28,color:T.h,fontWeight:400,marginBottom:22}}>Értékelés írása</h2>
      <div style={{marginBottom:22}}><Stars v={myRating} size={30} onChange={setMyRating}/></div>
      <textarea value={myText} onChange={e=>setMyText(e.target.value)} rows={4} placeholder="Írd le tapasztalatod..."
        style={{background:B.p,border:`1px solid ${B.bor}`,color:T.b,padding:"13px 15px",borderRadius:7,width:"100%",fontFamily:"Manrope,sans-serif",fontSize:14,resize:"vertical",outline:"none",boxSizing:"border-box",marginBottom:18}}/>
      <button onClick={submitReview} style={{background:AC.ink,border:"none",color:B.c,padding:"14px",width:"100%",borderRadius:7,cursor:"pointer",fontFamily:"Manrope,sans-serif",fontSize:14,fontWeight:700}}>Értékelés küldése →</button>
    </Modal>}
  </div>;
}

// ─── MESSAGES ────────────────────────────────────────────────────────────────
function Messages({curProfile,activeChatWith,setActiveChatWith}) {
  const [convs,setConvs]=useState([]); const [pp,setPP]=useState({}); const [chat,setChat]=useState([]); const [newMsg,setNewMsg]=useState("");
  const bottomRef=useRef(null);
  useEffect(()=>{ if(curProfile?.id) loadConvs(); },[curProfile?.id]);
  useEffect(()=>{ if(activeChatWith) loadChat(activeChatWith); },[activeChatWith]);
  useEffect(()=>{ bottomRef.current?.scrollIntoView({behavior:"smooth"}); },[chat]);
  async function loadConvs(){
    const {data}=await sb.from("messages").select("*").or(`from_user.eq.${curProfile.id},to_user.eq.${curProfile.id}`).order("created_at",{ascending:false});
    if(!data) return;
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
    const txt=newMsg.trim();if(!txt||!activeChatWith)return;setNewMsg("");
    await sb.from("messages").insert({from_user:curProfile.id,to_user:activeChatWith,text:txt,read:false,delivered:true});
    loadChat(activeChatWith);
  }
  const totalU=convs.filter(c=>c.lastMsg.to_user===curProfile.id&&!c.lastMsg.read).length;
  const ap=pp[activeChatWith];
  return <div style={{paddingTop:62,height:"100dvh",display:"flex",overflow:"hidden",background:B.c}}>
    <div style={{width:300,borderRight:`1px solid ${B.bor}`,display:"flex",flexDirection:"column",background:B.p,flexShrink:0}}>
      <div style={{padding:"20px",borderBottom:`1px solid ${B.bor}`,display:"flex",alignItems:"center",justifyContent:"space-between"}}>
        <p style={{fontFamily:"'Playfair Display',serif",fontSize:22,color:T.h}}>Üzenetek</p>
        {totalU>0&&<span style={{background:AC.g,borderRadius:12,padding:"2px 9px",fontFamily:"Manrope,sans-serif",fontSize:10,color:"#fff",fontWeight:700}}>{totalU}</span>}
      </div>
      <div style={{overflowY:"auto",flex:1}}>
        {!convs.length&&<p style={{padding:"28px 20px",color:T.f,fontFamily:"Manrope,sans-serif",fontSize:12}}>Még nincs üzeneted.</p>}
        {convs.map(({partnerId,lastMsg})=>{
          const u=pp[partnerId],active=activeChatWith===partnerId,isU=lastMsg.to_user===curProfile.id&&!lastMsg.read;
          return <div key={partnerId} onClick={()=>setActiveChatWith(partnerId)}
            style={{padding:"14px 20px",cursor:"pointer",display:"flex",gap:12,alignItems:"center",background:active?B.w:isU?"#faf5e8":"transparent",borderLeft:active?`3px solid ${AC.g}`:isU?`3px solid ${AC.g}55`:"3px solid transparent",borderBottom:`1px solid ${B.bor}`}}>
            <Ava u={u||{name:"?"}} size={40}/>
            <div style={{flex:1,minWidth:0}}>
              <div style={{display:"flex",justifyContent:"space-between",marginBottom:4}}>
                <span style={{fontFamily:"Manrope,sans-serif",fontSize:13,color:isU?T.h:T.m,fontWeight:isU?700:500}}>{u?.name||"…"}</span>
                <span style={{fontFamily:"Manrope,sans-serif",fontSize:10,color:isU?AC.g:T.f}}>{new Date(lastMsg.created_at).toLocaleDateString("hu-HU",{month:"short",day:"numeric"})}</span>
              </div>
              <div style={{fontSize:12,color:isU?T.m:T.f,overflow:"hidden",textOverflow:"ellipsis",whiteSpace:"nowrap",fontWeight:isU?600:400,fontFamily:"Manrope,sans-serif"}}>{lastMsg.from_user===curProfile.id?"Te: ":""}{lastMsg.text}</div>
            </div>
            {isU&&<div style={{background:AC.g,borderRadius:"50%",width:8,height:8,flexShrink:0}}/>}
          </div>;
        })}
      </div>
    </div>
    <div style={{flex:1,display:"flex",flexDirection:"column",background:B.c,minWidth:0}}>
      {activeChatWith?<>
        <div style={{padding:"14px 20px",borderBottom:`1px solid ${B.bor}`,display:"flex",alignItems:"center",gap:12,background:B.p,flexShrink:0}}>
          <Ava u={ap||{name:"?"}} size={40}/>
          <span style={{fontFamily:"'Playfair Display',serif",fontSize:19,color:T.h,flex:1}}>{ap?.name||"…"}</span>
          {ap&&(isAdmin(ap)?<RankBadge adm/>:<RankBadge sales={ap.sales||0}/>)}
        </div>
        <div style={{flex:1,overflowY:"auto",padding:"20px 16px",display:"flex",flexDirection:"column",gap:8}}>
          {chat.map((m,i)=>{
            const me=m.from_user===curProfile.id;
            return <div key={m.id||i} style={{display:"flex",justifyContent:me?"flex-end":"flex-start"}}>
              <div style={{maxWidth:"78%",padding:"11px 15px",background:me?B.w:B.p,border:`1px solid ${me?B.borD:B.bor}`,borderRadius:me?"16px 16px 4px 16px":"16px 16px 16px 4px"}}>
                <p style={{color:T.b,fontSize:14,lineHeight:1.6,margin:0,fontFamily:"Manrope,sans-serif"}}>{m.text}</p>
                <div style={{display:"flex",alignItems:"center",justifyContent:"flex-end",gap:5,marginTop:4}}>
                  <span style={{color:T.f,fontSize:10,fontFamily:"Manrope,sans-serif"}}>{new Date(m.created_at).toLocaleTimeString("hu-HU",{hour:"2-digit",minute:"2-digit"})}</span>
                  {me&&<span style={{fontSize:10,color:m.read?AC.g:T.f}}>✓✓</span>}
                </div>
              </div>
            </div>;
          })}
          <div ref={bottomRef}/>
        </div>
        <div style={{padding:"12px 16px",borderTop:`1px solid ${B.bor}`,display:"flex",gap:10,background:B.p,flexShrink:0}}>
          <input value={newMsg} onChange={e=>setNewMsg(e.target.value)} onKeyDown={e=>e.key==="Enter"&&!e.shiftKey&&send()} placeholder="Írj üzenetet..."
            style={{flex:1,background:B.c,border:`1px solid ${B.bor}`,color:T.b,padding:"12px 15px",borderRadius:8,fontFamily:"Manrope,sans-serif",fontSize:14,outline:"none"}}/>
          <button onClick={send} style={{background:AC.ink,border:"none",color:B.c,padding:"12px 18px",borderRadius:8,cursor:"pointer",fontFamily:"Manrope,sans-serif",fontWeight:700,fontSize:16}}>→</button>
        </div>
      </>:<div style={{flex:1,display:"flex",alignItems:"center",justifyContent:"center",flexDirection:"column",gap:16}}>
        <span style={{fontSize:48,opacity:.1}}>✉</span>
        <p style={{color:T.f,fontFamily:"Manrope,sans-serif",fontSize:13}}>Válassz egy beszélgetést</p>
      </div>}
    </div>
  </div>;
}

// ─── SELL ────────────────────────────────────────────────────────────────────
function Sell({curProfile,go,setListings,showToast}) {
  const [sType,setSType]=useState("sell"); const [lType,setLType]=useState("full"); const [size,setSize]=useState("100ml");
  const [fill,setFill]=useState(90); const [cond,setCond]=useState("excellent"); const [decant,setDecant]=useState("5");
  const [cat,setCat]=useState("woody"); const [icon,setIcon]=useState("✨"); const [swap,setSwap]=useState(false);
  const [loading,setLoading]=useState(false); const [errs,setErrs]=useState({});
  const rBrand=useRef(),rName=useRef(),rPrice=useRef(),rDesc=useRef(),rTags=useRef();
  const inp={background:B.p,border:`1px solid ${B.bor}`,color:T.b,padding:"13px 15px",borderRadius:7,fontFamily:"Manrope,sans-serif",fontSize:16,width:"100%",boxSizing:"border-box",outline:"none"};
  async function submit(){
    if(!curProfile){go("login");return;}
    const brand=rBrand.current?.value?.trim()||"",name=rName.current?.value?.trim()||"",price=rPrice.current?.value||"",desc=rDesc.current?.value?.trim()||"",tags=rTags.current?.value||"";
    const e={};
    if(!brand)e.brand="Kötelező";if(!name)e.name="Kötelező";if(!price||Number(price)<=0)e.price="Érvényes ár";if(!desc)e.desc="Kötelező";
    if(Object.keys(e).length){setErrs(e);showToast?.("Töltsd ki a kötelező mezőket!","error");return;}
    setErrs({});setLoading(true);
    const isD=lType==="decant";
    const {data,error}=await sb.from("listings").insert({
      user_id:curProfile.id,type:sType,listing_type:lType,brand,name,
      size:isD?null:size,fill:(!isD&&sType==="sell")?Number(fill):null,
      condition:(!isD&&sType==="sell")?cond:null,
      price:Number(price),decant_ml:isD?Number(decant):null,
      description:desc,category:cat,tags:tags.split(",").map(t=>t.trim()).filter(Boolean),
      icon,views:0,favorites:0,status:"active",swap_ok:swap,pinned:false,
    }).select().single();
    setLoading(false);
    if(error){showToast?.("Hiba: "+(error.message||"ismeretlen"),"error");return;}
    if(data)setListings(p=>[data,...p]);
    showToast?.("Hirdetés közzétéve!","success");
    setTimeout(()=>go("market"),800);
  }
  const F = ({label,err,children}) => <div style={{marginBottom:22}}>
    <div style={{fontFamily:"Manrope,sans-serif",fontSize:10,color:err?AC.r:T.f,letterSpacing:2,marginBottom:8,textTransform:"uppercase",fontWeight:700}}>{label}{err&&<span style={{marginLeft:8,letterSpacing:0,fontSize:11,fontWeight:500,textTransform:"none"}}>— {err}</span>}</div>
    {children}
  </div>;
  return <div style={{paddingTop:62,maxWidth:700,margin:"0 auto",padding:"80px 24px 100px",background:B.c}}>
    <h1 style={{fontFamily:"'Playfair Display',serif",fontSize:44,color:T.h,fontWeight:400,marginBottom:40}}>Hirdetés feladása</h1>
    <F label="Mit szeretnél?">
      <div style={{display:"flex",gap:8}}>
        {[["sell","🏷 Eladom"],["buy","🔍 Keresem"]].map(([t,l])=>
          <button key={t} onClick={()=>setSType(t)} style={{flex:1,background:sType===t?AC.ink:"transparent",border:`1px solid ${sType===t?AC.ink:B.borD}`,color:sType===t?B.c:T.m,padding:"13px",borderRadius:7,cursor:"pointer",fontFamily:"Manrope,sans-serif",fontSize:13,fontWeight:sType===t?700:500,transition:"all .15s"}}>{l}</button>
        )}
      </div>
    </F>
    <F label="Típus">
      <div style={{display:"flex",gap:8}}>
        {[["full","🫙 Teljes üveg"],["decant","💧 Dekant"]].map(([t,l])=>
          <button key={t} onClick={()=>setLType(t)} style={{flex:1,background:lType===t?AC.ink:"transparent",border:`1px solid ${lType===t?AC.ink:B.borD}`,color:lType===t?B.c:T.m,padding:"13px",borderRadius:7,cursor:"pointer",fontFamily:"Manrope,sans-serif",fontSize:13,fontWeight:lType===t?700:500,transition:"all .15s"}}>{l}</button>
        )}
      </div>
    </F>
    <F label="Márka *" err={errs.brand}><input ref={rBrand} defaultValue="" placeholder="pl. Creed" autoComplete="off" autoCapitalize="words" style={{...inp,...(errs.brand?{border:`1px solid ${AC.r}55`}:{})}}/></F>
    <F label="Parfüm neve *" err={errs.name}><input ref={rName} defaultValue="" placeholder="pl. Aventus" autoComplete="off" autoCapitalize="words" style={{...inp,...(errs.name?{border:`1px solid ${AC.r}55`}:{})}}/></F>
    <div style={{display:"grid",gridTemplateColumns:"1fr 1fr",gap:12}}>
      {lType==="full"&&<F label="Méret"><select value={size} onChange={e=>setSize(e.target.value)} style={{...inp,cursor:"pointer"}}>{["30ml","50ml","75ml","100ml","125ml","150ml","200ml"].map(s=><option key={s}>{s}</option>)}</select></F>}
      {lType==="decant"&&<F label="Dekant (ml)"><select value={decant} onChange={e=>setDecant(e.target.value)} style={{...inp,cursor:"pointer"}}>{[1,2,3,5,10,15,20].map(s=><option key={s} value={s}>{s}ml</option>)}</select></F>}
      <F label="Kategória"><select value={cat} onChange={e=>setCat(e.target.value)} style={{...inp,cursor:"pointer"}}>{["woody","oriental","floral","fresh","aromatic"].map(c=><option key={c}>{c}</option>)}</select></F>
      {lType==="full"&&sType==="sell"&&<F label="Állapot"><select value={cond} onChange={e=>setCond(e.target.value)} style={{...inp,cursor:"pointer"}}>{Object.entries(COND).map(([k,v])=><option key={k} value={k}>{v}</option>)}</select></F>}
    </div>
    {lType==="full"&&sType==="sell"&&<F label="Töltöttségi szint"><BottleSlider value={fill} onChange={setFill}/></F>}
    <F label="Ár (Ft) *" err={errs.price}><input ref={rPrice} defaultValue="" placeholder="pl. 35000" type="number" inputMode="numeric" style={{...inp,...(errs.price?{border:`1px solid ${AC.r}55`}:{})}}/></F>
    <F label="Leírás *" err={errs.desc}><textarea ref={rDesc} defaultValue="" rows={5} placeholder="Batch, állapot, csere lehetőség..." style={{...inp,resize:"vertical",...(errs.desc?{border:`1px solid ${AC.r}55`}:{})}}/></F>
    <F label="Tagek (vesszővel)"><input ref={rTags} defaultValue="" placeholder="creed, niche, woody" autoComplete="off" style={inp}/></F>
    <div style={{marginBottom:24}} onClick={()=>setSwap(v=>!v)}>
      <div style={{display:"flex",gap:14,alignItems:"center",cursor:"pointer"}}>
        <div style={{width:22,height:22,borderRadius:5,flexShrink:0,background:swap?"#f5f0fb":"transparent",border:`1.5px solid ${swap?"#7a5ab0":B.borD}`,display:"flex",alignItems:"center",justifyContent:"center",transition:"all .15s"}}>{swap&&<span style={{color:"#7a5ab0",fontSize:13,fontWeight:700}}>✓</span>}</div>
        <span style={{fontFamily:"Manrope,sans-serif",fontSize:13,color:swap?"#7a5ab0":T.b,fontWeight:600}}>Csere is érdekel</span>
      </div>
    </div>
    <F label="Ikon"><div style={{display:"flex",flexWrap:"wrap",gap:6}}>{ICONS.map(ic=><button key={ic} onClick={()=>setIcon(ic)} style={{background:icon===ic?AC.gP:B.p,border:`1px solid ${icon===ic?AC.g:B.bor}`,borderRadius:7,padding:"8px 12px",cursor:"pointer",fontSize:20}}>{ic}</button>)}</div></F>
    <button onClick={submit} disabled={loading} style={{background:AC.ink,border:"none",color:B.c,padding:"18px",width:"100%",borderRadius:8,cursor:"pointer",fontFamily:"Manrope,sans-serif",fontSize:15,fontWeight:700,marginTop:12,opacity:loading?.6:1}}>
      {loading?"Feltöltés...":"Hirdetés közzététele →"}
    </button>
  </div>;
}

// ─── ADMIN ───────────────────────────────────────────────────────────────────
function Admin({listings,profiles,go,setSelId,setListings,setProfiles,showToast}) {
  const [tab,setTab]=useState("overview"); const [users,setUsers]=useState([]); const [cDel,setCDel]=useState(null); const [cBan,setCBan]=useState(null);
  useEffect(()=>{ sb.from("profiles").select("*").order("created_at",{ascending:false}).then(({data})=>setUsers(data||[])); },[]);
  async function hDel(l){ await sb.from("listings").delete().eq("id",l.id); setListings(p=>p.filter(x=>x.id!==l.id)); setCDel(null); showToast?.("Törölve.","success"); }
  async function hPin(l){ const nv=!l.pinned; await sb.from("listings").update({pinned:nv}).eq("id",l.id); setListings(p=>p.map(x=>x.id===l.id?{...x,pinned:nv}:x)); showToast?.(nv?"Kiemelve.":"Kiemelés eltávolítva.","success"); }
  async function hBan(u){ const nv=!u.banned; await sb.from("profiles").update({banned:nv}).eq("id",u.id); setUsers(p=>p.map(x=>x.id===u.id?{...x,banned:nv}:x)); setProfiles(p=>({...p,[u.id]:{...(p[u.id]||{}),banned:nv}})); setCBan(null); showToast?.(nv?`${u.name} tiltva.`:`${u.name} feloldva.`,"success"); }
  const stats=[["Összes hirdetés",listings.length,T.h],["Aktív",listings.filter(l=>l.status==="active").length,AC.gr],["Eladott",listings.filter(l=>l.status==="sold").length,AC.g],["Felhasználók",users.length,T.h],["Tiltott",users.filter(u=>u.banned).length,AC.r],["Forgalom",listings.filter(l=>l.status==="sold").reduce((s,l)=>s+(l.price||0),0).toLocaleString("hu-HU")+" Ft",AC.g]];
  return <div style={{paddingTop:62,maxWidth:1200,margin:"0 auto",padding:"80px 40px",background:B.c}}>
    <span style={{background:AC.admP,border:`1px solid ${AC.admM}`,color:AC.adm,padding:"4px 12px",borderRadius:4,fontFamily:"Manrope,sans-serif",fontSize:11,fontWeight:700,letterSpacing:1.5}}>⚡ ADMIN PANEL</span>
    <h1 style={{fontFamily:"'Playfair Display',serif",fontSize:44,color:T.h,fontWeight:400,marginBottom:36,marginTop:12}}>Dashboard</h1>
    <div style={{display:"flex",borderBottom:`1px solid ${B.bor}`,marginBottom:36}}>
      {[["overview","Áttekintés"],["listings","Hirdetések"],["users","Felhasználók"]].map(([k,l])=>
        <button key={k} onClick={()=>setTab(k)} style={{background:"transparent",border:"none",borderBottom:tab===k?`2px solid ${AC.adm}`:"2px solid transparent",color:tab===k?AC.adm:T.f,padding:"12px 20px",cursor:"pointer",fontFamily:"Manrope,sans-serif",fontSize:12,fontWeight:tab===k?700:500,marginBottom:-1}}>{l}</button>
      )}
    </div>
    {tab==="overview"&&<div style={{display:"grid",gridTemplateColumns:"repeat(auto-fill,minmax(180px,1fr))",gap:16}}>
      {stats.map(([label,val,col])=><div key={label} style={{background:B.p,border:`1px solid ${B.bor}`,borderRadius:10,padding:"20px 22px"}}>
        <div style={{fontFamily:"Manrope,sans-serif",fontSize:10,color:T.f,letterSpacing:2,fontWeight:700,textTransform:"uppercase",marginBottom:8}}>{label}</div>
        <div style={{fontFamily:"'Playfair Display',serif",fontSize:30,color:col,fontWeight:600}}>{val}</div>
      </div>)}
    </div>}
    {tab==="listings"&&<div style={{display:"grid",gridTemplateColumns:"repeat(auto-fill,minmax(272px,1fr))",gap:18}}>
      {listings.map(l=><Card key={l.id} l={l} u={profiles[l.user_id]} onClick={()=>{setSelId(l.id);go("detail");}} adminMode onAdminDelete={setCDel} onAdminPin={hPin}/>)}
    </div>}
    {tab==="users"&&<div style={{display:"flex",flexDirection:"column",gap:10}}>
      {users.map(u=><div key={u.id} style={{display:"flex",alignItems:"center",gap:16,padding:"16px 20px",border:`1px solid ${u.banned?AC.r+"30":B.bor}`,borderRadius:10,background:u.banned?AC.rP:B.p}}>
        <Ava u={u} size={44}/>
        <div style={{flex:1}}>
          <div style={{display:"flex",alignItems:"center",gap:10,marginBottom:4,flexWrap:"wrap"}}>
            <span style={{fontFamily:"'Playfair Display',serif",fontSize:18,color:T.h}}>{u.name}</span>
            {isAdmin(u)?<RankBadge adm/>:<RankBadge sales={u.sales||0}/>}
            {u.banned&&<Pill text="Tiltott" bg={AC.rP} col={AC.r}/>}
            {u.verified&&<Pill text="Hitelesített" bg={AC.gP} col={AC.g}/>}
          </div>
          <div style={{fontFamily:"Manrope,sans-serif",fontSize:12,color:T.f}}>{u.email} · {u.location||"–"} · {u.sales||0} eladás</div>
        </div>
        {!isAdmin(u)&&<button onClick={()=>setCBan(u)} style={{background:u.banned?AC.grP:AC.rP,border:`1px solid ${u.banned?AC.gr:AC.r}30`,color:u.banned?AC.gr:AC.r,padding:"8px 16px",borderRadius:6,cursor:"pointer",fontFamily:"Manrope,sans-serif",fontSize:11,fontWeight:700,whiteSpace:"nowrap"}}>{u.banned?"✓ Feloldás":"⛔ Tiltás"}</button>}
      </div>)}
    </div>}
    {cDel&&<Modal onClose={()=>setCDel(null)}>
      <h2 style={{fontFamily:"'Playfair Display',serif",fontSize:26,color:T.h,fontWeight:400,marginBottom:12}}>Hirdetés törlése</h2>
      <p style={{fontFamily:"Manrope,sans-serif",fontSize:14,color:T.m,lineHeight:1.7,marginBottom:28}}>Biztosan törlöd: <strong style={{color:T.h}}>{cDel.brand} {cDel.name}</strong>?</p>
      <div style={{display:"flex",gap:10}}>
        <button onClick={()=>hDel(cDel)} style={{flex:1,background:AC.r,border:"none",color:"#fff",padding:"13px",borderRadius:7,cursor:"pointer",fontFamily:"Manrope,sans-serif",fontSize:13,fontWeight:700}}>Igen, törlöm</button>
        <button onClick={()=>setCDel(null)} style={{flex:1,background:"transparent",border:`1px solid ${B.borD}`,color:T.m,padding:"13px",borderRadius:7,cursor:"pointer",fontFamily:"Manrope,sans-serif",fontSize:13}}>Mégse</button>
      </div>
    </Modal>}
    {cBan&&<Modal onClose={()=>setCBan(null)}>
      <h2 style={{fontFamily:"'Playfair Display',serif",fontSize:26,color:T.h,fontWeight:400,marginBottom:12}}>{cBan.banned?"Tiltás feloldása":"Tiltás"}</h2>
      <p style={{fontFamily:"Manrope,sans-serif",fontSize:14,color:T.m,lineHeight:1.7,marginBottom:28}}><strong style={{color:T.h}}>{cBan.name}</strong> {cBan.banned?"– feloldod a tiltást?":"– biztosan tiltod?"}</p>
      <div style={{display:"flex",gap:10}}>
        <button onClick={()=>hBan(cBan)} style={{flex:1,background:cBan.banned?AC.gr:AC.r,border:"none",color:"#fff",padding:"13px",borderRadius:7,cursor:"pointer",fontFamily:"Manrope,sans-serif",fontSize:13,fontWeight:700}}>{cBan.banned?"Feloldás":"Tiltás"}</button>
        <button onClick={()=>setCBan(null)} style={{flex:1,background:"transparent",border:`1px solid ${B.borD}`,color:T.m,padding:"13px",borderRadius:7,cursor:"pointer",fontFamily:"Manrope,sans-serif",fontSize:13}}>Mégse</button>
      </div>
    </Modal>}
  </div>;
}

// ─── LOGIN ───────────────────────────────────────────────────────────────────
function Login({go,showToast}) {
  const [mode,setMode]=useState("login"); const [email,setEmail]=useState(""); const [pass,setPass]=useState(""); const [passC,setPassC]=useState(""); const [name,setName]=useState(""); const [loc,setLoc]=useState(""); const [tos,setTos]=useState(false); const [loading,setLoading]=useState(false); const [sent,setSent]=useState(false);
  const inp={background:B.p,border:`1px solid ${B.bor}`,color:T.b,padding:"13px 15px",borderRadius:7,fontFamily:"Manrope,sans-serif",fontSize:16,width:"100%",boxSizing:"border-box",outline:"none",marginBottom:12};
  const lbl={fontFamily:"Manrope,sans-serif",fontSize:10,color:T.f,letterSpacing:2,display:"block",marginBottom:6,textTransform:"uppercase",fontWeight:700};
  async function doLogin(){
    setLoading(true);
    const {error}=await sb.auth.signInWithPassword({email,password:pass});
    setLoading(false);
    if(error){showToast?.(error.message,"error");}else{go("home");}
  }
  async function doRegister(){
    if(!name.trim()){showToast?.("Add meg a neved!","error");return;}
    if(pass!==passC){showToast?.("A jelszavak nem egyeznek!","error");return;}
    if(!tos){showToast?.("ÁSZF szükséges!","error");return;}
    setLoading(true);
    const {data:d,error}=await sb.auth.signUp({email,password:pass,options:{data:{name,location:loc}}});
    if(error){setLoading(false);showToast?.(error.message,"error");return;}
    if(d?.user){await sb.from("profiles").upsert({id:d.user.id,name:name.trim(),location:loc.trim(),email,bio:"",verified:false,rating:0,rating_count:0,sales:0,banned:false});}
    setLoading(false);
    if(d?.session){go("home");}else{setSent(true);}
  }
  if(sent)return <div style={{paddingTop:62,minHeight:"100vh",display:"flex",alignItems:"center",justifyContent:"center",background:B.c}}>
    <div style={{border:`1px solid ${B.bor}`,borderRadius:12,padding:"56px 48px",maxWidth:440,textAlign:"center",background:B.p}}>
      <div style={{fontSize:48,marginBottom:22}}>✉</div>
      <h2 style={{fontFamily:"'Playfair Display',serif",fontSize:30,color:T.h,fontWeight:400,marginBottom:16}}>Erősítsd meg az emailed</h2>
      <p style={{color:T.m,fontFamily:"Manrope,sans-serif",fontSize:13,lineHeight:2,marginBottom:32}}>Linket küldtünk: <span style={{color:AC.g}}>{email}</span></p>
      <button onClick={()=>{setMode("login");setSent(false);}} style={{background:AC.ink,border:"none",color:B.c,padding:"14px",width:"100%",borderRadius:7,cursor:"pointer",fontFamily:"Manrope,sans-serif",fontSize:14,fontWeight:700}}>Bejelentkezéshez →</button>
    </div>
  </div>;
  return <div style={{paddingTop:62,minHeight:"100vh",display:"flex",alignItems:"center",justifyContent:"center",padding:"80px 24px",background:B.c}}>
    <div style={{border:`1px solid ${B.bor}`,borderRadius:12,padding:"56px 48px",width:"100%",maxWidth:440,boxShadow:"0 8px 40px rgba(0,0,0,.06)",background:B.p}}>
      <div style={{textAlign:"center",marginBottom:40}}>
        <h2 style={{fontFamily:"'Playfair Display',serif",fontSize:36,color:T.h,fontWeight:400,marginBottom:4}}>{mode==="login"?"Belépés":"Regisztráció"}</h2>
        <p style={{fontFamily:"Manrope,sans-serif",fontSize:12,color:T.f}}>SCENTRADE · Magyar Parfüm Közösség</p>
      </div>
      <div style={{display:"flex",background:B.w,borderRadius:7,padding:3,marginBottom:32}}>
        {[["login","Belépés"],["register","Regisztráció"]].map(([m,l])=>
          <button key={m} onClick={()=>setMode(m)} style={{flex:1,padding:"9px",borderRadius:5,border:"none",cursor:"pointer",background:mode===m?B.c:"transparent",color:mode===m?T.h:T.f,fontFamily:"Manrope,sans-serif",fontSize:12,fontWeight:mode===m?700:500,boxShadow:mode===m?"0 1px 4px rgba(0,0,0,.06)":"none"}}>{l}</button>
        )}
      </div>
      {mode==="register"&&<><label style={lbl}>Felhasználónév *</label><input value={name} onChange={e=>setName(e.target.value)} placeholder="pl. illatmester_bp" style={inp}/><label style={lbl}>Helyszín</label><input value={loc} onChange={e=>setLoc(e.target.value)} placeholder="pl. Budapest" style={inp}/></>}
      <label style={lbl}>Email *</label>
      <input value={email} onChange={e=>setEmail(e.target.value)} placeholder="pelda@email.hu" type="email" autoComplete="email" style={inp}/>
      <label style={lbl}>Jelszó *</label>
      <input value={pass} onChange={e=>setPass(e.target.value)} placeholder="••••••••" type="password" onKeyDown={e=>e.key==="Enter"&&mode==="login"&&doLogin()} style={{...inp,marginBottom:mode==="register"?12:20}}/>
      {mode==="register"&&<>
        <label style={lbl}>Jelszó mégegyszer *</label>
        <input value={passC} onChange={e=>setPassC(e.target.value)} placeholder="••••••••" type="password" onKeyDown={e=>e.key==="Enter"&&doRegister()} style={{...inp,border:`1px solid ${passC&&passC!==pass?AC.r+"55":B.bor}`,marginBottom:16}}/>
        <label style={{display:"flex",gap:12,alignItems:"flex-start",cursor:"pointer",marginBottom:20}}>
          <div onClick={()=>setTos(v=>!v)} style={{width:20,height:20,borderRadius:4,flexShrink:0,marginTop:1,background:tos?AC.gP:"transparent",border:`1.5px solid ${tos?AC.g:B.borD}`,display:"flex",alignItems:"center",justifyContent:"center",cursor:"pointer"}}>
            {tos&&<span style={{color:AC.g,fontSize:12,fontWeight:700}}>✓</span>}
          </div>
          <span style={{fontFamily:"Manrope,sans-serif",fontSize:12,color:T.m,lineHeight:1.7}}>Elfogadom az ÁSZF-t és az Adatkezelési tájékoztatót. *</span>
        </label>
      </>}
      <button onClick={mode==="login"?doLogin:doRegister} disabled={loading||(mode==="register"&&!tos)}
        style={{background:(mode==="register"&&!tos)?B.w:AC.ink,border:"none",color:(mode==="register"&&!tos)?T.f:B.c,padding:"15px",width:"100%",borderRadius:7,cursor:(mode==="register"&&!tos)?"not-allowed":"pointer",fontFamily:"Manrope,sans-serif",fontSize:14,fontWeight:700,marginBottom:16,opacity:loading?.6:1}}>
        {loading?"...":mode==="login"?"Belépés →":"Regisztráció →"}
      </button>
      <p style={{color:T.f,fontSize:11,fontFamily:"Manrope,sans-serif",textAlign:"center",cursor:"pointer",fontWeight:600}} onClick={()=>setMode(mode==="login"?"register":"login")}>
        {mode==="login"?"Még nincs fiókod? Regisztrálj":"Már van fiókod? Lépj be"}
      </p>
    </div>
  </div>;
}

// ─── ROOT ────────────────────────────────────────────────────────────────────
function useAuth() {
  const [profile,setProfile]=useState(null); const [loading,setLoading]=useState(true);
  useEffect(()=>{
    async function init(){
      const {data:{session}}=await sb.auth.getSession();
      if(session?.user) await fetchP(session.user);
      else setLoading(false);
      sb.auth.onAuthStateChange(async(_,sess)=>{
        if(sess?.user) await fetchP(sess.user);
        else {setProfile(null);setLoading(false);}
      });
    }
    init();
  },[]);
  async function fetchP(user){
    const {data}=await sb.from("profiles").select("*").eq("id",user.id).single();
    setProfile(data?{...data,email:user.email}:{id:user.id,email:user.email,name:user.user_metadata?.name||user.email});
    setLoading(false);
  }
  return {profile,loading};
}

export default function App() {
  const {profile,loading}=useAuth();
  const [page,setPage]=useState("home");
  const [listings,setListings]=useState([]);
  const [profiles,setProfiles]=useState({});
  const [selId,setSelId]=useState(null);
  const [profileId,setProfileId]=useState(null);
  const [activeChatWith,setACW]=useState(null);
  const [unread,setUnread]=useState(0);
  const {show,TC}=useToast();

  useEffect(()=>{ loadAll(); },[]);
  useEffect(()=>{ if(profile) loadUnread(); },[profile?.id]);

  async function loadAll(){
    const {data}=await sb.from("listings").select("*").order("created_at",{ascending:false});
    if(!data) return;
    setListings(data);
    const ids=[...new Set(data.map(l=>l.user_id))];
    if(ids.length){const {data:pd}=await sb.from("profiles").select("*").in("id",ids);if(pd){const m={};pd.forEach(p=>{m[p.id]=p;});setProfiles(m);}}
  }
  async function loadUnread(){
    if(!profile) return;
    const {count}=await sb.from("messages").select("id",{count:"exact",head:true}).eq("to_user",profile.id).eq("read",false);
    setUnread(count||0);
  }
  async function signOut(){ await sb.auth.signOut(); setPage("home"); }
  function go(p){
    if(p==="sell"&&!profile){setPage("guest_wall");window.scrollTo(0,0);return;}
    if(p==="admin"&&!isAdmin(profile)) return;
    setPage(p);window.scrollTo(0,0);
  }
  function upd(id,f){setListings(p=>p.map(l=>l.id===id?{...l,...f}:l));}
  const sel=listings.find(l=>l.id===selId);
  const pu=profileId?profiles[profileId]||null:null;
  const allP=profile?{...profiles,[profile.id]:profile}:profiles;

  if(loading) return <div style={{background:B.c,minHeight:"100vh",display:"flex",alignItems:"center",justifyContent:"center"}}>
    <div style={{textAlign:"center"}}>
      <div style={{fontFamily:"'Playfair Display',serif",fontSize:36,color:AC.g,marginBottom:12}}>◈</div>
      <div style={{fontFamily:"Manrope,sans-serif",fontSize:12,color:T.f,letterSpacing:2}}>BETÖLTÉS...</div>
    </div>
  </div>;

  return <div style={{background:B.c,minHeight:"100vh",color:T.b}}>
    <style>{`
      @import url('https://fonts.googleapis.com/css2?family=Playfair+Display:ital,wght@0,400;0,600;0,700;1,400&family=Manrope:wght@400;500;600;700&display=swap');
      *,*::before,*::after{box-sizing:border-box;margin:0;padding:0;}
      body{background:#faf8f4;}
      input,textarea,select{font-family:Manrope,sans-serif;font-size:16px!important;}
      input::placeholder,textarea::placeholder{color:#c5bfb8;}
      ::-webkit-scrollbar{width:5px;}::-webkit-scrollbar-track{background:#f5f2ec;}::-webkit-scrollbar-thumb{background:#e3ddd4;border-radius:3px;}
      select option{background:#faf8f4;color:#2c2825;}
      button{transition:opacity .15s,background .15s,border-color .15s,color .15s;font-family:inherit;}
      button:hover{opacity:.85;}
      input[type=range]::-webkit-slider-thumb{appearance:none;-webkit-appearance:none;width:16px;height:16px;border-radius:50%;background:#b8943f;cursor:pointer;border:2px solid #faf8f4;}
    `}</style>
    <Nav profile={profile} page={page} go={go} openLogin={()=>go("login")} unread={unread}/>
    <TC/>
    {page==="home"        && <Home go={go} listings={listings} profiles={allP}/>}
    {page==="market"      && <Market listings={listings} profiles={allP} go={go} setSelId={setSelId}/>}
    {page==="detail"      && sel && <Detail l={sel} u={allP[sel.user_id]} curProfile={profile} go={go} setProfileId={setProfileId} setActiveChatWith={setACW} onUpd={upd} showToast={show}/>}
    {page==="profile"     && pu && <Profile pu={pu} curProfile={profile} go={go} listings={listings} setActiveChatWith={setACW} onSignOut={signOut}/>}
    {page==="profile_own" && profile && <Profile pu={profile} curProfile={profile} go={go} listings={listings} setActiveChatWith={setACW} onSignOut={signOut}/>}
    {page==="messages"    && profile && <Messages curProfile={profile} activeChatWith={activeChatWith} setActiveChatWith={setACW}/>}
    {page==="sell"        && profile && <Sell curProfile={profile} go={go} setListings={setListings} showToast={show}/>}
    {page==="admin"       && isAdmin(profile) && <Admin listings={listings} profiles={allP} go={go} setSelId={setSelId} setListings={setListings} setProfiles={setProfiles} showToast={show}/>}
    {page==="guest_wall"  && <div style={{paddingTop:62,minHeight:"100vh",display:"flex",alignItems:"center",justifyContent:"center",background:B.c}}><div style={{border:`1px solid ${B.bor}`,borderRadius:12,padding:"64px 52px",maxWidth:460,textAlign:"center",background:B.p}}><div style={{fontSize:48,marginBottom:22}}>🔒</div><h2 style={{fontFamily:"'Playfair Display',serif",fontSize:32,color:T.h,fontWeight:400,marginBottom:14}}>Belépés szükséges</h2><p style={{color:T.m,fontFamily:"Manrope,sans-serif",fontSize:13,lineHeight:2,marginBottom:36}}>Hirdetés feladásához be kell jelentkezned.</p><button onClick={()=>go("login")} style={{background:AC.ink,border:"none",color:B.c,padding:"14px 40px",borderRadius:7,cursor:"pointer",fontFamily:"Manrope,sans-serif",fontSize:14,fontWeight:700,marginBottom:12,width:"100%"}}>Belépés / Regisztráció →</button><button onClick={()=>go("market")} style={{background:"transparent",border:`1px solid ${B.bor}`,color:T.m,padding:"12px 40px",borderRadius:7,cursor:"pointer",fontFamily:"Manrope,sans-serif",fontSize:12,fontWeight:600,width:"100%"}}>Vissza a piacra</button></div></div>}
    {page==="login"       && <Login go={go} showToast={show}/>}
  </div>;
}
ENDOFFILE
echo "Lines: $(wc -l < /mnt/user-data/outputs/scentrade-final.jsx)"