import { requireUser } from "@/features/auth/get-user";
import { AppSidebar } from "@/components/app-sidebar";
import { UserMenu } from "@/components/user-menu";
import { clientLinks } from "@/config/navigation";

export default async function ClientLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  const user = await requireUser("client");

  return (
    <div className="flex h-dvh flex-col md:h-screen md:flex-row">
      <AppSidebar links={clientLinks} />
      <div className="flex flex-1 flex-col overflow-hidden">
        <header className="bg-background/80 flex h-14 items-center justify-end border-b border-border/70 px-4 backdrop-blur">
          <UserMenu fullName={user.fullName} email={user.email} />
        </header>
        <main className="flex-1 overflow-y-auto p-4 md:p-6">{children}</main>
      </div>
    </div>
  );
}
