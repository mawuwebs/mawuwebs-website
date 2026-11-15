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

### Scheduling with GitHub Actions

`.github/workflows/cron.yml` calls every endpoint for you, so no host cron is needed. Add repository secrets `APP_URL` (https address, no trailing slash) and `CRON_SECRET` (same value as on the server). Schedule (UTC):

| When | Endpoints |
| --- | --- |
| every 15 min | `uptime` (alerts you when a monitored client site goes down or recovers) |
| daily 07:00 | `recurring-invoices`, `recurring-expenses` (records hosting/domain/subscription costs on their due date, or emails a reminder), `invoice-reminders`, `quote-followups` (one nudge after 5 days), `asset-renewals` (client notices at 30 and 7 days and on expiry), `task-reminders` (one email per staff member for overdue tasks), `billing-report?period=daily` |
| Monday 08:00 | `digest`, `staff-digest` (each person's week; admins also see late projects and client requests), `project-updates` (clients get a progress email when tasks marked "show to client" finished that week), `billing-report?period=weekly` |
| 1st, 07:00 | `monthly-report`, `billing-report?period=monthly` |

Run any group by hand from the Actions tab (Scheduled jobs, Run workflow). GitHub can delay schedules a few minutes and pauses them after 60 days with no repository activity. To monitor a client site or send renewal notices, add the item under Client, Equipment and services with a website address and/or an expiry date.

## 3. Backups

```
npm run db:backup
```

Writes a consistent, integrity-checked copy to `./backups` (override with `BACKUP_DIR`, keep count with `BACKUP_KEEP`, default 14). Schedule it daily, then copy the folder off the server, for example to cloud storage. A backup on the same disk does not survive losing the disk. Example crontab (daily at 02:30, then copy off the box; replace the path and the rclone remote with yours):

```
30 2 * * * cd /path/to/mawuwebs && npm run db:backup >> backups/backup.log 2>&1 && rclone copy backups remote:mawuwebs-backups --max-age 2d
```

Simpler: set `BACKUP_COPY_CMD` (shell command, backup path in `$BACKUP_FILE`) and `db:backup` ships each backup off the box itself and exits non-zero if the copy fails. Also back up the uploads folder (`UPLOAD_DIR`, default `public/uploads`) and `RECEIPT_DIR`.

Do one restore test: copy a backup over a scratch database and open it.

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


## Invoice reminders and PDFs

- `/api/cron/invoice-reminders` (daily) now sends three emails per unpaid invoice: once when the due date is within 3 days, again 3 days after it is overdue, and a final one at 14 days. The "due soon" note is sent once (`preDueReminderAt`). Switch all reminders off in Billing settings.
- Invoice emails carry a PDF copy. If PDF rendering fails the email still goes out with the link.
- Clients who pay by mobile money or bank transfer can press "I have paid" on the invoice page. You get an email and a History entry; nothing is marked paid until you record the payment.

## 5. Tests and CI

- `npm run typecheck`, `npm run lint`, `npm test` (unit), then `npm run build && npm run test:e2e` (browser tests of the whole billing flow against a throwaway database). GitHub Actions runs all of these on every push and pull request (`.github/workflows/ci.yml`).
- The e2e run starts a small test mail server (`e2e/smtp-sink.ts`) and the app sends real SMTP to it, so the tests assert on the emails themselves (recipient, subject, links, sent once).
- `SHOTS_DIR=/some/folder npx playwright test` also runs `e2e/zz-visual.spec.ts`: screenshots of the main pages at desktop and phone width, plus an automated overflow and WCAG A/AA (axe) check. Run it after changing the UI.
- First local e2e run needs a browser: `npx playwright install chromium` (or set `E2E_CHROME` to an installed Chromium).
- On the server, a deploy must run `npm ci` (its `postinstall` generates the Prisma client) and `npm run db:deploy` (applies migrations) before `npm run build`.

## Expenses

- Admin > Billing > Expenses. Receipts are private files, stored in `./data/receipts` (git-ignored) and served only to signed-in staff with billing access. Set `RECEIPT_DIR` to a persistent volume in production, and include that folder in your off-server backups next to the database.
- Paystack fees are booked automatically as "Bank and gateway fees" when a card/MoMo payment arrives (from the `fees` field of the webhook). Stripe fees are not booked automatically: enter them by hand.
- Expenses marked "Bill this cost to the client" with a project can be pulled into that project's draft invoice with one click.

## Client work (projects, tasks, time)

- Admin > Client work. A project is created from a client's page, or automatically when a client accepts a quote. Open its workspace to add milestones and tasks (or apply a template under Client work > Templates), log time, set the hourly rate, hours budget and fixed price, and message the client.
- Milestones that need approval email the client when you mark them complete. The client approves in the portal; if the milestone has an amount, a **draft** invoice is created for you to review and send. Nothing is invoiced without you.
- "Draft invoice from unbilled time" bills logged hours at the project's hourly rate. Deleting the draft, or voiding the sent invoice, frees the hours to be billed again.
- A project cannot be deleted while it has unbilled hours.
- Clients see only tasks and files you mark visible, and never internal notes. They can message you and ask for work from the project page in the portal; requests land on the board as unassigned tasks.
- The weekly progress email has an unsubscribe link (per client). It needs `AUTH_SECRET`, which signs the link, so changing `AUTH_SECRET` invalidates old links.
- Calendar: Client work > Calendar shows tasks, milestones, project deadlines and renewals. "Create calendar link" gives a private `.ics` link for Google or Apple Calendar; anyone with the link can see your assigned tasks, so make a new one if it leaks.
- Scheduled jobs for this module (see section 2): `task-reminders` daily, `staff-digest` and `project-updates` weekly.

## Before applying migrations in production

Take a backup first (`npm run db:backup`, then copy it off the server). The project-management migration copies the old text milestones into real rows; it only adds data and never deletes any, but a backup is the rule for every migration. Run `npm run db:deploy` before starting the new build.
