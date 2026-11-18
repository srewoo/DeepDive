# Security Audit Report: Deep Dive 1.1.0 (game + Chrome MV3 extension)

_Method: Claude Code Game Studios `/security-audit full`, applied to a WebGPU browser game. 17 November 2026._

## Executive Summary

| Severity | Count | Open | Must Fix Before Release |
|----------|-------|------|------------------------|
| CRITICAL | 0 | 0 | Yes — all |
| HIGH | 0 | 0 | Yes — all |
| MEDIUM | 1 | 0 | Recommended |
| LOW | 3 | 0 | Optional |

**Release recommendation: NOT ASSESSED.** The skill's grep categories (1, 3, 4) have sourced pattern sets only for Godot, Unity and Unreal. Deep Dive is plain JavaScript on WebGPU, so under the skill's rules those categories are `NOT ASSESSED — no sourced pattern set for WebGPU/JavaScript`, and CLEAR TO SHIP is unreachable. The fix is to add a web reference to the studio's `docs/engine-reference/`.

Separately from the formal verdict, a web-platform review was run with web API names: storage, `postMessage`, DOM sinks, network APIs and the manifest. It found **no CRITICAL or HIGH issue**. Its findings are below; it does not replace the categories above.

**Multiplayer scope:** none. This was confirmed from the code, not assumed: there are zero `fetch`, `XMLHttpRequest`, `WebSocket`, `sendBeacon`, `EventSource` or dynamic `import()` calls in the source or the shipped extension.

## MEDIUM Findings

### SEC-001: The new-tab scene could rewrite the game's saved quality (fixed)
- **Where:** `source/src/quality.js`, `source/src/main.js`. The `?ambient` page wrote `abyssal` (quality) and `abyssalLoad` (crash flag) in the same storage as the game.
- **Impact:** data integrity, not a remote attack. A live new tab could permanently drop a High-quality player to Low, or clear the game's crash flag mid-load.
- **Fix:** ambient mode never writes either key, and a lost device in ambient mode no longer saves a lower level.
- **Status:** Closed.

## LOW Findings

### SEC-002: Saved quality values were not bounds-checked (fixed)
- `abyssal = "level,pixels,detail"` was parsed with `+x` and used directly. A damaged or hand-edited value (for example `7,1e12,9`) could make every load fail.
- **Fix:** the level must be 0–2 (otherwise Medium), pixels are clamped to the dynamic-resolution range, and detail is clamped to 0.4–1.
- **Status:** Closed.

### SEC-003: Progress keys trusted their stored shape (fixed)
- `abyssalUnlocked`, `abyssalStreak` and `abyssalLight` are now type-checked before use, so a corrupt value can't stop the game starting.
- **Status:** Closed.

### SEC-004: The esbuild dev dependency uses a caret range
- `"esbuild": "^0.28.2"`. `npm audit`: 0 vulnerabilities. Build-time only; nothing from it ships in the extension.
- **Fix:** pinned to the installed `0.28.2`.
- **Status:** Closed.

## Accepted Risk

- **Progress can be edited in DevTools** (wonders found, streak, unlocks). This is single-player, with nothing competitive, purchasable or synced, so client-side tampering only affects the player's own game.

## Web-platform review (outside the formal categories)

| Check | Result |
|---|---|
| DOM injection sinks (`innerHTML`, `outerHTML`, `insertAdjacentHTML`, `document.write`) | None. All text is set with `textContent` |
| Dynamic code (`eval`, `new Function`, string timers) | None |
| `postMessage` | One sender (ambient iframe → parent, target `location.origin`). One receiver (`newtab.js`), which checks `origin`, `source === live.contentWindow` and the exact payload |
| URL input | Only the presence of `?ambient` is read |
| Manifest | No `permissions` or `host_permissions`, no `web_accessible_resources` (so websites can't frame or load extension pages), no `externally_connectable`, default MV3 CSP |
| Secrets (`api key`, `secret`, `token`, `password`, private keys) | None in source or package |
| Logging | Errors only (`console.error`/`console.warn`), with no player data |

## Dependency Inventory

| Package | Version | Ships to players | Audit |
|---|---|---|---|
| esbuild | 0.28.2 (dev, pinned) | No | 0 vulnerabilities |

Runtime dependencies: none.

## Remediation Priority Order
1. Nothing open in Deep Dive.
2. Studio-side: add a web/WebGPU engine reference so this audit can return a formal verdict.

## Re-Audit Trigger
Any network feature, any new manifest permission or override, or any new message channel between pages.
