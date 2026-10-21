# Data Model: CozyCakes Storefront

**Feature**: [spec.md](./spec.md) | **Plan**: [plan.md](./plan.md) | **Date**: 2026-10-20

Conventions: ids are UUIDs; money is stored as integer minor units (paise) with a `currency`
setting on the bakery; timestamps are UTC; fulfilment dates are calendar dates in the bakery time
zone. All tables have `created_at` / `updated_at`.

## Catalog

### Cake

| Field | Type | Rules |
|-------|------|-------|
| id | uuid | |
| slug | text | unique, URL-safe |
| name | text | 2–80 chars |
| tagline | text | ≤ 120 chars, used on cards |
| story | text | markdown, ≤ 2,000 chars |
| photos | Photo[] | 1–10; first is cover; each has `url`, `alt` (required), `width`, `height` |
| occasion_tags | text[] | from Tag list (e.g., birthday, anniversary, wedding, just-because) |
| dietary_tags | text[] | e.g., eggless, nut-free; a tag means the cake is (or can be made) that way |
| flavour_tags | text[] | used by the storefront flavour filter (FR-002) |
| lead_time_days | int | ≥ 0; default 2 |
| status | enum | `draft` · `visible` · `paused` ("Back soon") · `archived` |
| featured | bool | shown on home page |
| sort_order | int | |

### Size

Belongs to Cake. `label` ("0.5 kg"), `serves` ("4–6"), `price` (minor units > 0), `sort_order`,
`active`. A visible cake MUST have ≥ 1 active size.

### OptionGroup / Option

- **OptionGroup**: `name` (Flavour, Frosting, Dietary, Add-ons), `kind` (`single` | `multi`),
  `required` (bool), `max_select` (multi only).
- **Option**: belongs to group; `name`, `price_delta` (minor units, ≥ 0), `active`, optional
  `swatch` (colour/image for the builder visual).
- **CakeOptionGroup**: links a Cake to the groups (and subset of options) it offers.

### Tag

`slug`, `label`, `type` (`occasion` | `dietary` | `flavour`), `emoji` (optional), `sort_order`.

## Cart (client-held, server-validated)

The cart lives on the device (local storage) for guests and is mirrored to the account when signed
in. It is never trusted: the server re-prices it on every quote.

**CartItem**: `id` (device-generated line id), `cake_id`, `size_id`, `option_ids[]`, `message`
(≤ 40 chars), `reference_photo` (optional `{ upload_id, url }` of a ReferenceUpload), `quantity`
(1–5). At most 20 lines. Pricing: `unit_price = size.price + Σ chosen option.price_delta`,
`line_total = unit_price × quantity` (`packages/core/src/pricing.ts`, shared by the builder and
the quote endpoint). The device also keeps a display snapshot (name, size, choices, unit price)
so the cart renders offline; it is never sent for pricing.

## Availability

### BakerySettings (singleton)

`time_zone` (default `Asia/Kolkata`), `currency` (default `INR`), `default_daily_capacity` (int,
default 3), `pickup_address`, `pickup_instructions`, `booking_window_days` (default 60),
`hold_minutes` (default 15), `upi_id` and `upi_name` (text, default empty: the UPI ID customers
pay into by hand and the payee name their app shows; an empty `upi_id` means no UPI checkout,
research.md §6), `sample_menu_version` (int, default 0: which placeholder menu
`db:seed` last loaded; deploys reload the sample menu when it is older than the code's; `-1` once
the owner edits the menu in the back office, after which deploys never touch the catalog).

### TimeSlot

`label` ("10am – 12pm", generated from the times), `start`, `end`, `fulfilment` (`delivery` |
`pickup` | `both`), `active`. The baker adds times and stops offering them, but never edits or
deletes one, so past orders keep pointing at the slot they booked; at least one stays active, and
two active slots can't share the same times. Any slot change marks the menu as owner-managed
(`sample_menu_version = -1`), so deploys never reload the sample slots.

### DayAvailability

One row per date that has an override or bookings: `date` (unique), `capacity_override` (nullable
int), `blocked` (bool), `note`. Used as the lock row for capacity checks; rows with neither an
override nor a block are only locks and don't appear in the back office's special days.

### DeliveryZone

`postal_code` (unique), `fee` (minor units), `active`.

### CapacityHold

`id`, `date`, `checkout_id`, `expires_at`, `converted_at`. Counted against capacity until expired
or converted.

### Checkout

`id`, `snapshot` (priced lines with option prices, fulfilment, date, slot, contact, address, note,
subtotal, delivery fee, total; copied onto the order), `hold_id`, `payment_provider_order_id`
(unique), `status` (`open` · `paid` · `expired` · `failed`), `expires_at`.

**Availability rules**

- `earliest_date = today_in_bakery_tz + max(lead_time_days of cart items)`.
- A date is **available** iff not blocked, within `booking_window_days`, and
  `confirmed_orders(date) + active_holds(date) < (capacity_override ?? default_daily_capacity)`.
- Hold creation and the capacity check run in one transaction with `DayAvailability` locked.

## Customers & Staff

### User

Created with Better Auth in US5 (tasks T047), which owns the `users`, `sessions`, `accounts` and
`verifications` tables (`packages/db/src/schema/auth.ts`, text ids generated by Better Auth).
`orders.user_id` and `order_status_events.actor_user_id` stay nullable text ids without foreign keys.
An address in `OWNER_EMAIL` is treated as `owner` whatever its stored role. US6 adds `phone` (text,
empty by default), filled from the customer's first order when they save their details.

Guest orders join an account by verified email: whenever a customer opens their account, orders
with no `user_id` whose contact email matches theirs (ignoring case) are given their `user_id`.


`id`, `email` (unique), `name`, `phone`, `role` (`customer` | `staff` | `owner`), `email_verified`.

### Address

Table `addresses`, belongs to User (deleted with it): `label` (optional, ≤ 30, like "Home"),
`line1`, `line2`, `landmark`, `city`, `postal_code`. At most 10 per customer; saving one that is
already there (same street and PIN code) keeps the one already saved instead of adding a copy. The
phone lives on User.

### Favourite

Table `favourites`: `user_id`, `cake_id` (unique pair, both deleted with their user or cake),
`created_at`.

## Orders & Payments

### Checkout

Short-lived record created when the customer starts paying: `id`, priced snapshot of the cart,
fulfilment details, contact details, `hold_id`, `payment_provider_order_id`, `status`
(`open` · `paid` · `expired` · `failed`), `expires_at`.

### Order

| Field | Type | Rules |
|-------|------|-------|
| id | uuid | |
| number | text | human-friendly, unique, e.g., `CC-24017` (from the `order_number_seq` sequence, starting at 24001) |
| tracking_token | text | unguessable (≥ 128-bit), used in the private tracking link |
| user_id | uuid? | null for guests |
| contact | {name, email, phone} | required |
| fulfilment | enum | `delivery` · `pickup` |
| date / slot_id | date / uuid | |
| slot_label | text | the slot as the customer saw it |
| address | Address snapshot? | required for delivery |
| note_to_baker | text | ≤ 500 chars |
| subtotal, delivery_fee, discount, total | int | minor units; `total = subtotal + delivery_fee − discount` |
| discount_code_id | uuid? | |
| status | enum | see state machine |
| cancel_reason | text? | required when cancelled |

### OrderItem

Snapshot at purchase time: `cake_id`, `cake_name`, `size_label`, `options` (name + price_delta
list), `message`, `reference_photo_url`, `unit_price`, `quantity`, `line_total`.

### OrderStatusEvent

`order_id`, `from_status`, `to_status`, `actor_user_id` (null = system), `note`, `created_at`.
Append-only (Principle IV).

### Payment

`order_id`/`checkout_id`, `provider` (`razorpay` · `upi` · `test`), `provider_payment_id` (unique →
idempotency; `upi_<order id>` for UPI), `amount`, `status` (`created` · `captured` · `failed` ·
`refunded` · `partially_refunded`), `raw_event` (json), `reference` (text?, the UPI reference the
customer typed) and `claimed_at` (timestamptz?, when they said they'd paid). A UPI payment is
`created` while the order awaits payment, `captured` when the owner taps "Payment received", and
`failed` if the order is cancelled first.

### Refund

`payment_id`, `amount`, `provider_refund_id`, `status` (`manual` for a UPI payment the owner
sends back by hand), `reason`.

### DiscountCode

`code` (unique, case-insensitive; stored upper-case, 3–20 letters or digits), `type`
(`percent` | `fixed`), `value` (percent 1–100, or paise), `min_subtotal`, `starts_on`, `ends_on`
(calendar dates, inclusive, in the bakery's time zone; migration `0004` replaced the unused
`starts_at`/`ends_at` timestamps), `max_redemptions`, `redemptions`, `active`.

- A code works when it is active, today is within its days, it has uses left, and the cart's
  subtotal reaches `min_subtotal` (`checkDiscount` in `packages/core/src/discounts.ts`).
- The checkout snapshot carries `discount`, `discountCode` and `discountCodeId`; the order copies
  `discount` and `discount_code_id`, and `redemptions` goes up by one in the same transaction.

### ReferenceUpload

`id`, `url`, `bytes` (≤ 10 MB), `mime` (image/jpeg, png, webp, heic), `created_at`. Unattached
uploads older than 7 days are deleted.

## Order state machine

```text
             ┌──────────────────────── cancel (staff, with reason → refund) ───────────────┐
             │                                                                             ▼
Confirmed ──► Baking ──► Ready ──► Out for delivery ──► Delivered                      Cancelled
    ▲
Awaiting payment (UPI by hand; "Payment received")
                          │
                          └──────► Ready for pickup ──► Collected
```

- Orders paid through a gateway are created directly in `Confirmed` once the payment is verified.
  Orders paid by UPI by hand start in `Awaiting payment` (holding their date) and move to
  `Confirmed` when staff tap "Payment received"; one unclaimed for an hour is cancelled
  automatically (research.md §6). `Awaiting payment` is never a forward move target, and the
  customer hears about leaving it (confirmation email) but not entering it from a status move.
- `Ready → Out for delivery` only when `fulfilment = delivery`; `Ready → Ready for pickup` only
  when `fulfilment = pickup`.
- `Cancelled` is reachable from any non-final state; `Delivered`, `Collected`, `Cancelled` are
  final.
- Every transition writes an `OrderStatusEvent`; transitions to Ready, Out for delivery, Ready for
  pickup, Delivered, Collected, and Cancelled notify the customer (FR-019).
- Orders move one step forward at a time (no skipping); the move locks the order row, so two
  people tapping at once can't both move it. Rules live in `packages/core/src/orders.ts`.
- Cancelling frees the date's place (capacity counts non-cancelled orders) and refunds a captured
  payment in full. A refund the provider refuses is stored with `provider_refund_id` null and
  `status = failed`, and the payment stays `captured` so the owner knows to refund it by hand.

## Pricing rule

```text
unit_price = size.price + Σ selected option.price_delta
subtotal   = Σ unit_price × quantity
discount   = percent: floor(subtotal × value / 100) | fixed: min(value, subtotal)
total      = subtotal + delivery_fee − discount
```

Computed only in `packages/core` on the server; the client shows a preview using the same function.
