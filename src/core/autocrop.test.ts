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

describe('autoCropSquare', () => {
  it('center-crops when there is no product to find', () => {
    expect(autoCropSquare(image(120, 80, WHITE))).toEqual(centerSquare(120, 80));
    expect(centerSquare(120, 80)).toEqual({ x: 20, y: 0, size: 80 });
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
    const sq = autoCropSquare(image(160, 120, WHITE, [{ x: 4, y: 40, w: 50, h: 50, color: RED }]));
    expect(sq.x).toBeGreaterThanOrEqual(0);
    expect(sq.y).toBeGreaterThanOrEqual(0);
    expect(sq.x + sq.size).toBeLessThanOrEqual(160);
    expect(sq.y + sq.size).toBeLessThanOrEqual(120);
    expect(sq.x).toBeLessThanOrEqual(4);
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
    expect(autoCropSquare(img)).toEqual(centerSquare(100, 100));
  });

  it('handles empty or short input without throwing', () => {
    expect(autoCropSquare({ data: [], width: 0, height: 0 })).toEqual({ x: 0, y: 0, size: 0 });
    expect(autoCropSquare({ data: [1, 2, 3, 4], width: 10, height: 10 })).toEqual(centerSquare(10, 10));
  });
});
