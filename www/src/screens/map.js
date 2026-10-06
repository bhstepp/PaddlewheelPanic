// The journey map: a hand-inked parchment with a vignette per zone and a
// dotted trail linking every level. Tap a level stop to see its card.
import { PALETTE as C, SERIF } from "../art/palette.js";
import { TAU, rng, makeLayer, layerRes, wash, paperTexture, rope } from "../art/ink.js";
import { spacedText } from "../art/draw.js";
import { CONFIG } from "../config.js";
import { ZONES } from "../zones/index.js";
import { levelDef } from "../levels/index.js";
import { levelRecord, isDone, totalStars, totalReels } from "../storage.js";
import { button, inside, starRow } from "./common.js";

const W = CONFIG.width;
const H = CONFIG.height;

export const ZONE_POS = [
  [205, 300],
  [440, 470],
  [650, 300],
  [865, 470],
  [1080, 300],
];
const NODE_OFF = [
  [-62, 108],
  [0, 124],
  [62, 108],
];

export function nodePos(zi, li) {
  const [zx, zy] = ZONE_POS[zi];
  const up = zy > 400; // lower-row zones put their stops above the vignette
  const [dx, dy] = NODE_OFF[li];
  return [zx + dx, up ? zy - dy - 10 : zy + dy];
}

// A level is open when it exists and the one before it has been finished.
export function isUnlocked(id) {
  if (!levelDef(id)) return false;
  const [z, l] = id.split("-").map(Number);
  if (z === 1 && l === 1) return true;
  const prev = l > 1 ? `${z}-${l - 1}` : `${z - 1}-3`;
  return isDone(prev);
}

let bg = null;

function line(ctx, color, w) {
  ctx.strokeStyle = color;
  ctx.lineWidth = w;
  ctx.lineCap = "round";
  ctx.lineJoin = "round";
}

function paintMap() {
  const lay = makeLayer(W, H, layerRes());
  const { ctx } = lay;
  const r = rng(4242);
  // Parchment.
  const g = ctx.createRadialGradient(W / 2, H / 2, 100, W / 2, H / 2, W * 0.7);
  g.addColorStop(0, C.paper);
  g.addColorStop(0.8, C.silver);
  g.addColorStop(1, C.ash);
  ctx.fillStyle = g;
  ctx.fillRect(0, 0, W, H);
  paperTexture(ctx, W, H, r, { strength: 1.6, blot: 1.4 });
  // Inked double border and corner compass.
  line(ctx, C.ink, 4);
  ctx.strokeRect(22, 22, W - 44, H - 44);
  line(ctx, C.ink, 1.5);
  ctx.strokeRect(32, 32, W - 64, H - 64);
  compass(ctx, 1190, 620, 38);
  // A meandering river crossing the whole map behind everything.
  const river = [];
  for (let x = 30; x <= W - 30; x += 20) river.push([x, 395 + Math.sin(x * 0.011) * 40 + Math.sin(x * 0.027) * 12]);
  ctx.save();
  line(ctx, C.ash, 26);
  ctx.globalAlpha = 0.45;
  ctx.beginPath();
  river.forEach(([x, y], i) => (i ? ctx.lineTo(x, y) : ctx.moveTo(x, y)));
  ctx.stroke();
  ctx.globalAlpha = 1;
  line(ctx, C.slate, 1.4);
  for (const off of [-13, 13]) {
    ctx.beginPath();
    river.forEach(([x, y], i) => (i ? ctx.lineTo(x, y + off) : ctx.moveTo(x, y + off)));
    ctx.stroke();
  }
  ctx.restore();
  // Vignettes.
  const painters = [vRiver, vMountains, vHaunted, vStudio, vPark];
  ZONES.forEach((z, i) => {
    const [x, y] = ZONE_POS[i];
    painters[i](ctx, x, y, r);
    ctx.font = `italic bold 21px ${SERIF}`;
    ctx.textAlign = "center";
    ctx.textBaseline = "middle";
    ctx.fillStyle = C.ink;
    const ny = y > 400 ? y + 82 : y - 86;
    ctx.fillText(z.name, x, ny);
  });
  // Dotted trail through every stop.
  const pts = [];
  ZONES.forEach((z, zi) => z.levels.forEach((_, li) => pts.push(nodePos(zi, li))));
  line(ctx, C.ink, 2.5);
  ctx.setLineDash([2, 9]);
  ctx.beginPath();
  pts.forEach(([x, y], i) => {
    if (!i) ctx.moveTo(x, y);
    else {
      const [px, py] = pts[i - 1];
      ctx.quadraticCurveTo((px + x) / 2, (py + y) / 2 + (i % 3 === 0 ? 0 : 14), x, y);
    }
  });
  ctx.stroke();
  ctx.setLineDash([]);
  return lay;
}

function compass(ctx, x, y, s) {
  line(ctx, C.ink, 1.5);
  ctx.beginPath();
  ctx.arc(x, y, s, 0, TAU);
  ctx.stroke();
  ctx.beginPath();
  ctx.arc(x, y, s * 0.8, 0, TAU);
  ctx.stroke();
  for (let i = 0; i < 4; i++) {
    const a = (i * TAU) / 4 - Math.PI / 2;
    ctx.beginPath();
    ctx.moveTo(x + Math.cos(a) * s * 0.95, y + Math.sin(a) * s * 0.95);
    ctx.lineTo(x + Math.cos(a + 0.5) * s * 0.2, y + Math.sin(a + 0.5) * s * 0.2);
    ctx.lineTo(x + Math.cos(a - 0.5) * s * 0.2, y + Math.sin(a - 0.5) * s * 0.2);
    ctx.closePath();
    ctx.fillStyle = i === 0 ? C.ink : C.paper;
    ctx.fill();
    ctx.stroke();
  }
  ctx.fillStyle = C.ink;
  ctx.font = `bold 14px ${SERIF}`;
  ctx.textAlign = "center";
  ctx.fillText("N", x, y - s - 10);
}

// ---------------------------------------------------------------- zone vignettes

function vRiver(ctx, x, y, r) {
  // Water lines, a dock and a little sidewheeler with smoke.
  line(ctx, C.slate, 1.6);
  for (let k = 0; k < 4; k++) {
    ctx.beginPath();
    for (let t = -80; t <= 80; t += 16) {
      const yy = y + 30 + k * 9;
      ctx[t === -80 ? "moveTo" : "lineTo"](x + t + (k % 2) * 8, yy + (t % 32 === 0 ? -2 : 2));
    }
    ctx.stroke();
  }
  const hull = new Path2D();
  hull.moveTo(x - 60, y + 14);
  hull.lineTo(x + 34, y + 14);
  hull.quadraticCurveTo(x + 30, y + 30, x + 18, y + 30);
  hull.lineTo(x - 50, y + 30);
  hull.closePath();
  wash(ctx, hull, C.ash, C.ink, { dir: "down", strength: 0.5, x: x - 60, y: y + 14, w: 94, h: 16 });
  line(ctx, C.ink, 2);
  ctx.stroke(hull);
  const cab = new Path2D();
  cab.rect(x - 46, y - 6, 62, 20);
  wash(ctx, cab, C.paper, C.ash, { dir: "right", strength: 0.6, x: x - 46, y: y - 6, w: 62, h: 20 });
  ctx.stroke(cab);
  ctx.fillStyle = C.ink;
  ctx.fillRect(x - 24, y - 40, 9, 34);
  for (let k = 0; k < 4; k++) {
    ctx.beginPath();
    ctx.arc(x - 26 - k * 12, y - 48 - k * 8, 7 + k * 3, 0, TAU);
    ctx.fillStyle = C.paper;
    ctx.fill();
    line(ctx, C.slate, 1.4);
    ctx.stroke();
  }
  ctx.beginPath();
  ctx.arc(x - 14, y + 18, 13, 0, TAU);
  ctx.fillStyle = C.silver;
  ctx.fill();
  line(ctx, C.ink, 2);
  ctx.stroke();
  // Dock.
  ctx.fillStyle = C.ash;
  ctx.fillRect(x + 40, y + 8, 50, 7);
  ctx.strokeRect(x + 40, y + 8, 50, 7);
  for (const px of [x + 46, x + 66, x + 84]) {
    ctx.beginPath();
    ctx.moveTo(px, y + 15);
    ctx.lineTo(px, y + 40);
    ctx.stroke();
  }
}

function vMountains(ctx, x, y, r) {
  const peaks = [[-60, 30, 50], [0, 60, 70], [55, 40, 55]];
  for (const [dx, h, w] of peaks) {
    const p = new Path2D();
    p.moveTo(x + dx - w, y + 38);
    p.lineTo(x + dx, y + 38 - h - 10);
    p.lineTo(x + dx + w, y + 38);
    p.closePath();
    wash(ctx, p, C.silver, C.slate, { dir: "right", strength: 0.6, x: x + dx - w, y: y - h, w: w * 2, h: h + 40 });
    line(ctx, C.ink, 2);
    ctx.stroke(p);
    // Snow cap.
    const cap = new Path2D();
    cap.moveTo(x + dx - w * 0.28, y + 38 - h * 0.72 - 10);
    cap.lineTo(x + dx, y + 38 - h - 10);
    cap.lineTo(x + dx + w * 0.28, y + 38 - h * 0.72 - 10);
    cap.lineTo(x + dx + w * 0.1, y + 38 - h * 0.62 - 10);
    cap.lineTo(x + dx - w * 0.08, y + 38 - h * 0.76 - 10);
    cap.closePath();
    ctx.fillStyle = C.paper;
    ctx.fill(cap);
    line(ctx, C.ink, 1.4);
    ctx.stroke(cap);
  }
  // Zigzag trail and pines.
  line(ctx, C.ink, 1.6);
  ctx.setLineDash([4, 4]);
  ctx.beginPath();
  ctx.moveTo(x - 30, y + 36);
  ctx.lineTo(x + 10, y + 18);
  ctx.lineTo(x - 14, y + 2);
  ctx.lineTo(x + 18, y - 14);
  ctx.stroke();
  ctx.setLineDash([]);
  for (const [px, py] of [[-86, 40], [80, 40], [92, 34]]) {
    ctx.beginPath();
    ctx.moveTo(x + px, y + py - 26);
    ctx.lineTo(x + px - 9, y + py);
    ctx.lineTo(x + px + 9, y + py);
    ctx.closePath();
    ctx.fillStyle = C.slate;
    ctx.fill();
    ctx.stroke();
  }
}

function vHaunted(ctx, x, y, r) {
  // Moon, a crooked manor with a tower, bats.
  ctx.beginPath();
  ctx.arc(x + 58, y - 44, 18, 0, TAU);
  ctx.fillStyle = C.paper;
  ctx.fill();
  line(ctx, C.ash, 2);
  ctx.stroke();
  const house = new Path2D();
  house.moveTo(x - 50, y + 40);
  house.lineTo(x - 48, y - 4);
  house.lineTo(x - 22, y - 30);
  house.lineTo(x + 4, y - 6);
  house.lineTo(x + 6, y - 40);
  house.lineTo(x + 20, y - 62);
  house.lineTo(x + 34, y - 40);
  house.lineTo(x + 34, y + 40);
  house.closePath();
  wash(ctx, house, C.slate, C.ink, { dir: "right", strength: 0.6, x: x - 50, y: y - 62, w: 84, h: 102 });
  line(ctx, C.ink, 2);
  ctx.stroke(house);
  ctx.fillStyle = C.paper;
  for (const [wx, wy] of [[-38, 4], [-20, 4], [-38, 22], [12, -24], [12, 6], [12, 24]]) ctx.fillRect(x + wx, y + wy, 8, 10);
  ctx.fillStyle = C.ink;
  ctx.fillRect(x - 28, y + 24, 12, 16);
  for (const [bx, by] of [[-70, -40], [-56, -54], [70, -6]]) {
    ctx.beginPath();
    ctx.moveTo(x + bx - 10, y + by);
    ctx.quadraticCurveTo(x + bx - 5, y + by - 6, x + bx, y + by);
    ctx.quadraticCurveTo(x + bx + 5, y + by - 6, x + bx + 10, y + by);
    ctx.stroke();
  }
  // Crooked fence.
  ctx.beginPath();
  for (let k = 0; k < 7; k++) {
    ctx.moveTo(x - 90 + k * 9, y + 40);
    ctx.lineTo(x - 90 + k * 9 + (k % 2 ? 2 : -2), y + 26);
  }
  ctx.moveTo(x - 92, y + 32);
  ctx.lineTo(x - 34, y + 32);
  ctx.stroke();
}

function vStudio(ctx, x, y, r) {
  // A studio with a skylight, a giant brush and an inkwell.
  const b = new Path2D();
  b.rect(x - 56, y - 22, 80, 62);
  wash(ctx, b, C.paper, C.ash, { dir: "right", strength: 0.6, x: x - 56, y: y - 22, w: 80, h: 62 });
  line(ctx, C.ink, 2);
  ctx.stroke(b);
  const roof = new Path2D();
  roof.moveTo(x - 62, y - 22);
  roof.lineTo(x - 30, y - 48);
  roof.lineTo(x + 30, y - 22);
  roof.closePath();
  wash(ctx, roof, C.ash, C.slate, { dir: "down", strength: 0.5, x: x - 62, y: y - 48, w: 92, h: 26 });
  ctx.stroke(roof);
  ctx.fillStyle = C.slate;
  ctx.fillRect(x - 44, y - 8, 22, 18);
  ctx.fillRect(x - 12, y - 8, 22, 18);
  ctx.fillStyle = C.ink;
  ctx.fillRect(x - 20, y + 18, 14, 22);
  // Inkwell.
  const well = new Path2D();
  well.moveTo(x + 40, y + 40);
  well.lineTo(x + 40, y + 12);
  well.quadraticCurveTo(x + 40, y + 2, x + 52, y + 2);
  well.lineTo(x + 66, y + 2);
  well.quadraticCurveTo(x + 78, y + 2, x + 78, y + 12);
  well.lineTo(x + 78, y + 40);
  well.closePath();
  wash(ctx, well, C.ink, null);
  ctx.stroke(well);
  ctx.fillStyle = C.paper;
  ctx.fillRect(x + 46, y + 14, 6, 18);
  // Brush leaning in.
  line(ctx, C.ink, 5);
  ctx.beginPath();
  ctx.moveTo(x + 60, y - 4);
  ctx.lineTo(x + 92, y - 62);
  ctx.stroke();
  line(ctx, C.paper, 2.5);
  ctx.stroke();
  ctx.beginPath();
  ctx.ellipse(x + 57, y + 2, 5, 9, 0.5, 0, TAU);
  ctx.fillStyle = C.ink;
  ctx.fill();
}

function vPark(ctx, x, y, r) {
  // Ferris wheel and a coaster hill.
  const cx = x - 26;
  const cy = y - 8;
  line(ctx, C.ink, 2);
  ctx.beginPath();
  ctx.arc(cx, cy, 42, 0, TAU);
  ctx.stroke();
  ctx.beginPath();
  for (let k = 0; k < 8; k++) {
    const a = (k * TAU) / 8;
    ctx.moveTo(cx, cy);
    ctx.lineTo(cx + Math.cos(a) * 42, cy + Math.sin(a) * 42);
  }
  ctx.moveTo(cx - 24, cy + 50);
  ctx.lineTo(cx, cy);
  ctx.lineTo(cx + 24, cy + 50);
  ctx.stroke();
  for (let k = 0; k < 8; k++) {
    const a = (k * TAU) / 8;
    ctx.fillStyle = k % 2 ? C.paper : C.ash;
    ctx.beginPath();
    ctx.arc(cx + Math.cos(a) * 42, cy + Math.sin(a) * 42 + 6, 6, 0, TAU);
    ctx.fill();
    ctx.lineWidth = 1.5;
    ctx.stroke();
  }
  // Coaster.
  ctx.lineWidth = 2;
  ctx.beginPath();
  ctx.moveTo(x + 6, y + 42);
  ctx.bezierCurveTo(x + 30, y - 60, x + 50, y - 60, x + 66, y + 10);
  ctx.bezierCurveTo(x + 74, y + 30, x + 84, y + 30, x + 96, y + 10);
  ctx.stroke();
  ctx.beginPath();
  for (let t = 0; t < 1; t += 0.12) {
    const px = x + 6 + t * 90;
    ctx.moveTo(px, y + 42);
    ctx.lineTo(px, y + 42 - Math.sin(t * Math.PI) * 60 * (t < 0.65 ? 1 : 0.4));
  }
  ctx.stroke();
  // Pennant.
  ctx.beginPath();
  ctx.moveTo(cx, cy - 42);
  ctx.lineTo(cx, cy - 64);
  ctx.stroke();
  ctx.beginPath();
  ctx.moveTo(cx, cy - 64);
  ctx.lineTo(cx + 18, cy - 59);
  ctx.lineTo(cx, cy - 54);
  ctx.closePath();
  ctx.fillStyle = C.ink;
  ctx.fill();
}

function padlock(ctx, x, y) {
  ctx.save();
  ctx.translate(x, y);
  line(ctx, C.ink, 3);
  ctx.beginPath();
  ctx.arc(0, -6, 7, Math.PI, 0);
  ctx.stroke();
  ctx.fillStyle = C.ink;
  ctx.fillRect(-10, -6, 20, 15);
  ctx.fillStyle = C.paper;
  ctx.fillRect(-1.5, -1, 3, 6);
  ctx.restore();
}

// ---------------------------------------------------------------- screen

export function mapButtons() {
  return [
    { id: "daily", x: 70, y: 640, w: 290, h: 50, label: "DAILY MATINEE" },
    { id: "booth", x: 380, y: 640, w: 330, h: 50, label: "PROJECTION BOOTH" },
    { id: "sound", x: 730, y: 640, w: 180, h: 50, label: "SOUND" },
  ];
}

export function drawMap(ctx, t, muted, focus) {
  if (!bg) bg = paintMap();
  ctx.drawImage(bg.canvas, 0, 0, W, H);
  spacedText(ctx, "THE RIVER JOURNEY", W / 2, 70, 34, 8, { color: C.ink });
  ctx.font = `italic 18px ${SERIF}`;
  ctx.fillStyle = C.slate;
  ctx.textAlign = "center";
  ctx.fillText("Pick a stop along the way", W / 2, 104);
  // Totals.
  spacedText(ctx, `★ ${totalStars()} / 45     REELS ${totalReels()} / 15`, W - 70, 70, 16, 2, { color: C.ink, align: "right", weight: "bold" });

  ZONES.forEach((z, zi) => {
    const zoneOpen = isUnlocked(z.levels[0]);
    if (!zoneOpen) {
      const [x, y] = ZONE_POS[zi];
      ctx.save();
      ctx.globalAlpha = 0.55;
      ctx.fillStyle = C.silver;
      ctx.beginPath();
      ctx.ellipse(x, y - 6, 110, 74, 0, 0, TAU);
      ctx.fill();
      ctx.restore();
      padlock(ctx, x, y - 4);
    }
    z.levels.forEach((id, li) => {
      const [x, y] = nodePos(zi, li);
      const open = isUnlocked(id);
      const rec = levelRecord(id);
      const isFocus = focus === id;
      const bob = isFocus ? Math.sin(t * 5) * 3 : 0;
      ctx.beginPath();
      ctx.arc(x, y + bob, 19, 0, TAU);
      ctx.fillStyle = open ? (rec?.done ? C.ink : C.paper) : C.silver;
      ctx.fill();
      ctx.lineWidth = isFocus ? 4 : 2.5;
      ctx.strokeStyle = C.ink;
      ctx.stroke();
      if (open) {
        ctx.font = `bold 16px ${SERIF}`;
        ctx.textAlign = "center";
        ctx.textBaseline = "middle";
        ctx.fillStyle = rec?.done ? C.paper : C.ink;
        ctx.fillText(id, x, y + bob + 1);
        starRow(ctx, x, y + 32, rec?.stars ?? 0, 6, true);
        if (rec?.reel) {
          ctx.beginPath();
          ctx.arc(x + 20, y - 16 + bob, 6, 0, TAU);
          ctx.fillStyle = C.ink;
          ctx.fill();
          ctx.fillStyle = C.paper;
          ctx.beginPath();
          ctx.arc(x + 20, y - 16 + bob, 1.6, 0, TAU);
          ctx.fill();
        }
      } else {
        padlock(ctx, x, y + 2);
      }
    });
  });

  for (const b of mapButtons()) {
    button(ctx, b, b.id === "sound" ? (muted ? "SOUND: OFF" : "SOUND: ON") : b.label, { style: "dark", primary: b.id !== "sound", size: 20 });
  }
}

// Returns { level } or { button } or null.
export function mapTap(x, y) {
  for (const b of mapButtons()) if (inside(x, y, b)) return { button: b.id };
  for (let zi = 0; zi < ZONES.length; zi++) {
    const levels = ZONES[zi].levels;
    for (let li = 0; li < levels.length; li++) {
      const [nx, ny] = nodePos(zi, li);
      if (Math.hypot(x - nx, y - ny) < 30 && isUnlocked(levels[li])) return { level: levels[li] };
    }
  }
  return null;
}

// A zone's little map illustration, for lobby cards in the booth.
export function zoneVignette(ctx, zi, x, y) {
  [vRiver, vMountains, vHaunted, vStudio, vPark][zi](ctx, x, y, rng(zi + 1));
}
