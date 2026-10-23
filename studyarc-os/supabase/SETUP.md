# Supabase Setup

## Accounts and study data

1. Create a Supabase project and run `supabase/schema.sql` in the SQL Editor. The migration also creates the private avatar bucket and enforces the four-per-day free schedule limit.
2. Enable Google OAuth and email/password auth in Supabase Auth; configure provider callbacks with Google Cloud and the app URL.
3. Set the Supabase project URL and public anon key in `js/config.js`. Never put a service-role key in browser code.
4. Serve the app over localhost or HTTPS. Add the app URL to Supabase's allowed redirect URLs.
5. Sign in with the confirmed Google account `alt.s151102@gmail.com`. The schema trigger and backfill provision this account as the permanent owner with lifetime Pro access.

The database restricts each student's state and avatar files to their authenticated user ID. Passwords are handled by Supabase Auth. Pro status is evaluated by a database function; paid entitlements must be provisioned by trusted server code.

## Friend Pro access

Deploy `supabase/functions/manage-pro-allowlist/index.ts`. Set the same `SUPABASE_URL` and `SUPABASE_SERVICE_ROLE_KEY` Edge Function secrets used by the payment-change function. Only a user in `owner_accounts` can grant or revoke a friend's Pro access. The owner UI has no query path to student state or marks.

The student-facing free-tier limit is also enforced by a database trigger, not just by JavaScript. Run the complete schema before enabling account sign-in.

The schema creates a private `student-avatars` bucket with per-user object policies. The owner should never make the bucket public.

## Payment-change notification

Deploy `supabase/functions/request-payment-change/index.ts`. Configure these Edge Function secrets:

- `SUPABASE_URL`
- `SUPABASE_SERVICE_ROLE_KEY`
- `RESEND_API_KEY`
- `PAYMENT_CHANGE_FROM_EMAIL` using a verified sender domain

Only a user present in `owner_accounts` can submit a change request. The function emails `alt.s151102@gmail.com`; it does not change the beneficiary. `payment_settings` is locked to `8799340567@fam` by database permissions and a check constraint.

## Checkout

Checkout is intentionally disabled. Before enabling it, implement a server endpoint with the selected payment gateway that validates the signed-in user, derives price and plan server-side, and uses only `8799340567@fam` as the beneficiary. Verify signed provider webhooks before changing `pro_entitlements`. Never trust a browser redirect as proof of payment. UPI AutoPay also requires the payer's explicit mandate authorization; it must not charge without consent.

Only after that endpoint is deployed should `PAYMENT_CHECKOUT_ENDPOINT` be set to its HTTPS URL in `js/config.js`.

## Focus-blocking limits

The browser app can enforce its own timer and record completed focus blocks only. It cannot inspect device-wide app time, block other apps/sites, filter Reels/Shorts or adult content, or suppress operating-system notifications. Those features require a separately installed native app, browser extension, or device management permission.

The profile stores real name, optional username, study stage, goal, focus gap, selected theme, and a private avatar path. Sign-in passwords are handled only by Supabase Auth. The Terms text in the app is a starter policy and should be reviewed for the actual organization, jurisdiction, retention period, and support contact before public launch.