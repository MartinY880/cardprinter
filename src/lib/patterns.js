export const patterns = {
  none: {
    label: "None",
    draw() {},
  },

  dots: {
    label: "Dot Grid",
    draw(ctx, w, h, color, opacity) {
      ctx.globalAlpha = opacity;
      ctx.fillStyle = color;
      const spacing = 28;
      const r = 2.5;
      for (let x = spacing; x < w; x += spacing) {
        for (let y = spacing; y < h; y += spacing) {
          ctx.beginPath();
          ctx.arc(x, y, r, 0, Math.PI * 2);
          ctx.fill();
        }
      }
      ctx.globalAlpha = 1;
    },
  },

  diagonalLines: {
    label: "Diagonal Lines",
    draw(ctx, w, h, color, opacity) {
      ctx.globalAlpha = opacity;
      ctx.strokeStyle = color;
      ctx.lineWidth = 1.5;
      const spacing = 24;
      for (let i = -h; i < w + h; i += spacing) {
        ctx.beginPath();
        ctx.moveTo(i, 0);
        ctx.lineTo(i + h, h);
        ctx.stroke();
      }
      ctx.globalAlpha = 1;
    },
  },

  crosshatch: {
    label: "Crosshatch",
    draw(ctx, w, h, color, opacity) {
      ctx.globalAlpha = opacity;
      ctx.strokeStyle = color;
      ctx.lineWidth = 1;
      const spacing = 20;
      for (let i = -h; i < w + h; i += spacing) {
        ctx.beginPath();
        ctx.moveTo(i, 0);
        ctx.lineTo(i + h, h);
        ctx.stroke();
      }
      for (let i = -h; i < w + h; i += spacing) {
        ctx.beginPath();
        ctx.moveTo(i, h);
        ctx.lineTo(i + h, 0);
        ctx.stroke();
      }
      ctx.globalAlpha = 1;
    },
  },

  hexagons: {
    label: "Hexagons",
    draw(ctx, w, h, color, opacity) {
      ctx.globalAlpha = opacity;
      ctx.strokeStyle = color;
      ctx.lineWidth = 1;
      const size = 22;
      const hh = size * Math.sqrt(3);
      const drawHex = (cx, cy) => {
        ctx.beginPath();
        for (let i = 0; i < 6; i++) {
          const angle = (Math.PI / 3) * i - Math.PI / 6;
          const px = cx + size * Math.cos(angle);
          const py = cy + size * Math.sin(angle);
          if (i === 0) ctx.moveTo(px, py);
          else ctx.lineTo(px, py);
        }
        ctx.closePath();
        ctx.stroke();
      };
      for (let row = -1; row < h / hh + 1; row++) {
        for (let col = -1; col < w / (size * 1.5) + 1; col++) {
          const cx = col * size * 1.5;
          const cy = row * hh + (col % 2 === 1 ? hh / 2 : 0);
          drawHex(cx, cy);
        }
      }
      ctx.globalAlpha = 1;
    },
  },

  waves: {
    label: "Wave Lines",
    draw(ctx, w, h, color, opacity) {
      ctx.globalAlpha = opacity;
      ctx.strokeStyle = color;
      ctx.lineWidth = 1.5;
      const amp = 10;
      const freq = 0.03;
      const spacing = 30;
      for (let yOff = spacing; yOff < h; yOff += spacing) {
        ctx.beginPath();
        for (let x = 0; x <= w; x += 2) {
          const y = yOff + Math.sin(x * freq) * amp;
          if (x === 0) ctx.moveTo(x, y);
          else ctx.lineTo(x, y);
        }
        ctx.stroke();
      }
      ctx.globalAlpha = 1;
    },
  },

  concentricCircles: {
    label: "Concentric Rings",
    draw(ctx, w, h, color, opacity) {
      ctx.globalAlpha = opacity;
      ctx.strokeStyle = color;
      ctx.lineWidth = 1;
      const cx = w * 0.8;
      const cy = h * 0.5;
      const spacing = 22;
      const maxR = Math.max(w, h);
      for (let r = spacing; r < maxR; r += spacing) {
        ctx.beginPath();
        ctx.arc(cx, cy, r, 0, Math.PI * 2);
        ctx.stroke();
      }
      ctx.globalAlpha = 1;
    },
  },

  triangles: {
    label: "Triangle Mesh",
    draw(ctx, w, h, color, opacity) {
      ctx.globalAlpha = opacity;
      ctx.strokeStyle = color;
      ctx.lineWidth = 1;
      const size = 36;
      const rowH = size * Math.sqrt(3) / 2;
      for (let row = -1; row < h / rowH + 1; row++) {
        for (let col = -1; col < w / size + 1; col++) {
          const x = col * size + (row % 2 === 1 ? size / 2 : 0);
          const y = row * rowH;
          ctx.beginPath();
          ctx.moveTo(x, y);
          ctx.lineTo(x + size / 2, y + rowH);
          ctx.lineTo(x - size / 2, y + rowH);
          ctx.closePath();
          ctx.stroke();
        }
      }
      ctx.globalAlpha = 1;
    },
  },

  cornerGeo: {
    label: "Corner Geometric",
    draw(ctx, w, h, color, opacity) {
      ctx.globalAlpha = opacity;
      ctx.strokeStyle = color;
      ctx.lineWidth = 1.5;
      // Top-right corner
      for (let i = 0; i < 6; i++) {
        const off = i * 18;
        ctx.beginPath();
        ctx.moveTo(w - off, 0);
        ctx.lineTo(w, off);
        ctx.stroke();
      }
      // Bottom-left corner
      for (let i = 0; i < 6; i++) {
        const off = i * 18;
        ctx.beginPath();
        ctx.moveTo(off, h);
        ctx.lineTo(0, h - off);
        ctx.stroke();
      }
      ctx.globalAlpha = 1;
    },
  },
};
