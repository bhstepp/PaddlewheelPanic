// Intertitle cards: the level intro before a run and the result after it.
import { PALETTE as C, SERIF } from "../art/palette.js";
import { spacedText, star } from "../art/draw.js";
import { ornateFrame, divider } from "../ui.js";
import { CONFIG } from "../config.js";
import { SONGS } from "../music/songs.js";
import { button } from "./common.js";

const W = CONFIG.width;
const H = CONFIG.height;

function starText(n) {
  return "★".repeat(n) + "☆".repeat(3 - n);
}

// ---------------------------------------------------------------- intro

export function introButtons() {
  return [
    { id: "play", x: W / 2 + 20, y: 560, w: 240, h: 60, label: "PLAY", primary: true },
    { id: "map", x: W / 2 - 260, y: 560, w: 240, h: 60, label: "MAP" },
  ];
}

export function drawIntro(ctx, def, zone, rec, t, opts = {}) {
  ctx.fillStyle = C.ink;
  ctx.fillRect(0, 0, W, H);
  ornateFrame(ctx, 40, 36, W - 80, H - 72);
  spacedText(ctx, opts.kicker ?? `STOP ${def.id}  ·  ${zone.name.toUpperCase()}`, W / 2, 120, 20, 5, { color: C.ash });
  ctx.font = `italic bold 64px ${SERIF}`;
  ctx.fillStyle = C.paper;
  ctx.textAlign = "center";
  ctx.textBaseline = "middle";
  ctx.fillText(def.name, W / 2, 200);
  divider(ctx, W / 2, 256, 220);
  spacedText(ctx, opts.blurb ?? zone.blurb, W / 2, 300, 22, 1, { italic: true, weight: "normal", color: C.silver });
  spacedText(ctx, `♪  ${SONGS[zone.song].title}`, W / 2, 352, 20, 3, { color: C.ash, weight: "normal" });
  if (def.boss) spacedText(ctx, "THE CAPTAIN GIVES CHASE!", W / 2, 400, 24, 5);
  if (opts.lines) {
    opts.lines.forEach((l, i) => spacedText(ctx, l, W / 2, 452 + i * 34, 20, 3, { color: C.silver, weight: "normal" }));
  } else if (rec?.done) {
    spacedText(ctx, `BEST  ${starText(rec.stars)}  ·  ${rec.notes} NOTES  ·  ${rec.timeSec.toFixed(1)} S`, W / 2, 458, 20, 3, { color: C.silver, weight: "normal" });
    spacedText(ctx, rec.reel ? "FILM REEL FOUND" : "A FILM REEL IS HIDDEN HERE", W / 2, 496, 18, 3, { color: C.ash, weight: "normal" });
  } else {
    spacedText(ctx, "A FILM REEL IS HIDDEN HERE", W / 2, 470, 18, 3, { color: C.ash, weight: "normal" });
  }
  if (opts.ghost && !opts.mode) spacedText(ctx, "YOUR BEST RUN RACES ALONG AS A GHOST", W / 2, 528, 15, 3, { color: C.ash, weight: "normal" });
  for (const b of introButtons()) button(ctx, b, b.label, { primary: b.primary });
}

// ---------------------------------------------------------------- result

export function resultButtons(r, hasNext) {
  const bs = [];
  if (r.won && hasNext) {
    bs.push({ id: "next", x: W / 2 + 140, y: 590, w: 240, h: 56, label: "NEXT", primary: true });
    bs.push({ id: "retry", x: W / 2 - 120, y: 590, w: 240, h: 56, label: "RETRY" });
    bs.push({ id: "map", x: W / 2 - 380, y: 590, w: 240, h: 56, label: "MAP" });
  } else {
    bs.push({ id: "retry", x: W / 2 + 20, y: 590, w: 240, h: 56, label: "RETRY", primary: true });
    bs.push({ id: "map", x: W / 2 - 260, y: 590, w: 240, h: 56, label: "MAP" });
  }
  return bs;
}

export function drawResultCard(ctx, r, best, isNewBest, t, hasNext) {
  ctx.fillStyle = C.ink;
  ctx.fillRect(0, 0, W, H);
  ornateFrame(ctx, 40, 36, W - 80, H - 72);

  const title = r.won ? (r.daily ? "That's a wrap!" : "You made the landing!") : "The Captain caught you!";
  ctx.font = `italic bold 56px ${SERIF}`;
  ctx.fillStyle = C.paper;
  ctx.textAlign = "center";
  ctx.textBaseline = "middle";
  ctx.fillText(title, W / 2, 118);
  divider(ctx, W / 2, 170, 220);

  if (r.won) {
    const earned = [true, r.ratio >= 0.8, r.clean];
    const labels = ["Reached the landing", "80% of the notes", "No spills, no bumps"];
    for (let i = 0; i < 3; i++) {
      const pop = Math.min(1, Math.max(0, (t - 0.3 - i * 0.35) * 4));
      const filled = earned[i] && pop > 0;
      const s = filled ? 0.6 + pop * 0.4 + Math.sin(Math.min(1, pop) * Math.PI) * 0.25 : 1;
      star(ctx, W / 2 + (i - 1) * 200, 238, 36 * s, filled, 4);
      ctx.font = `italic 17px ${SERIF}`;
      ctx.fillStyle = earned[i] ? C.paper : C.ash;
      ctx.fillText(labels[i], W / 2 + (i - 1) * 200, 292);
    }
  } else {
    spacedText(ctx, `${r.distanceFt} FT DOWNRIVER`, W / 2, 240, 34, 6);
    const line = r.progress > 0.75 ? "So close to the landing…" : r.progress > 0.4 ? "Halfway there. Keep at it!" : "It's a long way. Try again!";
    spacedText(ctx, line, W / 2, 286, 22, 1, { italic: true, weight: "normal", color: C.silver });
  }

  spacedText(ctx, `NOTES  ${r.collected} OF ${r.totalNotes}`, W / 2, 350, 24, 4);
  const extras = [];
  if (r.bonus > 0) extras.push(`+${r.bonus} ON THE BEAT`);
  if (r.bestCombo > 1) extras.push(`BEST COMBO ×${r.bestCombo}`);
  extras.push(`TIME ${r.timeSec.toFixed(1)} S`);
  spacedText(ctx, extras.join("  ·  "), W / 2, 388, 18, 3, { color: C.silver, weight: "normal" });
  if (r.reel) spacedText(ctx, r.reelNew ? "YOU FOUND THE FILM REEL!" : "FILM REEL COLLECTED", W / 2, 432, 20, 4, { color: C.paper });

  if (best && best.done) {
    const label = isNewBest ? "NEW BEST!" : "BEST";
    spacedText(ctx, `${label}  ${starText(best.stars)}  ·  ${best.notes} NOTES  ·  ${best.timeSec.toFixed(1)} S`, W / 2, 486, 19, 3, {
      color: isNewBest ? C.paper : C.ash,
      weight: isNewBest ? "bold" : "normal",
    });
  }

  if (t > 0.6) for (const b of resultButtons(r, hasNext)) button(ctx, b, b.label, { primary: b.primary });
}
