import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { getSession } from "@/lib/auth";
import { toMajorUnits } from "@/lib/money";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

/** CSV export for reservations and expenses (PRD A13). Owner-only. */
export async function GET(
  _request: Request,
  { params }: { params: Promise<{ dataset: string }> },
) {
  const session = await getSession();
  if (!session) return NextResponse.json({ error: "Unauthorised" }, { status: 401 });
  if (session.role !== "owner") return NextResponse.json({ error: "Forbidden" }, { status: 403 });

  const { dataset } = await params;

  if (dataset === "reservations") {
    const rows = await prisma.reservation.findMany({
      include: { vehicle: true, customer: true, chauffeurTrip: { include: { driver: true } } },
      orderBy: { startAt: "desc" },
    });

    return csv("reservations", [
      [
        "reference",
        "type",
        "status",
        "payment_status",
        "start_at",
        "end_at",
        "vehicle",
        "plate",
        "customer",
        "email",
        "phone",
        "driver",
        "total",
        "paid",
        "currency",
        "created_at",
      ],
      ...rows.map((row) => [
        row.reference,
        row.type,
        row.status,
        row.paymentStatus,
        row.startAt.toISOString(),
        row.endAt.toISOString(),
        `${row.vehicle.year} ${row.vehicle.make} ${row.vehicle.model}`,
        row.vehicle.plate,
        row.customer.name,
        row.customer.email,
        row.customer.phone,
        row.chauffeurTrip?.driver?.name ?? "",
        toMajorUnits(row.priceTotal),
        toMajorUnits(row.amountPaid),
        row.currency,
        row.createdAt.toISOString(),
      ]),
    ]);
  }

  if (dataset === "expenses") {
    const rows = await prisma.expense.findMany({
      include: { vehicle: true },
      orderBy: { date: "desc" },
    });

    return csv("expenses", [
      ["date", "category", "amount", "vehicle", "plate", "vendor", "notes", "receipt_url"],
      ...rows.map((row) => [
        row.date.toISOString().slice(0, 10),
        row.category,
        toMajorUnits(row.amount),
        row.vehicle ? `${row.vehicle.make} ${row.vehicle.model}` : "General",
        row.vehicle?.plate ?? "",
        row.vendor,
        row.notes,
        row.receiptUrl ?? "",
      ]),
    ]);
  }

  return NextResponse.json({ error: "Unknown dataset" }, { status: 404 });
}

function csv(name: string, rows: Array<Array<string | number>>) {
  const body = rows.map((row) => row.map(escape).join(",")).join("\r\n");
  const today = new Date().toISOString().slice(0, 10);

  return new NextResponse(`﻿${body}`, {
    headers: {
      "content-type": "text/csv; charset=utf-8",
      "content-disposition": `attachment; filename="${name}-${today}.csv"`,
      "cache-control": "no-store",
    },
  });
}

function escape(value: string | number) {
  const text = String(value ?? "");
  // A leading =, +, - or @ makes spreadsheet software treat the cell as a
  // formula; prefix it with a quote so exported data cannot execute.
  const safe = /^[=+\-@]/.test(text) ? `'${text}` : text;
  return /[",\r\n]/.test(safe) ? `"${safe.replace(/"/g, '""')}"` : safe;
}
