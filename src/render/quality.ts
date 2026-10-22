/** Graphics quality switches. Turn these off on slow devices (or add ?fx=low to the URL to test). */
const low = typeof location !== 'undefined' && new URLSearchParams(location.search).get('fx') === 'low';

export const gfx = {
  /** additive glow sprites behind towers, enemies, projectiles and effects */
  glow: !low,
  /** soft bloom: the bright layer is blurred (by scaling down) and added back */
  bloom: !low,
};
