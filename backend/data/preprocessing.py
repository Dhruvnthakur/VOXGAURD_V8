"""
Shared audio preprocessing for the training pipeline.

Uses PyTorch/torchaudio for resampling to avoid Numba/Librosa JIT overhead
on the hot audio preprocessing path.
"""

import logging
from typing import Optional, Tuple
import io
import soundfile as sf
import numpy as np
import torch
import torchaudio.functional as F

from data.dataset_config import IndicSynthConfig

logger = logging.getLogger("voxguard.preprocessing")

def decode_audio(audio_data: dict) -> Tuple[np.ndarray, int]:
    """
    Decode an IndicSynth audio object returned by Audio(decode=False).
    """
    raw_bytes = audio_data.get("bytes")
    if raw_bytes is not None:
        waveform, sr = sf.read(io.BytesIO(raw_bytes), dtype="float32")
    else:
        path = audio_data.get("path")
        if path is None:
            raise ValueError("Audio contains neither bytes nor path")
        waveform, sr = sf.read(path, dtype="float32")
    return waveform, sr

def preprocess_audio(
    audio_array: np.ndarray,
    source_sr: int,
    target_sr: int = 16000,
    min_duration: float = 0.5,
    max_duration: float = 30.0,
) -> Optional[np.ndarray]:
    """
    Preprocess a raw audio array for model input.
    """
    if audio_array is None or len(audio_array) == 0:
        return None

    # Use torch for all subsequent operations to keep operations on-device/performant
    waveform = torch.from_numpy(audio_array.astype("float32"))

    # Add channel dimension if mono
    if waveform.ndim == 1:
        waveform = waveform.unsqueeze(0)

    # Convert to mono if multi-channel (mean over channels)
    if waveform.shape[0] > 1:
        waveform = waveform.mean(dim=0, keepdim=True)

    # Resample using torchaudio
    if source_sr != target_sr:
        waveform = F.resample(waveform, orig_freq=source_sr, new_freq=target_sr)

    # Duration check (numpy is still useful here for simple math)
    audio = waveform.squeeze(0).numpy()
    duration = len(audio) / target_sr

    if duration < min_duration:
        return None

    # Truncate if too long
    if duration > max_duration:
        max_samples = int(max_duration * target_sr)
        audio = audio[:max_samples]

    # Normalize: peak normalization to [-1, 1]
    peak = np.max(np.abs(audio))
    if peak > 0:
        audio = audio / peak

    return audio


def chunk_audio(
    audio: np.ndarray,
    sr: int,
    chunk_duration: float = 5.0,
    overlap: float = 0.0,
) -> list:
    """
    Split a long audio array into fixed-length chunks.
    """
    chunk_samples = int(chunk_duration * sr)
    step_samples = int(chunk_samples * (1 - overlap))
    min_final = chunk_samples // 2

    chunks = []
    start = 0
    while start < len(audio):
        end = start + chunk_samples
        chunk = audio[start:end]
        if len(chunk) >= min_final:
            # Pad short final chunk with zeros
            if len(chunk) < chunk_samples:
                chunk = np.pad(chunk, (0, chunk_samples - len(chunk)))
            chunks.append(chunk)
        start += step_samples

    return chunks


def preprocess_hf_sample(
    sample: dict,
    config: Optional[IndicSynthConfig] = None,
) -> Optional[dict]:
    """
    Preprocess a single sample from the HF dataset iterator.

    Expects sample["audio"] to be a dictionary with 'bytes' or 'path'
    """
    if config is None:
        config = IndicSynthConfig.from_env()

    audio_data = sample.get("audio")
    if audio_data is None:
        return None

    try:
        audio_array, source_sr = decode_audio(audio_data)
    except Exception as e:
        logger.warning("Failed to decode audio: %s", e)
        return None

    processed = preprocess_audio(
        audio_array,
        source_sr=source_sr,
        target_sr=config.sample_rate,
        min_duration=config.min_audio_duration,
        max_duration=config.max_audio_duration,
    )

    if processed is None:
        return None

    result = dict(sample)
    result["audio"] = processed
    result["sample_rate"] = config.sample_rate
    return result
