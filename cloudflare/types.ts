import type { R2Bucket, DurableObjectNamespace, Fetcher } from "@cloudflare/workers-types"
export interface CloudflareEnv {
  ARCHIVE_BUCKET: R2Bucket
  ARCHIVE: DurableObjectNamespace
  ASSETS: Fetcher
  TRAILER_ACCESS_PASSWORD?: string
  TRAILER_PUBLIC_ORIGIN?: string
}
