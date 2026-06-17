import { CR80 } from "./constants.js";
import { patterns } from "./patterns.js";

function roundRect(ctx, x, y, w, h, radius) {
  const r = Math.min(radius, w / 2, h / 2);
  ctx.beginPath();
  ctx.moveTo(x + r, y);
  ctx.lineTo(x + w - r, y);
  ctx.arcTo(x + w, y, x + w, y + r, r);
  ctx.lineTo(x + w, y + h - r);
  ctx.arcTo(x + w, y + h, x + w - r, y + h, r);
  ctx.lineTo(x + r, y + h);
  ctx.arcTo(x, y + h, x, y + h - r, r);
  ctx.lineTo(x, y + r);
  ctx.arcTo(x, y, x + r, y, r);
  ctx.closePath();
}

function fitImage(ctx, img, x, y, w, h, vBias, zoom, hBias) {
  const bias = vBias != null ? vBias : 0.25;
  const hb = hBias != null ? hBias : 0.5;
  const z = zoom != null ? zoom : 1.0;
  const imgRatio = img.naturalWidth / img.naturalHeight;
  const boxRatio = w / h;
  // Start with cover-fit source rect
  let sw, sh;
  if (imgRatio > boxRatio) {
    sh = img.naturalHeight;
    sw = sh * boxRatio;
  } else {
    sw = img.naturalWidth;
    sh = sw / boxRatio;
  }
  // Apply zoom: smaller source = more zoom in
  sw = sw / z;
  sh = sh / z;
  // Position: vBias controls vertical (0=top, 1=bottom), hBias controls horizontal (0=left, 1=right)
  const sx = (img.naturalWidth - sw) * hb;
  const sy = (img.naturalHeight - sh) * bias;
  // Clamp to image bounds
  const csx = Math.max(0, Math.min(sx, img.naturalWidth - sw));
  const csy = Math.max(0, Math.min(sy, img.naturalHeight - sh));
  ctx.drawImage(img, csx, csy, Math.min(sw, img.naturalWidth), Math.min(sh, img.naturalHeight), x, y, w, h);
}

function wrapText(ctx, text, x, y, maxWidth, lineHeight, align) {
  if (!text) return;
  // Set alignment
  if (align === "center") {
    ctx.textAlign = "center";
    x = x + maxWidth / 2;
  } else if (align === "right") {
    ctx.textAlign = "end";
    x = x + maxWidth;
  } else {
    ctx.textAlign = "start";
  }
  const words = text.split(" ");
  let line = "";
  for (let i = 0; i < words.length; i++) {
    const test = line + words[i] + " ";
    const metrics = ctx.measureText(test);
    if (metrics.width > maxWidth && i > 0) {
      ctx.fillText(line.trim(), x, y);
      line = words[i] + " ";
      y += lineHeight;
    } else {
      line = test;
    }
  }
  ctx.fillText(line.trim(), x, y);
  ctx.textAlign = "start";
}

export function drawCard(canvas, design, elements, employee, photoImg, logoImg, hoveredEl, selectedEl, snapGuides, bgImg) {
  const ctx = canvas.getContext("2d");
  const isPortrait = design.orientation === "portrait";
  const cw = isPortrait ? CR80.h : CR80.w;
  const ch = isPortrait ? CR80.w : CR80.h;

  canvas.width = cw;
  canvas.height = ch;
  ctx.clearRect(0, 0, cw, ch);

  // 1. Background (no clip — we apply rounded corners at the end via compositing)
  if (design.bgType === "gradient") {
    let grd;
    if (design.gradientDir === "horizontal") {
      grd = ctx.createLinearGradient(0, 0, cw, 0);
    } else if (design.gradientDir === "diagonal") {
      grd = ctx.createLinearGradient(0, 0, cw, ch);
    } else {
      grd = ctx.createLinearGradient(0, 0, 0, ch);
    }
    grd.addColorStop(0, design.bgColor1);
    grd.addColorStop(1, design.bgColor2);
    ctx.fillStyle = grd;
  } else {
    ctx.fillStyle = design.bgColor1;
  }
  ctx.fillRect(0, 0, cw, ch);

  // 1b. Background image (cover-fit, drawn over bg color)
  if (bgImg) {
    fitImage(ctx, bgImg, 0, 0, cw, ch);
  }

  // 2. Pattern overlay
  if (design.bgPattern !== "none" && patterns[design.bgPattern]) {
    ctx.save();
    const ox = design.patternOffsetX || 0;
    const oy = design.patternOffsetY || 0;
    const ps = design.patternScale || 1;
    ctx.translate(ox, oy);
    ctx.scale(ps, ps);
    patterns[design.bgPattern].draw(ctx, cw / ps + Math.abs(ox), ch / ps + Math.abs(oy), design.patternColor, design.patternOpacity);
    ctx.restore();
  }

  // 3. Accent bar
  if (design.showAccentBar) {
    ctx.fillStyle = design.accentColor;
    const s = design.accentBarSize;
    switch (design.accentBarPos) {
      case "top": ctx.fillRect(0, 0, cw, s); break;
      case "bottom": ctx.fillRect(0, ch - s, cw, s); break;
      case "left": ctx.fillRect(0, 0, s, ch); break;
      case "right": ctx.fillRect(cw - s, 0, s, ch); break;
    }
  }

  // 4. Company name / logo
  const ce = elements.companyName;
  if (ce && ce.visible !== false) {
    if (logoImg) {
      const imgRatio = logoImg.naturalWidth / logoImg.naturalHeight;
      const boxRatio = ce.w / ce.h;
      let lw, lh;
      if (imgRatio > boxRatio) {
        lw = ce.w;
        lh = ce.w / imgRatio;
      } else {
        lh = ce.h;
        lw = ce.h * imgRatio;
      }
      // Center the logo within the element bounds
      const lx = ce.x + (ce.w - lw) / 2;
      const ly = ce.y + (ce.h - lh) / 2;
      ctx.drawImage(logoImg, lx, ly, lw, lh);
    } else {
      ctx.fillStyle = design.companyNameColor;
      ctx.font = `${design.companyNameWeight} ${design.companyNameSize}px ${design.fontFamily}`;
      ctx.textBaseline = "top";
      wrapText(ctx, design.companyName, ce.x, ce.y, ce.w, design.companyNameSize * 1.2, ce.align);
    }
  }

  // Employee (needed for per-person photo crop)
  const emp = employee || { firstName: "Jane", lastName: "Smith", title: "Software Engineer", department: "Engineering", employeeId: "001" };

  // 5. Photo
  const pe = elements.photo;
  if (pe && pe.visible !== false && design.showPhoto !== false) {
    ctx.save();
    if (design.photoShape === "circle") {
      const cx = pe.x + pe.w / 2;
      const cy = pe.y + pe.h / 2;
      const r = Math.min(pe.w, pe.h) / 2;
      ctx.beginPath();
      ctx.arc(cx, cy, r, 0, Math.PI * 2);
      ctx.clip();
    } else if (design.photoShape === "rounded") {
      roundRect(ctx, pe.x, pe.y, pe.w, pe.h, design.photoRadius);
      ctx.clip();
    } else {
      ctx.beginPath();
      ctx.rect(pe.x, pe.y, pe.w, pe.h);
      ctx.clip();
    }

    if (photoImg) {
      const empBias = emp?.photoCropBias;
      const bias = empBias != null ? empBias : (design.photoCropBias ?? 0.25);
      const zoom = emp?.photoZoom ?? 1.0;
      const hBias = emp?.photoCropHBias ?? 0.5;
      fitImage(ctx, photoImg, pe.x, pe.y, pe.w, pe.h, bias, zoom, hBias);
    } else {
      ctx.fillStyle = "#1a1a2e";
      ctx.fillRect(pe.x, pe.y, pe.w, pe.h);
      ctx.fillStyle = "#444";
      ctx.font = `40px sans-serif`;
      ctx.textAlign = "center";
      ctx.textBaseline = "middle";
      ctx.fillText("📷", pe.x + pe.w / 2, pe.y + pe.h / 2 - 14);
      ctx.font = `12px ${design.fontFamily}`;
      ctx.fillText("Upload Photo", pe.x + pe.w / 2, pe.y + pe.h / 2 + 20);
      ctx.textAlign = "start";
    }
    ctx.restore();

    if (design.photoBorder) {
      ctx.strokeStyle = design.accentColor;
      ctx.lineWidth = 2;
      if (design.photoShape === "circle") {
        const cx = pe.x + pe.w / 2;
        const cy = pe.y + pe.h / 2;
        const r = Math.min(pe.w, pe.h) / 2;
        ctx.beginPath();
        ctx.arc(cx, cy, r, 0, Math.PI * 2);
        ctx.stroke();
      } else if (design.photoShape === "rounded") {
        roundRect(ctx, pe.x, pe.y, pe.w, pe.h, design.photoRadius);
        ctx.stroke();
      } else {
        ctx.strokeRect(pe.x, pe.y, pe.w, pe.h);
      }
    }
  }

  // 6. Name text
  const ne = elements.name;
  if (ne && ne.visible !== false && design.showName !== false) {
    ctx.fillStyle = design.nameColor;
    ctx.font = `${design.nameWeight} ${design.nameSize}px ${design.fontFamily}`;
    ctx.textBaseline = "top";
    wrapText(ctx, `${emp.firstName} ${emp.lastName}`, ne.x, ne.y, ne.w, design.nameSize * 1.2, ne.align);
  }

  // 7. Title text
  const te = elements.title;
  if (te && te.visible !== false && design.showTitle !== false) {
    ctx.fillStyle = design.titleColor;
    ctx.font = `${design.titleWeight} ${design.titleSize}px ${design.fontFamily}`;
    ctx.textBaseline = "top";
    wrapText(ctx, emp.title, te.x, te.y, te.w, design.titleSize * 1.2, te.align);
  }

  // 8. Department text
  const de = elements.department;
  if (de && de.visible !== false && design.showDept !== false) {
    ctx.fillStyle = design.deptColor;
    ctx.font = `${design.deptWeight} ${design.deptSize}px ${design.fontFamily}`;
    ctx.textBaseline = "top";
    wrapText(ctx, emp.department, de.x, de.y, de.w, design.deptSize * 1.2, de.align);
  }

  // 9. Employee ID
  if (design.showEmployeeId) {
    const ie = elements.employeeId;
    if (ie && ie.visible !== false) {
      ctx.fillStyle = "#ffffff55";
      ctx.font = `500 ${design.idSize}px 'JetBrains Mono', monospace`;
      ctx.textBaseline = "top";
      const idStr = design.idPrefix + String(emp.employeeId || "001").padStart(4, "0");
      wrapText(ctx, idStr, ie.x, ie.y, ie.w, design.idSize * 1.2, ie.align);
    }
  }

  // 10. Custom text fields
  Object.entries(elements).forEach(([key, el]) => {
    if (el.type !== "custom" || el.visible === false) return;
    ctx.fillStyle = el.color || "#ffffff";
    ctx.font = `${el.fontWeight || "400"} ${el.fontSize || 20}px ${design.fontFamily}`;
    ctx.textBaseline = "top";
    wrapText(ctx, el.text || "", el.x, el.y, el.w, (el.fontSize || 20) * 1.2, el.align);
  });

  // 11. Apply rounded corners via compositing (replaces the old clip approach)
  ctx.save();
  ctx.globalCompositeOperation = "destination-in";
  ctx.beginPath();
  roundRect(ctx, 0, 0, cw, ch, 20);
  ctx.fillStyle = "#000";
  ctx.fill();
  ctx.restore();

  // 12. Bounding boxes (on top, after rounding mask)
  const drawBounds = (key, color, dashed) => {
    const el = elements[key];
    if (!el) return;
    const pad = 6;
    ctx.strokeStyle = color;
    ctx.lineWidth = 1.5;
    ctx.setLineDash(dashed ? [5, 4] : []);
    ctx.strokeRect(el.x - pad, el.y - pad, el.w + pad * 2, el.h + pad * 2);
    ctx.setLineDash([]);

    // Label
    ctx.fillStyle = color;
    ctx.font = `500 11px 'JetBrains Mono', monospace`;
    ctx.textBaseline = "bottom";
    ctx.fillText(`${el.label || key}  ${el.x},${el.y}`, el.x - pad, el.y - pad - 3);
  };

  if (hoveredEl && hoveredEl !== selectedEl) {
    drawBounds(hoveredEl, "#00d4aa88", true);
  }
  if (selectedEl) {
    drawBounds(selectedEl, "#00d4aa", false);
    // Resize handle
    const sel = elements[selectedEl];
    if (sel) {
      const hx = sel.x + sel.w + 6 - 5;
      const hy = sel.y + sel.h + 6 - 5;
      ctx.fillStyle = "#00d4aa";
      ctx.fillRect(hx, hy, 10, 10);
    }
  }

  // 13. Snap guides
  if (snapGuides && snapGuides.length > 0) {
    ctx.save();
    ctx.setLineDash([4, 4]);
    ctx.lineWidth = 1;
    for (const guide of snapGuides) {
      ctx.strokeStyle = "#ff6b6b";
      ctx.beginPath();
      if (guide.axis === "v") {
        ctx.moveTo(guide.pos, 0);
        ctx.lineTo(guide.pos, ch);
      } else {
        ctx.moveTo(0, guide.pos);
        ctx.lineTo(cw, guide.pos);
      }
      ctx.stroke();
    }
    ctx.setLineDash([]);
    ctx.restore();
  }
}
