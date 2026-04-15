import type { SidebarLink } from "@/components/app-sidebar";

export const clientLinks: SidebarLink[] = [
  { href: "/client", label: "Главная" },
  { href: "/client/schedule", label: "Расписание" },
  { href: "/client/bookings", label: "Мои записи" },
  { href: "/client/diary", label: "Дневник" },
  { href: "/client/profile", label: "Профиль" },
];

export const trainerLinks: SidebarLink[] = [
  { href: "/trainer", label: "Главная" },
  { href: "/trainer/slots", label: "Мои слоты" },
  { href: "/trainer/clients", label: "Мои клиенты" },
];

export const adminLinks: SidebarLink[] = [
  { href: "/admin", label: "Главная" },
  { href: "/admin/schedule", label: "Расписание" },
  { href: "/admin/clients", label: "Клиенты" },
  { href: "/admin/memberships", label: "Абонементы" },
  { href: "/admin/profile", label: "Профиль" },
];
