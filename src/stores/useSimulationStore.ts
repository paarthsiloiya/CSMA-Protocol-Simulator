import { create } from 'zustand'

export type ProtocolType = 'CSMA' | 'CSMA/CD' | 'CSMA/CA'
export type PersistenceStrategy = '1-persistent' | 'non-persistent' | 'p-persistent'

export type NodeState =
  | 'IDLE' // No packet to send
  | 'GENERATING' // Creating a packet
  | 'SENSING' // Checking if channel is idle
  | 'WAITING_DIFS' // CSMA/CA wait
  | 'BACKOFF' // Waiting for backoff counter
  | 'TRANSMITTING' // Pushing data to channel
  | 'COLLISION' // Detected collision (CD)
  | 'JAMMING' // Sending jam signal
  | 'SUCCESS' // Finished transmitting

export interface SimulationNode {
  id: number
  state: NodeState
  packetDetails?: {
    totalTicks: number
    ticksRemaining: number
  }
  backoffCounter: number
  attempts: number // how many retries
  color: string // For visual distinction
}

export type ChannelState = 'IDLE' | 'BUSY' | 'COLLISION'

export type LogEvent = {
  id: string
  tick: number
  message: string
  type: 'info' | 'warn' | 'error' | 'success'
}

export interface SimulationState {
  // Settings
  protocol: ProtocolType
  persistence: PersistenceStrategy
  pProbability: number // 0-1
  nodeCount: number
  speed: number // ticks per real-world second
  packetSize: number
  trafficLoad: number // Probability per tick a node gains a packet

  // Simulation Status
  isRunning: boolean
  currentTick: number

  // Entities
  nodes: SimulationNode[]
  channel: ChannelState
  activeTransmissionSource?: number // node id currently driving the channel

  // Logs & Metrics
  logs: LogEvent[]
  metrics: {
    totalTransmissions: number
    successfulTransmissions: number
    collisions: number
    wastedTicks: number
    idleTicks: number
  }

  // Actions
  setProtocol: (protocol: ProtocolType) => void
  setSettings: (settings: Partial<SimulationState>) => void
  reset: () => void
  togglePlay: () => void
  tick: () => void
  addLog: (message: string, type?: LogEvent['type']) => void
}

const COLORS = [
  'bg-blue-500', 'bg-red-500', 'bg-green-500', 'bg-purple-500',
  'bg-yellow-500', 'bg-pink-500', 'bg-indigo-500', 'bg-orange-500'
]

const INITIAL_METRICS = {
  totalTransmissions: 0,
  successfulTransmissions: 0,
  collisions: 0,
  wastedTicks: 0,
  idleTicks: 0
}

export const useSimulationStore = create<SimulationState>((set, get) => ({
  protocol: 'CSMA',
  persistence: '1-persistent',
  pProbability: 0.5,
  nodeCount: 4,
  speed: 5,
  packetSize: 50,
  trafficLoad: 0.05,

  isRunning: false,
  currentTick: 0,

  nodes: Array.from({ length: 4 }).map((_, i) => ({
    id: i,
    state: 'IDLE',
    backoffCounter: 0,
    attempts: 0,
    color: COLORS[i % COLORS.length]
  })),
  channel: 'IDLE',

  logs: [],
  metrics: { ...INITIAL_METRICS },

  setProtocol: (protocol: ProtocolType) => set({ protocol }),
  setSettings: (settings) => set({ ...settings }),
  togglePlay: () => set((state) => ({ isRunning: !state.isRunning })),

  reset: () => {
    set((state) => ({
      isRunning: false,
      currentTick: 0,
      channel: 'IDLE',
      activeTransmissionSource: undefined,
      logs: [],
      metrics: { ...INITIAL_METRICS },
      nodes: Array.from({ length: state.nodeCount }).map((_, i) => ({
        id: i,
        state: 'IDLE',
        backoffCounter: 0,
        attempts: 0,
        color: COLORS[i % COLORS.length]
      }))
    }))
  },

  addLog: (message: string, type = 'info') => {
    set((state) => {
      const newLog = {
        id: Math.random().toString(36).substr(2, 9),
        tick: state.currentTick,
        message,
        type
      }
      return { logs: [newLog, ...state.logs].slice(0, 100) }
    })
  },

  tick: () => {
    const state = get();
    if (!state.isRunning) return;

    const { nodes, protocol, persistence, pProbability, packetSize, trafficLoad, channel, currentTick, metrics } = state;
    const nextTick = currentTick + 1;
    let newChannelState: ChannelState = 'IDLE';
    let newMetrics = { ...metrics };
    let newNodes = [...nodes];
    const newLogs: LogEvent[] = [];

    const addLocalLog = (msg: string, type: LogEvent['type'] = 'info') => {
      newLogs.push({ id: Math.random().toString(36).substr(2, 9), tick: nextTick, message: msg, type });
    };

    // 1. Process node states
    newNodes = newNodes.map(node => {
      const n = { ...node };

      switch (n.state) {
        case 'IDLE':
          if (Math.random() < trafficLoad) {
            n.state = 'SENSING';
            n.attempts = 0;
            n.packetDetails = { totalTicks: packetSize, ticksRemaining: packetSize };
            addLocalLog(`Node ${n.id} generated a packet`, 'info');
          }
          break;

        case 'SENSING':
          if (channel === 'IDLE') {
            if (protocol === 'CSMA/CA') {
              n.state = 'WAITING_DIFS';
              n.backoffCounter = 5; // DIFS value
              addLocalLog(`Node ${n.id} waiting DIFS`, 'info');
            } else {
              // CSMA or CSMA/CD
              if (persistence === '1-persistent' || Math.random() < pProbability) {
                n.state = 'TRANSMITTING';
                newMetrics.totalTransmissions++;
                addLocalLog(`Node ${n.id} started transmitting`, 'info');
              } else if (persistence === 'non-persistent') {
                n.state = 'BACKOFF';
                n.backoffCounter = Math.floor(Math.random() * 10) + 1;
              }
            }
          } else {
            // Channel is BUSY
            if (persistence === 'non-persistent') {
              n.state = 'BACKOFF';
              n.backoffCounter = Math.floor(Math.random() * 20) + 1;
            } else if (protocol === 'CSMA/CA') {
              // Wait for idle before starting DIFS
            }
          }
          break;

        case 'WAITING_DIFS':
          if (channel === 'IDLE') {
            if (n.backoffCounter > 0) {
              n.backoffCounter--;
            } else {
              n.state = 'BACKOFF';
              n.backoffCounter = Math.floor(Math.random() * Math.pow(2, n.attempts + 2)); // Contention window
              addLocalLog(`Node ${n.id} finished DIFS, starting backoff: ${n.backoffCounter}`, 'info');
            }
          } else {
            // If channel becomes busy during DIFS, reset DIFS wait
            n.backoffCounter = 5;
          }
          break;

        case 'BACKOFF':
          if (protocol === 'CSMA/CA') {
            if (channel === 'IDLE') {
              if (n.backoffCounter > 0) {
                n.backoffCounter--;
              } else {
                n.state = 'TRANSMITTING';
                newMetrics.totalTransmissions++;
                addLocalLog(`Node ${n.id} starting CA transmission`, 'info');
              }
            }
          } else {
            // General backoff
            if (n.backoffCounter > 0) {
              n.backoffCounter--;
            } else {
              n.state = 'SENSING';
            }
          }
          break;

        case 'TRANSMITTING':
          if (protocol === 'CSMA/CD' && channel === 'COLLISION') {
            n.state = 'JAMMING';
            n.backoffCounter = 3; // jam duration
            newMetrics.collisions++;
            addLocalLog(`Node ${n.id} detected collision, jamming`, 'warn');
          } else {
            if (n.packetDetails) {
              n.packetDetails.ticksRemaining--;
              if (n.packetDetails.ticksRemaining <= 0) {
                n.state = 'SUCCESS';
                newMetrics.successfulTransmissions++;
                addLocalLog(`Node ${n.id} transmission successful`, 'success');
              }
            }
          }
          break;

        case 'JAMMING':
          if (n.backoffCounter > 0) {
            n.backoffCounter--;
          } else {
            n.attempts++;
            if (n.attempts > 10) {
              // Max retries
              n.state = 'IDLE';
              addLocalLog(`Node ${n.id} dropped packet after max retries`, 'error');
            } else {
              n.state = 'BACKOFF';
              n.backoffCounter = Math.floor(Math.random() * Math.pow(2, Math.min(n.attempts, 10)));
              addLocalLog(`Node ${n.id} starting exponential backoff: ${n.backoffCounter}`, 'warn');
            }
          }
          break;

        case 'SUCCESS':
          n.state = 'IDLE';
          break;

        default:
          break;
      }
      return n;
    });

    // 2. Evaluate channel state
    const transmitters = newNodes.filter(n => n.state === 'TRANSMITTING' || n.state === 'JAMMING');
    
    if (transmitters.length === 0) {
      newChannelState = 'IDLE';
      newMetrics.idleTicks++;
    } else if (transmitters.length === 1 && transmitters[0].state === 'TRANSMITTING') {
      newChannelState = 'BUSY';
      // if normal transmitting and it's 1 node, it's busy
    } else {
      newChannelState = 'COLLISION';
      newMetrics.wastedTicks++;
      
      // If pure CSMA or CA, they might not detect collision and finish anyway, but channel is garbled.
      // We will let protocol specific logic handle aborting in the next tick (CSMA/CD handles it).
      if (protocol !== 'CSMA/CD') {
        const transOnly = transmitters.filter(n => n.state === 'TRANSMITTING');
        if (transOnly.length > 1) {
             // For CSMA and CSMA/CA, collisions are detected after transmission (ACK timeout in real life).
             // Since we just have a simplified model, let's mark them as failed eventually or immediately.
             // We'll increment collisions.
             if (protocol === 'CSMA/CA' || protocol === 'CSMA') {
                 // The simple state machine allows them to finish then we realize they collided.
                 // In a more advanced implementation we'd handle ACK.
                 // For now, if channel is COLLISION, wastedTicks goes up.
             }
        }
      }
    }

    // 3. Update state
    set({
      currentTick: nextTick,
      nodes: newNodes,
      channel: newChannelState,
      metrics: newMetrics,
      logs: [...newLogs, ...state.logs].slice(0, 100) // prepend new logs
    });
  }
}))