// Keep Workers declarations scoped to this entry; Next.js also uses DOM types.
declare module "cloudflare:workers" {
  class DurableObject<Env = unknown> {
    protected ctx: import("@cloudflare/workers-types").DurableObjectState
    protected env: Env
    constructor(ctx: import("@cloudflare/workers-types").DurableObjectState, env: Env)
  }
}
