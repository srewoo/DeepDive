# Balance Check: Progression (wonders, garden spots, unlocks, daily dive)

_Method: Claude Code Game Studios `/balance-check progression`, applied to Deep Dive. 17 November 2026._

### Data Sources Analyzed
- `source/src/daily.js`: unlock ladder (5 / 10 / 20 / 35 wonders, 6 garden spots, everything).
- `source/src/main.js`: swim speed 7 m/s, 26 m/s with the Faster key; map radius 300 m (900 m with sonar).
- Runtime world data: the positions and footprints of all 57 wonders, the 6 viewpoints, and region membership. These were read from a scratch build that exposes the generated world.
- The 31-minute automated soak (`reports/soak-test-2026-11-17-30m.md`).
- Design doc / entity registry: **ABSENT**. Deep Dive has no GDD.

### Health Summary: CONCERNS (one dead zone, now mitigated)

### Outliers Detected
**NOT ASSESSED — NO DATA.** No design targets exist to compare values against. The skill writes them with `/design-system`.

### Degenerate Strategies Found
- **The Faster key has no cost** (3.7× speed). This is in keeping with a calm explorer, so it is not treated as a problem. Players who hold it see the world in about a quarter of the time.

### Progression Analysis
Distances are straight lines along a greedy nearest-unfound route from the dive-in spot (the route the map arrow leads), stopping 6 m from each wonder's footprint. Terrain detours and reading time are not counted, so real times are longer.

| Milestone | Wonders | Route | 7 m/s | 26 m/s |
|---|---|---|---|---|
| First find | 1 | 0.6 km | 1.4 min | 0.4 min |
| Golden hour | 5 | 1.2 km | 2.8 min | 0.7 min |
| Sonar | 10 | 2.0 km | 4.8 min | 1.3 min |
| Moonlight | 20 | 3.7 km | 8.8 min | 2.4 min |
| Tropical blue | 35 | 6.5 km | 15.6 min | 4.2 min |
| Master diver | 57 | 11.1 km | 26.5 min | 7.1 min |

- **Dead zone at the start.** The nearest wonder is **502 m** from every viewpoint. The map shows 300 m, so on a first dive it shows nothing but an arrow. Meanwhile all 6 garden spots are 25–115 m from the start, which keeps players in the hub. The soak confirms it: an automated swimmer that started from the viewpoints found 4 garden spots and **0 wonders in 31 minutes**.
- **Even spacing after that.** Legs between wonders run up to about 550 m (the longest is the first one). Unlock gaps grow steadily (5, 5, 10, 15, 22 wonders), with no power spikes.
- **Unlock order in practice:** the Turtle companion (garden spots, all within 115 m) usually arrives before Golden hour, though the Dive log lists it third. This is harmless.
- **Today's dive** is 502–920 m from the nearest viewpoint (median 739 m): 0.5–0.6 min at 26 m/s, or about 1.8 min at 7 m/s. It is always reachable in one session.
- **Regions:** 5–11 wonders each (all 57 assigned). The smallest regions (East Asia, Eastern Europe, 5 each) complete first, which gives an early "Region complete".

### Recommendations
| Priority | Change | Status |
|---|---|---|
| 1 | One-time hint 20 s into the first dive with no wonders found: the distance to the nearest wonder, follow the arrow, and hold the player's own Faster key | **Done** (`progress.js` `firstHint`), verified in the browser |
| 2 | Consider placing one wonder within about 250 m of the hub, so the first find lands inside the map | Open, a content change for the designer |
| 3 | List the Turtle companion first in the Dive log, to match the order players earn it | Open, cosmetic |

### Values That Need Attention
| Value | Where | Note |
|---|---|---|
| Nearest wonder 502 m vs. map radius 300 m | world generation / `play.js` `MMR` | no stated range — not judged; mitigated by recommendation 1 |
| Unlock thresholds 5/10/20/35 | `daily.js` | no stated range — not judged |
