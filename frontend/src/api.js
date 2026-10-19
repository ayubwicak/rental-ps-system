const API_URL = import.meta.env.VITE_API_URL || "/api";

// Sesi disimpan pada cookie httpOnly yang dikelola server (bukan localStorage).
// Handler ini dipanggil saat server membalas 401 agar UI kembali ke halaman login.
let unauthorizedHandler = null;

export function setUnauthorizedHandler(fn) {
  unauthorizedHandler = typeof fn === "function" ? fn : null;
}

async function request(path, { method = "GET", body, auth = true } = {}) {
  const headers = { "Content-Type": "application/json" };
  const res = await fetch(`${API_URL}${path}`, {
    method,
    headers,
    credentials: "include",
    body: body ? JSON.stringify(body) : undefined,
  });
  const data = await res.json().catch(() => ({}));

  // Sesi berakhir / token tidak berlaku: beri tahu aplikasi untuk kembali ke login
  if (res.status === 401 && auth) {
    if (unauthorizedHandler) unauthorizedHandler();
  }

  if (!res.ok) {
    const err = new Error(data.error || "Terjadi kesalahan pada server.");
    err.availableUnits = data.availableUnits;
    err.conflictingBooking = data.conflictingBooking;
    throw err;
  }
  return data;
}

export const api = {
  // auth
  login: (username, password) =>
    request("/auth/login", { method: "POST", body: { username, password }, auth: false }),
  logout: () => request("/auth/logout", { method: "POST", auth: false }),
  me: () => request("/auth/me"),
  getPublicStats: () => request("/public/stats", { auth: false }),
  getUsers: () => request("/auth/users"),
  addUser: (payload) => request("/auth/users", { method: "POST", body: payload }),
  deleteUser: (id) => request(`/auth/users/${id}`, { method: "DELETE" }),
  changePassword: (payload) => request("/auth/change-password", { method: "POST", body: payload }),

  // audit
  getAuditLogs: (limit = 100) => request(`/audit?limit=${Number(limit) || 100}`),

  // units / sessions
  getUnits: () => request("/units"),
  getAddons: () => request("/units/addons"),
  saveAddon: (payload) => request("/units/addons", { method: "POST", body: payload }),
  deleteAddon: (id) => request(`/units/addons/${id}`, { method: "DELETE" }),
  startSession: (unitId, payload) =>
    request(`/units/${unitId}/start`, { method: "POST", body: payload }),
  pauseSession: (unitId) =>
    request(`/units/${unitId}/pause`, { method: "POST" }),
  resumeSession: (unitId) =>
    request(`/units/${unitId}/resume`, { method: "POST" }),
  switchUnit: (unitId, targetUnitId) =>
    request(`/units/${unitId}/switch`, { method: "POST", body: { targetUnitId } }),
  updateSessionAddons: (unitId, addons) =>
    request(`/units/${unitId}/addons`, { method: "POST", body: { addons } }),
  stopSession: (unitId, payload) =>
    request(`/units/${unitId}/stop`, { method: "POST", body: typeof payload === "string" ? { paymentMethod: payload } : payload }),

  // bookings
  getBookings: () => request("/bookings"),
  addBooking: (payload) => request("/bookings", { method: "POST", body: payload }),
  checkInBooking: (id, targetUnitId) =>
    request(`/bookings/${id}/checkin`, {
      method: "POST",
      body: targetUnitId ? { targetUnitId } : undefined,
    }),

  // members
  getMembers: () => request("/members"),
  addMember: (payload) => request("/members", { method: "POST", body: payload }),

  // transactions / reports
  getTransactions: () => request("/transactions"),
  getReportSummary: () => request("/transactions/report/summary"),
};
