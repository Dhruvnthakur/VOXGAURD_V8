/**
 * Canvas matrix renderer for MFCC / Mel heatmaps.
 * A DOM grid would need tens of thousands of nodes, so everything is drawn
 * into a single canvas at device-pixel resolution.
 */

export type Palette = "thermal" | "diverging";

type RGB = [number, number, number];

function lerp(a: RGB, b: RGB, t: number): RGB {
  return [
    Math.round(a[0] + (b[0] - a[0]) * t),
    Math.round(a[1] + (b[1] - a[1]) * t),
    Math.round(a[2] + (b[2] - a[2]) * t),
  ];
}

const THERMAL: RGB[] = [
  [240, 244, 232],
  [198, 220, 190],
  [120, 178, 140],
  [56, 120, 92],
  [28, 62, 48],
];

const DIVERGING: RGB[] = [
  [62, 106, 168],
  [160, 186, 172],
  [240, 244, 232],
  [196, 130, 84],
  [150, 62, 40],
];

function sample(palette: Palette, t: number): RGB {
  const stops = palette === "thermal" ? THERMAL : DIVERGING;
  const clamped = Math.min(1, Math.max(0, t));
  const scaled = clamped * (stops.length - 1);
  const index = Math.min(stops.length - 2, Math.floor(scaled));
  return lerp(stops[index]!, stops[index + 1]!, scaled - index);
}

/**
 * Draw `matrix` ([row][column]) into `canvas`. Row 0 is rendered at the
 * bottom so low coefficients / low mel bands sit at the bottom of the plot.
 */
export function drawMatrix(
  canvas: HTMLCanvasElement,
  matrix: number[][],
  palette: Palette = "thermal",
): void {
  const rows = matrix.length;
  const cols = matrix[0]?.length ?? 0;
  const ctx = canvas.getContext("2d");
  if (!ctx || rows === 0 || cols === 0) return;

  const width = canvas.clientWidth || 600;
  const height = canvas.clientHeight || 220;
  const dpr = Math.min(2, window.devicePixelRatio || 1);
  canvas.width = Math.max(1, Math.floor(width * dpr));
  canvas.height = Math.max(1, Math.floor(height * dpr));

  let min = Infinity;
  let max = -Infinity;
  for (const row of matrix) {
    for (const value of row) {
      if (!Number.isFinite(value)) continue;
      if (value < min) min = value;
      if (value > max) max = value;
    }
  }
  if (!Number.isFinite(min) || !Number.isFinite(max) || max === min) {
    min = 0;
    max = 1;
  }

  // Render at matrix resolution, then let the canvas scale it up smoothly.
  const image = ctx.createImageData(cols, rows);
  for (let r = 0; r < rows; r++) {
    const row = matrix[r]!;
    const y = rows - 1 - r; // flip vertically
    for (let c = 0; c < cols; c++) {
      const value = row[c];
      const t = typeof value === "number" && Number.isFinite(value) ? (value - min) / (max - min) : 0;
      const [red, green, blue] = sample(palette, t);
      const offset = (y * cols + c) * 4;
      image.data[offset] = red;
      image.data[offset + 1] = green;
      image.data[offset + 2] = blue;
      image.data[offset + 3] = 255;
    }
  }

  const bitmapCanvas = document.createElement("canvas");
  bitmapCanvas.width = cols;
  bitmapCanvas.height = rows;
  bitmapCanvas.getContext("2d")?.putImageData(image, 0, 0);

  ctx.setTransform(1, 0, 0, 1, 0, 0);
  ctx.clearRect(0, 0, canvas.width, canvas.height);
  ctx.imageSmoothingEnabled = true;
  ctx.drawImage(bitmapCanvas, 0, 0, canvas.width, canvas.height);
}
