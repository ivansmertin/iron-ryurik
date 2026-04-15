import { requireUser } from "@/features/auth/get-user";
import { AppSidebar, MobileBottomNav } from "@/components/app-sidebar";
import { UserMenu } from "@/components/user-menu";
import { trainerLinks } from "@/config/navigation";

export default async function TrainerLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  const user = await requireUser("trainer");

  return (
    <div className="flex h-dvh flex-col md:flex-row">
      <AppSidebar links={trainerLinks} />
      <div className="flex flex-1 flex-col overflow-hidden">
        <header className="bg-background/80 flex h-14 shrink-0 items-center justify-between border-b border-border/70 px-4 backdrop-blur md:justify-end">
          <span className="text-lg font-bold tracking-tight md:hidden">
            Железный Рюрик
          </span>
          <UserMenu fullName={user.fullName} email={user.email} />
        </header>
        <main className="flex-1 overflow-y-auto p-4 pb-20 md:p-6 md:pb-6">
          {children}
        </main>
      </div>
      <MobileBottomNav links={trainerLinks} />
    </div>
  );
}
