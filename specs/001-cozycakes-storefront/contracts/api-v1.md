# API Contract: `/api/v1`

**Feature**: [../spec.md](../spec.md) | **Data model**: [../data-model.md](../data-model.md)

JSON over HTTPS. Schemas are defined in zod in `packages/core/src/schemas` and published as an
OpenAPI document at `/api/v1/openapi.json`. Money is integer minor units. Errors use
`{ "error": { "code": string, "message": string, "details"?: object } }` with standard HTTP status
codes. JSON field names are camelCase (query parameters stay as documented below). Every response
is validated against its zod schema before it is sent. Authenticated calls use the session cookie (web) or `Authorization: Bearer` (mobile).

## Public storefront

| Method & path | Purpose | Notes |
|---------------|---------|-------|
| `GET /api/v1/home` | Hero content, featured cakes, occasions | Cached |
| `GET /api/v1/cakes?occasion=&dietary=&flavour=` | List visible/paused cakes as cards: `{ cakes: CakeCard[] }` | Each facet takes a comma-separated list; occasion/flavour match any, dietary must match all. `paused` returned with `available: false`. `400 INVALID_QUERY` on bad input |
| `GET /api/v1/cakes/{slug}` | Cake detail with sizes, option groups, lead time, earliest date | `404 CAKE_NOT_FOUND` for unknown, draft or archived cakes |
| `GET /api/v1/tags` | Filter tags: `{ tags: Tag[] }` | |
| `POST /api/v1/cart/quote` | Re-price a cart, validate items, return line totals and warnings | Body: `{ items: CartItem[], postal_code?, discount_code? }` |
| `GET /api/v1/availability?from=&to=&lead_days=&fulfilment=` | Calendar of dates with `available` / `full` / `blocked` / `too_soon` and slots | Bakery time zone |
| `GET /api/v1/delivery/check?postal_code=` | Is delivery available and fee | |
| `POST /api/v1/uploads/reference` | Get a signed upload for a reference photo | Returns upload URL + `reference_upload_id`; 10 MB, images only |

## Checkout & payment

| Method & path | Purpose | Notes |
|---------------|---------|-------|
| `POST /api/v1/checkouts` | Create checkout: re-price cart, validate date/slot/zone, create capacity hold and provider order | Returns `checkout_id`, `amount`, provider checkout params, `expires_at`. `409 DATE_FULL` if capacity is gone |
| `GET /api/v1/checkouts/{id}` | Poll checkout status after payment | `open` · `paid` (+ `order_number`, `tracking_token`) · `expired` · `failed` |
| `POST /api/webhooks/razorpay` | Provider webhook | Signature verified; idempotent on `provider_payment_id`; creates Order in `Confirmed`, converts hold, sends notifications |

## Orders (customer)

| Method & path | Purpose | Notes |
|---------------|---------|-------|
| `GET /api/v1/orders/track/{tracking_token}` | Order status timeline and details | No login; token is the secret |
| `GET /api/v1/me/orders` | Signed-in customer's orders | Auth |
| `POST /api/v1/me/orders/{id}/reorder` | Returns cart items for a past order, re-validated | Auth |
| `GET/POST/DELETE /api/v1/me/favourites` | Manage favourites | Auth |
| `GET/POST/PATCH/DELETE /api/v1/me/addresses` | Manage saved addresses | Auth |

## Auth

| Method & path | Purpose |
|---------------|---------|
| `POST /api/v1/auth/otp/request` | Send one-time code to email |
| `POST /api/v1/auth/otp/verify` | Verify code, start session (cookie or bearer token) |
| `POST /api/v1/auth/signout` | End session |

## Back office (role `staff` or `owner`)

| Method & path | Purpose |
|---------------|---------|
| `GET /api/v1/admin/orders?date=&status=` | Orders board data |
| `GET /api/v1/admin/orders/{id}` | Full order with items, reference photos, status history |
| `POST /api/v1/admin/orders/{id}/transition` | `{ to_status, note? }`; validated against the state machine; `409 INVALID_TRANSITION` |
| `POST /api/v1/admin/orders/{id}/cancel` | `{ reason }`; triggers refund and customer notification |
| `GET/POST /api/v1/admin/cakes`, `GET/PATCH/DELETE /api/v1/admin/cakes/{id}` | Manage cakes, sizes, option links, photos |
| `GET/POST/PATCH /api/v1/admin/option-groups` | Manage option groups and options |
| `POST /api/v1/admin/uploads/photo` | Signed upload for cake photos |
| `GET/PATCH /api/v1/admin/settings` | Bakery settings (capacity, time zone, pickup, hold minutes) |
| `GET/PUT /api/v1/admin/availability/{date}` | Capacity override / block a date |
| `GET/POST/PATCH /api/v1/admin/time-slots` | Manage slots |
| `GET/POST/PATCH/DELETE /api/v1/admin/delivery-zones` | Manage serviceable PIN codes and fees |
| `GET/POST/PATCH /api/v1/admin/discount-codes` | Manage discount codes |

## Notification contract

Customer messages (email; WhatsApp later via the same `Notifier` interface):
`order_confirmed`, `order_ready`, `order_out_for_delivery`, `order_ready_for_pickup`,
`order_delivered`, `order_collected`, `order_cancelled`. Staff: `new_order`. Every message includes
the order number and tracking link.
