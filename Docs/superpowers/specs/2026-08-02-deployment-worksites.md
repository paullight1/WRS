# Deployment Worksites — Design

Date: 2026-08-02

## Goal

Every deployment sector in `/deploy` shows the robot doing that sector's actual work, in
that sector's setting — a warehouse contract shows the robot moving pallets between racks,
a farm contract shows it walking crop rows. The sector list was nine icons and three lines
of copy; a sector is a place, and a place can be shown.

Builds on the 3D robot from [2026-08-02-3d-robot-design.md](2026-08-02-3d-robot-design.md)
and reuses its model, materials and geometry wholesale.

## Decisions

| Question | Decision |
|---|---|
| Technique | Same three.js + react-three-fiber chunk, procedural geometry, no assets |
| Coverage | All nine sectors, each with its own set dressing and its own task animation |
| Worker | The existing `RobotModel`, with shoulder pivots now drivable per frame |
| Density | One WebGL context per screen — see Performance |
| Degradation | WebGL detection with a flat per-sector poster as fallback |

## Architecture

```
src/data/worksites.js               sector data + fuzzy industry-label matching
src/components/robot3d/
  Worksite3D.jsx                    public API; detection, lazy(), Suspense → poster
  WorksiteScene.jsx                 Canvas, shared camera framing, lighting, fog
  WorksitePoster.jsx                the no-WebGL fallback
  worksites/kit.jsx                 Floor, Backdrop, Rack, Crate, Conveyor, CropRow,
                                    Panel, ScanFan, Motes, Worker
  worksites/scenes.jsx              the nine scenes
```

Screens pass whatever industry string they happen to hold:

```jsx
<Worksite3D industry="Logistics Industry" height={224} />
```

`worksiteKey` matches on keywords, because the same sector is written three different ways
across the app — the industry list says "Logistics & Warehousing" and a live contract says
"Logistics Industry". Hospitality is tested before healthcare: "hospitality" contains
"hospital", and without the ordering every hotel became a ward.

## The worker

`RobotModel` gained an optional `work={{ mode, rate }}`. Nine poses (carry, lift, stock,
tend, walk, push, greet, point, guard) drive the shoulder pivots, which `Actuators` now
exposes through `armRefs`. Arms are written directly to the object3D every frame — a swing
driven through React state would re-render the whole robot sixty times a second. Without
`work`, arms keep their authored resting pose, so no existing screen changes.

Scene motion is the same discipline: `useTravel` and `useSway` write transforms on refs,
never state.

## Scenes

| Sector | What it shows |
|---|---|
| Agriculture | Walks crop beds under a survey beam; treeline, pollen |
| Manufacturing | Feeds a running belt under a stamping press; sparks |
| Logistics | Carries a crate between storage racks |
| Healthcare | Pushes a supply trolley down a ward corridor |
| Hospitality | Greets from a reception counter; luggage, planters |
| Retail | Restocks shop shelving under a price panel |
| Construction | Holds steel overhead inside a scaffold; crane hook, dust |
| Security | Night patrol with a sweeping scan fan along a fence |
| Education | Presents at a lit board in front of a class |

All nine share one camera and one lighting rig, so each scene is authored to the same
volume (x ±3.5, y 0–3, z -5.5–1.5) and a sector switch swaps geometry, not framing.

## Placement

- `/deploy` Available — one stage that follows the search box, above the sector list.
- `/deploy` Active — one stage for the contract that is currently running.
- `/deploy/:sector` — the hero, including on locked sectors, where the worksite is the
  argument for upgrading and a padlock alone is not.
- `/deploy/active/:id` — the hero, for open and closed contracts alike.

## Performance

- The scenes add ~5 kB gzip to the existing lazy WebGL chunk; three.js was already there
  and the main bundle is unchanged.
- One canvas per screen. Three at once — a strip per deployment card — was measurably too
  much: the page never finished rendering under a software renderer.
- IntersectionObserver + `visibilitychange` park the render loop off-screen.
- No shadow maps: `BlobShadow` under the worker, fog to end the floor.
- `prefers-reduced-motion` renders the scene on demand instead of every frame — a still
  worksite is still a legible picture of the job.

## Verification

No test framework in this repo. Verified with a production build plus headless-Chrome
screenshots of each sector page with WebGL on, checking that each scene reads as its
sector. The `/deploy` list page itself cannot be captured this way — an infinite CSS
animation on that screen stalls headless Chrome's virtual clock — so its two stages were
verified by build and by the component being the one already checked on the sector pages.
