# NetProtoSim — Network Protocol Simulator

An interactive, educational static web app that visualizes and simulates MAC-layer protocols: CSMA (1-persistent), CSMA/CD, and CSMA/CA.

## Overview

NetProtoSim provides a deterministic, tick-based simulation and synchronized flowchart visualization to demonstrate how CSMA-family protocols arbitrate access to a shared medium. It's designed for teaching and experimentation — step through ticks, observe state transitions, and inspect flowchart highlights and the event log.

## Key Features

- Three protocol modes: CSMA (1-persistent), CSMA/CD, CSMA/CA
- Deterministic tick engine (manual Step or Play/Pause auto-step)
- 4-node topology: `A` (user-controlled) and autonomous `B`, `C`, `D`
- Live SVG flowcharts that highlight the flow for the active protocol
- Channel visualizer with Idle / Busy / Collision and an animated frame particle
- Binary exponential backoff and ACK behavior (protocol-dependent, K up to 15)
- Timestamped event log and full Reset

## What's in this repo

Short file overview:

- `index.html` — App layout, controls, and SVG containers for flowcharts
- `css/styles.css` — Styles, variables, and component layout
- `js/flowcharts.js` — SVG flowchart renderer and highlight API (`FC`)
- `js/simulation.js` — Discrete simulation engine and protocol logic (`SIM`)
- `js/main.js` — UI controller, DOM rendering, and event bindings

The app is intentionally dependency-free — just static HTML/CSS/JS.

## How to run locally

Open `index.html` in any modern browser (no build step required).

Options:

- Double-click `index.html` on Windows or open it from your browser.
- Or serve the folder with a simple static server (handy for Live Server in VS Code):

```bash
# from the project root
# serve with Python 3 (optional)
python -m http.server 8000
# then visit http://localhost:8000/
```

## Quick usage notes

- Use the top tabs to switch protocols; the corresponding flowchart and theory panel update.
- Click `Send Frame from A` to make node `A` transmit (choose destination with the Destination pills).
- `Play` toggles auto-stepping; `Step` advances one tick while paused.
- `Reset` clears the simulation and flowchart highlights.
- Watch the Event Log for timestamped actions and the channel badge for current channel state.

## Development notes

- The simulation is deterministic per tick, with autonomous nodes B/C/D scheduled via `SIM.scheduleAutoTx()`.
- Flowchart nodes have stable IDs mapped in `SIM.FC_MAP` and are highlighted via `FC.highlight(...)`.
- Node state and UI are synced from `SIM` by `main.js`'s `renderAll()`.

## License & Deployment

License: MIT — see the [LICENSE](LICENSE) file.

### GitHub Pages (published)

The project is published at:

https://paarthsiloiya.github.io/CSMA-Protocol-Simulator/
