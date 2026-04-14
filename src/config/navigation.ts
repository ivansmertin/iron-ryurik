import type { SidebarLink } from "@/components/app-sidebar";

export const clientLinks: SidebarLink[] = [
  { href: "/client", label: "Главная" },
  { href: "/client/schedule", label: "Расписание" },
  { href: "/client/bookings", label: "Мои записи" },
  { href: "/client/diary", label: "Дневник" },
  { href: "/client/progress", label: "Прогресс" },
  { href: "/client/profile", label: "Профиль" },
];

export const trainerLinks: SidebarLink[] = [
  { href: "/trainer", label: "Главная" },
  { href: "/trainer/schedule", label: "Расписание" },
  { href: "/trainer/clients", label: "Мои клиенты" },
  { href: "/trainer/programs", label: "Программы" },
  { href: "/trainer/diary", label: "Дневник" },
  { href: "/trainer/profile", label: "Профиль" },
];

export const adminLinks: SidebarLink[] = [
  { href: "/admin", label: "Главная" },
  { href: "/admin/schedule", label: "Расписание" },
  { href: "/admin/clients", label: "Клиенты" },
  { href: "/admin/trainers", label: "Тренеры" },
  { href: "/admin/memberships", label: "Абонементы" },
  { href: "/admin/exercises", label: "Упражнения" },
  { href: "/admin/profile", label: "Профиль" },
];
