import { describe, expect, it } from 'vitest';
import { autoCropSquare, centerSquare, type Pixels } from './autocrop';

type Rgb = [number, number, number];
interface Box { x: number; y: number; w: number; h: number; color: Rgb }

/** A flat background with solid rectangles painted on it. */
function image(width: number, height: number, bg: Rgb, boxes: Box[] = []): Pixels {
  const data = new Uint8ClampedArray(width * height * 4);
  for (let y = 0; y < height; y++) {
    for (let x = 0; x < width; x++) {
      const box = boxes.find((b) => x >= b.x && x < b.x + b.w && y >= b.y && y < b.y + b.h);
      const [r, g, b] = box ? box.color : bg;
      data.set([r, g, b, 255], (y * width + x) * 4);
    }
  }
  return { data, width, height };
}

const WHITE: Rgb = [235, 232, 225];
const RED: Rgb = [200, 40, 40];
const BLUE: Rgb = [30, 60, 190];

/** Deterministic pseudo-random noise in [-1, 1]. */
function noise(x: number, y: number): number {
  const v = Math.sin(x * 12.9898 + y * 78.233) * 43758.5453;
  return (v - Math.floor(v)) * 2 - 1;
}

/** Wooden table with grain, uneven lighting and sensor noise; a printed product (red box, white label) on it. */
function woodenTable(width: number, height: number, product: { x: number; y: number; w: number; h: number }): Pixels {
  const data = new Uint8ClampedArray(width * height * 4);
  for (let y = 0; y < height; y++) {
    for (let x = 0; x < width; x++) {
      const inside = x >= product.x && x < product.x + product.w && y >= product.y && y < product.y + product.h;
      const label = inside && x > product.x + product.w * 0.2 && x < product.x + product.w * 0.8 && y > product.y + product.h * 0.35 && y < product.y + product.h * 0.6;
      let rgb: Rgb;
      if (label) rgb = [240, 238, 230];
      else if (inside) rgb = [190, 45, 50];
      else {
        const grain = Math.sin(y * 0.9 + Math.sin(x * 0.15) * 2) * 22 + Math.sin(y * 2.3) * 8;
        const light = (x / width - 0.5) * 50; // brighter on one side
        rgb = [150 + grain + light, 104 + grain * 0.8 + light * 0.8, 62 + grain * 0.5 + light * 0.5];
      }
      const n = noise(x, y) * 10;
      data.set([rgb[0] + n, rgb[1] + n, rgb[2] + n, 255], (y * width + x) * 4);
    }
  }
  return { data, width, height };
}

describe('autoCropSquare', () => {
  it('finds a product on a wooden table with grain', () => {
    const product = { x: 38, y: 20, w: 28, h: 55 };
    const sq = autoCropSquare(woodenTable(128, 96, product));
    expect(sq.size).toBeLessThan(88); // clearly tighter than the 96px short side
    expect(sq.size).toBeGreaterThanOrEqual(55);
    expect(sq.x).toBeLessThanOrEqual(product.x);
    expect(sq.x + sq.size).toBeGreaterThanOrEqual(product.x + product.w);
    expect(sq.y).toBeLessThanOrEqual(product.y);
    expect(sq.y + sq.size).toBeGreaterThanOrEqual(product.y + product.h);
  });

  it('center-crops when there is no product to find', () => {
    const fallback = centerSquare(120, 80, 0.85);
    expect(autoCropSquare(image(120, 80, WHITE))).toEqual(fallback);
    expect(fallback).toEqual({ x: 26, y: 6, size: 68 });
  });

  it('crops around a product in the middle of a wider photo', () => {
    const sq = autoCropSquare(image(160, 120, WHITE, [{ x: 60, y: 30, w: 30, h: 60, color: RED }]));
    expect(sq.size).toBeLessThan(120);
    expect(sq.size).toBeGreaterThanOrEqual(60);
    // Contains the whole product, not just a part of it.
    expect(sq.x).toBeLessThanOrEqual(60);
    expect(sq.x + sq.size).toBeGreaterThanOrEqual(90);
    expect(sq.y).toBeLessThanOrEqual(30);
    expect(sq.y + sq.size).toBeGreaterThanOrEqual(90);
  });

  it('stays inside the photo when the product is near an edge', () => {
    const sq = autoCropSquare(image(160, 120, WHITE, [{ x: 9, y: 40, w: 50, h: 50, color: RED }]));
    expect(sq.x).toBeGreaterThanOrEqual(0);
    expect(sq.y).toBeGreaterThanOrEqual(0);
    expect(sq.x + sq.size).toBeLessThanOrEqual(160);
    expect(sq.y + sq.size).toBeLessThanOrEqual(120);
    expect(sq.x).toBeLessThanOrEqual(9);
  });

  it('works on a dark background too', () => {
    const sq = autoCropSquare(image(100, 100, [20, 20, 25], [{ x: 35, y: 35, w: 30, h: 30, color: [240, 220, 60] }]));
    expect(sq.size).toBeLessThan(60);
    expect(sq.x).toBeLessThanOrEqual(35);
    expect(sq.x + sq.size).toBeGreaterThanOrEqual(65);
  });

  it('ignores a small stray object at the edge', () => {
    const sq = autoCropSquare(image(160, 120, WHITE, [
      { x: 60, y: 30, w: 40, h: 60, color: RED },
      { x: 150, y: 10, w: 10, h: 12, color: BLUE },
    ]));
    expect(sq.x + sq.size).toBeLessThan(150);
  });

  it('prefers the product near the center over a bigger object at the edge', () => {
    const sq = autoCropSquare(image(200, 120, WHITE, [
      { x: 85, y: 35, w: 30, h: 50, color: RED },
      { x: 150, y: 0, w: 50, h: 70, color: BLUE },
    ]));
    expect(sq.x + sq.size).toBeLessThan(150);
  });

  it('falls back to a center crop when the product only covers a speck', () => {
    const img = image(100, 100, WHITE, [{ x: 10, y: 10, w: 3, h: 3, color: RED }]);
    expect(autoCropSquare(img)).toEqual(centerSquare(100, 100, 0.85));
  });

  it('handles empty or short input without throwing', () => {
    expect(autoCropSquare({ data: [], width: 0, height: 0 })).toEqual({ x: 0, y: 0, size: 0 });
    expect(autoCropSquare({ data: [1, 2, 3, 4], width: 10, height: 10 })).toEqual(centerSquare(10, 10, 0.85));
  });
});
