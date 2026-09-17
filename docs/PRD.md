# PRD: Fleet Reserve — Vehicle Rental & Chauffeur Booking Platform

**Version:** 1.0
**Status:** Draft
**Owner:** [Your name]
**Last updated:** 2026-09-17

---

## 1. Overview

### 1.1 Problem
Customers need a simple way to browse available vehicles and book either self-drive rentals or chauffeur-driven trips. The business needs one place to manage inventory, reservations, maintenance, and expenses.

### 1.2 Solution
A web platform with:
1. A public site for browsing inventory and placing reservations/requests
2. An admin portal for managing fleet, bookings, maintenance, and expenses

### 1.3 Goals
- Let customers reserve vehicles for self-drive online
- Let customers request chauffeur service with full trip details
- Give the operator visibility into reservations, vehicle status, maintenance, and costs
- Prevent double-booking

### 1.4 Non-goals (v1)
- Native iOS/Android apps
- Multi-location franchise / multi-tenant SaaS
- Real-time GPS tracking of vehicles
- Automated insurance verification APIs
- Dynamic pricing / yield management

---

## 2. Users & Personas

| Persona | Needs |
|---------|--------|
| **Customer (self-drive)** | See what's available, book dates, pay, get confirmation |
| **Customer (chauffeur)** | Request a specific vehicle + trip details, get confirmation/quote |
| **Admin / Owner** | Manage fleet, approve/track bookings, log maintenance & expenses |
| **Staff (optional)** | View calendar, update reservation status, assign drivers |

---

## 3. User journeys

### 3.1 Self-drive reservation
1. Customer browses inventory (filter by type, seats, price)
2. Opens vehicle detail page
3. Selects pickup/return dates (and times if required)
4. Sees price estimate + availability
5. Enters contact + driver's license info
6. Pays deposit or full amount
7. Receives confirmation email/SMS
8. Admin sees booking on calendar; vehicle blocked for those dates

### 3.2 Chauffeur request
1. Customer browses vehicles (or starts from "Chauffeur" CTA)
2. Selects preferred vehicle
3. Submits trip details: pickup, dropoff, date/time, duration or return, passengers, luggage, notes
4. System creates a **Request** (pending)
5. Admin reviews, assigns driver, confirms price, marks **Confirmed**
6. Customer receives confirmation with trip + vehicle + driver details (as available)

### 3.3 Admin ops
1. Admin logs in
2. Views today's / upcoming reservations
3. Updates vehicle status (available, reserved, maintenance, out of service)
4. Logs maintenance and expenses against a vehicle
5. Assigns drivers to chauffeur trips
6. Marks trips complete / cancelled

---

## 4. Functional requirements

### 4.1 Public site

| ID | Requirement | Priority |
|----|-------------|----------|
| P1 | Browse vehicle inventory with photos, specs, rates | Must |
| P2 | Filter/sort vehicles (type, price, seats, transmission) | Should |
| P3 | Vehicle detail page with gallery and full specs | Must |
| P4 | Self-drive booking with date-range availability check | Must |
| P5 | Show price estimate before checkout | Must |
| P6 | Collect customer contact + license details for self-drive | Must |
| P7 | Chauffeur request form with full trip details | Must |
| P8 | Online payment (deposit or full) via Stripe | Must |
| P9 | Confirmation page + email after booking/request | Must |
| P10 | Mobile-responsive layout | Must |
| P11 | Terms, cancellation, and damage policy pages | Must |
| P12 | Customer accounts / past bookings | Could |

### 4.2 Admin portal

| ID | Requirement | Priority |
|----|-------------|----------|
| A1 | Secure login (email/password or magic link) | Must |
| A2 | Dashboard: upcoming reservations, vehicles needing attention | Must |
| A3 | CRUD vehicles (status, rates, photos, specs) | Must |
| A4 | Reservation calendar (self-drive + chauffeur) | Must |
| A5 | Create / edit / cancel / complete reservations | Must |
| A6 | Approve/confirm chauffeur requests; assign driver | Must |
| A7 | Driver directory (name, phone, license, notes) | Must |
| A8 | Maintenance log per vehicle | Must |
| A9 | Expense log per vehicle (fuel, repair, insurance, other) | Must |
| A10 | Block vehicle dates for maintenance | Must |
| A11 | Basic reports: revenue, utilization, expenses vs income | Should |
| A12 | Roles: Owner vs Staff | Should |
| A13 | Export CSV (reservations, expenses) | Could |

### 4.3 Availability & booking rules

| ID | Requirement | Priority |
|----|-------------|----------|
| R1 | No overlapping self-drive bookings for the same vehicle | Must |
| R2 | Maintenance blocks remove vehicle from bookable inventory | Must |
| R3 | Configurable buffer between bookings (e.g. 2 hours / 1 day) | Should |
| R4 | Minimum rental duration (e.g. 1 day) | Must |
| R5 | Chauffeur requests do not auto-block until confirmed (configurable) | Should |

### 4.4 Notifications

| ID | Requirement | Priority |
|----|-------------|----------|
| N1 | Email confirmation to customer on booking/request | Must |
| N2 | Email/notify admin on new booking or request | Must |
| N3 | Email when chauffeur request is confirmed | Must |
| N4 | SMS reminders (pickup day) | Could |

---

## 5. Data model (logical)

### Vehicle
- id, make, model, year, plate, VIN (optional)
- category (sedan, SUV, van, luxury, etc.)
- seats, transmission, fuel type, features
- daily_rate_self_drive, chauffeur_hourly_or_trip_rate
- status: `available` | `reserved` | `maintenance` | `out_of_service`
- photos[], description, created_at, updated_at

### Reservation
- id, type: `self_drive` | `chauffeur`
- vehicle_id, customer_id
- start_at, end_at
- status: `pending` | `confirmed` | `in_progress` | `completed` | `cancelled`
- price_total, deposit_amount, payment_status
- notes, created_at

### ChauffeurTrip (extends / linked to Reservation)
- pickup_address, dropoff_address
- passengers, luggage_notes
- driver_id (nullable until assigned)
- special_requests

### Customer
- name, email, phone
- license_number, license_expiry, license_country (self-drive)
- created_at

### Driver
- name, phone, email, license_number, active, notes

### MaintenanceRecord
- vehicle_id, date, type, description, cost, odometer, next_due

### Expense
- vehicle_id (nullable for general), date, category, amount, vendor, notes, receipt_url

### AdminUser
- email, role: `owner` | `staff`, auth provider id

---

## 6. UX / pages

### Public
- `/` — Home (value prop + CTAs: Self-drive / Chauffeur)
- `/vehicles` — Inventory grid
- `/vehicles/[slug]` — Detail + book/request
- `/book/self-drive` — Checkout flow
- `/book/chauffeur` — Request flow
- `/confirmation/[id]` — Success
- `/policies` — Terms / cancel / damage

### Admin
- `/admin/login`
- `/admin` — Dashboard
- `/admin/vehicles`
- `/admin/reservations` (+ calendar view)
- `/admin/requests` — Pending chauffeur requests
- `/admin/drivers`
- `/admin/maintenance`
- `/admin/expenses`
- `/admin/reports`

---

## 7. Technical requirements

### 7.1 Suggested stack (MVP)
- **Frontend:** Next.js (App Router) or Astro + React islands
- **Auth:** Clerk or Auth.js (admin only in v1)
- **DB:** Postgres (Supabase or Neon)
- **ORM:** Prisma or Drizzle
- **Payments:** Stripe Checkout or Payment Intents
- **Email:** Resend
- **Storage:** S3-compatible (vehicle photos, receipts)
- **Hosting:** Vercel

### 7.2 Non-functional
- Page load under 3s on mobile broadband
- HTTPS everywhere
- HTTPS + secure cookies for admin session
- WCAG 2.1 AA for core booking flows (forms labeled, keyboard usable)
- Daily DB backups
- Audit log for reservation status changes (nice-to-have)

### 7.3 Security
- Admin routes protected by auth
- Role-based access for staff vs owner
- PCI via Stripe (no card data stored)
- Rate-limit booking/request endpoints
- Input validation on all forms

---

## 8. Payments & business rules (defaults — confirm before build)

- Self-drive: deposit **X%** at booking; balance due at pickup (or full upfront)
- Chauffeur: deposit on confirm; remainder after trip (or full on confirm)
- Cancellation: free until **N** hours before start; after that, deposit forfeited
- Damage: security hold / deposit policy documented on site
- Currency: **[local currency]**
- Timezone: **[business timezone]**

---

## 9. Success metrics

| Metric | Target (first 90 days) |
|--------|-------------------------|
| Successful self-drive bookings completed online | [e.g. 80% of rentals] |
| Chauffeur requests submitted via site | [e.g. 50% of chauffeur jobs] |
| Double-booking incidents | 0 |
| Admin time to confirm a chauffeur request | < 15 minutes during business hours |
| Vehicle utilization visibility | 100% of fleet in system |

---

## 10. MVP scope vs later

### MVP (ship first)
- Inventory browse + detail
- Self-drive booking + Stripe + email
- Chauffeur request form + admin confirm + driver assign
- Admin: vehicles, reservations calendar, maintenance, expenses
- Availability blocking

### Phase 2
- Customer accounts
- SMS reminders
- Reports / CSV export
- Staff roles
- Online full payment for chauffeur
- Document upload (license photo)

### Phase 3
- Multi-location
- Dynamic pricing
- Driver mobile check-in
- Accounting integrations

---

## 11. Open questions
1. Deposit % and cancellation windows?
2. Do chauffeur requests auto-hold the vehicle or only after admin confirm?
3. One pickup location only, or delivery / multi-depot?
4. License verification: manual review or upload required before confirm?
5. Need invoices / tax receipts?
6. Languages / markets beyond primary?

---

## 12. Acceptance criteria (MVP done when)

- [ ] Customer can browse vehicles and complete a paid self-drive reservation without admin help
- [ ] Overlapping dates for the same vehicle are rejected
- [ ] Customer can submit a chauffeur request with full trip details
- [ ] Admin can log in, see reservations, confirm chauffeur trips, assign drivers
- [ ] Admin can mark a vehicle in maintenance and it disappears from bookable inventory
- [ ] Admin can log expenses and maintenance against a vehicle
- [ ] Customer and admin receive email on new booking / confirmation
- [ ] Site works on mobile and desktop

---

## 13. Timeline (suggested)

| Phase | Work | Duration |
|-------|------|----------|
| 0 | Finalize pricing rules + policies + open questions | 3–5 days |
| 1 | Data model + auth + vehicle CRUD | 1–2 weeks |
| 2 | Public inventory + self-drive booking + Stripe | 2–3 weeks |
| 3 | Chauffeur request + admin confirm flow | 1–2 weeks |
| 4 | Maintenance, expenses, calendar polish | 1–2 weeks |
| 5 | QA, policies, soft launch | 1 week |

**Rough MVP:** 6–10 weeks for a single full-stack engineer (part-time longer).

---

## 14. Risks

| Risk | Mitigation |
|------|------------|
| Double-booking under race conditions | DB constraints + transactional booking |
| No-shows / damage disputes | Clear policy + deposit + license capture |
| Chauffeur quote complexity | Manual confirm in v1; auto-price later |
| Scope creep (tracking, apps) | Stick to MVP checklist above |
