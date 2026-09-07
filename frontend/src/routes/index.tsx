import { createFileRoute, useNavigate } from "@tanstack/react-router";
import { useState } from "react";
import { toast } from "sonner";
import { AudioUploader, type UploadState } from "@/components/AudioUploader";
import { analyzeAudio, formatFileSize, MAX_UPLOAD_BYTES, saveAudio, saveResult } from "@/lib/voxguard";

export const Route = createFileRoute("/")({
  head: () => ({
    meta: [
      { title: "VoxGuard — AI Voice Deepfake Detection & Audio Forensics" },
      {
        name: "description",
        content:
          "Upload a recording and let the VoxGuard detector score it for synthetic or manipulated speech, with pitch, MFCC and Mel forensic evidence.",
      },
      { property: "og:title", content: "VoxGuard — AI Voice Deepfake Detection" },
      {
        property: "og:description",
        content:
          "Detect synthetic voices before they become a threat: deepfake scoring plus F0, MFCC and Mel spectrogram forensics.",
      },
      { property: "og:type", content: "website" },
      { name: "twitter:card", content: "summary_large_image" },
    ],
  }),
  component: UploadPage,
});

const PIPELINE = ["CALL", "VOICE", "ANALYSIS", "AI DETECTION", "FORENSICS", "RISK"];

function UploadPage() {
  const navigate = useNavigate();
  const [file, setFile] = useState<File | null>(null);
  const [state, setState] = useState<UploadState>("empty");
  const [error, setError] = useState<string | null>(null);

  const select = (next: File | null) => {
    if (next && next.size > MAX_UPLOAD_BYTES) {
      toast.error(`File is larger than ${formatFileSize(MAX_UPLOAD_BYTES)}.`);
      return;
    }
    setFile(next);
    setError(null);
    setState(next ? "selected" : "empty");
  };

  const analyze = async () => {
    if (!file) return;
    setState("analyzing");
    setError(null);
    try {
      const result = await analyzeAudio(file);
      await saveAudio(file);
      saveResult(result);
      void navigate({ to: "/dashboard" });
    } catch (caught) {
      const message = (caught as Error).message;
      setError(message);
      setState("error");
      toast.error(message);
    }
  };

  return (
    <div className="mx-auto grid w-full max-w-6xl gap-10 px-5 py-12 lg:grid-cols-[1.05fr_1fr] lg:items-center lg:py-20">
      <section className="space-y-8">
        <div>
          <span className="eyebrow text-primary">AI voice forensics</span>
          <h1 className="mt-3 text-4xl leading-tight font-semibold sm:text-5xl">
            Detect synthetic voices before they become a threat.
          </h1>
          <p className="mt-4 max-w-lg text-muted-foreground">
            VoxGuard scores recordings for AI-generated or manipulated speech, then backs the verdict
            with pitch, cepstral and spectral evidence you can inspect frame by frame.
          </p>
        </div>

        <ol className="flex flex-wrap items-center gap-2 text-[11px] tracking-[0.18em] text-muted-foreground">
          {PIPELINE.map((step, index) => (
            <li key={step} className="flex items-center gap-2">
              <span className="rounded border border-border px-2.5 py-1">{step}</span>
              {index < PIPELINE.length - 1 ? <span aria-hidden>→</span> : null}
            </li>
          ))}
        </ol>

        <dl className="grid gap-4 sm:grid-cols-3">
          {[
            ["Model signal", "Deepfake classifier drives the verdict"],
            ["Forensic evidence", "F0, MFCC and Mel as supporting proof"],
            ["Windowed analysis", "Rolling 5-second chunks for live calls"],
          ].map(([title, sub]) => (
            <div key={title} className="panel p-4">
              <dt className="text-sm font-semibold">{title}</dt>
              <dd className="mt-1 text-xs text-muted-foreground">{sub}</dd>
            </div>
          ))}
        </dl>

        <p className="text-xs text-muted-foreground">
          Audio is processed for analysis and not retained by the interface. Retention is governed by
          backend policy.
        </p>
      </section>

      <section className="panel space-y-6 p-5 sm:p-7">
        <div className="flex items-start justify-between gap-4">
          <div>
            <span className="eyebrow text-primary">Upload audio</span>
            <h2 className="mt-1 text-xl font-semibold">Submit a recording</h2>
          </div>
        </div>

        <AudioUploader
          file={file}
          state={state}
          error={error}
          onSelect={select}
          onAnalyze={() => void analyze()}
        />
      </section>
    </div>
  );
}
