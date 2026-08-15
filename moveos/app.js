const $ = (selector) => document.querySelector(selector);
const money = new Intl.NumberFormat("tr-TR", { style: "currency", currency: "TRY", maximumFractionDigits: 0 });

function notice(message, error = false) {
  const target = $("#notice");
  target.textContent = message;
  target.className = error ? "notice error" : "notice";
}

class ApiError extends Error {
  constructor(message, status) { super(message); this.status = status; }
}

async function api(path, options = {}) {
  const response = await fetch(path, { credentials: "include", headers: { "Content-Type": "application/json", ...(options.headers || {}) }, ...options });
  const body = await response.json().catch(() => ({ error: "Yanıt okunamadı" }));
  if (!response.ok) throw new ApiError(body.error || `İstek başarısız: ${response.status}`, response.status);
  return body;
}

function setMfaVisible(visible, message = "") {
  $("#mfa-panel").hidden = !visible;
  $("#dashboard").hidden = visible;
  $("#mfa-help").textContent = message;
}

function isMfaRequired(error) { return error instanceof ApiError && error.status === 412; }

function status(active) { return `<span class="status ${active ? "active" : "inactive"}">${active ? "Aktif" : "Arşivde"}</span>`; }

function renderDashboard(metrics) {
  $("#active-users").textContent = String(metrics.activeUsers ?? 0);
  $("#active-providers").textContent = String(metrics.activeProviders ?? 0);
  $("#daily-orders").textContent = String(metrics.dailyOrders ?? 0);
  $("#total-revenue").textContent = money.format(metrics.totalRevenue ?? 0);
  $("#commission-revenue").textContent = money.format(metrics.commissionRevenue ?? 0);
  $("#pending-payments").textContent = money.format(metrics.pendingPayments ?? 0);
}

function renderCategories(categories) {
  $("#categories-list").innerHTML = categories.map((category) => `
    <tr><td>${escapeHtml(category.name)}</td><td>${escapeHtml(category.pricingType || "fixed")}</td><td>${status(Boolean(category.isActive))}</td>
    <td><button class="row-action" type="button" data-archive="${category.id}" ${category.isActive ? "" : "disabled"}>Arşivle</button></td></tr>`).join("") || "<tr><td colspan=\"4\">Kategori bulunamadı.</td></tr>";
  document.querySelectorAll("[data-archive]").forEach((button) => button.addEventListener("click", async () => {
    if (!window.confirm("Bu kategori arşivlenecek. Devam edilsin mi?")) return;
    try { await api(`/api/owner/categories/${button.dataset.archive}`, { method: "DELETE" }); await loadData(); notice("Kategori arşivlendi."); }
    catch (error) { notice(error.message, true); }
  }));
}

function renderUsers(result) {
  const users = Array.isArray(result) ? result : result.items || result.users || [];
  $("#users-list").innerHTML = users.map((user) => `<tr><td>${escapeHtml(user.name || user.email || "Bilinmiyor")}</td><td>${escapeHtml(user.role || "user")}</td><td>${status(!user.banned)}</td></tr>`).join("") || "<tr><td colspan=\"3\">Kullanıcı bulunamadı.</td></tr>";
}

function countryGateStatus(overview) {
  if (overview.gate?.status === "enabled") return "Etkin";
  if (overview.evaluation?.ready) return "Açılmaya hazır";
  return `Bloklu (${overview.evaluation?.missing?.length || 0} eksik)`;
}

function renderCountryCompliance(overviews) {
  const rows = Array.isArray(overviews) ? overviews : [];
  $("#country-compliance-list").innerHTML = rows.map((overview) => {
    const country = overview.jurisdiction || {};
    const source = `${overview.verifiedSourceCount || 0}/${overview.sourceCount || 0} doğrulanmış`;
    const marketplace = overview.gate?.status === "enabled" ? "Etkin" : "Kapalı";
    return `<tr><td>${escapeHtml(country.displayName || country.countryCode || "Bilinmiyor")}${country.regionCode ? ` · ${escapeHtml(country.regionCode)}` : ""}</td><td>${escapeHtml(overview.currentPackage?.status || "Paket yok")}</td><td>${escapeHtml(source)}</td><td>${escapeHtml(countryGateStatus(overview))}</td><td>${escapeHtml(marketplace)}</td></tr>`;
  }).join("") || "<tr><td colspan=\"5\">Henüz ülke uyum paketi yok.</td></tr>";
}

function escapeHtml(value) { const element = document.createElement("div"); element.textContent = String(value ?? ""); return element.innerHTML; }

function formatDate(value) {
  if (!value) return "—";
  const date = new Date(value);
  return Number.isNaN(date.getTime()) ? "—" : date.toLocaleDateString("tr-TR");
}

function renderSettlementPolicies(result) {
  const policies = Array.isArray(result) ? result : result.items || result.policies || [];
  $("#settlement-policies-list").innerHTML = policies.map((policy) => {
    const scope = [policy.countryCode, policy.categoryId ? `kategori #${policy.categoryId}` : "tüm kategoriler", policy.gatewayProvider || "any"].join(" · ");
    const rate = Number(policy.commissionRateBps || 0) / 100;
    const canRetire = policy.status !== "retired";
    return `<tr><td>${escapeHtml(scope)}</td><td>${escapeHtml(policy.version)}</td><td>%${escapeHtml(rate.toLocaleString("tr-TR", { maximumFractionDigits: 2 }))}</td><td>${escapeHtml(policy.completionReviewHours)} saat</td><td>${escapeHtml(policy.status)}</td><td>${escapeHtml(formatDate(policy.effectiveFrom))}</td><td>${canRetire ? `<button class="row-action" type="button" data-retire-policy="${policy.id}">Emekliye ayır</button>` : "—"}</td></tr>`;
  }).join("") || "<tr><td colspan=\"7\">Settlement policy bulunamadı.</td></tr>";
  document.querySelectorAll("[data-retire-policy]").forEach((button) => button.addEventListener("click", async () => {
    if (!window.confirm("Bu policy yalnız gelecekteki anlaşmalar için emekliye ayrılır. Mevcut snapshot’lar değişmez. Devam edilsin mi?")) return;
    try {
      await api(`/api/owner/settlement-policies/${button.dataset.retirePolicy}/retire`, { method: "POST" });
      await loadData();
      notice("Settlement policy emekliye ayrıldı; mevcut anlaşma snapshot’ları korunuyor.");
    } catch (error) { notice(error.message, true); }
  }));
}

function renderCancellationCases(result) {
  const cases = Array.isArray(result) ? result : result.items || result.cases || [];
  $("#cancellation-cases-list").innerHTML = cases.map((item) => {
    const reviewable = item.status === "requested" || item.status === "under_review";
    const plan = item.refundAmount === null || item.refundAmount === undefined
      ? "Gateway planı yok"
      : `İade ${money.format(item.refundAmount)} · Net ${money.format(item.providerPayoutAmount || 0)} · Komisyon ${money.format(item.commissionAmount || 0)}`;
    return `<tr><td>#${escapeHtml(item.requestId)}</td><td>#${escapeHtml(item.openedByUserId)}</td><td>${escapeHtml(item.reasonCode)}</td><td>${escapeHtml(item.status)}</td><td>${escapeHtml(item.settlementOutcome || "pending")}</td><td>${escapeHtml(plan)}</td><td>${reviewable ? `<button class="row-action" type="button" data-review-cancellation="${item.requestId}">İncele</button>` : "—"}</td></tr>`;
  }).join("") || "<tr><td colspan=\"7\">İncelenecek iptal kaydı bulunamadı.</td></tr>";
  document.querySelectorAll("[data-review-cancellation]").forEach((button) => button.addEventListener("click", async () => {
    const settlementOutcome = window.prompt("Önerilen sonuç: refund, partial_refund, provider_payable veya no_payment", "refund");
    if (!settlementOutcome) return;
    const normalizedOutcome = settlementOutcome.trim();
    if (!["refund", "partial_refund", "provider_payable", "no_payment"].includes(normalizedOutcome)) {
      notice("Geçersiz settlement sonucu.", true);
      return;
    }
    let refundAmount;
    if (normalizedOutcome === "partial_refund") {
      const refundInput = window.prompt("Müşteriye iade edilecek tam TL tutarı (0’dan büyük, toplam ödemeden küçük)");
      if (refundInput === null) return;
      refundAmount = Number(refundInput.trim());
      if (!Number.isSafeInteger(refundAmount) || refundAmount <= 0) {
        notice("Kısmi iade tutarı geçerli bir tam TL tutarı olmalıdır.", true);
        return;
      }
    }
    const resolutionNote = window.prompt("İnsan incelemesi gerekçesi (en az 10 karakter)");
    if (!resolutionNote) return;
    if (!window.confirm("Bu inceleme kayda alınır. Para yalnız doğrulanmış gateway olayıyla hareket eder. Devam edilsin mi?")) return;
    try {
      await api(`/api/owner/cancellation-cases/${button.dataset.reviewCancellation}/review`, {
        method: "POST",
        body: JSON.stringify({
          settlementOutcome: normalizedOutcome,
          resolutionNote,
          ...(refundAmount === undefined ? {} : { refundAmount }),
        }),
      });
      await loadData();
      notice("İptal inceleme sonucu kaydedildi; gateway doğrulaması bekleniyor.");
    } catch (error) { notice(error.message, true); }
  }));
}

function renderChangeOrders(result) {
  const orders = Array.isArray(result) ? result : result.items || result.changeOrders || [];
  $("#change-orders-list").innerHTML = orders.map((order) => {
    const amount = Number(order.amountDelta || 0).toLocaleString("tr-TR");
    return `<tr><td>#${escapeHtml(order.requestId)}</td><td>#${escapeHtml(order.requestedByUserId)}</td><td>${escapeHtml(order.kind)}</td><td>${escapeHtml(amount)} ₺</td><td>${escapeHtml(order.status)}</td><td>${escapeHtml(formatDate(order.createdAt))}</td></tr>`;
  }).join("") || "<tr><td colspan=\"6\">Change order kaydı bulunamadı.</td></tr>";
}

function renderRiskFlags(result) {
  const flags = Array.isArray(result) ? result : result.items || result.riskFlags || [];
  $("#risk-flags-list").innerHTML = flags.map((flag) => {
    const reviewable = flag.status === "open" || flag.status === "under_review";
    return `<tr><td>#${escapeHtml(flag.subjectUserId)}</td><td>${flag.relatedRequestId ? `#${escapeHtml(flag.relatedRequestId)}` : "—"}</td><td>${escapeHtml(flag.source)} / ${escapeHtml(flag.reasonCode)}</td><td>${escapeHtml(flag.severity)}</td><td>${escapeHtml(flag.status)}</td><td>${escapeHtml(formatDate(flag.createdAt))}</td><td>${reviewable ? `<button class="row-action" type="button" data-review-risk="${flag.id}">İncele</button>` : "—"}</td></tr>`;
  }).join("") || "<tr><td colspan=\"7\">İncelenecek risk sinyali bulunamadı.</td></tr>";
  document.querySelectorAll("[data-review-risk]").forEach((button) => button.addEventListener("click", async () => {
    const decision = window.prompt("Karar: under_review, resolved veya dismissed", "under_review");
    if (!decision) return;
    const normalizedDecision = decision.trim();
    if (!["under_review", "resolved", "dismissed"].includes(normalizedDecision)) {
      notice("Geçersiz risk kararı.", true);
      return;
    }
    const reviewNote = window.prompt("İnsan incelemesi gerekçesi (en az 10 karakter)");
    if (!reviewNote) return;
    if (!window.confirm("Risk kaydı silinmeden insan inceleme kararıyla güncellenecek. Devam edilsin mi?")) return;
    try {
      await api(`/api/owner/risk-flags/${button.dataset.reviewRisk}/review`, {
        method: "POST",
        body: JSON.stringify({ decision: normalizedDecision, reviewNote }),
      });
      await loadData();
      notice("Risk inceleme kararı kaydedildi.");
    } catch (error) { notice(error.message, true); }
  }));
}

async function loadData() {
  notice("Veriler yenileniyor…");
  const [metrics, categories, users, countryCompliance, settlementPolicies, cancellationCases, changeOrders, riskFlags] = await Promise.all([api("/api/owner/dashboard"), api("/api/owner/categories"), api("/api/owner/users?limit=10"), api("/api/owner/compliance/countries"), api("/api/owner/settlement-policies?limit=20"), api("/api/owner/cancellation-cases?limit=20"), api("/api/owner/change-orders?limit=20"), api("/api/owner/risk-flags?limit=50")]);
  renderDashboard(metrics); renderCategories(categories); renderUsers(users); renderCountryCompliance(countryCompliance); renderSettlementPolicies(settlementPolicies); renderCancellationCases(cancellationCases); renderChangeOrders(changeOrders); renderRiskFlags(riskFlags);
  setMfaVisible(false);
  $("#dashboard").hidden = false;
  notice("Gerçek ortak API verileri güncellendi.");
}

async function requestMfaCode() {
  const button = $("#mfa-request");
  button.disabled = true;
  try {
    const result = await api("/api/owner/mfa/request", { method: "POST" });
    setMfaVisible(true, `Kod gönderildi. Kod ${Math.floor((result.expiresInSeconds || 600) / 60)} dakika geçerlidir.`);
    $("#mfa-code").focus();
  } catch (error) {
    setMfaVisible(true, "Kod gönderilemedi. E-posta teslimat yapılandırmasını ve ortak oturumunuzu kontrol edin.");
    notice(error.message, true);
  } finally { button.disabled = false; }
}

async function verifyMfaCode(event) {
  event.preventDefault();
  const code = $("#mfa-code").value.trim();
  const button = $("#mfa-verify");
  button.disabled = true;
  try {
    await api("/api/owner/mfa/verify", { method: "POST", body: JSON.stringify({ code }) });
    $("#mfa-code").value = "";
    await loadData();
    notice("İkinci faktör doğrulandı. Yönetici erişimi 30 dakika süreyle açık.");
  } catch (error) {
    setMfaVisible(true, "Kod geçersiz, kullanılmış veya süresi dolmuş olabilir. Yeni kod isteyin.");
    notice(error.message, true);
  } finally { button.disabled = false; }
}

async function bootstrap() {
  try {
    const session = await api("/api/auth/me");
    if (session.user?.role !== "admin") throw new Error("Bu MoveOS alanı yalnız yönetici rolündeki ortak platform oturumlarına açıktır.");
    $("#session-name").textContent = session.user.name || session.user.email || "Yönetici";
    await loadData();
  } catch (error) {
    if (isMfaRequired(error)) {
      setMfaVisible(true, "Yönetici erişimi için e-posta ikinci faktör doğrulaması gerekli.");
      await requestMfaCode();
      return;
    }
    notice(error.message || "Oturum doğrulanamadı.", true);
  }
}

$("#refresh").addEventListener("click", () => loadData().catch((error) => notice(error.message, true)));
$("#mfa-request").addEventListener("click", () => requestMfaCode());
$("#mfa-form").addEventListener("submit", verifyMfaCode);
$("#category-form").addEventListener("submit", async (event) => {
  event.preventDefault();
  const form = new FormData(event.currentTarget);
  try { await api("/api/owner/categories", { method: "POST", body: JSON.stringify({ name: form.get("name"), pricingType: form.get("pricingType") }) }); event.currentTarget.reset(); await loadData(); notice("Kategori oluşturuldu."); }
  catch (error) { notice(error.message, true); }
});
$("#country-form").addEventListener("submit", async (event) => {
  event.preventDefault();
  const form = new FormData(event.currentTarget);
  try {
    await api("/api/owner/compliance/countries", { method: "POST", body: JSON.stringify({ countryCode: String(form.get("countryCode") || "").toUpperCase(), displayName: form.get("displayName"), regionCode: form.get("regionCode") || undefined }) });
    event.currentTarget.reset();
    await loadData();
    notice("Yargı alanı taslak olarak oluşturuldu. Resmî kaynak, hukuk paketi ve açma kapısı onayı olmadan pazaryeri açılmaz.");
  } catch (error) { notice(error.message, true); }
});
$("#command-form").addEventListener("submit", async (event) => {
  event.preventDefault();
  try { const result = await api("/api/owner/ai-command", { method: "POST", body: JSON.stringify({ command: $("#command").value }) }); const output = $("#command-result"); output.hidden = false; output.textContent = result.response; }
  catch (error) { notice(error.message, true); }
});

bootstrap();
