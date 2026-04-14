import { requireUser } from "@/features/auth/get-user";
import { AppSidebar } from "@/components/app-sidebar";
import { UserMenu } from "@/components/user-menu";
import { trainerLinks } from "@/config/navigation";

export default async function TrainerLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  const user = await requireUser("trainer");

  return (
    <div className="flex h-screen">
      <AppSidebar links={trainerLinks} />
      <div className="flex flex-1 flex-col overflow-hidden">
        <header className="flex h-14 items-center justify-end border-b px-4">
          <UserMenu fullName={user.fullName} email={user.email} />
        </header>
        <main className="flex-1 overflow-y-auto p-6">{children}</main>
      </div>
    </div>
  );
}
