/**
 * Lightweight FFT helpers for the frequency-spectrum visualisation.
 * Preserved from the original VoxGuard frontend.
 */

/** Logarithmically spaced bin edges so low frequencies get more bars. */
export function bandEdges(binCount: number, bars: number): number[] {
  const edges: number[] = [];
  const minBin = 1;
  for (let i = 0; i <= bars; i++) {
    const t = i / bars;
    const bin = Math.round(minBin * Math.pow(binCount / minBin, t));
    edges.push(Math.min(binCount - 1, Math.max(minBin, bin)));
  }
  return edges;
}

/** Radix-2 in-place FFT on real/imag arrays of length 2^n. */
function fft(re: Float32Array, im: Float32Array): void {
  const n = re.length;
  for (let i = 1, j = 0; i < n; i++) {
    let bit = n >> 1;
    for (; j & bit; bit >>= 1) j ^= bit;
    j ^= bit;
    if (i < j) {
      [re[i], re[j]] = [re[j]!, re[i]!];
      [im[i], im[j]] = [im[j]!, im[i]!];
    }
  }
  for (let len = 2; len <= n; len <<= 1) {
    const ang = (-2 * Math.PI) / len;
    for (let i = 0; i < n; i += len) {
      for (let k = 0; k < len / 2; k++) {
        const cos = Math.cos(ang * k);
        const sin = Math.sin(ang * k);
        const a = i + k;
        const b = a + len / 2;
        const tre = re[b]! * cos - im[b]! * sin;
        const tim = re[b]! * sin + im[b]! * cos;
        re[b] = re[a]! - tre;
        im[b] = im[a]! - tim;
        re[a] = re[a]! + tre;
        im[a] = im[a]! + tim;
      }
    }
  }
}

/**
 * Average magnitude spectrum of a decoded buffer, folded into `bars`
 * log-spaced bands normalised to 0..1.
 */
export function computeSpectrum(buffer: AudioBuffer, bars: number): number[] {
  const size = 2048;
  const channel = buffer.getChannelData(0);
  const hops = Math.max(1, Math.min(120, Math.floor(channel.length / size)));
  const bins = size / 2;
  const accum = new Float32Array(bins);

  for (let h = 0; h < hops; h++) {
    const offset = Math.floor((h * (channel.length - size)) / Math.max(1, hops - 1));
    const re = new Float32Array(size);
    const im = new Float32Array(size);
    for (let i = 0; i < size; i++) {
      const window = 0.5 - 0.5 * Math.cos((2 * Math.PI * i) / (size - 1));
      re[i] = (channel[offset + i] ?? 0) * window;
    }
    fft(re, im);
    for (let i = 0; i < bins; i++) {
      accum[i] = accum[i]! + Math.hypot(re[i]!, im[i]!);
    }
  }

  const edges = bandEdges(bins, bars);
  const out: number[] = [];
  let peak = 1e-9;
  for (let b = 0; b < bars; b++) {
    const from = edges[b]!;
    const to = Math.max(from + 1, edges[b + 1]!);
    let sum = 0;
    for (let i = from; i < to; i++) sum += accum[i]! / hops;
    const value = sum / (to - from);
    peak = Math.max(peak, value);
    out.push(value);
  }
  return out.map((value) => Math.min(1, value / peak));
}
