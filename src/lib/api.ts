export const API_URL = (import.meta as any).env?.VITE_API_URL || "http://localhost:4000";

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
  if (!res.ok) {
    const payload = await res.json().catch(() => ({}));
    throw new Error(payload.error || `Request failed: ${res.status}`);
  }
  return res.json();
}

export async function login(email: string, password: string) {
  const data = await apiFetch<{ token: string; salonId: string | null; userId: string; role: "SUPER_ADMIN" | "OWNER" | "STAFF"; salons: any[] }>(
    "/api/auth/login",
    { method: "POST", body: JSON.stringify({ email, password }) },
  );
  setToken(data.token);
  localStorage.setItem("auth_role", data.role);
  if (data.salonId) localStorage.setItem("auth_salon_id", data.salonId);
  if (data.salons) localStorage.setItem("auth_salons", JSON.stringify(data.salons));
  return data;
}

export async function clientLogin(email: string, password: string) {
  const data = await apiFetch<{ token: string; clientId: string; salonId: string }>(
    "/api/client/login",
    { method: "POST", body: JSON.stringify({ email, password }) },
  );
  setClientToken(data.token);
  localStorage.setItem("client_id", data.clientId);
  localStorage.setItem("client_salon_id", data.salonId);
  return data;
}

export async function getClientMe() {
  return clientApiFetch<{ client: any }>("/api/client/me");
}

export async function getClientAppointments() {
  return clientApiFetch<{ appointments: any[] }>("/api/client/appointments");
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
  const data = await apiFetch<{ token: string; salonId: string; role: "OWNER" | "STAFF" }>(
    "/api/auth/switch-salon",
    { method: "POST", auth: true, body: JSON.stringify({ salonId }) },
  );
  setToken(data.token);
  localStorage.setItem("auth_role", data.role);
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

export async function getSalonServices() {
  return apiFetch<{ services: any[] }>("/api/salon/services", { auth: true });
}

export async function getSalonStaff() {
  return apiFetch<{ staff: any[] }>("/api/salon/staff", { auth: true });
}

export async function getSalonClients() {
  return apiFetch<{ clients: any[] }>("/api/salon/clients", { auth: true });
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

export async function createClient(payload: { name: string; phone: string; email?: string; notes?: string }) {
  return apiFetch<{ client: any }>("/api/salon/clients", {
    method: "POST",
    auth: true,
    body: JSON.stringify(payload),
  });
}

export async function updateClient(id: string, payload: { name: string; phone: string; email?: string; notes?: string }) {
  return apiFetch<{ client: any }>(`/api/salon/clients/${id}`, {
    method: "PUT",
    auth: true,
    body: JSON.stringify(payload),
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
  duration: number;
  notes?: string;
  clientId: string;
  staffId?: string;
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
  status?: string;
  notes?: string;
  staffId?: string | null;
  serviceIds?: string[];
}) {
  return apiFetch<{ appointment: any }>(`/api/salon/appointments/${id}`, {
    method: "PUT",
    auth: true,
    body: JSON.stringify(payload),
  });
}

export async function createService(payload: { name: string; category: string; duration: number; price: number; description?: string }) {
  return apiFetch<{ service: any }>("/api/salon/services", {
    method: "POST",
    auth: true,
    body: JSON.stringify(payload),
  });
}

export async function updateService(id: string, payload: { name: string; category: string; duration: number; price: number; description?: string; active?: boolean }) {
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

export async function createStaff(payload: { name: string; role: string; phone?: string; serviceIds: string[] }) {
  return apiFetch<{ staff: any }>("/api/salon/staff", {
    method: "POST",
    auth: true,
    body: JSON.stringify(payload),
  });
}

export async function updateStaff(id: string, payload: { name: string; role: string; phone?: string; serviceIds: string[] }) {
  return apiFetch<{ staff: any }>(`/api/salon/staff/${id}`, {
    method: "PUT",
    auth: true,
    body: JSON.stringify(payload),
  });
}

export async function deleteStaff(id: string) {
  return apiFetch<{ ok: boolean }>(`/api/salon/staff/${id}`, {
    method: "DELETE",
    auth: true,
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
  return apiFetch<{ owner: any }>(`/api/admin/owners/${id}`, {
    method: "PATCH",
    auth: true,
    body: JSON.stringify(payload),
  });
}
