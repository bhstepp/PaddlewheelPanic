// Every playable level, by id ("zone-level").
import l11 from "./1-1.js";
import l12 from "./1-2.js";
import l13 from "./1-3.js";
import l21 from "./2-1.js";
import l22 from "./2-2.js";
import l23 from "./2-3.js";
import l31 from "./3-1.js";
import l32 from "./3-2.js";
import l33 from "./3-3.js";
import l41 from "./4-1.js";
import l42 from "./4-2.js";
import l43 from "./4-3.js";
import l51 from "./5-1.js";
import l52 from "./5-2.js";
import l53 from "./5-3.js";

export const LEVELS = {
  "1-1": l11,
  "1-2": l12,
  "1-3": l13,
  "2-1": l21,
  "2-2": l22,
  "2-3": l23,
  "3-1": l31,
  "3-2": l32,
  "3-3": l33,
  "4-1": l41,
  "4-2": l42,
  "4-3": l43,
  "5-1": l51,
  "5-2": l52,
  "5-3": l53,
};

export function levelDef(id) {
  return LEVELS[id] ?? null;
}
