# Launch checklist: billing, payments, cron, backups

None of this can be finished until the site is deployed and has a final domain. Work through it in order.

## 1. Domain and AUTH_URL

Set these in the production environment (never commit real values):

```
AUTH_URL=https://YOUR-DOMAIN
NEXTAUTH_URL=https://YOUR-DOMAIN
DATABASE_URL=file:/ABSOLUTE/PATH/OUTSIDE/THE/DEPLOY/FOLDER/prod.db
AUTH_SECRET=<openssl rand -base64 32>
CRON_SECRET=<openssl rand -base64 32>
```

- `AUTH_URL` must be the public https address with no trailing slash. It is used for invite links, emailed quote and invoice links, and gateway return URLs. The app refuses to create client invites in production while it points at localhost.
- Keep the SQLite file outside the folder that gets replaced on each deploy, or a deploy can wipe your invoices. After each deploy run `npx prisma migrate deploy` against the production `DATABASE_URL`.
- Next.js bakes some variables in at build time, so rebuild after changing them.

## 2. Daily cron (recurring invoices)

Call once a day, early morning. It is safe to call more often.

```
curl -fsS -H "Authorization: Bearer $CRON_SECRET" https://YOUR-DOMAIN/api/cron/recurring-invoices
```

Also call `/api/cron/invoice-reminders` daily (overdue reminders at 3 and 14 days; switch off in Billing settings), and schedule `/api/cron/digest` (weekly) and `/api/cron/monthly-report` (monthly) if you use them. For emailed billing summaries of the previous period, schedule `/api/cron/billing-report?period=daily` (every morning), `?period=weekly` (Monday) and/or `?period=monthly` (1st); add `&dry=1` to preview the JSON without emailing. Use the host's cron screen, a server crontab, or an external scheduler such as cron-job.org. Check the JSON reply the first time: `{"due":1,"created":1,"sent":0}`.

## 3. Backups

```
npm run db:backup
```

Writes a consistent, integrity-checked copy to `./backups` (override with `BACKUP_DIR`, keep count with `BACKUP_KEEP`, default 14). Schedule it daily, then copy the folder off the server, for example to cloud storage. A backup on the same disk does not survive losing the disk. Do one restore test: copy a backup over a scratch database and open it.

## 4. Gateway test mode

Everything is configured in the admin: sign in as an admin, open **Payments**. Business name, tax ID, payment instructions and defaults live under **Billing, Settings**. Keys are encrypted before storage and never shown again. If you change `AUTH_SECRET` later, saved keys become unreadable and must be re-entered.

Create accounts, stay in test mode, and only switch to live keys after step f.

a. **Paystack**: dashboard, Settings, API Keys & Webhooks. Paste the *test* secret key into Payments, press Save, then Test connection. Copy the webhook URL shown on the page into the Paystack test webhook setting.

b. **Stripe**: Developers, API keys. Paste the *test* secret key, Save. Add a webhook endpoint with the URL shown on the page and the event `checkout.session.completed`, then paste its signing secret (`whsec_...`) into Payments and Save. Test connection.

c. **Local testing before deploy**: expose your machine with a tunnel (cloudflared or ngrok) and use that address as `AUTH_URL`; the Payments page shows a warning while it is still localhost. For Stripe you can instead run `stripe listen --forward-to localhost:3000/api/webhooks/stripe`, which prints a `whsec_` secret to paste in.

d. **Run the flow**: add a client, create an invoice in GHS (Paystack) or USD (either), email it, open the link, pay with a gateway test card or mobile money test number. Confirm: the invoice turns Paid, one payment row appears, the client gets a receipt email. Resend the webhook from the gateway dashboard and confirm no second payment appears.

e. **Refunds**: refund the test payment from the gateway dashboard. Within a minute a negative "Refund" row should appear on the invoice and it should reopen. This is the one thing to verify in test mode: Paystack's refund webhook is handled from its documented fields (`transaction_reference`, `amount`), so confirm the amount and row are right. If a refund does not appear, record it by hand with "Record a refund" on the invoice.

f. **Go live**: replace the keys with live ones in Payments, update the Stripe signing secret, make one small real payment, refund it from the gateway dashboard, and check the refund row appears.

Paystack covers GHS, NGN and USD. Stripe covers USD, EUR and GBP. Stripe does not process GHS.
