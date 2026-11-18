# Performance Profile: Full (game, new-tab live scene, new-tab still)

_Method: Claude Code Game Studios `/perf-profile`, applied to a WebGPU browser game. 17 November 2026._

## Inputs

| Input | Status |
|---|---|
| Committed budget in `project.yaml` / design docs | **ABSENT**: Deep Dive has neither |
| Budget committed in code | **FOUND**: `source/src/main.js` dynamic resolution holds GPU time in **9.8–13.6 ms** per frame for 60 fps, and treats > 17.6 ms frames as slow without GPU timing |
| Runtime measurements | **FOUND**: Chrome (Playwright), CDP `Performance.getMetrics`, the game's own stats line (H key), `GPUQueue.submit` counts |
| Target hardware | **Partial**: one machine only, Apple Silicon (Metal 3), 12 cores, 16 GB, 120 Hz display. Low-end hardware is **NOT ASSESSED** |

Budgets used: the in-code GPU band and 60 fps. Memory, load time and draw calls have **no committed budget anywhere**, so they are reported as measurements and **NOT ASSESSED** against a budget.

## Performance Budgets

| Metric | Budget | Measured | Status |
|---|---|---|---|
| GPU time per frame, game (High, 1920×1080) | 9.8–13.6 ms | 10.1–12.8 ms across all six viewpoints | Within |
| Frame rate, game | 60 fps | 74–90 fps standing, 120 fps swimming | Within |
| Worst single frame, game | none set | 17–32 ms (isolated) | NOT ASSESSED |
| Render scale chosen by dynamic resolution | none set | 70% of 1920×1080 | NOT ASSESSED |
| Load to menu, High | none set | 5.9 s | NOT ASSESSED |
| JS heap peak during world build | none set | **~614 MB**, falling to ~5 MB after GC | NOT ASSESSED |
| JS per frame, game | none set | 13–17 ms of script per second (~0.2 ms/frame) | NOT ASSESSED |
| New-tab still: ready | none set | 0.1 s (346 KB poster from disk) | NOT ASSESSED |
| New-tab live scene: frames drawn | none set | **82 fps before → 29.8 fps after fix** | Fixed |

## Hotspots Identified

| # | Hotspot | Evidence | Effort |
|---|---|---|---|
| 1 | The new-tab live scene drew at the display's full rate (~82 fps) for a background nobody interacts with | rAF / submit count | S (fixed) |
| 2 | A third WebGPU page could wait forever for a GPU device and sit on "Diving…" | Reproduced with two Deep Dive pages open: `requestDevice` never resolved within 15 s | S (fixed) |
| 3 | Every background new tab with "Live scene" on kept a whole world (GPU buffers, ~6 s build) alive | Follows from 2: each live tab holds a device | S (fixed) |
| 4 | World build allocates ~614 MB of short-lived JS heap | CDP `JSHeapUsedSize` at load vs. 30 s later | M–L (investigate) |

## Optimisation Recommendations (Priority Order)

1. **Done:** cap the new-tab scene at 30 fps (`main.js` `frame()`), and keep dynamic resolution from reading the deliberate 33 ms frames as "too slow". Measured: 29.8 draws/s, about **−64% GPU work** for the live new tab.
2. **Done:** time out the GPU adapter/device request after 20 s and show the fallback with cause `busy` ("Close other Deep Dive tabs…"). Verified: a third page now reaches the fallback in 21 s instead of hanging.
3. **Done:** a new tab hidden for 20 s releases its live scene (`about:blank`); returning shows the still at once and fades the scene back in.
4. **Requires investigation:** the 614 MB build-time heap peak. On a 4 GB machine (which `quality.js` already sends to Low) this is the likeliest cause of tab crashes during load. Next step: a heap snapshot during `makeWorld` to find which typed arrays are built twice or kept as plain JS arrays before conversion.

## Quick Wins (< 1 hour each)

Items 1–3 above, all applied.

## Requires Investigation

- Item 4 (build-time heap).
- Low-end and integrated-GPU hardware: not measured on this run.

Verdict: **COMPLETE**. The performance profile was generated; three hotspots were fixed and one is open for investigation.

## Follow-up, 18 November 2026: item 4 (build-time heap) fixed

**Cause** (heap sampling and stage-by-stage measurement with forced GC): `makeWorld` collected ~5.5M instances (kelp leaves, sparkles, rocks, props) in ~50,000 nested plain JS arrays, one per culling cell and kind, before packing them into GPU buffers. That was ~490 MB of JS heap: 8-byte numbers plus array growth slack. The closure returned as `Wd.gy` also kept `makeWorld`'s scope, and so those arrays, alive until `main.js` nulled it.

**Fix** (`source/src/world.js`): instances go into "bins": fixed blocks of 32-bit storage, each instance tagged with its cell, put in cell order at pack time by a stable counting sort. Leaves are stored directly in their 36-byte GPU layout. Each bin is freed as soon as it is packed.

**Output unchanged:** a fingerprint of every packed buffer (leaves, far leaves, ground cover, sparkles, 7 rock kinds, 8 prop kinds, set pieces, volumes) is byte-identical before and after. Only the per-cell culling bounds differ, by ≤ 4 µm (float rounding).

| High detail, 1280×800, Apple Silicon | Before | After |
|---|---|---|
| Live memory right after the world build (JS heap + ArrayBuffers, after forced GC) | 937 MB | 451 MB |
| Peak as sampled (JS heap + ArrayBuffers, GC uncontrolled) | 1,149–1,215 MB | 731–734 MB |
| Peak on Low detail | 466 MB | 377 MB |
| Load to menu | 5.6–5.7 s | 4.8–5.6 s |

The rest of the remaining peak is the density grid (84 MB) and the packed buffers waiting to be uploaded to the GPU. Low-end hardware is still **NOT ASSESSED**.
