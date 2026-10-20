import type { Metadata } from "next";
import { Suspense } from "react";
import { AdminShell } from "@/components/admin/shell";
import { Loading } from "@/components/admin/ui";

export const metadata: Metadata = {
  title: { default: "Admin", template: "%s | Dilruba CRM" },
  robots: { index: false, follow: false },
};

// The admin panel is private, live data: it renders in the browser after the login check,
// so the whole panel sits inside one Suspense boundary.
export default function AdminLayout({ children }: LayoutProps<"/admin">) {
  return (
    <Suspense fallback={<Loading />}>
      <AdminShell>{children}</AdminShell>
    </Suspense>
  );
}
