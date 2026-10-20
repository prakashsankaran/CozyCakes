# Feature Specification: CozyCakes Storefront (end-to-end MVP)

**Feature Branch**: `001-cozycakes-storefront`

**Created**: 2026-10-20

**Status**: Approved 2026-10-20 (owner accepted the defaults below; any can be revisited)

**Input**: User description: "Create a modern, sleek and visually appealing ecommerce website for
CozyCakes, a home cake business, with end-to-end functionality. It must be responsive because it
will later be extended into a mobile app. The look and feel must be modern and must not follow a
traditional, boring ecommerce layout; customers must have a really nice feeling using it. Start with
these requirements; scope will grow iteratively."

## Overview

CozyCakes is a home bakery that sells made-to-order cakes. Today orders arrive through Instagram
messages. This feature delivers the first complete online store: customers discover cakes,
personalise one, pay online, and follow their order until it is delivered or collected; the baker
manages the menu, daily capacity, and orders from a simple back office.

The experience is the product: it should feel like walking into a warm, friendly kitchen rather
than browsing a catalogue.

## User Scenarios & Testing *(mandatory)*

### User Story 1 - Discover cakes and feel the brand (Priority: P1)

A visitor (usually arriving from Instagram on a phone) lands on CozyCakes and is drawn in by an
immersive, story-led home page: hero imagery of signature cakes, the baker's story, occasions
("Birthdays", "Anniversaries", "Just because"), and featured creations. They browse cakes as large,
swipeable visual cards, filter by occasion, flavour, or dietary need (e.g., eggless), and open a
cake to see beautiful photos, description, flavours, sizes, starting price, and earliest available
date.

**Why this priority**: Without discovery there is nothing to buy, and this is where the "cozy"
brand promise is made or broken. On its own it already replaces the Instagram highlight reel as a
shareable menu.

**Independent Test**: Load the site on a phone, browse from the home page to a cake detail page
using only touch, and verify cakes, prices, photos, and earliest dates are shown with no
traditional grid-and-sidebar layout.

**Acceptance Scenarios**:

1. **Given** a first-time visitor on a phone, **When** they open the home page, **Then** they see
   a full-bleed hero, the brand story, occasion entry points, and featured cakes, and can reach any
   cake in at most 2 taps.
2. **Given** a visitor browsing cakes, **When** they choose the "Eggless" and "Birthday" filters,
   **Then** only matching cakes are shown, with a friendly message and suggestions if none match.
3. **Given** a cake that is temporarily unavailable, **When** a visitor views it, **Then** it is
   clearly marked "Back soon" and cannot be added to the cart.
4. **Given** a visitor with reduced-motion enabled, **When** they browse, **Then** all content is
   available without animations.

---

### User Story 2 - Personalise a cake and add it to the cart (Priority: P1)

On a cake's page the customer enters a guided, playful "build your cake" flow, one choice at a
time: size (serves/weight), flavour, frosting, dietary option (e.g., eggless), optional add-ons
(toppers, candles, extra decoration), a message to pipe on the cake, and optionally a reference
photo for themes. The price updates live with each choice and a visual summary of the cake builds
up as they go. They add it to a cart that slides in as a sheet rather than navigating away.

**Why this priority**: Cakes are personal; customisation is the core of what CozyCakes sells and
is what Instagram DMs are mostly used for today.

**Independent Test**: Pick any cake, make every type of choice, confirm the live price matches the
published price rules, add to cart, and verify the cart shows the exact configuration and total.

**Acceptance Scenarios**:

1. **Given** a customer on a cake page, **When** they select a 1 kg size and add an extra topper,
   **Then** the displayed price equals base price for 1 kg plus the topper price, updated without
   a page reload.
2. **Given** a cake message longer than the allowed length, **When** the customer types it,
   **Then** they see a live character count and cannot exceed the limit.
3. **Given** a customer uploads a reference photo, **When** the file is not an image or exceeds the
   size limit, **Then** they get a friendly error and can retry.
4. **Given** a customer has items in the cart, **When** they return later on the same device,
   **Then** their cart is still there.
5. **Given** a configured cake in the cart, **When** the customer edits it, **Then** they return to
   the builder with their previous choices pre-selected.

---

### User Story 3 - Choose a date, check out, and pay online (Priority: P1)

The customer opens the cart, picks delivery or self-pickup, chooses a date from a calendar that only
offers days the baker can fulfil (respecting each cake's preparation lead time and the baker's daily
capacity), chooses a time slot, enters contact and delivery details, and pays online. Checkout works
as a guest; creating an account is optional. On success they see a celebratory confirmation and
receive a confirmation message with their order number.

**Why this priority**: This is the "end-to-end" core: without paid orders the site is only a
brochure.

**Independent Test**: With a test payment, complete checkout from cart to confirmation as a guest on
a phone and verify an order is created, payment is captured, the date's capacity is reduced, and a
confirmation message is sent.

**Acceptance Scenarios**:

1. **Given** a cake with a 2-day lead time ordered on Monday, **When** the customer opens the date
   picker, **Then** Monday and Tuesday are unavailable and Wednesday onwards is available unless
   that day is full or blocked by the baker.
2. **Given** a delivery address outside the delivery area, **When** the customer enters it,
   **Then** they are told delivery is not available there and offered self-pickup.
3. **Given** a successful payment, **When** the payment provider confirms it, **Then** the order
   moves to "Confirmed", the customer sees the confirmation screen, and receives a confirmation
   message with order details.
4. **Given** a failed or abandoned payment, **When** the customer returns, **Then** no order is
   confirmed, no capacity is consumed beyond a short hold, and they can retry without re-entering
   details.
5. **Given** the chosen date fills up while the customer is checking out, **When** they try to pay,
   **Then** they are told before being charged and asked to pick another date.

---

### User Story 4 - Track my order (Priority: P2)

After ordering, the customer can follow their order on a friendly status timeline (Confirmed → Baking
→ Ready → Out for delivery / Ready for pickup → Delivered / Collected) via a link in their
confirmation message, or from "My orders" if they have an account. They are notified when the status
changes.

**Why this priority**: Reduces "is my cake ready?" messages and makes the wait part of the
experience, but orders can be fulfilled without it.

**Independent Test**: Place an order, advance its status from the back office, and verify the
customer's tracking page and notifications reflect each change.

**Acceptance Scenarios**:

1. **Given** a guest with an order link, **When** they open it, **Then** they see their order's
   current status, items, date, and fulfilment details without logging in, and nobody without the
   link can see it.
2. **Given** the baker marks an order "Out for delivery", **When** that happens, **Then** the
   customer receives a notification and the timeline updates.
3. **Given** a signed-in customer, **When** they open "My orders", **Then** they see current and
   past orders and can re-order a past cake in one tap.

---

### User Story 5 - Baker manages menu, availability, and orders (Priority: P1)

The baker signs into a simple, phone-friendly back office. They add and edit cakes (photos,
description, sizes and prices, flavours, options, lead time, dietary tags, visibility), set how many
orders they can take per day, block days off (holidays, fully booked), and see incoming orders as a
board grouped by date and status. They open an order to see every customisation and reference
photo, and move it through its statuses. They can cancel an order with a reason.

**Why this priority**: The business cannot run online without the baker controlling what is sold
and when; it is required for any real order to be fulfilled.

**Independent Test**: Sign in as the baker on a phone, create a new cake with options, block a date,
receive a test order, and move it to "Delivered", verifying the storefront reflects each change.

**Acceptance Scenarios**:

1. **Given** the baker creates a cake and marks it visible, **When** a customer browses, **Then**
   the cake appears with its photos, options, and prices.
2. **Given** the baker sets daily capacity to 3 and 3 orders exist for Saturday, **When** a
   customer opens the date picker, **Then** Saturday is shown as fully booked.
3. **Given** a new paid order, **When** it arrives, **Then** the baker is notified and it appears in
   the "Confirmed" column for its date.
4. **Given** a non-staff visitor, **When** they try to open the back office, **Then** access is
   denied.

---

### User Story 6 - Accounts and favourites (Priority: P3)

A returning customer can create an account with a passwordless sign-in (one-time code or magic link),
saves addresses and favourite cakes, and checks out faster next time.

**Why this priority**: Nice for repeat customers, but guest checkout covers the MVP.

**Independent Test**: Sign up, save an address and a favourite, sign out and back in on another
device, and verify both persist and pre-fill checkout.

**Acceptance Scenarios**:

1. **Given** a guest who just ordered, **When** they choose "Save my details", **Then** an account
   is created with that order attached.
2. **Given** a signed-in customer, **When** they tap the heart on a cake, **Then** it appears in
   their favourites on every device.

---

### Edge Cases

- A cake or option is edited or hidden by the baker while it sits in a customer's cart: the cart
  shows the change and the new price, or asks the customer to remove an unavailable item, before
  payment.
- Two customers try to book the last slot on a day at the same time: only one succeeds; the other
  is asked to choose a new date before being charged.
- Payment succeeds but the customer closes the browser before the confirmation screen: the order
  is still confirmed from the provider's notification and the confirmation message is still sent.
- Duplicate payment notifications must not create duplicate orders.
- The baker cancels a paid order: the customer is notified and a refund is initiated.
- Orders placed close to midnight, and dates shown, use the bakery's local time zone regardless of
  the customer's device time zone.
- Very slow or offline connections: the site shows a friendly offline screen, keeps the cart, and
  never shows a half-submitted checkout.
- Reference photo uploads that fail mid-way can be retried without losing other choices.

## Requirements *(mandatory)*

### Functional Requirements

**Discovery & brand**

- **FR-001**: The storefront MUST present a story-led home page with hero imagery, the CozyCakes
  story, occasion entry points, and featured cakes.
- **FR-002**: Customers MUST be able to browse all visible cakes and filter them by occasion,
  flavour, and dietary tag.
- **FR-003**: Each cake MUST have a detail view with a photo gallery, description, available sizes,
  flavours, dietary tags, starting price, lead time, and earliest available date.
- **FR-004**: Unavailable cakes MUST be visibly marked and MUST NOT be purchasable.
- **FR-005**: The layout MUST avoid a conventional dense product grid with filter sidebar; browsing
  MUST use visual, card- and story-based patterns (see Experience Requirements).

**Personalisation & cart**

- **FR-006**: Customers MUST be able to configure a cake through a step-by-step builder covering
  size, flavour, frosting, dietary option, add-ons, cake message, and optional reference photo,
  limited to the options the baker enabled for that cake.
- **FR-007**: The price MUST update immediately for every choice and MUST equal the server-computed
  price at checkout.
- **FR-008**: Cake messages MUST be limited to 40 characters; reference photos to common image
  formats up to 10 MB.
- **FR-009**: The cart MUST persist on the customer's device across visits and be editable
  (quantity, configuration, remove).

**Scheduling & checkout**

- **FR-010**: Customers MUST choose delivery or self-pickup, a date, and a time slot.
- **FR-011**: Available dates MUST respect each item's lead time (the longest in the cart), the
  baker's daily order capacity, blocked days, and the bakery's local time zone.
- **FR-012**: Delivery MUST only be offered for addresses inside the baker's delivery area, with a
  delivery fee as configured by the baker.
- **FR-013**: Checkout MUST work as a guest, collecting name, phone, email, and (for delivery)
  address, plus an optional note for the baker.
- **FR-014**: Customers MUST be able to pay online through a payment provider supporting cards and
  local instant-payment methods; CozyCakes MUST NOT store card details.
- **FR-015**: An order MUST only be confirmed after the payment provider verifies payment; the
  selected date's capacity MUST be held briefly during payment and released if payment fails.
- **FR-016**: On confirmation the customer MUST see a confirmation screen and receive a confirmation
  message (email, and optionally WhatsApp/SMS) with order number and tracking link.
- **FR-017**: Customers MAY apply a discount code created by the baker.

**Order tracking**

- **FR-018**: Each order MUST have a private tracking link showing status timeline, items, date,
  and fulfilment details.
- **FR-019**: Customers MUST be notified when their order moves to Ready, Out for delivery,
  Delivered/Collected, or Cancelled.

**Back office (baker)**

- **FR-020**: Only authenticated staff MUST be able to access the back office.
- **FR-021**: Staff MUST be able to create, edit, reorder, hide, and archive cakes, including
  photos, sizes and prices, option groups and add-on prices, lead time, and tags.
- **FR-022**: Staff MUST be able to set default daily capacity, override capacity for specific
  dates, block dates, and configure time slots, delivery area, and delivery fee.
- **FR-023**: Staff MUST see orders grouped by date and status, view full order details including
  customisation and reference photos, and move orders through the status flow.
- **FR-024**: Staff MUST be able to cancel an order with a reason, which notifies the customer and
  triggers a refund for paid orders.
- **FR-025**: Staff MUST be notified of every new confirmed order.
- **FR-026**: Every order status change MUST be recorded with who made it and when.

**Accounts**

- **FR-027**: Customers MAY create an account using passwordless sign-in and MUST then be able to
  see past orders, re-order, save addresses, and save favourite cakes.

**Platform**

- **FR-028**: Every screen MUST be fully usable from 360px phone width to large desktop.
- **FR-029**: The site MUST be installable to a phone home screen and show a branded offline page
  when there is no connection.
- **FR-030**: All functionality used by the storefront MUST be available through a documented API
  so a future mobile app can reuse it.

### Experience Requirements

- **XR-001**: Visual language: warm, cozy, and modern: soft cream and cocoa base tones with a
  playful accent, generous whitespace, rounded shapes, an expressive display typeface paired with
  a clean text typeface. Final palette and type are confirmed with the owner against real
  CozyCakes photography.
- **XR-002**: Navigation on phones uses a thumb-reachable bottom bar (Home, Cakes, Cart, Me) and
  sheets/overlays instead of full page reloads for cart and quick views.
- **XR-003**: Signature delight moments: a cake that "assembles" as the builder progresses; a
  gentle add-to-cart animation; a celebratory confirmation (e.g., confetti/sprinkles); a warm,
  hand-written-style thank-you note from the baker; personalised greetings for returning customers.
- **XR-004**: Copy uses a friendly first-person voice from the baker ("I'll start baking on
  Friday morning") instead of system language.
- **XR-005**: Empty, error, and loading states are designed, branded, and helpful, never blank or
  technical.
- **XR-006**: All motion respects reduced-motion preferences, and all screens meet WCAG 2.2 AA.

### Key Entities

- **Cake (Product)**: a menu item: name, story/description, photos, occasion and dietary tags,
  base lead time, visibility status, display order.
- **Size**: a cake's size option (e.g., 0.5 kg / serves 4–6) with its price.
- **Option Group & Option**: configurable choices (flavour, frosting, dietary, add-ons), each with
  optional price adjustment, enabled per cake.
- **Cart & Cart Item**: a customer's pending selections with full configuration, message, and
  reference photo.
- **Customer**: contact details, optional account, saved addresses, favourites.
- **Order & Order Item**: a confirmed purchase: snapshot of items and prices, fulfilment method,
  date and slot, address, totals, discount, status, and status history.
- **Payment**: the payment attempt and its provider reference, amount, status, and refunds.
- **Availability**: daily capacity, per-date overrides, blocked dates, time slots, delivery area
  and fees.
- **Discount Code**: code, type (percentage/fixed), validity window, usage limits.
- **Staff User**: back-office account with role.

## Success Criteria *(mandatory)*

### Measurable Outcomes

- **SC-001**: A first-time customer on a phone can go from landing page to a paid order for a
  customised cake in under 4 minutes.
- **SC-002**: At least 90% of test customers complete checkout on their first attempt without
  asking for help.
- **SC-003**: In owner-led usability sessions, at least 8 of 10 participants describe the
  experience with positive emotional words (e.g., "lovely", "fun", "cozy") and none call it
  "generic".
- **SC-004**: Pages show meaningful content within 2.5 seconds on a mid-range phone over 4G.
- **SC-005**: Zero overbooked days: confirmed orders never exceed a day's capacity.
- **SC-006**: Zero orders confirmed without a verified successful payment, and zero duplicate
  orders from repeated payment notifications.
- **SC-007**: The baker can add a new cake with photos and options in under 5 minutes on a phone.
- **SC-008**: "Where is my order?" messages to the baker drop by at least 50% within two months of
  launch compared with the Instagram-only baseline.
- **SC-009**: 100% of screens pass automated accessibility checks at WCAG 2.2 AA.

## Assumptions

- **Location & currency**: CozyCakes operates in a single city in India; prices are in INR and
  customers expect UPI as well as cards. *(Inferred; owner to confirm.)*
- **Fulfilment**: Local delivery within a radius set by the baker, plus self-pickup from the
  baker's home kitchen. No shipping/couriers.
- **Ordering model**: All cakes are made to order with a default lead time of 2 days, adjustable
  per cake; same-day orders are not offered in the MVP.
- **Capacity**: Capacity is a simple number of orders per day (not per oven hour), set by the
  baker.
- **Staff**: One baker/owner with a staff account, possibly one helper; no complex roles.
- **Brand assets**: The Instagram page (@cosycaker) could not be accessed during spec writing, so
  branding is inferred from the name "CozyCakes". Logo, photos, and final palette will be supplied
  by the owner; placeholders are used until then.
- **Interim ordering**: Until online checkout (User Story 3) ships, cake pages invite customers to
  order by messaging the baker on Instagram.
- **Notifications**: Email is the baseline channel; WhatsApp notifications are desirable and will
  be added when a provider is chosen.
- **Out of scope for this feature**: native mobile app (planned next; this feature keeps it
  possible), multi-baker marketplace, subscriptions, loyalty points, product reviews, live chat,
  inventory of raw ingredients, and multi-language content.
