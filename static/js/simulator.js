/**
 * Core Simulator Logic for CSMA, CSMA/CD, and CSMA/CA
 */

let simulationState = {
    protocol: null,
    running: false,
    speed: 5,
    nodes: [],
    time: 0,
    metrics: {
        tx: 0,
        col: 0,
        succ: 0,
    },
    timerId: null,
    busState: 'idle', // 'idle', 'busy', 'collision'
    packets: []
};

const logEvent = (msg, type = 'info') => {
    const logBox = document.getElementById('event-log');
    const el = document.createElement('div');
    el.className = `log-entry border-b border-border py-1 flex ${type === 'error' ? 'text-danger flex-col' : (type === 'success' ? 'text-success flex-col' : '')}`;
    const timestamp = new Date().toISOString().split('T')[1].slice(0,8);
    el.innerHTML = `<span class="text-xs text-textMuted mr-2 whitespace-nowrap">[${timestamp}]</span> <span>${msg}</span>`;
    logBox.appendChild(el);
    logBox.scrollTop = logBox.scrollHeight;
};

const updateMetrics = () => {
    document.getElementById('metric-tx').innerText = simulationState.metrics.tx;
    document.getElementById('metric-col').innerText = simulationState.metrics.col;
    document.getElementById('metric-succ').innerText = simulationState.metrics.succ;
    
    const attempts = simulationState.metrics.tx;
    const eff = attempts > 0 ? Math.round((simulationState.metrics.succ / attempts) * 100) : 0;
    document.getElementById('metric-eff').innerText = `${eff}%`;
};

const highlightFlowchart = (stepId) => {
    // Old HTML boxes
    document.querySelectorAll('.flow-box').forEach(el => el.classList.remove('flow-active'));
    const target = document.getElementById('fc-' + stepId);
    if (target) {
        target.classList.add('flow-active');
    }

    // Mermaid SVG highlighting
    document.querySelectorAll('.flow-active-svg').forEach(el => {
        el.classList.remove('flow-active-svg');
    });
    
    // Mermaid classes will be like class="node step-sense default"
    document.querySelectorAll('.step-' + stepId).forEach(el => {
        el.classList.add('flow-active-svg');
    });
};

const updateChannelUI = () => {
    const channelUI = document.getElementById('channel-status');
    const bus = document.getElementById('network-bus');
    if (!channelUI || !bus) return;

    if (simulationState.busState === 'idle') {
        channelUI.innerHTML = 'Channel: Idle';
        channelUI.className = 'absolute top-4 left-4 font-bold text-success px-3 py-1 border rounded bg-white shadow';
        bus.style.backgroundColor = '#475569'; // secondary
    } else if (simulationState.busState === 'busy') {
        channelUI.innerHTML = 'Channel: Busy';
        channelUI.className = 'absolute top-4 left-4 font-bold text-warning px-3 py-1 border rounded bg-white shadow';
        bus.style.backgroundColor = '#EAB308'; // warning
    } else if (simulationState.busState === 'collision') {
        channelUI.innerHTML = 'Channel: Collision!';
        channelUI.className = 'absolute top-4 left-4 font-bold text-danger px-3 py-1 border rounded bg-white shadow animate-pulse';
        bus.style.backgroundColor = '#EF4444'; // danger
    }
};

class Node {
    constructor(id, position) {
        this.id = id;
        this.position = position; // 0 to 100 (percentage on the bus)
        this.state = 'idle'; // idle, alert, sensing, waiting, transmitting, backoff
        this.k = 0; // attempt counter
        this.currentTarget = null;
        this.timeout = 0;
        this.packetPos = null;
        this.packetEl = null;
    }

    render() {
        const bus = document.getElementById('network-bus');
        let el = document.getElementById(`node-${this.id}`);
        if (!el) {
            el = document.createElement('div');
            el.id = `node-${this.id}`;
            el.className = 'node absolute text-sm z-20';
            el.style.left = `${this.position}%`;
            bus.appendChild(el);
            
            let idLabel = document.createElement('div');
            idLabel.innerText = this.id;
            el.appendChild(idLabel);

            let alertIcon = document.createElement('div');
            alertIcon.id = `alert-${this.id}`;
            alertIcon.innerHTML = '📩';
            alertIcon.className = 'absolute -top-6 text-lg hidden';
            el.appendChild(alertIcon);
        }
        
        let colorClass = 'bg-bgLight text-textMain';
        if (this.state === 'transmitting') colorClass = 'bg-primary text-white border-primary';
        else if (this.state === 'sensing' || this.state === 'alert') colorClass = 'bg-warning text-textMain border-warning';
        else if (this.state === 'backoff') colorClass = 'bg-danger text-white border-danger';
        else if (this.state === 'wait_ifs' || this.state === 'wait_ack') colorClass = 'bg-green-100 text-green-800 border-green-600';
        
        el.className = `node absolute text-sm ${colorClass} z-20 transition-colors`;

        // Render alert icon
        const alertIcon = document.getElementById(`alert-${this.id}`);
        if (alertIcon) {
            if (this.state === 'alert' || this.state === 'sensing' || this.state === 'backoff' || this.state === 'wait_ifs' || this.state === 'contention' || this.state === 'failed_ack' || this.state === 'jamming' || this.state === 'wait_ack') {
                alertIcon.classList.remove('hidden');
            } else {
                alertIcon.classList.add('hidden');
            }
        }

        // Render moving packet
        if (this.state === 'transmitting' && this.currentTarget) {
            if (!this.packetEl) {
                this.packetEl = document.createElement('div');
                this.packetEl.className = 'packet absolute bg-primary text-white text-[10px] w-12 h-6 flex items-center justify-center -top-3 rounded-full shadow border border-white z-10 transition-all font-bold';
                this.packetEl.innerText = this.id + '→' + this.currentTarget;
                bus.appendChild(this.packetEl);
            }
            
            // Calculate progress smoothly
            const maxTimeout = 10;
            const progress = (maxTimeout - this.timeout) / maxTimeout;
            const targetNode = simulationState.nodes.find(n => n.id === this.currentTarget);
            if (targetNode) {
                const targetPos = targetNode.position;
                const currentObjPos = this.position + (targetPos - this.position) * progress;
                this.packetEl.style.left = `${currentObjPos}%`;
                this.packetEl.style.transform = 'translateX(-50%)';
            }
        } else {
            if (this.packetEl) {
                this.packetEl.remove();
                this.packetEl = null;
            }
        }
    }
}

const setupNodes = () => {
    document.getElementById('network-bus').innerHTML = ''; // clear bus
    simulationState.nodes = [
        new Node('A', 15),
        new Node('B', 38),
        new Node('C', 62),
        new Node('D', 85)
    ];
    simulationState.nodes.forEach(n => n.render());
};

const tickSimulation = () => {
    simulationState.time++;
    
    // Pick target for new packets
    const nodeIds = simulationState.nodes.map(n => n.id);

    // Random chance for a node to want to transmit (exclude Node A as it is manually controlled)
    simulationState.nodes.forEach(node => {
        if (node.id !== 'A' && node.state === 'idle' && Math.random() < 0.04) {
            node.state = 'alert';
            let targets = nodeIds.filter(id => id !== node.id);
            node.currentTarget = targets[Math.floor(Math.random() * targets.length)];
            logEvent(`Node ${node.id} has a frame to send to Node ${node.currentTarget}.`, 'info');
        }
    });

    if (simulationState.protocol === 'csmacd') {
        stepCSMACD();
    } else if (simulationState.protocol === 'csmaca') {
        stepCSMACA();
    } else {
        stepCSMA();
    }

    // Render nodes
    simulationState.nodes.forEach(n => n.render());
    updateNodeStatus();
    updateChannelUI();
};

const updateNodeStatus = () => {
    const bar = document.getElementById('node-status-bar');
    bar.innerHTML = '';
    simulationState.nodes.forEach(node => {
        const d = document.createElement('div');
        d.innerHTML = `<strong>Node ${node.id}:</strong><span class="ml-1">${node.state}</span>`;
        if(node.state === 'transmitting') d.className = "text-primary font-bold";
        else if(node.state === 'backoff' || node.state === 'jamming') d.className = "text-danger";
        else if(node.state === 'sensing' || node.state === 'alert') d.className = "text-warning text-black font-bold";
        else if(node.state === 'wait_ifs' || node.state === 'wait_ack') d.className = "text-success font-bold";
        else d.className = "text-textMuted";
        bar.appendChild(d);

        // Update Node A explicit UI
        if (node.id === 'A') {
            const btnSendA = document.getElementById('btn-send-a');
            if (btnSendA) {
                if (node.state === 'idle') {
                   btnSendA.disabled = false;
                   btnSendA.innerText = "Send Packet";
                   btnSendA.classList.remove('opacity-50', 'cursor-not-allowed');
               } else {
                   btnSendA.disabled = true;
                   btnSendA.innerText = "Pending...";
                   btnSendA.classList.add('opacity-50', 'cursor-not-allowed');
               }
               
               const backoffUI = document.getElementById('node-a-backoff-timer');
               if (backoffUI) {
                   if (node.state === 'backoff' || node.state === 'wait_ifs' || node.state === 'wait_r') {
                       backoffUI.classList.remove('hidden');
                       backoffUI.innerHTML = `Wait: <span>${node.timeout}</span> ticks`;
                   } else {
                       backoffUI.classList.add('hidden');
                   }
               }
           }
       }
   });
};

/* Protocol Logic */
const stepCSMA = () => {
    let transmittingNodes = simulationState.nodes.filter(n => n.state === 'transmitting');
    if(transmittingNodes.length > 0) simulationState.busState = 'busy';
    else simulationState.busState = 'idle';

    simulationState.nodes.forEach(node => {
        if (node.state === 'alert') {
            node.state = 'sensing';
            if (node.id === 'A') highlightFlowchart('sense');
        } else if (node.state === 'sensing') {
            
            if (simulationState.busState !== 'idle') {
                if (node.id === 'A') highlightFlowchart('busy');
                setTimeout(() => { if (node.id === 'A') highlightFlowchart('busy_persist'); }, 400);
                node.state = 'backoff';
                node.timeout = Math.floor(Math.random() * 5) + 3;
                logEvent(`Node ${node.id} sensed channel busy. Backing off.`, 'warning');
            } else {
                if (node.id === 'A') highlightFlowchart('idle');
                setTimeout(() => { if (node.id === 'A') highlightFlowchart('idle_persist'); }, 400);
                node.state = 'transmitting';
                node.timeout = 10;
                simulationState.busState = 'busy';
                simulationState.metrics.tx++;
                logEvent(`Node ${node.id} sensed channel idle and started transmitting to ${node.currentTarget}.`, 'primary');
            }
        } else if (node.state === 'transmitting') {
            if (node.id === 'A') highlightFlowchart('transmit');
            node.timeout--;
            if (node.timeout <= 0) {
                node.state = 'idle';
                if(transmittingNodes.length > 1) { // Basic collision logic end check
                    logEvent(`Collision destroyed frame from ${node.id}.`, 'error');
                    simulationState.metrics.col++;
                    if (node.id === 'A') highlightFlowchart('collision');
                } else {
                    simulationState.metrics.succ++;
                    logEvent(`Node ${node.id} successfully transmitted frame to ${node.currentTarget}.`, 'success');
                    if (node.id === 'A') highlightFlowchart('success');
                }
                node.currentTarget = null;
            }
        } else if (node.state === 'backoff') {
            node.timeout--;
            if (node.timeout <= 0) {
                node.state = 'sensing';
                logEvent(`Node ${node.id} finished backoff, sensing again.`, 'info');
            }
        }
    });
    updateMetrics();
};

const stepCSMACD = () => {
    let transmittingNodes = simulationState.nodes.filter(n => n.state === 'transmitting');
    const jammingNodes = simulationState.nodes.filter(n => n.state === 'jamming');
    
    if (transmittingNodes.length > 1) {
        simulationState.busState = 'collision';
        transmittingNodes.forEach(node => {
            node.state = 'jamming';
            node.timeout = 2;
            node.k++;
            logEvent(`Collision detected by Node ${node.id}! Aborting and sending jamming signal.`, 'error');
            if (node.id === 'A') highlightFlowchart('collision');
            setTimeout(() => { if (node.id === 'A') highlightFlowchart('jamming'); }, 300);
            simulationState.metrics.col++;
            if(node.packetEl) { node.packetEl.remove(); node.packetEl = null; }
        });
    } else if (transmittingNodes.length === 1) {
        if(jammingNodes.length === 0) simulationState.busState = 'busy';
        else simulationState.busState = 'collision'; // Node hasn't stopped yet
    } else if (jammingNodes.length === 0) {
        simulationState.busState = 'idle';
    }

    simulationState.nodes.forEach(node => {
        if (node.state === 'alert') {
            if (node.id === 'A') highlightFlowchart('apply_persistence');
            node.state = 'sensing';
        } else if (node.state === 'sensing') {
            if (node.id === 'A') highlightFlowchart('sense');
            if (simulationState.busState === 'idle') {
                node.state = 'transmitting';
                node.timeout = 10;
                simulationState.busState = 'busy';
                simulationState.metrics.tx++;
                logEvent(`Node ${node.id} begins transmitting to ${node.currentTarget}.`, 'primary');
                if (node.id === 'A') highlightFlowchart('transmit');
            }
        } else if (node.state === 'transmitting') {
            if (simulationState.busState === 'collision') {
                // Another node jammed the channel, abort!
                node.state = 'jamming';
                node.timeout = 2;
                node.k++;
                logEvent(`Node ${node.id} heard jam signal! Aborting.`, 'error');
                if (node.id === 'A') highlightFlowchart('collision');
            } else {
                node.timeout--;
                if (node.timeout <= 0) {
                    node.state = 'idle';
                    simulationState.busState = 'idle';
                    simulationState.metrics.succ++;
                    logEvent(`Node ${node.id} successfully transmitted to ${node.currentTarget}.`, 'success');
                    if (node.id === 'A') highlightFlowchart('success');
                    node.currentTarget = null;
                }
            }
        } else if (node.state === 'jamming') {
            node.timeout--;
            if (node.timeout <= 0) {
                if (node.id === 'A') highlightFlowchart('check_kmax');
                if (node.k > 15) {
                    node.state = 'idle';
                    node.k = 0;
                    node.currentTarget = null;
                    logEvent(`Node ${node.id} reached max tries (15). Aborting frame.`, 'error');
                    if (node.id === 'A') highlightFlowchart('abort');
                } else {
                    node.state = 'backoff';
                    const R = Math.floor(Math.random() * Math.pow(2, Math.min(node.k, 10)));
                    node.timeout = R * 2 + 1; // wait time
                    logEvent(`Node ${node.id} applying backoff (Wait ${node.timeout} ticks).`, 'warning');
                    setTimeout(() => { if (node.id === 'A') highlightFlowchart('random_r'); setTimeout(() => { if (node.id === 'A') highlightFlowchart('wait_tb'); }, 300); }, 300);
                }
            }
        } else if (node.state === 'backoff') {
            node.timeout--;
            if (node.timeout <= 0) {
                node.state = 'sensing';
                logEvent(`Node ${node.id} backoff complete, sensing again.`, 'info');
            }
        }
    });
    updateMetrics();
};

const stepCSMACA = () => {
    let transmitting = simulationState.nodes.filter(n => n.state === 'transmitting').length;
    if(transmitting > 0) simulationState.busState = 'busy';
    else simulationState.busState = 'idle';

    simulationState.nodes.forEach(node => {
        if (node.state === 'alert') {
            node.state = 'sensing';
        } else if (node.state === 'sensing') {
            if (node.id === 'A') highlightFlowchart('sense');
            if (simulationState.busState === 'idle') {
                node.state = 'wait_ifs';
                node.timeout = 3;
                logEvent(`Node ${node.id} sensed idle. Waiting IFS.`, 'info');
                if (node.id === 'A') highlightFlowchart('wait_ifs');
            } else {
                node.state = 'backoff';
                node.timeout = Math.floor(Math.random() * 8) + 1;
            }
        } else if (node.state === 'wait_ifs') {
            if (node.id === 'A') highlightFlowchart('sense2');
            if (simulationState.busState !== 'idle') {
                node.state = 'backoff';
                node.timeout = Math.floor(Math.random() * 8) + 1;
                logEvent(`Channel became busy during IFS. Node ${node.id} backing off.`, 'warning');
            } else {
                node.timeout--;
                if (node.timeout <= 0) {
                    node.state = 'contention';
                    node.timeout = Math.floor(Math.random() * Math.pow(2, node.k + 1));
                    logEvent(`Node ${node.id} passed IFS. Waiting ${node.timeout} slots.`, 'info');
                    if (node.id === 'A') highlightFlowchart('random');
                    setTimeout(() => { if (node.id === 'A') highlightFlowchart('wait_r'); }, 400);
                }
            }
        } else if (node.state === 'contention') {
            if (node.id === 'A') highlightFlowchart('wait_r');
            if (simulationState.busState === 'idle') {
                node.timeout--;
                if (node.timeout <= 0) {
                    node.state = 'transmitting';
                    node.timeout = 10;
                    simulationState.busState = 'busy';
                    simulationState.metrics.tx++;
                    logEvent(`Node ${node.id} transmitting to ${node.currentTarget}.`, 'primary');
                    if (node.id === 'A') highlightFlowchart('send');
                }
            }
        } else if (node.state === 'transmitting') {
            if (node.id === 'A') highlightFlowchart('send');
            node.timeout--;
            if (node.timeout <= 0) {
                node.state = 'wait_ack';
                node.timeout = 2;
                simulationState.busState = 'idle'; 
                logEvent(`Node ${node.currentTarget} sending ACK to Node ${node.id}.`, 'info');
                if (node.id === 'A') highlightFlowchart('wait_ack');
            }
        } else if(node.state === 'wait_ack') {
            if (node.id === 'A') highlightFlowchart('wait_ack');
            
            // Random chance of collision in air
            if (node.timeout === 2 && Math.random() < 0.15) {
                logEvent(`Node ${node.id} transmission collided (No ACK received).`, 'error');
                simulationState.metrics.col++;
                node.state = 'failed_ack'; 
            } else if (node.state !== 'failed_ack') {
                node.timeout--;
                if (node.timeout <= 0) {
                    node.state = 'idle';
                    node.k = 0;
                    simulationState.metrics.succ++;
                    logEvent(`Node ${node.id} received ACK from Node ${node.currentTarget}. Success!`, 'success');
                    if (node.id === 'A') highlightFlowchart('success');
                    node.currentTarget = null;
                }
            }
        } else if (node.state === 'failed_ack') {
            node.k++;
            if (node.id === 'A') highlightFlowchart('kplus');
            setTimeout(() => { if (node.id === 'A') highlightFlowchart('kmax'); }, 300);
            
            if (node.k > 15) {
                node.state = 'idle';
                node.k = 0;
                node.currentTarget = null;
                logEvent(`Node ${node.id} reached max tries. Aborting.`, 'danger');
                setTimeout(() => { if (node.id === 'A') highlightFlowchart('abort'); }, 600);
            } else {
                node.state = 'sensing';
                logEvent(`Node ${node.id} failed ACK point. Retrying (${node.k}/15).`, 'warning');
                setTimeout(() => { if (node.id === 'A') highlightFlowchart('retry'); }, 600);
            }
        } else if (node.state === 'backoff') {
            node.timeout--;
            if (node.timeout <= 0) {
                node.state = 'sensing';
            }
        }
    });
    updateMetrics();
};

const runLoop = () => {
    if (simulationState.running) {
        tickSimulation();
        const baseDelay = 1100;
        const delay = Math.max(100, baseDelay - (simulationState.speed * 100));
        simulationState.timerId = setTimeout(runLoop, delay);
    }
};

const togglePlay = () => {
    simulationState.running = !simulationState.running;
    const btn = document.getElementById('btn-play');
    if (simulationState.running) {
        btn.innerText = 'Pause';
        btn.classList.add('bg-warning');
        btn.classList.remove('bg-primary');
        runLoop();
        logEvent('Simulation started.');
    } else {
        btn.innerText = 'Play';
        btn.classList.remove('bg-warning');
        btn.classList.add('bg-primary');
        if (simulationState.timerId) clearTimeout(simulationState.timerId);
        logEvent('Simulation paused.');
    }
};

const stepForward = () => {
    if (simulationState.running) {
        togglePlay(); // pause first
    }
    tickSimulation();
};

const resetSimulation = () => {
    if (simulationState.running) {
        togglePlay();
    }
    simulationState.time = 0;
    // Keep metrics or reset? Usually reset on explicitly reset
    simulationState.metrics = { tx: 0, col: 0, succ: 0 };
    simulationState.busState = 'idle';
    setupNodes();
    updateMetrics();
    updateNodeStatus();
    updateChannelUI();
    document.getElementById('event-log').innerHTML = '';
    logEvent('Simulation reset.');
    
    document.querySelectorAll('.flow-box').forEach(el => el.classList.remove('flow-active'));
};

const initSimulation = (protocolName) => {
    simulationState.protocol = protocolName;
    setupNodes();
    updateChannelUI();
    
    document.getElementById('btn-play').addEventListener('click', togglePlay);
    document.getElementById('btn-step').addEventListener('click', stepForward);
    document.getElementById('btn-reset').addEventListener('click', resetSimulation);
    
    document.getElementById('sim-speed').addEventListener('input', (e) => {
        simulationState.speed = parseInt(e.target.value);
    });

    const btnSendA = document.getElementById('btn-send-a');
    if (btnSendA) {
        btnSendA.addEventListener('click', () => {
            let nodeA = simulationState.nodes.find(n => n.id === 'A');
            if (!nodeA || nodeA.state !== 'idle') {
                logEvent('Node A must be idle before preparing a new frame.', 'warning');
                return;
            }
            
            const destRadio = document.querySelector('input[name="node-a-target"]:checked');
            if (destRadio) {
                nodeA.state = 'alert';
                nodeA.currentTarget = destRadio.value;
                logEvent(`Node A manually prepared a frame for Node ${destRadio.value}.`, 'info');
                // The simulation step logic will naturally pick up nodeA's 'alert' state
                // and flowchart will sync via the tick logic.
                highlightFlowchart('start');
            }
        });
    }
    
    logEvent(`${protocolName.toUpperCase()} Simulation Ready.`);
};
