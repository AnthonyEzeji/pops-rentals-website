import "server-only";
import { config, smsEnabled } from "./config";
import { formatMoney } from "./money";
import { formatDateTime } from "./dates";
import type { ReservationEmailData } from "./email";

/**
 * Owner-facing SMS alerts via Twilio. Mirrors `email.ts`: sending is
 * best-effort, failures are logged rather than thrown, and with no Twilio
 * credentials the message is printed to the server console instead.
 *
 * Only the business owner is texted (ADMIN_NOTIFICATION_PHONE). Customers are
 * deliberately not messaged — texting them in the US requires A2P 10DLC
 * registration and recorded opt-in, which is out of scope for now.
 *
 * Twilio's REST API is called directly so the project does not take on the
 * SDK: one form-encoded POST with basic auth is all that is needed.
 */

type Sms = { to: string; body: string };

async function send({ to, body }: Sms) {
  if (!smsEnabled) {
    console.info(`[sms:dev] to=${to}\n${body}`);
    return { delivered: false as const, reason: "Twilio not configured" };
  }

  const sid = process.env.TWILIO_ACCOUNT_SID!;
  const token = process.env.TWILIO_AUTH_TOKEN!;
  // Pasted from the Twilio console this is often "(877) 555-1234"; the API
  // only takes E.164.
  const from = normalizePhone(process.env.TWILIO_FROM_NUMBER!);

  try {
    const response = await fetch(
      `https://api.twilio.com/2010-04-01/Accounts/${encodeURIComponent(sid)}/Messages.json`,
      {
        method: "POST",
        headers: {
          Authorization: `Basic ${Buffer.from(`${sid}:${token}`).toString("base64")}`,
          "Content-Type": "application/x-www-form-urlencoded",
        },
        body: new URLSearchParams({ To: to, From: from, Body: body }),
      },
    );

    if (!response.ok) {
      const detail = await response.text().catch(() => "");
      console.error("[sms] send failed", { to, status: response.status, detail });
      return { delivered: false as const, reason: `Twilio ${response.status}` };
    }
    return { delivered: true as const };
  } catch (error) {
    console.error("[sms] send failed", { to, error });
    return { delivered: false as const, reason: String(error) };
  }
}

/**
 * Twilio wants E.164 (+12125551234). Owners type numbers the way they say
 * them, so accept "929-206-7881" or "(929) 206 7881" and assume US when the
 * country code is missing. Anything else is passed through as typed.
 */
export function normalizePhone(raw: string): string {
  const trimmed = raw.trim();
  if (trimmed.startsWith("+")) return `+${trimmed.slice(1).replace(/\D/g, "")}`;
  const digits = trimmed.replace(/\D/g, "");
  if (digits.length === 10) return `+1${digits}`;
  if (digits.length === 11 && digits.startsWith("1")) return `+${digits}`;
  return trimmed;
}

/** ADMIN_NOTIFICATION_PHONE may list several numbers, comma-separated. */
function ownerPhones(): string[] {
  return (process.env.ADMIN_NOTIFICATION_PHONE ?? "")
    .split(",")
    .map((n) => n.trim())
    .filter(Boolean)
    .map(normalizePhone);
}

function sendToOwners(body: string) {
  const to = ownerPhones();
  if (to.length === 0) {
    return Promise.resolve([{ delivered: false as const, reason: "no admin phone set" }]);
  }
  return Promise.all(to.map((number) => send({ to: number, body })));
}

function summary(data: ReservationEmailData) {
  const lines = [
    `${data.vehicleLabel}`,
    `${formatDateTime(data.startAt)} → ${formatDateTime(data.endAt)}`,
    `${data.customerName} · ${data.customerPhone || data.customerEmail}`,
    `Total ${formatMoney(data.priceTotal, data.currency)}`,
  ];
  if (data.pickupAddress) lines.push(`From ${data.pickupAddress}`);
  return lines.join("\n");
}

/** PRD N2 — owner texted on every new booking or chauffeur request. */
export function sendAdminAlertSms(data: ReservationEmailData) {
  let headline: string;
  if (data.type === "chauffeur") {
    headline = `New chauffeur request ${data.reference}`;
  } else if (data.status === "pending") {
    // Under Stripe the booking exists before the deposit is paid; say so,
    // and a second text follows from the webhook once the money lands.
    headline = `New booking ${data.reference} (awaiting deposit)`;
  } else {
    headline = `New booking ${data.reference}`;
  }

  return sendToOwners(
    `${config.businessName}: ${headline}\n${summary(data)}\n${config.appUrl}/admin/reservations`,
  );
}

/** Owner texted when Stripe confirms the deposit on a pending booking. */
export function sendAdminPaymentSms(data: ReservationEmailData) {
  return sendToOwners(
    `${config.businessName}: Deposit paid for ${data.reference} — ${formatMoney(data.amountPaid, data.currency)} received. Booking confirmed.\n${summary(data)}`,
  );
}
