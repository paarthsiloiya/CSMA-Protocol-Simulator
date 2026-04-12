# Network Protocol Simulator

An interactive, educational web application designed for computer networks students to demonstrate, visualize, and compare the MAC layer protocols **CSMA**, **CSMA/CD**, and **CSMA/CA**.

## Features

- **Protocol Simulation**: Real-time modeling of CSMA (1-persistent, non-persistent, p-persistent), CSMA/CD (collision detection and exponential backoff), and CSMA/CA (collision avoidance, DIFS, and contention windows).
- **Interactive Visualization**: Watch packets travel across a shared medium, visualizing wait states, collisions, and successful transmissions.
- **Synchronized Flowchart**: A live, auto-updating protocol flowchart that highlights the active state of a node (e.g., sensing, transmitting, jamming, or backoff).
- **Live Event Log & Metrics**: Follow the simulation step-by-step with plain-language logs and track efficiency, collisions, and throughput on the dashboard.
- **Adjustable Parameters**: Change network traffic load, simulation speed, and persistence strategies to observe different outcomes dynamically.

## Tech Stack

- **Framework:** [React 19](https://react.dev/) + [Vite](https://vitejs.dev/)
- **Language:** TypeScript
- **Styling:** [Tailwind CSS v4](https://tailwindcss.com/) + [shadcn/ui](https://ui.shadcn.com/)
- **State Management:** [Zustand](https://zustand-demo.pmnd.rs/)

## Getting Started

### Prerequisites

- Node.js (v18 or higher)
- npm or pnpm

### Installation

1. Clone the repository:
   ```bash
   git clone https://github.com/your-username/CSMA-Protocol-Simulator.git
   cd CSMA-Protocol-Simulator
   ```

2. Install dependencies:
   ```bash
   npm install
   ```

3. Start the development server:
   ```bash
   npm run dev
   ```

4. Open your browser and navigate to the address shown in your terminal (usually `http://localhost:5173`).

## Architecture & Design

This application features a strict, highly accessible light theme, making it suitable for classroom demonstrations, project defense, and self-study.

### Protocol Implementations
- **CSMA**: Demonstrates basic carrier sensing protocols.
- **CSMA/CD**: Extends basic CSMA with explicit collision detection, collision jamming signals, and truncated binary exponential backoff.
- **CSMA/CA**: Replaces collision detection with collision avoidance using DIFS spacing and random backoff contention windows prior to transmission.

## License

This project is licensed under the MIT License. See the [LICENSE](LICENSE) file for details.
