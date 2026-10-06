// The projection booth: every film reel you find unlocks a lobby card for
// its level, the jukebox plays any zone song you have reached, and reels
// unlock new film filters for the whole game.
import { PALETTE as C, SERIF } from "../art/palette.js";
import { spacedText, roundRect } from "../art/draw.js";
import { ornateFrame, divider } from "../ui.js";
import { CONFIG } from "../config.js";
import { ZONES } from "../zones/index.js";
import { levelDef } from "../levels/index.js";
import { SONGS } from "../music/songs.js";
import { FILTERS } from "../art/film.js";
import { filmReel } from "../entities/mechanics.js";
import { button, inside } from "./common.js";
import { isUnlocked, zoneVignette } from "./map.js";

const W = CONFIG.width;
const H = CONFIG.height;
const TAU = Math.PI * 2;

// One line of ballyhoo per lobby card.
const TAGLINES = {
  "1-1": "A deckhand's first day on the levee!",
  "1-2": "Barrels! Rafts! Cargo by the ton!",
  "1-3": "The Captain wants his boat back!",
  "2-1": "Swinging high above the timberline!",
  "2-2": "Down, down, down into the mine!",
  "2-3": "A runaway cart on a wobbly track!",
  "3-1": "Who's that rattling the chandeliers?",
  "3-2": "The portraits are watching you!",
  "3-3": "All aboard the phantom express!",
  "4-1": "Every stroke keeps time with the band!",
  "4-2": "Ink blots with a mind of their own!",
  "4-3": "Flattened flat by a steam roller!",
  "5-1": "Step right up, one and all!",
  "5-2": "The greatest little show on the pier!",
  "5-3": "One last ride on the big coaster!",
};
const SHORT = ["RIVER", "PEAKS", "MANOR", "STUDIO", "PIER"];

function cell(zi, li) {
  return { x: 74 + zi * 98, y: 150 + li * 104, w: 86, h: 96 };
}

function songButton(i) {
  return { x: 66 + i * 232, y: 528, w: 220, h: 46 };
}

function filterButton(i) {
  return { x: 66 + i * 232, y: 630, w: 220, h: 46 };
}

const BACK = { x: 994, y: 630, w: 220, h: 46 };

export function registerBooth(extras) {
  const { app } = extras;
  const { store, audio } = app;
  let selected = "1-1";
  let playing = null;

  function zoneOpen(zi) {
    return isUnlocked(ZONES[zi].levels[0]);
  }

  function stopJukebox() {
    if (playing) audio.stopMusic();
    playing = null;
  }

  function lobbyCard(ctx, id, t) {
    const x = 600;
    const y = 112;
    const w = 616;
    const h = 360;
    const zi = Number(id[0]) - 1;
    const def = levelDef(id);
    const found = store.hasReel(id);
    ctx.save();
    roundRect(ctx, x, y, w, h, 10);
    ctx.fillStyle = found ? C.paper : C.charcoal;
    ctx.fill();
    ctx.lineWidth = 4;
    ctx.strokeStyle = C.paper;
    ctx.stroke();
    if (!found) {
      ctx.setLineDash([10, 8]);
      ctx.strokeStyle = C.ash;
      ctx.lineWidth = 2;
      ctx.strokeRect(x + 18, y + 18, w - 36, h - 36);
      ctx.setLineDash([]);
      spacedText(ctx, "?", x + w / 2, y + 120, 90, 0, { color: C.ash });
      const open = isUnlocked(id);
      spacedText(ctx, open ? `REEL ${id} IS STILL MISSING` : `STOP ${id} IS STILL LOCKED`, x + w / 2, y + 230, 20, 3, { color: C.silver });
      spacedText(ctx, open ? `Look high and low in "${def.name}"` : "Keep traveling along the river", x + w / 2, y + 270, 20, 1, {
        italic: true,
        weight: "normal",
        color: C.ash,
      });
      ctx.restore();
      return;
    }
    // A printed lobby card: border rules, the zone picture, title and ballyhoo.
    ctx.strokeStyle = C.ink;
    ctx.lineWidth = 3;
    ctx.strokeRect(x + 14, y + 14, w - 28, h - 28);
    ctx.lineWidth = 1.2;
    ctx.strokeRect(x + 22, y + 22, w - 44, h - 44);
    spacedText(ctx, "NOW SHOWING", x + w / 2, y + 50, 16, 6, { color: C.slate });
    ctx.save();
    ctx.beginPath();
    ctx.rect(x + 40, y + 70, 250, 200);
    ctx.clip();
    ctx.fillStyle = C.silver;
    ctx.fillRect(x + 40, y + 70, 250, 200);
    ctx.translate(x + 165, y + 160);
    ctx.scale(1.35, 1.35);
    ctx.translate(-(x + 165), -(y + 160));
    zoneVignette(ctx, zi, x + 165, y + 160);
    ctx.restore();
    ctx.lineWidth = 3;
    ctx.strokeStyle = C.ink;
    ctx.strokeRect(x + 40, y + 70, 250, 200);
    spacedText(ctx, `STOP ${id}`, x + 455, y + 96, 16, 4, { color: C.slate });
    ctx.font = `italic bold 34px ${SERIF}`;
    ctx.fillStyle = C.ink;
    ctx.textAlign = "center";
    ctx.textBaseline = "middle";
    ctx.fillText(def.name, x + 455, y + 140, 290);
    ctx.font = `italic 19px ${SERIF}`;
    ctx.fillStyle = C.charcoal;
    wrap(ctx, TAGLINES[id] ?? "", x + 455, y + 190, 270, 26);
    spacedText(ctx, ZONES[zi].name.toUpperCase(), x + 455, y + 254, 14, 4, { color: C.slate });
    spacedText(ctx, "A RIVER JOURNEY IN FIVE REELS", x + w / 2, y + h - 48, 14, 4, { color: C.ink });
    // A reel spinning in the corner.
    ctx.beginPath();
    ctx.arc(x + w - 56, y + 56, 22, 0, TAU);
    ctx.fillStyle = C.paper;
    ctx.fill();
    filmReel(ctx, x + w - 56, y + 56, 20, t * 2);
    ctx.restore();
  }

  function wrap(ctx, text, cx, y, maxW, lh) {
    const words = text.split(" ");
    let lineText = "";
    let yy = y;
    for (const w of words) {
      const test = lineText ? `${lineText} ${w}` : w;
      if (ctx.measureText(test).width > maxW && lineText) {
        ctx.fillText(lineText, cx, yy);
        lineText = w;
        yy += lh;
      } else lineText = test;
    }
    if (lineText) ctx.fillText(lineText, cx, yy);
  }

  const screen = {
    open() {
      const found = ZONES.flatMap((z) => z.levels).filter((id) => store.hasReel(id));
      selected = found[0] ?? "1-1";
      app.go("booth");
    },

    draw(ctx, t) {
      ctx.fillStyle = C.ink;
      ctx.fillRect(0, 0, W, H);
      ornateFrame(ctx, 24, 20, W - 48, H - 40);
      spacedText(ctx, "THE PROJECTION BOOTH", W / 2, 62, 30, 8);
      divider(ctx, W / 2, 92, 200);
      spacedText(ctx, `FILM REELS FOUND  ${store.totalReels()} / 15`, 290, 114, 16, 3, { color: C.silver });

      // Reel shelf: one column per zone, one row per level.
      ZONES.forEach((z, zi) => {
        z.levels.forEach((id, li) => {
          const c = cell(zi, li);
          const cx = c.x + c.w / 2;
          const cy = c.y + 38;
          const isSel = selected === id;
          roundRect(ctx, c.x, c.y, c.w, c.h, 8);
          ctx.fillStyle = isSel ? C.charcoal : C.ink;
          ctx.fill();
          ctx.lineWidth = isSel ? 3 : 1.5;
          ctx.strokeStyle = isSel ? C.paper : C.slate;
          ctx.stroke();
          if (store.hasReel(id)) {
            ctx.beginPath();
            ctx.arc(cx, cy, 28, 0, TAU);
            ctx.fillStyle = C.paper;
            ctx.fill();
            filmReel(ctx, cx, cy, 26, isSel ? t * 2 : 0);
          } else {
            ctx.setLineDash([5, 5]);
            ctx.beginPath();
            ctx.arc(cx, cy, 26, 0, TAU);
            ctx.strokeStyle = C.slate;
            ctx.lineWidth = 2;
            ctx.stroke();
            ctx.setLineDash([]);
            spacedText(ctx, "?", cx, cy + 2, 24, 0, { color: C.slate });
          }
          spacedText(ctx, id, cx, c.y + c.h - 14, 14, 2, { color: isUnlocked(id) ? C.silver : C.slate });
        });
        spacedText(ctx, SHORT[zi], cell(zi, 0).x + 43, 140, 11, 2, { color: C.ash });
      });

      lobbyCard(ctx, selected, t);

      // Jukebox.
      spacedText(ctx, "JUKEBOX", 66, 508, 15, 4, { color: C.ash, align: "left" });
      ZONES.forEach((z, i) => {
        const open = zoneOpen(i);
        const b = songButton(i);
        const label = open ? (playing === z.song ? "♪ PLAYING" : SONGS[z.song].title.toUpperCase()) : "LOCKED";
        button(ctx, b, label, { primary: playing === z.song, disabled: !open, size: 14, spacing: 0.5 });
      });

      // Film filters.
      const reels = store.totalReels();
      const cur = store.getSettings().filter;
      spacedText(ctx, "FILM", 66, 610, 15, 4, { color: C.ash, align: "left" });
      spacedText(ctx, "·  FILM REELS UNLOCK NEW LOOKS", 140, 610, 13, 2, { color: C.ash, align: "left", weight: "normal" });
      FILTERS.forEach((f, i) => {
        const open = reels >= f.reels;
        const label = open ? f.name : `${f.reels} REELS`;
        button(ctx, filterButton(i), label, { primary: cur === f.id, disabled: !open, size: 14 });
      });
      button(ctx, BACK, "MAP", { size: 18 });
    },

    tap(x, y) {
      if (x < 0) {
        if (x === -2) {
          stopJukebox();
          app.openMap();
        }
        return true;
      }
      if (inside(x, y, BACK)) {
        stopJukebox();
        app.openMap();
        return true;
      }
      for (let zi = 0; zi < ZONES.length; zi++) {
        for (let li = 0; li < 3; li++) {
          if (inside(x, y, cell(zi, li))) selected = ZONES[zi].levels[li];
        }
        if (inside(x, y, songButton(zi)) && zoneOpen(zi)) {
          const song = ZONES[zi].song;
          if (playing === song) stopJukebox();
          else {
            audio.unlock();
            store.setSetting("muted", false);
            audio.setMuted(false);
            audio.resume();
            audio.startMusic(song);
            playing = song;
          }
        }
      }
      FILTERS.forEach((f, i) => {
        if (inside(x, y, filterButton(i)) && store.totalReels() >= f.reels) store.setSetting("filter", f.id);
      });
      return true;
    },
  };

  extras.register("booth", screen);
}
