# LastTouch

**Agents can do everything — except the last touch.**

LastTouch lets your website require a real person's touch (Touch ID, Face ID,
Windows Hello) before a sensitive action goes through. AI browser agents can
browse, pick seats and fill in forms. The final step stays human.

> **Status:** early development. The API below is the target shape and may
> change before `0.1.0`.

<!-- TODO (M3): GIF — an agent picks seats, stops at checkout, the human taps Touch ID -->

---

## Why

AI browser agents now run inside people's real browsers, with their cookies,
IP and fingerprint. Traditional bot defenses can't tell them apart from humans,
and CAPTCHAs annoy everyone while AI solves them anyway.

LastTouch takes a different approach. It doesn't try to *guess* who is a bot.
It asks for the one thing an agent can't do: **a physical touch from the
person who owns the account.**

- **Humans:** one tap, about a second, only on the action that matters.
- **Agents:** stop at the gate and hand control back to their human.
- **Scripts:** need a real person present for every protected action.

Built first for **ticket sellers**, and useful anywhere an action should never
happen without a person: checkout, deleting an account, sending money,
changing a password.

## How it works

1. Each account enrolls a passkey once.
2. When someone clicks a protected button, the server issues a challenge bound
   to **that exact action and its parameters** (e.g. event 42, seats A1 + A2).
3. The browser asks for Touch ID / Face ID. The signed result proves a person
   approved *this* action.
4. The server issues a single-use, short-lived token. Your API checks it
   against the real request and rejects anything else.

Everything is enforced on the server. The client script only makes it smooth.

## Quickstart (planned)

```bash
npm install lasttouch
```

```html
<button data-lasttouch="checkout">Pay now</button>
```

```ts
import { createLastTouch, memoryStore } from "lasttouch/server";

const lt = createLastTouch({
  rpID: "example.com",
  rpName: "Example Tickets",
  origin: "https://example.com",
  store: memoryStore(),
  getUserId: async (req) => getSession(req).userId,
});

// In your checkout handler
await lt.require(req, "checkout", { eventId, seats });
```

## Friendly to well-behaved agents

LastTouch tells agents, in machine-readable form, which steps need a human:

- `/.well-known/agent-policy.json` lists the protected actions.
- Protected elements carry `data-lasttouch="<action>"`.
- Rejected requests get `403` with `{"error": "human_required"}`.

A cooperative agent can do the tedious part, then say *"I've picked your seats —
please confirm the purchase."*

## Threat model

| Who | Does LastTouch stop them? |
|---|---|
| Cooperative AI agents | Yes. They read the policy and hand back to the user. |
| AI browser agents acting for a user | Yes, at the protected step. The user must touch. |
| Scripts and headless bots | Yes. No enrolled passkey means no token. |
| Many people paid to tap on many devices | **No.** That needs ID checks or real-name ticketing. LastTouch raises the cost from "write a script" to "pay people". |

Other limits, stated plainly:
- Synced passkeys usually don't prove *which* device signed, so mass account
  creation still needs your usual limits (phone verification, purchase caps).
- Browsers or devices without passkey support are denied by default.

## Accessibility

LastTouch does not use hidden traps, honeypot links or timing checks, because
those break screen readers and other assistive tools. Passkey prompts are
native OS dialogs that work with assistive technology.

## Demo

**Nightjar Live** is a fictional ticket site for trying LastTouch, and for
pointing your own AI agent at it. *(Link coming in M3.)*

## Roadmap

See [`docs/MILESTONES.md`](docs/MILESTONES.md).

## License

MIT © Lucas Li
