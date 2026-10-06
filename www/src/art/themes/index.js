// Scenery and prop styles per zone.
import river from "./river.js";

const THEMES = { river };

export function getTheme(id) {
  return THEMES[id] ?? river;
}
