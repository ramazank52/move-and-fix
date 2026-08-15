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

function escapeHtml(value) { const element = document.createElement("div"); element.textContent = String(value ?? ""); return element.innerHTML; }

async function loadData() {
  notice("Veriler yenileniyor…");
  const [metrics, categories, users] = await Promise.all([api("/api/owner/dashboard"), api("/api/owner/categories"), api("/api/owner/users?limit=10")]);
  renderDashboard(metrics); renderCategories(categories); renderUsers(users);
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
$("#command-form").addEventListener("submit", async (event) => {
  event.preventDefault();
  try { const result = await api("/api/owner/ai-command", { method: "POST", body: JSON.stringify({ command: $("#command").value }) }); const output = $("#command-result"); output.hidden = false; output.textContent = result.response; }
  catch (error) { notice(error.message, true); }
});

bootstrap();
