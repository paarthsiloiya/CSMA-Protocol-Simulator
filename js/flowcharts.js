/* ═══════════════════════════════════════════
   FLOWCHART RENDERER
   Renders SVG flowcharts for CSMA, CSMA/CD, CSMA/CA
   Each node has a unique id for simulation sync
═══════════════════════════════════════════ */

const FC = {

  // ── SVG helpers ──────────────────────────────
  ns: 'http://www.w3.org/2000/svg',

  el(tag, attrs = {}) {
    const e = document.createElementNS(FC.ns, tag);
    for (const [k, v] of Object.entries(attrs)) e.setAttribute(k, v);
    return e;
  },

  addDefs(svg) {
    const defs = FC.el('defs');
    // Arrow marker
    const marker = FC.el('marker', {
      id: 'arrowhead', markerWidth: '8', markerHeight: '6',
      refX: '7', refY: '3', orient: 'auto'
    });
    const poly = FC.el('polygon', {
      points: '0 0, 8 3, 0 6',
      fill: '#ccc5b9',
      id: 'arrow-poly'
    });
    marker.appendChild(poly);
    defs.appendChild(marker);

    // Active arrow marker
    const marker2 = FC.el('marker', {
      id: 'arrowhead-active', markerWidth: '8', markerHeight: '6',
      refX: '7', refY: '3', orient: 'auto'
    });
    const poly2 = FC.el('polygon', {
      points: '0 0, 8 3, 0 6',
      fill: '#eb5e28'
    });
    marker2.appendChild(poly2);
    defs.appendChild(marker2);

    svg.appendChild(defs);
  },

  // Draw terminal (rounded rect) — Start/End
  terminal(svg, id, x, y, w, h, label) {
    const g = FC.el('g', { id, class: 'fc-node' });
    g.appendChild(FC.el('rect', { x: x - w/2, y: y - h/2, width: w, height: h, rx: h/2, ry: h/2 }));
    const t = FC.el('text', { x, y: y + 1 });
    t.textContent = label;
    g.appendChild(t);
    svg.appendChild(g);
    return g;
  },

  // Draw process box (rectangle)
  process(svg, id, x, y, w, h, lines) {
    const g = FC.el('g', { id, class: 'fc-node' });
    g.appendChild(FC.el('rect', { x: x - w/2, y: y - h/2, width: w, height: h, rx: 3 }));
    if (Array.isArray(lines)) {
      const lineH = 12;
      const startY = y - (lines.length - 1) * lineH / 2;
      lines.forEach((line, i) => {
        const t = FC.el('text', { x, y: startY + i * lineH });
        t.textContent = line;
        g.appendChild(t);
      });
    } else {
      const t = FC.el('text', { x, y: y + 1 });
      t.textContent = lines;
      g.appendChild(t);
    }
    svg.appendChild(g);
    return g;
  },

  // Draw decision diamond
  diamond(svg, id, x, y, w, h, lines) {
    const g = FC.el('g', { id, class: 'fc-node' });
    const hw = w/2, hh = h/2;
    g.appendChild(FC.el('polygon', {
      points: `${x},${y-hh} ${x+hw},${y} ${x},${y+hh} ${x-hw},${y}`
    }));
    if (Array.isArray(lines)) {
      const lineH = 11;
      const startY = y - (lines.length - 1) * lineH / 2;
      lines.forEach((line, i) => {
        const t = FC.el('text', { x, y: startY + i * lineH });
        t.textContent = line;
        g.appendChild(t);
      });
    } else {
      const t = FC.el('text', { x, y: y + 1 });
      t.textContent = lines;
      g.appendChild(t);
    }
    svg.appendChild(g);
    return g;
  },

  // Arrow with optional label
  arrow(svg, x1, y1, x2, y2, label = '', labelSide = 'right') {
    const g = FC.el('g');
    const path = FC.el('line', {
      x1, y1, x2, y2,
      class: 'fc-arrow',
      'marker-end': 'url(#arrowhead)'
    });
    g.appendChild(path);
    if (label) {
      const mx = (x1 + x2) / 2;
      const my = (y1 + y2) / 2;
      const t = FC.el('text', {
        x: mx + (labelSide === 'right' ? 8 : -8),
        y: my,
        'font-family': 'DM Mono, monospace',
        'font-size': '9',
        fill: '#403d39',
        'text-anchor': labelSide === 'right' ? 'start' : 'end',
        'dominant-baseline': 'middle'
      });
      t.textContent = label;
      g.appendChild(t);
    }
    svg.appendChild(g);
    return g;
  },

  // Bent arrow (for loops) — series of points
  polyArrow(svg, points, label = '') {
    const g = FC.el('g');
    let d = `M ${points[0][0]} ${points[0][1]}`;
    for (let i = 1; i < points.length; i++) {
      d += ` L ${points[i][0]} ${points[i][1]}`;
    }
    const path = FC.el('path', {
      d,
      class: 'fc-arrow',
      'marker-end': 'url(#arrowhead)',
      fill: 'none'
    });
    g.appendChild(path);
    if (label) {
      const last = points[points.length - 1];
      const prev = points[points.length - 2];
      const mx = (last[0] + prev[0]) / 2 + 6;
      const my = (last[1] + prev[1]) / 2;
      const t = FC.el('text', {
        x: mx, y: my,
        'font-family': 'DM Mono, monospace',
        'font-size': '9',
        fill: '#403d39',
        'dominant-baseline': 'middle'
      });
      t.textContent = label;
      g.appendChild(t);
    }
    svg.appendChild(g);
    return g;
  },

  // ── CSMA Flowchart ────────────────────────────
  buildCSMA() {
    const svg = document.getElementById('svg-csma');
    FC.addDefs(svg);
    const cx = 130;

    FC.terminal(svg, 'csma-start', cx, 30, 70, 22, 'START');
    FC.arrow(svg, cx, 41, cx, 65);

    FC.process(svg, 'csma-sense', cx, 80, 110, 24, 'Sense Channel');
    FC.arrow(svg, cx, 92, cx, 120);

    FC.diamond(svg, 'csma-idle', cx, 142, 110, 40, ['Channel', 'Idle?']);

    // YES → transmit
    FC.arrow(svg, cx, 162, cx, 196, 'YES');
    FC.process(svg, 'csma-transmit', cx, 210, 110, 24, 'Transmit Frame');
    FC.arrow(svg, cx, 222, cx, 256);

    FC.diamond(svg, 'csma-collision', cx, 278, 120, 40, ['Collision', 'Detected?']);

    // NO → success
    FC.arrow(svg, cx, 298, cx, 330, 'NO');
    FC.terminal(svg, 'csma-success', cx, 346, 80, 24, 'SUCCESS');

    // YES collision → retry
    // right side out
    FC.polyArrow(svg, [
      [cx + 60, 278],
      [220, 278],
      [220, 80],
      [cx + 55, 80]
    ], 'YES');

    // NO channel (keep sensing)
    FC.polyArrow(svg, [
      [cx - 55, 142],
      [30, 142],
      [30, 80],
      [cx - 55, 80]
    ], 'NO');

    // label on left side
    const lbl = FC.el('text', {
      x: 18, y: 110,
      'font-family': 'DM Mono, monospace',
      'font-size': '9',
      fill: '#403d39',
      'text-anchor': 'middle',
      'writing-mode': 'tb'
    });
    lbl.textContent = 'Keep sensing';
    svg.appendChild(lbl);
  },

  // ── CSMA/CD Flowchart ─────────────────────────
  buildCSMACD() {
    const svg = document.getElementById('svg-csmacd');
    FC.addDefs(svg);
    const cx = 150;

    FC.terminal(svg, 'csmacd-start', cx, 28, 70, 22, 'START');
    FC.arrow(svg, cx, 39, cx, 63);

    FC.process(svg, 'csmacd-k0', cx, 76, 70, 22, 'K = 0');
    FC.arrow(svg, cx, 87, cx, 112);

    FC.process(svg, 'csmacd-sense', cx, 125, 120, 22, 'Sense Channel');
    FC.arrow(svg, cx, 136, cx, 164);

    FC.diamond(svg, 'csmacd-busy', cx, 186, 110, 40, ['Channel', 'Busy?']);

    // YES busy → loop back sensing
    FC.polyArrow(svg, [
      [cx + 55, 186],
      [240, 186],
      [240, 125],
      [cx + 60, 125]
    ], 'YES');

    // NO → transmit
    FC.arrow(svg, cx, 206, cx, 234, 'NO');
    FC.process(svg, 'csmacd-transmit', cx, 248, 120, 22, 'Transmit Frame');
    FC.arrow(svg, cx, 259, cx, 286);

    FC.diamond(svg, 'csmacd-detect', cx, 308, 120, 40, ['Collision', 'Detected?']);

    // NO → success
    FC.arrow(svg, cx, 328, cx, 358, 'NO');
    FC.terminal(svg, 'csmacd-success', cx, 372, 80, 22, 'SUCCESS');

    // YES → jam
    FC.polyArrow(svg, [
      [cx + 60, 308],
      [cx + 90, 308],
      [cx + 90, 408],
      [cx + 30, 408]
    ], 'YES');
    FC.process(svg, 'csmacd-jam', cx, 408, 100, 22, 'Send Jam Signal');
    FC.arrow(svg, cx, 419, cx, 444);

    FC.process(svg, 'csmacd-kinc', cx, 457, 80, 22, 'K = K + 1');
    FC.arrow(svg, cx, 468, cx, 495);

    FC.diamond(svg, 'csmacd-kmax', cx, 515, 100, 38, ['K > K_max?']);

    // YES abort
    FC.arrow(svg, cx, 534, cx, 560, 'YES');
    FC.terminal(svg, 'csmacd-abort', cx, 574, 70, 22, 'ABORT');

    // NO backoff
    FC.polyArrow(svg, [
      [cx - 50, 515],
      [30, 515],
      [30, 457],
      [cx - 40, 457]
    ], 'NO');
    FC.process(svg, 'csmacd-backoff-placeholder', cx - 40, 457, 0, 0, ''); // placeholder, actual below
    // Replace with proper backoff box
    FC.process(svg, 'csmacd-backoff', 60, 457, 80, 22, 'Backoff');

    // backoff → retry (loop to sense)
    FC.polyArrow(svg, [
      [20, 457],
      [20, 125],
      [cx - 60, 125]
    ]);
  },

  // ── CSMA/CA Flowchart ─────────────────────────
  buildCSMACA() {
    const svg = document.getElementById('svg-csmaca');
    FC.addDefs(svg);
    const cx = 150;

    FC.terminal(svg, 'csmaca-start', cx, 28, 70, 22, 'START');
    FC.arrow(svg, cx, 39, cx, 63);

    FC.process(svg, 'csmaca-k0', cx, 76, 70, 22, 'K = 0');
    FC.arrow(svg, cx, 87, cx, 114);

    FC.diamond(svg, 'csmaca-idle', cx, 136, 110, 40, ['Channel', 'Idle?']);

    // NO → wait
    FC.polyArrow(svg, [
      [cx + 55, 136],
      [240, 136],
      [240, 76],
      [cx + 35, 76]
    ], 'NO');

    // YES → IFS
    FC.arrow(svg, cx, 156, cx, 184, 'YES');
    FC.process(svg, 'csmaca-ifs', cx, 198, 110, 24, 'Wait IFS Time');
    FC.arrow(svg, cx, 210, cx, 238);

    FC.diamond(svg, 'csmaca-stillidle', cx, 260, 110, 40, ['Still', 'Idle?']);

    // NO → loop to sense
    FC.polyArrow(svg, [
      [cx + 55, 260],
      [245, 260],
      [245, 136],
      [cx + 55, 136]
    ], 'NO');

    // YES → backoff
    FC.arrow(svg, cx, 280, cx, 308, 'YES');
    FC.process(svg, 'csmaca-rand', cx, 322, 130, 24, ['Choose random R', '(0 to 2^K - 1)']);
    FC.arrow(svg, cx, 334, cx, 360);

    FC.process(svg, 'csmaca-backoff', cx, 374, 110, 24, 'Wait R Slots');
    FC.arrow(svg, cx, 386, cx, 412);

    FC.process(svg, 'csmaca-send', cx, 426, 110, 24, 'Send Frame');
    FC.arrow(svg, cx, 438, cx, 464);

    FC.process(svg, 'csmaca-waitack', cx, 478, 110, 24, 'Wait for ACK');
    FC.arrow(svg, cx, 490, cx, 518);

    FC.diamond(svg, 'csmaca-ack', cx, 540, 110, 40, ['ACK', 'Received?']);

    // YES → success
    FC.arrow(svg, cx, 560, cx, 590, 'YES');
    FC.terminal(svg, 'csmaca-success', cx, 604, 80, 22, 'SUCCESS');

    // NO → K+1
    FC.polyArrow(svg, [
      [cx + 55, 540],
      [cx + 90, 540],
      [cx + 90, 620],
      [cx + 40, 620]
    ], 'NO');
    FC.process(svg, 'csmaca-kinc', cx, 620, 80, 22, 'K = K + 1');
    FC.arrow(svg, cx - 40, 620, cx - 60, 620);

    FC.diamond(svg, 'csmaca-kmax', cx - 90, 620, 80, 36, ['K > 15?']);

    // YES abort
    FC.arrow(svg, cx - 90, 638, cx - 90, 658, 'YES');
    FC.terminal(svg, 'csmaca-abort', cx - 90, 670, 70, 22, 'ABORT');

    // NO loop back
    FC.polyArrow(svg, [
      [cx - 90 - 40, 620],
      [20, 620],
      [20, 136],
      [cx - 55, 136]
    ], 'NO');
  },

  buildAll() {
    FC.buildCSMA();
    FC.buildCSMACD();
    FC.buildCSMACA();
  },

  // Highlight a node by id and mark previous
  highlight(nodeId) {
    // Remove all active
    document.querySelectorAll('.fc-node.active').forEach(n => {
      n.classList.remove('active');
      n.classList.add('visited');
    });
    if (nodeId) {
      const node = document.getElementById(nodeId);
      if (node) {
        node.classList.remove('visited');
        node.classList.add('active');
        // Scroll into view safely for SVG elements
        if (typeof node.scrollIntoViewIfNeeded === 'function') {
          try { node.scrollIntoViewIfNeeded(false); } catch(e) {}
        } else if (typeof node.scrollIntoView === 'function') {
          try { node.scrollIntoView({ behavior: 'smooth', block: 'nearest' }); } catch(e) {}
        }
      }
    }
  },

  resetHighlights() {
    document.querySelectorAll('.fc-node').forEach(n => {
      n.classList.remove('active', 'visited');
    });
  }
};