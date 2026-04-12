import React from 'react'
import { useSimulationStore } from '@/stores/useSimulationStore'
import { Check, Clock, AlertTriangle, Play, CircleSlash, ArrowRight } from 'lucide-react'

export const FlowchartPanel: React.FC = () => {
  const { protocol, nodes } = useSimulationStore()
  
  // Track node 0 as our representative node for the flowchart highlight
  const representativeNode = nodes[0]
  const state = representativeNode?.state || 'IDLE'

  // Define steps dynamically based on protocol
  const steps = [
    {
      id: 'IDLE',
      label: 'Idle / Generating',
      activeStates: ['IDLE', 'GENERATING'],
      icon: <CircleSlash size={16} />
    },
    {
      id: 'SENSING',
      label: 'Carrier Sensing',
      activeStates: ['SENSING'],
      icon: <Play size={16} />
    },
    ...(protocol === 'CSMA/CA' ? [{
      id: 'WAITING_DIFS',
      label: 'Wait DIFS',
      activeStates: ['WAITING_DIFS'],
      icon: <Clock size={16} />
    }] : []),
    ...(protocol === 'CSMA/CD' || protocol === 'CSMA/CA' ? [{
      id: 'BACKOFF',
      label: 'Contention / Backoff',
      activeStates: ['BACKOFF'],
      icon: <Clock size={16} />
    }] : [
      {
        id: 'BACKOFF',
        label: 'Delay Backoff',
        activeStates: ['BACKOFF'],
        icon: <Clock size={16} />
      }
    ]),
    {
      id: 'TRANSMITTING',
      label: 'Transmitting',
      activeStates: ['TRANSMITTING'],
      icon: <ArrowRight size={16} />
    },
    ...(protocol === 'CSMA/CD' ? [{
        id: 'JAMMING',
        label: 'Collision & Jamming',
        activeStates: ['JAMMING', 'COLLISION'],
        icon: <AlertTriangle size={16} />
    }] : []),
    {
      id: 'SUCCESS',
      label: 'Success',
      activeStates: ['SUCCESS'],
      icon: <Check size={16} />
    }
  ]

  return (
    <div className="col-span-12 lg:col-span-3 flex flex-col pt-6 lg:pt-0 border-t lg:border-t-0 lg:border-l border-slate-200 pl-0 lg:pl-6 h-full">
      <h3 className="text-sm font-bold uppercase tracking-widest text-slate-500 mb-4">Protocol Flow</h3>
      <p className="text-xs text-slate-400 mb-6">Tracking State of Node 0</p>
      
      <div className="flex-1 flex flex-col gap-2 relative">
        {steps.map((step, idx) => {
          const isActive = step.activeStates.includes(state)
          return (
            <div key={idx} className="flex flex-col">
              <div className={`p-3 border rounded-xl flex items-center justify-between transition-all duration-300 ${
                isActive 
                  ? 'bg-blue-600 text-white border-blue-700 shadow-md ring-2 ring-blue-200 scale-105 z-10' 
                  : 'bg-white text-slate-600 border-slate-200 opacity-70'
              }`}>
                <div className="flex items-center gap-3">
                  <div className={`p-1.5 rounded-lg ${isActive ? 'bg-white/20' : 'bg-slate-100 text-slate-400'}`}>
                    {step.icon}
                  </div>
                  <span className="font-semibold text-sm">{step.label}</span>
                </div>
                {isActive && <span className="flex h-2 w-2 rounded-full border border-white bg-blue-300 animate-pulse relative right-1"></span>}
              </div>
              
              {/* Connector line */}
              {idx < steps.length - 1 && (
                <div className="h-4 flex justify-center py-1">
                  <div className="w-0.5 h-full bg-slate-200 rounded-full"></div>
                </div>
              )}
            </div>
          )
        })}
      </div>
    </div>
  )
}