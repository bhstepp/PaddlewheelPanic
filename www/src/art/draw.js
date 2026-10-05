// Small shared drawing helpers.
import { PALETTE as C, SERIF } from "./palette.js";

export const TAU = Math.PI * 2;

export function roundRect(ctx, x, y, w, h, r) {
  const rr = Math.min(r, w / 2, h / 2);
  ctx.beginPath();
  ctx.moveTo(x + rr, y);
  ctx.arcTo(x + w, y, x + w, y + h, rr);
  ctx.arcTo(x + w, y + h, x, y + h, rr);
  ctx.arcTo(x, y + h, x, y, rr);
  ctx.arcTo(x, y, x + w, y, rr);
  ctx.closePath();
}

export function fillStroke(ctx, fill, lw = 4, stroke = C.ink) {
  ctx.fillStyle = fill;
  ctx.fill();
  ctx.lineWidth = lw;
  ctx.strokeStyle = stroke;
  ctx.stroke();
}

// A puffy cloud-style blob made of circles: outline first, then fill,
// so only the outer silhouette is inked.
export function puff(ctx, circles, fill, lw, stroke = C.ink) {
  ctx.strokeStyle = stroke;
  ctx.lineWidth = lw * 2;
  for (const [x, y, r] of circles) {
    ctx.beginPath();
    ctx.arc(x, y, r, 0, TAU);
    ctx.stroke();
  }
  ctx.fillStyle = fill;
  for (const [x, y, r] of circles) {
    ctx.beginPath();
    ctx.arc(x, y, r, 0, TAU);
    ctx.fill();
  }
}

// Letter-spaced serif text (canvas letterSpacing is not everywhere yet).
export function spacedText(ctx, text, x, y, size, spacing, opts = {}) {
  const { align = "center", weight = "bold", color = C.paper, italic = false } = opts;
  ctx.font = `${italic ? "italic " : ""}${weight} ${size}px ${SERIF}`;
  ctx.fillStyle = color;
  ctx.textBaseline = "middle";
  ctx.textAlign = "left";
  const chars = [...text];
  const widths = chars.map((c) => ctx.measureText(c).width);
  const total = widths.reduce((a, b) => a + b, 0) + spacing * (chars.length - 1);
  let cx = align === "center" ? x - total / 2 : align === "right" ? x - total : x;
  chars.forEach((c, i) => {
    ctx.fillText(c, cx, y);
    cx += widths[i] + spacing;
  });
  return total;
}

export function star(ctx, x, y, r, filled, lw = 3) {
  ctx.beginPath();
  for (let i = 0; i < 10; i++) {
    const a = -Math.PI / 2 + (i * Math.PI) / 5;
    const rr = i % 2 === 0 ? r : r * 0.45;
    ctx.lineTo(x + Math.cos(a) * rr, y + Math.sin(a) * rr);
  }
  ctx.closePath();
  ctx.lineJoin = "round";
  if (filled) {
    ctx.fillStyle = C.paper;
    ctx.fill();
  }
  ctx.lineWidth = lw;
  ctx.strokeStyle = filled ? C.ink : C.ash;
  ctx.stroke();
}

// An eighth note glyph drawn with paths.
export function noteGlyph(ctx, x, y, size, fill = C.ink, outline = C.paper) {
  ctx.save();
  ctx.translate(x, y);
  ctx.scale(size / 30, size / 30);
  const p = new Path2D();
  p.ellipse(-4, 9, 7.5, 5.5, -0.45, 0, TAU);
  p.rect(1.6, -16, 3.6, 25);
  p.moveTo(5.2, -16);
  p.bezierCurveTo(9, -9, 17, -8, 13, 4);
  p.bezierCurveTo(14, -3, 9, -6, 5.2, -7);
  p.closePath();
  ctx.lineJoin = "round";
  ctx.strokeStyle = outline;
  ctx.lineWidth = 5;
  ctx.stroke(p);
  ctx.fillStyle = fill;
  ctx.fill(p);
  ctx.restore();
}
