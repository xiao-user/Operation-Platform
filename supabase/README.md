# Supabase persistence

This directory contains the production persistence schema for the multi-tenant operation platform.

## Boundary

- Supabase Auth is the source of truth for user identity.
- `tenants` and `tenant_members` define tenant access.
- `tenant_configurations` preserves the current atomic menu, shell, and role aggregate as JSONB.
- `workbench_layouts` and `user_tenant_preferences` remain tenant/user scoped; the latter stores the active role and visualization theme.
- `calendar_events` stores personal tenant calendars, including start/end time, viewed time and completion/cancellation state; overdue is derived from `ends_at` instead of persisted.
- `org_review_applications`, `gate_device_groups`, and `gate_devices` store tenant-scoped business data behind RLS.
- `ai_conversations` and `ai_messages` store AI assistant history by tenant and authenticated user. The browser can read its own history and manage conversation titles, while message writes are owned by the authenticated Edge Function.
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

## AI assistant and DeepSeek

DeepSeek is called only by `supabase/functions/ai-assistant`. For local function development, fill in the ignored file:

```bash
supabase/functions/.env.local
```

The file has already been created with these names:

```bash
DEEPSEEK_API_KEY=
DEEPSEEK_MODEL=deepseek-v4-flash
DEEPSEEK_BASE_URL=https://api.deepseek.com
```

The function sends the authenticated Supabase user ID as DeepSeek `user_id` and uses the V4 non-thinking mode for predictable multi-turn history and lower interactive latency. DeepSeek SSE chunks are forwarded to the browser as `application/x-ndjson`; the assistant message stays `pending` during generation and is updated atomically to `completed` with the full Markdown response and token usage when the stream finishes.

Serve the function locally with:

```bash
npx supabase functions serve ai-assistant --env-file supabase/functions/.env.local
```

For the hosted Supabase project, upload the same server-only values through Edge Function secrets. Do not add them to a `VITE_*` variable:

```bash
npx supabase secrets set --env-file supabase/functions/.env.local
npx supabase functions deploy ai-assistant
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
