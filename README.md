# CSMA-Protocol-Simulator

An interactive, educational web application built to demonstrate and compare the **Carrier Sense Multiple Access (CSMA)** MAC layer protocols: CSMA, CSMA/CD, and CSMA/CA.

## Project Overview
This application serves as a visual learning tool for undergraduate computer networks students. By integrating theoretical academic concepts alongside synchronized flowcharts and an interactive timeline engine, the simulator allows users to witness how connected nodes share a single communication bus, how collisions occur, and how each specific protocol version mitigates or handles those conflicts.

## Features
- **Three Core Protocol Modules:**
  - **CSMA:** The basic "listen before you talk" approach.
  - **CSMA/CD:** Collision Detection with transmission abort and jamming signals.
  - **CSMA/CA:** Collision Avoidance utilizing Inter-Frame Spaces (IFS), contention windows, and acknowledgments.
- **Interactive Visualization:** Watch logical nodes change states (Idle, Sensing, Transmitting, Backoff) in real time over a shared network bus.
- **Flowchart Synchronization:** An overlay automatically tracks the exact algorithmic step matching the active simulation state on the accompanying protocol flowchart.
- **Event Log & Metrics:** Real-time logging of sensing attempts, transmissions, collisions, successes, and a live efficiency score percentage.
- **Full Execution Control:** Allows playing, pausing, stepping forward tick-by-tick, resetting, and fine-tuning simulation speed for detailed analysis.
- **Lightweight Stack:** No heavy frontend frameworks or JS bundle steps—built entirely with standard HTML5, dynamic Tailwind CSS mapping, Vanilla JS, and served via a minimal Python/Flask backend.

## How to Run the Project

1. Ensure you have **Python** installed.
2. Clone or open the repository.
3. Install the minimal Flask backend requirements:
   ```bash
   pip install -r requirements.txt
   ```
4. Start the Flask application:
   ```bash
   python app.py
   ```
5. Open a modern web browser and navigate to: http://127.0.0.1:5000/

