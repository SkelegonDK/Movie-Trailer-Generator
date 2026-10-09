import { defineConfig } from "vite"
import { readFileSync, writeFileSync, rmSync } from "node:fs"
import vinext from "vinext"
import { cloudflare } from "@cloudflare/vite-plugin"

// vinext generates Next-shaped route types while configuring a build. Preserve
// Next's own generated files so switching targets cannot invalidate `tsc`/next dev.
const generated = ["next-env.d.ts", ".next/types/routes.d.ts"].map(file => {
  try { return { file, content: readFileSync(file) } } catch { return { file, content: null } }
})

export default defineConfig({
  // Never read a developer's local Next.js API keys during a cloud build.
  envDir: false,
  plugins: [vinext(), {
    name: "preserve-next-generated-types",
    config: { order: "post", handler(_, context) {
      if (context.command === "build") for (const { file, content } of generated) {
        if (content) writeFileSync(file, content); else rmSync(file, { force: true })
      }
    } },
  }, cloudflare({
    configPath: process.env.TRAILER_CLOUDFLARE_CONFIG || "wrangler.jsonc",
    viteEnvironment: { name: "rsc", childEnvironments: ["ssr"] },
  })],
})
