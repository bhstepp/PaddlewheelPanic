// The Captain's vehicle for each zone. Every chaser shares the same
// interface: reset(), toot(), update(dt, meter, time, beat), draw(ctx, g),
// plus .bow (screen x of its front) and .extra (surge when catching you).
import { Steamboat } from "./steamboat.js";

const KINDS = { steamboat: Steamboat };

export function createChaser(kind) {
  const K = KINDS[kind] ?? Steamboat;
  return new K();
}

export function registerChaser(kind, cls) {
  KINDS[kind] = cls;
}
