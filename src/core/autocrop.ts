// Auto-crop for product photos: finds the product in a (small) RGBA image and returns a square around it.
// Pure pixel math (no canvas), so it is unit-testable; src/ui/photo.ts feeds it a downscaled copy of the photo.
//
// Idea: whatever colors the frame border is made of (table, wood grain, shelf, wall) is "background". A pixel whose
// color barely occurs along the border is "product". The product is the largest such blob, preferring one near the
// center, so a stray hand or a neighbouring item at the edge does not pull the crop away. If nothing convincing
// is found the result is a mild center crop (products are usually framed in the middle).

export interface Pixels {
  /** RGBA bytes, row-major (like `ImageData.data`). */
  data: ArrayLike<number>;
  width: number;
  height: number;
}

export interface Square { x: number; y: number; size: number }

/** A color counts as background if at least this fraction of the border pixels has (nearly) that color. */
const MIN_BORDER_SHARE = 0.004;
/** The product must cover at least this fraction of the frame, otherwise it is probably noise. */
const MIN_AREA = 0.02;
/** ...and its box must span at least this fraction of the short side. */
const MIN_SPAN = 0.15;
/** A box spanning more than this in both directions means background and product could not be told apart. */
const MAX_SPAN = 0.92;
/** Margin added around the product, as a fraction of its size. */
const PADDING = 0.08;
/** Fallback crop: this fraction of the short side, centered. */
const FALLBACK_SCALE = 0.85;

export function centerSquare(width: number, height: number, scale = 1): Square {
  const short = Math.min(width, height);
  const size = Math.round(short * scale);
  return { x: Math.floor((width - size) / 2), y: Math.floor((height - size) / 2), size };
}

/** Color bucket: 16 levels per channel. */
function bucket(r: number, g: number, b: number): number {
  return ((r >> 4) << 8) | ((g >> 4) << 4) | (b >> 4);
}

/** For every bucket, how many border pixels fall into it or a neighbouring bucket (so shading does not matter). */
function borderColorCounts(border: number[]): Int32Array {
  const exact = new Int32Array(4096);
  for (const k of border) exact[k]!++;
  const near = new Int32Array(4096);
  for (let k = 0; k < 4096; k++) {
    const r = k >> 8, g = (k >> 4) & 15, b = k & 15;
    let sum = 0;
    for (let dr = -1; dr <= 1; dr++) {
      for (let dg = -1; dg <= 1; dg++) {
        for (let db = -1; db <= 1; db++) {
          const rr = r + dr, gg = g + dg, bb = b + db;
          if (rr < 0 || gg < 0 || bb < 0 || rr > 15 || gg > 15 || bb > 15) continue;
          sum += exact[(rr << 8) | (gg << 4) | bb]!;
        }
      }
    }
    near[k] = sum;
  }
  return near;
}

export function autoCropSquare({ data, width, height }: Pixels): Square {
  const fallback = centerSquare(width, height, FALLBACK_SCALE);
  const n = width * height;
  if (n === 0 || data.length < n * 4) return fallback;

  const ring = Math.max(1, Math.round(Math.min(width, height) * 0.06));
  const isBorder = (x: number, y: number): boolean => x < ring || y < ring || x >= width - ring || y >= height - ring;
  const colors = new Int16Array(n);
  const border: number[] = [];
  for (let y = 0; y < height; y++) {
    for (let x = 0; x < width; x++) {
      const i = y * width + x;
      colors[i] = bucket(data[i * 4]!, data[i * 4 + 1]!, data[i * 4 + 2]!);
      if (isBorder(x, y)) border.push(colors[i]!);
    }
  }
  const near = borderColorCounts(border);
  const minCount = Math.max(2, border.length * MIN_BORDER_SHARE);
  const raw = new Uint8Array(n);
  for (let i = 0; i < n; i++) raw[i] = near[colors[i]!]! < minCount ? 1 : 0;

  // Majority filter: busy backgrounds leave speckles, real products are solid areas.
  const m = Math.max(1, Math.round(Math.min(width, height) * 0.03));
  const fg = new Uint8Array(n);
  for (let y = 0; y < height; y++) {
    for (let x = 0; x < width; x++) {
      let on = 0, total = 0;
      for (let yy = Math.max(0, y - m); yy <= Math.min(height - 1, y + m); yy++) {
        for (let xx = Math.max(0, x - m); xx <= Math.min(width - 1, x + m); xx++) { on += raw[yy * width + xx]!; total++; }
      }
      fg[y * width + x] = on * 2 > total ? 1 : 0;
    }
  }

  // Dilate a little so label text, gaps and highlights on one product join into a single blob.
  const r = Math.max(1, Math.round(Math.min(width, height) * 0.015));
  const grown = new Uint8Array(n);
  for (let y = 0; y < height; y++) {
    for (let x = 0; x < width; x++) {
      if (!fg[y * width + x]) continue;
      for (let yy = Math.max(0, y - r); yy <= Math.min(height - 1, y + r); yy++) {
        for (let xx = Math.max(0, x - r); xx <= Math.min(width - 1, x + r); xx++) grown[yy * width + xx] = 1;
      }
    }
  }

  // Label 4-connected blobs; keep the best one (big, and near the center).
  const seen = new Uint8Array(n);
  const halfDiagonal = Math.hypot(width, height) / 2;
  let best: { score: number; area: number; x0: number; y0: number; x1: number; y1: number } | null = null;
  for (let start = 0; start < n; start++) {
    if (!grown[start] || seen[start]) continue;
    const stack = [start];
    seen[start] = 1;
    let area = 0, sumX = 0, sumY = 0;
    let x0 = width, y0 = height, x1 = -1, y1 = -1;
    while (stack.length > 0) {
      const i = stack.pop()!;
      const x = i % width;
      const y = (i - x) / width;
      if (fg[i]) {
        area++;
        sumX += x;
        sumY += y;
        if (x < x0) x0 = x;
        if (x > x1) x1 = x;
        if (y < y0) y0 = y;
        if (y > y1) y1 = y;
      }
      if (x > 0 && grown[i - 1] && !seen[i - 1]) { seen[i - 1] = 1; stack.push(i - 1); }
      if (x < width - 1 && grown[i + 1] && !seen[i + 1]) { seen[i + 1] = 1; stack.push(i + 1); }
      if (y > 0 && grown[i - width] && !seen[i - width]) { seen[i - width] = 1; stack.push(i - width); }
      if (y < height - 1 && grown[i + width] && !seen[i + width]) { seen[i + width] = 1; stack.push(i + width); }
    }
    if (area === 0) continue;
    const off = Math.hypot(sumX / area - (width - 1) / 2, sumY / area - (height - 1) / 2) / halfDiagonal;
    const score = area * (1 - off) ** 2;
    if (!best || score > best.score) best = { score, area, x0, y0, x1, y1 };
  }

  if (!best || best.area < n * MIN_AREA) return fallback;
  const boxW = best.x1 - best.x0 + 1;
  const boxH = best.y1 - best.y0 + 1;
  const short = Math.min(width, height);
  if (Math.max(boxW, boxH) < short * MIN_SPAN) return fallback;
  if (boxW > width * MAX_SPAN && boxH > height * MAX_SPAN) return fallback;

  const size = Math.min(short, Math.round(Math.max(boxW, boxH) * (1 + 2 * PADDING)));
  const cx = (best.x0 + best.x1 + 1) / 2;
  const cy = (best.y0 + best.y1 + 1) / 2;
  const x = Math.round(Math.min(Math.max(cx - size / 2, 0), width - size));
  const y = Math.round(Math.min(Math.max(cy - size / 2, 0), height - size));
  return { x, y, size };
}
