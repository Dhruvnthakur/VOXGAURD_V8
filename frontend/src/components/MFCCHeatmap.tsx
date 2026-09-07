import { useEffect, useRef } from "react";
import { drawMatrix } from "@/lib/heatmap";
import type { MfccData } from "@/lib/voxguard";

type Props = { mfcc: MfccData };

/**
 * MFCC coefficients x frames matrix drawn on a canvas — a div grid would need
 * thousands of nodes for a normal-length recording.
 */
export function MFCCHeatmap({ mfcc }: Props) {
  const canvasRef = useRef<HTMLCanvasElement | null>(null);

  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    const render = () => drawMatrix(canvas, mfcc.data, "diverging");
    render();
    const observer = new ResizeObserver(render);
    observer.observe(canvas);
    return () => observer.disconnect();
  }, [mfcc]);

  return (
    <div className="space-y-2">
      <canvas ref={canvasRef} className="h-56 w-full rounded-xl bg-secondary/30" />
      <div className="flex justify-between text-[11px] tracking-widest text-muted-foreground">
        <span>COEF 1</span>
        <span>{mfcc.coefficients} COEFFICIENTS · {mfcc.data[0]?.length ?? 0} FRAMES</span>
        <span>COEF {mfcc.coefficients}</span>
      </div>
    </div>
  );
}
