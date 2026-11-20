import { autoCropSquare } from '../core/autocrop';

const SIZE = 160;
/** The product search runs on a copy this big (longest side); it is plenty to find a grocery item. */
const ANALYSIS_SIDE = 96;

function loadImage(file: File): Promise<HTMLImageElement> {
  return new Promise((resolve, reject) => {
    const url = URL.createObjectURL(file);
    const img = new Image();
    img.onload = () => { URL.revokeObjectURL(url); resolve(img); };
    img.onerror = () => { URL.revokeObjectURL(url); reject(new Error('image')); };
    img.src = url;
  });
}

/** Where the product is, as a square in the image's own pixels (center crop if it can't be found). */
function findSquare(img: HTMLImageElement): { x: number; y: number; size: number } {
  const w = img.naturalWidth;
  const h = img.naturalHeight;
  const scale = Math.min(1, ANALYSIS_SIDE / Math.max(w, h));
  const aw = Math.max(1, Math.round(w * scale));
  const ah = Math.max(1, Math.round(h * scale));
  const canvas = document.createElement('canvas');
  canvas.width = aw;
  canvas.height = ah;
  const g = canvas.getContext('2d', { willReadFrequently: true });
  if (!g) throw new Error('canvas');
  g.drawImage(img, 0, 0, aw, ah);
  const sq = autoCropSquare(g.getImageData(0, 0, aw, ah));
  return { x: sq.x / scale, y: sq.y / scale, size: sq.size / scale };
}

/** Auto-crops a photo to the product and scales it to a small square JPEG data URL (keeps localStorage small). */
export async function processPhoto(file: File): Promise<string> {
  const img = await loadImage(file);
  if (img.naturalWidth === 0 || img.naturalHeight === 0) throw new Error('image');
  const { x, y, size } = findSquare(img);
  const canvas = document.createElement('canvas');
  canvas.width = SIZE;
  canvas.height = SIZE;
  const g = canvas.getContext('2d');
  if (!g) throw new Error('canvas');
  g.imageSmoothingQuality = 'high';
  g.drawImage(img, x, y, size, size, 0, 0, SIZE, SIZE);
  return canvas.toDataURL('image/jpeg', 0.8);
}
