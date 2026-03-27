import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

const SUPABASE_URL = "https://wmbbiwlgjjcletefnhbe.supabase.co";
const SUPABASE_ANON_KEY = "sb_publishable_kZHi2lLOxs3RBKmy_Mfb7A_qecCt4HP";

const supabase = createClient(SUPABASE_URL, SUPABASE_ANON_KEY);

const DAILY_GATHER_LIMIT = 20;

const authSection = document.getElementById("authSection");
const appSection = document.getElementById("appSection");

const usernameInput = document.getElementById("username");
const emailInput = document.getElementById("email");
const passwordInput = document.getElementById("password");

const signupBtn = document.getElementById("signupBtn");
const loginBtn = document.getElementById("loginBtn");
const logoutBtn = document.getElementById("logoutBtn");
const gatherBtn = document.getElementById("gatherBtn");

const sellResource = document.getElementById("sellResource");
const sellQuantity = document.getElementById("sellQuantity");
const sellPrice = document.getElementById("sellPrice");
const sellBtn = document.getElementById("sellBtn");

const newUsernameInput = document.getElementById("newUsername");
const changeUsernameBtn = document.getElementById("changeUsernameBtn");

const npcWoodQty = document.getElementById("npcWoodQty");
const npcStoneQty = document.getElementById("npcStoneQty");
const npcIronQty = document.getElementById("npcIronQty");
const buyWoodNpcBtn = document.getElementById("buyWoodNpcBtn");
const buyStoneNpcBtn = document.getElementById("buyStoneNpcBtn");
const buyIronNpcBtn = document.getElementById("buyIronNpcBtn");

const refreshMarketBtn = document.getElementById("refreshMarketBtn");
const marketSort = document.getElementById("marketSort");
const marketList = document.getElementById("marketList");

const chatList = document.getElementById("chatList");
const chatInput = document.getElementById("chatInput");
const sendChatBtn = document.getElementById("sendChatBtn");
const refreshChatBtn = document.getElementById("refreshChatBtn");
const adminBanPanel = document.getElementById("adminBanPanel");
const banTargetUserId = document.getElementById("banTargetUserId");
const unbanChatBtn = document.getElementById("unbanChatBtn");
const unbanGameBtn = document.getElementById("unbanGameBtn");

const adminUserListSection = document.getElementById("adminUserListSection");
const adminUserList = document.getElementById("adminUserList");
const banOverlay = document.getElementById("banOverlay");
const banMessage = document.getElementById("banMessage");

const welcomeText = document.getElementById("welcomeText");
const titleText = document.getElementById("titleText");
const moneyText = document.getElementById("moneyText");
const woodText = document.getElementById("woodText");
const stoneText = document.getElementById("stoneText");
const ironText = document.getElementById("ironText");
const gatherCountText = document.getElementById("gatherCountText");
const dailyLimitText = document.getElementById("dailyLimitText");
const messageText = document.getElementById("message");

const priceBoard = document.getElementById("priceBoard");
const rankingList = document.getElementById("rankingList");
const historyList = document.getElementById("historyList");
const updatePricesBtn = document.getElementById("updatePricesBtn");
const refreshRankingBtn = document.getElementById("refreshRankingBtn");
const refreshHistoryBtn = document.getElementById("refreshHistoryBtn");
const toastContainer = document.getElementById("toastContainer");

const expText = document.getElementById("expText");
const expFill = document.getElementById("expFill");

dailyLimitText.textContent = DAILY_GATHER_LIMIT;

let uiLocked = false;
let currentProfile = null;
let notificationPollTimer = null;
let latestNotificationId = 0;

function msg(text, isError = false) {
  messageText.textContent = text;
  messageText.style.color = isError ? "#fca5a5" : "#bfdbfe";
}

function escapeHtml(value) {
  return String(value)
    .replaceAll("&", "&amp;")
    .replaceAll("<", "&lt;")
    .replaceAll(">", "&gt;")
    .replaceAll('"', "&quot;")
    .replaceAll("'", "&#039;");
}

function showApp(show) {
  if (show) {
    authSection.classList.add("hidden");
    appSection.classList.remove("hidden");
    appSection.setAttribute("aria-hidden", "false");
  } else {
    authSection.classList.remove("hidden");
    appSection.classList.add("hidden");
    appSection.setAttribute("aria-hidden", "true");
  }
}

function jpName(resource) {
  if (resource === "wood") return "木";
  if (resource === "stone") return "石";
  if (resource === "iron") return "鉄";
  return resource;
}

function formatDate(dateString) {
  const d = new Date(dateString);
  return `${d.getFullYear()}/${String(d.getMonth() + 1).padStart(2, "0")}/${String(
    d.getDate()
  ).padStart(2, "0")} ${String(d.getHours()).padStart(2, "0")}:${String(
    d.getMinutes()
  ).padStart(2, "0")}`;
}

function todayString() {
  const today = new Date();
  const y = today.getFullYear();
  const m = String(today.getMonth() + 1).padStart(2, "0");
  const d = String(today.getDate()).padStart(2, "0");
  return `${y}-${m}-${d}`;
}

function setButtonsDisabled(disabled) {
  [
    signupBtn,
    loginBtn,
    logoutBtn,
    gatherBtn,
    sellBtn,
    changeUsernameBtn,
    refreshMarketBtn,
    updatePricesBtn,
    refreshRankingBtn,
    refreshHistoryBtn,
    buyWoodNpcBtn,
    buyStoneNpcBtn,
    buyIronNpcBtn,
    sendChatBtn,
    refreshChatBtn,
    unbanChatBtn,
    unbanGameBtn,
  ].forEach((btn) => {
    if (btn) btn.disabled = disabled;
  });

  document.querySelectorAll(".buyBtn, .cancelBtn, .chatDeleteBtn, .chatBanBtn").forEach((btn) => {
    btn.disabled = disabled;
  });
}

async function runLocked(task) {
  if (uiLocked) return;
  uiLocked = true;
  setButtonsDisabled(true);

  try {
    await task();
  } finally {
    uiLocked = false;
    setButtonsDisabled(false);
  }
}

async function getCurrentUser() {
  const {
    data: { user },
    error,
  } = await supabase.auth.getUser();

  if (error) throw error;
  return user;
}

async function getProfile(userId) {
  const { data, error } = await supabase
    .from("profiles")
    .select("*")
    .eq("id", userId)
    .single();

  if (error) throw error;
  return data;
}

async function getTodayGatherCount(userId) {
  const { count, error } = await supabase
    .from("daily_gathers")
    .select("*", { count: "exact", head: true })
    .eq("user_id", userId)
    .eq("gather_date", todayString());

  if (error) throw error;
  return count ?? 0;
}

async function createProfileIfMissing(user) {
  const { data: existing, error: selectError } = await supabase
    .from("profiles")
    .select("*")
    .eq("id", user.id)
    .maybeSingle();

  if (selectError) throw selectError;
  if (existing) return existing;

  const username =
    usernameInput.value.trim() ||
    user.email?.split("@")[0] ||
    "player";

  const { data: inserted, error: insertError } = await supabase
    .from("profiles")
    .insert({
      id: user.id,
      username,
      money: 100,
      wood: 0,
      stone: 0,
      iron: 0,
      is_admin: false,
      level: 1,
      title: "新米採取者",
    })
    .select()
    .single();

  if (insertError) throw insertError;
  return inserted;
}

function updateProfileUI(profile, gatherCount = 0) {
  moneyText.textContent = profile.money ?? 0;
  woodText.textContent = profile.wood ?? 0;
  stoneText.textContent = profile.stone ?? 0;
  ironText.textContent = profile.iron ?? 0;
  titleText.textContent = `称号: ${profile.title ?? "新米採取者"} / Lv.${profile.level ?? 1}`;
  gatherCountText.textContent = `${gatherCount} / ${DAILY_GATHER_LIMIT}`;
  gatherBtn.disabled = gatherCount >= DAILY_GATHER_LIMIT || uiLocked;
}

async function refreshProfileUI() {
  const user = await getCurrentUser();
  if (!user) return;

  const profile = await getProfile(user.id);
  const gatherCount = await getTodayGatherCount(user.id);

  currentProfile = profile;
  welcomeText.textContent = `ようこそ、${profile.username}`;
  updateProfileUI(profile, gatherCount);

  updatePricesBtn.textContent = profile.is_admin ? "相場更新（管理者）" : "相場更新";

  if (profile.is_admin) {
    adminBanPanel.classList.remove("hidden");
    adminUserListSection.classList.remove("hidden");
  } else {
    adminBanPanel.classList.add("hidden");
    adminUserListSection.classList.add("hidden");
  }
}

async function checkBanStatus() {
  try {
    const { data, error } = await supabase.rpc("get_my_ban_status");
    if (error) throw error;

    if (data?.game_banned) {
      banOverlay.classList.remove("hidden");
      banMessage.textContent = data.game_reason
        ? `ゲームBAN中: ${data.game_reason}`
        : "このアカウントは現在利用停止中です";
    } else {
      banOverlay.classList.add("hidden");
    }

    if (data?.chat_banned) {
      msg(
        data.chat_reason
          ? `チャットBAN中: ${data.chat_reason}`
          : "チャットBAN中です",
        true
      );
    }
  } catch (error) {
    console.error(error);
  }
}

function sortListings(listings) {
  const sorted = [...listings];
  const mode = marketSort.value;

  if (mode === "priceAsc") {
    sorted.sort((a, b) => a.price_per_unit - b.price_per_unit || b.id - a.id);
  } else if (mode === "priceDesc") {
    sorted.sort((a, b) => b.price_per_unit - a.price_per_unit || b.id - a.id);
  } else if (mode === "quantityDesc") {
    sorted.sort((a, b) => b.quantity - a.quantity || b.id - a.id);
  } else {
    sorted.sort((a, b) => b.id - a.id);
  }

  return sorted;
}

async function signup() {
  await runLocked(async () => {
    try {
      const username = usernameInput.value.trim();
      const email = emailInput.value.trim();
      const password = passwordInput.value.trim();

      if (!username || !email || !password) {
        msg("ユーザー名、メール、パスワードを全部入れて。", true);
        return;
      }

      if (username.length < 2 || username.length > 16) {
        msg("ユーザー名は2〜16文字にして。", true);
        return;
      }

      if (password.length < 6) {
        msg("パスワードは6文字以上にして。", true);
        return;
      }

      const { data, error } = await supabase.auth.signUp({
        email,
        password,
      });

      if (error) throw error;
      if (!data.user) throw new Error("登録に失敗した");

      await createProfileIfMissing(data.user);
      msg("登録できた。次はログインして。");
    } catch (error) {
      console.error(error);
      msg(error.message || "登録エラー", true);
    }
  });
}

async function login() {
  await runLocked(async () => {
    try {
      const email = emailInput.value.trim();
      const password = passwordInput.value.trim();

      if (!email || !password) {
        msg("メールとパスワードを入れて。", true);
        return;
      }

      const { data, error } = await supabase.auth.signInWithPassword({
        email,
        password,
      });

      if (error) throw error;
      if (!data.user) throw new Error("ログイン失敗");

      await loadUser(data.user);
      msg("ログインできた。");
    } catch (error) {
      console.error(error);
      msg(error.message || "ログインエラー", true);
    }
  });
  startNotificationPolling();
}

async function logout() {
  await runLocked(async () => {
    try {
      if (notificationPollTimer) {
  clearInterval(notificationPollTimer);
  notificationPollTimer = null;
}
      const { error } = await supabase.auth.signOut();
      if (error) throw error;

      currentProfile = null;
      showApp(false);
      msg("ログアウトした。");
    } catch (error) {
      console.error(error);
      msg(error.message || "ログアウトエラー", true);
    }
  });
}

async function gather() {
  await runLocked(async () => {
    try {
      const user = await getCurrentUser();
      if (!user) throw new Error("ログインが必要");

      const gatherCount = await getTodayGatherCount(user.id);
      if (gatherCount >= DAILY_GATHER_LIMIT) {
        msg("今日はもう採取上限や。", true);
        return;
      }

      const roll = Math.random();
      let resourceType = "wood";
      if (roll >= 0.75 && roll < 0.95) resourceType = "stone";
      if (roll >= 0.95) resourceType = "iron";

      const { error: insertGatherError } = await supabase.from("daily_gathers").insert({
        user_id: user.id,
        gather_date: todayString(),
      });
      if (insertGatherError) throw insertGatherError;

      const { error: rpcError } = await supabase.rpc("apply_gather_reward", {
        p_user_id: user.id,
        p_resource_type: resourceType,
      });
      if (rpcError) throw rpcError;

      await refreshProfileUI();
      await loadRankings();
      msg(`${jpName(resourceType)}を1個手に入れた。`);
    } catch (error) {
      console.error(error);
      msg(error.message || "採取エラー", true);
    }
  });
}

async function sellItem() {
  await runLocked(async () => {
    try {
      const quantity = Number(sellQuantity.value);
      const pricePerUnit = Number(sellPrice.value);
      const resourceType = sellResource.value;

      if (!["wood", "stone", "iron"].includes(resourceType)) {
        msg("資源を選んで。", true);
        return;
      }

      if (!Number.isInteger(quantity) || quantity <= 0) {
        msg("数量を正しく入れて。", true);
        return;
      }

      if (!Number.isInteger(pricePerUnit) || pricePerUnit <= 0) {
        msg("単価を正しく入れて。", true);
        return;
      }

      const { error } = await supabase.rpc("create_listing", {
        p_resource_type: resourceType,
        p_quantity: quantity,
        p_price_per_unit: pricePerUnit,
      });

      if (error) throw error;

      sellQuantity.value = "";
      sellPrice.value = "";

      await refreshProfileUI();
      await loadMarket();
      await loadPrices();
      await loadRankings();
      msg("出品した。");
    } catch (error) {
      console.error(error);
      msg(error.message || "出品エラー", true);
    }
  });
}

async function buyListing(listingId) {
  await runLocked(async () => {
    try {
      const { error } = await supabase.rpc("buy_listing", {
        p_listing_id: listingId,
      });
      if (error) throw error;

      await refreshProfileUI();
      await loadMarket();
      await loadPrices();
      await loadRankings();
      await loadHistory();
      msg("購入した。");
    } catch (error) {
      console.error(error);
      msg(error.message || "購入エラー", true);
    }
  });
}

async function cancelListing(listingId) {
  await runLocked(async () => {
    try {
      const { error } = await supabase.rpc("cancel_listing", {
        p_listing_id: listingId,
      });
      if (error) throw error;

      await refreshProfileUI();
      await loadMarket();
      await loadPrices();
      msg("出品を取り消した。");
    } catch (error) {
      console.error(error);
      msg(error.message || "取り消しエラー", true);
    }
  });
}

async function buyFromNpc(resourceType, quantity) {
  await runLocked(async () => {
    try {
      if (!["wood", "stone", "iron"].includes(resourceType)) {
        msg("資源が不正。", true);
        return;
      }

      if (!Number.isInteger(quantity) || quantity <= 0) {
        msg("NPC購入数を正しく入れて。", true);
        return;
      }

      const { error } = await supabase.rpc("buy_from_npc", {
        p_resource_type: resourceType,
        p_quantity: quantity,
      });
      if (error) throw error;

      await refreshProfileUI();
      await loadPrices();
      await loadRankings();
      msg(`NPCショップで${jpName(resourceType)}を${quantity}個買った。`);
    } catch (error) {
      console.error(error);
      msg(error.message || "NPC購入エラー", true);
    }
  });
}

async function changeUsername() {
  await runLocked(async () => {
    try {
      const newName = newUsernameInput.value.trim();

      if (newName.length < 2 || newName.length > 16) {
        msg("新しいユーザー名は2〜16文字にして。", true);
        return;
      }

      const { error } = await supabase.rpc("change_username", {
        p_new_username: newName,
      });
      if (error) throw error;

      newUsernameInput.value = "";
      await refreshProfileUI();
      await loadRankings();
      msg("ユーザー名を変えた。");
    } catch (error) {
      console.error(error);
      msg(error.message || "ユーザー名変更エラー", true);
    }
  });
}

async function sendChatMessage() {
  await runLocked(async () => {
    try {
      const text = chatInput.value.trim();

      if (!text) {
        msg("メッセージを入れて。", true);
        return;
      }

      const { error } = await supabase.rpc("send_chat_message", {
        p_message: text,
      });

      if (error) throw error;

      chatInput.value = "";
      await loadChat();
      await checkBanStatus();
      msg("チャットを送信した。");
    } catch (error) {
      console.error(error);
      msg(error.message || "チャット送信エラー", true);
    }
  });
}

async function deleteChatMessage(messageId) {
  await runLocked(async () => {
    try {
      const { error } = await supabase.rpc("delete_chat_message", {
        p_message_id: messageId,
      });

      if (error) throw error;

      await loadChat();
      msg("チャットを削除した。");
    } catch (error) {
      console.error(error);
      msg(error.message || "チャット削除エラー", true);
    }
  });
}

async function banUser(targetUserId, banType) {
  await runLocked(async () => {
    try {
      const reason = window.prompt(
        `${banType === "chat" ? "チャットBAN" : "ゲームBAN"}の理由を入れて`
      );

      if (!reason || !reason.trim()) {
        msg("理由を入れて。", true);
        return;
      }

      const minutesText = window.prompt("BAN時間（分）。永久なら空欄でOK");
      const minutes =
        minutesText && minutesText.trim() !== "" ? Number(minutesText) : null;

      if (minutes !== null && (!Number.isInteger(minutes) || minutes <= 0)) {
        msg("分数を正しく入れて。", true);
        return;
      }

      const { error } = await supabase.rpc("ban_user", {
        p_target_user_id: targetUserId,
        p_ban_type: banType,
        p_reason: reason.trim(),
        p_minutes: minutes,
      });

      if (error) throw error;

      await loadChat();
      await loadBanUsers();
      await checkBanStatus();
      msg(`${banType === "chat" ? "チャットBAN" : "ゲームBAN"}した。`);
    } catch (error) {
      console.error(error);
      msg(error.message || "BANエラー", true);
    }
  });
}

async function unbanUser(banType) {
  await runLocked(async () => {
    try {
      const targetUserId = banTargetUserId.value.trim();

      if (!targetUserId) {
        msg("解除する user_id を入れて。", true);
        return;
      }

      const { error } = await supabase.rpc("unban_user", {
        p_target_user_id: targetUserId,
        p_ban_type: banType,
      });

      if (error) throw error;

      await loadBanUsers();
      await checkBanStatus();
      msg(`${banType === "chat" ? "チャットBAN" : "ゲームBAN"}を解除した。`);
    } catch (error) {
      console.error(error);
      msg(error.message || "BAN解除エラー", true);
    }
  });
}

async function loadBanUsers() {
  try {
    if (!currentProfile?.is_admin) {
      adminUserList.innerHTML = "";
      return;
    }

    const { data, error } = await supabase.rpc("get_active_bans_admin");
    if (error) throw error;

    adminUserList.innerHTML = "";

    if (!data || !data.length) {
      adminUserList.innerHTML = `<p class="subText">BAN中ユーザーはいない。</p>`;
      return;
    }

    data.forEach((ban) => {
      const div = document.createElement("div");
      div.className = "marketItem";
      div.innerHTML = `
        <div class="marketInfo">
          <strong>${escapeHtml(ban.username_snapshot || ban.user_id)}</strong>
          <span>user_id: ${escapeHtml(ban.user_id)}</span>
          <span>種類: ${escapeHtml(ban.ban_type)}</span>
          <span>理由: ${escapeHtml(ban.reason || "理由なし")}</span>
          <span>期限: ${ban.expires_at ? escapeHtml(formatDate(ban.expires_at)) : "永久"}</span>
        </div>
      `;
      adminUserList.appendChild(div);
    });
  } catch (error) {
    console.error(error);
    msg(error.message || "BAN一覧取得エラー", true);
  }
}

async function loadChat() {
  try {
    if (!currentProfile) return;

    let messages;
    let error;

    if (currentProfile.is_admin) {
      const result = await supabase.rpc("get_chat_messages_admin");
      messages = result.data;
      error = result.error;
    } else {
      const result = await supabase.rpc("get_chat_messages");
      messages = result.data;
      error = result.error;
    }

    if (error) throw error;

    if (!messages || messages.length === 0) {
      chatList.innerHTML = `<p class="subText">まだチャットがない。</p>`;
      return;
    }

    chatList.innerHTML = "";

    [...messages].reverse().forEach((item) => {
      const wrapper = document.createElement("div");
      wrapper.className = "chatItem";

      if (currentProfile && item.user_id && item.user_id === currentProfile.id) {
        wrapper.classList.add("me");
      }

      if (item.username_snapshot === "admin" || item.username_snapshot === "管理者") {
        wrapper.classList.add("admin-author");
      }

      const meta = document.createElement("div");
      meta.className = "chatMeta";
      meta.innerHTML = `
        <strong>${escapeHtml(item.username_snapshot)}</strong>
        <span>${escapeHtml(formatDate(item.created_at))}</span>
      `;

      const body = document.createElement("div");
      body.className = "chatMessage";
      body.textContent = item.message;

      wrapper.appendChild(meta);
      wrapper.appendChild(body);

      if (currentProfile.is_admin && item.user_id) {
        const adminLine = document.createElement("div");
        adminLine.className = "chatAdminLine";
        adminLine.textContent = `user_id: ${item.user_id}`;
        wrapper.appendChild(adminLine);

        const actions = document.createElement("div");
        actions.className = "chatAdminActions";

        const delBtn = document.createElement("button");
        delBtn.className = "smallBtn chatDeleteBtn";
        delBtn.textContent = "削除";
        delBtn.addEventListener("click", () => deleteChatMessage(item.chat_id));

        const chatBanBtn = document.createElement("button");
        chatBanBtn.className = "smallBtn chatBanBtn";
        chatBanBtn.textContent = "チャットBAN";
        chatBanBtn.addEventListener("click", () => banUser(item.user_id, "chat"));

        const gameBanBtn = document.createElement("button");
        gameBanBtn.className = "smallBtn chatBanBtn";
        gameBanBtn.textContent = "ゲームBAN";
        gameBanBtn.addEventListener("click", () => banUser(item.user_id, "game"));

        actions.appendChild(delBtn);
        actions.appendChild(chatBanBtn);
        actions.appendChild(gameBanBtn);

        wrapper.appendChild(actions);
      }

      chatList.appendChild(wrapper);
    });

    setButtonsDisabled(uiLocked);
  } catch (error) {
    console.error(error);
    msg(error.message || "チャット取得エラー", true);
  }
}

async function loadMarket() {
  try {
    const user = await getCurrentUser();
    if (!user) return;

    const { data: listings, error } = await supabase
      .from("market_listings")
      .select("*");

    if (error) throw error;

    const sortedListings = sortListings(listings || []);

    if (!sortedListings.length) {
      marketList.innerHTML = `<p class="subText">まだ出品がない。</p>`;
      return;
    }

    marketList.innerHTML = "";

    for (const listing of sortedListings) {
      const total = listing.quantity * listing.price_per_unit;
      const item = document.createElement("div");
      item.className = "marketItem";

      item.innerHTML = `
        <div class="marketInfo">
          <strong>${escapeHtml(jpName(listing.resource_type))}</strong>
          <span>数量: ${listing.quantity}</span>
          <span>単価: ${listing.price_per_unit}</span>
          <span>合計: ${total}</span>
          <span>${listing.seller_id === user.id ? "あなたの出品" : "出品中"}</span>
        </div>
        <div class="marketActions">
          ${
            listing.seller_id === user.id
              ? `<button data-id="${listing.id}" class="cancelBtn smallBtn">取り消し</button>`
              : `<button data-id="${listing.id}" class="buyBtn smallBtn">買う</button>`
          }
        </div>
      `;

      marketList.appendChild(item);
    }

    document.querySelectorAll(".buyBtn").forEach((btn) => {
      btn.addEventListener("click", () => buyListing(Number(btn.dataset.id)));
    });

    document.querySelectorAll(".cancelBtn").forEach((btn) => {
      btn.addEventListener("click", () => cancelListing(Number(btn.dataset.id)));
    });

    setButtonsDisabled(uiLocked);
  } catch (error) {
    console.error(error);
    msg(error.message || "マーケット取得エラー", true);
  }
}

async function loadPrices() {
  try {
    const { data, error } = await supabase
      .from("market_prices")
      .select("*")
      .order("resource_type", { ascending: true });

    if (error) throw error;

    priceBoard.innerHTML = "";

    if (!data || !data.length) {
      priceBoard.innerHTML = `<p class="subText">相場データがない。</p>`;
      return;
    }

    for (const row of data) {
      const box = document.createElement("div");
      box.className = "priceBox";
      box.innerHTML = `
        <span>${escapeHtml(jpName(row.resource_type))}</span>
        <strong>${row.current_price}</strong>
        <span>範囲: ${row.min_price}〜${row.max_price}</span>
      `;
      priceBoard.appendChild(box);
    }
  } catch (error) {
    console.error(error);
    msg(error.message || "相場取得エラー", true);
  }
}

async function updatePrices() {
  await runLocked(async () => {
    try {
      const { error } = await supabase.rpc("update_market_prices");
      if (error) throw error;

      await loadPrices();
      await loadRankings();
      await checkBanStatus();
      msg("相場を更新した。");
    } catch (error) {
      console.error(error);
      msg(error.message || "相場更新エラー", true);
    }
  });
}

async function loadRankings() {
  try {
    const { data, error } = await supabase
      .from("rankings")
      .select("*")
      .order("total_assets", { ascending: false })
      .limit(100);

    if (error) throw error;

    rankingList.innerHTML = "";

    const currentRankText = document.getElementById("currentRankText");

    if (!data || data.length === 0) {
      rankingList.innerHTML = `<p class="subText">まだランキングがない。</p>`;
      if (currentRankText) {
        currentRankText.textContent = "自分の順位: まだなし";
      }
      return;
    }

    let myRank = null;
    let myAssets = null;

    data.forEach((player, index) => {
      const item = document.createElement("div");
      item.className = "marketItem";

      const rank = index + 1;
      let rankLabel = `#${rank}`;
      if (rank === 1) rankLabel = "🥇 1位";
      if (rank === 2) rankLabel = "🥈 2位";
      if (rank === 3) rankLabel = "🥉 3位";

      const isMe =
        currentProfile &&
        player.id &&
        player.id === currentProfile.id;

      if (isMe) {
        item.classList.add("me");
        myRank = rank;
        myAssets = player.total_assets;
      }

      item.innerHTML = `
        <div class="marketInfo">
          <strong><span class="rankNum">${rankLabel}</span> ${escapeHtml(player.username ?? "unknown")}</strong>
          <span>総資産: ${player.total_assets ?? 0}</span>
          <span>称号: ${escapeHtml(player.title ?? "なし")} / Lv.${player.level ?? 1}</span>
          <span>所持: ${player.money ?? 0} / 木 ${player.wood ?? 0} / 石 ${player.stone ?? 0} / 鉄 ${player.iron ?? 0}</span>
        </div>
      `;

      rankingList.appendChild(item);
    });

    if (currentRankText) {
      if (myRank !== null) {
        currentRankText.textContent = `自分の順位: ${myRank}位 / 総資産: ${myAssets}`;
      } else {
        currentRankText.textContent = "自分の順位: 100位圏外、またはID未対応";
      }
    }
  } catch (error) {
    console.error(error);
    msg(error.message || "ランキング取得エラー", true);
  }
}

async function loadHistory() {
  try {
    const { data, error } = await supabase
      .from("trade_history")
      .select("*")
      .order("created_at", { ascending: false })
      .limit(15);

    if (error) throw error;

    if (!data || !data.length) {
      historyList.innerHTML = `<p class="subText">まだ取引履歴がない。</p>`;
      return;
    }

    historyList.innerHTML = "";

    data.forEach((trade) => {
      const item = document.createElement("div");
      item.className = "marketItem";
      item.innerHTML = `
        <div class="marketInfo">
          <strong>${escapeHtml(jpName(trade.resource_type))} × ${trade.quantity}</strong>
          <span>単価: ${trade.price_per_unit} / 合計: ${trade.total_price}</span>
          <span>手数料: ${trade.fee} / 売り手受取: ${trade.seller_receive}</span>
          <span>${escapeHtml(formatDate(trade.created_at))}</span>
        </div>
      `;
      historyList.appendChild(item);
    });
  } catch (error) {
    console.error(error);
    msg(error.message || "履歴取得エラー", true);
  }
}

async function loadUser(user) {
  showApp(true);

  const profile = await createProfileIfMissing(user);
  const gatherCount = await getTodayGatherCount(user.id);

  currentProfile = profile;
  welcomeText.textContent = `ようこそ、${profile.username}`;
  updateProfileUI(profile, gatherCount);

  await refreshProfileUI();
  await checkBanStatus();
  await loadPrices();
  await loadMarket();
  await loadRankings();
  await loadHistory();
  await loadChat();
  await loadBanUsers();
}

signupBtn.addEventListener("click", signup);
loginBtn.addEventListener("click", login);
logoutBtn.addEventListener("click", logout);
gatherBtn.addEventListener("click", gather);
sellBtn.addEventListener("click", sellItem);
changeUsernameBtn.addEventListener("click", changeUsername);
refreshMarketBtn.addEventListener("click", loadMarket);
marketSort.addEventListener("change", loadMarket);
updatePricesBtn.addEventListener("click", updatePrices);
refreshRankingBtn.addEventListener("click", loadRankings);
refreshHistoryBtn.addEventListener("click", loadHistory);

sendChatBtn.addEventListener("click", sendChatMessage);
refreshChatBtn.addEventListener("click", loadChat);
unbanChatBtn.addEventListener("click", () => unbanUser("chat"));
unbanGameBtn.addEventListener("click", () => unbanUser("game"));

buyWoodNpcBtn.addEventListener("click", () =>
  buyFromNpc("wood", Number(npcWoodQty.value))
);
buyStoneNpcBtn.addEventListener("click", () =>
  buyFromNpc("stone", Number(npcStoneQty.value))
);
buyIronNpcBtn.addEventListener("click", () =>
  buyFromNpc("iron", Number(npcIronQty.value))
);

(async function init() {
  try {
    showApp(false);

    const {
      data: { session },
      error,
    } = await supabase.auth.getSession();

    if (error) throw error;

    if (session?.user) {
      await loadUser(session.user);
    }
  } catch (error) {
    console.error(error);
    showApp(false);
    msg(error.message || "初期化エラー", true);
  }
})();

function showToast(text) {
  if (!toastContainer) return;

  const div = document.createElement("div");
  div.className = "toast success";
  div.textContent = text;

  toastContainer.appendChild(div);

  setTimeout(() => {
    div.remove();
  }, 4000);
}

async function loadNotifications() {
  try {
    const user = await getCurrentUser();
    if (!user) return;

    const { data, error } = await supabase
      .from("notifications")
      .select("*")
      .eq("user_id", user.id)
      .eq("is_read", false)
      .order("created_at", { ascending: true });

    if (error) throw error;
    if (!data || !data.length) return;

    for (const n of data) {
      if (n.id > latestNotificationId) {
        showToast(n.text);
        latestNotificationId = n.id;
      }
    }

    const unreadIds = data.map((n) => n.id);

    await supabase
      .from("notifications")
      .update({ is_read: true })
      .in("id", unreadIds);
  } catch (error) {
    console.error(error);
  }
}

function startNotificationPolling() {
  if (notificationPollTimer) clearInterval(notificationPollTimer);

  loadNotifications();
  notificationPollTimer = setInterval(loadNotifications, 10000);
}
