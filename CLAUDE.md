# LastTouch — project brief for Claude Code

> Agents can do everything — except the last touch.

LastTouch is an open-source TypeScript library that lets a website require a
**real human's physical touch** (Touch ID / Face ID / Windows Hello, via WebAuthn
user verification) before a sensitive action goes through — checkout, delete
account, transfer money. AI browser agents can browse, pick seats and fill forms,
but they cannot press the human's fingerprint sensor.

Flagship use case: **ticket sellers** who want fans, not agents and scripts, to
complete the purchase.

Read `docs/MILESTONES.md` for the current plan. Work one milestone at a time.

---

## Principles (do not violate)

1. **Never annoy humans.** Gate only the sensitive action, never page views or
   browsing. The human cost of a gate is one touch, about one second.
2. **Enforce on the server.** The client script is UX only. Every protected
   endpoint must verify a LastTouch token server-side. A front-end-only gate is a
   bug.
3. **Bind to the exact action.** A verification is valid for one action with one
   set of parameters (e.g. `checkout` for event 42, seats A1+A2), once, for a
   short time. It can never be reused for a different action or different
   parameters.
4. **Accessibility is non-negotiable.** Screen readers, voice control and switch
   access must work. No hidden honeypot links, no invisible traps, no
   timing-based blocking of humans. Passkey prompts are OS-native and accessible;
   keep our own UI accessible too (labels, `aria-live` status, focus handling).
5. **Help agents stop gracefully.** When an agent hits a gate, return a clear,
   structured, machine-readable response so a cooperative agent can hand control
   back to its human instead of retrying.
6. **Be honest about limits.** Do not claim to stop determined adversaries (e.g.
   people paid to tap fingerprints on many phones). LastTouch raises the cost of
   automation from "write a script" to "pay humans". Docs must say so.
7. **Do not roll our own crypto.** Use `@simplewebauthn/server` and
   `@simplewebauthn/browser`. Check their current docs for exact API names before
   writing code.

---

## Repository layout

pnpm workspace monorepo, TypeScript strict mode everywhere.

```
lasttouch/
├── packages/
│   └── lasttouch/          # the library, published to npm as `lasttouch`
│       ├── src/server/     # entry: `lasttouch/server`
│       ├── src/client/     # entry: `lasttouch/client`
│       ├── src/shared/     # types, canonical JSON, error codes
│       └── test/
├── apps/
│   └── demo/               # Next.js (App Router) fictional ticket site, deployed to Vercel
├── docs/
│   └── MILESTONES.md
├── CLAUDE.md
├── README.md
└── LICENSE                 # MIT
```

---

## How it works

### Enrollment (once per account)

1. The user signs up and registers a passkey (`userVerification: "required"`).
2. Store the credential (id, public key, counter, transports) against the user.
3. **Adding another passkey later requires a LastTouch verification with an
   existing passkey** (action `add-passkey`). Otherwise an agent could register
   its own virtual authenticator and sign for itself.

### The gate (every sensitive action)

```
Browser                         Server
-------                         ------
click [data-lasttouch=checkout]
  POST /lasttouch/challenge {action, params}  →  1. canonicalize params
                                                 2. nonce = random 32 bytes
                                                 3. challenge = SHA-256(nonce ‖ userId ‖ action ‖ canonicalJSON(params))
                                                 4. store {nonce, userId, action, paramsHash} with TTL 120s
  ← WebAuthn request options
navigator.credentials.get()  → OS shows Touch ID / Face ID
  POST /lasttouch/verify {assertion}          →  5. verify assertion (origin, rpID, challenge, counter)
                                                 6. require the UV flag = true
                                                 7. delete challenge (single use)
                                                 8. issue token: random, single use, TTL 60s,
                                                    stored with {userId, action, paramsHash}
  ← {token}
POST /api/checkout {params} + header `LastTouch-Token`
                                              →  9. requireLastTouch("checkout", params-from-the-real-request)
                                                10. atomically consume token; compare userId, action, paramsHash
                                                11. pass → run handler; fail → 403 human_required
```

Key points:
- The WebAuthn challenge itself commits to the action and params, so the
  signature is cryptographically bound to what the human approved.
- In step 9 the server recomputes the params from the **actual request body**.
  It must never trust a params hash sent by the client.
- Token consumption must be atomic (e.g. Redis `GETDEL`) to prevent double use.

### Storage

Define a small `LastTouchStore` interface (get / set with TTL / atomic consume /
credential CRUD). Ship two adapters:
- `memoryStore()`: for local dev and tests.
- `redisStore()`: works with Upstash Redis, used by the Vercel demo.

### Agent signals (cooperative layer)

There is no standard yet, so this is LastTouch's proposed, versioned format.
Keep it minimal.

- `GET /.well-known/agent-policy.json`
  ```json
  {
    "version": "0.1",
    "humanRequired": [
      { "action": "checkout", "path": "/api/checkout", "method": "POST" }
    ],
    "docs": "https://github.com/ItsLucasLi/lasttouch"
  }
  ```
- `<meta name="agent-policy" content="/.well-known/agent-policy.json">` in pages.
- Gated elements carry `data-lasttouch="<action>"`. That attribute is also a
  machine-readable hint to agents.
- Rejections: HTTP 403 with header `LastTouch: human-required` and body
  ```json
  {
    "error": "human_required",
    "action": "checkout",
    "message": "This step must be completed by a person. Please hand control back to your user."
  }
  ```

Never place natural-language "AI, do not proceed" text in the page as a
defense. Agents are trained to treat page text as untrusted, and it reads like
prompt injection.

---

## Public API (target shape — keep it this small)

```ts
// server
import { createLastTouch, memoryStore } from "lasttouch/server";

const lt = createLastTouch({
  rpID: "localhost",
  rpName: "Nightjar Live",
  origin: "http://localhost:3000",
  store: memoryStore(),
  getUserId: async (req) => /* your session lookup */,
});

lt.handlers;                 // { registerOptions, registerVerify, challenge, verify }
await lt.require(req, "checkout", params); // throws LastTouchError("human_required" | ...)
lt.agentPolicy();            // JSON for /.well-known/agent-policy.json

// client
import { lastTouch } from "lasttouch/client";

lastTouch.bind();            // auto-wires every [data-lasttouch] element
const token = await lastTouch.confirm({ action: "checkout", params });
```

### Errors

Use a typed `LastTouchError` with a `code`:
`human_required`, `challenge_expired`, `token_invalid`, `params_mismatch`,
`uv_missing`, `no_passkey`, `unsupported_browser`.
User-facing copy must be short and plain, e.g. "Touch ID didn't complete. Try
again."

### Unsupported browsers / no passkey

The default is to deny, with a clear message and a link to set up a passkey. Do
not add email or SMS fallbacks in the core (an agent with inbox access defeats
them). Sites may add their own fallback at their own risk; document this.

---

## Demo app: "Nightjar Live" (fictional)

- A clearly fictional ticket seller with a persistent top banner: "Demo — not a
  real ticket seller."
- Flow: create a demo account → register a passkey → browse a fictional concert →
  pick seats → checkout gated by LastTouch → confirmation.
- A page `/try-your-agent` invites visitors to point their AI browser agent at
  the site and watch it stop at checkout.
- Per-account ticket limit (4) to show the account-level layer.
- Design: restrained and editorial. Black, white and gray, with one accent color
  used only for focus, active and selected states. Flat structure, thin
  dividers, no heavy shadows or giant rounded cards. Motion 120–220 ms. No fake
  or non-functional controls.

---

## Development environment

- Development happens in **cloud Claude Code** (claude.ai/code). The owner can't
  open `localhost` from there, and the cloud has no fingerprint sensor.
- Automated checks run in the cloud: unit tests, plus Playwright with a virtual
  authenticator.
- Human testing (real Touch ID / Face ID) happens on **Vercel preview
  deployments**. Every branch or PR gets an HTTPS preview URL.
- Therefore `rpID` and `origin` must come from environment variables, never be
  hard-coded. On Vercel, derive them from `VERCEL_BRANCH_URL` / `VERCEL_URL`,
  falling back to `localhost`. Passkeys are tied to a domain, so a passkey made
  on one preview URL won't work on another. That is expected.
- Work on a branch per milestone and open a PR when it is done. The owner tests
  the preview link, then merges.

---

## Engineering standards

- TypeScript `strict`; no `any` in library code.
- Tests: Vitest for the library. Security-relevant code (challenge binding,
  token consumption, params mismatch, expiry, UV flag) must have deterministic
  tests, with time injected via a clock function and no real sleeps.
- E2E: Playwright on the demo. Use Playwright's CDP virtual authenticator to
  simulate the human. Include a test showing that a virtual authenticator **not**
  enrolled on the account cannot pass the gate.
- Small, additive changes. No broad rewrites. No new dependencies without saying
  why.
- Never commit secrets. Use `.env.local` and `.env.example`.
- At the end of each milestone: run lint, typecheck and tests, then summarize
  what changed and how to test it by hand, and stop for review.
