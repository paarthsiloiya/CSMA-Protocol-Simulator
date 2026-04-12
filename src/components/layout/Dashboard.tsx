import React from 'react'
import { Canvas } from '../simulation/Canvas'
import { FlowchartPanel } from '../flowcharts/FlowchartPanel'
import { useSimulationStore } from '@/stores/useSimulationStore'
import { Button } from '@/components/ui/button'
import { Slider } from '@/components/ui/slider'
import { Play, Pause, RotateCcw, AlertTriangle, CheckCircle, Clock } from 'lucide-react'

// Import theory content from constants
export const Dashboard: React.FC = () => {
  const state = useSimulationStore()

  return (
    <div className="min-h-screen bg-slate-50 flex items-center justify-center p-4 selection:bg-blue-100">
      <div className="max-w-[1400px] w-full grid grid-cols-12 gap-6 bg-white border border-slate-200 rounded-3xl shadow-sm p-6 relative overflow-hidden">
        
        {/* Left Column: Theory & Controls */}
        <div className="col-span-12 lg:col-span-3 flex flex-col gap-6">
          <div className="flex flex-col gap-2 border-b pb-4">
            <h1 className="text-2xl font-bold tracking-tight text-slate-800">Protocol Simulator</h1>
            <p className="text-sm text-slate-500 leading-snug">
              Compare CSMA, CSMA/CD, and CSMA/CA access methods in a shared medium.
            </p>
          </div>

          {/* Protocol Selection */}
          <div className="flex flex-col gap-2">
            <h3 className="text-xs font-semibold uppercase tracking-wider text-slate-400">Settings</h3>
            <div className="flex bg-slate-100 p-1 rounded-lg">
              {['CSMA', 'CSMA/CD', 'CSMA/CA'].map((p) => (
                <button
                  key={p}
                  onClick={() => {
                    state.setProtocol(p as any)
                    state.reset()
                  }}
                  className={`flex-1 text-sm py-1.5 rounded-md font-medium transition-all ${
                    state.protocol === p 
                      ? 'bg-white text-blue-600 shadow-sm ring-1 ring-black/5' 
                      : 'text-slate-600 hover:text-slate-800 hover:bg-slate-200/50'
                  }`}
                >
                  {p}
                </button>
              ))}
            </div>
            
            {/* Persistence for CSMA */}
            {state.protocol === 'CSMA' && (
              <div className="mt-2 text-xs flex justify-between gap-1 bg-slate-50 p-1 rounded-md border">
                {['1-persistent', 'non-persistent', 'p-persistent'].map(strat => (
                  <button
                    key={strat}
                    className={`flex-1 py-1 rounded text-center line-clamp-1 ${state.persistence === strat ? 'bg-blue-100 text-blue-700 font-medium' : 'text-slate-500 hover:bg-slate-200'}`}
                    onClick={() => state.setSettings({ persistence: strat as any })}
                  >
                    {strat.split('-')[0]}
                  </button>
                ))}
              </div>
            )}
          </div>

          <div className="flex flex-col gap-4 bg-slate-50 p-4 border rounded-xl">
            <div className="flex flex-col gap-1.5">
              <label className="text-xs font-medium text-slate-600 flex justify-between">
                <span>Traffic Load ({Math.round(state.trafficLoad * 100)}%)</span>
                <span className="text-slate-400">P(gen)/tick</span>
              </label>
              <Slider
                value={[state.trafficLoad]}
                min={0.01} max={0.2} step={0.01}
                onValueChange={([v]) => state.setSettings({ trafficLoad: v })}
                className="py-1"
              />
            </div>
            <div className="flex flex-col gap-1.5">
              <label className="text-xs font-medium text-slate-600 flex justify-between">
                <span>Speed ({state.speed}x)</span>
                <span className="text-slate-400">Ticks/sec</span>
              </label>
              <Slider
                value={[state.speed]}
                min={1} max={20} step={1}
                onValueChange={([v]) => state.setSettings({ speed: v })}
                className="py-1"
              />
            </div>
          </div>
          
          <div className="flex-1 bg-blue-50/50 border border-blue-100 rounded-xl p-5 text-sm text-slate-700 leading-relaxed overflow-y-auto">
             <h4 className="font-bold text-blue-900 mb-2">How {state.protocol} works</h4>
             {state.protocol === 'CSMA' && <p>Carrier Sense Multiple Access (CSMA) requires each node to listen before transmitting. If the channel is idle, the node begins transmission based on its persistence strategy. If a collision occurs (two nodes transmit exactly simultaneously), data is scrambled but they don't detect it early, leading to wasted transmission time.</p>}
             {state.protocol === 'CSMA/CD' && <p>CSMA with Collision Detection explicitly listens <em>while</em> transmitting. If the received signal differs from the sent signal, a collision is declared. The node immediately halts transmission, broadcasts a short JAM signal, and enters an exponential backoff phase before retrying.</p>}
             {state.protocol === 'CSMA/CA' && <p>CSMA with Collision Avoidance prevents collisions proactively. Nodes wait for a fixed Distributed Inter-Frame Space (DIFS), then enter a random backoff period (Contention Window) before transmitting. The timer pauses if the channel becomes busy. This minimizes the risk of two nodes transmitting exactly at the same time.</p>}
          </div>
        </div>

        {/* Center Column: Simulation Canvas & Metrics */}
        <div className="col-span-12 lg:col-span-6 flex flex-col gap-6">
          {/* Header Controls */}
          <div className="flex justify-between items-center bg-slate-50 border p-3 rounded-xl shadow-sm">
            <div className="flex items-center gap-3">
              <Button size="icon" variant={state.isRunning ? 'outline' : 'default'} onClick={state.togglePlay} className="h-10 w-10">
                {state.isRunning ? <Pause className="h-5 w-5" /> : <Play className="h-5 w-5" />}
              </Button>
              <Button size="icon" variant="ghost" onClick={state.reset} className="h-10 w-10 text-slate-500">
                <RotateCcw className="h-5 w-5" />
              </Button>
              <div className="ml-4 flex flex-col">
                <div className="text-xs text-slate-400 font-mono tracking-wider uppercase">Clock</div>
                <div className="text-base font-mono font-medium">{state.currentTick.toString().padStart(4, '0')} tk</div>
              </div>
            </div>
            
            <div className="flex items-center text-sm font-medium gap-2 pr-4 text-slate-500">
              Channel: 
              <span className={`px-2 py-0.5 rounded font-bold uppercase tracking-widest text-[10px] ${
                state.channel === 'IDLE' ? 'bg-slate-200 text-slate-600' :
                state.channel === 'BUSY' ? 'bg-amber-100 text-amber-700' :
                'bg-red-100 text-red-600 animate-pulse'
              }`}>
                {state.channel}
              </span>
            </div>
          </div>

          {/* SIMULATION VISUALIZATION */}
          <Canvas />
          
          <div className="grid grid-cols-1 md:grid-cols-2 gap-6 flex-1">
            {/* Live Event Log */}
            <div className="border rounded-xl bg-slate-50 overflow-hidden flex flex-col h-64">
              <div className="px-4 py-2 bg-white border-b text-xs font-bold uppercase tracking-widest text-slate-500 flex justify-between">
                Live Event Log
              </div>
              <div className="p-4 flex-1 overflow-y-auto flex flex-col gap-1 text-sm font-mono leading-relaxed font-medium">
                {state.logs.map((log) => (
                  <div key={log.id} className={`flex gap-3 py-1 border-b border-slate-100 last:border-0 ${
                    log.type === 'error' ? 'text-red-600' : 
                    log.type === 'success' ? 'text-green-600' : 
                    log.type === 'warn' ? 'text-amber-600' : 'text-slate-600'
                  }`}>
                    <span className="opacity-50 min-w-10">[{log.tick.toString().padStart(4, '0')}]</span>
                    <span>{log.message}</span>
                  </div>
                ))}
                {state.logs.length === 0 && <div className="text-slate-400 italic text-center py-10">Awaiting events...</div>}
              </div>
            </div>

            {/* Metrics Dashboard */}
            <div className="border rounded-xl bg-white p-4 grid grid-cols-2 gap-4 h-64 content-start shadow-sm">
               <div className="col-span-2 text-xs font-bold uppercase tracking-widest text-slate-400 mb-2">Metrics Snapshot</div>
               <MetricCard icon={<Clock className="text-blue-500" />} label="Total Deliveries" value={state.metrics.totalTransmissions.toString()} />
               <MetricCard icon={<CheckCircle className="text-green-500" />} label="Successful" value={state.metrics.successfulTransmissions.toString()} />
               <MetricCard icon={<AlertTriangle className="text-red-500" />} label="Collisions" value={state.metrics.collisions.toString()} />
               <MetricCard icon={<Clock className="text-amber-500" />} label="Wasted Ticks" value={state.metrics.wastedTicks.toString()} />
               <div className="col-span-2 mt-2 p-3 bg-slate-50 rounded-lg text-xs text-slate-500 flex justify-between items-center">
                 <span>Efficiency (Success/Total)</span>
                 <span className="font-bold text-slate-700 text-lg">
                   {state.metrics.totalTransmissions > 0 ? Math.round((state.metrics.successfulTransmissions / state.metrics.totalTransmissions) * 100) : 0}%
                 </span>
               </div>
            </div>
          </div>
        </div>

        {/* Right Column: Flowchart */}
        <FlowchartPanel />
      </div>
    </div>
  )
}

function MetricCard({ icon, label, value }: { icon: React.ReactNode, label: string, value: string }) {
  return (
    <div className="flex items-center gap-3 p-3 bg-slate-50 border rounded-xl">
      <div className="p-2 bg-white border rounded-lg shadow-sm">{icon}</div>
      <div className="flex flex-col">
        <span className="text-[10px] font-bold uppercase tracking-wider text-slate-400">{label}</span>
        <span className="text-xl font-mono font-medium text-slate-700">{value}</span>
      </div>
    </div>
  )
}