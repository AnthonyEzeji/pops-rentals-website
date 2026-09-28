import "server-only";
import { Resend } from "resend";
import { config, emailEnabled } from "./config";
import { formatMoney } from "./money";
import { formatDateTime } from "./dates";

type Mail = { to: string; subject: string; html: string };

const resend = emailEnabled ? new Resend(process.env.RESEND_API_KEY) : null;

/**
 * Sending is best-effort: a mail provider outage must never lose a booking the
 * customer already paid for, so failures are logged, not thrown.
 */
async function send({ to, subject, html }: Mail) {
  if (!resend) {
    console.info(`[email:dev] to=${to} subject=${subject}\n${stripTags(html)}`);
    return { delivered: false as const, reason: "RESEND_API_KEY not set" };
  }
  try {
    await resend.emails.send({
      from: process.env.EMAIL_FROM || `${config.businessName} <onboarding@resend.dev>`,
      to,
      subject,
      html,
    });
    return { delivered: true as const };
  } catch (error) {
    console.error("[email] send failed", { to, subject, error });
    return { delivered: false as const, reason: String(error) };
  }
}

function stripTags(html: string) {
  return html.replace(/<[^>]+>/g, " ").replace(/\s+/g, " ").trim();
}

function layout(title: string, body: string) {
  return `<div style="font-family:ui-sans-serif,system-ui,sans-serif;max-width:560px;margin:0 auto;color:#111">
    <h1 style="font-size:20px;margin:0 0 16px">${title}</h1>
    ${body}
    <p style="color:#666;font-size:12px;margin-top:28px">${config.businessName} · ${config.appUrl}</p>
  </div>`;
}

function row(label: string, value: string) {
  return `<tr><td style="padding:4px 12px 4px 0;color:#666">${label}</td><td style="padding:4px 0"><strong>${value}</strong></td></tr>`;
}

export type ReservationEmailData = {
  reference: string;
  type: "self_drive" | "chauffeur";
  customerName: string;
  customerEmail: string;
  vehicleLabel: string;
  startAt: Date;
  endAt: Date;
  priceTotal: number;
  amountPaid: number;
  securityDeposit: number;
  currency: string;
  pickupAddress?: string | null;
  dropoffAddress?: string | null;
  driverName?: string | null;
};

function detailsTable(data: ReservationEmailData) {
  return `<table style="border-collapse:collapse;font-size:14px">
    ${row("Reference", data.reference)}
    ${row("Vehicle", data.vehicleLabel)}
    ${row(data.type === "chauffeur" ? "Pickup" : "Collection", formatDateTime(data.startAt))}
    ${row(data.type === "chauffeur" ? "Until" : "Return", formatDateTime(data.endAt))}
    ${data.pickupAddress ? row("From", data.pickupAddress) : ""}
    ${data.dropoffAddress ? row("To", data.dropoffAddress) : ""}
    ${data.driverName ? row("Driver", data.driverName) : ""}
    ${row("Total", formatMoney(data.priceTotal, data.currency))}
    ${data.amountPaid > 0 ? row("Paid", formatMoney(data.amountPaid, data.currency)) : ""}
    ${
      data.securityDeposit > 0
        ? row("Refundable security deposit", formatMoney(data.securityDeposit, data.currency))
        : ""
    }
    ${
      data.priceTotal - data.amountPaid + data.securityDeposit > 0
        ? row(
            "Due at collection",
            formatMoney(data.priceTotal - data.amountPaid + data.securityDeposit, data.currency),
          )
        : ""
    }
  </table>`;
}

/** PRD N1 — customer confirmation on booking or request. */
export function sendCustomerConfirmation(data: ReservationEmailData) {
  const isRequest = data.type === "chauffeur";
  return send({
    to: data.customerEmail,
    subject: isRequest
      ? `We received your chauffeur request (${data.reference})`
      : `Your booking is confirmed (${data.reference})`,
    html: layout(
      isRequest ? "Request received" : "Booking confirmed",
      `<p>Hi ${data.customerName},</p>
       <p>${
         isRequest
           ? "Thanks for your request. Our team will confirm availability, the final price and your driver shortly."
           : "Your reservation is confirmed. Please bring your driver's licence to collection."
       }</p>
       ${detailsTable(data)}`,
    ),
  });
}

/** PRD N3 — chauffeur request confirmed by an admin. */
export function sendChauffeurConfirmed(data: ReservationEmailData) {
  return send({
    to: data.customerEmail,
    subject: `Your trip is confirmed (${data.reference})`,
    html: layout(
      "Trip confirmed",
      `<p>Hi ${data.customerName},</p>
       <p>Your chauffeur trip is confirmed. Details below.</p>
       ${detailsTable(data)}`,
    ),
  });
}

export function sendCancellationNotice(data: ReservationEmailData, reason: string) {
  return send({
    to: data.customerEmail,
    subject: `Reservation cancelled (${data.reference})`,
    html: layout(
      "Reservation cancelled",
      `<p>Hi ${data.customerName},</p>
       <p>Your reservation has been cancelled.${reason ? ` Reason: ${reason}.` : ""} Any refund follows our published cancellation policy.</p>
       ${detailsTable(data)}`,
    ),
  });
}

/** PRD N2 — admin notified of new bookings and requests. */
export function sendAdminAlert(data: ReservationEmailData) {
  const to = process.env.ADMIN_NOTIFICATION_EMAIL;
  if (!to) return Promise.resolve({ delivered: false as const, reason: "no admin email set" });
  return send({
    to,
    subject:
      data.type === "chauffeur"
        ? `New chauffeur request — ${data.vehicleLabel} (${data.reference})`
        : `New self-drive booking — ${data.vehicleLabel} (${data.reference})`,
    html: layout(
      data.type === "chauffeur" ? "New chauffeur request" : "New self-drive booking",
      `${detailsTable(data)}
       <p style="margin-top:16px">
         <a href="${config.appUrl}/admin/reservations">Open in admin</a> ·
         ${data.customerName} · ${data.customerEmail}
       </p>`,
    ),
  });
}
