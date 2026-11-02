# Mindspace

Mindspace is a small productivity app with **Notes**, **Ideas** and a **Kanban board**.
Authentication is handled by **Supabase** (email/password + Google), the API is an
**Express + TypeScript** service, and the UI is a **Next.js 16** app.

> **Build log:** every task is tracked in the [Task log](#task-log) below.

---

## Stack

| Layer      | Technology                                                        |
| ---------- | ----------------------------------------------------------------- |
| Frontend   | Next.js 16 (App Router), React 19, TypeScript, Tailwind CSS 4     |
| Editor     | Tiptap (rich text: bold, italic, headings, lists, code, quotes)   |
| Auth       | Supabase Auth — email/password and Google OAuth                   |
| Backend    | Express 5, TypeScript, Zod validation                             |
| Database   | Supabase Postgres (integer identity primary keys)                 |
| API client | Native `fetch` with Supabase access-token bearer authentication   |

---

## Task log

- [x] **1. Project scaffolding** — inspected the existing Next.js 16 app and created the backend workspace.
- [x] **2. Database schema** — `profiles`, `notes`, `ideas` tables, status enums, triggers, RLS and indexes (`backend/supabase/schema.sql`).
- [x] **3. Backend API** — JWT authentication middleware, notes/ideas/board/profile routes and Zod validation.
- [x] **4. Supabase auth on the frontend** — browser client, auth provider, protected routes, email/password + Google OAuth, callback page.
- [x] **5. App shell** — responsive sidebar, dashboard, settings page and sign out.
- [x] **6. Notes** — master/detail notes page with editable title and autosaving Tiptap editor.
- [x] **7. Ideas** — idea list with title, rich description and status management.
- [x] **8. Kanban board** — planned / in progress / feature request / completed columns with drag & drop.
- [x] **9. Documentation** — environment variables, Supabase setup, run instructions and API reference.
- [x] **10. Verification** — frontend ESLint, TypeScript and production build pass; backend type-check and build pass.
- [x] **11. Profile status and account archiving** — removed `avatar_url`, added `status` (`failed` → `active` on successful sign-in, `archived` on account deletion), added a Settings page for editing the full name and soft-deleting the account.
- [x] **12. Note titles and archiving** — added an editable `title` and `status` to notes; deleting a note now archives it instead of removing the row.
- [x] **13. Inactive on logout** — added the `inactive` profile status; signing out calls `POST /api/profile/logout` before revoking the Supabase session.
- [x] **14. Hashed password in profiles** — added `profiles.password_hash`, kept in sync with `auth.users.encrypted_password` by triggers; the hash is never returned by the API or selectable from the browser.
- [x] **15. Light/dark theme toggle** — added an Appearance switch in Settings, a class-based Tailwind dark variant, and dark styling across the app shell, auth screens, dashboard, notes, ideas, board and profile settings. The preference is saved in `localStorage` and applied before hydration.
- [x] **16. Google OAuth troubleshooting** — centralized Google sign-in, added actionable setup errors for missing providers/redirect URLs, and documented the required Google Cloud and Supabase settings.
- [x] **17. In-app confirmation dialogs** — replaced native `window.confirm` prompts for note archiving, idea deletion and account archiving with accessible modal dialogs.
- [x] **18. Branded tab icon** — added the Mindspace sparkle logo as `app/icon.svg`, generated a multi-size `app/favicon.ico` and a 180×180 `app/apple-icon.png` for browser tabs and Apple devices.
- [x] **19. Password reset** — added a “Forgot password?” link on sign-in, a reset-request page, a recovery callback that keeps the user on the reset form, and a new-password page. Settings also provides a “Send reset link” action.
- [x] **20. No signup email confirmation** — removed the confirmation/resend flow, enabled auto-confirm signups so new email/password accounts receive a session immediately, and kept password reset as a secure email-link flow. The signup page now reports when Supabase is still configured to require confirmation.
- [x] **21. Flexible idea and note lists** — removed the viewport-based max heights and inner scrolling from the idea and note list panels so every item stays visible; long titles now wrap instead of being cut off.
- [x] **22. Rename Tasks to Ideas** — renamed the UI, route (`/ideas`), API (`/api/ideas`), TypeScript types and database table (`ideas`, `idea_status`). Existing `tasks` data is preserved by the migration block in `backend/supabase/schema.sql`; `/tasks` redirects to `/ideas`.

---

## Repository layout

```
Mindspace/
├─ backend/
│  ├─ src/
│  │  ├─ index.ts            # Express app
│  │  ├─ config.ts           # env loading
│  │  ├─ middleware/auth.ts  # Supabase JWT verification + archived check
│  │  ├─ routes/             # notes, ideas, profile
│  │  └─ lib/                # Supabase client, errors, HTTP helpers
│  ├─ supabase/schema.sql    # run this in the Supabase SQL editor
│  └─ .env.example
└─ frontend/
   ├─ app/
   │  ├─ (auth)/login|signup
   │  ├─ auth/callback
   │  └─ (app)/dashboard|notes|ideas|board|settings
   ├─ components/
   ├─ lib/
   └─ .env.example
```

---

## Environment variables

### `frontend/.env`

Copy `frontend/.env.example` to `frontend/.env`.

| Variable                        | Required | Description                                                                 |
| ------------------------------- | -------- | --------------------------------------------------------------------------- |
| `NEXT_PUBLIC_SUPABASE_URL`      | yes      | Supabase Project URL (Project Settings → API).                               |
| `NEXT_PUBLIC_SUPABASE_ANON_KEY` | yes      | Supabase **anon public** key (Project Settings → API). Safe in the browser.  |
| `NEXT_PUBLIC_API_URL`           | yes      | URL of the Express API. Defaults to `http://localhost:4000` when omitted.    |

### `backend/.env`

Copy `backend/.env.example` to `backend/.env`.

| Variable                    | Required | Description                                                                  |
| --------------------------- | -------- | ---------------------------------------------------------------------------- |
| `PORT`                      | no       | API port, defaults to `4000`.                                                 |
| `SUPABASE_URL`              | yes      | Same project URL as the frontend.                                             |
| `SUPABASE_SERVICE_ROLE_KEY` | yes      | **Secret** service-role key. Server only — never expose it to the browser.    |
| `FRONTEND_URL`              | yes      | Allowed CORS origin(s), comma separated. Defaults to `http://localhost:3000`. |

---

## Supabase setup

1. Create a project at <https://supabase.com/dashboard>.
2. Open **SQL Editor**, paste the contents of [`backend/supabase/schema.sql`](backend/supabase/schema.sql) and run it.
   This creates the tables, enums, indexes, `updated_at` triggers, an `auth.users` → `profiles`
   trigger and row-level-security policies.
   The file is safe to re-run: it adds the new profile/note status columns and note title, and backfills
   `profiles.password_hash` from Supabase Auth.
3. **Authentication → Providers → Email**: enable it and turn *Confirm email* off.
   This app expects auto-confirmed signups so new users can sign in immediately.
4. **Authentication → Providers → Google**: enable it and paste a Google OAuth client ID/secret.
   See [Google OAuth setup](#google-oauth-setup) below for the exact Google Cloud and
   Supabase values.
5. **Authentication → URL Configuration**:
   - Site URL: your primary deployed origin, e.g.
     `https://mindspace-frontend-five.vercel.app` (or `http://localhost:3000` for
     local-only development).
   - Redirect URLs: add every callback used by the app:
     - `http://localhost:3000/auth/callback`
     - `https://mindspace-frontend-five.vercel.app/auth/callback`
6. Copy the Project URL, anon key and service-role key into the env files above.

> The frontend signs users in directly with Supabase. The backend never sees passwords:
> it verifies the Supabase access token on every request and uses the service-role key
> only for database access.

### Google OAuth setup

Google sign-in needs configuration in three places. The **app callback** and the
**Supabase callback** are different URLs:

- App callback: `http://localhost:3000/auth/callback`
- Supabase callback: `https://<YOUR_PROJECT_REF>.supabase.co/auth/v1/callback`

#### 1. Google Cloud Console

1. Open [Google Auth Platform → Clients](https://console.cloud.google.com/auth/clients)
   and create an OAuth client ID with application type **Web application**.
2. Under **Authorized JavaScript origins**, add:
   - `http://localhost:3000`
   - `https://mindspace-frontend-five.vercel.app`
3. Under **Authorized redirect URIs**, add only:
   - `https://<YOUR_PROJECT_REF>.supabase.co/auth/v1/callback`
   - Do **not** put `http://localhost:3000/auth/callback` here. That URL belongs in
     Supabase URL Configuration.
4. Open [Google Auth Platform → Audience](https://console.cloud.google.com/auth/audience).
   While the app is in **Testing**, add the Google account you use for testing under
   **Test users**. Make sure these scopes are configured:
   - `openid`
   - `.../auth/userinfo.email`
   - `.../auth/userinfo.profile`
5. Copy the generated **Client ID** and **Client Secret**.

> The Client ID saved in Supabase must belong to the **same Google OAuth client**
> where you added the redirect URI. If Supabase uses a Client ID from a different
> Google Cloud client, Google returns `redirect_uri_mismatch` even when the redirect
> URI looks correct.

#### 2. Supabase Dashboard

1. Go to **Authentication → Providers → Google**, enable the provider and paste the
   Google Client ID and Client Secret. Save.
2. Go to **Authentication → URL Configuration** and set:
   - **Site URL**: `https://mindspace-frontend-five.vercel.app`
   - **Redirect URLs**:
     - `http://localhost:3000/auth/callback`
     - `https://mindspace-frontend-five.vercel.app/auth/callback`
3. Use the exact same host everywhere. `localhost` and `127.0.0.1` are different
   origins as far as OAuth is concerned.

> **Site URL is only the fallback.** If the requested callback is not in **Redirect
> URLs**, Supabase ignores it and sends the user to the Site URL instead. That is why a
> production sign-in can end at `http://localhost:3000/?code=...`: the Site URL is still
> localhost, or the production `/auth/callback` URL was not allowlisted.

#### 3. App environment

For a **hosted Supabase project**, `frontend/.env` only needs the project URL
and anon key. The Google Client ID and Client Secret belong in the Supabase Dashboard,
not in the frontend env file. Restart the Next.js dev server after changing env values.

If you are running Supabase locally with the Supabase CLI instead, the Google provider
is configured in `supabase/config.toml` and the secret is supplied as
`SUPABASE_AUTH_EXTERNAL_GOOGLE_CLIENT_SECRET`. That setup is not used by this hosted
project.

#### Common Google OAuth errors

| Error | What to fix |
| --- | --- |
| `redirect_uri_mismatch` | Either the Google Cloud **Authorized redirect URI** is wrong, or Supabase’s Google Client ID belongs to a different OAuth client. It must be the Supabase callback, not `/auth/callback`, and the Client ID in Supabase must match the OAuth client you edited. |
| `Unsupported provider: provider is not enabled` | Enable Google in **Supabase → Authentication → Providers** and save the Client ID/secret. |
| `Invalid redirect URL` or you land back on `/login` | Add the exact app callback URL to **Supabase → Authentication → URL Configuration → Redirect URLs**. |
| `Access blocked` / consent screen error | Add your Google account as a **Test user** while the Google OAuth app is in Testing, or publish the app. |
| Google works locally but not in production | Add the production origin and `/auth/callback` URL to both Google Cloud and Supabase, and use the same domain in the browser. |
| Google returns to `http://localhost:3000/?code=...` in production | Supabase fell back to its **Site URL**. Set **Site URL** to the production origin and add the production `/auth/callback` URL to **Redirect URLs**. |

If Google sign-in fails, the app now shows a more specific message for the most common
provider and redirect configuration mistakes.

### Password reset

Users can reset a forgotten password from the **Forgot password?** link on the
sign-in screen, or from **Settings → Password → Send reset link** while signed in.

1. The app calls `supabase.auth.resetPasswordForEmail` with a redirect to
   `/auth/callback?next=/reset-password`.
2. Supabase emails a recovery link. The link must be allowed by the same
   **Redirect URLs** configuration as the other auth callbacks:
   - `http://localhost:3000/auth/callback`
   - `https://mindspace-frontend-five.vercel.app/auth/callback`
3. The callback exchanges the recovery code for a session and forwards to
   `/reset-password`, where `supabase.auth.updateUser` saves the new password.

The app uses Supabase’s PKCE flow, so the recovery link must be opened in the same
browser where it was requested. No extra environment variables are needed. For
production, configure custom SMTP in Supabase so reset emails are delivered reliably
and are not limited by the default email service.

### Email confirmation and SMTP

Signup confirmation is disabled on the Supabase project (`mailer_autoconfirm = true`).
Email/password signups return a session immediately and users can sign in without
confirming their address. Two Supabase settings must stay in this state:

- **Authentication → Providers → Email → Enable Email Provider**: on
- **Authentication → Providers → Email → Confirm email**: off

The app no longer sends or resends confirmation emails and has no confirmation step.
If Supabase still returns an account without a session, the signup page reports the
configuration problem instead of telling the user to check an inbox.

Password reset is separate and still uses Supabase email. It works for the email
address entered on the forgot-password page: Supabase sends a recovery link, and the
reset-password page saves the new password. Configure custom SMTP in
**Authentication → Emails → SMTP Settings** so reset links are delivered for real
users. Supabase’s built-in email service is intended for testing and is not a reliable
production sender.

If an address is already registered, signup shows “This email is already registered”
and links to sign in instead. Use the forgot-password flow if the password is unknown.

### How the auth flow works

1. The browser signs in with `supabase.auth.signInWithPassword` or `signInWithOAuth({ provider: 'google' })`.
2. Supabase stores the session in the browser and refreshes the access token automatically.
3. Every API request adds `Authorization: Bearer <access_token>`.
4. The Express `requireAuth` middleware calls `supabase.auth.getUser(token)`; invalid or
   expired tokens receive `401`. Archived profiles receive `403`.
5. The frontend auth provider calls `GET /api/profile` after a session is established.
   That request marks a `failed` or `inactive` profile `active`; if the profile is
   `archived`, the provider signs the user out and the login page shows the archive message.
6. Signing out calls `POST /api/profile/logout` (status becomes `inactive`) before
   `supabase.auth.signOut()` revokes the browser session.
7. The backend queries Postgres with the service-role key, always scoped by `user_id`.
8. Google/email links return to `/auth/callback`, which waits for the Supabase session and
   forwards the user to `/dashboard`.

Because the session lives in browser storage, route protection is implemented in the
`(app)` layout with a client-side guard. The API is the real security boundary: every
route re-verifies the token and every query is scoped to the authenticated user.

---

## Run locally

```bash
# terminal 1 — API
cd backend
npm install
cp .env.example .env        # then fill in the values (Windows: copy .env.example .env)
npm run dev                 # http://localhost:4000

# terminal 2 — web app
cd frontend
npm install
cp .env.example .env  # then fill in the values (Windows: copy .env.example .env)
npm run dev                 # http://localhost:3000
```

Open <http://localhost:3000>, create an account (or continue with Google) and start using
Notes, Ideas and the Board.

### Useful commands

```bash
# frontend
npm run build          # production build (also type-checks)
npx tsc --noEmit       # type-check only
npm run lint           # ESLint

# backend
npm run typecheck      # type-check only
npm run build          # compile to backend/dist
npm run start          # run the compiled API
```

### Troubleshooting

| Symptom | Likely cause / fix |
| ------- | ------------------ |
| “Supabase is not configured” banner | `frontend/.env` is missing the URL/anon key. Restart `next dev` after editing env files. |
| Login returns `Invalid login credentials` | Wrong password, or email sign-in is disabled in Supabase. Open Authentication → Providers → Email and enable it. |
| Login returns `Email not confirmed` | Supabase still has **Confirm email** enabled. Turn it off under Authentication → Providers → Email. |
| Signup says the email is already registered | The address already exists in `auth.users`. Sign in instead, or use the forgot-password flow. |
| Signup succeeds but returns no session | In Supabase, enable **Email Provider** and turn off **Confirm email**, then sign up again. |
| Password-reset email never arrives | Configure custom SMTP, check spam, and review Authentication → Logs. Email confirmation is not involved. |
| Google sign-in returns `redirect_uri_mismatch` | Add `https://<PROJECT_REF>.supabase.co/auth/v1/callback` to the Google Cloud OAuth client. |
| Google returns to `/login` with an error | Add `http://localhost:3000/auth/callback` to Supabase **Redirect URLs** and set **Site URL**. |
| API requests fail with `401` | The Supabase session expired or the frontend and backend use different Supabase projects. Sign out and in again. |
| API requests fail with `403` / “account has been archived” | The account was soft-deleted from Settings. Create a new account; the archived row is intentionally retained. |
| API requests fail with “Could not reach the API” | Start the backend on port 4000, or update `NEXT_PUBLIC_API_URL`. |
| Browser CORS error | Add the exact frontend origin to `FRONTEND_URL` in `backend/.env` (comma separated for several). |
| Tables are missing / `relation does not exist` | Run `backend/supabase/schema.sql` in the Supabase SQL editor. |

---

## Database model

All primary keys are integer identity columns, as requested.

| Table      | Columns                                                                                                          |
| ---------- | ---------------------------------------------------------------------------------------------------------------- |
| `profiles` | `id` int PK, `user_id` uuid (auth.users), `email`, `full_name`, `password_hash`, `status`, timestamps             |
| `notes`    | `id` int PK, `user_id` uuid, `title`, `content` jsonb (Tiptap doc), `content_text` (search preview), `status`, timestamps |
| `ideas`    | `id` int PK, `user_id` uuid, `title`, `description` jsonb, `description_text`, `status`, `position`, timestamps    |

Enums:

- `idea_status`: `planned`, `in_progress`, `feature_request`, `completed`.
- `profile_status`: `failed`, `active`, `inactive`, `archived`.
- `note_status`: `active`, `archived`.

Profile status lifecycle:

1. The signup trigger creates the profile with `failed`.
2. The first successful authenticated request (the auth provider calls `GET /api/profile`) changes a `failed` or `inactive` profile to `active`.
3. Signing out calls `POST /api/profile/logout`, which changes an active profile to `inactive`, then revokes the Supabase session.
4. Deleting the account changes it to `archived` and signs the user out. The auth user and all data stay in the database (soft delete).
5. Archived accounts receive `403` from every API route.

`profiles.password_hash` contains the bcrypt hash that Supabase Auth stores in
`auth.users.encrypted_password`. It is copied by database triggers on signup and password
change, so plain-text passwords never reach the application. The API selects profile
columns explicitly and never returns `password_hash`; browser clients also cannot select it
through Supabase because column-level privileges exclude it.

Notes are also soft-deleted: `DELETE /api/notes/:id` sets `status = 'archived'` and the
note disappears from list/detail queries without losing its row. Notes have an editable
title plus the single rich-text description.

---

## API reference

All `/api/*` routes require `Authorization: Bearer <supabase-access-token>`.

| Method   | Route                       | Description                                   |
| -------- | --------------------------- | --------------------------------------------- |
| `GET`    | `/health`                   | Health check (no auth).                       |
| `GET`    | `/api/profile`              | Current profile; marks a `failed`/`inactive` profile active. |
| `PATCH`  | `/api/profile`              | Update `full_name` only.                      |
| `POST`   | `/api/profile/logout`       | Mark the profile `inactive` before sign-out.  |
| `DELETE` | `/api/profile`              | Soft-delete the account (`status = archived`). |
| `GET`    | `/api/notes`                | List active notes, newest first.              |
| `POST`   | `/api/notes`                | Create a note (title + rich text).            |
| `GET`    | `/api/notes/:id`            | Get one active note.                          |
| `PATCH`  | `/api/notes/:id`            | Update a note's title and/or content.         |
| `DELETE` | `/api/notes/:id`            | Archive a note (`status = archived`).         |
| `GET`    | `/api/ideas?status=`        | List ideas (optionally filtered).             |
| `POST`   | `/api/ideas`                | Create an idea.                               |
| `GET`    | `/api/ideas/:id`            | Get one idea.                                 |
| `PATCH`  | `/api/ideas/:id`            | Update title/description/status/position.     |
| `PATCH`  | `/api/ideas/:id/status`     | Move an idea on the board.                    |
| `DELETE` | `/api/ideas/:id`            | Delete an idea.                               |

---

## Features

- **Email/password and Google sign-in**, session persistence, automatic token refresh and
  protected routes.
- **Profile settings**: edit the full name only; signing out sets `status = inactive`,
  and account deletion is a soft delete that sets `status = archived` and blocks future
  API access.
- **Light/dark theme**: switch between light and dark appearance in
  **Settings → Appearance**. The choice is stored in the browser and applied across the
  entire app.
- **Notes**: editable title plus one rich description box with bold, italic, strikethrough,
  inline code, H1–H3 headings, bulleted/numbered lists, quotes, code blocks, undo/redo.
  Notes autosave; deleting a note archives it.
- **Ideas**: title plus the same rich description editor, status and ordering.
- **Kanban board**: four fixed columns (Planned, In Progress, Feature Request, Completed)
  with drag & drop, optimistic updates and quick add.
- **Dashboard**: counts, completion rate, recent notes/ideas and quick actions.
