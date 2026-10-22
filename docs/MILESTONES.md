# LastTouch — milestones

Each milestone is a vertical slice that ends in something you can run and test
by hand. Finish one, review it, then start the next.

---

## M0 — Repo skeleton

**Goal:** an empty but working monorepo.

- [ ] pnpm workspace with `packages/lasttouch` and `apps/demo`
- [ ] TypeScript strict, ESLint, Prettier, Vitest configured
- [ ] Next.js App Router app in `apps/demo` that imports a placeholder from `lasttouch`
- [ ] Root scripts: `pnpm dev`, `pnpm test`, `pnpm lint`, `pnpm typecheck`
- [ ] MIT `LICENSE`, `.gitignore`, `.env.example`
- [ ] GitHub Actions CI running lint, typecheck and test

- [ ] `vercel.json` (or Vercel project settings documented in the PR) so `apps/demo` deploys from the monorepo

**Done when:** `pnpm dev` works, CI is green, and the PR's Vercel preview URL
shows the placeholder demo page.

---

## M1 — Core library: enrollment and gate

**Goal:** the security core, fully tested, with no UI polish.

- [ ] `shared/`: canonical JSON (stable key order), params hashing, `LastTouchError` and its codes
- [ ] `LastTouchStore` interface and `memoryStore()`
- [ ] Passkey registration options and verify (`userVerification: "required"`)
- [ ] Challenge endpoint: action-bound challenge, `SHA-256(nonce ‖ userId ‖ action ‖ params)`, TTL 120s
- [ ] Verify endpoint: check the UV flag, single-use challenge, issue a token (TTL 60s)
- [ ] `lt.require(req, action, params)`: atomic token consume and params comparison
- [ ] "Add another passkey" itself requires a LastTouch verification
- [ ] Client: `lastTouch.confirm()` and `lastTouch.bind()` for `[data-lasttouch]`
- [ ] Unit tests: happy path, expired challenge, reused token, params mismatch,
      wrong action, UV flag false, another user's token

**Done when:** all tests pass, and a bare test page in the demo can register a
passkey on your Mac and gate one button with Touch ID.

---

## M2 — Demo: Nightjar Live (fictional ticket site)

**Goal:** the thing people will actually try.

- [ ] Banner on every page: "Demo — not a real ticket seller"
- [ ] Demo sign-up with a simple session, then register a passkey
- [ ] Event page → seat picker → cart → checkout gated by `data-lasttouch="checkout"`
- [ ] `POST /api/checkout` protected by `lt.require` using the real request params
- [ ] Per-account limit of 4 tickets
- [ ] Confirmation page
- [ ] Clear, accessible states: waiting for Touch ID, cancelled, expired, no passkey
- [ ] Restrained design per CLAUDE.md, working on mobile Safari (Face ID)

**Done when:** you can buy fictional tickets on your Mac (Touch ID) and iPhone
(Face ID). Calling `/api/checkout` directly with curl returns 403
`human_required`.

---

## M3 — Agent layer and real-world testing

**Goal:** prove it works against real agents, and help them stop gracefully.

- [ ] `/.well-known/agent-policy.json` and `<meta name="agent-policy">`
- [ ] 403 responses carry the `LastTouch: human-required` header and JSON body
- [ ] Gate UI shows a plain message an agent can read and relay: "This step needs the person"
- [ ] `/try-your-agent` page explaining the challenge
- [ ] Playwright E2E with a CDP virtual authenticator: an enrolled authenticator
      passes; a non-enrolled authenticator fails; a request with no token fails
- [ ] Manual test with a real browser agent (e.g. Claude in Chrome): it picks
      seats, stops at checkout and hands back to you. Record this as the README GIF.
- [ ] `redisStore()` (Upstash) and deploy the demo to Vercel

**Done when:** the demo is live on a `*.vercel.app` URL, and the agent test is
recorded.

---

## M4 — Launch

**Goal:** something other developers can install in 10 minutes.

- [ ] README: GIF, quickstart, threat model, limits, accessibility notes
- [ ] Next.js helper (route handlers and middleware) and a React `<LastTouchButton>`
- [ ] Docs: integration guide, security model, FAQ ("Why not CAPTCHA?", "What about screen readers?")
- [ ] `SECURITY.md` (how to report vulnerabilities) and `CONTRIBUTING.md`
- [ ] Changesets and publish `lasttouch@0.1.0` to npm
- [ ] Launch post on X

**Done when:** a fresh Next.js app can follow the README and gate a button in
under 10 minutes.

---

## Later (not v1)

- Fairness waiting room (randomized queue at sale start)
- Private Access Token signal for account sign-up
- Adapters for Express, Hono, SvelteKit
- Optional Web Bot Auth signature check to recognize signed agents early
