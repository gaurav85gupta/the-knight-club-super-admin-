/**
 * Minimal inline-SVG chart primitives for the Analytics page (Phase 25).
 *
 * The project's frontend architecture is vanilla HTML5/CSS3/JS (spec Step
 * 49 — no React/Vue/Angular, and no chart library was already vendored —
 * see assets/js/vendor/, which only carries tus.min.js for uploads). Rather
 * than add a new dependency for a handful of simple time-series/bar charts,
 * this module draws plain SVG directly, styled entirely through
 * analytics.css classes (chart-bar, chart-line-path, ...) so it fits the
 * existing "tokens only, no hardcoded color" discipline.
 *
 * Every chart also has an exact-value table rendered alongside it elsewhere
 * on the page (spec Step 24-25, 53: "users should be able to see exact
 * values... should not exist only visually") — these charts are a visual
 * aid, never the only place a number appears.
 */

const AnalyticsCharts = (() => {
  const NS = 'http://www.w3.org/2000/svg';

  function svgEl(tag, attrs = {}) {
    const node = document.createElementNS(NS, tag);
    for (const [k, v] of Object.entries(attrs)) node.setAttribute(k, v);
    return node;
  }

  function clearSvg(svg) {
    while (svg.firstChild) svg.removeChild(svg.firstChild);
  }

  /**
   * Renders a simple line chart. `points` = [{ label, value }, ...].
   * Draws gridlines, a polyline, dots, and x-axis labels (thinned if many).
   */
  function lineChart(svg, points, { valueFormatter = String } = {}) {
    clearSvg(svg);
    if (!points || points.length === 0) return;

    const W = 640;
    const H = 240;
    const padL = 44;
    const padR = 16;
    const padT = 16;
    const padB = 32;
    const plotW = W - padL - padR;
    const plotH = H - padT - padB;

    const maxVal = Math.max(1, ...points.map((p) => p.value));
    const stepX = points.length > 1 ? plotW / (points.length - 1) : 0;

    const xFor = (i) => padL + i * stepX;
    const yFor = (v) => padT + plotH - (v / maxVal) * plotH;

    // Gridlines (4 horizontal bands) + y-axis labels.
    const bands = 4;
    for (let i = 0; i <= bands; i += 1) {
      const y = padT + (plotH / bands) * i;
      svg.appendChild(svgEl('line', { class: 'chart-grid-line', x1: padL, x2: W - padR, y1: y, y2: y }));
      const val = Math.round(maxVal - (maxVal / bands) * i);
      const label = svgEl('text', { class: 'chart-axis-label', x: padL - 8, y: y + 3, 'text-anchor': 'end' });
      label.textContent = valueFormatter(val);
      svg.appendChild(label);
    }

    // Polyline.
    const path = points.map((p, i) => `${i === 0 ? 'M' : 'L'} ${xFor(i)} ${yFor(p.value)}`).join(' ');
    svg.appendChild(svgEl('path', { class: 'chart-line-path', d: path }));

    // Dots + x labels (thin labels if many points, to avoid overlap).
    const labelEvery = Math.max(1, Math.ceil(points.length / 8));
    points.forEach((p, i) => {
      const cx = xFor(i);
      const cy = yFor(p.value);
      const dot = svgEl('circle', { class: 'chart-line-dot', cx, cy, r: 2.5 });
      const title = svgEl('title');
      title.textContent = `${p.label}: ${valueFormatter(p.value)}`;
      dot.appendChild(title);
      svg.appendChild(dot);

      if (i % labelEvery === 0 || i === points.length - 1) {
        const label = svgEl('text', { class: 'chart-axis-label', x: cx, y: H - 8, 'text-anchor': 'middle' });
        label.textContent = p.label;
        svg.appendChild(label);
      }
    });
  }

  /**
   * Renders a simple vertical bar chart. `bars` = [{ label, value }, ...].
   */
  function barChart(svg, bars, { valueFormatter = String } = {}) {
    clearSvg(svg);
    if (!bars || bars.length === 0) return;

    const W = 640;
    const H = 240;
    const padL = 44;
    const padR = 16;
    const padT = 16;
    const padB = 40;
    const plotW = W - padL - padR;
    const plotH = H - padT - padB;

    const maxVal = Math.max(1, ...bars.map((b) => b.value));
    const gap = 8;
    const barW = Math.max(4, (plotW - gap * (bars.length - 1)) / bars.length);

    const bands = 4;
    for (let i = 0; i <= bands; i += 1) {
      const y = padT + (plotH / bands) * i;
      svg.appendChild(svgEl('line', { class: 'chart-grid-line', x1: padL, x2: W - padR, y1: y, y2: y }));
      const val = Math.round(maxVal - (maxVal / bands) * i);
      const label = svgEl('text', { class: 'chart-axis-label', x: padL - 8, y: y + 3, 'text-anchor': 'end' });
      label.textContent = valueFormatter(val);
      svg.appendChild(label);
    }

    bars.forEach((b, i) => {
      const x = padL + i * (barW + gap);
      const barH = (b.value / maxVal) * plotH;
      const y = padT + plotH - barH;

      const group = svgEl('g', { class: 'chart-bar-group' });
      const rect = svgEl('rect', { class: 'chart-bar', x, y, width: barW, height: Math.max(0, barH) });
      const title = svgEl('title');
      title.textContent = `${b.label}: ${valueFormatter(b.value)}`;
      rect.appendChild(title);
      group.appendChild(rect);

      const valueLabel = svgEl('text', { class: 'chart-value-label', x: x + barW / 2, y: y - 4 });
      valueLabel.textContent = valueFormatter(b.value);
      group.appendChild(valueLabel);

      const xLabel = svgEl('text', {
        class: 'chart-axis-label',
        x: x + barW / 2,
        y: H - 8,
        'text-anchor': bars.length > 10 ? 'end' : 'middle',
        transform: bars.length > 10 ? `rotate(-40 ${x + barW / 2} ${H - 8})` : undefined,
      });
      if (xLabel.getAttribute('transform') === undefined) xLabel.removeAttribute('transform');
      xLabel.textContent = b.label.length > 14 ? `${b.label.slice(0, 13)}…` : b.label;
      group.appendChild(xLabel);

      svg.appendChild(group);
    });
  }

  function emptyState(svg) {
    clearSvg(svg);
  }

  return { lineChart, barChart, emptyState };
})();
