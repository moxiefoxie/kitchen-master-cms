# Kitchen Master CMS

This repository contains the Strapi 5 CMS used by the Kitchen Master website.
It has its own dependencies, Git history, deployment, database, and access
controls; it is not part of the website repository even when cloned into that
repository's ignored `cms/` directory.

## Project links

| Service | URL |
| --- | --- |
| CMS repository | <https://github.com/moxiefoxie/kitchen-master-cms> |
| Strapi Cloud console | <https://cloud.strapi.io> |
| Production admin | <https://devoted-angel-d525a2a640.strapiapp.com/admin> |
| Production public content API | <https://devoted-angel-d525a2a640.strapiapp.com/api/kitchen-master-content> |
| Production website | <https://kitchen-master-two.vercel.app> |
| Vercel project | <https://vercel.com/nasa-capstone/kitchen-master> |

You need two separate kinds of production access:

1. **Strapi Cloud project access** for deployments, logs, and cloud environment
   variables.
2. **Strapi admin access** for editing and publishing content.

Ask an owner to invite your account to both. Do not share another person's
login, API token, or transfer token.

## Requirements

* Node.js 22.x recommended (supported range is 20–26)
* npm 6 or newer
* Git

Check the installed versions:

```bash
node --version
npm --version
git --version
```

## Local setup

Clone and install the CMS:

```bash
git clone https://github.com/moxiefoxie/kitchen-master-cms.git
cd kitchen-master-cms
npm ci
cp .env.example .env
```

Replace every `replace-me` value in `.env`. Generate strong local-only values
with `openssl rand -base64 32`. `APP_KEYS` requires four comma-separated
values. Keep the generated values private and never commit `.env`.

The important local settings are:

```env
HOST=0.0.0.0
PORT=1337
FRONTEND_URL=http://localhost:3000
PREVIEW_SECRET=use-the-same-value-as-the-websites-STRAPI_PREVIEW_SECRET
DATABASE_CLIENT=sqlite
DATABASE_FILENAME=.tmp/data.db
```

The `STRAPI_CLOUD_API_URL`, `STRAPI_CLOUD_API_TOKEN`, `apiUrl`, and `apiToken`
placeholders in `.env.example` only keep the cloud plugin from blocking local
development. They are not production credentials.

Start the CMS:

```bash
npm run develop
```

Open:

* Admin: <http://localhost:1337/admin>
* Public content API: <http://localhost:1337/api/kitchen-master-content>

The first local run creates a SQLite database at `.tmp/data.db` and seeds the
Kitchen Master locations, settings, pages, homepage sections, menus, and
bundled media. Create a local admin account when prompted. This account exists
only in your local database and does not grant production access.

## Connect the website to this local CMS

In the website repository, create or update `.env.local`:

```env
STRAPI_URL=http://localhost:1337
STRAPI_PREVIEW_SECRET=the-same-value-as-PREVIEW_SECRET-above
NEXT_PUBLIC_SITE_URL=http://localhost:3000
```

Run the website in a second terminal with `npm run dev`, then verify:

* Website: <http://localhost:3000>
* Website CMS proxy: <http://localhost:3000/api/cms>
* Strapi directly: <http://localhost:1337/api/kitchen-master-content>

The public content route currently has `auth: false`, so routine website reads
do not require `STRAPI_API_TOKEN`. Draft preview requires the matching preview
secret.

## Connect this checkout to Strapi Cloud

Routine content editing, logs, and environment-variable access should be done
in the Strapi Cloud console and production admin. They do not require a local
project link.

Only link a checkout when you intentionally need CLI deployment. Use the
project-local Strapi CLI so its version matches this repository:

```bash
npm run strapi -- login
npm run strapi -- link
```

Sign in with the account invited to the existing Kitchen Master Strapi Cloud
project, then select that project when prompted. The link metadata is local and
ignored by Git.

**Important:** Strapi warns that a later CLI deployment can replace the linked
cloud application and its data. Linking is not needed just to browse the
dashboard, and `npm run deploy` should only be run with an approved deployment
and backup plan.

Useful cloud commands:

```bash
# Build locally before deployment
npm run build

# Deploy the linked project to Strapi Cloud; use intentionally
npm run deploy
```

The preferred day-to-day deployment path is the repository's Git integration:
push a reviewed commit to the branch configured in Strapi Cloud and monitor the
deployment in <https://cloud.strapi.io>. Use the CLI deploy command only when a
manual cloud deployment is intended.

See the official [Strapi documentation](https://docs.strapi.io/) for the
current `strapi login`, `strapi link`, and `strapi deploy` workflow.

Strapi Cloud supplies its managed PostgreSQL connection. Do not copy cloud
`DATABASE_*` values into local `.env`; local development should continue to use
SQLite unless a specific migration test requires otherwise.

## Production environment variables

Manage production values in the Strapi Cloud console, not in `.env`,
`.env.production`, or Git. The application needs the normal Strapi secrets plus:

| Variable | Production purpose |
| --- | --- |
| `FRONTEND_URL` | `https://kitchen-master-two.vercel.app` until the real domain replaces it |
| `PREVIEW_SECRET` | Must match Vercel's `STRAPI_PREVIEW_SECRET` |
| `APP_KEYS` | Strapi application signing keys |
| `API_TOKEN_SALT` | API-token salt |
| `ADMIN_JWT_SECRET` | Admin authentication secret |
| `TRANSFER_TOKEN_SALT` | Data-transfer token salt |
| `JWT_SECRET` | Users/permissions JWT secret |
| `ENCRYPTION_KEY` | Field-encryption key |

Database variables are injected by Strapi Cloud. Resend variables belong to
the website's Vercel project because the Next.js routes send form and campaign
emails.

## Editing production content

Open <https://devoted-angel-d525a2a640.strapiapp.com/admin>, sign in with your
own invited admin account, and use Content Manager. Save and **publish** changes
that should appear on the public website.

Key ownership rules:

* **Location**: restaurant details, ordering/reservation links, social links,
  SEO, reviews, hiring roles, and contact/private-dining/careers recipients.
* **Site Settings**: global fallbacks, including the franchise recipient.
* **Site Page** and **Homepage Section**: global content when Location is empty;
  a matching location-specific record overrides the global record.
* **Menu Category** and **Campaign**: shared when no locations are assigned;
  targeted when one or more locations are assigned.

The website caches normal CMS reads briefly. Allow up to about 60 seconds after
publishing, or reload after the cache window.

## Local data reset

To rebuild only the local database, stop Strapi, remove `.tmp/data.db`, and run
`npm run develop` again. This permanently deletes local CMS edits; it does not
touch Strapi Cloud.

## Commands

```bash
npm run develop   # Local development with auto-reload
npm run build     # Build the admin application
npm run start     # Start without auto-reload
npm run console   # Open the Strapi console
npm run deploy    # Deploy the linked project to Strapi Cloud
```

## Troubleshooting

### The admin starts but the website has no CMS content

Check the direct endpoint first:

```text
http://localhost:1337/api/kitchen-master-content
```

If that works, confirm the website's `.env.local` uses
`STRAPI_URL=http://localhost:1337`, then restart Next.js.

### Preview does not open the website

Confirm `FRONTEND_URL=http://localhost:3000` locally and verify that the CMS
`PREVIEW_SECRET` exactly matches the website's `STRAPI_PREVIEW_SECRET`.

### Cloud login works but the project is unavailable

CLI authentication does not add project membership. Ask a Strapi Cloud owner to
invite the same account, then run `npm run strapi -- link` again.

### Production admin access is denied

Strapi Cloud membership does not automatically create a Strapi admin user. Ask
an existing production admin to invite you from the admin panel.
