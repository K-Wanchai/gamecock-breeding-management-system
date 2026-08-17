# ระบบจัดการการฝากผสมไก่ชน (Gamecock Breeding Management System)

A Django REST Framework API for a gamecock (fighting-cock) breeding
management service. Admins manage breeder (stud) master data, breeding
capacity, and payment verification; customers register their hens and book
breeding slots with a breeder, track the breeding/hatching process, and
receive LINE notifications as their booking's status changes.

## Project Overview

A customer books a breeding slot for their hen with a breeder and pays a
deposit. Once an admin verifies the payment and approves the booking, it
locks a queue slot for that breeder's month. From there, an admin records the
breeding process (received → breeding → egg-laying → incubation → hatching),
egg counts, hatching results, individual chicks (each with a unique wing-clip
number), and their health/vaccination history. Pedigree certificates and
delivery documents can then be generated as PDFs. Throughout, the customer is
notified over LINE at each key status change, and admins get dashboards,
business reports, and a cross-entity search over the whole system.

The authoritative schema/architecture reference is
[`docs/design/step1-system-analysis-database-design.md`](docs/design/step1-system-analysis-database-design.md)
(the original 15-entity ER design). Field/status-enum renames made in later
steps are documented in [`CLAUDE.md`](CLAUDE.md), which also has a detailed
build log for every step (STEP1-10) — always trust the model files and
`CLAUDE.md` over the design doc for current field names.

## Features

- **Accounts** — JWT auth (access/refresh with rotation + blacklist), two
  roles (`ADMIN`/`CUSTOMER`), registration, profile, password change/reset.
- **Breeders & Hens** — admin-managed breeder master data (service rate,
  monthly queue quota, image); customer-owned hen records.
- **Bookings** — customers book a hen against a breeder for a month; server
  computes price/deposit from the breeder's rate; admin approval locks a
  race-safe queue slot per `(breeder, year, month)`.
- **Payments** — customers submit a payment with a slip image; admin
  approves/rejects; booking status advances once the deposit is met.
- **Breeding process** — an append-only event timeline per booking
  (received → breeding → breeding-completed → waiting-egg → egg-laid →
  incubation → hatching), plus per-batch egg counts (good/bad).
- **Hatching & Chicks** — two-phase hatching batches (start → complete);
  individual chicks with an auto-generated, year-scoped wing-clip number.
- **Health & Vaccinations** — per-chick health records and vaccination doses
  (with server-computed age-in-days), duplicate-dose protected.
- **Documents** — server-rendered PDF pedigree certificates and delivery
  documents (Thai-font-aware), generated only from server-side data, never
  client-supplied content.
- **LINE notifications** — push notifications on booking approve/cancel and
  payment approve/reject; self-service LINE account linking via a short-lived
  code; signature-verified webhook; bounded retry for failed sends.
- **Dashboard, Reports & Search** — role-scoped dashboard; 7 admin business
  reports (booking/payment/revenue/breeding/egg/hatching/chick) with date
  range + status + breeder + customer filtering; a cross-entity search over
  bookings by booking number, customer, hen, breeder, wing-clip number, or date.

## Architecture

Every app follows the same layering, enforced consistently across the whole
codebase:

```
views.py        thin: permission wiring + call a serializer + call a service
services.py     all business logic + every consequential DB mutation;
                wraps money/queue/running-number operations in
                transaction.atomic() + select_for_update()
serializers.py  input validation + read/write field shaping (server-computed
                fields like price, owner id, status are always read-only)
permissions.py  custom DRF permission classes (ADMIN-write/owner-read is a
                shared base, apps.core.permissions.AdminWriteOwnerReadPermission)
urls.py         a DRF DefaultRouter per app, included under /api/v1/
tests.py        (or a tests/ package) per app
```

Cross-cutting conventions:

- **Ownership never trusts the client.** Every model a customer can reach
  implements `get_owner_user_id()`; `apps.core.permissions.IsOwnerOrAdmin` /
  `AdminWriteOwnerReadPermission` check it at the object level on top of
  queryset-level scoping in `get_queryset()` — defense in depth against IDOR.
- **Uniform error envelope** — every API error is
  `{"error": {"code": "...", "message": "...", "details": {...}}}`, produced
  by `apps.core.exceptions.standard_exception_handler` (DRF's global
  `EXCEPTION_HANDLER`); unexpected exceptions are logged server-side only,
  never leaked to the client.
- **Race-safe sequential numbers** — booking/payment/document/wing-clip
  numbers all go through `apps.core.services.next_running_number()`, which
  row-locks a per-`(counter_type, year)` counter with `select_for_update()`.
- **File uploads** are validated by `apps.core.validators.validate_image_file`
  (extension + content-type whitelist, 5&nbsp;MB cap, and a real Pillow decode
  to confirm the bytes are a genuine image, not just a renamed file).

## Tech Stack

| Layer | Choice |
|---|---|
| Language / framework | Python 3.12, Django 5.2, Django REST Framework |
| Database | PostgreSQL (no SQLite fallback — required for real row locking) |
| Auth | `djangorestframework-simplejwt` (JWT, rotation + blacklist) |
| Filtering | `django-filter` |
| API docs | `drf-spectacular` (OpenAPI 3 / Swagger / Redoc) |
| PDF generation | `reportlab` |
| Image handling | `Pillow` |
| HTTP client (LINE API) | `requests` |
| Testing | `pytest`, `pytest-django` |

## Installation

Requires Python 3.12+ and a running PostgreSQL server.

```bash
git clone <repo-url>
cd gamecock-breeding-management-system
python -m venv venv
```

Windows:

```bash
venv/Scripts/python.exe -m pip install -r requirements.txt
```

macOS/Linux:

```bash
venv/bin/python -m pip install -r requirements.txt
```

## Environment Variables

Copy the template and fill in real values — **never commit the real `.env`**:

```bash
cp .env.example .env
```

| Variable | Required | Notes |
|---|---|---|
| `DJANGO_SECRET_KEY` | yes | no default, must be set |
| `DJANGO_DEBUG` | no (default `False`) | `True` for local dev |
| `DJANGO_ALLOWED_HOSTS` | no | comma-separated |
| `DB_NAME`, `DB_USER`, `DB_PASSWORD` | yes | PostgreSQL credentials |
| `DB_HOST`, `DB_PORT` | no | default `localhost:5432` |
| `DB_CONN_MAX_AGE` | no (default `60`) | persistent DB connection seconds |
| `JWT_ACCESS_TOKEN_LIFETIME_MINUTES` / `JWT_REFRESH_TOKEN_LIFETIME_DAYS` | no | default 30 min / 7 days |
| `CORS_ALLOWED_ORIGINS` | no | comma-separated frontend origin(s) |
| `THROTTLE_RATE_ANON` / `_USER` / `_LOGIN` / `_REGISTER` / `_PASSWORD_RESET` / `_LINE_WEBHOOK` | no | DRF request-rate limits, e.g. `30/min` |
| `DJANGO_SECURE_SSL_REDIRECT`, `DJANGO_SESSION_COOKIE_SECURE`, `DJANGO_CSRF_COOKIE_SECURE`, `DJANGO_SECURE_HSTS_*` | no | default to the opposite of `DJANGO_DEBUG`; override only to deviate |
| `FARM_NAME` | no | shown on generated PDF documents |
| `LINE_CHANNEL_ACCESS_TOKEN`, `LINE_CHANNEL_SECRET` | for LINE features | from the LINE Developers console |
| `EMAIL_*` | no | console backend in `DEBUG`, SMTP otherwise |

See [`.env.example`](.env.example) for the full list with defaults.

## Database Setup

Create the database and an application role in PostgreSQL, matching what
you put in `.env`:

```sql
CREATE DATABASE gamecock_breeding_db;
CREATE USER gamecock_app WITH PASSWORD 'change-me';
GRANT ALL PRIVILEGES ON DATABASE gamecock_breeding_db TO gamecock_app;
```

## Migration

```bash
venv/Scripts/python.exe manage.py migrate
```

If you change a model, always verify before applying:

```bash
venv/Scripts/python.exe manage.py makemigrations <app> --check --dry-run
venv/Scripts/python.exe manage.py makemigrations <app>
venv/Scripts/python.exe manage.py migrate
```

Create an admin account:

```bash
venv/Scripts/python.exe manage.py createsuperuser
```

## Run

```bash
venv/Scripts/python.exe manage.py runserver
```

The API is served under `/api/v1/`; the Django admin is at `/admin/`.

## API Documentation

Once the server is running:

- Swagger UI — `/api/v1/docs/`
- Redoc — `/api/v1/redoc/`
- Raw OpenAPI schema — `/api/v1/schema/`

Top-level resource groups: `auth/`, `breeders/`, `hens/`, `bookings/`,
`payments/`, `breeding-events/` & `eggs/`, `hatchings/`, `chicks/`,
`health-records/`, `vaccinations/`, `documents/`, `notifications/`,
`dashboard/`, `reports/*`, `search/`.

## Testing

The test suite requires a real PostgreSQL connection (no SQLite fallback) —
Postgres row locking is exercised directly by several tests.

```bash
venv/Scripts/python.exe -m pytest apps                # whole suite
venv/Scripts/python.exe -m pytest apps/bookings        # one app
venv/Scripts/python.exe -m pytest apps/bookings/tests.py::BookingCRUDTests::test_customer_can_create_booking
```

**Never run two `pytest` invocations concurrently** — they race on
creating/tearing down the same Postgres test database and produce spurious
failures. The full suite takes several minutes; a few tests
(`ConcurrentBookingTests`, `apps/core/tests/test_running_number.py`'s
concurrency test, `DocumentConcurrencyTests`) use `TransactionTestCase` with
real Python threads and `select_for_update()` to prove locking actually
serializes concurrent requests, so they need a real database, not mocks.

## Deployment

Two supported paths — pick one:

### Docker (recommended)

```bash
cp .env.example .env   # fill in real values
docker compose up --build -d
docker compose exec web python manage.py migrate
docker compose exec web python manage.py createsuperuser
```

This starts the app (Gunicorn) and a PostgreSQL 16 container together — see
[`Dockerfile`](Dockerfile) and [`docker-compose.yml`](docker-compose.yml). Set
`DJANGO_DEBUG=False` (or leave it unset) in `.env` for these deployments; the
app then automatically turns on `SECURE_SSL_REDIRECT`, secure cookies, and
HSTS (see `config/settings.py`'s "Production security hardening" block) —
put a TLS-terminating reverse proxy (e.g. nginx, or your cloud LB) in front.

### Manual (systemd + Gunicorn + nginx)

1. Provision Python 3.12, PostgreSQL, and (for correctly-rendered Thai text
   on generated PDFs) a Thai-capable font — `apt install fonts-thai-tlwg` on
   Debian/Ubuntu, or drop a properly licensed `.ttf` at
   `apps/documents/fonts/Thai.ttf`.
2. `pip install -r requirements.txt gunicorn`, set up `.env` with
   `DJANGO_DEBUG=False`, run `manage.py migrate` and `manage.py collectstatic`.
3. Run the app under Gunicorn, e.g.
   `gunicorn config.wsgi:application --bind 127.0.0.1:8000 --workers 3`
   (wire this into a systemd unit for process supervision).
4. Put nginx (or another reverse proxy) in front to terminate TLS and proxy
   to Gunicorn; serve `/static/` and `/media/` directly from nginx.
5. Set `DJANGO_ALLOWED_HOSTS` to your real domain(s) and `CORS_ALLOWED_ORIGINS`
   to your frontend's origin.

### Operational notes

- `python manage.py retry_failed_notifications` retries FAILED LINE
  notifications in batch — there is no background task queue in this
  project, so schedule this via cron (or run it manually) if you want
  automatic retry beyond the ADMIN-triggered
  `POST /api/v1/notifications/{id}/retry/` action.
- Migrations are applied with plain `manage.py migrate` — there is no
  separate migration-runner step in the Docker image; run it once after the
  containers are up (see above).
