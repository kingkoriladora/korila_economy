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

const refreshMarketBtn = document.getElementById("refreshMarketBtn");
const marketSort = document.getElementById("marketSort");
const marketList = document.getElementById("marketList");

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

dailyLimitText.textContent = DAILY_GATHER_LIMIT;

let uiLocked = false;

function msg(text, isError = false) {
  messageText.textContent = text;
  messageText.style.color = isError ? "#fca5a5" : "#bfdbfe";
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
  ].forEach((btn) => {
    if (btn) btn.disabled = disabled;
  });

  document.querySelectorAll(".buyBtn, .cancelBtn").forEach((btn) => {
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

  welcomeText.textContent = `ようこそ、${profile.username}`;
  updateProfileUI(profile, gatherCount);

  if (profile.is_admin) {
    updatePricesBtn.textContent = "相場更新（管理者）";
  } else {
    updatePricesBtn.textContent = "相場更新";
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
      msg("ログイン成功");
    } catch (error) {
      console.error(error);
      msg(error.message || "ログインエラー", true);
    }
  });
}

async function logout() {
  await runLocked(async () => {
    try {
      const { error } = await supabase.auth.signOut();
      if (error) throw error;

      authSection.classList.remove("hidden");
      appSection.classList.add("hidden");
      marketList.innerHTML = "";
      priceBoard.innerHTML = "";
      rankingList.innerHTML = "";
      historyList.innerHTML = "";
      msg("ログアウトした");
    } catch (error) {
      console.error(error);
      msg(error.message || "ログアウトエラー", true);
    }
  });
}

async function gather() {
  await runLocked(async () => {
    try {
      const { data, error } = await supabase.rpc("gather_resource");
      if (error) throw error;

      await refreshProfileUI();
      await loadRankings();
      msg(`${jpName(data.resource)}を1個ゲット`);
    } catch (error) {
      console.error(error);
      msg(error.message || "採取エラー", true);
    }
  });
}

async function sellItem() {
  await runLocked(async () => {
    try {
      const resource = sellResource.value;
      const quantity = Number(sellQuantity.value);
      const price = Number(sellPrice.value);

      if (!["wood", "stone", "iron"].includes(resource)) {
        msg("資源が変。", true);
        return;
      }

      if (!Number.isInteger(quantity) || quantity <= 0) {
        msg("数量を正しく入れて。", true);
        return;
      }

      if (quantity > 99) {
        msg("1回の出品は99個まで。", true);
        return;
      }

      if (!Number.isInteger(price) || price <= 0) {
        msg("価格を正しく入れて。", true);
        return;
      }

      const { error } = await supabase.rpc("create_market_listing", {
        p_resource_type: resource,
        p_quantity: quantity,
        p_price_per_unit: price,
      });

      if (error) throw error;

      await refreshProfileUI();
      await loadMarket();
      await loadRankings();

      msg(`${jpName(resource)}を${quantity}個出品した。`);
    } catch (error) {
      console.error(error);
      msg(error.message || "出品エラー", true);
    }
  });
}

async function buyListing(listingId) {
  await runLocked(async () => {
    try {
      const { data, error } = await supabase.rpc("buy_market_listing", {
        p_listing_id: listingId,
      });

      if (error) throw error;

      await refreshProfileUI();
      await loadMarket();
      await loadHistory();
      await loadRankings();

      msg(`${jpName(data.resource_type)}を${data.quantity}個買った。手数料 ${data.fee} コイン。`);
    } catch (error) {
      console.error(error);
      msg(error.message || "購入エラー", true);
    }
  });
}

async function cancelListing(listingId) {
  await runLocked(async () => {
    try {
      const { data, error } = await supabase.rpc("cancel_market_listing", {
        p_listing_id: listingId,
      });

      if (error) throw error;

      await refreshProfileUI();
      await loadMarket();
      await loadRankings();

      msg(`${jpName(data.resource_type)}の出品を取り消した。`);
    } catch (error) {
      console.error(error);
      msg(error.message || "取り消しエラー", true);
    }
  });
}

async function changeUsername() {
  await runLocked(async () => {
    try {
      const newName = newUsernameInput.value.trim();

      if (!newName) {
        msg("新しいユーザー名を入れて。", true);
        return;
      }

      if (newName.length < 2 || newName.length > 16) {
        msg("ユーザー名は2〜16文字にして。", true);
        return;
      }

      const { data, error } = await supabase.rpc("change_username", {
        p_new_username: newName,
      });

      if (error) throw error;

      newUsernameInput.value = "";
      await refreshProfileUI();
      await loadRankings();

      msg(`ユーザー名を「${data.username}」に変更した。`);
    } catch (error) {
      console.error(error);
      msg(error.message || "ユーザー名変更エラー", true);
    }
  });
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

    if (!sortedListings || sortedListings.length === 0) {
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
          <strong>${jpName(listing.resource_type)}</strong>
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

    if (!data || data.length === 0) {
      priceBoard.innerHTML = `<p class="subText">相場データがない。</p>`;
      return;
    }

    for (const row of data) {
      const box = document.createElement("div");
      box.className = "priceBox";
      box.innerHTML = `
        <span>${jpName(row.resource_type)}</span>
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
      .limit(10);

    if (error) throw error;

    if (!data || data.length === 0) {
      rankingList.innerHTML = `<p class="subText">まだランキングがない。</p>`;
      return;
    }

    rankingList.innerHTML = "";

    data.forEach((player, index) => {
      const item = document.createElement("div");
      item.className = "marketItem";
      item.innerHTML = `
        <div class="marketInfo">
          <strong><span class="rankNum">#${index + 1}</span> ${player.username}</strong>
          <span>総資産: ${player.total_assets}</span>
          <span>称号: ${player.title} / Lv.${player.level}</span>
          <span>所持: ${player.money} / 木 ${player.wood} / 石 ${player.stone} / 鉄 ${player.iron}</span>
        </div>
      `;
      rankingList.appendChild(item);
    });
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

    if (!data || data.length === 0) {
      historyList.innerHTML = `<p class="subText">まだ取引履歴がない。</p>`;
      return;
    }

    historyList.innerHTML = "";

    data.forEach((trade) => {
      const item = document.createElement("div");
      item.className = "marketItem";
      item.innerHTML = `
        <div class="marketInfo">
          <strong>${jpName(trade.resource_type)} × ${trade.quantity}</strong>
          <span>単価: ${trade.price_per_unit} / 合計: ${trade.total_price}</span>
          <span>手数料: ${trade.fee} / 売り手受取: ${trade.seller_receive}</span>
          <span>${formatDate(trade.created_at)}</span>
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
  authSection.classList.add("hidden");
  appSection.classList.remove("hidden");

  const profile = await createProfileIfMissing(user);
  const gatherCount = await getTodayGatherCount(user.id);

  welcomeText.textContent = `ようこそ、${profile.username}`;
  updateProfileUI(profile, gatherCount);

  await refreshProfileUI();
  await loadPrices();
  await loadMarket();
  await loadRankings();
  await loadHistory();
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

(async function init() {
  try {
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
    msg(error.message || "初期化エラー", true);
  }
})();