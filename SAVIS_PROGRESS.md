# SAVIS — Project Progress Snapshot

Last updated: 2026-10-04

Final-dream hardening pass: security/RLS follow-up committed after the main consumer deployment.

## Product
SAVIS is a Kenya-focused marketplace connecting consumers with trusted local helpers, providers, professionals, sellers and agents.

## Current production
- Vercel production: https://savis-alpha.vercel.app/
- GitHub repo: https://github.com/yungfillyke/savis
- Main branch contains the merged Home, Settings, Account Menu, location foundation and map foundation.

## Roles
- Consumer
- Provider
- Professional
- Seller
- Agent

## Completed
### Consumer Home UX
- Account/welcome information at the top
- Search
- Location section
- Sponsored ad placeholder
- Categories
- Nearby provider cards
- Recommendations
- Bottom navigation
- Account menu with Profile, Settings, Bookings, Messages and role-related links
- Agent promotion removed from Home

### Account / Settings
- Profile page
- Settings page
- Dark mode preference prototype
- English/Swahili preference
- Notifications preference
- Location preference
- Account menu
- Messages placeholder
- Bookings flow exists

### Location foundation
- Browser geolocation opt-in
- Location saved in localStorage
- User coordinates can be written to Supabase profile
- Great-circle distance calculation
- Booking requests can carry consumer latitude/longitude/accuracy
- Existing booking flow has fallback behavior if the location migration is not yet applied

### Maps
- OpenStreetMap embedded map on Consumer Home
- Current location can center the map
- Open-map link available
- This is still a foundation: it is not yet the final interactive multi-marker map.

## Important current limitation
The Supabase SQL migration has been prepared in `supabase/schema.sql`, but it has NOT been confirmed as executed in the Supabase project.

The migration has been run successfully in the Supabase project. The latest migration also adds persistent provider availability and scheduled job dates.

The migration adds:
- profiles.latitude
- profiles.longitude
- profiles.location_name
- profiles.service_category
- profiles.hourly_rate
- profiles.rating
- profiles.review_count
- profiles.availability
- profiles.verified
- profiles.bio
- jobs.latitude
- jobs.longitude
- jobs.location_accuracy
- jobs.scheduled_for
- indexes for discovery
- `search_nearby_providers(...)` RPC using a Haversine-style distance calculation
- `provider_availability` with weekday, working hours and travel-radius persistence

## Latest merged development
Branch: `main`

Latest merged feature: Provider Management Hub calendar + persistent availability

This branch:
- Restored the full Consumer Home after the previous location PR accidentally removed most of the page content.
- Added a real-provider discovery path from Supabase profiles.
- Added the nearby-provider RPC integration with fallback to profile querying.
- Kept sample providers as an Alpha fallback until real provider profiles exist.
- Updated provider detail pages so real Supabase provider IDs can open a provider profile and booking flow.
- Preserved the existing booking/location behavior.

Latest commits:
- Provider calendar/availability merge: `581a8d16b165a440969265b79edb14679c42441a`
- Provider calendar UI: `95399855d2273081f27503de25f050d2a5af98c5`
- Scheduled job support: `a04b0b57f480e6d25fdce0daab2bb9354a41498e`
- Persistent availability schema: `13f3239acd983bbf517dadb8876100da0506463f`
- Consumer Home restoration + discovery foundation: `7bde13abb5d3b3cbc775faffd39c156e9d9d0e0a`
- Supabase provider metadata + nearby RPC: `4c6873f009c164a548b5a575f1f59a2688915c3b`
- Provider detail connection: `b73f3c0051cb509cd1c55ee33b162de209729e9e`

## Next steps — final-dream hardening
1. Run `supabase/final-dream.sql` after the current schema. It adds the production job lifecycle, quotes, status timeline, conversations/messages, favorites, products/orders, payments ledger, notifications and provider-verification records.
2. Test the Provider Hub calendar and publish at least one real Provider profile.
3. Test Consumer Home with browser location permission, category/search/radius, provider profile and booking.
4. Test the live Leaflet/OpenStreetMap provider map and pin quick cards.
5. Test the five consumer tabs: Home, For You, Jobs, Messages, Profile.
6. Connect production M-Pesa credentials/webhook and payment reconciliation before treating payments as live.
7. Add moderation/storage rules and real product/media publishing before opening Marketplace uploads.
8. Finish provider verification review/admin controls and agent commission settlement.
9. Run a production smoke test on the latest Vercel deployment before launch.

## What is NOT finished yet
- Real provider seed data is not populated; the 50-profile tier definition has not been supplied.
- Routing/navigation and true provider live-location tracking are not finished.
- Provider verification review/admin workflow is not finished.
- M-Pesa checkout/webhooks/reconciliation require production Daraja credentials and server-side secrets.
- Wallet/escrow UI still has prototype/local balance behavior; the production payments ledger is now prepared in Supabase.
- Marketplace media uploads/moderation/publishing are not finished.
- Search/recommendations/ads still have prototype elements.
- Full local TypeScript/test run has not been performed in this environment.

## Database hardening checkpoint
- The Supabase repair for `transition_job(...)` was confirmed successful in the SQL Editor.
- Corrected the same delimiter in `supabase/final-dream.sql` so the repository migration is now aligned with the repaired database function.


## Provider KYC gate — October 2026
- Provider verification is now a mandatory go-live gate, not merely a badge.
- Provider Hub asks: “Ready to provide a service?” and sends the provider to the KYC flow.
- Required KYC: ID/passport front, ID/passport back, selfie and consent; professional certificate is optional where relevant.
- KYC documents use a private Supabase Storage bucket and provider-scoped Storage RLS.
- KYC submission moves the profile to `verification_status = pending` and keeps `verified = false`.
- A provider cannot switch Online until `verification_status = verified` and `verified = true`.
- Consumer-facing nearby search, public search, public provider profiles and public provider services now require both verified flags.
- Added `supabase/provider-kyc.sql`.
- Added `src/app/provider/verification/page.tsx`.
- Rebuilt `README.md` as the current beginning-to-end product, architecture, setup, security and roadmap reference.

## Trust & safety / realtime follow-up — October 2026
- Added an explicit `provider_reviewers` allowlist and reviewer-only KYC queue.
- Added secure `review_provider_kyc(...)` and `list_provider_kyc_queue(...)` RPCs.
- Added reviewer-only signed access to private KYC documents.
- Added `/admin/provider-review` for human approval/rejection with required rejection reasons.
- Added Supabase Realtime subscriptions for conversations/messages and a safe in-app quick-start onboarding flow.
- Live M-Pesa, production escrow release/refunds, moderation, routing and provider live-location remain dependent on external credentials/production hardening.

## Continuation instruction
When continuing this project, do NOT rebuild SAVIS from the old uploaded `index.html`. Use the current GitHub main/active branch and the live Alpha as the source of truth. The old HTML is only a historical design/feature reference.


## Provider Hub — current
- Moonlit galaxy provider-only theme.
- Jobs & Schedule now has a real month calendar with previous/next month navigation.
- Calendar marks working days, off days and scheduled jobs.
- Job IDs and scheduled job value are shown when jobs have scheduled dates.
- Selecting a date opens recurring weekday schedule controls.
- Provider availability (working day, start/end time, travel radius) persists to Supabase.
- Provider Online/Offline status persists to the provider profile.
- Products & Shop remains conditional for sellers/physical-goods providers.
- Social & Portfolio, Messages, and Analytics & Earnings tabs remain part of the hub.


## Final-dream foundation added
- Interactive Leaflet/OpenStreetMap provider map with touch/scroll zoom, live provider pins and quick cards.
- Consumer five-tab navigation restored and completed: Home, For You, Jobs, Messages, Profile.
- Consumer messaging now has a Supabase conversation/message client and can create a conversation from a booking.
- Consumer booking form now supports an optional preferred date/time using `jobs.scheduled_for`.
- Booking status model expanded toward Requested → Quote Pending → Accepted → En Route → In Progress → Completed, with cancellation/reschedule states.
- Secure `transition_job(...)` RPC and auditable `job_status_events` added.
- Production-ready data foundations added for quotes, conversations, messages, favorites, products, product orders, payments ledger, notifications and provider verification.
- Nearby-provider RPC no longer returns email.


## Phase 4 — Structured quotes & job protection foundation
- Added provider structured quote composer with amount, inclusions and 24-hour expiry.
- Added consumer quote cards with an explicit “Accept & Lock Job” action.
- Added atomic `accept_quote(...)` RPC to accept the quote, move the job to Accepted, record `quoted_amount`, close competing pending quotes, and create a held payment-ledger entry.
- Added `src/lib/quotes.ts` for quote creation, retrieval and acceptance.
- Added protected/quote-pending job status presentation.
- Live M-Pesa charging/reconciliation still requires production Daraja credentials and webhook handling.

## Phase 2 — Live local-services map
- Upgraded the consumer map to an interactive Leaflet/OpenStreetMap experience with multi-provider pins.
- Added category-specific marker colors for major SAVIS service types.
- Added animated user-location radar plus a radius boundary.
- Added selected-provider marker emphasis and synchronized quick-card selection.
- Added mobile-friendly full-screen map controls with touch/scroll zoom and recenter behavior.
- Kept radius/category/search filtering upstream so the map and list stay synchronized.
- Added safe HTML escaping for provider names/categories before they enter Leaflet tooltips.

## Phase 1 — Dynamic marketplace data
- Added `supabase/dynamic-marketplace.sql`: provider avatars, verification status, service radius and relational `provider_services`.
- Nearby-provider discovery is privacy-safe and now returns avatar/verification metadata without email.
- Added `scripts/seed-providers.mjs` to create/upsert 50 simulated Auth users, distinct profiles, service records, locations, ratings and avatars. It requires `NEXT_PUBLIC_SUPABASE_URL`, `SUPABASE_SERVICE_ROLE_KEY`, and `SAVIS_SEED_PASSWORD`.
- Added `npm run seed:providers`.
- Added `compressorjs` and `src/lib/image.ts` for client-side image compression targeting <=200 KB.
- Consumer Jobs now has an explicit `consumer_id = auth.uid()` query path rather than relying only on client-side filtering.
- Consumer provider discovery/profile cards now use database-backed avatars; provider detail loads relational services.


## Public browse + conversion hardening (October 2026)
- Public homepage no longer forces signup for search, categories, or provider discovery.
- Added logged-out provider search using `supabase/public-discovery.sql` with privacy-safe security-definer RPCs.
- Provider profiles can be viewed publicly; login is requested only when a user starts a quote/booking action.
- Added accessible viewport behavior by removing maximumScale/userScalable restrictions.
- Added 3-step How SAVIS Works section, useful sponsored CTA, footer links, and public About/Support/Terms/Privacy pages.
- Signup now asks for Kenya phone number, password confirmation, password-strength hints, and Terms/Privacy consent.
- Added explicit indexable robots policy and sitemap.
- Fallback demo providers remain only as a graceful fallback until the 50-account seed and production provider data are populated.
- Required Supabase order for this branch: `schema.sql` → `final-dream.sql` → `dynamic-marketplace.sql` → `public-discovery.sql`.


## M-Pesa/Daraja foundation — October 2026
- Added `supabase/mpesa-daraja.sql` with Daraja callback fields, idempotency indexes and a service-role-only callback RPC.
- Added server-side `src/lib/mpesa.ts` for OAuth token generation and STK Push initiation.
- Added `/api/payments/mpesa/stk` with authenticated consumer/job/amount checks before initiating an STK Push.
- Added `/api/payments/mpesa/callback` for Safaricom asynchronous results.
- Added consumer payment center at `/consumer/payments`.
- Payment ledger remains **not live** until real Daraja credentials, shortcode/passkey and a public HTTPS callback are configured.


## Developer Control Plane — October 2026
- Replaced the temporary reviewer-gated developer page with a dedicated `/dev-console-9f3k` control-plane UI.
- Added Safe / Operational / Nuclear control levels with distinct visual treatment and an always-visible exit path.
- Added server-side `developer_admins` allowlist, audited developer actions, and server-side feature flags in `supabase/developer-console.sql`.
- Business operations are intentionally separated from consumer-account administration: Providers, Shops & Sellers, Professionals and Developer-only Agents are the supported business-management areas.
- Nuclear controls are presented as a separately locked area and are not enabled by ordinary developer access alone.
- Developer-assisted sessions are the intended model for business support; business-owner passwords are never required or shared.
- Before first use, the app owner must run `supabase/developer-console.sql` in Supabase SQL Editor and add the developer's Auth UUID to `public.developer_admins`.


## Developer Assisted Sessions — October 2026
- Added secure activation for developer-assisted sessions with explicit target account, role restriction and expiry.
- Added signed, HttpOnly delegated-session cookie; no business-owner password is requested or exposed.
- Added explicit activation/exit audit events and automatic expiry handling.
- Business Control Center now activates and exits the delegated session instead of merely preparing a database record.
- This is an app-level delegated session, not a fake Supabase auth identity; destructive/nuclear controls remain separate.
