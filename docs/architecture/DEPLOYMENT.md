# Single-host deployment reference (Phase 6)

This is a self-hosted reference, not evidence of a public deployment. The Compose file builds Expo Web and NestJS from the same commit, runs PostgreSQL 17, applies committed Prisma migrations once, and serves HTTPS through Caddy. The API remains the only process permitted to read the database or document volume. Keep one API replica: its in-process 15-minute notification sweep and rate limit are not distributed. The baseline notification channel is in-app. External email requires verified SMTP delivery and user opt-in; push delivery is not implemented.

The production API is private to the Compose network. `TRUST_PROXY_HOPS=1` trusts only Caddy's immediate forwarded client address for authentication and rate limiting. Do not publish port 3000 directly or add another proxy hop without reviewing this setting and Caddy's trusted-proxy configuration.

## Prepare

1. Point a domain's DNS A/AAAA record to the host; permit inbound TCP 80/443 and UDP 443. Install Docker Engine with Compose v2. Protect the host and backups.
2. `cp deploy/.env.production.example deploy/.env.production`, replace the domain, database password, long random auth secret and SMTP settings. The API rejects the example credential strings and short database passwords at startup; this check does not prove that replacement secrets are random. Keep this file out of Git and set owner-only permissions. Keep `AI_PROVIDER=mock` until a server-only key and per-request consent have been verified. Only `EXPO_PUBLIC_API_URL` enters the web bundle; the build argument is the public HTTPS origin. Never put secrets in `EXPO_PUBLIC_*`.
3. Use a URL-safe random database password, or percent-encode special characters in the `DATABASE_URL` expression before deploying. Set `SMTP_MODE=starttls` or `tls` with a real host; keep `FINORA_REMINDER_EMAIL_ENABLED=false` until delivery is tested. Local document storage is a persistent Docker volume; back it up with the database.
4. Run `docker compose --env-file deploy/.env.production -f deploy/compose.production.yaml config --quiet` and inspect the resolved config without publishing its secrets. Then run `docker compose --env-file deploy/.env.production -f deploy/compose.production.yaml up -d --build --wait`. The `migrate` service must exit successfully before the API starts.
5. Check `https://<domain>/health`, the web login, registration, owner-scoped document access, OCR with Vietnamese and English test files, and in-app reminders. Check TLS and Caddy certificate logs. The API health endpoint verifies database reachability; it does not prove SMTP, OCR, LLM or reminder delivery. Test those separately before inviting users.

The API image includes `pdftotext`, `pdftoppm`, Tesseract and Vietnamese/English traineddata. `DOCUMENT_OCR_LANGS=vie+eng` is set by the image. The process runs as the non-root `node` user. The document and database volumes survive `docker compose down`. Do not run `down -v` against user data. Caddy's certificate data is also persistent.

## Backups and recovery

Schedule an encrypted, access-controlled daily `pg_dump -Fc` plus a copy of the `document_data` volume. Keep at least one off-host copy and a retention policy approved by the operator. For example, from an authorized host shell, stream `docker compose --env-file deploy/.env.production -f deploy/compose.production.yaml exec -T postgres sh -c 'pg_dump -Fc -U "$POSTGRES_USER" "$POSTGRES_DB"'` into a timestamped file on encrypted storage. Never put a database password in the command or log. Test restoration into a separate database and verify documents, migrations, auth and ownership before considering the backup usable. Recovery into an existing production database is an interactive operator action, not part of startup.

## Operations and limits

- JSON application logs use Pino with coarse request/provider metadata. Route them to a restricted retention system; do not add prompts, cookies, tokens or document text. No external error-monitoring service is configured.
- Scale the API only after moving its per-user rate counter and reminder scheduler to shared, atomic infrastructure. One API replica with `restart: unless-stopped` is the supported shape of this reference.
- Rebuild the web image when its public API origin changes. Native app binaries need their own signed build and device verification; this Compose setup serves only Expo Web.
- Production SMTP, public TLS, DNS, load, backup restore, native device behavior and hosted AI remain deployment checks. A successful local image build or Compose syntax check does not establish production readiness.
