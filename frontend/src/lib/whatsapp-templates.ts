import { formatINR, formatTravelMonth } from "@dilruba/shared/booking";
import type { AdminBookingDetail, AdminLead } from "@dilruba/shared/crm";
import { formatDay } from "@dilruba/shared/ops";

// Ready-made WhatsApp messages for the admin panel. Staff pick one, WhatsApp opens with the
// text filled in, and they can still edit it before sending.

const first = (name: string) => name.split(" ")[0];
const sign = "\n\nDilruba Travels";

export function leadTemplates(l: AdminLead, quoteLink?: string) {
  const what = l.packageName ?? `${l.service}${l.option ? ` (${l.option})` : ""}`;
  return [
    { label: "Thanks for your enquiry", text: `Assalamu Alaikum ${first(l.customer.name)}, thank you for your enquiry about ${what}. When would you like to travel, and how many people are going? I'll send you the best options.${sign}` },
    { label: "Ask for travel details", text: `Assalamu Alaikum ${first(l.customer.name)}, to prepare your quote for ${what} could you share:\n1. Travel dates or month\n2. Number of adults and children\n3. Room sharing (quad / triple / double)\n4. Departure city${sign}` },
    ...(quoteLink ? [{ label: "Send the quote link", text: `Assalamu Alaikum ${first(l.customer.name)}, your quote for ${what} is ready. You can see the full price and accept it here:\n${quoteLink}${sign}` }] : []),
    { label: "Follow up", text: `Assalamu Alaikum ${first(l.customer.name)}, just checking in about ${what}. Do you have any questions? Seats for ${formatTravelMonth(l.travelMonth)} are filling up, so let me know and I'll hold them for you.${sign}` },
  ];
}

export function bookingTemplates(b: AdminBookingDetail, documents: string[] = []) {
  const name = first(b.customer.name);
  const nextDue = b.instalments.find((i) => i.state !== "paid");
  const docs = documents.length ? documents : ["Passport (valid at least 6 months after return)", "Passport-size photo with white background", "PAN card", "Vaccination certificate (if required)"];
  return [
    { label: "Booking link (view & pay)", text: `Assalamu Alaikum ${name}, here is your booking ${b.reference} for ${b.packageTitle}. You can see the details and pay securely here:\n${b.customerLink}${sign}` },
    ...(b.dueNow > 0 ? [{ label: `Payment due: ${formatINR(b.dueNow)}`, text: `Assalamu Alaikum ${name}, a gentle reminder that ${formatINR(b.dueNow)} is due on your booking ${b.reference}${nextDue ? ` (${nextDue.label}, due ${formatDay(nextDue.dueDate)})` : ""}. You can pay online here:\n${b.customerLink}\n\nOr by bank transfer / UPI; please share the payment screenshot after paying.${sign}` }] : []),
    { label: "Documents checklist", text: `Assalamu Alaikum ${name}, to process the visa for booking ${b.reference} please send clear photos of:\n${docs.map((d, i) => `${i + 1}. ${d}`).join("\n")}\n\nfor each traveller.${sign}` },
    { label: "Trip details before travel", text: `Assalamu Alaikum ${name}, your trip ${b.packageTitle}${b.departure ? ` departs on ${formatDay(b.departure.startDate)}` : ""}. Our team will share flight times, hotel details and the group leader's number shortly. Please keep your passports ready.${sign}` },
    { label: "Ask for feedback", text: `Assalamu Alaikum ${name}, JazakAllah Khair for travelling with Dilruba Travels. How was your trip? Please rate it here, it takes one minute:\n${b.feedbackLink}${sign}` },
  ];
}
