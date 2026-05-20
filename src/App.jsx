import React, { useState, useMemo } from 'react';

// ==========================================
// MOCK DATA (Érintetlenül hagyva a struktúra)
// ==========================================
const INITIAL_LISTINGS = [
  { id: '1', type: 'sell', listing_type: 'full', brand: 'Creed', name: 'Aventus', size: '100ml', fill: 85, condition: 'excellent', price: 68000, category: 'Niche', icon: '👑', views: 242, status: 'active', user_id: 'u1', swap_ok: true, description: 'Eredeti dobozában, hűvös helyen tárolt. Batch kód: LT4221Q01.', tags: ['gyümölcsös', 'füstös', 'tartós'] },
  { id: '2', type: 'sell', listing_type: 'decant', brand: 'Tom Ford', name: 'Tobacco Vanille', size: '10ml', decant_ml: 8, condition: 'mint', price: 9500, category: 'Niche', icon: '🍂', views: 118, status: 'active', user_id: 'u2', swap_ok: false, description: 'Minőségi üveg fújósban, pontosan mérve.', tags: ['őszi', 'édes', 'fűszeres'] },
  { id: '3', type: 'buy', listing_type: 'full', brand: 'Dior', name: 'Sauvage Elixir', size: '60ml', fill: 0, condition: 'any', price: 35000, category: 'Designer', icon: '🌌', views: 64, status: 'active', user_id: 'u3', swap_ok: true, description: 'Keresem a fenti illatot, akár maradvány is érdekel.', tags: ['modern', 'férfias', 'intenzív'] },
];

const CURRENT_USER = {
  id: 'u1',
  name: 'Kovács Bence',
  location: 'Budapest, XI.',
  bio: 'Niche parfümök gyűjtésével foglalkozom 4 éve. Csere is érdekelhet.',
  sales: 14,
  rating: 4.9,
  rating_count: 12,
  verified: true
};

// ==========================================
// KISEBB SEGÉDKOMPONENSEK
// ==========================================
const Nav = ({ activeTab, onNav, loggedIn, onLogout, onLoginClick }) => (
  <nav className="nav-blur sticky top-0 z-40 border-b border-[#2a2a2a] bg-[#121212]/80 px-4 py-3 md:px-8">
    <div className="mx-auto flex max-w-6xl items-center justify-between">
      <div className="flex items-center gap-2 cursor-pointer" onClick={() => onNav('explore')}>
        <span className="bg-gradient-to-r from-[#d4af37] to-[#aa7c11] bg-clip-text text-xl font-black tracking-widest text-transparent">SCENTRADE</span>
        <span className="hidden rounded-full border border-[#d4af37]/30 bg-[#d4af37]/10 px-2 py-0.5 text-[10px] uppercase tracking-wider text-[#d4af37] sm:inline-block">Beta</span>
      </div>
      <div className="flex items-center gap-1 sm:gap-4">
        <button onClick={() => onNav('explore')} className={`rounded-xl px-3 py-2 text-xs font-medium tracking-wide transition-all ${activeTab === 'explore' ? 'bg-[#1a1a1a] text-[#d4af37]' : 'text-gray-400 hover:text-white'}`}>Főoldal</button>
        <button onClick={() => onNav('create')} className={`rounded-xl px-3 py-2 text-xs font-medium tracking-wide transition-all ${activeTab === 'create' ? 'bg-[#1a1a1a] text-[#d4af37]' : 'text-gray-400 hover:text-white'}`}>Hirdetés feladás</button>
        {loggedIn ? (
          <div className="flex items-center gap-2 pl-2 border-l border-[#2a2a2a]">
            <button onClick={() => onNav('profile')} className={`rounded-xl px-3 py-2 text-xs font-medium tracking-wide transition-all ${activeTab === 'profile' ? 'bg-[#1a1a1a] text-[#d4af37]' : 'text-gray-400 hover:text-white'}`}>Profilom</button>
            <button onClick={onLogout} className="rounded-xl px-2 py-2 text-xs text-red-400/70 hover:text-red-400 transition-all">Kilépés</button>
          </div>
        ) : (
          <button onClick={onLoginClick} className="rounded-xl bg-gradient-to-r from-[#d4af37] to-[#aa7c11] px-4 py-2 text-xs font-semibold tracking-wide text-black hover:opacity-90 transition-all">Belépés</button>
        )}
      </div>
    </div>
  </nav>
);

const BottleSlider = ({ value, onChange, disabled }) => {
  const fillPct = disabled ? value : Math.max(5, Math.min(value, 95));
  return (
    <div className="flex flex-col items-center gap-4 py-4 bg-[#161616] rounded-2xl border border-[#232323] relative overflow-hidden">
      <div className="absolute top-2 right-3 text-[10px] text-gray-500 font-mono tracking-wider">VISUAL_FILLER_v2</div>
      <div className="relative w-32 h-44 flex items-end justify-center select-none">
        <svg viewBox="0 0 100 130" className="w-full h-full drop-shadow-[0_8px_24px_rgba(0,0,0,0.6)]">
          <defs>
            <linearGradient id="liqGrad" x1="0%" y1="100%" x2="0%" y2="0%">
              <stop offset="0%" stopColor="#8a5a16" />
              <stop offset="70%" stopColor="#d4af37" />
              <stop offset="100%" stopColor="#fae19c" />
            </linearGradient>
            <clipPath id="bottleClip">
              <path d="M 20 35 C 20 28, 25 25, 35 25 L 65 25 C 75 25, 80 28, 80 35 L 80 115 C 80 125, 75 128, 65 128 L 35 128 C 25 128, 20 125, 20 115 Z" />
            </clipPath>
          </defs>
          <path d="M 42 5 L 58 5 L 58 15 L 42 15 Z" fill="#3a3a3a" />
          <path d="M 40 15 L 60 15 L 60 25 L 40 25 Z" fill="#555" />
          <path d="M 20 35 C 20 28, 25 25, 35 25 L 65 25 C 75 25, 80 28, 80 35 L 80 115 C 80 125, 75 128, 65 128 L 35 128 C 25 128, 20 125, 20 115 Z" fill="none" stroke="#444" strokeWidth="2.5" />
          <g clipPath="url(#bottleClip)">
            <rect x="10" y={130 - (fillPct * 1.03)} width="80" height="130" fill="url(#liqGrad)" opacity="0.85" className="transition-all duration-300 ease-out" />
            <path d={`M 15 ${130 - (fillPct * 1.03)} Q 35 ${126 - (fillPct * 1.03)}, 50 ${130 - (fillPct * 1.03)} T 85 ${130 - (fillPct * 1.03)}`} fill="none" stroke="#fff" strokeWidth="1" opacity="0.4" className="transition-all duration-300 ease-out" />
          </g>
          <path d="M 24 37 C 24 33, 28 30, 35 30 L 65 30 C 72 30, 76 33, 76 37 L 76 113 C 76 120, 72 123, 65 123 L 35 123 C 28 123, 24 120, 24 113 Z" fill="none" stroke="#ffffff" strokeWidth="1" opacity="0.06" />
        </svg>
        <div className="absolute inset-0 flex flex-col items-center justify-end pb-8">
          <span className="text-2xl font-black tracking-tight text-white drop-shadow-[0_2px_4px_rgba(0,0,0,0.9)]">{value}%</span>
          <span className="text-[9px] font-bold uppercase tracking-widest text-gray-400 drop-shadow-[0_1px_2px_rgba(0,0,0,0.9)]">Töltöttség</span>
        </div>
      </div>
      {!disabled && (
        <input type="range" min="5" max="95" value={value} onChange={(e) => onChange(parseInt(e.target.value))} className="w-4/5 accent-[#d4af37] bg-[#222] h-1 rounded-lg appearance-none cursor-pointer" />
      )}
    </div>
  );
};

const RankProgress = ({ sales }) => {
  const { current, next, req, prevReq } = useMemo(() => {
    if (sales < 5) return { current: 'Újonc', next: 'Parfümista', req: 5, prevReq: 0 };
    if (sales < 20) return { current: 'Parfümista', next: 'Illatmester', req: 20, prevReq: 5 };
    return { current: 'Illatmester', next: 'Doyen', req: 50, prevReq: 20 };
  }, [sales]);
  const progressPct = Math.min(100, Math.max(0, ((sales - prevReq) / (req - prevReq)) * 100));

  return (
    <div className="rounded-2xl border border-[#222] bg-[#161616] p-4">
      <div className="flex items-center justify-between text-xs mb-2">
        <span className="text-gray-400">Kereskedői szint</span>
        <span className="font-bold text-[#d4af37]">{current}</span>
      </div>
      <div className="h-1.5 w-full rounded-full bg-[#2a2a2a] overflow-hidden">
        <div className="h-full bg-gradient-to-r from-[#d4af37] to-[#aa7c11] transition-all duration-500" style={{ width: `${progressPct}%` }} />
      </div>
      <div className="mt-2 flex items-center justify-between text-[10px] text-gray-500">
        <span>{sales} sikeres ügylet</span>
        <span>Következő: {next} ({req})</span>
      </div>
    </div>
  );
};

// ==========================================
// FŐ NÉZETEK (VIEWS)
// ==========================================
const Explore = ({ listings, onSelect }) => {
  const [search, setSearch] = useState('');
  const [typeFilter, setTypeFilter] = useState('all');
  const [catFilter, setCatFilter] = useState('all');

  const filtered = useMemo(() => {
    return listings.filter(l => {
      const matchSearch = `${l.brand} ${l.name}`.toLowerCase().includes(search.toLowerCase());
      const matchType = typeFilter === 'all' ? true : l.type === typeFilter;
      const matchCat = catFilter === 'all' ? true : l.category === catFilter;
      return matchSearch && matchType && matchCat && l.status === 'active';
    });
  }, [listings, search, typeFilter, catFilter]);

  return (
    <div className="animate-fade p-4 md:p-8 mx-auto max-w-6xl">
      <div className="mb-8 flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
        <div>
          <h1 className="text-2xl font-bold tracking-tight text-white md:text-3xl">Piac</h1>
          <p className="text-xs text-gray-400 mt-1">Böngéssz a prémium közösségi kínálatban</p>
        </div>
        <div className="flex flex-wrap gap-2">
          {['all', 'sell', 'buy'].map((t) => (
            <button key={t} onClick={() => setTypeFilter(t)} className={`rounded-xl px-4 py-2 text-xs font-medium tracking-wide transition-all ${typeFilter === t ? 'bg-[#d4af37] text-black font-semibold' : 'bg-[#161616] border border-[#222] text-gray-400 hover:text-white'}`}>
              {t === 'all' ? 'Összes' : t === 'sell' ? 'Kínálat' : 'Kereslet'}
            </button>
          ))}
        </div>
      </div>

      <div className="mb-6 flex flex-col gap-3 sm:flex-row">
        <input type="text" placeholder="Keress márkára, illatra..." value={search} onChange={(e) => setSearch(e.target.value)} className="w-full rounded-xl border border-[#222] bg-[#161616] px-4 py-3 text-sm text-white placeholder-gray-500 focus:border-[#d4af37] focus:outline-none transition-all" />
        <select value={catFilter} onChange={(e) => setCatFilter(e.target.value)} className="rounded-xl border border-[#222] bg-[#161616] px-4 py-3 text-sm text-gray-400 focus:border-[#d4af37] focus:outline-none transition-all">
          <option value="all">Minden kategória</option>
          <option value="Niche">Niche</option>
          <option value="Designer">Designer</option>
          <option value="Vintage">Vintage</option>
        </select>
      </div>

      <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
        {filtered.map((item) => (
          <div key={item.id} onClick={() => onSelect(item)} className="group relative cursor-pointer rounded-2xl border border-[#1e1e1e] bg-[#141414] p-5 transition-all duration-300 hover:-translate-y-1 hover:border-[#2a2a2a] hover:bg-[#181818] hover:shadow-[0_12px_30px_rgba(0,0,0,0.5)]">
            <div className="absolute top-4 right-4 rounded-full px-2 py-0.5 text-[9px] font-bold uppercase tracking-wider bg-[#1c1c1c] border border-[#2a2a2a] text-gray-400 group-hover:border-[#d4af37]/30 group-hover:text-[#d4af37] transition-all">
              {item.listing_type === 'full' ? 'Üveges' : 'Dekant'}
            </div>
            <div className="flex items-start gap-4">
              <div className="flex h-12 w-12 items-center justify-center rounded-xl bg-[#1b1b1b] border border-[#262626] text-xl group-hover:scale-105 transition-all">{item.icon || '🧪'}</div>
              <div className="flex-1 min-w-0">
                <span className="block text-[11px] font-bold uppercase tracking-widest text-[#d4af37]">{item.brand}</span>
                <h3 className="truncate text-base font-semibold text-white mt-0.5">{item.name}</h3>
                <p className="text-xs text-gray-500 mt-1 flex items-center gap-2">
                  <span>{item.size}</span>
                  {item.listing_type === 'full' && <span>• {item.fill}%-os</span>}
                  {item.listing_type === 'decant' && <span>• {item.decant_ml} ml maradék</span>}
                </p>
              </div>
            </div>
            <div className="mt-5 flex items-center justify-between border-t border-[#1c1c1c] pt-4">
              <div>
                <span className="text-[10px] block uppercase tracking-wider text-gray-500">Irányár</span>
                <span className="text-base font-bold text-white font-mono">{item.price.toLocaleString()} Ft</span>
              </div>
              <div className="text-right">
                <span className="text-[10px] block uppercase tracking-wider text-gray-500">Típus</span>
                <span className={`text-xs font-semibold ${item.type === 'sell' ? 'text-green-400' : 'text-blue-400'}`}>{item.type === 'sell' ? 'Eladó' : 'Vásárolna'}</span>
              </div>
            </div>
          </div>
        ))}
      </div>
      {filtered.length === 0 && (
        <div className="text-center py-16 bg-[#141414] rounded-2xl border border-[#1e1e1e] mt-4">
          <p className="text-sm text-gray-500">Nem találtunk a keresésnek megfelelő hirdetést.</p>
        </div>
      )}
    </div>
  );
};

const Detail = ({ item, onBack, currentUserId, onStatusChange }) => {
  const [isUpdating, setIsUpdating] = useState(false);

  const handleStatusUpdate = async (newStatus) => {
    setIsUpdating(true);
    // Szimulált backend várakozás
    await new Promise(resolve => setTimeout(resolve, 600));
    onStatusChange(item.id, newStatus);
    setIsUpdating(false);
  };

  return (
    <div className="animate-fade p-4 md:p-8 mx-auto max-w-4xl">
      <button onClick={onBack} className="mb-6 flex items-center gap-2 text-xs font-medium text-gray-400 hover:text-white transition-all">← Vissza a listához</button>
      <div className="grid gap-6 md:grid-cols-3">
        <div className="md:col-span-2 space-y-6">
          <div className="rounded-2xl border border-[#222] bg-[#161616] p-6">
            <div className="flex items-start justify-between">
              <div>
                <span className="text-xs font-bold uppercase tracking-widest text-[#d4af37]">{item.brand}</span>
                <h1 className="text-2xl font-extrabold text-white mt-1 md:text-3xl">{item.name}</h1>
                <div className="mt-3 flex flex-wrap gap-2">
                  <span className="rounded-full bg-[#222] border border-[#333] px-2.5 py-0.5 text-[10px] font-medium text-gray-300">{item.category}</span>
                  {item.swap_ok && <span className="rounded-full bg-purple-500/10 border border-purple-500/20 px-2.5 py-0.5 text-[10px] font-medium text-purple-400">Csere érdekli</span>}
                </div>
              </div>
              <div className="text-right">
                <span className="text-[10px] block uppercase tracking-wider text-gray-500">Irányár</span>
                <span className="text-2xl font-black text-white font-mono">{item.price.toLocaleString()} Ft</span>
              </div>
            </div>
            <div className="mt-6 border-t border-[#222] pt-4">
              <h3 className="text-xs font-bold uppercase tracking-wider text-gray-400 mb-2">Leírás</h3>
              <p className="text-sm text-gray-300 leading-relaxed">{item.description || 'Nincs megadva leírás.'}</p>
            </div>
            {item.tags && item.tags.length > 0 && (
              <div className="mt-4 flex flex-wrap gap-1.5">
                {item.tags.map((t, idx) => (
                  <span key={idx} className="text-[11px] text-gray-500">#{t}</span>
                ))}
              </div>
            )}
          </div>

          {/* Hirdetéskezelő szekció a tulajdonosnak */}
          {item.user_id === currentUserId && (
            <div className="rounded-2xl border border-yellow-600/20 bg-yellow-600/5 p-4">
              <h4 className="text-xs font-bold uppercase tracking-wider text-yellow-500 mb-2">Hirdetéskezelés (Saját hirdetés)</h4>
              <p className="text-xs text-gray-400 mb-3">Módosíthatod a hirdetésed státuszát. A „Lezárt” hirdetések kikerülnek a piactérről.</p>
              <div className="flex gap-2">
                <button disabled={isUpdating || item.status === 'active'} onClick={() => handleStatusUpdate('active')} className={`rounded-xl px-3 py-1.5 text-xs font-medium transition-all ${item.status === 'active' ? 'bg-green-500/20 text-green-400 border border-green-500/30' : 'bg-[#222] text-gray-400 hover:text-white'}`}>Aktív</button>
                <button disabled={isUpdating || item.status === 'sold'} onClick={() => handleStatusUpdate('sold')} className={`rounded-xl px-3 py-1.5 text-xs font-medium transition-all ${item.status === 'sold' ? 'bg-red-500/20 text-red-400 border border-red-500/30' : 'bg-[#222] text-gray-400 hover:text-white'}`}>Lezárt / Elkelt</button>
              </div>
            </div>
          )}
        </div>

        <div className="space-y-6">
          {item.listing_type === 'full' && (
            <BottleSlider value={item.fill} disabled={true} />
          )}
          {item.listing_type === 'decant' && (
            <div className="rounded-2xl border border-[#222] bg-[#161616] p-4 text-center">
              <span className="text-3xl">🧪</span>
              <h3 className="text-lg font-bold text-white mt-2">{item.decant_ml} ml</h3>
              <p className="text-[10px] uppercase tracking-wider text-gray-500 mt-0.5">Fújós / Dekant mennyiség</p>
            </div>
          )}
          <div className="rounded-2xl border border-[#222] bg-[#161616] p-4">
            <h3 className="text-xs font-bold uppercase tracking-wider text-gray-400 mb-3">Kapcsolat</h3>
            <button className="w-full rounded-xl bg-gradient-to-r from-[#d4af37] to-[#aa7c11] py-2.5 text-xs font-bold tracking-wide text-black hover:opacity-95 transition-all">Üzenet küldése</button>
          </div>
        </div>
      </div>
    </div>
  );
};

const CreateListing = ({ onCreate, onCancel }) => {
  const [formData, setFormData] = useState({
    type: 'sell', listing_type: 'full', brand: '', name: '', size: '100ml', fill: 80, decant_ml: 5, condition: 'excellent', price: '', category: 'Niche', description: '', swap_ok: false
  });

  const handleSubmit = (e) => {
    e.preventDefault();
    if (!formData.brand || !formData.name || !formData.price) return;
    onCreate({
      ...formData,
      id: Date.now().toString(),
      price: parseInt(formData.price),
      views: 0,
      status: 'active',
      user_id: 'u1',
      icon: formData.category === 'Niche' ? '👑' : '🌌'
    });
  };

  return (
    <div className="animate-fade p-4 md:p-8 mx-auto max-w-2xl">
      <div className="mb-6">
        <h1 className="text-2xl font-bold tracking-tight text-white">Új hirdetés</h1>
        <p className="text-xs text-gray-400 mt-1">Töltsd fel eladó vagy keresett illatod adatait</p>
      </div>
      <form onSubmit={handleSubmit} className="space-y-5 rounded-2xl border border-[#222] bg-[#161616] p-6">
        <div className="grid gap-4 sm:grid-cols-2">
          <div>
            <label className="block text-[11px] font-bold uppercase tracking-wider text-gray-400 mb-1.5">Hirdetés típusa</label>
            <select value={formData.type} onChange={(e) => setFormData({ ...formData, type: e.target.value })} className="w-full rounded-xl border border-[#2a2a2a] bg-[#111] px-3 py-2.5 text-xs text-white focus:border-[#d4af37] focus:outline-none">
              <option value="sell">Eladni szeretnék (Kínálat)</option>
              <option value="buy">Venni szeretnék (Kereslet)</option>
            </select>
          </div>
          <div>
            <label className="block text-[11px] font-bold uppercase tracking-wider text-gray-400 mb-1.5">Kiszerelés</label>
            <select value={formData.listing_type} onChange={(e) => setFormData({ ...formData, listing_type: e.target.value })} className="w-full rounded-xl border border-[#2a2a2a] bg-[#111] px-3 py-2.5 text-xs text-white focus:border-[#d4af37] focus:outline-none">
              <option value="full">Gyári üveges parfüm</option>
              <option value="decant">Dekant / Fújós maradvány</option>
            </select>
          </div>
        </div>

        <div className="grid gap-4 sm:grid-cols-2">
          <div>
            <label className="block text-[11px] font-bold uppercase tracking-wider text-gray-400 mb-1.5">Márka *</label>
            <input type="text" required placeholder="pl: Creed, Tom Ford..." value={formData.brand} onChange={(e) => setFormData({ ...formData, brand: e.target.value })} className="w-full rounded-xl border border-[#2a2a2a] bg-[#111] px-3 py-2.5 text-xs text-white placeholder-gray-600 focus:border-[#d4af37] focus:outline-none" />
          </div>
          <div>
            <label className="block text-[11px] font-bold uppercase tracking-wider text-gray-400 mb-1.5">Illat neve *</label>
            <input type="text" required placeholder="pl: Aventus, Oud Wood..." value={formData.name} onChange={(e) => setFormData({ ...formData, name: e.target.value })} className="w-full rounded-xl border border-[#2a2a2a] bg-[#111] px-3 py-2.5 text-xs text-white placeholder-gray-600 focus:border-[#d4af37] focus:outline-none" />
          </div>
        </div>

        {formData.listing_type === 'full' ? (
          <div className="grid gap-4 sm:grid-cols-3 items-end">
            <div>
              <label className="block text-[11px] font-bold uppercase tracking-wider text-gray-400 mb-1.5">Üveg mérete</label>
              <input type="text" placeholder="pl: 100ml, 50ml" value={formData.size} onChange={(e) => setFormData({ ...formData, size: e.target.value })} className="w-full rounded-xl border border-[#2a2a2a] bg-[#111] px-3 py-2.5 text-xs text-white focus:border-[#d4af37] focus:outline-none" />
            </div>
            <div className="sm:col-span-2">
              <BottleSlider value={formData.fill} onChange={(v) => setFormData({ ...formData, fill: v })} />
            </div>
          </div>
        ) : (
          <div className="grid gap-4 sm:grid-cols-2">
            <div>
              <label className="block text-[11px] font-bold uppercase tracking-wider text-gray-400 mb-1.5">Fújós mérete (ml)</label>
              <input type="number" value={formData.decant_ml} onChange={(e) => setFormData({ ...formData, decant_ml: parseInt(e.target.value) || 0 })} className="w-full rounded-xl border border-[#2a2a2a] bg-[#111] px-3 py-2.5 text-xs text-white focus:border-[#d4af37] focus:outline-none" />
            </div>
            <div>
              <label className="block text-[11px] font-bold uppercase tracking-wider text-gray-400 mb-1.5">Tároló típusa</label>
              <input type="text" placeholder="pl: Minőségi üveg fújós" value={formData.size} onChange={(e) => setFormData({ ...formData, size: e.target.value })} className="w-full rounded-xl border border-[#2a2a2a] bg-[#111] px-3 py-2.5 text-xs text-white focus:border-[#d4af37] focus:outline-none" />
            </div>
          </div>
        )}

        <div className="grid gap-4 sm:grid-cols-3">
          <div className="sm:col-span-2">
            <label className="block text-[11px] font-bold uppercase tracking-wider text-gray-400 mb-1.5">Irányár (Ft) *</label>
            <input type="number" required placeholder="Összeg forintban" value={formData.price} onChange={(e) => setFormData({ ...formData, price: e.target.value })} className="w-full rounded-xl border border-[#2a2a2a] bg-[#111] px-3 py-2.5 text-xs text-white placeholder-gray-600 focus:border-[#d4af37] focus:outline-none font-mono" />
          </div>
          <div>
            <label className="block text-[11px] font-bold uppercase tracking-wider text-gray-400 mb-1.5">Kategória</label>
            <select value={formData.category} onChange={(e) => setFormData({ ...formData, category: e.target.value })} className="w-full rounded-xl border border-[#2a2a2a] bg-[#111] px-3 py-2.5 text-xs text-white focus:border-[#d4af37] focus:outline-none">
              <option value="Niche">Niche</option>
              <option value="Designer">Designer</option>
              <option value="Vintage">Vintage</option>
            </select>
          </div>
        </div>

        <div>
          <label className="block text-[11px] font-bold uppercase tracking-wider text-gray-400 mb-1.5">Leírás / Állapot részletei</label>
          <textarea rows="3" placeholder="Batch kód, tárolási körülmények, csere-beállítások..." value={formData.description} onChange={(e) => setFormData({ ...formData, description: e.target.value })} className="w-full rounded-xl border border-[#2a2a2a] bg-[#111] px-3 py-2.5 text-xs text-white placeholder-gray-600 focus:border-[#d4af37] focus:outline-none resize-none"></textarea>
        </div>

        <div className="flex items-center gap-2">
          <input type="checkbox" id="swap" checked={formData.swap_ok} onChange={(e) => setFormData({ ...formData, swap_ok: e.target.checked })} className="accent-[#d4af37]" />
          <label htmlFor="swap" className="text-xs text-gray-300 cursor-pointer">Csereajánlatokat is meghallgatok</label>
        </div>

        <div className="flex justify-end gap-2 border-t border-[#222] pt-4">
          <button type="button" onClick={onCancel} className="rounded-xl bg-[#222] px-4 py-2 text-xs font-medium text-gray-400 hover:text-white transition-all">Mégse</button>
          <button type="submit" className="rounded-xl bg-gradient-to-r from-[#d4af37] to-[#aa7c11] px-5 py-2 text-xs font-bold text-black hover:opacity-90 transition-all">Mentés és publikálás</button>
        </div>
      </form>
    </div>
  );
};

const Profile = ({ user, listings, onSelect }) => {
  const userListings = useMemo(() => listings.filter(l => l.user_id === user.id), [listings, user.id]);
  return (
    <div className="animate-fade p-4 md:p-8 mx-auto max-w-4xl space-y-6">
      <div className="rounded-2xl border border-[#222] bg-[#161616] p-6 flex flex-col sm:flex-row justify-between gap-4">
        <div className="flex items-start gap-4">
          <div className="h-14 w-14 rounded-full bg-[#252525] flex items-center justify-center text-2xl font-bold border border-[#333]">
            {user.name[0]}
          </div>
          <div>
            <div className="flex items-center gap-2">
              <h2 className="text-xl font-bold text-white">{user.name}</h2>
              {user.verified && <span className="text-[10px] bg-blue-500/10 text-blue-400 px-2 py-0.5 rounded-full border border-blue-500/20 font-bold uppercase">Ellenőrzött</span>}
            </div>
            <p className="text-xs text-gray-500 mt-0.5">{user.location}</p>
            <p className="text-xs text-gray-300 mt-2 max-w-md">{user.bio}</p>
          </div>
        </div>
        <div className="sm:text-right border-t border-[#222] sm:border-0 pt-4 sm:pt-0">
          <span className="text-[10px] uppercase tracking-wider text-gray-500 block">Értékelés</span>
          <span className="text-2xl font-black text-[#d4af37] font-mono">{user.rating}</span>
          <span className="text-xs text-gray-500 block">({user.rating_count} visszajelzés)</span>
        </div>
      </div>

      <RankProgress sales={user.sales} />

      <div>
        <h3 className="text-sm font-bold uppercase tracking-wider text-gray-400 mb-3">Saját hirdetéseim ({userListings.length})</h3>
        <div className="grid gap-3 sm:grid-cols-2">
          {userListings.map(l => (
            <div key={l.id} onClick={() => onSelect(l)} className="p-4 rounded-xl border border-[#1e1e1e] bg-[#141414] flex justify-between items-center cursor-pointer hover:border-[#333] transition-all">
              <div>
                <span className="text-[10px] text-[#d4af37] uppercase tracking-wider font-semibold">{l.brand}</span>
                <h4 className="text-sm font-bold text-white truncate max-w-[180px]">{l.name}</h4>
                <span className={`text-[10px] inline-block px-1.5 py-0.2 rounded mt-1 font-medium ${l.status === 'active' ? 'bg-green-500/10 text-green-400' : 'bg-red-500/10 text-red-400'}`}>
                  {l.status === 'active' ? 'Aktív' : 'Elkelt/Lezárt'}
                </span>
              </div>
              <span className="text-sm font-mono font-bold text-white">{l.price.toLocaleString()} Ft</span>
            </div>
          ))}
        </div>
      </div>
    </div>
  );
};

const LoginModal = ({ isOpen, onClose, onLoginSuccess }) => {
  if (!isOpen) return null;
  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/80 backdrop-blur-sm p-4">
      <div className="w-full max-w-sm rounded-2xl border border-[#222] bg-[#161616] p-6 relative animate-fade">
        <button onClick={onClose} className="absolute top-4 right-4 text-gray-500 hover:text-white">✕</button>
        <h2 className="text-lg font-bold text-white mb-1">Belépés</h2>
        <p className="text-xs text-gray-400 mb-4">Csatlakozz a prémium parfümközösséghez</p>
        <div className="space-y-3">
          <div>
            <label className="block text-[10px] font-bold uppercase tracking-wider text-gray-400 mb-1">E-mail cím</label>
            <input type="email" placeholder="example@scentrade.hu" className="w-full rounded-xl border border-[#2a2a2a] bg-[#111] px-3 py-2 text-xs text-white focus:outline-none focus:border-[#d4af37]" />
          </div>
          <div>
            <label className="block text-[10px] font-bold uppercase tracking-wider text-gray-400 mb-1">Jelszó</label>
            <input type="password" placeholder="••••••••" className="w-full rounded-xl border border-[#2a2a2a] bg-[#111] px-3 py-2 text-xs text-white focus:outline-none focus:border-[#d4af37]" />
          </div>
          <button onClick={onLoginSuccess} className="w-full rounded-xl bg-gradient-to-r from-[#d4af37] to-[#aa7c11] py-2 text-xs font-bold text-black mt-2 hover:opacity-90 transition-all">Gombnyomásra belépés (Demo)</button>
        </div>
      </div>
    </div>
  );
};

// ==========================================
// FŐ APP KOMPONENS
// ==========================================
export default function App() {
  const [view, setView] = useState('explore'); 
  const [listings, setListings] = useState(INITIAL_LISTINGS);
  const [selectedItem, setSelectedItem] = useState(null);
  const [loggedIn, setLoggedIn] = useState(true); 
  const [isLoginOpen, setIsLoginOpen] = useState(false);

  const handleSelectItem = (item) => {
    setSelectedItem(item);
    setView('detail');
  };

  const handleCreate = (newListing) => {
    setListings([newListing, ...listings]);
    setView('explore');
  };

  const handleStatusChange = (id, newStatus) => {
    setListings(prev => prev.map(l => l.id === id ? { ...l, status: newStatus } : l));
    setSelectedItem(prev => prev && prev.id === id ? { ...prev, status: newStatus } : prev);
  };

  return (
    <div className="min-h-screen bg-[#0d0d0d] text-gray-100 font-sans antialiased selection:bg-[#d4af37]/30 selection:text-white">
      <Nav activeTab={view} onNav={(v) => { setView(v); if (v !== 'detail') setSelectedItem(null); }} loggedIn={loggedIn} onLogout={() => setLoggedIn(false)} onLoginClick={() => setIsLoginOpen(true)} />

      <main className="pb-16">
        {view === 'explore' && <Explore listings={listings} onSelect={handleSelectItem} />}
        {view === 'detail' && selectedItem && (
          <Detail item={selectedItem} onBack={() => { setView('explore'); setSelectedItem(null); }} currentUserId={CURRENT_USER.id} onStatusChange={handleStatusChange} />
        )}
        {view === 'create' && <CreateListing onCreate={handleCreate} onCancel={() => setView('explore')} />}
        {view === 'profile' && <Profile user={CURRENT_USER} listings={listings} onSelect={handleSelectItem} />}
      </main>

      <LoginModal isOpen={isLoginOpen} onClose={() => setIsLoginOpen(false)} onLoginSuccess={() => { setLoggedIn(true); setIsLoginOpen(false); setView('explore'); }} />

      {/* ==========================================
          GLOBÁLIS STRUKTURÁLIS CSS ANIMÁCIÓK
          ========================================== */}
      <style>{`
        .nav-blur {
          backdrop-filter: blur(12px);
          -webkit-backdrop-filter: blur(12px);
        }
        @keyframes fadeIn {
          from { opacity: 0; transform: translateY(8px); }
          to { opacity: 1; transform: translateY(0); }
        }
        .animate-fade {
          animation: fadeIn 0.25s cubic-bezier(0.16, 1, 0.3, 1) forwards;
        }
      `}</style>
    </div>
  );
}