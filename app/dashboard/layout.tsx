import { redirect } from "next/navigation";
import { createClient } from "@/lib/supabase/server";
import { isSupabaseConfigured } from "@/lib/supabase/config";
import { DashboardHeader } from "@/components/dashboard/dashboard-header";

// Auth-gated and cookie-dependent, so never prerender at build time.
export const dynamic = "force-dynamic";

export default async function DashboardLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  // Re-verify auth server-side (don't trust the proxy's optimistic check alone).
  if (!isSupabaseConfigured) redirect("/login");

  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) redirect("/login");

  return (
    <div className="flex min-h-dvh flex-col">
      <DashboardHeader email={user.email ?? ""} />
      <main className="w-full flex-1 px-[7.5%] py-10">
        {children}
      </main>
    </div>
  );
}
