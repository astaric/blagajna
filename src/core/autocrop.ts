// Auto-crop for product photos: finds the product in a (small) RGBA image and returns a square around it.
// Pure pixel math (no canvas), so it is unit-testable; src/ui/photo.ts feeds it a downscaled copy of the photo.
//
// Idea: the background is whatever color the frame border mostly has (table, shelf, wall). Pixels that differ
// clearly from it are "product". The product is the largest such blob, preferring one near the center, so a
// stray hand or a neighbouring item at the edge does not pull the crop away. If nothing convincing is found
// the result is a plain center crop, which is what the app did before.

export interface Pixels {
  /** RGBA bytes, row-major (like `ImageData.data`). */
  data: ArrayLike<number>;
  width: number;
  height: number;
}

export interface Square { x: number; y: number; size: number }

/** Smallest color distance (0-441, Euclidean RGB) from the background that counts as product. */
const MIN_DISTANCE = 40;
/** The bar adapts to a noisy border but never rises above this. */
const MAX_DISTANCE = 100;
/** The product must cover at least this fraction of the frame, otherwise it is probably noise. */
const MIN_AREA = 0.02;
/** ...and its box must span at least this fraction of the short side. */
const MIN_SPAN = 0.15;
/** Margin added around the product, as a fraction of its size. */
const PADDING = 0.08;

export function centerSquare(width: number, height: number): Square {
  const size = Math.min(width, height);
  return { x: Math.floor((width - size) / 2), y: Math.floor((height - size) / 2), size };
}

function median(values: number[]): number {
  const sorted = [...values].sort((a, b) => a - b);
  return sorted[Math.floor(sorted.length / 2)] ?? 0;
}

export function autoCropSquare({ data, width, height }: Pixels): Square {
  const fallback = centerSquare(width, height);
  const n = width * height;
  if (n === 0 || data.length < n * 4) return fallback;

  // Background color = per-channel median of a ring along the frame border.
  const ring = Math.max(1, Math.round(Math.min(width, height) * 0.05));
  const isBorder = (x: number, y: number): boolean => x < ring || y < ring || x >= width - ring || y >= height - ring;
  const border: number[][] = [[], [], []];
  for (let y = 0; y < height; y++) {
    for (let x = 0; x < width; x++) {
      if (!isBorder(x, y)) continue;
      const i = (y * width + x) * 4;
      for (let c = 0; c < 3; c++) border[c]!.push(data[i + c]!);
    }
  }
  const bg = border.map(median);

  const dist = new Float32Array(n);
  for (let i = 0; i < n; i++) {
    const dr = data[i * 4]! - bg[0]!;
    const dg = data[i * 4 + 1]! - bg[1]!;
    const db = data[i * 4 + 2]! - bg[2]!;
    dist[i] = Math.sqrt(dr * dr + dg * dg + db * db);
  }

  // A noisy or gradient border needs a higher bar than a flat one: 1.5x the 70th percentile of its own spread.
  // (Not higher: a stray object touching the border must not raise the bar until nothing passes it.)
  const borderDist: number[] = [];
  for (let y = 0; y < height; y++) for (let x = 0; x < width; x++) if (isBorder(x, y)) borderDist.push(dist[y * width + x]!);
  borderDist.sort((a, b) => a - b);
  const threshold = Math.min(MAX_DISTANCE, Math.max(MIN_DISTANCE, 1.5 * (borderDist[Math.floor(borderDist.length * 0.7)] ?? 0)));

  const fg = new Uint8Array(n);
  for (let i = 0; i < n; i++) fg[i] = dist[i]! > threshold ? 1 : 0;

  // Dilate so label text, gaps and highlights on one product join into a single blob.
  const r = Math.max(1, Math.round(Math.min(width, height) * 0.02));
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

  const size = Math.min(short, Math.round(Math.max(boxW, boxH) * (1 + 2 * PADDING)));
  const cx = (best.x0 + best.x1 + 1) / 2;
  const cy = (best.y0 + best.y1 + 1) / 2;
  const x = Math.round(Math.min(Math.max(cx - size / 2, 0), width - size));
  const y = Math.round(Math.min(Math.max(cy - size / 2, 0), height - size));
  return { x, y, size };
}
