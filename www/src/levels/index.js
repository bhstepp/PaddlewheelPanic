// Every playable level, by id ("zone-level").
import l11 from "./1-1.js";
import l12 from "./1-2.js";

export const LEVELS = {
  "1-1": l11,
  "1-2": l12,
};

export function levelDef(id) {
  return LEVELS[id] ?? null;
}
