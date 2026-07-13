import { redirect } from "next/navigation";
import { requireClientUser } from "@/lib/supabase/session";

export default async function PortalLayout({ children }: { children: React.ReactNode }) {
  const { dbUser } = await requireClientUser();
  if (dbUser.role !== "client") {
    redirect("/admin");
  }
  return <>{children}</>;
}
