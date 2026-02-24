export type UserRole = "SUPER_ADMIN" | "OWNER" | "STAFF";
export type InventoryRole = "ADMIN" | "MANAGER" | "STAFF";

const ROLE_KEY = "auth_role";
const INVENTORY_ROLE_KEY = "inventory_role";
const SALONS_KEY = "auth_salons";
const ACTIVE_SALON_KEY = "auth_salon_id";

export const getRole = (): UserRole | null => {
  const role = localStorage.getItem(ROLE_KEY);
  return role === "SUPER_ADMIN" || role === "OWNER" || role === "STAFF" ? role : null;
};

export const setRole = (role: UserRole) => {
  localStorage.setItem(ROLE_KEY, role);
};

export const clearRole = () => {
  localStorage.removeItem(ROLE_KEY);
};

export const isOwner = () => getRole() === "OWNER";
export const isSuperAdmin = () => getRole() === "SUPER_ADMIN";

export const clearAuth = () => {
  localStorage.removeItem("auth_token");
  localStorage.removeItem(SALONS_KEY);
  localStorage.removeItem(ACTIVE_SALON_KEY);
  localStorage.removeItem(INVENTORY_ROLE_KEY);
  clearRole();
};

export const getInventoryRole = (): InventoryRole => {
  const role = localStorage.getItem(INVENTORY_ROLE_KEY);
  if (role === "ADMIN" || role === "MANAGER" || role === "STAFF") return role;
  const userRole = getRole();
  return userRole === "OWNER" ? "ADMIN" : "STAFF";
};

export const setInventoryRole = (role: InventoryRole) => {
  localStorage.setItem(INVENTORY_ROLE_KEY, role);
};

export const setSalons = (salons: Array<{ id: string; name: string; slug: string; role: UserRole }>) => {
  localStorage.setItem(SALONS_KEY, JSON.stringify(salons));
};

export const getSalons = () => {
  try {
    return JSON.parse(localStorage.getItem(SALONS_KEY) || "[]") as Array<{ id: string; name: string; slug: string; role: UserRole }>;
  } catch {
    return [];
  }
};

export const setActiveSalonId = (salonId: string) => {
  localStorage.setItem(ACTIVE_SALON_KEY, salonId);
};

export const getActiveSalonId = () => localStorage.getItem(ACTIVE_SALON_KEY);
