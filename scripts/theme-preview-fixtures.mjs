const fixtureDefinitions = [
  ["01", "Ana Sayfa", "customer", "normal / hızlı erişim", "app/(tabs)/index.tsx", "/"],
  ["02", "Keşfet", "customer", "kategori / loading / empty", "app/(tabs)/explore.tsx", "/explore"],
  ["03", "MoveAI", "customer", "normal / input", "app/ai-assistant.tsx", "/ai-assistant"],
  ["04", "Hizmet Talebi", "customer", "form / disabled", "app/create-service.tsx", "/create-service"],
  ["05", "Profesyonel Listesi", "customer", "liste / empty", "app/category/[id].tsx", "/category/[id]"],
  ["06", "Teklifler", "customer", "karşılaştırma / warning", "app/compare-providers.tsx", "/compare-providers"],
  ["07", "Ödeme", "customer", "özet / disabled", "app/payment/checkout.tsx", "/payment/checkout"],
  ["08", "Aktif İş / Canlı Takip", "customer", "aktif durum / ETA", "app/tracking/live.tsx", "/tracking/live"],
  ["09", "İşlerim", "customer", "sekme / empty", "app/(tabs)/my-jobs.tsx", "/my-jobs"],
  ["10", "Mesajlar", "customer", "konuşma / unread", "app/(tabs)/messages.tsx", "/messages"],
  ["11", "MoveWallet", "customer", "bakiye / işlem özeti", "app/(tabs)/wallet.tsx", "/wallet"],
  ["12", "Profil", "customer", "hesap menüsü", "app/(tabs)/profile.tsx", "/profile"],
  ["13", "Profesyonel Dashboard", "provider", "kazanç / durum", "app/provider-dashboard.tsx", "/provider-dashboard"],
  ["14", "Yeni İş Fırsatları", "provider", "fırsat / CTA", "app/provider-opportunities.tsx", "/provider-opportunities"],
].map(([id, screenName, role, requestedState, productionSource, productionRoute]) => ({
  id,
  screenName,
  role,
  requestedState,
  productionSource,
  productionRoute,
  isolationStatus: "BLOCKED_COMPONENT_NOT_ISOLATABLE",
  importedComponent: "NONE — production component import intentionally blocked",
  syntheticState: "NOT_APPLIED — no safe immutable adapter exists without importing the product data/auth boundary",
  blocker: "Route module directly depends on app-level router, theme/i18n and data/auth or device/payment integrations. No module substitution, auth bypass, network interception, or hand-drawn substitute is permitted.",
}));

export const fixtureCount = fixtureDefinitions.length;

const escapeHtml = (value) => String(value)
  .replaceAll("&", "&amp;")
  .replaceAll("<", "&lt;")
  .replaceAll(">", "&gt;")
  .replaceAll('"', "&quot;")
  .replaceAll("'", "&#039;");

const themeStyles = `
  :root { color-scheme: light dark; --background:#ffffff; --surface:#f6f7fb; --foreground:#11181c; --muted:#53606c; --border:#d9dde5; --primary:#7057e8; --warning:#9a5200; --danger:#b42318; --on-primary:#ffffff; }
  @media (prefers-color-scheme: dark) { :root { --background:#0d0f13; --surface:#181b22; --foreground:#f2f5f8; --muted:#b2bbc6; --border:#374151; --primary:#a78bfa; --warning:#fbbf24; --danger:#fda4af; --on-primary:#1b1138; } }
  * { box-sizing:border-box; } body { margin:0; min-width:320px; background:var(--background); color:var(--foreground); font-family:-apple-system,BlinkMacSystemFont,"Segoe UI",sans-serif; } main { width:min(100%,620px); margin:0 auto; padding:42px 18px; } .eyebrow { margin:0 0 8px; color:var(--primary); font-size:11px; font-weight:800; letter-spacing:.09em; } h1 { margin:0; font-size:28px; line-height:1.2; } .subtitle { margin:8px 0 0; color:var(--muted); line-height:1.55; } .theme-state::after { content:"Light"; font-weight:800; color:var(--foreground); } @media (prefers-color-scheme: dark) { .theme-state::after { content:"Dark"; } }
  .status,.block { margin:20px 0; padding:12px; border:1px solid var(--primary); border-radius:14px; background:color-mix(in srgb,var(--primary) 12%,transparent); font-size:12px; font-weight:800; }.block { border-color:var(--danger); background:color-mix(in srgb,var(--danger) 12%,transparent); line-height:1.5; }.fixtures { display:grid; gap:10px; }.fixture-card { display:block; padding:14px; border:1px solid var(--border); border-radius:16px; background:var(--surface); color:inherit; text-decoration:none; }.fixture-card:focus-visible { outline:3px solid var(--primary); outline-offset:2px; }.fixture-card:active { opacity:.8; }.fixture-number { color:var(--primary); font-size:12px; font-weight:900; letter-spacing:.08em; }.fixture-card h2 { margin:5px 0 4px; font-size:17px; }.fixture-card p { margin:0; color:var(--muted); font-size:12px; line-height:1.55; }.fixture-card code,.meta code { color:var(--muted); font-size:11px; }.detail { display:grid; gap:14px; }.meta { padding:14px; border:1px solid var(--border); border-radius:16px; background:var(--surface); }.meta dl { margin:0; display:grid; gap:11px; }.meta dt { color:var(--muted); font-size:12px; font-weight:700; }.meta dd { margin:3px 0 0; overflow-wrap:anywhere; font-size:14px; line-height:1.5; }.nav { display:grid; grid-template-columns:1fr auto 1fr; gap:10px; align-items:center; }.nav a { min-height:42px; padding:11px; border:1px solid var(--border); border-radius:12px; background:var(--surface); color:var(--foreground); text-align:center; text-decoration:none; font-size:13px; font-weight:800; }.nav a[aria-disabled="true"] { pointer-events:none; opacity:.45; }.tag { display:inline-block; margin-top:8px; padding:5px 7px; border-radius:7px; background:var(--border); color:var(--foreground); font-size:11px; font-weight:800; }
`;

const page = (title, body) => `<!doctype html><html lang="tr"><head><meta charset="utf-8"/><meta name="viewport" content="width=device-width, initial-scale=1"/><meta name="color-scheme" content="light dark"/><title>${escapeHtml(title)}</title><style>${themeStyles}</style></head><body>${body}</body></html>`;

export function renderGallery() {
  const cards = fixtureDefinitions.map((fixture) => `<a class="fixture-card" data-fixture-id="${fixture.id}" href="/fixture/${fixture.id}" aria-label="${fixture.id} ${escapeHtml(fixture.screenName)} fixture ayrıntısını aç"><div class="fixture-number">${fixture.id} · ${escapeHtml(fixture.isolationStatus)}</div><h2>${escapeHtml(fixture.screenName)}</h2><p>${escapeHtml(fixture.role)} · ${escapeHtml(fixture.requestedState)}</p><code>${escapeHtml(fixture.productionSource)}</code></a>`).join("");
  return page("Move&Fix Tema Fixture Gallery", `<main><p class="eyebrow">DEVELOPMENT-ONLY · NO DB · NO NETWORK</p><h1>Move&amp;Fix Tema Fixture Gallery</h1><p class="subtitle">Sistem teması: <span class="theme-state" aria-label="Sistem teması"></span></p><div class="status">${fixtureCount} kart tıklanabilir. Kanıt durumu: WAITING_FOR_OWNER_PHYSICAL_SCREENSHOTS.</div><section class="fixtures" aria-label="14 fixture detay bağlantısı">${cards}</section></main>`);
}

export function renderFixtureDetail(id) {
  const index = fixtureDefinitions.findIndex((fixture) => fixture.id === id);
  if (index === -1) return null;
  const fixture = fixtureDefinitions[index];
  const previous = fixtureDefinitions[index - 1];
  const next = fixtureDefinitions[index + 1];
  const nav = `<nav class="nav" aria-label="Fixture gezintisi"><a href="${previous ? `/fixture/${previous.id}` : "#"}" ${previous ? "" : 'aria-disabled="true"'}>${previous ? `← ${previous.id}` : "←"}</a><a href="/">Galeri</a><a href="${next ? `/fixture/${next.id}` : "#"}" ${next ? "" : 'aria-disabled="true"'}>${next ? `${next.id} →` : "→"}</a></nav>`;
  const rows = [["Ekran", fixture.screenName], ["Rol", fixture.role], ["İstenen UI durumu", fixture.requestedState], ["Production source", `<code>${fixture.productionSource}</code>`], ["Production route", `<code>${fixture.productionRoute}</code>`], ["Gerçek component import", fixture.importedComponent], ["Sentetik state", fixture.syntheticState], ["Kanıt durumu", "WAITING_FOR_OWNER_PHYSICAL_SCREENSHOTS"]].map(([term, value]) => `<div><dt>${escapeHtml(term)}</dt><dd>${value}</dd></div>`).join("");
  return page(`${fixture.id} — ${fixture.screenName}`, `<main><p class="eyebrow">COMPONENT_FIXTURE — ROUTE E2E DEĞİLDİR</p><h1>${fixture.id} — ${escapeHtml(fixture.screenName)}</h1><p class="subtitle">Sistem teması: <span class="theme-state" aria-label="Sistem teması"></span></p><div class="detail">${nav}<div class="block"><strong>${fixture.isolationStatus}</strong><br/>${escapeHtml(fixture.blocker)}</div><section class="meta" aria-label="Fixture izolasyon kaydı"><dl>${rows}</dl><span class="tag">Gerçek ekran render edilmedi; benzer veya yeniden çizilmiş UI gösterilmedi.</span></section>${nav}</div></main>`);
}
