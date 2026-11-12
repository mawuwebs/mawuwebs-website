# Mawuwebs Solutions

A modern, production-ready business website with a full custom CMS and admin dashboard — built with Next.js, TypeScript, Tailwind CSS, Prisma, and NextAuth.

## Stack

- **Framework:** Next.js 16 (App Router, Turbopack, Server Actions)
- **Language:** TypeScript
- **Styling:** Tailwind CSS v4 + shadcn/ui (Base UI primitives)
- **Database:** Prisma ORM + SQLite (swap the datasource for Postgres/MySQL in production)
- **Auth:** Auth.js (NextAuth v5) with credentials login, JWT sessions, role-based access (Admin/Editor)
- **Rich text:** Tiptap
- **Media:** Local file uploads to `/public/uploads` (swap in Cloudinary/S3 by changing `src/lib/actions/media.ts`)

## Getting started

```bash
npm install
cp .env.example .env        # then set AUTH_SECRET (openssl rand -base64 32)
npm run db:migrate           # creates the SQLite database + tables
npm run db:seed              # seeds demo content and admin/editor accounts
npm run dev
```

Visit:
- **Public site:** http://localhost:3000
- **Admin dashboard:** http://localhost:3000/admin/login

### Demo accounts (from the seed script)

| Role   | Email                    | Password    |
| ------ | ------------------------ | ----------- |
| Admin  | admin@mawuwebs.com       | printed by `npm run db:seed` (or set `SEED_ADMIN_PASSWORD`) |
| Editor | editor@mawuwebs.com      | printed by `npm run db:seed` (or set `SEED_EDITOR_PASSWORD`) |

Change these in production — either edit them from **Admin → Users**, or update `prisma/seed.ts` before re-seeding.

## Project structure

```
prisma/
  schema.prisma          # data models
  seed.ts                # demo content seed script
src/
  app/
    (site)/               # public website (route group, has its own layout)
    admin/
      (auth)/login/       # admin login (no sidebar)
      (dashboard)/        # protected admin CMS (sidebar shell)
    api/auth/[...nextauth]/route.ts
    sitemap.ts, robots.ts
  components/
    site/                 # public site UI (navbar, footer, hero, cards, etc.)
    admin/                # admin UI (forms, tables, sidebar, uploaders)
    ui/                   # shadcn/ui primitives
  lib/
    actions/              # server actions (CRUD, auth, uploads) — the "API layer"
    prisma.ts             # Prisma client (better-sqlite3 driver adapter)
    auth.ts / auth.config.ts
    content.ts            # public data-fetching helpers (published-only)
    settings.ts           # site settings + social links helpers
  proxy.ts                # route protection for /admin/* (Next 16's proxy/middleware)
```

## CMS content model

The admin dashboard (`/admin`) provides full CRUD, with draft/published status, for:

- **Pages** — flexible rich-text pages (About, Privacy Policy, Terms of Service, or any custom page)
- **Services** — with icon, featured flag, ordering, SEO fields
- **Projects** — portfolio items with category, tags, gallery, client info
- **Blog Posts** — with category, tags, author, featured-article flag
- **Testimonials** — client quotes with rating
- **FAQs** — grouped by category
- **Categories & Tags** — shared taxonomy for posts and projects
- **Media Library** — all uploaded images in one place
- **Messages** — contact form submissions (new/read/responded)
- **Newsletter** — subscriber list
- **Site Settings** — brand, hero content, homepage metrics, contact info, social links
- **Users** — admin-only user management (Admin/Editor roles)
- **Activity Log** — audit trail of content changes

Draft content never appears on the public site — all public queries (`src/lib/content.ts`) filter `status: "PUBLISHED"`.

## Scripts

| Command             | Description                                  |
| -------------------- | --------------------------------------------- |
| `npm run dev`        | Start the dev server                          |
| `npm run build`      | Production build                              |
| `npm run start`      | Start the production server                   |
| `npm run lint`       | Run ESLint                                    |
| `npm run db:migrate` | Run Prisma migrations                         |
| `npm run db:seed`    | Seed the database with demo content           |
| `npm run db:studio`  | Open Prisma Studio (visual DB browser)        |
| `npm run db:generate`| Regenerate the Prisma client after schema changes |

## Going live checklist

1. **Environment** (see `.env.example`): `DATABASE_URL`, `AUTH_SECRET` (`openssl rand -base64 32`), `AUTH_URL` and `NEXTAUTH_URL` (your https domain), SMTP settings, `NOTIFY_EMAIL`, optional `NEXT_PUBLIC_PLAUSIBLE_DOMAIN`, `CRON_SECRET`.
2. **Change the demo admin passwords**: `npm run admin:password -- admin@mawuwebs.com 'a-long-new-password'`. Do the same for the editor, or delete that user in Admin > Users.
3. **Replace demo content** in the admin: address, phone, WhatsApp number, service area, support promise, hero stats, testimonials, projects, blog posts, and the privacy / terms pages (have them reviewed).
4. **Database**: SQLite (`dev.db`) is for development. On a host without a persistent disk, move to PostgreSQL/MySQL: change the datasource in `prisma/schema.prisma`, the adapter in `src/lib/prisma.ts`, then `npx prisma migrate deploy`.
5. **Uploads** go to `public/uploads`. Make sure that folder persists across deploys, or move uploads to object storage.
6. **Build and run**: `npm run build && npm start` (Node 20+). After changing `prisma/schema.prisma` run `npx prisma generate` and restart the server, otherwise it keeps the old client.
7. **Weekly digest**: have a scheduler call `GET /api/cron/digest` with header `Authorization: Bearer $CRON_SECRET`.
8. **Search and sharing**: submit `/sitemap.xml` to Google Search Console and create a Google Business Profile.

## Tests

`npm test` runs the unit tests in `tests/` (estimator scoring, enquiry parsing, table of contents, etc.).

## Notes on the stack

- **Database:** SQLite is used for zero-config local development. For production, change the `provider` in `prisma/schema.prisma` to `postgresql` (or `mysql`), swap `@prisma/adapter-better-sqlite3` for the matching driver adapter (e.g. `@prisma/adapter-pg`) in `src/lib/prisma.ts`, and update `DATABASE_URL`.
- **Auth:** Sessions are JWT-based (no DB session table needed). Route protection for `/admin/*` happens in `src/proxy.ts` (Next.js 16 renamed `middleware.ts` to `proxy.ts`).
- **Image uploads:** Stored locally under `public/uploads` and referenced by URL in the database. For multi-instance/production deployments, point `src/lib/actions/media.ts` at an object storage provider instead.
- **Seed images:** Demo content photos live under `public/images/seed/` and are referenced by local path in `prisma/seed.ts`. They're bundled as static assets rather than hotlinked to a stock-photo API, since third-party "random by keyword" image services don't reliably return the same photo for the same URL over time.
- **Brand theme:** Colors live in `src/app/globals.css` as CSS variables (`--brand-forest`, `--brand-orange`, `--brand-yellow`), mapped into Tailwind via `@theme inline`. Both light and dark themes are defined; dark mode is togglable site-wide (`next-themes`).

## Admin notes

- **Deploying schema changes**: after pulling, run `npx prisma migrate deploy` on the server *before* starting the new build. The enquiry pipeline, trash and scheduling need the newer columns, and queries fail without them.
- **Replying from the admin** sends through SMTP. Set `SMTP_HOST`, `SMTP_PORT`, `SMTP_USER`, `SMTP_PASS` and `MAIL_FROM`. Without them the Reply form says email isn't configured and offers "Open in mail app".
- **Roles**: editors can create and edit content and work enquiries. Permanently deleting anything, and deleting testimonials, FAQs, categories, tags, enquiries and subscribers, is admin-only. Posts, pages, projects and services go to the Trash first and can be restored.
- **Scheduling**: a published post, page, project or service with a future "Publish at" stays hidden until that time (server timezone). No cron needed.
- **Preview**: the eye icon (and the Preview button on every edit page) opens `/preview/<type>/<id>`, the real public page including drafts, scheduled and trashed items. Signed-in users only, never indexed.
- **Version history**: every save of a post, page, project or service keeps the previous version (last 25). Restore from the bottom of the edit page; restoring is itself undoable.
- **Two-factor sign-in** (TOTP, any authenticator app): turn it on under *Account & security*. You get 8 single-use recovery codes. If an admin is locked out, `npm run admin:password` resets the password, and 2FA can be cleared in `npx prisma studio` (User: totpEnabled=false).
- **Forgot password** emails a one-hour link (needs SMTP). Changing or resetting a password signs out all existing sessions. Without SMTP use `npm run admin:password -- <email> <new password>`.
- **⌘K / Ctrl+K** opens quick search in the admin.
- **Login rate limit** is in memory (per server process). It resets on restart and is not shared across several instances; use Redis/Upstash if you scale out.
- **Dev tip**: never run `next build` while `next dev` is running; both write to `.next` and the dev server stops responding.
- **Plans** (admin: Plans) are stored in the database: add, reorder, price, schedule, trash and restore them. The public Plans page and the plan enquiry form read from there. A request for a plan that was since unpublished is rejected with a clear message.
- **Forms & estimates** (admin only) edits the Support form's issue and urgency options and the whole Estimate wizard (project types, sizes, features, timelines, scoring points, result tiers). "Work-stopping" marks the urgency level that is flagged as urgent. Internal ids stay stable so old enquiries still read correctly. "Reset to defaults" returns to the built-in values.
- **Contact taps**: taps on phone, WhatsApp and email links are counted anonymously (channel and page only) and shown on the dashboard.
- **Unsubscribes** are kept as a suppression record (they no longer receive newsletters and show as "Unsubscribed"). Use the delete button on a subscriber to erase the record entirely.

