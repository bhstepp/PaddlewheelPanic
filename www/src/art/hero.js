// The hero: the 1928 riverboat deckhand mouse, drawn entirely with vector paths.
// Only the 1928 public-domain design is used: tall pilot's cap, pie-cut eyes,
// short upturned snout, light shorts and shoes,
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
  hose(ctx, hip, { x: foot.x, y: foot.y - 7 }, knee, 5);
  // Big, rounded light shoe with a dark outline and an ankle cuff.
  ctx.save();
  ctx.translate(foot.x + 7, foot.y - 7);
  ctx.fillStyle = C.paper;
  ctx.strokeStyle = C.ink;
  ctx.lineWidth = 3;
  const shoe = new Path2D();
  shoe.moveTo(-12, 6);
  shoe.bezierCurveTo(-16, -4, -6, -10, 2, -9);
  shoe.bezierCurveTo(14, -10, 22, -3, 20, 3);
  shoe.bezierCurveTo(19, 8, 8, 8, -12, 6);
  shoe.closePath();
  ctx.fill(shoe);
  // Shaded sole and toe.
  ctx.save();
  ctx.clip(shoe);
  ctx.fillStyle = C.silver;
  ctx.beginPath();
  ctx.ellipse(6, 7, 20, 5, 0, 0, TAU);
  ctx.fill();
  ctx.restore();
  ctx.stroke(shoe);
  ctx.lineWidth = 2;
  ctx.beginPath();
  ctx.ellipse(-6, -7, 5.5, 2.4, -0.1, 0, TAU);
  ctx.fillStyle = C.paper;
  ctx.fill();
  ctx.stroke();
  ctx.restore();
}

function drawArm(ctx, shoulder, hand, elbow) {
  hose(ctx, shoulder, hand, elbow, 4.5);
  // Big bare black mitten hand with a thumb, 1928 style (no gloves).
  const ang = Math.atan2(hand.y - shoulder.y, hand.x - shoulder.x);
  ctx.save();
  ctx.translate(hand.x, hand.y);
  ctx.rotate(ang);
  ctx.fillStyle = C.ink;
  ctx.beginPath();
  ctx.ellipse(4, 0, 9, 7.5, 0, 0, TAU);
  ctx.fill();
  ctx.beginPath();
  ctx.ellipse(1, -7, 3.2, 4.4, -0.5, 0, TAU);
  ctx.fill();
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
  // Pear-shaped torso: narrow chest, full belly.
  ctx.fillStyle = C.ink;
  ctx.beginPath();
  ctx.moveTo(0, -94);
  ctx.bezierCurveTo(14, -94, 20, -76, 20, -62);
  ctx.lineTo(-20, -62);
  ctx.bezierCurveTo(-20, -76, -14, -94, 0, -94);
  ctx.fill();

  // Big, rounded light shorts with two oval buttons on the front.
  ctx.fillStyle = C.paper;
  ctx.strokeStyle = C.ink;
  ctx.lineWidth = 3;
  const shorts = new Path2D();
  shorts.moveTo(-20, -64);
  shorts.bezierCurveTo(-8, -68, 10, -68, 21, -64);
  shorts.bezierCurveTo(28, -52, 26, -38, 19, -34);
  shorts.quadraticCurveTo(10, -36, 3, -34);
  shorts.quadraticCurveTo(-6, -36, -16, -34);
  shorts.bezierCurveTo(-25, -38, -28, -52, -20, -64);
  shorts.closePath();
  ctx.fill(shorts);
  // Soft shading on the far side.
  ctx.save();
  ctx.clip(shorts);
  ctx.fillStyle = C.silver;
  ctx.beginPath();
  ctx.ellipse(-18, -46, 8, 16, 0.2, 0, TAU);
  ctx.fill();
  ctx.restore();
  ctx.stroke(shorts);
  // Crease between the legs.
  ctx.lineWidth = 2;
  ctx.beginPath();
  ctx.moveTo(3, -34);
  ctx.quadraticCurveTo(2, -40, 3, -44);
  ctx.stroke();

  ctx.fillStyle = C.paper;
  ctx.lineWidth = 2;
  for (const [bx, by] of [[4, -53], [16, -52]]) {
    ctx.beginPath();
    ctx.ellipse(bx, by, 4.2, 5.4, 0.1, 0, TAU);
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
  // Big round ears set on the back of the head.
  ctx.beginPath();
  ctx.arc(-27, -8, 15.5, 0, TAU);
  ctx.fill();
  ctx.beginPath();
  ctx.arc(-7, -31, 15.5, 0, TAU);
  ctx.fill();
  // Cranium.
  ctx.beginPath();
  ctx.arc(0, 0, 25, 0, TAU);
  ctx.fill();

  // Face mask: stroke first, then fill, so only the outer outline shows.
  const mask = new Path2D();
  mask.moveTo(-4, 16);
  mask.bezierCurveTo(-10, 10, -9, 0, -4, -5);     // back of the cheek
  mask.bezierCurveTo(-2, -16, 6, -23, 10, -17);   // over the near eye
  mask.bezierCurveTo(13, -23, 21, -24, 23, -16);  // over the far eye
  mask.bezierCurveTo(25, -12, 28, -12, 31, -14);  // bridge, snout angled upward
  mask.bezierCurveTo(34, -17, 37, -20, 41, -21);  // top of the short snout
  mask.bezierCurveTo(49, -21, 50, -8, 42, -6);    // round snout tip
  mask.bezierCurveTo(38, -5, 37, -2, 37, 1);      // under the nose
  mask.bezierCurveTo(37, 16, 26, 26, 12, 25);     // jaw and chin
  mask.bezierCurveTo(4, 24, -1, 21, -4, 16);
  mask.closePath();
  ctx.strokeStyle = C.ink;
  ctx.lineWidth = 4;
  ctx.stroke(mask);
  ctx.fillStyle = C.paper;
  ctx.fill(mask);

  // Eyes: tall ovals with the 1928 pie cut, set high and close together.
  if (hurt) {
    ctx.strokeStyle = C.ink;
    ctx.lineWidth = 2.2;
    for (const [ex, ey] of [[8, -10], [19, -11]]) {
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
      ctx.moveTo(4, -8); ctx.quadraticCurveTo(8, -5, 12, -8);
      ctx.moveTo(15.5, -9); ctx.quadraticCurveTo(19, -6, 22.5, -9);
      ctx.stroke();
    } else {
      pieEye(ctx, 8, -10, 4.4, 8.8, 1);
      pieEye(ctx, 19, -11, 4, 8.4, 1);
    }
  }

  // Mouth.
  ctx.strokeStyle = C.ink;
  ctx.fillStyle = C.ink;
  ctx.lineWidth = 2.6;
  if (whistle > 0) {
    // Puckered whistle with a puffed cheek.
    ctx.beginPath();
    ctx.ellipse(36, 6, 3.8, 3.2, 0, 0, TAU);
    ctx.fill();
    ctx.beginPath();
    ctx.arc(22, 8, 7, 0.3, 2.2);
    ctx.stroke();
  } else if (hurt) {
    ctx.beginPath();
    ctx.ellipse(31, 10, 6, 6.5, 0, 0, TAU);
    ctx.fill();
  } else if (pose === "stand") {
    // Wide smile curling into a round cheek.
    ctx.beginPath();
    ctx.moveTo(38, 1);
    ctx.bezierCurveTo(36, 14, 20, 16, 11, 7);
    ctx.stroke();
    ctx.beginPath();
    ctx.arc(9, 4, 6, 0.6, 3.6);
    ctx.stroke();
  } else {
    // Big open grin with a tongue, as in the 1928 film.
    ctx.beginPath();
    ctx.moveTo(38, 1);
    ctx.bezierCurveTo(37, 22, 18, 26, 11, 7);
    ctx.bezierCurveTo(20, 10, 31, 8, 38, 1);
    ctx.fill();
    ctx.fillStyle = C.silver;
    ctx.beginPath();
    ctx.ellipse(25, 16.5, 7, 3.2, -0.15, 0, TAU);
    ctx.fill();
    ctx.beginPath();
    ctx.arc(9, 4, 6, 0.6, 3.6);
    ctx.stroke();
  }

  // Big oval nose on the end of the snout.
  ctx.fillStyle = C.ink;
  ctx.beginPath();
  ctx.ellipse(44, -16, 9.5, 7.5, -0.45, 0, TAU);
  ctx.fill();
  ctx.fillStyle = C.paper;
  ctx.beginPath();
  ctx.ellipse(42, -19.5, 2.8, 1.6, -0.45, 0, TAU);
  ctx.fill();

  // Tall pilot's cap, tipped back on the head.
  ctx.save();
  ctx.translate(-2, -22);
  ctx.rotate(-0.38);
  ctx.strokeStyle = C.ink;
  ctx.lineWidth = 3;
  ctx.fillStyle = C.paper;
  const cap = new Path2D();
  cap.moveTo(-11, 0);
  cap.lineTo(-10, -34);
  cap.quadraticCurveTo(0, -38, 10, -34);
  cap.lineTo(11, 0);
  cap.closePath();
  ctx.fill(cap);
  ctx.save();
  ctx.clip(cap);
  ctx.fillStyle = C.silver;
  ctx.fillRect(4, -40, 10, 42);
  ctx.restore();
  ctx.stroke(cap);
  // Dark crown on top and a dark band with a short brim.
  ctx.fillStyle = C.ink;
  ctx.beginPath();
  ctx.ellipse(0, -35, 11.5, 5, 0, 0, TAU);
  ctx.fill();
  ctx.beginPath();
  ctx.ellipse(0, 0, 13, 4.5, 0, 0, TAU);
  ctx.fill();
  ctx.beginPath();
  ctx.ellipse(12, 1, 8, 3, 0.15, 0, TAU);
  ctx.fill();
  ctx.restore();
}
