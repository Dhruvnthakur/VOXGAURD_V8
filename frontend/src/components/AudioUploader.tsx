import { useEffect, useRef, useState } from "react";
import { formatFileSize, formatTime, MAX_UPLOAD_BYTES } from "@/lib/voxguard";

export type UploadState = "empty" | "selected" | "analyzing" | "error";

type Props = {
  file: File | null;
  state: UploadState;
  error?: string | null;
  onSelect: (file: File | null) => void;
  onAnalyze: () => void;
};

const ACCEPT = ".wav,.mp3,.m4a,.flac,audio/*";

/** Drag-and-drop + browse uploader with preview and explicit states. */
export function AudioUploader({ file, state, error, onSelect, onAnalyze }: Props) {
  const inputRef = useRef<HTMLInputElement | null>(null);
  const [dragging, setDragging] = useState(false);
  const [previewUrl, setPreviewUrl] = useState<string | null>(null);
  const [duration, setDuration] = useState<number | null>(null);

  useEffect(() => {
    if (!file) {
      setPreviewUrl(null);
      setDuration(null);
      return;
    }
    const url = URL.createObjectURL(file);
    setPreviewUrl(url);
    setDuration(null);
    return () => URL.revokeObjectURL(url);
  }, [file]);

  const pick = (next: File | undefined | null) => {
    if (!next) return;
    if (next.size > MAX_UPLOAD_BYTES) {
      onSelect(null);
      return;
    }
    onSelect(next);
  };

  const clear = () => {
    onSelect(null);
    if (inputRef.current) inputRef.current.value = "";
  };

  const busy = state === "analyzing";

  return (
    <div className="space-y-5">
      <div
        onDragOver={(event) => {
          event.preventDefault();
          setDragging(true);
        }}
        onDragLeave={() => setDragging(false)}
        onDrop={(event) => {
          event.preventDefault();
          setDragging(false);
          pick(event.dataTransfer.files[0]);
        }}
        className={`grid-surface rounded-xl border border-dashed p-8 text-center transition-colors ${
          dragging ? "border-primary" : "border-border"
        }`}
      >
        <p className="text-base font-semibold">Drop an audio file here</p>
        <p className="mt-1 text-sm text-muted-foreground">WAV · MP3 · M4A · FLAC — up to 25 MB</p>

        <input
          ref={inputRef}
          type="file"
          accept={ACCEPT}
          className="hidden"
          onChange={(event) => pick(event.target.files?.[0])}
        />
        <button
          type="button"
          onClick={() => inputRef.current?.click()}
          className="mt-5 inline-flex items-center rounded-md bg-primary px-5 py-2.5 text-sm font-semibold text-primary-foreground transition-opacity hover:opacity-90"
        >
          Browse files
        </button>
      </div>

      {file ? (
        <div className="space-y-4 rounded-xl border border-border bg-background/40 p-4">
          <div className="flex items-start gap-3">
            <div className="min-w-0 flex-1">
              <strong className="block truncate text-sm">{file.name}</strong>
              <span className="mono-num text-xs text-muted-foreground">
                {formatFileSize(file.size)}
                {duration !== null ? ` · ${formatTime(duration)}` : ""}
              </span>
            </div>
            <button
              type="button"
              onClick={clear}
              disabled={busy}
              className="rounded-md border border-border px-3 py-1 text-xs text-muted-foreground transition-colors hover:text-foreground disabled:opacity-50"
            >
              Remove
            </button>
          </div>
          {previewUrl ? (
            <audio
              src={previewUrl}
              controls
              preload="metadata"
              className="w-full"
              onLoadedMetadata={(event) => {
                const value = event.currentTarget.duration;
                if (Number.isFinite(value)) setDuration(value);
              }}
            />
          ) : null}
        </div>
      ) : (
        <p className="text-sm text-muted-foreground">No file selected.</p>
      )}

      {state === "error" && error ? (
        <p className="rounded-lg border border-destructive/40 bg-destructive/10 px-4 py-3 text-sm text-destructive">
          {error}
        </p>
      ) : null}

      <button
        type="button"
        onClick={onAnalyze}
        disabled={busy || !file}
        className="inline-flex w-full items-center justify-center gap-2 rounded-md bg-primary px-6 py-3 text-sm font-semibold text-primary-foreground transition-opacity hover:opacity-90 disabled:opacity-50"
      >
        {busy ? "Analyzing audio…" : "Run detection"}
      </button>

      {busy ? (
        <div className="h-1 overflow-hidden rounded-full bg-secondary">
          <div className="h-full w-1/3 animate-pulse rounded-full bg-primary" />
        </div>
      ) : null}
    </div>
  );
}
