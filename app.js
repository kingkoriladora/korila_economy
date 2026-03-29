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

const authSection = $("authSection");
const appSection = $("appSection");
const banOverlay = $("banOverlay");
const banMessage = $("banMessage");
const messageArea = $("message");
const toastContainer = $("toastContainer");

const signupBtn = $("signupBtn");
const loginBtn = $("loginBtn");
const logoutBtn = $("logoutBtn");
const gatherBtn = $("gatherBtn");
const changeUsernameBtn = $("changeUsernameBtn");
const sellBtn = $("sellBtn");
const refreshMarketBtn = $("refreshMarketBtn");
const refreshRankingBtn = $("refreshRankingBtn");
const refreshHistoryBtn = $("refreshHistoryBtn");
const refreshChatBtn = $("refreshChatBtn");
const sendChatBtn = $("sendChatBtn");
const updatePricesBtn = $("updatePricesBtn");
const unbanChatBtn = $("unbanChatBtn");
const unbanGameBtn = $("unbanGameBtn");

function setMessage(text) {
  messageArea.textContent = text || "";
}

function showToast(text, type = "success") {
  const div = document.createElement("div");
  div.className = `toast ${type}`;
  div.textContent = text;
  toastContainer.appendChild(div);

  setTimeout(() => {
    div.style.opacity = "0";
    div.style.transform = "translateY(-8px)";
  }, 2400);

  setTimeout(() => {
    div.remove();
  }, 2900);
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
  return Math.max(100, level * 100);
}

function resourceAmount(profile, key) {
  return Number(profile?.[key] || 0);
}

function toggleApp(isLoggedIn) {
  authSection.classList.toggle("hidden", isLoggedIn);
  appSection.classList.toggle("hidden", !isLoggedIn);
  appSection.setAttribute("aria-hidden", String(!isLoggedIn));
}

function showBanOverlay(text) {
  banMessage.textContent = text;
  banOverlay.classList.remove("hidden");
}

function hideBanOverlay() {
  banOverlay.classList.add("hidden");
}

function renderProfile() {
  if (!currentProfile) return;

  $("welcomeText").textContent = `ようこそ、${currentProfile.username || "プレイヤー"}さん`;
  $("titleText").textContent = `称号: ${currentProfile.title || "-"} / Lv.${currentProfile.level || 1}`;
  $("moneyText").textContent = formatNumber(currentProfile.money);

  $("woodText").textContent = formatNumber(currentProfile.wood);
  $("stoneText").textContent = formatNumber(currentProfile.stone);
  $("ironText").textContent = formatNumber(currentProfile.iron);
  $("goldText").textContent = formatNumber(currentProfile.gold);
  $("diamondText").textContent = formatNumber(currentProfile.diamond);

  const currentExp = Number(currentProfile.exp || 0);
  const level = Number(currentProfile.level || 1);
  const need = expNeeded(level);
  $("expText").textContent = `${currentExp} / ${need}`;
  $("expFill").style.width = `${Math.min(100, (currentExp / need) * 100)}%`;

  $("gatherCountText").textContent = `${currentProfile.gather_count || 0} / ${DAILY_GATHER_LIMIT}`;
  $("dailyLimitText").textContent = String(DAILY_GATHER_LIMIT);

  const adminBanPanel = $("adminBanPanel");
  const adminUserListSection = $("adminUserListSection");
  adminBanPanel.classList.toggle("hidden", !isAdmin);
  adminUserListSection.classList.toggle("hidden", !isAdmin);
}

function renderPrices() {
  const board = $("priceBoard");
  if (!currentPrices) {
    board.innerHTML = `<div class="emptyText">相場を読み込み中...</div>`;
    return;
  }

  board.innerHTML = Object.entries(RESOURCE_LABELS).map(([key, label]) => {
    const value = Number(currentPrices[key] || 0);
    return `
      <div class="priceBox">
        <span>${label}</span>
        <strong>¥${formatNumber(value)}</strong>
      </div>
    `;
  }).join("");
}

function assetTotalOfRow(row) {
  return Number(row.total_assets || 0);
}

function renderRanking(rows) {
  const list = $("rankingList");
  if (!rows || rows.length === 0) {
    list.innerHTML = `<div class="emptyText">ランキングはまだありません</div>`;
    $("currentRankText").textContent = "自分の順位: -";
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
          <div>総資産: ¥${formatNumber(assetTotalOfRow(row))}</div>
          <div class="assetLine">
            現金: ¥${formatNumber(row.money)} / 木:${formatNumber(row.wood)} / 石:${formatNumber(row.stone)} / 鉄:${formatNumber(row.iron)} / 金:${formatNumber(row.gold)} / ダイヤ:${formatNumber(row.diamond)}
          </div>
        </div>
      </div>
    `;
  }).join("");

  const myRow = rows.find((row) => row.user_id === currentUser?.id);
  $("currentRankText").textContent = myRow
    ? `自分の順位: ${myRow.rank_no}位 / 総資産: ¥${formatNumber(myRow.total_assets)}`
    : "自分の順位: 100位圏外";
}

function renderHistory(rows) {
  const list = $("historyList");
  if (!rows || rows.length === 0) {
    list.innerHTML = `<div class="emptyText">取引履歴はまだありません</div>`;
    return;
  }

  list.innerHTML = rows.map((row) => {
    const sourceText = row.source === "npc" ? "NPC" : "マーケット";
    const buyerText = row.buyer_name || "誰か";
    const sellerText = row.seller_name || "誰か";

    return `
      <div class="marketItem">
        <div class="marketInfo">
          <strong>${escapeHtml(RESOURCE_LABELS[row.resource] || row.resource)}</strong>
          <div>${escapeHtml(sellerText)} → ${escapeHtml(buyerText)}</div>
          <div>${formatNumber(row.quantity)}個 / 1個 ¥${formatNumber(row.price_each)} / 合計 ¥${formatNumber(row.total_price)}</div>
          <div class="subText">${sourceText} / ${new Date(row.created_at).toLocaleString("ja-JP")}</div>
        </div>
      </div>
    `;
  }).join("");
}

function renderMarket(rows) {
  const list = $("marketList");
  if (!rows || rows.length === 0) {
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
    btn.addEventListener("click", async () => {
      const id = Number(btn.dataset.buyId);
      await buyMarketItem(id);
    });
  });

  list.querySelectorAll("[data-cancel-id]").forEach((btn) => {
    btn.addEventListener("click", async () => {
      const id = Number(btn.dataset.cancelId);
      await cancelMarketItem(id);
    });
  });
}

function renderChat(rows) {
  const list = $("chatList");
  if (!rows || rows.length === 0) {
    list.innerHTML = `<div class="emptyText">まだメッセージがありません</div>`;
    return;
  }

  list.innerHTML = rows.map((row) => {
    const isMe = row.user_id === currentUser?.id;
    const isAdminAuthor = !!row.is_admin;
    const itemClass = `${isMe ? "me" : ""} ${isAdminAuthor ? "admin-author" : ""}`.trim();

    return `
      <div class="chatItem ${itemClass}">
        <div class="chatMeta">
          <strong>${escapeHtml(row.username || "プレイヤー")}</strong>
          <span>${new Date(row.created_at).toLocaleString("ja-JP")}</span>
        </div>
        <div class="chatMessage">${escapeHtml(row.message)}</div>
        ${
          isAdminAuthor
            ? `<div class="chatAdminLine">管理者</div>`
            : ""
        }
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
      btn.addEventListener("click", async () => {
        await deleteChatMessage(Number(btn.dataset.chatDeleteId));
      });
    });

    list.querySelectorAll("[data-chat-ban-id]").forEach((btn) => {
      btn.addEventListener("click", async () => {
        await setBanState(btn.dataset.chatBanId, "chat");
      });
    });

    list.querySelectorAll("[data-game-ban-id]").forEach((btn) => {
      btn.addEventListener("click", async () => {
        await setBanState(btn.dataset.gameBanId, "game");
      });
    });
  }
}

function renderBanList(rows) {
  const list = $("adminUserList");
  if (!rows || rows.length === 0) {
    list.innerHTML = `<div class="emptyText">BAN中ユーザーはいません</div>`;
    return;
  }

  list.innerHTML = rows.map((row) => {
    const tags = [];
    if (row.is_chat_banned) tags.push("チャットBAN");
    if (row.is_game_banned) tags.push("ゲームBAN");

    return `
      <div class="marketItem">
        <div class="marketInfo">
          <strong>${escapeHtml(row.username || "プレイヤー")}</strong>
          <div>user_id: ${escapeHtml(row.id)}</div>
          <div>${tags.join(" / ")}</div>
        </div>
      </div>
    `;
  }).join("");
}

async function fetchProfile() {
  const { data, error } = await supabase
    .from("profiles")
    .select("*")
    .eq("id", currentUser.id)
    .single();

  if (error) throw error;

  currentProfile = data;
  isAdmin = !!data.is_admin;
}

async function fetchPrices() {
  const { data, error } = await supabase
    .from("market_prices")
    .select("*")
    .eq("id", 1)
    .single();

  if (error) throw error;
  currentPrices = data;
}

async function fetchMarket() {
  const sortValue = $("marketSort").value;
  let query = supabase
    .from("market")
    .select("*")
    .eq("sold_out", false);

  if (sortValue === "priceAsc") {
    query = query.order("price", { ascending: true });
  } else if (sortValue === "priceDesc") {
    query = query.order("price", { ascending: false });
  } else if (sortValue === "quantityDesc") {
    query = query.order("quantity", { ascending: false });
  } else {
    query = query.order("created_at", { ascending: false });
  }

  const { data, error } = await query.limit(100);
  if (error) throw error;
  renderMarket(data);
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

  if (currentProfile.is_game_banned) {
    showBanOverlay("このアカウントはゲームBAN中です");
  } else {
    hideBanOverlay();
  }

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

async function ensureLoggedIn() {
  const { data } = await supabase.auth.getSession();
  const session = data.session;
  if (!session?.user) {
    toggleApp(false);
    return;
  }

  currentUser = session.user;
  toggleApp(true);

  try {
    await refreshAll();
    setMessage("読み込み完了");
  } catch (error) {
    console.error(error);
    setMessage(error.message || "読み込みに失敗しました");
    showToast(error.message || "読み込みに失敗しました", "error");
  }
}

async function signup() {
  const username = $("username").value.trim();
  const email = $("email").value.trim();
  const password = $("password").value;

  if (!username || !email || !password) {
    showToast("ユーザー名・メール・パスワードを入力してください", "warn");
    return;
  }

  const { error } = await supabase.auth.signUp({
    email,
    password,
    options: {
      data: { username }
    }
  });

  if (error) {
    showToast(error.message, "error");
    setMessage(error.message);
    return;
  }

  showToast("登録しました。メール確認が必要な場合は確認してください");
  setMessage("登録しました。ログインしてください");
}

async function login() {
  const email = $("email").value.trim();
  const password = $("password").value;

  if (!email || !password) {
    showToast("メールとパスワードを入力してください", "warn");
    return;
  }

  const { error } = await supabase.auth.signInWithPassword({ email, password });

  if (error) {
    showToast(error.message, "error");
    setMessage(error.message);
    return;
  }

  showToast("ログインしました");
  setMessage("ログインしました");
}

async function logout() {
  await supabase.auth.signOut();
  currentUser = null;
  currentProfile = null;
  isAdmin = false;
  toggleApp(false);
  hideBanOverlay();
  setMessage("ログアウトしました");
  showToast("ログアウトしました");
}

async function gatherResource() {
  if (!currentUser) return;
  if (currentProfile?.is_game_banned) {
    showToast("ゲームBAN中です", "error");
    return;
  }

  gatherBtn.disabled = true;
  try {
    const { data, error } = await supabase.rpc("gather_resource", {
      p_user_id: currentUser.id
    });

    if (error) throw error;

    await fetchProfile();
    renderProfile();

    const resource = data?.resource;
    const amount = data?.amount ?? 1;
    showToast(`${RESOURCE_LABELS[resource] || resource} を ${amount}個 採取しました`);
    setMessage(`${RESOURCE_LABELS[resource] || resource} を ${amount}個 採取しました`);

    await Promise.all([fetchRanking(), fetchHistory()]);
  } catch (error) {
    console.error(error);
    showToast(error.message || "採取に失敗しました", "error");
    setMessage(error.message || "採取に失敗しました");
  } finally {
    gatherBtn.disabled = false;
  }
}

async function changeUsername() {
  const newUsername = $("newUsername").value.trim();
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
  const resource = $("sellResource").value;
  const quantity = Number($("sellQuantity").value);
  const price = Number($("sellPrice").value);

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
  if (quantity > 9999) {
    showToast("数量が大きすぎます", "warn");
    return;
  }
  if (price > 9999999) {
    showToast("価格が大きすぎます", "warn");
    return;
  }
  if (resourceAmount(currentProfile, resource) < quantity) {
    showToast("所持数が足りません", "error");
    return;
  }

  try {
    const newValue = resourceAmount(currentProfile, resource) - quantity;

    const { error: updateError } = await supabase
      .from("profiles")
      .update({ [resource]: newValue })
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
    setMessage(`${RESOURCE_LABELS[resource]}を出品しました`);
  } catch (error) {
    console.error(error);
    showToast(error.message || "出品に失敗しました", "error");
    setMessage(error.message || "出品に失敗しました");
  }
}

async function cancelMarketItem(id) {
  try {
    const { data: row, error: getError } = await supabase
      .from("market")
      .select("*")
      .eq("id", id)
      .eq("seller_id", currentUser.id)
      .eq("sold_out", false)
      .single();

    if (getError) throw getError;

    const restored = resourceAmount(currentProfile, row.resource) + Number(row.quantity);

    const { error: updateProfileError } = await supabase
      .from("profiles")
      .update({ [row.resource]: restored })
      .eq("id", currentUser.id);

    if (updateProfileError) throw updateProfileError;

    const { error: updateMarketError } = await supabase
      .from("market")
      .update({ sold_out: true })
      .eq("id", id)
      .eq("seller_id", currentUser.id);

    if (updateMarketError) throw updateMarketError;

    await Promise.all([fetchProfile(), fetchMarket(), fetchRanking()]);
    renderProfile();

    showToast("出品を取り消しました");
  } catch (error) {
    console.error(error);
    showToast(error.message || "取り消しに失敗しました", "error");
  }
}

async function buyMarketItem(listingId) {
  try {
    const { data, error } = await supabase.rpc("buy_market_item", {
      p_listing_id: listingId,
      p_buyer_id: currentUser.id
    });

    if (error) throw error;

    await Promise.all([
      fetchProfile(),
      fetchMarket(),
      fetchRanking(),
      fetchHistory()
    ]);
    renderProfile();

    showToast(`${RESOURCE_LABELS[data.resource]}を購入しました`);
    setMessage(`${RESOURCE_LABELS[data.resource]}を購入しました`);
  } catch (error) {
    console.error(error);
    showToast(error.message || "購入に失敗しました", "error");
    setMessage(error.message || "購入に失敗しました");
  }
}

async function buyNpcResource(resource, qtyInputId) {
  const qty = Number($(qtyInputId).value);

  if (!Number.isInteger(qty) || qty <= 0) {
    showToast("数量を正しく入力してください", "warn");
    return;
  }

  const priceEach = NPC_PRICES[resource];
  const total = priceEach * qty;

  if (Number(currentProfile.money) < total) {
    showToast("お金が足りません", "error");
    return;
  }

  const updates = {
    money: Number(currentProfile.money) - total,
    [resource]: resourceAmount(currentProfile, resource) + qty
  };

  try {
    const { error: updateError } = await supabase
      .from("profiles")
      .update(updates)
      .eq("id", currentUser.id);

    if (updateError) throw updateError;

    const { error: historyError } = await supabase
      .from("trade_history")
      .insert({
        buyer_id: currentUser.id,
        buyer_name: currentProfile.username,
        seller_id: null,
        seller_name: "NPC商人",
        resource,
        quantity: qty,
        price_each: priceEach,
        total_price: total,
        source: "npc"
      });

    if (historyError) throw historyError;

    await Promise.all([fetchProfile(), fetchRanking(), fetchHistory()]);
    renderProfile();

    showToast(`${RESOURCE_LABELS[resource]}を${qty}個購入しました`);
  } catch (error) {
    console.error(error);
    showToast(error.message || "NPC購入に失敗しました", "error");
  }
}

async function updateMarketPrices() {
  try {
    const { error } = await supabase.rpc("update_market_prices", {
      p_user_id: currentUser.id
    });
    if (error) throw error;

    await fetchPrices();
    renderPrices();
    await fetchRanking();

    showToast("相場を更新しました");
  } catch (error) {
    console.error(error);
    showToast(error.message || "相場更新に失敗しました", "error");
  }
}

async function sendChat() {
  const message = $("chatInput").value.trim();
  if (!message) {
    showToast("メッセージを入力してください", "warn");
    return;
  }
  if (message.length > 200) {
    showToast("200文字以内にしてください", "warn");
    return;
  }
  if (currentProfile?.is_chat_banned) {
    showToast("チャットBAN中です", "error");
    return;
  }

  try {
    const { error } = await supabase
      .from("chat_messages")
      .insert({
        user_id: currentUser.id,
        username: currentProfile.username,
        message
      });

    if (error) throw error;

    $("chatInput").value = "";
    await fetchChat();
  } catch (error) {
    console.error(error);
    showToast(error.message || "送信に失敗しました", "error");
  }
}

async function deleteChatMessage(chatId) {
  try {
    const { error } = await supabase
      .from("chat_messages")
      .update({ is_deleted: true, message: "[削除されました]" })
      .eq("id", chatId);

    if (error) throw error;

    await fetchChat();
    showToast("メッセージを削除しました");
  } catch (error) {
    console.error(error);
    showToast(error.message || "削除に失敗しました", "error");
  }
}

async function setBanState(userId, mode) {
  try {
    const updates =
      mode === "chat"
        ? { is_chat_banned: true }
        : { is_game_banned: true };

    const { error } = await supabase
      .from("profiles")
      .update(updates)
      .eq("id", userId);

    if (error) throw error;

    await Promise.all([fetchChat(), fetchBanList()]);
    showToast(mode === "chat" ? "チャットBANしました" : "ゲームBANしました");
  } catch (error) {
    console.error(error);
    showToast(error.message || "BANに失敗しました", "error");
  }
}

async function unban(mode) {
  const targetUserId = $("banTargetUserId").value.trim();
  if (!targetUserId) {
    showToast("user_id を入力してください", "warn");
    return;
  }

  try {
    const updates =
      mode === "chat"
        ? { is_chat_banned: false }
        : { is_game_banned: false };

    const { error } = await supabase
      .from("profiles")
      .update(updates)
      .eq("id", targetUserId);

    if (error) throw error;

    await fetchBanList();
    await fetchChat();
    showToast(mode === "chat" ? "チャットBAN解除しました" : "ゲームBAN解除しました");
  } catch (error) {
    console.error(error);
    showToast(error.message || "BAN解除に失敗しました", "error");
  }
}

signupBtn.addEventListener("click", signup);
loginBtn.addEventListener("click", login);
logoutBtn.addEventListener("click", logout);
gatherBtn.addEventListener("click", gatherResource);
changeUsernameBtn.addEventListener("click", changeUsername);
sellBtn.addEventListener("click", createListing);
refreshMarketBtn.addEventListener("click", fetchMarket);
refreshRankingBtn.addEventListener("click", fetchRanking);
refreshHistoryBtn.addEventListener("click", fetchHistory);
refreshChatBtn.addEventListener("click", fetchChat);
sendChatBtn.addEventListener("click", sendChat);
updatePricesBtn.addEventListener("click", updateMarketPrices);
unbanChatBtn.addEventListener("click", () => unban("chat"));
unbanGameBtn.addEventListener("click", () => unban("game"));

$("marketSort").addEventListener("change", fetchMarket);
$("chatInput").addEventListener("keydown", async (event) => {
  if (event.key === "Enter") {
    await sendChat();
  }
});

$("buyWoodNpcBtn").addEventListener("click", () => buyNpcResource("wood", "npcWoodQty"));
$("buyStoneNpcBtn").addEventListener("click", () => buyNpcResource("stone", "npcStoneQty"));
$("buyIronNpcBtn").addEventListener("click", () => buyNpcResource("iron", "npcIronQty"));
$("buyGoldNpcBtn").addEventListener("click", () => buyNpcResource("gold", "npcGoldQty"));
$("buyDiamondNpcBtn").addEventListener("click", () => buyNpcResource("diamond", "npcDiamondQty"));

supabase.auth.onAuthStateChange(async (_event, session) => {
  if (session?.user) {
    currentUser = session.user;
    toggleApp(true);
    try {
      await refreshAll();
    } catch (error) {
      console.error(error);
      setMessage(error.message || "読み込みに失敗しました");
    }
  } else {
    currentUser = null;
    currentProfile = null;
    isAdmin = false;
    toggleApp(false);
    hideBanOverlay();
  }
});

await ensureLoggedIn();
