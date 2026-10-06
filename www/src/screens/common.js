// Shared bits for menu screens: buttons with hit-testing, star rows.
import { PALETTE as C } from "../art/palette.js";
import { roundRect, spacedText, star } from "../art/draw.js";

export function inside(x, y, r) {
  return x >= r.x && x <= r.x + r.w && y >= r.y && y <= r.y + r.h;
}

// A pill button. style: "dark" (on paper) or "light" (on black cards).
export function button(ctx, r, label, { style = "light", primary = false, disabled = false, size = 24 } = {}) {
  ctx.save();
  roundRect(ctx, r.x, r.y, r.w, r.h, r.h / 2);
  if (style === "light") {
    ctx.fillStyle = primary ? C.paper : C.ink;
    ctx.fill();
    ctx.lineWidth = 3;
    ctx.strokeStyle = C.paper;
    ctx.stroke();
  } else {
    ctx.fillStyle = primary ? C.ink : C.paper;
    ctx.fill();
    ctx.lineWidth = 3;
    ctx.strokeStyle = C.ink;
    ctx.stroke();
  }
  if (disabled) ctx.globalAlpha = 0.4;
  const color = style === "light" ? (primary ? C.ink : C.paper) : primary ? C.paper : C.ink;
  spacedText(ctx, label, r.x + r.w / 2, r.y + r.h / 2 + 1, size, 4, { color });
  ctx.restore();
}

export function starRow(ctx, x, y, n, r = 9, dark = false) {
  for (let i = 0; i < 3; i++) {
    const sx = x + (i - 1) * r * 2.3;
    if (dark) {
      // On paper: filled stars are ink, empty ones are outlines.
      ctx.beginPath();
      for (let k = 0; k < 10; k++) {
        const a = -Math.PI / 2 + (k * Math.PI) / 5;
        const rr = k % 2 === 0 ? r : r * 0.45;
        ctx.lineTo(sx + Math.cos(a) * rr, y + Math.sin(a) * rr);
      }
      ctx.closePath();
      ctx.fillStyle = i < n ? C.ink : C.paper;
      ctx.fill();
      ctx.lineWidth = 1.6;
      ctx.strokeStyle = C.ink;
      ctx.stroke();
    } else {
      star(ctx, sx, y, r, i < n, 2);
    }
  }
}
