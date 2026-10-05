// The hero: the 1928 riverboat deckhand mouse, drawn entirely with vector paths.
// Only the 1928 public-domain design is used: pie-cut eyes, long snout,
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
    head: { x: 5, y: -90 },
    hipF: { x: 4, y: -36 },
    hipB: { x: -4, y: -36 },
    shoulderF: { x: 4, y: -64 },
    shoulderB: { x: -4, y: -64 },
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
  const sh = Math.sin(r.lean) * 28;
  r.shoulderF = { x: r.shoulderF.x + sh, y: r.shoulderF.y + r.bodyY };
  r.shoulderB = { x: r.shoulderB.x + sh, y: r.shoulderB.y + r.bodyY };
  r.head = { x: r.head.x + Math.sin(r.lean) * 52, y: r.head.y + r.bodyY };
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
  // Pear-shaped torso.
  ctx.fillStyle = C.ink;
  ctx.beginPath();
  ctx.moveTo(0, -78);
  ctx.bezierCurveTo(12, -78, 15, -58, 16, -46);
  ctx.lineTo(-16, -46);
  ctx.bezierCurveTo(-15, -58, -12, -78, 0, -78);
  ctx.fill();

  // Button shorts.
  ctx.fillStyle = C.charcoal;
  ctx.strokeStyle = C.ink;
  ctx.lineWidth = 3;
  ctx.beginPath();
  ctx.moveTo(-17, -50);
  ctx.bezierCurveTo(-8, -54, 8, -54, 17, -50);
  ctx.bezierCurveTo(21, -40, 18, -32, 12, -31);
  ctx.quadraticCurveTo(0, -33, -12, -31);
  ctx.bezierCurveTo(-18, -32, -21, -40, -17, -50);
  ctx.closePath();
  ctx.fill();
  ctx.stroke();

  // Two big buttons on the front.
  ctx.fillStyle = C.paper;
  ctx.strokeStyle = C.ink;
  ctx.lineWidth = 1.6;
  for (const [bx, by] of [[5, -44], [12.5, -43]]) {
    ctx.beginPath();
    ctx.ellipse(bx, by, 2.6, 3.6, 0.15, 0, TAU);
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
  // Ears: two round black discs.
  ctx.beginPath();
  ctx.arc(-13, -21, 12.5, 0, TAU);
  ctx.fill();
  ctx.beginPath();
  ctx.arc(9, -26, 12.5, 0, TAU);
  ctx.fill();
  // Cranium.
  ctx.beginPath();
  ctx.arc(0, 0, 20, 0, TAU);
  ctx.fill();

  // Face mask: stroke first, then fill, so only the outer outline shows.
  const mask = new Path2D();
  mask.moveTo(-5, 12);
  mask.bezierCurveTo(-7, 4, -4, -2, 0, -5);
  mask.bezierCurveTo(1, -13, 6, -17, 9, -11);   // over the near eye
  mask.bezierCurveTo(11, -17, 17, -17, 18, -10); // over the far eye
  mask.bezierCurveTo(20, -7, 24, -6, 30, -6);    // forehead to snout bridge
  mask.bezierCurveTo(36, -6, 39, -7, 41, -6);    // top of the long snout
  mask.bezierCurveTo(45, -1, 43, 4, 37, 4);      // snout tip under the nose
  mask.bezierCurveTo(30, 5, 28, 8, 26, 10);      // under the snout
  mask.bezierCurveTo(22, 16, 10, 18, 2, 16);     // chin and jaw
  mask.bezierCurveTo(-2, 15, -4, 14, -5, 12);
  mask.closePath();
  ctx.strokeStyle = C.ink;
  ctx.lineWidth = 3.5;
  ctx.stroke(mask);
  ctx.fillStyle = C.paper;
  ctx.fill(mask);

  // Eyes.
  if (hurt) {
    ctx.strokeStyle = C.ink;
    ctx.lineWidth = 2;
    for (const [ex, ey] of [[5, -6], [13.5, -6]]) {
      ctx.beginPath();
      ctx.ellipse(ex, ey, 3.4, 6.5, 0, 0, TAU);
      ctx.stroke();
      ctx.fillStyle = C.ink;
      ctx.beginPath();
      ctx.arc(ex + 0.8, ey + 1, 1.6, 0, TAU);
      ctx.fill();
    }
  } else {
    const blink = ((t * 0.7 + 1.3) % 3.1) < 0.09;
    if (blink) {
      ctx.strokeStyle = C.ink;
      ctx.lineWidth = 2.2;
      ctx.beginPath();
      ctx.moveTo(2, -5); ctx.quadraticCurveTo(5, -3, 8, -5);
      ctx.moveTo(11, -5); ctx.quadraticCurveTo(14, -3, 16.5, -5);
      ctx.stroke();
    } else {
      pieEye(ctx, 5, -6.5, 3.6, 7, 1);
      pieEye(ctx, 13.6, -6.5, 3.2, 6.6, 1);
    }
  }

  // Mouth.
  ctx.strokeStyle = C.ink;
  ctx.fillStyle = C.ink;
  ctx.lineWidth = 2.4;
  if (whistle > 0) {
    // Puckered whistle with a puffed cheek.
    ctx.beginPath();
    ctx.ellipse(33, 8.5, 3.2, 2.6, 0, 0, TAU);
    ctx.fill();
    ctx.beginPath();
    ctx.arc(22, 7, 6, 0.4, 2.2);
    ctx.stroke();
  } else if (hurt) {
    ctx.beginPath();
    ctx.ellipse(28, 9, 5, 4.5, 0, 0, TAU);
    ctx.fill();
  } else if (pose === "jump" || pose === "dance") {
    // Big open grin.
    ctx.beginPath();
    ctx.moveTo(37, 4.5);
    ctx.bezierCurveTo(33, 17, 20, 18, 12, 6);
    ctx.bezierCurveTo(20, 10, 30, 8, 37, 4.5);
    ctx.fill();
    ctx.fillStyle = C.slate;
    ctx.beginPath();
    ctx.ellipse(24, 12.5, 4.5, 2, -0.1, 0, TAU);
    ctx.fill();
  } else {
    // Long easy smile with a cheek dimple.
    ctx.beginPath();
    ctx.moveTo(37, 4.5);
    ctx.bezierCurveTo(32, 12, 20, 12, 13, 7);
    ctx.moveTo(14.5, 9.5);
    ctx.quadraticCurveTo(12, 6, 13.5, 3.5);
    ctx.stroke();
  }

  // Bulb nose at the end of the snout.
  ctx.fillStyle = C.ink;
  ctx.beginPath();
  ctx.ellipse(42.5, -5, 6.2, 4.6, -0.3, 0, TAU);
  ctx.fill();
  ctx.fillStyle = C.paper;
  ctx.beginPath();
  ctx.ellipse(41.5, -7.2, 1.8, 1.1, -0.3, 0, TAU);
  ctx.fill();
}
