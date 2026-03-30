import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

const SUPABASE_URL = "https://wmbbiwlgjjcletefnhbe.supabase.co";
const SUPABASE_ANON_KEY = "sb_publishable_kZHi2lLOxs3RBKmy_Mfb7A_qecCt4HP";

const supabase = createClient(SUPABASE_URL, SUPABASE_ANON_KEY);

const DAILY_GATHER_LIMIT = 20;

const RESOURCE_LABELS = {
  wood: "木",
  stone: "石",
  iron: "鉄",
  gold: "金",
  diamond: "ダイヤ"
};

const NPC_PRICES = {
  wood: 12,
  stone: 22,
  iron: 55,
  gold: 130,
  diamond: 320
};

let currentUser = null;
let currentProfile = null;
let currentPrices = null;
let isAdmin = false;

const $ = (id) => document.getElementById(id);

function setMessage(text) {
  const el = $("message");
  if (el) el.textContent = text || "";
}

function showToast(text, type = "success") {
  const wrap = $("toastContainer");
  if (!wrap) return;

  const el = document.createElement("div");
  el.className = `toast ${type}`;
  el.textContent = text;
  wrap.appendChild(el);

  setTimeout(() => {
    el.style.opacity = "0";
    el.style.transform = "translateY(-8px)";
  }, 2200);

  setTimeout(() => el.remove(), 2800);
}

function escapeHtml(text = "") {
  return String(text)
    .replaceAll("&", "&amp;")
    .replaceAll("<", "&lt;")
    .replaceAll(">", "&gt;")
    .replaceAll('"', "&quot;")
    .replaceAll("'", "&#039;");
}

function formatNumber(value) {
  return Number(value || 0).toLocaleString("ja-JP");
}

function expNeeded(level) {
  return Math.max(100, Number(level || 1) * 100);
}

function resourceAmount(profile, key) {
  return Number(profile?.[key] || 0);
}

function toggleApp(isLoggedIn) {
  $("authSection")?.classList.toggle("hidden", isLoggedIn);
  $("appSection")?.classList.toggle("hidden", !isLoggedIn);
  $("appSection")?.setAttribute("aria-hidden", String(!isLoggedIn));
}

function showBanOverlay(text) {
  const msg = $("banMessage");
  if (msg) msg.textContent = text;
  $("banOverlay")?.classList.remove("hidden");
}

function hideBanOverlay() {
  $("banOverlay")?.classList.add("hidden");
}

function resetState() {
  currentUser = null;
  currentProfile = null;
  currentPrices = null;
  isAdmin = false;
  toggleApp(false);
  hideBanOverlay();
}

function requireLogin() {
  if (!currentUser || !currentProfile) {
    resetState();
    showToast("ログインしてください", "error");
    setMessage("ログインしてください");
    return false;
  }
  return true;
}

async function ensureProfile() {
  const { data, error } = await supabase
    .from("profiles")
    .select("*")
    .eq("id", currentUser.id)
    .maybeSingle();

  if (error) throw error;

  if (data) {
    currentProfile = data;
    isAdmin = !!data.is_admin;
    return;
  }

  const email = currentUser.email || "";
  const typedName = $("username")?.value?.trim() || "";
  const baseName = typedName || email.split("@")[0] || "player";
  const safeName = `${baseName}_${String(currentUser.id).replaceAll("-", "").slice(0, 6)}`;

  const { error: insertError } = await supabase
    .from("profiles")
    .insert({
      id: currentUser.id,
      username: safeName
    });

  if (insertError) throw insertError;

  const { data: created, error: refetchError } = await supabase
    .from("profiles")
    .select("*")
    .eq("id", currentUser.id)
    .single();

  if (refetchError) throw refetchError;

  currentProfile = created;
  isAdmin = !!created.is_admin;
}

function renderProfile() {
  if (!currentProfile) return;

  if ($("welcomeText")) $("welcomeText").textContent = `ようこそ、${currentProfile.username || "プレイヤー"}さん`;
  if ($("titleText")) $("titleText").textContent = `称号: ${currentProfile.title || "-"} / Lv.${currentProfile.level || 1}`;

  if ($("moneyText")) $("moneyText").textContent = formatNumber(currentProfile.money);
  if ($("woodText")) $("woodText").textContent = formatNumber(currentProfile.wood);
  if ($("stoneText")) $("stoneText").textContent = formatNumber(currentProfile.stone);
  if ($("ironText")) $("ironText").textContent = formatNumber(currentProfile.iron);
  if ($("goldText")) $("goldText").textContent = formatNumber(currentProfile.gold);
  if ($("diamondText")) $("diamondText").textContent = formatNumber(currentProfile.diamond);

  const exp = Number(currentProfile.exp || 0);
  const level = Number(currentProfile.level || 1);
  const need = expNeeded(level);

  if ($("expText")) $("expText").textContent = `${exp} / ${need}`;
  if ($("expFill")) $("expFill").style.width = `${Math.min(100, (exp / need) * 100)}%`;

  if ($("gatherCountText")) $("gatherCountText").textContent = `${currentProfile.gather_count || 0} / ${DAILY_GATHER_LIMIT}`;
  if ($("dailyLimitText")) $("dailyLimitText").textContent = String(DAILY_GATHER_LIMIT);

  $("adminBanPanel")?.classList.toggle("hidden", !isAdmin);
  $("adminUserListSection")?.classList.toggle("hidden", !isAdmin);
}

function renderPrices() {
  const board = $("priceBoard");
  if (!board) return;

  if (!currentPrices) {
    board.innerHTML = `<div class="emptyText">相場を読み込み中...</div>`;
    return;
  }

  board.innerHTML = Object.entries(RESOURCE_LABELS).map(([key, label]) => `
    <div class="priceBox">
      <span>${label}</span>
      <strong>¥${formatNumber(currentPrices[key])}</strong>
    </div>
  `).join("");
}

function renderMarket(rows) {
  const list = $("marketList");
  if (!list) return;

  if (!rows?.length) {
    list.innerHTML = `<div class="emptyText">出品はまだありません</div>`;
    return;
  }

  list.innerHTML = rows.map((row) => {
    const isMe = row.seller_id === currentUser?.id;
    return `
      <div class="marketItem ${isMe ? "me" : ""}">
        <div class="marketInfo">
          <strong>${escapeHtml(RESOURCE_LABELS[row.resource] || row.resource)}</strong>
          <div>出品者: ${escapeHtml(row.seller_name || "プレイヤー")}</div>
          <div>数量: ${formatNumber(row.quantity)} / 1個 ¥${formatNumber(row.price)}</div>
          <div>合計: ¥${formatNumber(Number(row.quantity) * Number(row.price))}</div>
          <div class="subText">${new Date(row.created_at).toLocaleString("ja-JP")}</div>
        </div>
        <div class="marketActions">
          ${isMe
            ? `<button class="smallBtn" data-cancel-id="${row.id}">出品取り消し</button>`
            : `<button class="smallBtn" data-buy-id="${row.id}">購入</button>`
          }
        </div>
      </div>
    `;
  }).join("");

  list.querySelectorAll("[data-buy-id]").forEach((btn) => {
    btn.addEventListener("click", () => buyMarketItem(Number(btn.dataset.buyId)));
  });

  list.querySelectorAll("[data-cancel-id]").forEach((btn) => {
    btn.addEventListener("click", () => cancelMarketItem(Number(btn.dataset.cancelId)));
  });
}

function renderRanking(rows) {
  const list = $("rankingList");
  if (!list) return;

  if (!rows?.length) {
    list.innerHTML = `<div class="emptyText">ランキングはまだありません</div>`;
    if ($("currentRankText")) $("currentRankText").textContent = "自分の順位: -";
    return;
  }

  list.innerHTML = rows.map((row, index) => {
    const extraClass =
      index === 0 ? "rankingTop1" :
      index === 1 ? "rankingTop2" :
      index === 2 ? "rankingTop3" : "";

    const isMe = row.user_id === currentUser?.id;

    return `
      <div class="marketItem ${extraClass} ${isMe ? "me" : ""}">
        <div class="marketInfo">
          <div><span class="rankNum">${row.rank_no}位</span> ${escapeHtml(row.username || "プレイヤー")}</div>
          <div>総資産: ¥${formatNumber(row.total_assets)}</div>
          <div class="assetLine">
            現金: ¥${formatNumber(row.money)} / 木:${formatNumber(row.wood)} / 石:${formatNumber(row.stone)} / 鉄:${formatNumber(row.iron)} / 金:${formatNumber(row.gold)} / ダイヤ:${formatNumber(row.diamond)}
          </div>
        </div>
      </div>
    `;
  }).join("");

  const myRow = rows.find((row) => row.user_id === currentUser?.id);
  if ($("currentRankText")) {
    $("currentRankText").textContent = myRow
      ? `自分の順位: ${myRow.rank_no}位 / 総資産: ¥${formatNumber(myRow.total_assets)}`
      : "自分の順位: 100位圏外";
  }
}

function renderHistory(rows) {
  const list = $("historyList");
  if (!list) return;

  if (!rows?.length) {
    list.innerHTML = `<div class="emptyText">取引履歴はまだありません</div>`;
    return;
  }

  list.innerHTML = rows.map((row) => `
    <div class="marketItem">
      <div class="marketInfo">
        <strong>${escapeHtml(RESOURCE_LABELS[row.resource] || row.resource)}</strong>
        <div>${escapeHtml(row.seller_name || "誰か")} → ${escapeHtml(row.buyer_name || "誰か")}</div>
        <div>${formatNumber(row.quantity)}個 / 1個 ¥${formatNumber(row.price_each)} / 合計 ¥${formatNumber(row.total_price)}</div>
        <div class="subText">${row.source === "npc" ? "NPC" : "マーケット"} / ${new Date(row.created_at).toLocaleString("ja-JP")}</div>
      </div>
    </div>
  `).join("");
}

function renderChat(rows) {
  const list = $("chatList");
  if (!list) return;

  if (!rows?.length) {
    list.innerHTML = `<div class="emptyText">まだメッセージがありません</div>`;
    return;
  }

  list.innerHTML = rows.map((row) => {
    const isMe = row.user_id === currentUser?.id;
    const adminClass = row.is_admin ? "admin-author" : "";
    const meClass = isMe ? "me" : "";

    return `
      <div class="chatItem ${meClass} ${adminClass}">
        <div class="chatMeta">
          <strong>${escapeHtml(row.username || "プレイヤー")}</strong>
          <span>${new Date(row.created_at).toLocaleString("ja-JP")}</span>
        </div>
        <div class="chatMessage">${escapeHtml(row.message)}</div>
        ${row.is_admin ? `<div class="chatAdminLine">管理者</div>` : ""}
        ${
          isAdmin && !isMe
            ? `
              <div class="chatAdminActions">
                <button class="smallBtn chatDeleteBtn" data-chat-delete-id="${row.id}">削除</button>
                <button class="smallBtn chatBanBtn" data-chat-ban-id="${row.user_id}">チャットBAN</button>
                <button class="smallBtn chatBanBtn" data-game-ban-id="${row.user_id}">ゲームBAN</button>
              </div>
            `
            : ""
        }
      </div>
    `;
  }).join("");

  if (isAdmin) {
    list.querySelectorAll("[data-chat-delete-id]").forEach((btn) => {
      btn.addEventListener("click", () => deleteChatMessage(Number(btn.dataset.chatDeleteId)));
    });

    list.querySelectorAll("[data-chat-ban-id]").forEach((btn) => {
      btn.addEventListener("click", () => setBanState(btn.dataset.chatBanId, "chat"));
    });

    list.querySelectorAll("[data-game-ban-id]").forEach((btn) => {
      btn.addEventListener("click", () => setBanState(btn.dataset.gameBanId, "game"));
    });
  }
}

function renderBanList(rows) {
  const list = $("adminUserList");
  if (!list) return;

  if (!rows?.length) {
    list.innerHTML = `<div class="emptyText">BAN中ユーザーはいません</div>`;
    return;
  }

  list.innerHTML = rows.map((row) => `
    <div class="marketItem">
      <div class="marketInfo">
        <strong>${escapeHtml(row.username || "プレイヤー")}</strong>
        <div>user_id: ${escapeHtml(row.id)}</div>
        <div>${row.is_chat_banned ? "チャットBAN" : ""}${row.is_chat_banned && row.is_game_banned ? " / " : ""}${row.is_game_banned ? "ゲームBAN" : ""}</div>
      </div>
    </div>
  `).join("");
}

async function fetchProfile() {
  await ensureProfile();
}

async function fetchPrices() {
  const { data, error } = await supabase
    .from("market_prices")
    .select("*")
    .eq("id", 1)
    .maybeSingle();

  if (error) throw error;
  if (!data) throw new Error("相場データがありません");

  currentPrices = data;
}

async function fetchMarket() {
  const sortValue = $("marketSort")?.value || "newest";
  let query = supabase.from("market").select("*").eq("sold_out", false);

  if (sortValue === "priceAsc") query = query.order("price", { ascending: true });
  else if (sortValue === "priceDesc") query = query.order("price", { ascending: false });
  else if (sortValue === "quantityDesc") query = query.order("quantity", { ascending: false });
  else query = query.order("created_at", { ascending: false });

  const { data, error } = await query.limit(100);
  if (error) throw error;
  renderMarket(data || []);
}

async function fetchRanking() {
  const { data, error } = await supabase.rpc("get_rankings");
  if (error) throw error;
  renderRanking(data || []);
}

async function fetchHistory() {
  const { data, error } = await supabase
    .from("trade_history_view")
    .select("*")
    .order("created_at", { ascending: false })
    .limit(50);

  if (error) throw error;
  renderHistory(data || []);
}

async function fetchChat() {
  const { data, error } = await supabase
    .from("chat_messages_view")
    .select("*")
    .order("created_at", { ascending: true })
    .limit(100);

  if (error) throw error;
  renderChat(data || []);
}

async function fetchBanList() {
  if (!isAdmin) return;

  const { data, error } = await supabase
    .from("profiles")
    .select("id, username, is_chat_banned, is_game_banned")
    .or("is_chat_banned.eq.true,is_game_banned.eq.true")
    .order("updated_at", { ascending: false });

  if (error) throw error;
  renderBanList(data || []);
}

async function refreshAll() {
  await fetchProfile();
  renderProfile();

  if (currentProfile?.is_game_banned) showBanOverlay("このアカウントはゲームBAN中です");
  else hideBanOverlay();

  await Promise.all([
    fetchPrices(),
    fetchMarket(),
    fetchRanking(),
    fetchHistory(),
    fetchChat(),
    fetchBanList()
  ]);

  renderPrices();
  renderProfile();
}

async function signup() {
  const username = $("username")?.value.trim();
  const email = $("email")?.value.trim();
  const password = $("password")?.value;

  if (!username || !email || !password) {
    showToast("ユーザー名・メール・パスワードを入力してください", "warn");
    return;
  }

  const { error } = await supabase.auth.signUp({
    email,
    password,
    options: { data: { username } }
  });

  if (error) {
    showToast(error.message, "error");
    setMessage(error.message);
    return;
  }

  showToast("登録しました。ログインしてください");
  setMessage("登録しました。ログインしてください");
}

async function login() {
  const email = $("email")?.value.trim();
  const password = $("password")?.value;

  if (!email || !password) {
    showToast("メールとパスワードを入力してください", "warn");
    return;
  }

  const { data, error } = await supabase.auth.signInWithPassword({ email, password });

  if (error) {
    showToast(error.message, "error");
    setMessage(error.message);
    return;
  }

  currentUser = data.user;

  try {
    await refreshAll();
    toggleApp(true);
    showToast("ログインしました");
    setMessage("ログインしました");
  } catch (err) {
    console.error(err);
    await supabase.auth.signOut();
    resetState();
    showToast(err.message || "ログイン後の読み込みに失敗しました", "error");
    setMessage(err.message || "ログイン後の読み込みに失敗しました");
  }
}

async function logout() {
  await supabase.auth.signOut();
  resetState();
  setMessage("ログアウトしました");
  showToast("ログアウトしました");
}

async function gatherResource() {
  if (!requireLogin()) return;

  if (currentProfile.is_game_banned) {
    showToast("ゲームBAN中です", "error");
    return;
  }

  const btn = $("gatherBtn");
  if (btn) btn.disabled = true;

  try {
    const { data, error } = await supabase.rpc("gather_resource", {
      p_user_id: currentUser.id
    });

    if (error) throw error;

    await fetchProfile();
    renderProfile();
    await fetchRanking();

    const resource = data?.resource || "wood";
    const amount = data?.amount ?? 1;

    showToast(`${RESOURCE_LABELS[resource] || resource} を ${amount}個 採取しました`);
    setMessage(`${RESOURCE_LABELS[resource] || resource} を ${amount}個 採取しました`);
  } catch (error) {
    console.error(error);
    showToast(error.message || "採取に失敗しました", "error");
    setMessage(error.message || "採取に失敗しました");
  } finally {
    if (btn) btn.disabled = false;
  }
}

async function changeUsername() {
  if (!requireLogin()) return;

  const newUsername = $("newUsername")?.value.trim();
  if (!newUsername) {
    showToast("新しいユーザー名を入力してください", "warn");
    return;
  }

  try {
    const { error } = await supabase
      .from("profiles")
      .update({ username: newUsername })
      .eq("id", currentUser.id);

    if (error) throw error;

    $("newUsername").value = "";
    await fetchProfile();
    renderProfile();
    showToast("ユーザー名を変更しました");
  } catch (error) {
    console.error(error);
    showToast(error.message || "ユーザー名変更に失敗しました", "error");
  }
}

async function createListing() {
  if (!requireLogin()) return;

  const resource = $("sellResource")?.value;
  const quantity = Number($("sellQuantity")?.value);
  const price = Number($("sellPrice")?.value);

  if (!resource || !RESOURCE_LABELS[resource]) {
    showToast("資源を選んでください", "warn");
    return;
  }
  if (!Number.isInteger(quantity) || quantity <= 0) {
    showToast("数量を正しく入力してください", "warn");
    return;
  }
  if (!Number.isInteger(price) || price <= 0) {
    showToast("価格を正しく入力してください", "warn");
    return;
  }
  if (resourceAmount(currentProfile, resource) < quantity) {
    showToast("所持数が足りません", "error");
    return;
  }

  try {
    const { error: updateError } = await supabase
      .from("profiles")
      .update({ [resource]: resourceAmount(currentProfile, resource) - quantity })
      .eq("id", currentUser.id);

    if (updateError) throw updateError;

    const { error: insertError } = await supabase
      .from("market")
      .insert({
        seller_id: currentUser.id,
        seller_name: currentProfile.username,
        resource,
        quantity,
        price
      });

    if (insertError) throw insertError;

    $("sellQuantity").value = "";
    $("sellPrice").value = "";

    await Promise.all([fetchProfile(), fetchMarket(), fetchRanking()]);
    renderProfile();

    showToast(`${RESOURCE_LABELS[resource]}を出品しました`);
  } catch (error) {
    console.error(error);
    showToast(error.message || "出品に失敗しました", "error");
  }
}

async function cancelMarketItem(id) {
  if (!requireLogin()) return;

  try {
    const { data: row, error } = await supabase
      .from("market")
      .select("*")
      .eq("id", id)
      .eq("seller_id", currentUser.id)
      .eq("sold_out", false)
      .single();

    if (error) throw error;

    const { error: profileError } = await supabase
      .from("profiles")
      .update({ [row.resource]: resourceAmount(currentProfile, row.resource) + Number(row.quantity) })
      .eq("id", currentUser.id);

    if (profileError) throw profileError;

    const { error: marketError } = await supabase
      .from("market")
      .update({ sold_out: true })
      .eq("id", id);

    if (marketError) throw error;
