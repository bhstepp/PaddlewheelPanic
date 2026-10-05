// Every tunable number lives here.
export const CONFIG = {
  // Logical resolution; all game coordinates use this space.
  width: 1280,
  height: 720,
  dprCap: 3,

  // Fixed physics step and loop safety.
  step: 1 / 120,
  maxFrame: 0.1,

  // World geometry.
  waterY: 600,          // river surface
  drownDepth: 40,       // how far below the surface before the splash triggers
  cameraLead: 1 / 3,    // hero sits one third from the left edge

  // Hero running.
  runSpeedStart: 240,
  runSpeedMid: 285,     // reached at dashAt
  runSpeedDash: 330,    // final dash top speed
  dashAt: 0.7,          // fraction of the leg where the final dash begins
  heroHalfWidth: 16,
  heroHeight: 82,
  heroScale: 0.9,

  // Jumping.
  gravity: 2400,
  jumpVelocity: 700,
  jumpHoldMax: 0.25,    // seconds of extra lift while holding
  jumpHoldGravity: 0.35,// gravity multiplier while holding
  maxFallSpeed: 1400,
  coyoteTime: 0.1,
  jumpBuffer: 0.12,

  // Input.
  swipeMinPx: 60,
  swipeMaxMs: 250,
  tapCommitMs: 65,      // a touch becomes a jump after this long unless it looks like a swipe
  swipeSuspectPx: 16,

  // Whistle and critters.
  whistleCooldown: 1.5,
  whistleRangeAhead: 430,
  whistleRangeBehind: 80,
  critterStun: 2,
  critterBounceVelocity: 980,
  critterRadius: 19,

  // Captain meter (percent).
  meterStart: 20,
  meterDrainPerSec: 1.2,
  meterHit: 25,
  meterFall: 35,
  invulnerableTime: 1.3,
  splashTime: 0.9,

  // Steamboat placement (screen x of the bow).
  boatBowMin: 170,
  boatBowMax: 470,

  // Music and beat bonus.
  bpm: 120,
  beatWindow: 0.09,

  // Film effects, toggle for performance testing.
  film: {
    grain: true,
    scratches: true,
    flicker: true,
    vignette: true,
  },
};
