# SAVIS

**SAVIS** is a Kenya-focused marketplace connecting consumers with trusted local service providers, professionals, sellers and agents.

Production Alpha: https://savis-alpha.vercel.app/  
Repository: https://github.com/yungfillyke/savis

## Product promise

SAVIS is designed around one rule: **consumers should discover real local providers, understand what they offer, communicate safely, receive a structured quote, and get job/payment protection.**

Providers can build a profile and manage jobs, schedules, services, products, portfolio content, messages and earnings. A provider is **not allowed to put themselves in front of consumers until KYC verification is approved**.

---

# 1. Roles

SAVIS supports:

- **Consumer** — discovers providers, requests services, receives quotes, accepts protected jobs, communicates and tracks work.
- **Provider** — offers local services and manages availability, jobs, quotes and earnings.
- **Professional** — a provider with professional/trade credentials and the same KYC gate.
- **Seller** — can publish products through the marketplace.
- **Agent** — future marketplace/commission role.

---

# 2. Consumer experience

The consumer product is organized around five stages:

1. **Home**
   - Search
   - Location and radius
   - Categories
   - Nearby verified providers
   - Interactive local-services map
   - Provider quick cards

2. **For You**
   - Product/discovery feed foundation
   - Saved/liked discovery direction
   - Future short-video/social discovery

3. **Jobs**
   - Requested
   - Quote Pending
   - Accepted / Protected
   - En Route
   - In Progress
   - Completed
   - Cancelled / Rescheduled

4. **Messages & Payments**
   - Conversations
   - Job communication
   - Structured quotes
   - Payment/escrow ledger foundation
   - Notifications foundation

5. **Profile & Security**
   - Account
   - Settings
   - Favorites
   - Security
   - Tutorial/onboarding foundation

---

# 3. Provider experience

The Provider Hub includes:

- Jobs & Schedule
- Products & Shop
- Social & Portfolio
- Messages
- Analytics & Earnings
- Availability
- Online/offline status
- Structured quote creation
- Provider profile/services

## Mandatory provider go-live rule

A provider may create and work on their profile before verification, but **they cannot put themselves out to consumers until KYC is approved**.

The Provider Hub displays:

> **Ready to provide a service?**  
> Complete KYC before you go live.

The provider is sent to:

**Provider Hub → Start KYC → KYC submission → SAVIS review → Verified → provider becomes eligible for consumer discovery**

Until verification is approved:

- The provider cannot switch themselves Online.
- The provider is excluded from nearby consumer discovery.
- The provider is excluded from public provider search.
- The provider public profile is not exposed through the public provider RPC.
- Active provider services are not exposed publicly.

This gate is enforced in both the UI **and database discovery functions**.

---

# 4. KYC / provider verification

Provider verification uses:

- National ID or passport — front
- National ID or passport — back
- Live selfie
- Professional certificate where relevant
- Explicit verification consent

KYC documents are stored in the private Supabase Storage bucket:

`kyc-documents`

Files are stored under the authenticated provider's user ID and are not public.

Provider verification states:

- `not_started`
- `submitted`
- `under_review`
- `verified`
- `rejected`

Marketplace profile verification states:

- `unverified`
- `pending`
- `verified`
- `rejected`

The KYC submission RPC updates the provider to `pending`. A future admin/reviewer workflow changes the record to `verified` only after human review.

### Important

The current Alpha does **not** pretend that automated identity verification has happened. KYC is a real document-submission workflow, while the final reviewer/admin approval process remains a product milestone.

---

# 5. Job lifecycle

The production data model supports:

`requested → quote_pending → accepted → en_route → in_progress → completed`

Additional states:

- declined
- cancelled
- rescheduled

Every important transition can be recorded in `job_status_events`.

The `transition_job(...)` security-definer RPC validates allowed transitions and records an audit event.

---

# 6. Structured quotes

Providers can send a structured quote containing:

- Amount
- Message/inclusions
- Expiry

Consumers see:

**Accept & Lock Job**

The `accept_quote(...)` RPC:

1. Checks that the consumer owns the job.
2. Checks that the quote is still pending.
3. Checks quote expiry.
4. Accepts the selected quote.
5. Declines competing pending quotes.
6. Moves the job to `accepted`.
7. Stores the quoted amount.
8. Creates a protected/held payment-ledger record.
9. Records the acceptance in the job timeline.

The current ledger is the foundation for production escrow. It is **not yet a live M-Pesa charge**.

---

# 7. Maps and discovery

The Alpha uses:

- Leaflet
- OpenStreetMap
- Multi-provider markers
- Category-aware markers
- User-location radar
- Radius boundary
- Selected-provider highlighting
- Provider quick cards
- Touch/scroll zoom
- Search/category/radius synchronization

Provider discovery uses geographic distance calculations and is privacy-safe.

Only **verified providers** are eligible for consumer-facing discovery.

---

# 8. Marketplace foundation

Products support:

- Seller ownership
- Title
- Description
- Category
- Price
- Currency
- Stock
- Image
- Draft/published/paused/sold-out state

Orders and order items have relational tables and participant RLS policies.

Client-side image compression is provided by `compressorjs` with a target of approximately 200 KB.

Marketplace publishing/moderation still needs final production hardening.

---

# 9. Messaging

The backend supports:

- Conversations
- Consumer/provider participants
- Job-linked conversations
- Messages
- Read state
- Attachment URL foundation

The next production stage is real-time messaging, attachment moderation and cleanup.

---

# 10. Payments

The backend contains:

- Payment records
- Job/order linkage
- Payer/payee
- Amount
- Platform fee
- Payment method
- Checkout request ID
- Provider reference
- Pending/authorized/held/released/refunded/failed/cancelled states

Current quote acceptance creates a **held ledger record** for protection.

### M-Pesa is not yet live

Production M-Pesa requires:

- Safaricom Daraja credentials
- Server-side secrets
- STK Push initiation
- Callback endpoint
- Callback signature/security handling
- Transaction reconciliation
- Idempotency
- Refund handling
- Escrow release rules

Do not describe the current Alpha ledger as a completed M-Pesa integration.

---

# 11. Supabase database setup

Run migrations in this order from the repository's `supabase/` directory:

1. `schema.sql`
2. `final-dream.sql`
3. `dynamic-marketplace.sql`
4. `public-discovery.sql`
5. `provider-kyc.sql`

Use:

**Supabase → Project → SQL Editor → New query → paste migration → Run**

The `final-dream.sql` migration contains the corrected `transition_job()` dollar-quote syntax.

The `provider-kyc.sql` migration adds:

- Private KYC Storage bucket
- KYC Storage RLS
- KYC submission RPC
- Verified-only provider discovery
- Verified-only public provider search
- Verified-only public provider profile
- Verified-only provider services

### If a migration has already been run

Do not blindly rebuild the database. Check the exact migration and apply the missing/fixed migration only.

---

# 12. Environment variables

Create `.env.local` in the repository root:

```env
NEXT_PUBLIC_SUPABASE_URL=your-project-url
NEXT_PUBLIC_SUPABASE_ANON_KEY=your-anon-key
```

For the provider seed script, server-only variables are required:

```env
SUPABASE_SERVICE_ROLE_KEY=your-service-role-key
SAVIS_SEED_PASSWORD=your-test-password
```

**Never expose `SUPABASE_SERVICE_ROLE_KEY` to the browser or commit it to Git.**

---

# 13. Provider test data

A seed script exists:

```bash
npm run seed:providers
```

It can create/upsert 50 simulated provider accounts with:

- Kenyan names
- Roles
- Categories
- Coordinates
- Avatars
- Service records
- Ratings

The seed requires the server-only Supabase service-role key and a test password.

The existence of the script does **not** mean the 50 accounts have already been created.

For a realistic production-like test, seed accounts should only be considered consumer-visible after their verification state is intentionally set to an approved test state.

---

# 14. Local development

Install dependencies:

```bash
npm install
```

Run the development server:

```bash
npm run dev
```

Build:

```bash
npm run build
```

Lint:

```bash
npm run lint
```

Provider seed:

```bash
npm run seed:providers
```

---

# 15. Deployment

SAVIS deploys through Vercel from the GitHub `main` branch.

Production project:

- Project: `savis`
- Production URL: https://savis-alpha.vercel.app/

### Critical Vercel setting

The repository root is the application root.

**Do not set Vercel Root Directory to the old nested `savis/` directory.**

The nested `savis/` folder is historical and must not be used as the production source.

---

# 16. Security principles

SAVIS follows these principles:

- Consumer job data is participant-scoped.
- Provider/customer conversations are participant-scoped.
- Quotes are participant-scoped.
- Payment records are participant-scoped.
- KYC documents are private.
- KYC files are stored under the provider's authenticated user ID.
- Provider discovery excludes unverified providers.
- Public provider RPCs exclude unverified providers.
- Provider verification is separate from ordinary profile completion.
- Service-provider availability cannot bypass KYC.
- Security-sensitive state transitions use database functions where appropriate.

---

# 17. Current Alpha limitations

The following are still incomplete:

- Human/admin KYC review dashboard
- Automated identity verification
- Live M-Pesa Daraja integration
- Payment reconciliation/webhooks
- Full production escrow release/refund automation
- Real-time messaging
- Provider live-location tracking
- Turn-by-turn routing
- Marketplace media moderation
- Product publishing hardening
- Agent commission settlement
- Full production test suite
- Complete production security audit
- Final onboarding/tutorial system

---

# 18. Development history

Major completed milestones include:

- Consumer Home and account foundation
- Settings and profile foundation
- Browser location foundation
- Provider discovery RPC
- Provider Hub
- Provider calendar and persistent availability
- Consumer five-tab funnel
- Public browse/search conversion
- Leaflet live local-services map
- Dynamic provider/service data foundation
- 50-provider seed tooling
- Image compression
- Structured quotes
- Quote acceptance/protected job foundation
- Job lifecycle/status events
- Messaging backend foundation
- Payments ledger foundation
- Provider verification/KYC gate

The latest KYC milestone makes verification a **true marketplace gate**, rather than a cosmetic badge.

---

# 19. Product roadmap

### Phase 1 — Dynamic marketplace
- Relational providers/services/products
- 50-account test tier
- Image compression

### Phase 2 — Live local-services map
- Multi-provider map
- Radius filtering
- Category markers
- Radar/location UI
- Quick cards

### Phase 3 — Consumer funnel
- Home
- For You
- Jobs
- Messages & Payments
- Profile & Security

### Phase 4 — Protected jobs
- Structured quotes
- Accept & Lock Job
- Payment protection
- Job lifecycle
- Status timeline

### Phase 5 — Trust & safety
- Mandatory provider KYC
- Admin review
- Verification badge
- Document security
- Moderation
- Reporting

### Phase 6 — Real payments
- Daraja STK Push
- Webhooks
- Reconciliation
- Escrow release
- Refunds

### Phase 7 — Marketplace scale
- Products
- Media
- Social/portfolio
- Recommendations
- Ads
- Agent commissions

---

# 20. Source of truth

When continuing development:

1. Use the current GitHub `main` branch.
2. Use the current Supabase schema/migrations.
3. Use the live Alpha for visual QA.
4. Do not rebuild SAVIS from the old uploaded `index.html`.
5. Do not edit the historical nested `savis/` project.
6. Record significant milestones in `SAVIS_PROGRESS.md`.

SAVIS is being built incrementally so each milestone remains deployable and recoverable.
