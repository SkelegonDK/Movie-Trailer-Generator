# Deploy a private Trailer Studio to Cloudflare

The optional Cloudflare target runs the existing App Router application with pinned **vinext + Workers**. The usual `bun run dev`, `build`, and `start` commands still use Next.js. Cloudflare's [Next.js guide](https://developers.cloudflare.com/workers/framework-guides/web-apps/nextjs/) recommends vinext for new Workers deployments; the framework is evolving, so test this target before upgrading its pinned packages.

## Plan first

Install Node.js 22.12+ and Bun, clone the repo and run `bun install --frozen-lockfile`. Use a dedicated Worker name that you own, and copy your account ID from the Cloudflare dashboard:

```sh
bun run cloudflare:setup --name my-trailer-studio --account YOUR_32_CHARACTER_ACCOUNT_ID
```

This default command prints the account, Worker, private R2 bucket and execution mode. It makes **no cloud calls and no file changes**. R2 uses `<worker-name>-archive`; each Worker has its own Durable Object namespace. Using a different name creates a separate studio and archive. Do not reuse names belonging to another application.

Run a build and Wrangler's local upload validation without publishing:

```sh
bun run cloudflare:setup --name my-trailer-studio --account YOUR_32_CHARACTER_ACCOUNT_ID --dry-run
```

Generated configuration lives under ignored `.cloudflare/`; build output and local Workers state are also ignored. The script uses only the repository's pinned tools, never `npx` downloads.

## Preview locally

For the default local target, put a preview-only password in ignored `.dev.vars` at the repository root:

```text
TRAILER_ACCESS_PASSWORD="a-long-preview-only-password"
TRAILER_PUBLIC_ORIGIN="http://127.0.0.1:4178"
```

Then run:

```sh
bun run cloudflare:build
bun run cloudflare:preview
```

The Cloudflare plugin copies these local variables into ignored `dist/server/.dev.vars` at build time. After changing the file, rebuild. The default preview listens on port 4178. If you change the host or port, set `TRAILER_PUBLIC_ORIGIN` to that exact origin in `.dev.vars` and rebuild. Open the printed local URL and sign in with username **studio**. The password must have at least 20 characters. Missing or weak passwords return 503, including requests for JavaScript, music, images and archive files.

To exercise archive behavior in real local workerd, with no provider calls:

```sh
TRAILER_PREVIEW_PASSWORD='a-long-preview-only-password' node scripts/cloudflare-smoke.mjs
```

The smoke test defaults to port 4178; set `TRAILER_PREVIEW_URL` to your printed localhost URL. It writes and deletes a small test asset in local R2, leaving a tombstone. Local R2 and Durable Object state persist in `.wrangler/` across preview restarts. Do not delete that directory if you need those local test assets.

## Publish explicitly

Enable R2 in your own Cloudflare account and check current [R2 pricing](https://developers.cloudflare.com/r2/pricing/), [Workers pricing](https://developers.cloudflare.com/workers/platform/pricing/) and [Durable Object pricing](https://developers.cloudflare.com/durable-objects/platform/pricing/). Authentication and archive API requests execute Workers and may incur usage charges; the archive quota is not a billing cap.

Authenticate with the installed Wrangler:

```sh
bunx --no-install wrangler login
```

Alternatively set a scoped `CLOUDFLARE_API_TOKEN` in your shell. The token needs Worker deployment, R2 bucket management and account read permissions in the selected account. Never put it in a tracked file. The script never opens an interactive login or guesses an account.

For a first deployment, store a random password of 20–256 printable ASCII characters (without spaces) in a **private file outside this repository**, and `chmod 600` that file. Pass its path:

```sh
bun run cloudflare:setup --name my-trailer-studio --account YOUR_32_CHARACTER_ACCOUNT_ID --deploy --origin https://my-trailer-studio.YOUR_SUBDOMAIN.workers.dev --password-file /absolute/path/outside/repo/studio-password.txt
```

The required `--origin` is the canonical HTTPS workers.dev URL shown in your Cloudflare dashboard: this Worker name plus your account’s Workers subdomain. This explicit value is stored as the nonsecret `TRAILER_PUBLIC_ORIGIN` binding; the script does not guess a hostname or trust forwarded headers. Use lowercase subdomain text. Custom domains require a deliberate additional configuration and are not provisioned by this script.

Only `--deploy` creates a missing private bucket, publishes the Worker and uploads the password secret. The first published Worker rejects all traffic until secret installation succeeds. If installation fails, rerun with the same password file. The script never prints the password or passes it as a command argument.

For updates, keep the same `--origin` and omit `--password-file`: existing secrets and bucket contents are preserved. The script refuses an implicit password replacement. Rotate deliberately with `bunx --no-install wrangler secret put TRAILER_ACCESS_PASSWORD --name my-trailer-studio --config .cloudflare/my-trailer-studio/wrangler.json`.

The browser's built-in HTTP Basic sign-in uses username `studio`; deployment requests must use HTTPS. Everyone given this shared password can read and delete the shared archive. Deploy a separate Worker for people who should not share their data. This is a private studio, not a multi-user public service.

## Provider keys and operational limits

Cloud deployment uses keys supplied in each browser's Settings. The setup script strips local provider/password/public environment variables during the build, disables `.env` loading and refuses existing hosted provider-key secrets. It does not configure server provider keys. A local `.env.local` remains useful for the usual Next.js workflow, but should never be uploaded. Wrangler deploy does not publish local `.dev.vars`.

A Worker wrapper authenticates every request **before static asset routing**, with `assets.run_worker_first: true`. It intercepts both content and legacy audio archive routes so that Workers never write to the app's local filesystem archive.

R2 stores the private media; a SQLite Durable Object stores metadata, tombstones, reservations and quotas across deployments. One coordinator serializes mutations across Worker isolates; overlapping archive operations return 429 and can be retried. Successful repeated saves return the original asset, and deletion tombstones prevent a deleted browser asset from being resurrected. Tombstones are retained, including after repeated deletes.

Cloud limits deliberately differ from the local disk archive:

- Maximum **10 MB per upload**, including video; metadata is limited to **32 KB** per asset.
- At most **128 active assets** and **256 MB** total media. Delete assets to release quota.
- At most **2,048 retained asset IDs** over the deployment’s lifetime, counting active assets, pending uploads and permanent tombstones. Each upload reserves its eventual deletion marker. At capacity, new asset IDs and deletion of unknown IDs return 507; existing assets can still be deleted and existing deletions retried. Deleting assets frees media and active-item quota but does not free this lifetime ID capacity. Archive maintenance should be an explicit backup/migration, not automatic tombstone expiry.
- At most **two requests at once** to hosted generation endpoints, and **100 requests per UTC day** across the studio. Admissions are durable; rejected or failed generation requests still consume the daily budget. Interrupted concurrency leases expire after three minutes. Browser keys call providers directly and use the provider’s own limits; this budget covers server endpoints, not those direct browser calls.
- Failed sign-ins are limited to **20 per minute per hashed IP**, with a bounded 512-IP authentication window. Cloudflare supplies the client IP; raw IPs are not stored.

Uploads are buffered only within the 10 MB bound and one upload at a time to respect the Workers memory limit. Larger exported videos still download and stay in the browser library, but the server archive save fails with an explicit size error. Downloads stream from R2 and support HEAD, single byte ranges and attachment filenames.

Quota is reserved before media writes. A crashed/failed upload can leave a pending reservation and R2 object; retry the same asset to complete it, or delete its ID to release it. Deletion commits the tombstone before removing the R2 object, so a storage failure cannot expose the deleted asset again; retry deletion to finish releasing its bytes. Export/back up assets before deleting Cloudflare resources. Code rollback does not roll back R2 or Durable Object data.

Review the generated deployment configuration before publishing. Do not add public R2 access, server provider keys or an asset routing bypass. The script never deletes a cloud resource or publishes automatically during install/build.

## Optional Cloudflare Workers Builds integration

The setup script does not create or edit Cloudflare account build settings. An existing Git-connected Worker will keep using its configured command until its owner updates it. A failed existing Workers Builds check is separate from the local build validation above.

First provision the intended deployment with the explicit setup command and password secret. Then, in that Worker's dashboard, set its build command to the same `cloudflare:setup` command with the exact account, Worker and `--origin`, using **`--dry-run`**, and set its deployment command to `bunx --no-install wrangler deploy --config dist/server/wrangler.json`. Set **`BUN_VERSION=1.3.14`** and Node.js **22.12+** in the build environment, and install with `bun install --frozen-lockfile`. Older build images using Bun 1.2.15 cannot parse this repository’s current binary `bun.lockb` and fail before reaching the build command. This reuses the script's sanitized environment and generated configuration; it does not create the bucket or install a password during a build.

Keep `TRAILER_ACCESS_PASSWORD` as a Worker runtime secret, set through Wrangler outside build logs. Do not place provider keys, the studio password or a password file in build variables, repository secrets committed to Git, or static assets. The nonsecret canonical public origin is part of the generated Wrangler configuration. Existing remote secrets survive deployment, while missing secrets fail closed. Verify the dashboard's selected account and Worker name before enabling automatic deployments; a build command with a different name must not be used for an existing service.
