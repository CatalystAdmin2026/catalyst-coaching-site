import { requireCoachOrAdminPage } from "@/lib/auth/guards";

export default async function AdminLayout({ children }: { children: React.ReactNode }) {
  await requireCoachOrAdminPage();
  return <>{children}</>;
}
