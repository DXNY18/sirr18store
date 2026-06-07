const ADMIN_TOKEN_KEY = "adminToken";
const ADMIN_PROFILE_KEY = "adminProfile";
const USER_TOKEN_KEY = "userToken";
const USER_PROFILE_KEY = "userProfile";

const getApiBaseUrl = () => {
  if (process.env.REACT_APP_API_BASE_URL) {
    return process.env.REACT_APP_API_BASE_URL.replace(/\/+$/, "");
  }

  if (typeof window !== "undefined") {
    // Jika sedang di localhost, gunakan path lokal. Jika di Vercel, gunakan URL InfinityFree.
    return window.location.hostname === "localhost"
      ? `${window.location.protocol}//${window.location.hostname}/project_akhir/backend/api`
      : "https://sirr18store.infinityfreeapp.com/backend/api"; // <-- GANTI DENGAN URL ASLI ANDA
  }

  return "http://localhost/project_akhir/backend/api";
};

const API_BASE_URL = getApiBaseUrl();

async function request(path, options = {}) {
  const {
    includeAuth = true,
    authType = null,
    body,
    headers: customHeaders = {},
    ...restOptions
  } = options;

  const headers = {
    Accept: "application/json",
    ...customHeaders
  };

  if (body !== undefined) {
    headers["Content-Type"] = "application/json";
  }

  const resolvedAuthType = authType || (includeAuth ? "admin" : "none");

  if (resolvedAuthType !== "none") {
    const token = resolvedAuthType === "user" ? getUserToken() : getAdminToken();
    if (token) {
      headers.Authorization = `Bearer ${token}`;
    }
  }

  let response;
  try {
    response = await fetch(`${API_BASE_URL}/${path}`, {
      ...restOptions,
      headers,
      body: body !== undefined ? JSON.stringify(body) : undefined
    });
  } catch (error) {
    const reason =
      error instanceof Error && error.message ? ` ${error.message}` : "";
    throw new Error(
      `Gagal terhubung ke backend PHP di ${API_BASE_URL}/${path}.${reason}`
    );
  }

  const rawResponse = await response.text();
  let payload = null;
  try {
    payload = rawResponse ? JSON.parse(rawResponse) : null;
  } catch (error) {
    const trimmedResponse = rawResponse.trim();
    const preview = trimmedResponse ? trimmedResponse.slice(0, 180) : "";
    throw new Error(
      preview
        ? `Respons backend tidak valid: ${preview}`
        : "Respons backend tidak valid."
    );
  }

  if (!response.ok || payload?.success === false) {
    const message = payload?.message || "Permintaan ke server gagal.";
    const requestError = new Error(message);
    requestError.status = response.status;
    throw requestError;
  }

  return payload.data;
}

export function getAdminToken() {
  return localStorage.getItem(ADMIN_TOKEN_KEY) || "";
}

export function getAdminProfile() {
  const raw = localStorage.getItem(ADMIN_PROFILE_KEY);

  if (!raw) {
    return null;
  }

  try {
    return JSON.parse(raw);
  } catch (error) {
    return null;
  }
}

export function isAdminAuthenticated() {
  return Boolean(getAdminToken());
}

function clearStoredAdminSession() {
  localStorage.removeItem(ADMIN_TOKEN_KEY);
  localStorage.removeItem(ADMIN_PROFILE_KEY);
}

function clearStoredUserSession() {
  localStorage.removeItem(USER_TOKEN_KEY);
  localStorage.removeItem(USER_PROFILE_KEY);
}

export function storeAdminSession(session) {
  localStorage.setItem(ADMIN_TOKEN_KEY, session.token);
  localStorage.setItem(ADMIN_PROFILE_KEY, JSON.stringify(session.admin));
  window.dispatchEvent(new Event("authchange"));
}

export function clearAdminSession() {
  clearStoredAdminSession();
  window.dispatchEvent(new Event("authchange"));
}

export function getUserToken() {
  return localStorage.getItem(USER_TOKEN_KEY) || "";
}

export function getUserProfile() {
  const raw = localStorage.getItem(USER_PROFILE_KEY);

  if (!raw) {
    return null;
  }

  try {
    return JSON.parse(raw);
  } catch (error) {
    return null;
  }
}

export function isUserAuthenticated() {
  return Boolean(getUserToken());
}

export function storeUserSession(session) {
  localStorage.setItem(USER_TOKEN_KEY, session.token);
  localStorage.setItem(USER_PROFILE_KEY, JSON.stringify(session.user));
  window.dispatchEvent(new Event("authchange"));
}

export function clearUserSession() {
  clearStoredUserSession();
  window.dispatchEvent(new Event("authchange"));
}

export function fetchGames() {
  return request("games.php", {
    method: "GET",
    includeAuth: false
  });
}

export function fetchBanners() {
  return request("banners.php", { method: "GET", includeAuth: false });
}

export function loginAdmin(email, password) {
  return request("admin_login.php", {
    method: "POST",
    includeAuth: false,
    body: { email, password }
  });
}

export function loginUser(email, password) {
  return request("user_login.php", {
    method: "POST",
    includeAuth: false,
    body: { email, password }
  });
}

export function registerUser(username, email, password) {
  return request("user_register.php", {
    method: "POST",
    includeAuth: false,
    body: { username, email, password }
  });
}

export function createOrder(orderPayload) {
  return request("order_create.php", {
    method: "POST",
    authType: "user",
    body: orderPayload
  });
}

export function validateVoucher(voucherPayload) {
  return request("voucher_validate.php", {
    method: "POST",
    includeAuth: false,
    body: voucherPayload
  });
}

export function saveBanner(bannerPayload) {
  return request("banner_save.php", {
    method: "POST",
    body: bannerPayload
  });
}

export function deleteBanner(bannerId) {
  return request("banner_delete.php", {
    method: "POST",
    body: { bannerId }
  });
}

export function fetchVouchers() {
  return request("vouchers.php", { method: "GET" });
}

export function saveVoucher(voucherPayload) {
  return request("voucher_save.php", {
    method: "POST",
    body: voucherPayload
  });
}

export function deleteVoucher(voucherId) {
  return request("voucher_delete.php", {
    method: "POST",
    body: { voucherId }
  });
}

export function fetchOrders() {
  return request("orders.php", { method: "GET" });
}

export function fetchUsers() {
  return request("users.php", { method: "GET" });
}

export function fetchAdmins() {
  return request("admins.php", { method: "GET" });
}

export function saveAdmin(adminPayload) {
  return request("admin_save.php", {
    method: "POST",
    body: adminPayload
  });
}

export function deleteAdmin(adminId) {
  return request("admin_delete.php", {
    method: "POST",
    body: { adminId }
  });
}

export function deleteUser(userId) {
  return request("user_delete.php", {
    method: "POST",
    body: { userId }
  });
}

export function updateOrderStatus(orderId, status, rejectionReason = "") {
  return request("order_status.php", {
    method: "POST",
    body: { orderId, status, rejectionReason }
  });
}

export function saveGameItems(gameId, items) {
  return request("game_items_save.php", {
    method: "POST",
    body: { gameId, items }
  });
}

export function saveGame(gamePayload) {
  return request("game_save.php", {
    method: "POST",
    body: gamePayload
  });
}

export function deleteGame(gameId) {
  return request("game_delete.php", {
    method: "POST",
    body: { gameId }
  });
}

export function fetchUserOrders() {
  return request("user_orders.php", {
    method: "GET",
    authType: "user"
  });
}
