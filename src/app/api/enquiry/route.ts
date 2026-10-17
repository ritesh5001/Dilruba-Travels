import { enquirySchema } from "@/lib/enquiry";

export async function POST(request: Request) {
  let body: unknown;
  try {
    body = await request.json();
  } catch {
    return Response.json({ ok: false, error: "Invalid request" }, { status: 400 });
  }

  const parsed = enquirySchema.safeParse(body);
  if (!parsed.success) {
    return Response.json(
      { ok: false, error: parsed.error.issues[0]?.message ?? "Invalid enquiry" },
      { status: 400 },
    );
  }

  const { website, ...enquiry } = parsed.data;

  // Bots fill the hidden honeypot field; pretend success and drop it.
  if (website) return Response.json({ ok: true });

  // TODO(CRM): save the enquiry as a new lead once the admin CRM and database are built.
  console.info("[enquiry]", JSON.stringify({ ...enquiry, receivedAt: new Date().toISOString() }));

  return Response.json({ ok: true });
}
