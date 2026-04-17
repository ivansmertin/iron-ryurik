export type IconName =
  | "home"
  | "calendar"
  | "clipboard-list"
  | "notebook-pen"
  | "user"
  | "clock"
  | "users"
  | "credit-card"
  | "dumbbell"
  | "qr-code"
  | "settings";

export interface NavLink {
  href: string;
  label: string;
  icon: IconName;
}

export const clientLinks: NavLink[] = [
  { href: "/client", label: "Главная", icon: "home" },
  { href: "/client/schedule", label: "Расписание", icon: "calendar" },
  { href: "/client/bookings", label: "Записи", icon: "clipboard-list" },
  { href: "/client/diary", label: "Дневник", icon: "notebook-pen" },
  { href: "/client/profile", label: "Профиль", icon: "user" },
];

export const trainerLinks: NavLink[] = [
  { href: "/trainer", label: "Главная", icon: "home" },
  { href: "/trainer/schedule", label: "Расписание", icon: "calendar" },
  { href: "/trainer/slots", label: "Слоты", icon: "clock" },
  { href: "/trainer/scan", label: "QR", icon: "qr-code" },
  { href: "/trainer/clients", label: "Клиенты", icon: "users" },
];

/** Full admin links – used by the desktop sidebar. */
export const adminSidebarLinks: NavLink[] = [
  { href: "/admin", label: "Главная", icon: "home" },
  { href: "/admin/schedule", label: "Расписание", icon: "calendar" },
  { href: "/admin/clients", label: "Клиенты", icon: "users" },
  { href: "/admin/memberships", label: "Абонементы", icon: "credit-card" },
  { href: "/admin/exercises", label: "Упражнения", icon: "dumbbell" },
  { href: "/admin/schedule/settings", label: "Настройки зала", icon: "settings" },
  { href: "/admin/profile", label: "Профиль", icon: "user" },
];

/** Trimmed admin links – used by the mobile bottom nav. */
export const adminBottomNavLinks: NavLink[] = [
  { href: "/admin", label: "Главная", icon: "home" },
  { href: "/admin/schedule", label: "Расписание", icon: "calendar" },
  { href: "/admin/clients", label: "Клиенты", icon: "users" },
  { href: "/admin/memberships", label: "Абонементы", icon: "credit-card" },
  { href: "/admin/profile", label: "Профиль", icon: "user" },
];
