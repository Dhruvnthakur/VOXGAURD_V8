import { useEffect, useRef } from "react";
import { drawMatrix } from "@/lib/heatmap";
import type { MelData } from "@/lib/voxguard";

type Props = { mel: MelData };

/** Mel spectrogram (dB) drawn on a canvas — up to tens of thousands of cells. */
export function MelSpectrogram({ mel }: Props) {
  const canvasRef = useRef<HTMLCanvasElement | null>(null);

  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    const render = () => drawMatrix(canvas, mel.data, "thermal");
    render();
    const observer = new ResizeObserver(render);
    observer.observe(canvas);
    return () => observer.disconnect();
  }, [mel]);

  return (
    <div className="space-y-2">
      <canvas ref={canvasRef} className="h-56 w-full rounded-xl bg-secondary/30" />
      <div className="flex justify-between text-[11px] tracking-widest text-muted-foreground">
        <span>LOW</span>
        <span>{mel.mel_bands} MEL BANDS · {mel.data[0]?.length ?? 0} FRAMES</span>
        <span>HIGH</span>
      </div>
    </div>
  );
}
