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
| Admin  | admin@mawuwebs.com       | Admin123!   |
| Editor | editor@mawuwebs.com      | Editor123!  |

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

## Notes on the stack

- **Database:** SQLite is used for zero-config local development. For production, change the `provider` in `prisma/schema.prisma` to `postgresql` (or `mysql`), swap `@prisma/adapter-better-sqlite3` for the matching driver adapter (e.g. `@prisma/adapter-pg`) in `src/lib/prisma.ts`, and update `DATABASE_URL`.
- **Auth:** Sessions are JWT-based (no DB session table needed). Route protection for `/admin/*` happens in `src/proxy.ts` (Next.js 16 renamed `middleware.ts` to `proxy.ts`).
- **Image uploads:** Stored locally under `public/uploads` and referenced by URL in the database. For multi-instance/production deployments, point `src/lib/actions/media.ts` at an object storage provider instead.
- **Seed images:** Demo content photos live under `public/images/seed/` and are referenced by local path in `prisma/seed.ts`. They're bundled as static assets rather than hotlinked to a stock-photo API, since third-party "random by keyword" image services don't reliably return the same photo for the same URL over time.
- **Brand theme:** Colors live in `src/app/globals.css` as CSS variables (`--brand-forest`, `--brand-orange`, `--brand-yellow`), mapped into Tailwind via `@theme inline`. Both light and dark themes are defined; dark mode is togglable site-wide (`next-themes`).
