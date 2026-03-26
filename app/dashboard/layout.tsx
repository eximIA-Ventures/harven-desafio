import { getSession } from "@/lib/auth";
import { redirect } from "next/navigation";
import { Sidebar } from "@/components/layout/sidebar";

export default async function DashboardLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  const session = await getSession();
  if (!session) redirect("/login");

  return (
    <div className="flex h-screen">
      <Sidebar userType={session.type} />
      <main className="flex-1 overflow-auto bg-[#FAFAF8]">
        <div className="p-6 md:p-8 pt-16 md:pt-8">{children}</div>
      </main>
    </div>
  );
}
