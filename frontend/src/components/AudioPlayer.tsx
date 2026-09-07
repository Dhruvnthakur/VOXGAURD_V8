import { useEffect, useState } from "react";
import { formatTime } from "@/lib/voxguard";

type Props = {
  audioRef: React.RefObject<HTMLAudioElement | null>;
  filename: string;
};

/** Minimal transport controls bound to the shared <audio> element. */
export function AudioPlayer({ audioRef, filename }: Props) {
  const [playing, setPlaying] = useState(false);
  const [time, setTime] = useState(0);
  const [duration, setDuration] = useState(0);

  useEffect(() => {
    const audio = audioRef.current;
    if (!audio) return;
    const onTime = () => setTime(audio.currentTime);
    const onMeta = () => setDuration(audio.duration);
    const onPlay = () => setPlaying(true);
    const onPause = () => setPlaying(false);
    audio.addEventListener("timeupdate", onTime);
    audio.addEventListener("loadedmetadata", onMeta);
    audio.addEventListener("durationchange", onMeta);
    audio.addEventListener("play", onPlay);
    audio.addEventListener("pause", onPause);
    audio.addEventListener("ended", onPause);
    return () => {
      audio.removeEventListener("timeupdate", onTime);
      audio.removeEventListener("loadedmetadata", onMeta);
      audio.removeEventListener("durationchange", onMeta);
      audio.removeEventListener("play", onPlay);
      audio.removeEventListener("pause", onPause);
      audio.removeEventListener("ended", onPause);
    };
  }, [audioRef]);

  const progress = duration ? (time / duration) * 100 : 0;

  return (
    <div className="flex flex-wrap items-center gap-4 rounded-2xl border border-border bg-secondary/30 p-4">
      <button
        type="button"
        onClick={() => {
          const audio = audioRef.current;
          if (!audio) return;
          if (audio.paused) void audio.play();
          else audio.pause();
        }}
        aria-label={playing ? "Pause" : "Play"}
        className="grid size-11 shrink-0 place-items-center rounded-full bg-primary text-primary-foreground transition-opacity hover:opacity-90"
      >
        <span aria-hidden>{playing ? "❚❚" : "▶"}</span>
      </button>

      <div className="min-w-[12rem] flex-1 space-y-2">
        <div className="flex items-baseline justify-between gap-3">
          <strong className="truncate text-sm">{filename}</strong>
          <span className="shrink-0 text-xs tabular-nums text-muted-foreground">
            {formatTime(time)} / {formatTime(duration)}
          </span>
        </div>
        <input
          type="range"
          min={0}
          max={duration || 0}
          step={0.01}
          value={time}
          aria-label="Seek"
          onChange={(event) => {
            const audio = audioRef.current;
            if (audio) audio.currentTime = Number(event.target.value);
          }}
          className="h-1.5 w-full cursor-pointer appearance-none rounded-full bg-border accent-primary"
          style={{
            background: `linear-gradient(to right, var(--color-primary) ${progress}%, var(--color-border) ${progress}%)`,
          }}
        />
      </div>
    </div>
  );
}
