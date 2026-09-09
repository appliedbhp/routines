/**
 * Geometry + SVG markup for the routine timer wheel.
 * Fixed real-world sizing per spec: inner (center) circle = 3.5in diameter,
 * outer circle = 6.5in diameter. All geometry is expressed in inches so the
 * same numbers drive both the print SVG (width/height="in", 1:1 with paper)
 * and the projection SVG (scaled up responsively via CSS, same viewBox math).
 *
 * The inner radius is adjustable per render call (opts.innerRadius) so
 * projection mode can shrink the hub to make room for a clock face, while
 * print/builder keep the exact 1.75in spec radius.
 */
const Wheel = (() => {
  const R_INNER = 1.75; // in — print/builder hub radius (spec: 3.5in center circle)
  const R_OUTER = 3.25; // in — spec: 6.5in outer circle
  const CX = R_OUTER;
  const CY = R_OUTER;

  const DEFAULT_PALETTE = ["#F4A259", "#5B8C5A", "#5D8AA8", "#B25D8E", "#D4A017", "#7C6BAF", "#4E9C81", "#C2543B"];

  function polar(cx, cy, r, angleDeg) {
    const rad = ((angleDeg - 90) * Math.PI) / 180;
    return { x: cx + r * Math.cos(rad), y: cy + r * Math.sin(rad) };
  }

  function sectorPath(r1, r2, startAngle, endAngle, cx = CX, cy = CY) {
    let end = endAngle;
    if (end - startAngle >= 359.99) end = startAngle + 359.99; // avoid degenerate full-circle arc
    const largeArc = end - startAngle > 180 ? 1 : 0;
    const p1 = polar(cx, cy, r2, startAngle);
    const p2 = polar(cx, cy, r2, end);
    const p3 = polar(cx, cy, r1, end);
    const p4 = polar(cx, cy, r1, startAngle);
    return [
      `M ${p1.x.toFixed(4)} ${p1.y.toFixed(4)}`,
      `A ${r2} ${r2} 0 ${largeArc} 1 ${p2.x.toFixed(4)} ${p2.y.toFixed(4)}`,
      `L ${p3.x.toFixed(4)} ${p3.y.toFixed(4)}`,
      `A ${r1} ${r1} 0 ${largeArc} 0 ${p4.x.toFixed(4)} ${p4.y.toFixed(4)}`,
      "Z",
    ].join(" ");
  }

  /**
   * Computes slice angle ranges. denom is whichever is larger: the declared
   * total time, or the sum of step minutes (so slices never silently overflow
   * past 360deg if steps exceed the stated total).
   */
  function computeSlices(steps, totalMinutes, palette) {
    const pal = palette && palette.length ? palette : DEFAULT_PALETTE;
    const sum = steps.reduce((a, s) => a + Math.max(0, s.minutes || 0), 0);
    const denom = Math.max(sum, totalMinutes, 0.0001);
    let cumulative = 0;
    const slices = steps.map((step, i) => {
      const minutes = Math.max(0, step.minutes || 0);
      const startAngle = (cumulative / denom) * 360;
      cumulative += minutes;
      const endAngle = (cumulative / denom) * 360;
      return { ...step, index: i, startAngle, endAngle, color: pal[i % pal.length] };
    });
    let bufferSlice = null;
    if (totalMinutes > sum + 0.001) {
      bufferSlice = {
        startAngle: (cumulative / denom) * 360,
        endAngle: 360,
        color: "#c7c7c2",
        isBuffer: true,
      };
    }
    return { slices, bufferSlice, sum, denom, overflowing: sum > totalMinutes + 0.001 };
  }

  function escapeXML(str) {
    return String(str).replace(/[&<>"']/g, (c) => ({ "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;", "'": "&#39;" }[c]));
  }

  // Splits a label into at most 2 lines so it doesn't run past a slice's
  // available width. Long single words are left as-is (rare in practice).
  function wrapLabel(text) {
    const t = (text || "").trim();
    if (t.length <= 10 || !t.includes(" ")) return [t];
    const words = t.split(" ");
    let best = 0;
    let bestDiff = Infinity;
    let running = 0;
    for (let i = 0; i < words.length - 1; i++) {
      running += words[i].length + 1;
      const diff = Math.abs(running - t.length / 2);
      if (diff < bestDiff) {
        bestDiff = diff;
        best = i + 1;
      }
    }
    return [words.slice(0, best).join(" "), words.slice(best).join(" ")];
  }

  function clockFaceSVG(faceR, clockTime, accentColor, CX = R_OUTER, CY = R_OUTER) {
    const parts = [];
    const t = clockTime || new Date();
    const h = t.getHours() % 12;
    const m = t.getMinutes();
    const s = t.getSeconds();
    const hourAngle = (h + m / 60) * 30;
    const minuteAngle = (m + s / 60) * 6;
    const handStyle = accentColor ? ` style="stroke:${accentColor}"` : "";
    const dotStyle = accentColor ? ` style="fill:${accentColor}"` : "";

    parts.push(`<circle cx="${CX}" cy="${CY}" r="${faceR}" class="clock-face" />`);
    for (let i = 0; i < 12; i++) {
      const angle = i * 30;
      const big = i % 3 === 0;
      const p1 = polar(CX, CY, faceR * (big ? 0.78 : 0.85), angle);
      const p2 = polar(CX, CY, faceR * 0.94, angle);
      parts.push(
        `<line x1="${p1.x.toFixed(3)}" y1="${p1.y.toFixed(3)}" x2="${p2.x.toFixed(3)}" y2="${p2.y.toFixed(3)}" class="clock-tick${big ? " clock-tick-major" : ""}" />`
      );
    }
    const hourTip = polar(CX, CY, faceR * 0.52, hourAngle);
    const minTip = polar(CX, CY, faceR * 0.78, minuteAngle);
    parts.push(`<line x1="${CX}" y1="${CY}" x2="${hourTip.x.toFixed(3)}" y2="${hourTip.y.toFixed(3)}" class="clock-hand clock-hour-hand"${handStyle} />`);
    parts.push(`<line x1="${CX}" y1="${CY}" x2="${minTip.x.toFixed(3)}" y2="${minTip.y.toFixed(3)}" class="clock-hand clock-minute-hand"${handStyle} />`);
    parts.push(`<circle cx="${CX}" cy="${CY}" r="${faceR * 0.06}" class="clock-center-dot"${dotStyle} />`);
    return parts.join("");
  }

  function formatShortTime(date) {
    let h = date.getHours() % 12;
    if (h === 0) h = 12;
    const m = String(date.getMinutes()).padStart(2, "0");
    return `${h}:${m}`;
  }

  /**
   * Builds the full SVG markup for the wheel.
   *
   * opts.outerRadius     outer radius override (default R_OUTER = 3.25in)
   * opts.innerRadius     hub radius override (default R_INNER = 1.75in spec)
   * opts.palette          array of slice colors (default classic palette)
   * opts.outlineOnly      print mode: white slice fill, colored border, dark labels, no separators
   * opts.activeIndex      slice index to enlarge the icon for (projection "current step")
   * opts.showPointer      draw a clock-hand pointer at opts.pointerAngle (or 0)
   * opts.pointerAngle     angle in degrees for the pointer (0-360)
   * opts.showDisc         draw a TimeTimer-style "time elapsed" disc from 0 to opts.discAngle
   * opts.discAngle        angle in degrees already elapsed (disc covers 0..discAngle)
   * opts.discColor        CSS color for the disc + pointer
   * opts.showBoundaryTimes  label each slice boundary with the clock time it falls at
   * opts.boundaryBaseTime  Date representing the wall-clock time at angle 0
   * opts.centerMode        'label' | 'qr' | 'clock' | 'none'
   * opts.centerLabel       array of lines, used when centerMode === 'label'
   * opts.qrImageUrl        QR code image URL, used when centerMode === 'qr'
   * opts.qrSize            QR square size in in (default: a compact fit)
   * opts.qrCaptionLines    array of caption lines below the QR, centerMode === 'qr'
   * opts.clockTime         Date, used when centerMode === 'clock'
   * opts.clockDigitalText  digital text under the analog clock, centerMode === 'clock'
   * opts.labelFontScale    multiplier for slice-label/boundary-time/clock-digital font sizes
   * opts.iconScale         multiplier for slice icon size (default 1)
   * opts.labelColor        override fill color for slice labels + boundary times + clock digital text (filled mode only)
   * opts.outerMargin       extra canvas space (in) beyond the outer ring, reserved for boundary-time
   *                        labels — part of the viewBox itself so it scales with the SVG instead of
   *                        relying on CSS overflow (which can get clipped by a fixed-size container).
   *                        For print, the physical canvas grows by the same margin so the
   *                        drawn circle retains its requested diameter, including room for its stroke.
   */
  function render(steps, totalMinutes, opts = {}) {
    const R2 = opts.outerRadius || R_OUTER;
    const CX = R2, CY = R2;
    const R1 = opts.innerRadius || R_INNER;
    const outline = !!opts.outlineOnly;
    const margin = opts.outerMargin || 0;
    const viewboxMin = -margin;
    const viewboxSize = R2 * 2 + margin * 2;
    const { slices, bufferSlice, overflowing, denom } = computeSlices(steps, totalMinutes, opts.palette);
    const parts = [];
    parts.push(
      `<svg viewBox="${viewboxMin} ${viewboxMin} ${viewboxSize} ${viewboxSize}" width="100%" height="100%" xmlns="http://www.w3.org/2000/svg" class="wheel-svg ${outline ? "wheel-svg-outline" : "wheel-svg-filled"}">`
    );

    // outer boundary
    parts.push(`<circle cx="${CX}" cy="${CY}" r="${R2 - 0.01}" class="wheel-outer-ring" />`);

    const midR = (R1 + R2) / 2;

    // 1) slice wedges (fill/border only — no icons/labels yet, those layer on top)
    for (const s of slices) {
      const sweep = s.endAngle - s.startAngle;
      if (sweep <= 0) continue;
      const fill = outline ? "white" : s.color;
      const strokeAttrs = outline ? ` stroke="${s.color}" stroke-width="0.045" stroke-linejoin="round"` : "";
      parts.push(
        `<path d="${sectorPath(R1, R2, s.startAngle, s.endAngle, CX, CY)}" fill="${fill}"${strokeAttrs} class="wheel-slice" data-index="${s.index}" data-start="${s.startAngle}" data-end="${s.endAngle}" />`
      );
    }

    if (bufferSlice) {
      const fill = outline ? "white" : bufferSlice.color;
      const strokeAttrs = outline ? ` stroke="${bufferSlice.color}" stroke-width="0.045" stroke-linejoin="round" stroke-dasharray="0.08 0.06"` : "";
      parts.push(
        `<path d="${sectorPath(R1, R2, bufferSlice.startAngle, bufferSlice.endAngle, CX, CY)}" fill="${fill}"${strokeAttrs} class="wheel-slice wheel-slice-buffer" data-buffer="1" data-start="${bufferSlice.startAngle}" data-end="${bufferSlice.endAngle}" />`
      );
    }

    // slice separators — only meaningful when slices are filled; outline mode's
    // own borders already delineate the boundaries without extra ink.
    const boundaryAngles = new Set([0]);
    slices.forEach((s) => {
      boundaryAngles.add(+s.startAngle.toFixed(4));
      boundaryAngles.add(+s.endAngle.toFixed(4));
    });
    if (!outline) {
      boundaryAngles.forEach((angle) => {
        const p1 = polar(CX, CY, R1, angle);
        const p2 = polar(CX, CY, R2, angle);
        parts.push(`<line x1="${p1.x.toFixed(3)}" y1="${p1.y.toFixed(3)}" x2="${p2.x.toFixed(3)}" y2="${p2.y.toFixed(3)}" class="wheel-separator" />`);
      });
    }

    // 2) "time elapsed" disc — TimeTimer-style translucent wash over the
    // portion of the ring already used up, growing as time passes. Drawn
    // BEFORE icons/labels so those always render crisp on top of it.
    if (opts.showDisc) {
      const discAngle = Math.max(0, Math.min(360, opts.discAngle || 0));
      if (discAngle > 0.01) {
        parts.push(
          `<path d="${sectorPath(R1, R2, 0, discAngle, CX, CY)}" fill="${opts.discColor || "#e53935"}" class="wheel-disc" />`
        );
      }
    }

    // 3) icons + labels — topmost ring content, drawn after the disc.
    const iconScale = opts.iconScale || 1;
    const fontScale = opts.labelFontScale ?? 1;
    for (const s of slices) {
      const sweep = s.endAngle - s.startAngle;
      if (sweep <= 0) continue;
      const isActive = opts.activeIndex === s.index;
      const midAngle = (s.startAngle + s.endAngle) / 2;
      let iconR = (sweep > 12 ? 0.55 : 0.35) * iconScale;
      if (isActive) iconR = Math.min(iconR * 1.7, (R2 - R1) * 0.92);
      const iconCenterR = midR - iconR * 0.15;
      const iconPt = polar(CX, CY, iconCenterR, midAngle);
      const position = s.positions?.[opts.layoutMode] || {};
      const movable = (kind) => {
        const offset = position[kind] || { x: 0, y: 0 };
        return opts.layoutMode ? ` data-step-index="${s.index}" data-kind="${kind}" tabindex="0" role="img" aria-label="${escapeXML(s.name)} ${kind}; drag or use arrow keys to move" transform="translate(${Number(offset.x) || 0} ${Number(offset.y) || 0})" class="wheel-movable"` : "";
      };
      if (s.imageUrl) {
        parts.push(`<g${movable("icon")}>`);
        if (isActive) {
          parts.push(`<circle cx="${iconPt.x.toFixed(3)}" cy="${iconPt.y.toFixed(3)}" r="${(iconR / 2) * 1.2}" class="wheel-icon-halo" />`);
        }
        parts.push(
          `<image href="${escapeXML(s.imageUrl)}" x="${(iconPt.x - iconR / 2).toFixed(3)}" y="${(iconPt.y - iconR / 2).toFixed(3)}" width="${iconR}" height="${iconR}" class="wheel-icon${isActive ? " wheel-icon-active" : ""}" preserveAspectRatio="xMidYMid meet" />`
        );
      }
      if (s.imageUrl) parts.push(`</g>`);
      if (fontScale > 0 && sweep > 0 && !isActive) {
        // Inset circular baselines keep even side-facing labels inside the ring.
        // Reverse the lower-half path so its text remains upright.
        const fontSize = (outline ? 0.13 : 0.15) * fontScale;
        const radius = R2 - 0.12 - fontSize;
        const halfSpan = Math.min(85, Math.max(0.5, sweep / 2 - 3));
        const lowerHalf = midAngle > 90 && midAngle < 270;
        const start = polar(CX, CY, radius, midAngle + (lowerHalf ? halfSpan : -halfSpan));
        const end = polar(CX, CY, radius, midAngle + (lowerHalf ? -halfSpan : halfSpan));
        const pathId = `label-${opts.layoutMode || "builder"}-${s.index}`;
        const arcLength = radius * halfSpan * 2 * Math.PI / 180;
        const colorStyle = !outline && opts.labelColor ? `;fill:${opts.labelColor}` : "";
        parts.push(`<defs><path id="${pathId}" d="M ${start.x} ${start.y} A ${radius} ${radius} 0 0 ${lowerHalf ? 0 : 1} ${end.x} ${end.y}" /></defs>`);
        parts.push(`<g${movable("label")}><text class="wheel-label" text-anchor="middle" data-max-length="${arcLength}" style="font-size:${fontSize}px${colorStyle}"><textPath href="#${pathId}" startOffset="50%">${escapeXML(s.name)}</textPath></text></g>`);
      }
    }

    // boundary time labels — just outside the ring, one per slice transition.
    if (fontScale > 0 && opts.showBoundaryTimes && opts.boundaryBaseTime) {
      const seen = new Set();
      const boundaryFontSize = 0.13 * (opts.labelFontScale || 1);
      const colorStyle = opts.labelColor ? `;fill:${opts.labelColor}` : "";
      boundaryAngles.forEach((angle) => {
        const norm = angle >= 359.99 ? 0 : +angle.toFixed(2);
        if (seen.has(norm)) return;
        seen.add(norm);
        const minutesOffset = (norm / 360) * denom;
        const t = new Date(opts.boundaryBaseTime.getTime() + minutesOffset * 60000);
        const pt = polar(CX, CY, R2 + 0.34, norm);
        parts.push(
          `<text x="${pt.x.toFixed(3)}" y="${pt.y.toFixed(3)}" text-anchor="middle" dominant-baseline="middle" class="wheel-boundary-time" style="font-size:${boundaryFontSize}px${colorStyle}">${escapeXML(formatShortTime(t))}</text>`
        );
      });
    }

    // 4) center hub
    parts.push(`<circle cx="${CX}" cy="${CY}" r="${R1}" class="wheel-center" />`);

    const centerMode = opts.centerMode || (opts.centerLabel ? "label" : "none");
    if (centerMode === "label" && opts.centerLabel) {
      const lines = Array.isArray(opts.centerLabel) ? opts.centerLabel : [opts.centerLabel];
      lines.forEach((line, i) => {
        const dy = (i - (lines.length - 1) / 2) * 0.32;
        parts.push(
          `<text x="${CX}" y="${(CY + dy).toFixed(3)}" text-anchor="middle" dominant-baseline="middle" class="wheel-center-text${i === 0 ? " wheel-center-text-main" : ""}">${escapeXML(line)}</text>`
        );
      });
    } else if (centerMode === "qr" && opts.qrImageUrl) {
      const qrSize = opts.qrSize || Math.min(1.1, R1 * 0.65);
      const qrX = CX - qrSize / 2;
      const qrY = CY - qrSize / 2 - 0.16;
      parts.push(`<image href="${opts.qrImageUrl}" x="${qrX.toFixed(3)}" y="${qrY.toFixed(3)}" width="${qrSize}" height="${qrSize}" class="wheel-qr" />`);
      const lines = opts.qrCaptionLines || [];
      lines.forEach((line, i) => {
        const y = qrY + qrSize + 0.22 + i * 0.18;
        parts.push(
          `<text x="${CX}" y="${y.toFixed(3)}" text-anchor="middle" dominant-baseline="middle" class="wheel-qr-caption${i === 0 ? " wheel-qr-caption-main" : ""}">${escapeXML(line)}</text>`
        );
      });
    } else if (centerMode === "clock") {
      parts.push(clockFaceSVG(R1 * 0.62, opts.clockTime, opts.discColor, CX, CY));
      if (fontScale > 0 && opts.clockDigitalText) {
        const digitalFontSize = 0.34 * (opts.labelFontScale || 1);
        const colorStyle = opts.labelColor ? `;fill:${opts.labelColor}` : "";
        parts.push(
          `<text x="${CX}" y="${(CY + R1 * 0.62 + 0.36).toFixed(3)}" text-anchor="middle" dominant-baseline="middle" class="wheel-countdown-text" style="font-size:${digitalFontSize}px${colorStyle}">${escapeXML(opts.clockDigitalText)}</text>`
        );
      }
    }

    // 5) pointer — always the topmost element.
    if (opts.showPointer) {
      const angle = opts.pointerAngle || 0;
      const tip = polar(CX, CY, R2 + 0.14, angle);
      parts.push(
        `<line x1="${CX}" y1="${CY}" x2="${tip.x.toFixed(3)}" y2="${tip.y.toFixed(3)}" class="wheel-pointer" style="stroke:${opts.discColor || "#e53935"}" />`
      );
      parts.push(`<circle cx="${tip.x.toFixed(3)}" cy="${tip.y.toFixed(3)}" r="0.07" class="wheel-pointer-tip" style="fill:${opts.discColor || "#e53935"}" />`);
      parts.push(`<circle cx="${CX}" cy="${CY}" r="0.09" class="wheel-pointer-hub" style="fill:${opts.discColor || "#e53935"}" />`);
    }

    parts.push(`</svg>`);
    return { svg: parts.join(""), slices, bufferSlice, overflowing };
  }

  return { render, computeSlices, polar, R_INNER, R_OUTER, CX, CY };
})();
