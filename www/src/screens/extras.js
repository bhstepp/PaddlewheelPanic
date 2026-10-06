// Extra screens reached from the map (projection booth, daily matinee).
// Each entry: { open(), draw(ctx, t), tap(x, y), update(dt) }.
export function extraScreens(app) {
  const screens = {};
  return {
    open(id) {
      screens[id]?.open();
    },
    draw(id, ctx, t) {
      screens[id]?.draw(ctx, t);
    },
    tap(id, x, y) {
      return screens[id]?.tap(x, y) ?? true;
    },
    update(id, dt) {
      screens[id]?.update?.(dt);
    },
    register(id, s) {
      screens[id] = s;
    },
    app,
  };
}
