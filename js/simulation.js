/* ═══════════════════════════════════════════
   DISCRETE SIMULATION ENGINE
   Supports CSMA, CSMA/CD, CSMA/CA
   Tick-based, step-driven, fully deterministic
═══════════════════════════════════════════ */

const SIM = {

  // ── Protocol State Maps ───────────────────────
  // Maps simulation state → flowchart node id
  FC_MAP: {
    csma: {
      start:       'csma-start',
      sense:       'csma-sense',
      idle_check:  'csma-idle',
      transmit:    'csma-transmit',
      col_check:   'csma-collision',
      success:     'csma-success',
    },
    csmacd: {
      start:       'csmacd-start',
      k0:          'csmacd-k0',
      sense:       'csmacd-sense',
      busy_check:  'csmacd-busy',
      transmit:    'csmacd-transmit',
      col_detect:  'csmacd-detect',
      jam:         'csmacd-jam',
      kinc:        'csmacd-kinc',
      kmax_check:  'csmacd-kmax',
      backoff:     'csmacd-backoff',
      success:     'csmacd-success',
      abort:       'csmacd-abort',
    },
    csmaca: {
      start:       'csmaca-start',
      k0:          'csmaca-k0',
      idle_check:  'csmaca-idle',
      ifs:         'csmaca-ifs',
      still_idle:  'csmaca-stillidle',
      rand_r:      'csmaca-rand',
      backoff:     'csmaca-backoff',
      send:        'csmaca-send',
      wait_ack:    'csmaca-waitack',
      ack_check:   'csmaca-ack',
      kinc:        'csmaca-kinc',
      kmax_check:  'csmaca-kmax',
      success:     'csmaca-success',
      abort:       'csmaca-abort',
    }
  },

  // ── Simulation State ──────────────────────────
  protocol: 'csma',
  clock: 0,
  running: false,
  // NOTE: SIM.finished is intentionally removed.
  // The simulation runs indefinitely; node A returns to idle
  // after success/abort and can be triggered again.
  // The auto-step loop never stops on its own.

  channel: 'idle',   // idle | busy | collision
  channelOwners: new Set(),

  nodes: {},
  // nodeId → { state, dest, K, backoffTimer, txProgress, isSrc }

  pendingAutoTx: [],   // auto-tx schedule: [{nodeId, tick}]
  autoScheduled: false,

  // ── Init ──────────────────────────────────────
  init(protocol) {
    SIM.protocol = protocol;
    SIM.clock = 0;
    SIM.running = false;
    SIM.channel = 'idle';
    SIM.channelOwners = new Set();
    SIM.pendingAutoTx = [];
    SIM.autoScheduled = false;

    SIM.nodes = {
      A: { state: 'idle', dest: 'B', K: 0, backoffTimer: 0, txProgress: 0, isSrc: false, pendingTx: false },
      B: { state: 'idle', dest: null, K: 0, backoffTimer: 0, txProgress: 0, isSrc: false, pendingTx: false },
      C: { state: 'idle', dest: null, K: 0, backoffTimer: 0, txProgress: 0, isSrc: false, pendingTx: false },
      D: { state: 'idle', dest: null, K: 0, backoffTimer: 0, txProgress: 0, isSrc: false, pendingTx: false },
    };

    FC.resetHighlights();
    SIM.log('---', `Protocol: ${protocol.toUpperCase()} | Reset`, '');
  },

  // ── Logging ───────────────────────────────────
  log(tick, msg, type = '') {
    const body = document.getElementById('log-body');
    if (!body) return;
    const entry = document.createElement('div');
    entry.className = 'log-entry';
    entry.innerHTML = `<span class="log-tick">[t=${tick}]</span><span class="log-msg ${type ? 'log-' + type : ''}">${msg}</span>`;
    body.appendChild(entry);
    body.scrollTop = body.scrollHeight;
  },

  // ── Node state shorthand ──────────────────────
  setState(nodeId, state) {
    SIM.nodes[nodeId].state = state;
  },

  // ── Channel helpers ───────────────────────────
  setChannel(state) {
    SIM.channel = state;
  },

  startTx(nodeId) {
    SIM.channelOwners.add(nodeId);
    if (SIM.channelOwners.size === 1) {
      SIM.setChannel('busy');
    } else {
      SIM.setChannel('collision');
    }
    SIM.setState(nodeId, 'transmitting');
  },

  endTx(nodeId) {
    SIM.channelOwners.delete(nodeId);
    if (SIM.channelOwners.size === 0) SIM.setChannel('idle');
    else if (SIM.channelOwners.size === 1) SIM.setChannel('busy');
  },

  // ── Random backoff ────────────────────────────
  randomBackoff(K) {
    const slots = Math.pow(2, Math.min(K, 10));
    return Math.floor(Math.random() * slots) + 1;
  },

  // ── Schedule autonomous transmissions ─────────
  scheduleAutoTx() {
    if (SIM.autoScheduled) return;
    SIM.autoScheduled = true;
    // B, C, D each try to transmit at pseudo-random future ticks
    const delays = [3, 5, 9]; // relative delays from now
    ['B', 'C', 'D'].forEach((id, i) => {
      SIM.pendingAutoTx.push({ nodeId: id, tick: SIM.clock + delays[i] });
    });
  },

  // ── Process auto-tx triggers ──────────────────
  processAutoTx() {
    SIM.pendingAutoTx.forEach(entry => {
      const n = SIM.nodes[entry.nodeId];
      if (entry.tick === SIM.clock && n.state === 'idle') {
        n.pendingTx = true;
        if (entry.nodeId === 'A') {
          // Dest already set by triggerA; keep it or pick B as fallback
          if (!n.dest) n.dest = 'B';
          n.isSrc = true;
          n.K = 0;
        } else {
          const others = ['A', 'B', 'C', 'D'].filter(x => x !== entry.nodeId);
          n.dest = others[Math.floor(Math.random() * others.length)];
          n.K = 0;
          n.isSrc = true;
        }
        SIM.log(SIM.clock, `Node ${entry.nodeId} wants to transmit`, '');
        SIM.setState(entry.nodeId, 'sensing');
      }
    });
    SIM.pendingAutoTx = SIM.pendingAutoTx.filter(e => e.tick > SIM.clock);
  },

  // ── Trigger A to send ─────────────────────────
  triggerA(dest) {
    const node = SIM.nodes.A;
    if (node.state !== 'idle') {
      SIM.log(SIM.clock, 'Node A is busy, wait...', '');
      return false;
    }
    node.dest = dest;
    node.isSrc = true;
    node.pendingTx = true;
    node.K = 0;
    SIM.setState('A', 'sensing');
    SIM.running = true;

    if (!SIM.autoScheduled) SIM.scheduleAutoTx();

    SIM.log(SIM.clock, `Node A → ${dest}: initiating (${SIM.protocol.toUpperCase()})`, '');
    SIM.fcHighlight('sense');
    return true;
  },

  // ── Flowchart highlight helper ─────────────────
  fcHighlight(step) {
    const map = SIM.FC_MAP[SIM.protocol];
    if (map && map[step]) FC.highlight(map[step]);
  },

  // ══════════════════════════════════════════════
  // STEP ENGINE
  // Each call advances the simulation one atomic step
  // ══════════════════════════════════════════════
  step() {
    if (!SIM.running) return;

    SIM.clock++;
    SIM.processAutoTx();

    switch (SIM.protocol) {
      case 'csma':   SIM.stepCSMA();   break;
      case 'csmacd': SIM.stepCSMACD(); break;
      case 'csmaca': SIM.stepCSMACA(); break;
    }

    // Update autonomous nodes (simplified)
    SIM.updateAutoNodes();
  },

  // ── Auto-node behavior (simplified for all protocols) ──
  updateAutoNodes() {
    if (SIM.nodes.A.state === 'receiving') SIM.setState('A', 'idle');
    ['B', 'C', 'D'].forEach(id => {
      const n = SIM.nodes[id];
      if (n.state === 'sensing') {
        if (SIM.channel === 'idle') {
          // Small chance to transmit this tick
          if (Math.random() < 0.35 && n.pendingTx) {
            SIM.startTx(id);
            n.txLen = 3;
            n.txProgress = 3;
            SIM.log(SIM.clock, `Node ${id} starts transmitting`, '');
          }
        }
      } else if (n.state === 'transmitting') {
        n.txProgress--;
        if (n.txProgress <= 0) {
          SIM.endTx(id);
          if (SIM.channel !== 'collision') {
            SIM.setState(id, 'idle');
            n.pendingTx = false;
            SIM.log(SIM.clock, `Node ${id} finished transmitting`, 'success');
            if (SIM.nodes[n.dest]) SIM.setState(n.dest, 'receiving');
            // Schedule the node again to run indefinitely
            SIM.pendingAutoTx.push({ nodeId: id, tick: SIM.clock + 15 + Math.floor(Math.random() * 25) });
          } else {
            SIM.setState(id, 'collision');
            SIM.log(SIM.clock, `Node ${id} collision!`, 'collision');
          }
        }
      } else if (n.state === 'collision') {
        n.K = Math.min(n.K + 1, 16);
        if (n.K > 15) {
            SIM.setState(id, 'idle');
            n.pendingTx = false;
            n.K = 0;
            SIM.log(SIM.clock, `Node ${id} ABORT`, 'abort');
            // Schedule the node again to run indefinitely
            SIM.pendingAutoTx.push({ nodeId: id, tick: SIM.clock + 15 + Math.floor(Math.random() * 25) });
        } else {
            n.backoffTimer = SIM.randomBackoff(n.K);
            SIM.setState(id, 'backoff');
        }
      } else if (n.state === 'backoff') {
        n.backoffTimer--;
        if (n.backoffTimer <= 0) {
          SIM.setState(id, 'sensing');
        }
      } else if (n.state === 'receiving') {
        SIM.setState(id, 'idle');
      }
    });
  },

  // ══════════════════════════════════════════════
  // CSMA STEP LOGIC
  // ══════════════════════════════════════════════
  stepCSMA() {
    const a = SIM.nodes.A;

    if (a.state === 'sensing') {
      SIM.fcHighlight('sense');
      SIM.fcHighlight('idle_check');
      if (SIM.channel === 'idle') {
        SIM.log(SIM.clock, 'A: channel idle → transmit immediately', '');
        SIM.startTx('A');
        a.txLen = 4;
        a.txProgress = 4;
        SIM.fcHighlight('transmit');
      } else {
        SIM.log(SIM.clock, 'A: channel busy → keep sensing', '');
      }
      return;
    }

    if (a.state === 'transmitting') {
      a.txProgress--;
      SIM.fcHighlight('transmit');
      if (a.txProgress <= 0) {
        SIM.endTx('A');
        SIM.fcHighlight('col_check');
        if (SIM.channelOwners.size > 0 || SIM.channel === 'collision') {
          // collision
          SIM.setState('A', 'collision');
          SIM.log(SIM.clock, 'A: COLLISION detected → retry', 'collision');
          SIM.endTx('A');
          SIM.setChannel('idle');
          SIM.channelOwners.clear();
          setTimeout(() => {
            SIM.setState('A', 'sensing');
            a.K++;
          }, 0);
        } else {
          SIM.setState('A', 'idle');
          a.isSrc = false;
          a.pendingTx = false;
          SIM.fcHighlight('success');
          SIM.log(SIM.clock, `A → ${a.dest}: SUCCESS`, 'success');
          // Mark destination as receiving
          if (SIM.nodes[a.dest]) SIM.setState(a.dest, 'receiving');
          // Reschedule A for another round after a short gap
          // SIM.pendingAutoTx.push({ nodeId: 'A', tick: SIM.clock + 6 }); // Removed node A auto resume
        }
      }
      return;
    }

    if (a.state === 'collision') {
      SIM.setState('A', 'sensing');
      a.K++;
      SIM.log(SIM.clock, `A: retry attempt K=${a.K}`, '');
      SIM.fcHighlight('sense');
      return;
    }
  },

  // ══════════════════════════════════════════════
  // CSMA/CD STEP LOGIC
  // ══════════════════════════════════════════════
  stepCSMACD() {
    const a = SIM.nodes.A;

    if (a.state === 'sensing') {
      SIM.fcHighlight('sense');
      SIM.fcHighlight('busy_check');
      if (SIM.channel === 'idle') {
        SIM.log(SIM.clock, 'A: channel idle → start transmit', '');
        SIM.startTx('A');
        a.txLen = 5;
        a.txProgress = 5;
        SIM.fcHighlight('transmit');
      } else {
        SIM.log(SIM.clock, 'A: channel busy → continue sensing', '');
        SIM.fcHighlight('busy_check');
      }
      return;
    }

    if (a.state === 'transmitting') {
      a.txProgress--;
      SIM.fcHighlight('transmit');
      SIM.fcHighlight('col_detect');

      // Check mid-transmission collision
      if (SIM.channel === 'collision') {
        SIM.endTx('A');
        SIM.setState('A', 'collision');
        SIM.fcHighlight('jam');
        SIM.log(SIM.clock, 'A: COLLISION → sending jam signal', 'collision');
        return;
      }

      if (a.txProgress <= 0) {
        SIM.endTx('A');
        SIM.setState('A', 'idle');
        a.isSrc = false;
        a.pendingTx = false;
        SIM.fcHighlight('success');
        SIM.log(SIM.clock, `A → ${a.dest}: SUCCESS (no collision)`, 'success');
        if (SIM.nodes[a.dest]) SIM.setState(a.dest, 'receiving');
        // SIM.pendingAutoTx.push({ nodeId: 'A', tick: SIM.clock + 6 });
      }
      return;
    }

    if (a.state === 'collision') {
      // Jam sent, now increment K
      a.K++;
      SIM.fcHighlight('kinc');
      SIM.fcHighlight('kmax_check');

      // Clear channel
      SIM.channelOwners.clear();
      SIM.setChannel('idle');

      if (a.K > 15) {
        SIM.setState('A', 'idle');
        a.K = 0;
        a.isSrc = false;
        a.pendingTx = false;
        SIM.fcHighlight('abort');
        SIM.log(SIM.clock, `A: K=${a.K} > K_max → ABORT`, 'abort');
        // SIM.pendingAutoTx.push({ nodeId: 'A', tick: SIM.clock + 8 });
        return;
      }

      const bo = SIM.randomBackoff(a.K);
      a.backoffTimer = bo;
      SIM.setState('A', 'backoff');
      SIM.fcHighlight('backoff');
      SIM.log(SIM.clock, `A: backoff K=${a.K}, wait ${bo} slots`, 'backoff');
      return;
    }

    if (a.state === 'backoff') {
      a.backoffTimer--;
      SIM.fcHighlight('backoff');
      if (a.backoffTimer <= 0) {
        SIM.setState('A', 'sensing');
        SIM.fcHighlight('sense');
        SIM.log(SIM.clock, 'A: backoff done → sense again', '');
      } else {
        SIM.log(SIM.clock, `A: backing off (${a.backoffTimer} slots left)`, 'backoff');
      }
      return;
    }
  },

  // ══════════════════════════════════════════════
  // CSMA/CA STEP LOGIC
  // ══════════════════════════════════════════════
  stepCSMACA() {
    const a = SIM.nodes.A;

    if (a.state === 'sensing') {
      SIM.fcHighlight('idle_check');
      if (SIM.channel === 'idle') {
        SIM.log(SIM.clock, 'A: channel idle → waiting IFS', '');
        a.ifsTimer = 2;
        SIM.setState('A', 'waiting');
        SIM.fcHighlight('ifs');
      } else {
        SIM.log(SIM.clock, 'A: channel busy → wait for idle', '');
      }
      return;
    }

    if (a.state === 'waiting') {
      if (!a.ifsTimer) a.ifsTimer = 2;
      a.ifsTimer--;
      SIM.fcHighlight('ifs');

      if (a.ifsTimer <= 0) {
        // Check still idle
        SIM.fcHighlight('still_idle');
        if (SIM.channel !== 'idle') {
          SIM.log(SIM.clock, 'A: channel busy after IFS → re-sense', '');
          SIM.setState('A', 'sensing');
          SIM.fcHighlight('idle_check');
          return;
        }
        // Compute random backoff
        const R = SIM.randomBackoff(a.K);
        a.backoffTimer = R;
        SIM.fcHighlight('rand_r');
        SIM.log(SIM.clock, `A: IFS done, R=${R}, waiting backoff slots`, '');
        SIM.setState('A', 'backoff');
        SIM.fcHighlight('backoff');
      } else {
        SIM.log(SIM.clock, `A: waiting IFS (${a.ifsTimer} ticks left)`, '');
      }
      return;
    }

    if (a.state === 'backoff') {
      a.backoffTimer--;
      SIM.fcHighlight('backoff');
      if (a.backoffTimer <= 0) {
        SIM.log(SIM.clock, 'A: backoff done → transmitting', '');
        SIM.startTx('A');
        a.txLen = 4;
        a.txProgress = 4;
        SIM.setState('A', 'transmitting');
        SIM.fcHighlight('send');
      } else {
        SIM.log(SIM.clock, `A: backoff countdown (${a.backoffTimer} slots)`, 'backoff');
      }
      return;
    }

    if (a.state === 'transmitting') {
      a.txProgress--;
      SIM.fcHighlight('send');
      if (a.txProgress <= 0) {
        SIM.endTx('A');
        SIM.setState('A', 'waiting');
        a.ackTimer = 3;
        SIM.fcHighlight('wait_ack');
        SIM.log(SIM.clock, 'A: frame sent → waiting for ACK', '');
      }
      return;
    }

    // waiting for ACK (re-using waiting state with ackTimer)
    if (a.state === 'waiting' && a.ackTimer !== undefined) {
      a.ackTimer--;
      SIM.fcHighlight('wait_ack');
      SIM.fcHighlight('ack_check');

      if (a.ackTimer <= 0) {
        // Determine ACK outcome
        const collisionOccurred = SIM.channel === 'collision' || (a.K > 0 && Math.random() < 0.25);
        if (!collisionOccurred) {
          SIM.setState('A', 'idle');
          a.isSrc = false;
          a.pendingTx = false;
          SIM.fcHighlight('success');
          SIM.log(SIM.clock, `A → ${a.dest}: ACK received → SUCCESS`, 'success');
          if (SIM.nodes[a.dest]) SIM.setState(a.dest, 'receiving');
          delete a.ackTimer;
          // SIM.pendingAutoTx.push({ nodeId: 'A', tick: SIM.clock + 6 });
        } else {
          // No ACK
          a.K++;
          SIM.fcHighlight('kinc');
          SIM.fcHighlight('kmax_check');
          delete a.ackTimer;

          if (a.K > 15) {
            SIM.setState('A', 'idle');
            a.K = 0;
            a.isSrc = false;
            a.pendingTx = false;
            SIM.fcHighlight('abort');
            SIM.log(SIM.clock, `A: K=${a.K} > 15 → ABORT`, 'abort');
            // SIM.pendingAutoTx.push({ nodeId: 'A', tick: SIM.clock + 8 });
            return;
          }

          SIM.log(SIM.clock, `A: no ACK, K=${a.K} → retry`, 'backoff');
          SIM.setState('A', 'sensing');
          SIM.fcHighlight('idle_check');
        }
      }
      return;
    }
  }
};