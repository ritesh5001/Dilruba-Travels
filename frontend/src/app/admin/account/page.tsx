"use client";
import { useState } from "react";
import { adminFetch, useAction } from "@/lib/admin-api";
import { Card, ErrorBox, PageHeader } from "@/components/admin/ui";

export default function AccountPage() {
  const action = useAction();
  const [saved, setSaved] = useState(false);
  return <><PageHeader title="Change password" subtitle="Update your login password. Other sessions will be signed out." />
    <Card title="Your password" className="max-w-xl">
      <form className="grid gap-4" onSubmit={async (e) => {
        e.preventDefault(); setSaved(false);
        const form = e.currentTarget;
        const f = new FormData(form);
        await action.run(async () => {
          if (f.get("newPassword") !== f.get("confirmPassword")) throw new Error("New passwords do not match");
          await adminFetch("/change-password", { method: "POST", body: { currentPassword: f.get("currentPassword"), newPassword: f.get("newPassword") } });
          form.reset(); setSaved(true);
        });
      }}>
        {action.error && <ErrorBox message={action.error} />}
        <div><label htmlFor="current-password" className="label">Current password</label><input id="current-password" type="password" name="currentPassword" autoComplete="current-password" required maxLength={200} className="field" /></div>
        <div><label htmlFor="new-password" className="label">New password</label><input id="new-password" type="password" name="newPassword" autoComplete="new-password" required minLength={10} maxLength={200} className="field" /></div>
        <div><label htmlFor="confirm-password" className="label">Confirm new password</label><input id="confirm-password" type="password" name="confirmPassword" autoComplete="new-password" required minLength={10} maxLength={200} className="field" /></div>
        <button disabled={action.busy} className="btn btn-primary">{action.busy ? "Saving…" : "Change password"}</button>
        {saved && <p role="status" className="text-sm text-green-700">Password changed successfully.</p>}
      </form>
    </Card></>;
}
