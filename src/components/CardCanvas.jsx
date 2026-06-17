import { useRef, useEffect, useState, useCallback } from "react";
import { PREVIEW_SCALE, CR80 } from "../lib/constants.js";
import { drawCard } from "../lib/cardRenderer.js";

const BUILTIN_HIT_ORDER = ["employeeId", "department", "title", "name", "companyName", "photo"];
const PAD = 6;
const RESIZE_ZONE = 14;
const MIN_W = 40;
const MIN_H = 20;
const SNAP_THRESHOLD = 6;

function calcSnapGuides(key, el, elements, cw, ch) {
  const guides = [];
  const elCx = el.x + el.w / 2;
  const elCy = el.y + el.h / 2;
  const canvasCx = cw / 2;
  const canvasCy = ch / 2;
  let snapX = null;
  let snapY = null;

  // Snap to canvas center
  if (Math.abs(elCx - canvasCx) < SNAP_THRESHOLD) {
    guides.push({ axis: "v", pos: canvasCx, label: "center" });
    snapX = canvasCx - el.w / 2;
  }
  if (Math.abs(elCy - canvasCy) < SNAP_THRESHOLD) {
    guides.push({ axis: "h", pos: canvasCy, label: "middle" });
    snapY = canvasCy - el.h / 2;
  }

  // Snap to canvas edges (with margin)
  if (Math.abs(el.x) < SNAP_THRESHOLD) {
    guides.push({ axis: "v", pos: 0 });
    snapX = 0;
  }
  if (Math.abs(el.x + el.w - cw) < SNAP_THRESHOLD) {
    guides.push({ axis: "v", pos: cw });
    snapX = cw - el.w;
  }
  if (Math.abs(el.y) < SNAP_THRESHOLD) {
    guides.push({ axis: "h", pos: 0 });
    snapY = 0;
  }
  if (Math.abs(el.y + el.h - ch) < SNAP_THRESHOLD) {
    guides.push({ axis: "h", pos: ch });
    snapY = ch - el.h;
  }

  // Snap to other elements
  for (const [otherKey, other] of Object.entries(elements)) {
    if (otherKey === key || !other || other.visible === false) continue;
    const oCx = other.x + other.w / 2;
    const oCy = other.y + other.h / 2;

    // Vertical center alignment
    if (snapX === null && Math.abs(elCx - oCx) < SNAP_THRESHOLD) {
      guides.push({ axis: "v", pos: oCx });
      snapX = oCx - el.w / 2;
    }
    // Left edge alignment
    if (snapX === null && Math.abs(el.x - other.x) < SNAP_THRESHOLD) {
      guides.push({ axis: "v", pos: other.x });
      snapX = other.x;
    }
    // Right edge alignment
    if (snapX === null && Math.abs(el.x + el.w - (other.x + other.w)) < SNAP_THRESHOLD) {
      guides.push({ axis: "v", pos: other.x + other.w });
      snapX = other.x + other.w - el.w;
    }
    // Horizontal center alignment
    if (snapY === null && Math.abs(elCy - oCy) < SNAP_THRESHOLD) {
      guides.push({ axis: "h", pos: oCy });
      snapY = oCy - el.h / 2;
    }
    // Top edge alignment
    if (snapY === null && Math.abs(el.y - other.y) < SNAP_THRESHOLD) {
      guides.push({ axis: "h", pos: other.y });
      snapY = other.y;
    }
    // Bottom edge alignment
    if (snapY === null && Math.abs(el.y + el.h - (other.y + other.h)) < SNAP_THRESHOLD) {
      guides.push({ axis: "h", pos: other.y + other.h });
      snapY = other.y + other.h - el.h;
    }
  }

  return { guides, snapX, snapY };
}

export default function CardCanvas({
  design,
  elements,
  setElements,
  employee,
  photoImg,
  logoImg,
  bgImg,
  selectedEl,
  setSelectedEl,
  locked,
}) {
  const canvasRef = useRef(null);
  const [hoveredEl, setHoveredEl] = useState(null);
  const [snapGuides, setSnapGuides] = useState([]);
  const dragging = useRef(null);
  const resizing = useRef(null);
  const dragOffset = useRef({ x: 0, y: 0 });
  const resizeStart = useRef({ mx: 0, my: 0, w: 0, h: 0 });

  const isPortrait = design.orientation === "portrait";
  const cw = isPortrait ? CR80.h : CR80.w;
  const ch = isPortrait ? CR80.w : CR80.h;

  // Redraw on any relevant change
  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    drawCard(canvas, design, elements, employee, photoImg, logoImg, hoveredEl, selectedEl, snapGuides, bgImg);
  }, [design, elements, employee, photoImg, logoImg, hoveredEl, selectedEl, snapGuides, bgImg]);

  const toCanvas = useCallback((e) => {
    const rect = canvasRef.current.getBoundingClientRect();
    return {
      x: (e.clientX - rect.left) / PREVIEW_SCALE,
      y: (e.clientY - rect.top) / PREVIEW_SCALE,
    };
  }, []);

  const hitTest = useCallback(
    (pt) => {
      // Build hit order: custom fields first (front), then builtins (back to front)
      const customKeys = Object.keys(elements).filter((k) => !BUILTIN_HIT_ORDER.includes(k));
      const hitOrder = [...customKeys.reverse(), ...BUILTIN_HIT_ORDER];
      for (const key of hitOrder) {
        const el = elements[key];
        if (!el || el.visible === false) continue;
        if (
          pt.x >= el.x - PAD &&
          pt.x <= el.x + el.w + PAD &&
          pt.y >= el.y - PAD &&
          pt.y <= el.y + el.h + PAD
        ) {
          return key;
        }
      }
      return null;
    },
    [elements]
  );

  const isNearResize = useCallback(
    (pt) => {
      if (!selectedEl) return false;
      const el = elements[selectedEl];
      if (!el) return false;
      const rx = el.x + el.w + PAD;
      const ry = el.y + el.h + PAD;
      return Math.abs(pt.x - rx) < RESIZE_ZONE && Math.abs(pt.y - ry) < RESIZE_ZONE;
    },
    [selectedEl, elements]
  );

  const onMouseDown = useCallback(
    (e) => {
      if (locked) return;
      const pt = toCanvas(e);
      // Check resize first
      if (selectedEl && isNearResize(pt)) {
        const el = elements[selectedEl];
        resizing.current = selectedEl;
        resizeStart.current = { mx: pt.x, my: pt.y, w: el.w, h: el.h };
        return;
      }
      const hit = hitTest(pt);
      setSelectedEl(hit);
      if (hit) {
        dragging.current = hit;
        const el = elements[hit];
        dragOffset.current = { x: pt.x - el.x, y: pt.y - el.y };
      }
    },
    [locked, toCanvas, hitTest, isNearResize, selectedEl, elements, setSelectedEl]
  );

  const onMouseMove = useCallback(
    (e) => {
      const pt = toCanvas(e);

      if (locked) {
        if (canvasRef.current) canvasRef.current.style.cursor = "default";
        return;
      }

      if (resizing.current) {
        const rs = resizeStart.current;
        const dx = pt.x - rs.mx;
        const dy = pt.y - rs.my;
        setElements((prev) => ({
          ...prev,
          [resizing.current]: {
            ...prev[resizing.current],
            w: Math.max(MIN_W, rs.w + dx),
            h: Math.max(MIN_H, rs.h + dy),
          },
        }));
        return;
      }

      if (dragging.current) {
        const off = dragOffset.current;
        const el = elements[dragging.current];
        let nx = Math.max(0, Math.min(cw - el.w, pt.x - off.x));
        let ny = Math.max(0, Math.min(ch - el.h, pt.y - off.y));
        const testEl = { ...el, x: Math.round(nx), y: Math.round(ny) };
        const { guides, snapX, snapY } = calcSnapGuides(dragging.current, testEl, elements, cw, ch);
        if (snapX !== null) nx = snapX;
        if (snapY !== null) ny = snapY;
        setSnapGuides(guides);
        setElements((prev) => ({
          ...prev,
          [dragging.current]: { ...prev[dragging.current], x: Math.round(nx), y: Math.round(ny) },
        }));
        return;
      }

      // Hover detection
      const hit = hitTest(pt);
      setHoveredEl(hit);

      // Cursor
      const canvas = canvasRef.current;
      if (isNearResize(pt)) {
        canvas.style.cursor = "nwse-resize";
      } else if (hit) {
        canvas.style.cursor = "move";
      } else {
        canvas.style.cursor = "default";
      }
    },
    [locked, toCanvas, hitTest, isNearResize, elements, setElements, cw, ch]
  );

  // mouseup on window
  useEffect(() => {
    const onUp = () => {
      if (dragging.current || resizing.current) {
        dragging.current = null;
        resizing.current = null;
        setSnapGuides([]);
        if (canvasRef.current) canvasRef.current.style.cursor = "default";
      }
    };
    window.addEventListener("mouseup", onUp);
    return () => window.removeEventListener("mouseup", onUp);
  }, []);

  // Keyboard nudging
  useEffect(() => {
    const onKey = (e) => {
      if (!selectedEl) return;
      const arrows = ["ArrowUp", "ArrowDown", "ArrowLeft", "ArrowRight"];
      if (!arrows.includes(e.key)) {
        if (e.key === "Escape") setSelectedEl(null);
        return;
      }
      e.preventDefault();
      const step = e.shiftKey ? 10 : 1;
      setElements((prev) => {
        const el = { ...prev[selectedEl] };
        if (e.key === "ArrowLeft") el.x = Math.max(0, el.x - step);
        if (e.key === "ArrowRight") el.x = Math.min(cw - el.w, el.x + step);
        if (e.key === "ArrowUp") el.y = Math.max(0, el.y - step);
        if (e.key === "ArrowDown") el.y = Math.min(ch - el.h, el.y + step);
        return { ...prev, [selectedEl]: el };
      });
    };
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, [selectedEl, setSelectedEl, setElements, cw, ch]);

  return (
    <canvas
      ref={canvasRef}
      onMouseDown={onMouseDown}
      onMouseMove={onMouseMove}
      onMouseLeave={() => setHoveredEl(null)}
      style={{
        width: cw * PREVIEW_SCALE,
        height: ch * PREVIEW_SCALE,
        borderRadius: 12,
        boxShadow: "0 8px 32px rgba(0,0,0,0.5)",
      }}
    />
  );
}
