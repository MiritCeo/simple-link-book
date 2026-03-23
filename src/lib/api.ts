export const API_URL = (import.meta as any).env?.VITE_API_URL
  || (typeof window !== "undefined" ? window.location.origin : "http://localhost:4000");

const getToken = () => localStorage.getItem("auth_token");
const setToken = (token: string) => localStorage.setItem("auth_token", token);
const getClientToken = () => localStorage.getItem("client_token");
const setClientToken = (token: string) => localStorage.setItem("client_token", token);

type FetchOptions = RequestInit & { auth?: boolean };

async function apiFetch<T>(path: string, options: FetchOptions = {}): Promise<T> {
  const headers: Record<string, string> = {
    "Content-Type": "application/json",
    ...(options.headers as Record<string, string> | undefined),
  };
  if (options.auth) {
    const token = getToken();
    if (token) {
      headers.Authorization = `Bearer ${token}`;
    }
  }
  const res = await fetch(`${API_URL}${path}`, {
    ...options,
    headers,
  });
  if (!res.ok) {
    const payload = await res.json().catch(() => ({}));
    throw new Error(payload.error || `Request failed: ${res.status}`);
  }
  return res.json();
}

async function clientApiFetch<T>(path: string, options: FetchOptions = {}): Promise<T> {
  const headers: Record<string, string> = {
    "Content-Type": "application/json",
    ...(options.headers as Record<string, string> | undefined),
  };
  const token = getClientToken();
  if (token) {
    headers.Authorization = `Bearer ${token}`;
  }
  const res = await fetch(`${API_URL}${path}`, {
    ...options,
    headers,
  });
  if (res.status === 401) {
    localStorage.removeItem("client_token");
    localStorage.removeItem("client_id");
    localStorage.removeItem("client_salon_id");
    if (typeof window !== "undefined") {
      window.location.assign("/konto/logowanie");
    }
    throw new Error("UNAUTHORIZED");
  }
  if (!res.ok) {
    const payload = await res.json().catch(() => ({}));
    throw new Error(payload.error || `Request failed: ${res.status}`);
  }
  return res.json();
}

export async function login(email: string, password: string) {
  const data = await apiFetch<{ token: string; salonId: string | null; userId: string; role: "SUPER_ADMIN" | "OWNER" | "STAFF"; salons: any[]; inventoryRole?: "ADMIN" | "MANAGER" | "STAFF" }>(
    "/api/auth/login",
    { method: "POST", body: JSON.stringify({ email, password }) },
  );
  setToken(data.token);
  localStorage.setItem("auth_role", data.role);
  if (data.inventoryRole) localStorage.setItem("inventory_role", data.inventoryRole);
  if (data.salonId) localStorage.setItem("auth_salon_id", data.salonId);
  if (data.salons) localStorage.setItem("auth_salons", JSON.stringify(data.salons));
  return data;
}

export async function registerSalon(payload: {
  email: string;
  phone: string;
  password: string;
  salonName: string;
  salonSlug: string;
}) {
  const data = await apiFetch<{
    ok: boolean;
    pendingApproval: boolean;
    salonId: string | null;
    userId: string;
    role: "OWNER" | "STAFF" | "SUPER_ADMIN";
    salons: any[];
  }>("/api/auth/register", {
    method: "POST",
    body: JSON.stringify(payload),
  });
  return data;
}

export async function clientLogin(email: string, password: string) {
  const data = await apiFetch<{ token: string; clientId: string; salonId: string; salons?: any[] }>(
    "/api/client/login",
    { method: "POST", body: JSON.stringify({ email, password }) },
  );
  setClientToken(data.token);
  localStorage.setItem("client_id", data.clientId);
  localStorage.setItem("client_salon_id", data.salonId);
  if (data.salons) localStorage.setItem("client_salons", JSON.stringify(data.salons));
  return data;
}

export async function getClientMe() {
  return clientApiFetch<{ client: any; salonPanelAvailable?: boolean }>("/api/client/me");
}

export async function getClientAppointments() {
  return clientApiFetch<{ appointments: any[] }>("/api/client/appointments");
}

export async function getClientSalons() {
  return clientApiFetch<{ salons: any[]; activeSalonId?: string }>("/api/client/salons");
}

export async function switchClientSalon(salonId: string) {
  const data = await clientApiFetch<{ token: string; clientId: string; salonId: string }>("/api/client/switch-salon", {
    method: "POST",
    body: JSON.stringify({ salonId }),
  });
  setClientToken(data.token);
  localStorage.setItem("client_id", data.clientId);
  localStorage.setItem("client_salon_id", data.salonId);
  return data;
}

export async function attachClientSalon(token: string) {
  return clientApiFetch<{ ok: boolean; salons?: any[] }>("/api/client/salons/attach", {
    method: "POST",
    body: JSON.stringify({ token }),
  });
}

/** Publiczny katalog salonów Honly (mapa / mobile) */
export async function getPublicSalonCatalog(params: { q?: string; page?: number; limit?: number }) {
  const usp = new URLSearchParams();
  if (params.q) usp.set("q", params.q);
  if (params.page) usp.set("page", String(params.page));
  if (params.limit) usp.set("limit", String(params.limit));
  return apiFetch<{ salons: any[]; total: number; page: number; limit: number; pages: number }>(
    `/api/public/salons/catalog?${usp.toString()}`,
  );
}

/** Salony z Google w promieniu (backend + klucz GOOGLE_MAPS_API_KEY) */
export async function getPlacesNearby(params: { lat: number; lng: number; radius?: number; q?: string }) {
  const usp = new URLSearchParams({ lat: String(params.lat), lng: String(params.lng) });
  if (params.radius != null) usp.set("radius", String(params.radius));
  if (params.q?.trim()) usp.set("q", params.q.trim());
  return apiFetch<{ places: any[]; googleConfigured: boolean; googlePlacesNote?: string | null }>(
    `/api/public/places/nearby?${usp.toString()}`,
  );
}

export async function getClientRatingPending() {
  return clientApiFetch<{ pending: any[] }>("/api/client/ratings/pending");
}

export async function postClientRating(payload: { appointmentId: string; stars: number }) {
  return clientApiFetch<{ ok: boolean }>("/api/client/ratings", {
    method: "POST",
    body: JSON.stringify(payload),
  });
}

export async function getClientFavorites() {
  return clientApiFetch<{ honlySalons: any[]; googlePlaces: any[] }>("/api/client/favorites");
}

export async function addClientFavoriteSalon(salonId: string) {
  return clientApiFetch<{ ok: boolean }>("/api/client/favorites/salons", {
    method: "POST",
    body: JSON.stringify({ salonId }),
  });
}

export async function removeClientFavoriteSalon(salonId: string) {
  return clientApiFetch<{ ok: boolean }>(`/api/client/favorites/salons/${encodeURIComponent(salonId)}`, {
    method: "DELETE",
  });
}

export async function addClientFavoriteGooglePlace(payload: {
  googlePlaceId: string;
  displayName: string;
  displayAddress?: string;
  lat?: number;
  lng?: number;
}) {
  return clientApiFetch<{ ok: boolean }>("/api/client/favorites/google-places", {
    method: "POST",
    body: JSON.stringify(payload),
  });
}

export async function removeClientFavoriteGooglePlace(favoriteId: string) {
  return clientApiFetch<{ ok: boolean }>(`/api/client/favorites/google-places/${encodeURIComponent(favoriteId)}`, {
    method: "DELETE",
  });
}

export async function updateClientProfile(payload: { name: string; phone: string; email?: string }) {
  return clientApiFetch<{ client: any }>("/api/client/me", {
    method: "PUT",
    body: JSON.stringify(payload),
  });
}

export async function changeClientPassword(payload: { currentPassword: string; newPassword: string }) {
  return clientApiFetch<{ ok: boolean }>("/api/client/password", {
    method: "PUT",
    body: JSON.stringify(payload),
  });
}

export async function requestClientPasswordReset(email: string) {
  return apiFetch<{ ok: boolean; token?: string }>("/api/client/password-reset", {
    method: "POST",
    body: JSON.stringify({ email }),
  });
}

export async function confirmClientPasswordReset(payload: { token: string; newPassword: string }) {
  return apiFetch<{ ok: boolean }>("/api/client/password-reset/confirm", {
    method: "POST",
    body: JSON.stringify(payload),
  });
}

export async function switchSalon(salonId: string) {
  const data = await apiFetch<{ token: string; salonId: string; role: "OWNER" | "STAFF"; inventoryRole?: "ADMIN" | "MANAGER" | "STAFF" }>(
    "/api/auth/switch-salon",
    { method: "POST", auth: true, body: JSON.stringify({ salonId }) },
  );
  setToken(data.token);
  localStorage.setItem("auth_role", data.role);
  if (data.inventoryRole) localStorage.setItem("inventory_role", data.inventoryRole);
  localStorage.setItem("auth_salon_id", data.salonId);
  return data;
}

export async function getPublicSalon(slug: string) {
  return apiFetch<{ salon: any; services: any[]; staff: any[] }>(`/api/public/salons/${slug}`);
}

export async function getPublicAvailability(params: { slug: string; date: string; serviceId: string; staffId?: string }) {
  const query = new URLSearchParams({
    date: params.date,
    serviceId: params.serviceId,
    ...(params.staffId ? { staffId: params.staffId } : {}),
  });
  return apiFetch<{ slots: string[] }>(`/api/public/salons/${params.slug}/availability?${query.toString()}`);
}

export async function createPublicAppointment(
  slug: string,
  payload: {
    date: string;
    time: string;
    notes?: string;
    serviceId?: string;
    serviceIds?: string[];
    staffId?: string;
    client: { name: string; phone: string; email?: string; notes?: string };
  },
) {
  return apiFetch<{ appointment: any; cancelToken?: string }>(`/api/public/salons/${slug}/appointments`, {
    method: "POST",
    body: JSON.stringify(payload),
  });
}

export async function registerClientFromBooking(payload: { token: string; email?: string; password: string }) {
  return apiFetch<{ ok: boolean; token: string; clientId: string; salonId: string }>("/api/public/client/register", {
    method: "POST",
    body: JSON.stringify(payload),
  });
}

/** Rejestracja klienta — krok 1 (publiczne API, także mobile) */
export async function clientRegisterSessionStart(payload: { email: string; password: string; confirmPassword: string }) {
  return apiFetch<{ sessionToken: string; linkedSalonUser: boolean }>("/api/public/client/register/session", {
    method: "POST",
    body: JSON.stringify(payload),
  });
}

/** Krok 2 — telefon, wysyła SMS + e-mail z jednym kodem */
export async function clientRegisterSessionPhone(payload: { sessionToken: string; phone: string }) {
  return apiFetch<{ ok: boolean }>("/api/public/client/register/session/phone", {
    method: "POST",
    body: JSON.stringify(payload),
  });
}

export async function clientRegisterSessionResendCode(payload: { sessionToken: string }) {
  return apiFetch<{ ok: boolean }>("/api/public/client/register/session/resend-code", {
    method: "POST",
    body: JSON.stringify(payload),
  });
}

/** Krok 3 — kod weryfikacyjny, JWT jak po logowaniu */
export async function clientRegisterSessionVerify(payload: { sessionToken: string; code: string }) {
  return apiFetch<{
    ok: boolean;
    token: string;
    clientId: string;
    salonId: string;
    salons?: any[];
    linkedSalonUser: boolean;
  }>("/api/public/client/register/session/verify", {
    method: "POST",
    body: JSON.stringify(payload),
  });
}

export async function resendClientRegistrationCode(payload: { phone?: string; email?: string }) {
  return apiFetch<{ ok: boolean }>("/api/public/client/resend-code", {
    method: "POST",
    body: JSON.stringify(payload),
  });
}

export async function getPublicCancelDetails(token: string) {
  return apiFetch<{ appointment: any }>(`/api/public/cancel/${token}`);
}

export async function cancelPublicAppointment(token: string) {
  return apiFetch<{ ok: boolean }>(`/api/public/cancel/${token}`, {
    method: "POST",
  });
}

export async function getPublicCancelAvailability(token: string, date: string) {
  const query = new URLSearchParams({ date });
  return apiFetch<{ slots: string[] }>(`/api/public/cancel/${token}/availability?${query.toString()}`);
}

export async function reschedulePublicAppointment(token: string, payload: { date: string; time: string }) {
  return apiFetch<{ appointment: any }>(`/api/public/cancel/${token}/reschedule`, {
    method: "POST",
    body: JSON.stringify(payload),
  });
}

export async function getSalonProfile() {
  return apiFetch<{ salon: any }>("/api/salon/profile", { auth: true });
}

export async function updateSalonProfile(payload: {
  name: string;
  address: string;
  phone: string;
  hours?: string;
  description?: string;
  accentColor?: string;
  logoUrl?: string | null;
}) {
  return apiFetch<{ salon: any }>("/api/salon/profile", {
    method: "PUT",
    auth: true,
    body: JSON.stringify(payload),
  });
}

export async function getUserSalons() {
  return apiFetch<{ salons: any[] }>("/api/salon/user-salons", { auth: true });
}

export async function createUserSalon(payload: {
  name: string;
  slug: string;
  phone: string;
  address: string;
  hours?: string;
  description?: string;
}) {
  return apiFetch<{ salon: any }>("/api/salon/user-salons", {
    method: "POST",
    auth: true,
    body: JSON.stringify(payload),
  });
}

export async function updateUserSalon(id: string, payload: {
  name?: string;
  slug?: string;
  phone?: string;
  address?: string;
  hours?: string;
  description?: string;
}) {
  return apiFetch<{ salon: any }>(`/api/salon/user-salons/${id}`, {
    method: "PUT",
    auth: true,
    body: JSON.stringify(payload),
  });
}

export async function getSalonServices() {
  return apiFetch<{ services: any[] }>("/api/salon/services", { auth: true });
}

export async function getSalonStaff() {
  return apiFetch<{ staff: any[] }>("/api/salon/staff", { auth: true });
}

export async function getSalonClients(params?: {
  page?: number;
  pageSize?: number;
  search?: string;
  all?: boolean;
}) {
  const query = new URLSearchParams();
  if (params?.page) query.set("page", String(params.page));
  if (params?.pageSize) query.set("pageSize", String(params.pageSize));
  if (params?.search) query.set("search", params.search);
  if (params?.all) query.set("all", "true");
  const suffix = query.toString() ? `?${query.toString()}` : "";
  return apiFetch<{ clients: any[]; total?: number; page?: number; pageSize?: number }>(
    `/api/salon/clients${suffix}`,
    { auth: true },
  );
}

export async function getSalonAppointments() {
  return apiFetch<{ appointments: any[] }>("/api/salon/appointments", { auth: true });
}

export async function getSalonHours() {
  return apiFetch<{ hours: any[] }>("/api/salon/hours", { auth: true });
}

export async function saveSalonHours(hours: { weekday: number; open: string; close: string; active: boolean }[]) {
  return apiFetch<{ ok: boolean }>("/api/salon/hours", {
    method: "PUT",
    auth: true,
    body: JSON.stringify({ hours }),
  });
}

export async function getSalonExceptions() {
  return apiFetch<{ exceptions: any[] }>("/api/salon/hours/exceptions", { auth: true });
}

export async function createSalonException(payload: { date: string; label?: string; start?: string; end?: string; closed?: boolean }) {
  return apiFetch<{ exception: any }>("/api/salon/hours/exceptions", {
    method: "POST",
    auth: true,
    body: JSON.stringify(payload),
  });
}

export async function deleteSalonException(id: string) {
  return apiFetch<{ ok: boolean }>(`/api/salon/hours/exceptions/${id}`, {
    method: "DELETE",
    auth: true,
  });
}

export async function getSalonBreaks() {
  return apiFetch<{ breaks: any[] }>("/api/salon/breaks", { auth: true });
}

export async function createSalonBreak(payload: {
  type: "BREAK" | "BUFFER";
  label: string;
  days?: string;
  start?: string;
  end?: string;
  minutes?: number;
}) {
  return apiFetch<{ break: any }>("/api/salon/breaks", {
    method: "POST",
    auth: true,
    body: JSON.stringify(payload),
  });
}

export async function deleteSalonBreak(id: string) {
  return apiFetch<{ ok: boolean }>(`/api/salon/breaks/${id}`, {
    method: "DELETE",
    auth: true,
  });
}

export async function getNotificationSettings() {
  return apiFetch<{ settings: any[] }>("/api/salon/notifications/settings", { auth: true });
}

export async function saveNotificationSettings(settings: Array<{ event: string; smsEnabled: boolean; emailEnabled: boolean; timingMinutes?: number | null }>) {
  return apiFetch<{ ok: boolean }>("/api/salon/notifications/settings", {
    method: "PUT",
    auth: true,
    body: JSON.stringify({ settings }),
  });
}

export async function getNotificationTemplates() {
  return apiFetch<{ templates: any[] }>("/api/salon/notifications/templates", { auth: true });
}

export async function sendTestSms(payload: { to: string; message?: string }) {
  return apiFetch<{ ok: boolean }>("/api/salon/notifications/test-sms", {
    method: "POST",
    auth: true,
    body: JSON.stringify(payload),
  });
}

export async function sendTestEmail(payload: { to: string; subject?: string; body?: string }) {
  return apiFetch<{ ok: boolean }>("/api/salon/notifications/test-email", {
    method: "POST",
    auth: true,
    body: JSON.stringify(payload),
  });
}

export async function sendManualSms(payload: { to: string; message: string }) {
  return apiFetch<{ ok: boolean }>("/api/salon/notifications/send-sms", {
    method: "POST",
    auth: true,
    body: JSON.stringify(payload),
  });
}

export async function createNotificationTemplate(payload: { event: string; channel: "SMS" | "EMAIL"; subject?: string; body: string; active?: boolean }) {
  return apiFetch<{ template: any }>("/api/salon/notifications/templates", {
    method: "POST",
    auth: true,
    body: JSON.stringify(payload),
  });
}

export async function updateNotificationTemplate(id: string, payload: { subject?: string; body: string; active?: boolean }) {
  return apiFetch<{ template: any }>(`/api/salon/notifications/templates/${id}`, {
    method: "PUT",
    auth: true,
    body: JSON.stringify(payload),
  });
}

export async function createClient(payload: { name: string; phone: string; email?: string; notes?: string; allergies?: string }) {
  return apiFetch<{ client: any }>("/api/salon/clients", {
    method: "POST",
    auth: true,
    body: JSON.stringify(payload),
  });
}

export async function updateClient(id: string, payload: { name: string; phone: string; email?: string; notes?: string; allergies?: string }) {
  return apiFetch<{ client: any }>(`/api/salon/clients/${id}`, {
    method: "PUT",
    auth: true,
    body: JSON.stringify(payload),
  });
}

export async function importSalonClients(payload: { includeVisits?: boolean; updateExisting?: boolean; rows: Array<{
  firstName?: string;
  lastName?: string;
  phone?: string;
  email?: string;
  notes?: string;
  date?: string;
  time?: string;
  services?: string;
  staff?: string;
  status?: string;
}> }) {
  return apiFetch<{ ok: boolean; createdClients: number; updatedClients: number; createdAppointments: number; createdServices: number; skippedRows: number; errors?: Array<{ row: number; reason: string }> }>(
    "/api/salon/clients/import",
    { method: "POST", auth: true, body: JSON.stringify(payload) },
  );
}

export async function dedupeSalonAppointments() {
  return apiFetch<{ inspected: number; removed: number; kept: number; groups: number }>("/api/salon/appointments/dedupe", {
    method: "POST",
    auth: true,
  });
}

export async function deleteClient(id: string) {
  return apiFetch<{ ok: boolean }>(`/api/salon/clients/${id}`, {
    method: "DELETE",
    auth: true,
  });
}

export async function getSalonClientAppointments(clientId: string) {
  return apiFetch<{ appointments: any[] }>(`/api/salon/clients/${clientId}/appointments`, { auth: true });
}

export async function createAppointment(payload: {
  date: string;
  time: string;
  duration?: number;
  durationOverride?: number;
  notes?: string;
  clientId: string;
  staffId?: string;
  allowConflict?: boolean;
  serviceIds: string[];
}) {
  return apiFetch<{ appointment: any }>("/api/salon/appointments", {
    method: "POST",
    auth: true,
    body: JSON.stringify(payload),
  });
}

export async function updateAppointment(id: string, payload: {
  date?: string;
  time?: string;
  duration?: number;
  durationOverride?: number;
  status?: string;
  notes?: string;
  staffId?: string | null;
  allowConflict?: boolean;
  serviceIds?: string[];
}) {
  return apiFetch<{ appointment: any }>(`/api/salon/appointments/${id}`, {
    method: "PUT",
    auth: true,
    body: JSON.stringify(payload),
  });
}

export async function createService(payload: { name: string; category: string; duration: number; price: number; description?: string; color?: string }) {
  return apiFetch<{ service: any }>("/api/salon/services", {
    method: "POST",
    auth: true,
    body: JSON.stringify(payload),
  });
}

export async function updateService(id: string, payload: { name: string; category: string; duration: number; price: number; description?: string; color?: string; active?: boolean }) {
  return apiFetch<{ service: any }>(`/api/salon/services/${id}`, {
    method: "PUT",
    auth: true,
    body: JSON.stringify(payload),
  });
}

export async function deleteService(id: string) {
  return apiFetch<{ ok: boolean }>(`/api/salon/services/${id}`, {
    method: "DELETE",
    auth: true,
  });
}

export async function createStaff(payload: {
  name: string;
  role: string;
  phone?: string;
  photoUrl?: string;
  serviceIds: string[];
  inventoryRole?: "ADMIN" | "MANAGER" | "STAFF";
  accountEmail: string;
  accountPassword: string;
}) {
  return apiFetch<{ staff: any }>("/api/salon/staff", {
    method: "POST",
    auth: true,
    body: JSON.stringify(payload),
  });
}

export async function updateStaff(id: string, payload: { name: string; role: string; phone?: string; photoUrl?: string; serviceIds: string[]; inventoryRole?: "ADMIN" | "MANAGER" | "STAFF" }) {
  return apiFetch<{ staff: any }>(`/api/salon/staff/${id}`, {
    method: "PUT",
    auth: true,
    body: JSON.stringify(payload),
  });
}

export async function uploadStaffPhoto(file: File) {
  const token = getToken();
  const formData = new FormData();
  formData.append("photo", file);
  const res = await fetch(`${API_URL}/api/salon/staff/photo`, {
    method: "POST",
    headers: token ? { Authorization: `Bearer ${token}` } : undefined,
    body: formData,
  });
  if (!res.ok) {
    const payload = await res.json().catch(() => ({}));
    throw new Error(payload.error || `Request failed: ${res.status}`);
  }
  return res.json() as Promise<{ url: string }>;
}

export async function deleteStaff(id: string) {
  return apiFetch<{ ok: boolean }>(`/api/salon/staff/${id}`, {
    method: "DELETE",
    auth: true,
  });
}

export async function getInventoryItems() {
  return apiFetch<{ items: any[] }>("/api/salon/inventory/items", {
    method: "GET",
    auth: true,
  });
}

export async function getInventoryCategories() {
  return apiFetch<{ categories: any[] }>("/api/salon/inventory/categories", {
    method: "GET",
    auth: true,
  });
}

export async function createInventoryCategory(payload: { name: string; parentId?: string | null }) {
  return apiFetch<{ category: any }>("/api/salon/inventory/categories", {
    method: "POST",
    auth: true,
    body: JSON.stringify(payload),
  });
}

export async function updateInventoryCategory(id: string, payload: { name?: string; parentId?: string | null }) {
  return apiFetch<{ category: any }>(`/api/salon/inventory/categories/${id}`, {
    method: "PUT",
    auth: true,
    body: JSON.stringify(payload),
  });
}

export async function deleteInventoryCategory(id: string) {
  return apiFetch<{ ok: boolean }>(`/api/salon/inventory/categories/${id}`, {
    method: "DELETE",
    auth: true,
  });
}

export async function createInventoryItem(payload: {
  name: string;
  category?: string;
  categoryId?: string | null;
  unit: string;
  stock?: number;
  minStock?: number;
  purchasePrice?: number;
  salePrice?: number;
  active?: boolean;
}) {
  return apiFetch<{ item: any }>("/api/salon/inventory/items", {
    method: "POST",
    auth: true,
    body: JSON.stringify(payload),
  });
}

export async function updateInventoryItem(id: string, payload: Partial<{
  name: string;
  category: string;
  categoryId: string | null;
  unit: string;
  stock: number;
  minStock: number;
  purchasePrice: number;
  salePrice: number;
  active: boolean;
}>) {
  return apiFetch<{ item: any }>(`/api/salon/inventory/items/${id}`, {
    method: "PUT",
    auth: true,
    body: JSON.stringify(payload),
  });
}

export async function deactivateInventoryItem(id: string) {
  return apiFetch<{ item: any }>(`/api/salon/inventory/items/${id}`, {
    method: "DELETE",
    auth: true,
  });
}

export async function getInventoryMovements() {
  return apiFetch<{ movements: any[] }>("/api/salon/inventory/movements", {
    method: "GET",
    auth: true,
  });
}

export async function createInventoryMovement(payload: {
  itemId: string;
  type: "IN" | "OUT" | "ADJUST";
  usageType?: "SALON_USE" | "CLIENT_SALE" | "LOSS" | "PURCHASE" | "RETURN";
  clientId?: string | null;
  quantity: number;
  note?: string;
}) {
  return apiFetch<{ movement: any; stock: number }>("/api/salon/inventory/movements", {
    method: "POST",
    auth: true,
    body: JSON.stringify(payload),
  });
}

export async function getInventoryUnits() {
  return apiFetch<{ units: any[] }>("/api/salon/inventory/units", {
    method: "GET",
    auth: true,
  });
}

export async function createInventoryUnit(payload: { name: string }) {
  return apiFetch<{ unit: any }>("/api/salon/inventory/units", {
    method: "POST",
    auth: true,
    body: JSON.stringify(payload),
  });
}

export async function deleteInventoryUnit(id: string) {
  return apiFetch<{ unit: any }>(`/api/salon/inventory/units/${id}`, {
    method: "DELETE",
    auth: true,
  });
}

export async function getInventorySettings() {
  return apiFetch<{ setting: { defaultMinStock: number } | null }>("/api/salon/inventory/settings", {
    method: "GET",
    auth: true,
  });
}

export async function updateInventorySettings(payload: { defaultMinStock: number }) {
  return apiFetch<{ setting: any }>("/api/salon/inventory/settings", {
    method: "PUT",
    auth: true,
    body: JSON.stringify(payload),
  });
}

export async function createStaffAccount(staffId: string, payload: { email: string; password: string }) {
  return apiFetch<{ staff: any }>(`/api/salon/staff/${staffId}/account`, {
    method: "POST",
    auth: true,
    body: JSON.stringify(payload),
  });
}

export async function updateStaffAccount(staffId: string, payload: { active?: boolean; password?: string; role?: "OWNER" | "STAFF" }) {
  return apiFetch<{ staff: any }>(`/api/salon/staff/${staffId}/account`, {
    method: "PUT",
    auth: true,
    body: JSON.stringify(payload),
  });
}

export async function getStaffSchedule(staffId: string) {
  return apiFetch<{ availability: any[]; exceptions: any[] }>(`/api/salon/schedule/${staffId}`, { auth: true });
}

export async function saveStaffSchedule(payload: {
  staffId: string;
  availability: { weekday: number; start: string; end: string; active: boolean }[];
  exceptions: { date: string; start?: string; end?: string; label?: string; active?: boolean }[];
}) {
  return apiFetch<{ ok: boolean }>(`/api/salon/schedule/${payload.staffId}`, {
    method: "POST",
    auth: true,
    body: JSON.stringify(payload),
  });
}

export async function createStaffException(staffId: string, payload: { date: string; start?: string; end?: string; label?: string }) {
  return apiFetch<{ exception: any }>(`/api/salon/schedule/${staffId}/exceptions`, {
    method: "POST",
    auth: true,
    body: JSON.stringify(payload),
  });
}

export async function getAdminOwners() {
  return apiFetch<{ owners: any[] }>("/api/admin/owners", { auth: true });
}

export async function createAdminOwner(payload: { email: string; phone: string; password: string; salonName: string; salonSlug: string }) {
  return apiFetch<{ owner: any }>("/api/admin/owners", {
    method: "POST",
    auth: true,
    body: JSON.stringify(payload),
  });
}

export async function updateAdminOwner(id: string, payload: { active?: boolean; password?: string }) {
  return apiFetch<{
    owner: any;
    activationEmail?: { attempted: boolean; sent: boolean; sandbox?: boolean; reason?: string; messageId?: string };
  }>(`/api/admin/owners/${id}`, {
    method: "PATCH",
    auth: true,
    body: JSON.stringify(payload),
  });
}
