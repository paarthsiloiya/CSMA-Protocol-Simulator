import React, { useEffect } from 'react'
import { useSimulationStore } from '@/stores/useSimulationStore'
import { motion } from 'motion/react'

export const Canvas: React.FC = () => {
  const { nodes, channel, isRunning, speed, tick } = useSimulationStore()

  // Main tick loop
  useEffect(() => {
    if (!isRunning) return
    const interval = setInterval(tick, 1000 / speed)
    return () => clearInterval(interval)
  }, [isRunning, speed, tick])

  return (
    <div className="relative w-full h-64 bg-slate-50 border rounded-xl overflow-hidden flex flex-col items-center justify-center p-4">
      {/* Shared Medium (Bus) */}
      <div
        className={`absolute top-1/2 left-4 right-4 h-4 -translate-y-1/2 transition-colors duration-300 ${
          channel === 'IDLE' ? 'bg-slate-200' : channel === 'BUSY' ? 'bg-amber-300' : 'bg-red-500 animate-pulse'
        }`}
      />
      
      {/* Nodes */}
      <div className="w-full h-full flex justify-between items-center relative z-10 px-8">
        {nodes.map((node) => (
          <div key={node.id} className="flex flex-col items-center gap-2 relative">
            {/* Status indicator */}
            <div className="text-xs font-mono font-medium text-slate-600 bg-white/80 px-2 py-1 rounded shadow-sm min-w-24 text-center">
              {node.state}
              {node.backoffCounter > 0 && ` (${node.backoffCounter}tk)`}
            </div>

            {/* Computer Icon */}
            <div
              className={`w-16 h-16 rounded-lg border-2 shadow-sm flex items-center justify-center bg-white ${node.color} bg-opacity-10 ${
                node.state === 'TRANSMITTING' ? 'border-blue-500 ring-2 ring-blue-200' :
                node.state === 'COLLISION' || node.state === 'JAMMING' ? 'border-red-500 animate-bounce' :
                'border-slate-300'
              }`}
            >
              <svg xmlns="http://www.w3.org/2000/svg" width="32" height="32" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" className="text-slate-700">
                <rect width="14" height="8" x="5" y="2" rx="2"/><rect width="20" height="8" x="2" y="14" rx="2"/><path d="M6 18h2"/><path d="M12 18h.01"/><path d="M16 18h2"/>
              </svg>
            </div>

            {/* Connecting Wire */}
            <div
              className={`w-1 h-12 ${
                node.state === 'TRANSMITTING' || node.state === 'JAMMING' ? node.color.replace('bg-', 'bg-').replace('500', '400') : 'bg-slate-300'
              }`}
            />

            {/* Packet visualizer */}
            {node.packetDetails && (
              <motion.div
                initial={{ opacity: 0, scale: 0.5, y: -20 }}
                animate={{ opacity: 1, scale: 1, y: 0 }}
                className={`absolute -top-12 ${node.color} text-white text-[10px] w-12 h-8 rounded-sm shadow-md flex items-center justify-center font-mono`}
              >
                Pkt
                <span className="ml-1 opacity-80 border-l border-white/30 pl-1">{node.packetDetails.ticksRemaining}</span>
              </motion.div>
            )}

            {/* Collision indicator */}
            {(node.state === 'COLLISION' || node.state === 'JAMMING' || channel === 'COLLISION') && node.state === 'JAMMING' && (
              <motion.div
                initial={{ scale: 0 }}
                animate={{ scale: [1, 1.2, 1] }}
                transition={{ repeat: Infinity }}
                className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 text-red-500 font-bold text-xl drop-shadow-md bg-white/70 rounded-full px-1 z-20"
              >
                💥
              </motion.div>
            )}
          </div>
        ))}
      </div>
    </div>
  )
}