# SAVIS

SAVIS is a Kenya-focused marketplace connecting consumers with trusted local helpers, providers, professionals, sellers and developer-managed agents.

## Current source of truth

- GitHub: `yungfillyke/savis`
- Production project: Vercel `savis`
- App root: repository root. Do not point Vercel at the historical nested `savis/` folder.
- Current work is developed from `main`.
- The old uploaded `index.html` is historical only.

## Product roles

- Consumer
- Provider
- Professional
- Seller
- Agent

Consumers discover services, providers and products, request jobs, receive structured quotes, accept protected jobs, message providers and reach the payment center.

Providers use the Provider Hub for jobs, schedule/availability, shop, portfolio/social, messages and earnings.

Professionals and sellers share the business-management foundation but can receive role-specific dashboard modules.

Agents are separate from consumers and are managed by the Developer Control Plane.

## Consumer experience

The consumer shell has five funnel stages:

1. Home
2. For You
3. Jobs
4. Messages & Payments
5. Profile & Security

The header provides the SAVIS identity, map toggle, help, location/radius controls and account menu.

Location is opt-in. SAVIS does not request browser geolocation immediately; the consumer can explicitly ask for nearest recommendations.

The Alpha map uses Leaflet/OpenStreetMap with provider pins, category markers, user radar, radius boundary and synchronized provider quick cards.

## Trust and provider verification

Provider verification is a marketplace gate.

Required KYC:
- ID/passport front
- ID/passport back
- selfie
- consent
- optional professional certificate

KYC files are private in Supabase Storage. Provider-scoped Storage RLS protects documents.

A provider cannot become consumer-visible/Online unless the provider is verified. Human review is available at:

`/admin/provider-review`

Reviewer access is allowlisted by `provider_reviewers`.

## Jobs, quotes and protection

Jobs use an auditable lifecycle and database transition function.

Providers can create structured quotes with:
- amount
- inclusions
- expiry

Consumers receive a quote card and can select **Accept & Lock Job**.

Quote acceptance atomically moves the job to Accepted, closes competing pending quotes and creates the protected payment-ledger entry.

## Messaging

Conversations and messages have participant-scoped access and Supabase Realtime subscriptions.

The app includes safe onboarding and quick-start guidance.

## Payments

The payment center is prepared for M-Pesa/Daraja:

- authenticated STK Push initiation
- asynchronous callback endpoint
- callback ledger reconciliation foundation
- payment status history
- large M-PESA branded consumer payment UI

Live Safaricom credentials are intentionally not configured yet.

Cash and bank-card/Visa support are future payment methods.

## Marketplace

The marketplace foundation supports providers, products, orders, sponsored content and recommendations.

Image uploads can be compressed client-side to a target of 200 KB or less.

A seed script can create 50 simulated provider accounts. Running the script is separate from having the script in the repository.

## Developer Control Plane

Developer tools live at:

`/dev-console-9f3k`

The control plane has three levels:

### SAFE
- system health
- analytics counts
- provider review navigation
- search/location diagnostics
- feature flags
- audit log

### OPERATIONAL
- Business Control Center
- assisted sessions
- Agent Management
- marketplace operations
- bookings/payments operations
- messaging operations

### NUCLEAR / EMERGENCY
Emergency controls require:
- authenticated developer session
- server-only 12-digit developer credential
- typed confirmation
- audited server-side action

The web console currently exposes reversible emergency controls for maintenance, signup and payment entry points. Irreversible data destruction is intentionally not exposed from ordinary developer access.

### First developer bootstrap

The console is allowlist protected. The first owner/developer account can be provisioned without sharing credentials with ChatGPT:

1. In Vercel project settings, add server-only environment variable `SAVIS_DEVELOPER_EMAIL` containing the exact owner/developer login email.
2. Keep `SUPABASE_SERVICE_ROLE_KEY` server-only.
3. Log into SAVIS with that exact email.
4. Open `/dev-console-9f3k`.
5. Use **Provision this developer account** once.
6. Refresh. The account is inserted into `public.developer_admins`.
7. First-run bootstrap closes once any developer admin exists.

Do not put the 12-digit emergency credential in source control or chat. Store it as server-only `SAVIS_NUCLEAR_CODE` in Vercel.

If the server bootstrap variables are not available, the SQL fallback is:

```sql
insert into public.developer_admins (user_id)
values ('YOUR-SUPABASE-USER-UUID')
on conflict (user_id) do nothing;
```

### Business Control Center

Business management intentionally excludes consumer accounts.

Supported:
- providers
- sellers
- professionals

Developer-assisted sessions are time-boxed and audited. They do not request or expose business-owner passwords and are implemented as app-level delegated sessions rather than fake Supabase `auth.uid()` identities.

### Agent Management

Agents are developer-only. The Developer Control Plane can list developer-managed agents and enable/disable them.

## Database migrations

Run from Supabase SQL Editor → New query in this order when setting up a new database:

1. `supabase/schema.sql`
2. `supabase/final-dream.sql`
3. `supabase/dynamic-marketplace.sql`
4. `supabase/public-discovery.sql`
5. `supabase/provider-kyc.sql`
6. `supabase/provider-review.sql`
7. `supabase/realtime-messaging.sql`
8. `supabase/mpesa-daraja.sql`
9. `supabase/developer-console.sql`
10. `supabase/developer-security.sql`
11. `supabase/business-control.sql`
12. `supabase/developer-agents.sql`
13. `supabase/operational-control.sql`
14. `supabase/assisted-session.sql`

The migrations are written to be re-runnable where practical. Some earlier migrations may have already been applied in the Alpha database.

## Environment variables

Browser-safe:

```env
NEXT_PUBLIC_SUPABASE_URL=...
NEXT_PUBLIC_SUPABASE_ANON_KEY=...
```

Server-only:

```env
SUPABASE_SERVICE_ROLE_KEY=...
SAVIS_DEVELOPER_EMAIL=...
SAVIS_NUCLEAR_CODE=...
```

Daraja variables are required only when live M-Pesa is intentionally activated.

Never expose a service-role key or developer emergency credential to the browser, Git, logs or chat.

## Provider seed

```bash
npm install
npm run seed:providers
```

Required server-only variables:

```env
SUPABASE_SERVICE_ROLE_KEY=...
SAVIS_SEED_PASSWORD=...
NEXT_PUBLIC_SUPABASE_URL=...
```

The seed creates simulated accounts; it does not by itself make them trusted/verified.

## Google and Apple login

The code supports Google and Apple OAuth callback handling.

They are not considered operational until the providers are configured in Supabase Auth and their provider consoles with the production callback URL.

## Deployment

Vercel deploys the repository root from `main`.

Critical setting:
- Root Directory must remain the repository root.

After a merge:
1. confirm the new main commit
2. confirm the corresponding Vercel production deployment
3. wait for READY
4. check build logs
5. smoke-test the affected route

Do not call a deployment live/READY until its deployment state has been verified.

## Security model

- RLS is enabled on sensitive tables.
- Security-definer RPCs enforce developer authorization for developer tools.
- Consumer accounts are excluded from the Business Control Center.
- KYC documents are private.
- Provider discovery is verification-gated.
- Developer actions are audited.
- Assisted sessions are target-scoped and time-boxed.
- Owner passwords are never requested for developer assistance.
- Nuclear/emergency controls require a second server-side credential and typed confirmation.
- Irreversible destructive actions are deliberately isolated from ordinary developer workflows.

## Current limitations

- Live Safaricom production activation is not configured.
- Full production escrow release/refund automation remains to be hardened.
- Provider live-location tracking and turn-by-turn routing are future work.
- Marketplace media moderation/publishing hardening remains.
- Agent commission settlement remains.
- Full automated E2E/security test suite remains.
- Emergency session invalidation is represented in developer security state but should be integrated with every authenticated application surface before being treated as a complete global logout mechanism.
- Google/Apple OAuth still needs external provider configuration.

## Refinement order after Developer Control Plane

The next product pass should be page-by-page only after developer tooling is operational:

1. Consumer Home
2. For You
3. Jobs
4. Messages & Payments
5. Profile & Security
6. Provider Hub
7. Provider verification/review
8. Seller/shop surfaces
9. Professional surfaces
10. Agent surfaces
11. Public browse/search/provider profiles
12. Checkout/payment UX
13. Final mobile/accessibility/polish pass

## Source-of-truth rules

- Use GitHub `main`.
- Use current Supabase migrations.
- Use current Vercel production for visual QA.
- Never rebuild from the old uploaded HTML.
- Never edit the historical nested `savis/` directory.
- Record significant milestones in `SAVIS_PROGRESS.md`.
