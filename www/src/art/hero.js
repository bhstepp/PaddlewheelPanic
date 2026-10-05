// The hero: the 1928 riverboat deckhand mouse, drawn entirely with vector paths.
// Only the 1928 public-domain design is used: pie-cut eyes, round snout,
// round ears, bare black hands (no gloves), button shorts, thin tail.
// All hero drawing stays behind drawHero(ctx, state).
import { PALETTE as C } from "./palette.js";

const TAU = Math.PI * 2;

/**
 * state = {
 *   x, y        feet position in screen space
 *   pose        "run" | "jump" | "fall" | "dance" | "hurt" | "caught" | "stand"
 *   t           time in seconds (for idle motion)
 *   phase       run cycle phase in radians
 *   squash      vertical scale (>1 stretch, <1 squash)
 *   whistle     0..1, puckered whistle mouth while > 0
 *   scale       overall scale
 *   beat        0..1 pulse on the music beat
 * }
 */
export function drawHero(ctx, s) {
  const scale = s.scale ?? 1;
  const sq = s.squash ?? 1;
  const pose = s.pose ?? "run";
  const t = s.t ?? 0;
  const ph = s.phase ?? 0;
  const rig = buildRig(pose, ph, t, s.beat ?? 0);

  ctx.save();
  ctx.translate(s.x, s.y);
  ctx.scale(scale / Math.sqrt(sq), scale * sq);
  ctx.lineCap = "round";
  ctx.lineJoin = "round";

  // Ground shadow while near the floor.
  if (s.shadow !== false && (pose === "run" || pose === "stand" || pose === "dance")) {
    ctx.fillStyle = C.charcoal;
    ctx.globalAlpha = 0.25;
    ctx.beginPath();
    ctx.ellipse(2, 1, 24, 4, 0, 0, TAU);
    ctx.fill();
    ctx.globalAlpha = 1;
  }

  // Back limbs first.
  drawLeg(ctx, rig.hipB, rig.footB, rig.kneeB);
  drawArm(ctx, rig.shoulderB, rig.handB, rig.elbowB);
  drawTail(ctx, rig, t);

  // Body.
  ctx.save();
  ctx.translate(0, rig.bodyY);
  ctx.rotate(rig.lean);
  drawBody(ctx);
  ctx.restore();

  drawLeg(ctx, rig.hipF, rig.footF, rig.kneeF);

  // A raised front arm tucks behind the head so it never covers the face.
  const armUp = rig.handF.y < rig.shoulderF.y - 20;
  if (armUp) drawArm(ctx, rig.shoulderF, rig.handF, rig.elbowF);

  // Head.
  ctx.save();
  ctx.translate(rig.head.x, rig.head.y);
  ctx.rotate(rig.headTilt);
  drawHead(ctx, s, pose, t);
  ctx.restore();

  if (!armUp) drawArm(ctx, rig.shoulderF, rig.handF, rig.elbowF);

  ctx.restore();
}

// ---------------------------------------------------------------- rig

function buildRig(pose, ph, t, beat) {
  const r = {
    bodyY: 0,
    lean: 0.08,
    headTilt: 0,
    head: { x: 6, y: -108 },
    hipF: { x: 4, y: -36 },
    hipB: { x: -4, y: -36 },
    shoulderF: { x: 5, y: -74 },
    shoulderB: { x: -5, y: -74 },
  };

  if (pose === "run") {
    const bob = -Math.abs(Math.sin(ph)) * 5;
    r.bodyY = bob;
    r.lean = 0.12;
    r.headTilt = 0.06 + Math.sin(ph * 2) * 0.03;
    const leg = (a) => {
      const fx = Math.sin(a) * 22 + 2;
      const lift = Math.max(0, -Math.cos(a));
      return { x: fx, y: -lift * 18 };
    };
    r.footF = leg(ph);
    r.footB = leg(ph + Math.PI);
    r.kneeF = { x: -10 - Math.cos(ph) * 4, y: 0 };
    r.kneeB = { x: -10 + Math.cos(ph) * 4, y: 0 };
    // Arms swing opposite to legs, bending like hoses.
    r.handF = { x: 4 - Math.sin(ph) * 26, y: -46 - Math.cos(ph) * 6 + bob };
    r.handB = { x: -4 + Math.sin(ph) * 24, y: -48 + Math.cos(ph) * 6 + bob };
    r.elbowF = { x: Math.sin(ph) * 10, y: 6 };
    r.elbowB = { x: -Math.sin(ph) * 10, y: 6 };
  } else if (pose === "jump") {
    r.lean = 0.05;
    r.headTilt = -0.12;
    r.footF = { x: 18, y: -18 };
    r.kneeF = { x: 10, y: -14 };
    r.footB = { x: -20, y: -2 };
    r.kneeB = { x: -6, y: 8 };
    r.handF = { x: 40, y: -56 };
    r.elbowF = { x: 2, y: -10 };
    r.handB = { x: -32, y: -96 };
    r.elbowB = { x: 8, y: 4 };
  } else if (pose === "fall") {
    const w = Math.sin(t * 22) * 4;
    r.lean = -0.04;
    r.headTilt = 0.1;
    r.footF = { x: 12, y: 4 + w };
    r.kneeF = { x: 8, y: 0 };
    r.footB = { x: -12, y: 2 - w };
    r.kneeB = { x: -8, y: 0 };
    r.handF = { x: 34, y: -124 + w };
    r.elbowF = { x: 10, y: 2 };
    r.handB = { x: -30, y: -118 - w };
    r.elbowB = { x: -10, y: 2 };
  } else if (pose === "dance") {
    const k = Math.sin(t * Math.PI * 2); // one cycle per second at 120 bpm half-time
    const hop = -Math.max(0, Math.sin(t * Math.PI * 4)) * 8 - beat * 3;
    r.bodyY = hop;
    r.lean = k * 0.1;
    r.headTilt = k * 0.12;
    r.hipF.y += hop;
    r.hipB.y += hop;
    r.footF = k > 0 ? { x: 24, y: -20 + hop * 0.5 } : { x: 8, y: 0 };
    r.footB = k > 0 ? { x: -8, y: 0 } : { x: -24, y: -20 + hop * 0.5 };
    r.kneeF = { x: 6, y: -6 };
    r.kneeB = { x: -6, y: -6 };
    r.handF = { x: 46, y: -120 + hop - k * 8 };
    r.elbowF = { x: 10, y: 6 };
    r.handB = { x: -32, y: -112 + hop + k * 8 };
    r.elbowB = { x: -10, y: 6 };
  } else if (pose === "hurt") {
    const w = Math.sin(t * 30) * 3;
    r.lean = -0.25;
    r.headTilt = -0.25;
    r.footF = { x: 18, y: -10 };
    r.kneeF = { x: 4, y: 6 };
    r.footB = { x: -6, y: 2 };
    r.kneeB = { x: -10, y: 0 };
    r.handF = { x: 40, y: -62 + w };
    r.elbowF = { x: -2, y: -8 };
    r.handB = { x: -26, y: -86 - w };
    r.elbowB = { x: 4, y: -6 };
  } else if (pose === "caught") {
    const w = Math.sin(t * 26);
    r.lean = 0.0;
    r.headTilt = -0.15;
    r.footF = { x: 10 + w * 10, y: -6 - Math.abs(w) * 6 };
    r.kneeF = { x: 8, y: 0 };
    r.footB = { x: -10 - w * 10, y: -6 - Math.abs(w) * 6 };
    r.kneeB = { x: -8, y: 0 };
    r.handF = { x: 44, y: -128 + w * 4 };
    r.elbowF = { x: 12, y: 4 };
    r.handB = { x: -32, y: -126 - w * 4 };
    r.elbowB = { x: -12, y: 4 };
  } else {
    // stand
    const breathe = Math.sin(t * 3) * 1.5;
    r.bodyY = breathe;
    r.footF = { x: 10, y: 0 };
    r.kneeF = { x: 0, y: 0 };
    r.footB = { x: -8, y: 0 };
    r.kneeB = { x: 0, y: 0 };
    r.handF = { x: 18, y: -42 + breathe };
    r.elbowF = { x: 6, y: 2 };
    r.handB = { x: -16, y: -42 + breathe };
    r.elbowB = { x: -6, y: 2 };
  }

  r.hipF = { x: r.hipF.x, y: r.hipF.y + (pose === "dance" ? 0 : r.bodyY) };
  r.hipB = { x: r.hipB.x, y: r.hipB.y + (pose === "dance" ? 0 : r.bodyY) };
  const sh = Math.sin(r.lean) * 36;
  r.shoulderF = { x: r.shoulderF.x + sh, y: r.shoulderF.y + r.bodyY };
  r.shoulderB = { x: r.shoulderB.x + sh, y: r.shoulderB.y + r.bodyY };
  r.head = { x: r.head.x + Math.sin(r.lean) * 62, y: r.head.y + r.bodyY };
  return r;
}

// ---------------------------------------------------------------- parts

// A rubber-hose limb: a smooth quadratic curve bent sideways by `bend`.
function hose(ctx, a, b, bend, width) {
  const mx = (a.x + b.x) / 2 + bend.x;
  const my = (a.y + b.y) / 2 + bend.y;
  ctx.strokeStyle = C.ink;
  ctx.lineWidth = width;
  ctx.beginPath();
  ctx.moveTo(a.x, a.y);
  ctx.quadraticCurveTo(mx, my, b.x, b.y);
  ctx.stroke();
}

function drawLeg(ctx, hip, foot, knee) {
  hose(ctx, hip, { x: foot.x, y: foot.y - 5 }, knee, 5.5);
  // Big rounded shoe, toe pointing forward.
  ctx.save();
  ctx.translate(foot.x + 6, foot.y - 6);
  ctx.fillStyle = C.charcoal;
  ctx.strokeStyle = C.ink;
  ctx.lineWidth = 3;
  ctx.beginPath();
  ctx.moveTo(-9, 5);
  ctx.bezierCurveTo(-12, -6, 2, -8, 8, -5);
  ctx.bezierCurveTo(16, -4, 18, 6, 10, 6);
  ctx.closePath();
  ctx.fill();
  ctx.stroke();
  // Shine.
  ctx.strokeStyle = C.paper;
  ctx.lineWidth = 1.8;
  ctx.beginPath();
  ctx.arc(9, -1, 3.2, -2.6, -1.4);
  ctx.stroke();
  ctx.restore();
}

function drawArm(ctx, shoulder, hand, elbow) {
  hose(ctx, shoulder, hand, elbow, 4.5);
  // Bare black hand with a thumb, 1928 style (no gloves).
  const ang = Math.atan2(hand.y - shoulder.y, hand.x - shoulder.x);
  ctx.save();
  ctx.translate(hand.x, hand.y);
  ctx.rotate(ang);
  ctx.fillStyle = C.ink;
  ctx.beginPath();
  ctx.ellipse(2, 0, 6.5, 5.5, 0, 0, TAU);
  ctx.fill();
  ctx.beginPath();
  ctx.ellipse(1, -5, 2.4, 3.4, -0.5, 0, TAU);
  ctx.fill();
  ctx.fillStyle = C.paper;
  ctx.globalAlpha = 0.85;
  ctx.beginPath();
  ctx.arc(3.5, -1.5, 1.4, 0, TAU);
  ctx.fill();
  ctx.globalAlpha = 1;
  ctx.restore();
}

function drawTail(ctx, r, t) {
  const y0 = -40 + r.bodyY;
  const w = Math.sin(t * 9) * 6;
  ctx.strokeStyle = C.ink;
  ctx.lineWidth = 2.6;
  ctx.beginPath();
  ctx.moveTo(-12, y0);
  ctx.bezierCurveTo(-30, y0 + 6, -36, y0 - 16 + w, -46, y0 - 20 + w);
  ctx.quadraticCurveTo(-56, y0 - 24 + w, -54, y0 - 34 + w * 1.4);
  ctx.stroke();
}

function drawBody(ctx) {
  // Round, pear-shaped 1928 torso: narrow chest, full belly.
  ctx.fillStyle = C.ink;
  ctx.beginPath();
  ctx.moveTo(0, -92);
  ctx.bezierCurveTo(16, -92, 22, -72, 21, -56);
  ctx.bezierCurveTo(21, -46, 14, -40, 0, -40);
  ctx.bezierCurveTo(-14, -40, -21, -46, -21, -56);
  ctx.bezierCurveTo(-22, -72, -16, -92, 0, -92);
  ctx.fill();

  // Short pants with two big oval buttons on the front.
  ctx.fillStyle = C.charcoal;
  ctx.strokeStyle = C.ink;
  ctx.lineWidth = 3;
  ctx.beginPath();
  ctx.moveTo(-21, -58);
  ctx.bezierCurveTo(-10, -63, 10, -63, 21, -58);
  ctx.bezierCurveTo(25, -46, 22, -36, 16, -34);
  ctx.quadraticCurveTo(8, -37, 2, -36);
  ctx.quadraticCurveTo(-6, -37, -15, -34);
  ctx.bezierCurveTo(-22, -36, -25, -46, -21, -58);
  ctx.closePath();
  ctx.fill();
  ctx.stroke();
  // Leg-hole crease.
  ctx.lineWidth = 2;
  ctx.beginPath();
  ctx.moveTo(2, -36);
  ctx.lineTo(2, -42);
  ctx.stroke();

  ctx.fillStyle = C.paper;
  ctx.lineWidth = 1.8;
  for (const [bx, by] of [[6, -51], [15, -50]]) {
    ctx.beginPath();
    ctx.ellipse(bx, by, 3.4, 4.8, 0.12, 0, TAU);
    ctx.fill();
    ctx.stroke();
  }
}

function pieEye(ctx, x, y, rx, ry, look) {
  ctx.fillStyle = C.ink;
  ctx.beginPath();
  ctx.ellipse(x, y, rx, ry, 0, 0, TAU);
  ctx.fill();
  // The pie cut: a wedge of white sliced from the upper side of the pupil.
  ctx.fillStyle = C.paper;
  ctx.beginPath();
  ctx.moveTo(x + look * 0.6, y - ry * 0.05);
  ctx.ellipse(x, y, rx, ry, 0, -1.95 + look * 0.25, -1.2 + look * 0.25);
  ctx.closePath();
  ctx.fill();
}

function drawHead(ctx, s, pose, t) {
  const whistle = s.whistle ?? 0;
  const hurt = pose === "hurt" || pose === "caught";

  ctx.fillStyle = C.ink;
  // Big round ears set toward the back of the head.
  ctx.beginPath();
  ctx.arc(-18, -24, 16, 0, TAU);
  ctx.fill();
  ctx.beginPath();
  ctx.arc(11, -31, 16, 0, TAU);
  ctx.fill();
  // Cranium.
  ctx.beginPath();
  ctx.arc(0, 0, 25, 0, TAU);
  ctx.fill();

  // Face mask: stroke first, then fill, so only the outer outline shows.
  const mask = new Path2D();
  mask.moveTo(-6, 18);
  mask.bezierCurveTo(-12, 12, -12, 2, -7, -3);    // full back cheek
  mask.bezierCurveTo(-5, -14, 1, -22, 6, -20);    // up over the near eye
  mask.bezierCurveTo(9, -19, 10, -16, 10.5, -12);
  mask.bezierCurveTo(12, -19, 16, -22, 20, -20);  // widow's peak, over the far eye
  mask.bezierCurveTo(24, -18, 25, -12, 25, -8);
  mask.bezierCurveTo(30, -6, 38, -7, 44, -10);    // snout bridge rising to the nose
  mask.bezierCurveTo(52, -6, 52, 6, 45, 8);       // round snout tip
  mask.bezierCurveTo(40, 10, 35, 11, 32, 13);     // upper lip
  mask.bezierCurveTo(31, 24, 14, 29, 2, 25);      // chin
  mask.bezierCurveTo(-2, 23, -5, 21, -6, 18);
  mask.closePath();
  ctx.strokeStyle = C.ink;
  ctx.lineWidth = 4;
  ctx.stroke(mask);
  ctx.fillStyle = C.paper;
  ctx.fill(mask);

  // Eyes: tall ovals with the 1928 pie cut.
  if (hurt) {
    ctx.strokeStyle = C.ink;
    ctx.lineWidth = 2.2;
    for (const [ex, ey] of [[4.5, -8], [16.5, -8]]) {
      ctx.beginPath();
      ctx.ellipse(ex, ey, 4.2, 8, 0, 0, TAU);
      ctx.stroke();
      ctx.fillStyle = C.ink;
      ctx.beginPath();
      ctx.arc(ex + 1, ey + 1.5, 2, 0, TAU);
      ctx.fill();
    }
  } else {
    const blink = ((t * 0.7 + 1.3) % 3.1) < 0.09;
    if (blink) {
      ctx.strokeStyle = C.ink;
      ctx.lineWidth = 2.4;
      ctx.beginPath();
      ctx.moveTo(1, -6); ctx.quadraticCurveTo(4.5, -3, 8, -6);
      ctx.moveTo(13, -6); ctx.quadraticCurveTo(16.5, -3, 20, -6);
      ctx.stroke();
    } else {
      pieEye(ctx, 4.5, -8.5, 4.6, 9, 1);
      pieEye(ctx, 16.5, -8.5, 4.2, 8.6, 1);
    }
  }

  // Mouth.
  ctx.strokeStyle = C.ink;
  ctx.fillStyle = C.ink;
  ctx.lineWidth = 2.6;
  if (whistle > 0) {
    // Puckered whistle with a puffed cheek.
    ctx.beginPath();
    ctx.ellipse(38, 12, 3.6, 3, 0, 0, TAU);
    ctx.fill();
    ctx.beginPath();
    ctx.arc(24, 12, 7, 0.4, 2.2);
    ctx.stroke();
  } else if (hurt) {
    ctx.beginPath();
    ctx.ellipse(31, 14, 6, 5.5, 0, 0, TAU);
    ctx.fill();
  } else if (pose === "jump" || pose === "dance") {
    // Big open grin with a tongue.
    ctx.beginPath();
    ctx.moveTo(44, 9);
    ctx.bezierCurveTo(39, 25, 17, 27, 9, 8);
    ctx.bezierCurveTo(19, 13, 32, 12, 42, 7);
    ctx.fill();
    ctx.fillStyle = C.slate;
    ctx.beginPath();
    ctx.ellipse(25, 18.5, 6, 2.6, -0.1, 0, TAU);
    ctx.fill();
  } else {
    // Long, easy smile curling up into the cheek.
    ctx.beginPath();
    ctx.moveTo(44, 9);
    ctx.bezierCurveTo(36, 17, 20, 17, 10, 9);
    ctx.moveTo(12, 13);
    ctx.quadraticCurveTo(8, 9, 10, 4);
    ctx.stroke();
  }

  // Big bulb nose on the end of the snout.
  ctx.fillStyle = C.ink;
  ctx.beginPath();
  ctx.ellipse(49, -7, 9.5, 7, -0.3, 0, TAU);
  ctx.fill();
  ctx.fillStyle = C.paper;
  ctx.beginPath();
  ctx.ellipse(47, -10.5, 2.8, 1.6, -0.3, 0, TAU);
  ctx.fill();
}
