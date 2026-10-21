"use client";

import { useSearchParams } from "next/navigation";
import type { AdminLeadDetail } from "@dilruba/shared/crm";
import { useAdminData } from "@/lib/admin-api";
import { QuoteEditor } from "@/components/admin/quote-editor";
import { ErrorBox, Loading, PageHeader } from "@/components/admin/ui";

export default function NewQuotePage() {
  const leadId = useSearchParams().get("lead");
  const { data: lead, error, reload } = useAdminData<AdminLeadDetail>(leadId ? `/leads/${leadId}` : null);

  if (leadId && error) return <ErrorBox message={error} onRetry={reload} />;
  if (leadId && !lead) return <Loading />;

  return (
    <>
      <PageHeader
        back={lead ? { href: `/admin/leads/${lead.id}`, label: lead.customer.name } : { href: "/admin/quotes", label: "Quotes" }}
        title="New quote"
        subtitle="Saved as a draft. Send it when it's ready: the customer gets a link to view and accept it."
      />
      <QuoteEditor lead={lead ?? undefined} />
    </>
  );
}
