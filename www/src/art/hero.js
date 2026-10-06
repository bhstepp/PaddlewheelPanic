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
  if (s.reach) {
    // Rubber-hose arm stretched all the way up to the hook (reach is the
    // hook's offset from the feet in world units).
    const sx = scale / Math.sqrt(sq);
    const sy = scale * sq;
    const hx = s.reach.dx / sx;
    const hy = s.reach.dy / sy + 12;
    rig.handF = { x: hx, y: hy };
    rig.elbowF = { x: -6, y: 0 };
    rig.handB = { x: hx - 10, y: hy + 6 };
    rig.elbowB = { x: -10, y: 0 };
  }

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

  // Longer legs: everything above the hips is lifted by LEG.
  const LEG = 12;
  const up = (fn) => {
    ctx.save();
    ctx.translate(0, -LEG);
    fn();
    ctx.restore();
  };
  const hipF = { x: rig.hipF.x, y: rig.hipF.y - LEG };
  const hipB = { x: rig.hipB.x, y: rig.hipB.y - LEG };

  // Back limbs first.
  drawLeg(ctx, hipB, rig.footB, rig.kneeB);
  up(() => {
    drawArm(ctx, rig.shoulderB, rig.handB, rig.elbowB);
    drawTail(ctx, rig, t);
    ctx.save();
    ctx.translate(0, rig.bodyY);
    ctx.rotate(rig.lean);
    drawBody(ctx);
    ctx.restore();
  });

  drawLeg(ctx, hipF, rig.footF, rig.kneeF);

  // A raised front arm tucks behind the head so it never covers the face.
  const armUp = rig.handF.y < rig.shoulderF.y - 20;
  up(() => {
    if (armUp) drawArm(ctx, rig.shoulderF, rig.handF, rig.elbowF);
    ctx.save();
    ctx.translate(rig.head.x, rig.head.y);
    ctx.rotate(rig.headTilt);
    drawHead(ctx, s, pose, t);
    ctx.restore();
    if (!armUp) drawArm(ctx, rig.shoulderF, rig.handF, rig.elbowF);
  });

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
    // Each foot plants and slides back while it's on the ground (cos < 0),
    // then lifts and swings forward (cos > 0). Knees bow forward, never back.
    const leg = (a) => {
      const lift = Math.max(0, Math.cos(a));
      return { x: Math.sin(a) * 20 + 3, y: -lift * 16 };
    };
    const knee = (a) => ({ x: 6 + Math.max(0, Math.cos(a)) * 7, y: -2 });
    r.footF = leg(ph);
    r.footB = leg(ph + Math.PI);
    r.kneeF = knee(ph);
    r.kneeB = knee(ph + Math.PI);
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
  } else if (pose === "swing") {
    // Hanging from a hook: legs trail behind, body stretched.
    const w = Math.sin(t * 10) * 3;
    r.lean = -0.05;
    r.headTilt = -0.18;
    r.footF = { x: -6, y: 2 + w };
    r.kneeF = { x: -6, y: 0 };
    r.footB = { x: -22, y: -4 - w };
    r.kneeB = { x: -6, y: 0 };
    r.handF = { x: 20, y: -120 };
    r.elbowF = { x: 0, y: 0 };
    r.handB = { x: 4, y: -118 };
    r.elbowB = { x: -6, y: 0 };
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
  hose(ctx, hip, { x: foot.x, y: foot.y - 9 }, knee, 5);
  // Big, rounded light shoe with a dark outline and an ankle cuff.
  ctx.save();
  ctx.translate(foot.x + 7, foot.y - 8);
  ctx.scale(1.3, 1.3);
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
  // Big round ears: one at the back of the head, one on top behind the cap.
  ctx.beginPath();
  ctx.arc(-25, -9, 15.5, 0, TAU);
  ctx.fill();
  ctx.beginPath();
  ctx.arc(-6, -31, 15.5, 0, TAU);
  ctx.fill();
  // Cranium.
  ctx.beginPath();
  ctx.arc(0, 0, 26, 0, TAU);
  ctx.fill();

  // Face mask in 3/4 view. Construction: the head is one circle (r = 26);
  // the white face fills its front half and stays inside that circle, and
  // only the snout breaks the silhouette. Stroke first, then fill, so only
  // the outer edge is inked.
  const mask = new Path2D();
  mask.moveTo(2, 25);
  mask.bezierCurveTo(-6, 22, -10, 12, -7, 2);      // back edge of the face
  mask.bezierCurveTo(-5, -10, 0, -20, 8, -22);     // up over the near eye
  mask.bezierCurveTo(12, -23, 14, -20, 15, -18);   // dip between the eyes
  mask.bezierCurveTo(17, -24, 23, -24, 24, -16);   // over the far eye
  mask.bezierCurveTo(30, -13, 36, -13, 42, -15);   // short snout, tilted up
  mask.bezierCurveTo(50, -17, 52, -8, 45, -6);     // round tip under the nose
  mask.bezierCurveTo(40, -5, 36, -3, 34, -1);      // underside of the snout
  mask.bezierCurveTo(30, 10, 22, 19, 13, 23);      // jaw, following the head circle
  mask.bezierCurveTo(9, 25, 5, 25, 2, 25);         // chin
  mask.closePath();
  ctx.strokeStyle = C.ink;
  ctx.lineWidth = 4;
  ctx.stroke(mask);
  ctx.fillStyle = C.paper;
  ctx.fill(mask);

  // Eyes: tall ovals set high and close, with a small pie-cut notch.
  if (hurt) {
    ctx.strokeStyle = C.ink;
    ctx.lineWidth = 2.2;
    for (const [ex, ey, rx, ry] of [[9, -10, 4.6, 9], [19.5, -11, 4.2, 8.6]]) {
      ctx.beginPath();
      ctx.ellipse(ex, ey, rx, ry, 0, 0, TAU);
      ctx.stroke();
      ctx.fillStyle = C.ink;
      ctx.beginPath();
      ctx.arc(ex + 1, ey + 2, 2.1, 0, TAU);
      ctx.fill();
    }
  } else {
    const blink = ((t * 0.7 + 1.3) % 3.1) < 0.09;
    if (blink) {
      ctx.strokeStyle = C.ink;
      ctx.lineWidth = 2.6;
      ctx.beginPath();
      ctx.moveTo(5, -8); ctx.quadraticCurveTo(9, -4, 13, -8);
      ctx.moveTo(16, -9); ctx.quadraticCurveTo(19.5, -5, 23, -9);
      ctx.stroke();
    } else {
      pieEye(ctx, 9, -10, 4.6, 9, 1);
      pieEye(ctx, 19.5, -11, 4.2, 8.6, 1);
    }
  }

  // Mouth and cheek.
  ctx.strokeStyle = C.ink;
  ctx.fillStyle = C.ink;
  ctx.lineWidth = 2.8;
  // The smile ends in a short upturned hook at the back corner of the mouth,
  // which suggests the round cheek.
  const cheek = () => {
    ctx.beginPath();
    ctx.moveTo(11.5, 10);
    ctx.quadraticCurveTo(7, 9, 7.5, 4);
    ctx.stroke();
  };
  if (whistle > 0) {
    // Puckered lips under the snout and a puffed-out cheek.
    ctx.beginPath();
    ctx.ellipse(35, 3, 4, 3.4, 0, 0, TAU);
    ctx.fill();
    ctx.beginPath();
    ctx.arc(14, 8, 8, 0.2, 2.4);
    ctx.stroke();
  } else if (hurt) {
    ctx.beginPath();
    ctx.ellipse(25, 11, 6, 7, 0, 0, TAU);
    ctx.fill();
  } else if (pose === "stand") {
    // Closed, easy smile.
    ctx.beginPath();
    ctx.moveTo(35, -1);
    ctx.bezierCurveTo(31, 11, 19, 14, 11.5, 10);
    ctx.stroke();
    cheek();
  } else {
    // The big open grin from the 1928 film: deep mouth with a tongue.
    const mouth = new Path2D();
    mouth.moveTo(35, -1);
    mouth.bezierCurveTo(35, 14, 27, 22, 19, 21);
    mouth.bezierCurveTo(13, 20, 11, 14, 11.5, 10);
    mouth.bezierCurveTo(20, 10, 30, 6, 35, -1);
    mouth.closePath();
    ctx.fill(mouth);
    ctx.save();
    ctx.clip(mouth);
    ctx.fillStyle = C.ash;
    ctx.beginPath();
    ctx.ellipse(22, 19, 7.5, 4.2, -0.2, 0, TAU);
    ctx.fill();
    ctx.strokeStyle = C.ink;
    ctx.lineWidth = 1.2;
    ctx.beginPath();
    ctx.moveTo(22, 16);
    ctx.lineTo(23, 20);
    ctx.stroke();
    ctx.restore();
    ctx.lineWidth = 2.6;
    ctx.stroke(mouth);
    cheek();
  }

  // Big horizontal oval nose on the end of the snout.
  ctx.fillStyle = C.ink;
  ctx.beginPath();
  ctx.ellipse(47, -13, 8.5, 6.5, -0.15, 0, TAU);
  ctx.fill();
  ctx.fillStyle = C.paper;
  ctx.beginPath();
  ctx.ellipse(44.5, -16, 2.6, 1.4, -0.15, 0, TAU);
  ctx.fill();

  // Tall white pilot's cap tipped back, with a dark crown and short brim.
  ctx.save();
  ctx.translate(-4, -23);
  ctx.rotate(-0.32);
  ctx.strokeStyle = C.ink;
  ctx.lineWidth = 3;
  const cap = new Path2D();
  cap.moveTo(-12, 0);
  cap.lineTo(-10, -36);
  cap.quadraticCurveTo(1, -40, 11, -36);
  cap.lineTo(12, 0);
  cap.closePath();
  ctx.fillStyle = C.paper;
  ctx.fill(cap);
  ctx.save();
  ctx.clip(cap);
  ctx.fillStyle = C.silver;
  ctx.fillRect(5, -42, 10, 44);
  ctx.restore();
  ctx.stroke(cap);
  ctx.fillStyle = C.ink;
  ctx.beginPath();
  ctx.ellipse(0.5, -37, 12, 5.5, 0, 0, TAU);
  ctx.fill();
  ctx.beginPath();
  ctx.ellipse(0, -1, 13.5, 4.5, 0, 0, TAU);
  ctx.fill();
  ctx.beginPath();
  ctx.ellipse(13, 0, 9, 3.2, 0.15, 0, TAU);
  ctx.fill();
  ctx.restore();
}
