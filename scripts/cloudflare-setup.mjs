#!/usr/bin/env node
import { spawnSync } from "node:child_process"
import { readFile, writeFile, mkdir, stat, readdir, realpath } from "node:fs/promises"
import path from "node:path"
import { fileURLToPath } from "node:url"

const root = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "..")
export function parseOptions(args) {
  const options = { mode: "plan" }
  for (let i = 0; i < args.length; i++) {
    const arg = args[i]
    if (["--deploy", "--prepare", "--dry-run"].includes(arg)) {
      if (options.mode !== "plan") throw new Error("Choose only one execution mode")
      options.mode = arg.slice(2)
    } else if (["--account", "--name", "--password-file", "--origin"].includes(arg)) {
      if (!args[i + 1] || args[i + 1].startsWith("--")) throw new Error(`${arg} requires a value`)
      const key = arg.slice(2); if (options[key]) throw new Error(`Duplicate ${arg}`)
      options[key] = args[++i]
    } else throw new Error(`Unknown option ${arg}`)
  }
  if (!options.name || !/^[a-z][a-z0-9-]{2,39}$/.test(options.name) || options.name.endsWith("-")) throw new Error("--name must be 3–40 lowercase letters, digits or hyphens, starting with a letter")
  if (!options.account || !/^[a-f0-9]{32}$/i.test(options.account)) throw new Error("--account must be your explicit 32-character Cloudflare account ID")
  if (options.mode === "deploy" && !options.origin) throw new Error("--deploy requires --origin https://<worker-name>.<your-subdomain>.workers.dev from your Cloudflare dashboard")
  if (options.origin) {
    let origin
    try { origin = new URL(options.origin) } catch { throw new Error("Invalid --origin") }
    const parts = origin.hostname.split(".")
    if (origin.protocol !== "https:" || origin.username || origin.password || origin.port || origin.search || origin.hash || origin.pathname !== "/" || parts.length !== 4 || parts[0] !== options.name || !/^[a-z0-9](?:[a-z0-9-]{0,61}[a-z0-9])?$/.test(parts[1]) || parts.slice(2).join(".") !== "workers.dev") throw new Error("--origin must be this Worker's canonical HTTPS workers.dev origin")
    options.origin = origin.origin
  }
  options.bucket = `${options.name}-archive`
  return options
}
export function safeEnvironment(env, account) {
  const clean = { ...env, CLOUDFLARE_ACCOUNT_ID: account, WRANGLER_SEND_METRICS: "false", NO_COLOR: "1", CI: "true", CLOUDFLARE_LOAD_DEV_VARS_FROM_DOT_ENV: "false" }
  for (const key of Object.keys(clean)) if (/^(OPENROUTER_|ELEVENLABS_|TRAILER_ACCESS_PASSWORD|VITE_|NEXT_PUBLIC_)/.test(key)) delete clean[key]
  return clean
}
export async function setup(options, dependencies = {}) {
  const workRoot = dependencies.root || root
  const log = dependencies.log || console.log
  const env = safeEnvironment(dependencies.env || process.env, options.account)
  const command = dependencies.command || ((tool, args, input) => {
    const result = spawnSync(path.join(workRoot, "node_modules", ".bin", tool), args, { cwd: workRoot, env, input, encoding: "utf8", maxBuffer: 16 * 1024 * 1024 })
    if (result.status !== 0) {
      const error = new Error(`${tool} ${args[0]} failed; verify login, account permissions and tool configuration`)
      if (args[0] === "secret" && args[1] === "list" && /Worker "[a-z0-9-]+" not found\./.test(result.stderr + result.stdout)) error.code = "WORKER_NOT_FOUND"
      throw error
    }
    return result.stdout
  })
  log(`Account: ${options.account}\nWorker: ${options.name}\nPrivate R2 bucket: ${options.bucket}\nCanonical origin: ${options.origin || "local preview only; required for deploy"}\nDurable Object: ArchiveCoordinator (one deployment-wide archive)\nMode: ${options.mode}`)
  if (options.mode === "plan") {
    log("No files changed or cloud commands run. Use --dry-run for a local build, --prepare for local configuration, or --deploy to publish.")
    return
  }
  // Static assets are uploaded verbatim. Refuse files likely to contain local secrets.
  async function scan(directory) {
    for (const entry of await readdir(directory, { withFileTypes: true })) {
      if (entry.isSymbolicLink() || entry.name.startsWith(".") || /\.(pem|key|p12)$/i.test(entry.name)) throw new Error("Remove private or hidden files and symlinks from public/ before a cloud build")
      if (entry.isDirectory()) await scan(path.join(directory, entry.name))
    }
  }
  await scan(path.join(workRoot, "public"))
  const directory = path.join(workRoot, ".cloudflare", options.name)
  await mkdir(directory, { recursive: true })
  const config = JSON.parse(await readFile(path.join(workRoot, "wrangler.jsonc"), "utf8"))
  config.name = options.name; config.account_id = options.account
  config.main = "../../cloudflare/worker.ts"; config.$schema = "../../node_modules/wrangler/config-schema.json"
  config.r2_buckets[0].bucket_name = options.bucket
  if (options.origin) config.vars.TRAILER_PUBLIC_ORIGIN = options.origin
  const configPath = path.join(directory, "wrangler.json")
  await writeFile(configPath, JSON.stringify(config, null, 2) + "\n")
  env.TRAILER_CLOUDFLARE_CONFIG = configPath
  if (options.mode === "prepare") { log(`Local configuration ready: ${path.relative(workRoot, configPath)}`); return }
  await command("vite", ["build", "--config", "vite.cloudflare.config.ts"])
  const builtConfig = path.join(workRoot, "dist", "server", "wrangler.json")
  const built = JSON.parse(await readFile(builtConfig, "utf8"))
  if (built.name !== options.name || built.account_id !== options.account || built.assets?.run_worker_first !== true || built.r2_buckets?.[0]?.bucket_name !== options.bucket || (options.origin && built.vars?.TRAILER_PUBLIC_ORIGIN !== options.origin)) throw new Error("Built deployment configuration does not match the reviewed plan")
  await command("wrangler", ["deploy", "--dry-run", "--config", builtConfig])
  if (options.mode === "dry-run") { log("Local build and Wrangler upload validation passed. Nothing was published."); return }
  // Require explicit credentials or a previous `wrangler login`; never initiate a login flow here.
  await command("wrangler", ["whoami", "--config", configPath])
  // Cloudflare API read is account-scoped and contains no secret values.
  let secrets
  try { secrets = JSON.parse(await command("wrangler", ["secret", "list", "--name", options.name, "--format", "json", "--config", configPath])) }
  catch (error) { if (error.code !== "WORKER_NOT_FOUND") throw error; secrets = [] }
  if (secrets.some(s => /^(OPENROUTER_|ELEVENLABS_)/.test(s.name))) throw new Error("Remove hosted provider keys before using this browser-key-only deployment")
  const existing = secrets.some(s => s.name === "TRAILER_ACCESS_PASSWORD")
  let password
  if (!existing) {
    if (!options["password-file"]) throw new Error("First deployment requires --password-file with a strong password; existing passwords are preserved")
    const passwordPath = await realpath(path.resolve(options["password-file"]))
    if (passwordPath === workRoot || passwordPath.startsWith(workRoot + path.sep)) throw new Error("Keep the password file outside the repository")
    const info = await stat(passwordPath)
    if (!info.isFile() || (process.platform !== "win32" && (info.mode & 0o077))) throw new Error("Password file must be a regular private file (chmod 600)")
    password = (await readFile(passwordPath, "utf8")).replace(/\r?\n$/, "")
    if (password.length < 20 || password.length > 256 || !/^[\x21-\x7e]+$/.test(password)) throw new Error("Password must have 20–256 printable ASCII characters without spaces")
  } else if (options["password-file"]) throw new Error("Existing password is preserved; use wrangler secret put explicitly to rotate it")
  // Listing first prevents overwriting/recreating an existing bucket. No public access or lifecycle deletion is enabled.
  const bucketOutput = await command("wrangler", ["r2", "bucket", "list", "--config", configPath])
  // Pinned Wrangler emits labelled text (there is no JSON flag for this command).
  const names = [...bucketOutput.matchAll(/^name:\s*([a-z0-9-]+)\s*$/gm)].map(match => match[1])
  if (!names.includes(options.bucket)) await command("wrangler", ["r2", "bucket", "create", options.bucket, "--config", configPath])
  await command("wrangler", ["deploy", "--config", builtConfig])
  // A first deployment fails closed until this succeeds. Never pass a secret as a shell argument or print it.
  if (password) await command("wrangler", ["secret", "put", "TRAILER_ACCESS_PASSWORD", "--name", options.name, "--config", configPath], password)
  log("Deployment complete. Sign in as studio. Use your own provider keys in Settings. Existing archive data and secrets were preserved.")
}
if (process.argv[1] && path.resolve(process.argv[1]) === fileURLToPath(import.meta.url)) {
  try { await setup(parseOptions(process.argv.slice(2))) }
  catch (error) { console.error(error.message); process.exitCode = 1 }
}
