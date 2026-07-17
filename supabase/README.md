# Supabase persistence

This directory contains the production persistence schema for the multi-tenant operation platform.

## Boundary

- Supabase Auth is the source of truth for user identity.
- `tenants` and `tenant_members` define tenant access.
- `tenant_configurations` preserves the current atomic menu, shell, and role aggregate as JSONB.
- `workbench_layouts` and `user_tenant_preferences` remain tenant/user scoped; the latter stores the active role and visualization theme.
- `org_review_applications`, `gate_device_groups`, and `gate_devices` store tenant-scoped business data behind RLS.
- Every browser-exposed table has RLS enabled. Raw localStorage migration snapshots live in the private schema.
- Personal workbench layouts and active-role preferences require both record ownership and tenant access.
- New Supabase Auth users receive a basic `profiles` row automatically; tenant membership is still assigned separately.
- In Supabase mode, the member account field is the Auth login email. `replace_tenant_members` resolves the exact email inside the database transaction and stores the stable `auth_user_id`; it does not expose the Auth user directory to the browser.

## Apply

Link the repository to the target Supabase project, then apply migrations:

```bash
npx supabase login
npx supabase link --project-ref <project-ref>
npx supabase db push
```

Do not commit the database password, access token, service-role key, or exported browser snapshot.

## Browser runtime

Only these values are browser-safe:

```bash
VITE_DATA_BACKEND=supabase
VITE_SUPABASE_URL=https://<project-ref>.supabase.co
VITE_SUPABASE_PUBLISHABLE_KEY=<publishable-key>
```

The browser never receives the database password or secret key. Normal Playwright tests force `VITE_DATA_BACKEND=local`; the opt-in integration test uses server-only credentials only in the Playwright process:

```bash
set -a && source .env.local && set +a
npm run test:e2e:supabase
```

The Dia snapshot is exported through **System management → Organization management → Export local data**. It contains all `operation-platform:*` localStorage records and is intended only as one-time migration input.

After the schema is applied, import the snapshot with server-only credentials:

```bash
SUPABASE_URL=https://<project-ref>.supabase.co \
SUPABASE_SECRET_KEY=<server-only-key> \
MIGRATION_AUTH_USER_ID=<optional-auth-user-uuid> \
MIGRATION_LEGACY_USER_ID=<optional-legacy-user-id> \
node scripts/import-local-storage-to-supabase.mjs /path/to/snapshot.json
```

`MIGRATION_AUTH_USER_ID` links the snapshot's current-user records to a real Supabase Auth user. The script infers the legacy ID when the snapshot contains one active-role user. Set `MIGRATION_LEGACY_USER_ID` explicitly only when a snapshot contains multiple users. If the Auth user ID is omitted, the data is imported but remains unlinked until an Auth user is assigned.
