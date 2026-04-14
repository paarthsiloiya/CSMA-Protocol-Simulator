/* ═══════════════════════════════════════════
   MAIN APPLICATION CONTROLLER
   UI rendering, event bindings, DOM updates
═══════════════════════════════════════════ */

(function () {
  'use strict';

  const NODE_IDS = ['A', 'B', 'C', 'D'];
  let currentProtocol = 'csma';
  let autoStepInterval = null;
  let isPlaying = false;
  let stepInterval = 600; // ms — default speed

  // ── Init ──────────────────────────────────────
  function init() {
    FC.buildAll();
    renderNodes();
    bindEvents();
    switchProtocol('csma');
    SIM.init('csma');
    renderAll();
  }

  // ── Render node row ──────────────────────────
  function renderNodes() {
    const row = document.getElementById('node-row');
    row.innerHTML = '';
    NODE_IDS.forEach(id => {
      const item = document.createElement('div');
      item.className = 'node-item';
      item.id = `node-item-${id}`;
      item.innerHTML = `
        <div class="node-circle state-idle" id="node-circle-${id}">
          <span class="node-letter">${id}</span>
        </div>
        <div class="node-state-badge state-idle" id="node-badge-${id}">IDLE</div>
        <div class="node-label" id="node-label-${id}"></div>
      `;
      row.appendChild(item);
    });
  }

  // ── Update DOM from SIM state ─────────────────
  function renderAll() {
    // Clock
    document.getElementById('clock-val').textContent = SIM.clock;

    // Nodes
    NODE_IDS.forEach(id => {
      const node = SIM.nodes[id];
      const circle = document.getElementById(`node-circle-${id}`);
      const badge  = document.getElementById(`node-badge-${id}`);
      const label  = document.getElementById(`node-label-${id}`);

      const s = node.state;
      circle.className = `node-circle state-${s}`;
      badge.className  = `node-state-badge state-${s}`;
      badge.textContent = s.toUpperCase();

      let lbl = '';
      if (s === 'backoff') lbl = `bo:${node.backoffTimer}`;
      if (s === 'transmitting') lbl = `tx:${node.txProgress}`;
      label.textContent = lbl;
    });

    // Channel
    renderChannel();

    // Button states
    const started = SIM.running;
    // Step — always enabled once started or right away
    document.getElementById('btn-step').disabled = false;
    // Play/Pause button label and icon
    updatePlayPauseBtn();
  }

  // ── Play/Pause button UI sync ─────────────────
  function updatePlayPauseBtn() {
    const btn = document.getElementById('btn-playpause');
    if (!btn) return;
    if (isPlaying) {
      btn.innerHTML = `
        <svg width="14" height="14" viewBox="0 0 14 14" fill="none">
          <rect x="2" y="2" width="3.5" height="10" rx="1" fill="currentColor"/>
          <rect x="8.5" y="2" width="3.5" height="10" rx="1" fill="currentColor"/>
        </svg>
        Pause`;
      btn.setAttribute('aria-label', 'Pause simulation');
      btn.classList.add('playing');
    } else {
      btn.innerHTML = `
        <svg width="14" height="14" viewBox="0 0 14 14" fill="none">
          <path d="M3 2l9 5-9 5V2z" fill="currentColor"/>
        </svg>
        Play`;
      btn.setAttribute('aria-label', 'Play simulation');
      btn.classList.remove('playing');
    }
    btn.disabled = false; // Never disabled
  }

  // ── Channel visual ────────────────────────────
  function renderChannel() {
    const ch = SIM.channel;
    const badge    = document.getElementById('channel-badge');
    const line     = document.querySelector('.channel-line');
    const particle = document.getElementById('frame-particle');
    const jam      = document.getElementById('jam-overlay');

    badge.textContent = ch.toUpperCase();
    badge.className = 'channel-status-badge';
    if (ch === 'busy')      badge.classList.add('busy');
    if (ch === 'collision') badge.classList.add('collision');

    line.className = 'channel-line';
    if (ch === 'busy')      line.classList.add('busy-line');
    if (ch === 'collision') line.classList.add('collision-line');

    let txNodeId = null;
    let maxProgress = 0;
    NODE_IDS.forEach(id => {
      if (SIM.nodes[id].state === 'transmitting') {
        txNodeId = id;
        let p = 1 - (SIM.nodes[id].txProgress / (SIM.nodes[id].txLen || 5));
        if (p > maxProgress) maxProgress = p;
      }
    });

    if (ch === 'busy' && txNodeId) {
      particle.style.display = 'flex';
      const destId = SIM.nodes[txNodeId].dest || '?';
      
      const srcIdx = NODE_IDS.indexOf(txNodeId);
      const destIdx = NODE_IDS.indexOf(destId);
      
      if (destIdx < srcIdx) {
          particle.textContent = `${destId} \u2190 ${txNodeId}`;
      } else {
          particle.textContent = `${txNodeId} \u2192 ${destId}`;
      }
      
      // Calculate normalized positions (0, 0.333, 0.666, 1)
      const srcPos = srcIdx / 3;
      const destPos = destIdx !== -1 ? destIdx / 3 : srcPos;
      
      // Interpolate current position based on progress
      const currentPos = srcPos + (destPos - srcPos) * maxProgress;

      const track = document.getElementById('channel-track');
      const particleW = 40; // Approx based on css 
      
      // Calculate pixel position
      particle.style.left = `calc(${currentPos * 100}% - ${particleW / 2}px)`; 
    } else {
      particle.style.display = 'none';
      particle.textContent = '';
    }

    jam.style.display = (ch === 'collision') ? 'block' : 'none';

    document.getElementById('chinfo-idle').classList.toggle('active-state', ch === 'idle');
    document.getElementById('chinfo-busy').classList.toggle('active-state', ch === 'busy');
    document.getElementById('chinfo-collision').classList.toggle('active-state', ch === 'collision');
  }

  // ── Switch protocol ───────────────────────────
  function switchProtocol(proto) {
    currentProtocol = proto;

    document.querySelectorAll('.nav-tab').forEach(t => {
      t.classList.toggle('active', t.dataset.protocol === proto);
    });
    document.querySelectorAll('.theory-content').forEach(t => {
      t.classList.toggle('active', t.id === `theory-${proto}`);
    });
    document.querySelectorAll('.flowchart-wrap').forEach(f => {
      f.classList.toggle('active', f.id === `fc-${proto}`);
    });

    pause();
    SIM.init(proto);
    renderAll();

    const body = document.getElementById('log-body');
    if (body) body.innerHTML = '';
    SIM.log(0, `Switched to ${proto.toUpperCase()} — click "Send Frame from A" to begin`, '');
  }

  // ── Auto-step helpers ─────────────────────────
  function stopInterval() {
    if (autoStepInterval) {
      clearInterval(autoStepInterval);
      autoStepInterval = null;
    }
  }

  function startInterval() {
    stopInterval();
    autoStepInterval = setInterval(() => {
      if (!SIM.running) return; // sim not started yet; keep waiting
      SIM.step();
      renderAll();
    }, stepInterval);
  }

  function play() {
    if (!isPlaying) {
      isPlaying = true;
      if (!SIM.running) {
        SIM.running = true;
        if (!SIM.autoScheduled) SIM.scheduleAutoTx();
      }
      startInterval();
      updatePlayPauseBtn();
    }
  }

  function pause() {
    if (isPlaying) {
      isPlaying = false;
      stopInterval();
      updatePlayPauseBtn();
    }
  }

  function togglePlayPause() {
    if (isPlaying) pause(); else play();
  }

  // ── Update speed without restarting ──────────
  function applySpeed(ms) {
    stepInterval = ms;
    if (isPlaying) startInterval(); // restart with new interval
  }

  // ── Event Bindings ────────────────────────────
  function bindEvents() {

    // Protocol tabs
    document.querySelectorAll('.nav-tab').forEach(tab => {
      tab.addEventListener('click', () => switchProtocol(tab.dataset.protocol));
    });

    // Destination pill selector
    document.querySelectorAll('.pill').forEach(pill => {
      pill.addEventListener('click', function () {
        document.querySelectorAll('.pill').forEach(p => p.classList.remove('active-pill'));
        this.classList.add('active-pill');
      });
    });

    // Send Frame from A
    document.getElementById('btn-send').addEventListener('click', () => {
      const dest = document.querySelector('input[name="dest"]:checked')?.value || 'B';
      const ok = SIM.triggerA(dest);
      if (ok) {
        renderAll();
        play(); // auto-start playing
      }
    });

    // Play / Pause
    document.getElementById('btn-playpause').addEventListener('click', () => {
      togglePlayPause();
    });

    // Step — single tick, works while paused
    document.getElementById('btn-step').addEventListener('click', () => {
      if (!SIM.running) {
        SIM.running = true;
        if (!SIM.autoScheduled) SIM.scheduleAutoTx();
      }
      pause(); // stop auto-play when manually stepping
      SIM.step();
      renderAll();
    });

    // Reset
    document.getElementById('btn-reset').addEventListener('click', () => {
      pause();
      SIM.init(currentProtocol);
      renderAll();
      const body = document.getElementById('log-body');
      if (body) body.innerHTML = '';
      FC.resetHighlights();
      SIM.log(0, `${currentProtocol.toUpperCase()} reset — ready`, '');
    });

    // Speed control
    document.getElementById('speed-select').addEventListener('change', function () {
      applySpeed(Number(this.value));
    });
  }

  // ── Boot ──────────────────────────────────────
  document.addEventListener('DOMContentLoaded', init);

})();