// The River: harbor docks, barrels, rafts and the Captain's steamboat.
import { drawBackground, drawForeground } from "../scenery.js";

export default {
  id: "river",
  name: "The River",
  decoKinds: ["lamp", "lifering", "coil"],
  perch: "gull",
  fall: { fx: "splash", text: "SPLASH!" },
  chaser: "steamboat",
  drawBackground,
  drawForeground,
};
