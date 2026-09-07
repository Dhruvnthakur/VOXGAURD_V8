"""
Environment-driven configuration for IndicSynth dataset loading.

All settings are read from environment variables with sensible defaults.
No secrets are stored here — HF_TOKEN comes from the environment.
"""

import os
from dataclasses import dataclass, field
from typing import List, Optional


SUPPORTED_LANGUAGES = [
    "Bengali", "Gujarati", "Hindi", "Kannada", "Malayalam",
    "Marathi", "Odia", "Punjabi", "Sanskrit", "Tamil", "Telugu", "Urdu",
]

SUPPORTED_GENERATORS = ["xtts_v2", "vits", "freevc24"]

# IndicSynth uses these column names in its metadata
COLUMN_AUDIO = "audio"
COLUMN_GENERATOR = "Generative Model"
COLUMN_SOURCE_SPEAKER = "Source Speaker_ID"
COLUMN_TARGET_SPEAKER = "Target Speaker ID"
COLUMN_GENDER = "Gender"
COLUMN_TRANSCRIPT = "TTS Transcript"

# Label convention: 0 = REAL, 1 = FAKE
# This matches the existing model.py where index [0]=real [1]=fake
LABEL_REAL = 0
LABEL_FAKE = 1


@dataclass
class IndicSynthConfig:
    """Configuration for IndicSynth dataset loading and training."""

    enabled: bool = True
    repo_id: str = "vdivyasharma/IndicSynth"
    streaming: bool = True
    languages: List[str] = field(default_factory=lambda: list(SUPPORTED_LANGUAGES))
    generators: List[str] = field(default_factory=lambda: list(SUPPORTED_GENERATORS))
    max_samples: Optional[int] = None
    max_samples_per_language: Optional[int] = None
    cache_dir: Optional[str] = None
    sample_rate: int = 16000
    hf_token: Optional[str] = None

    # Training defaults
    batch_size: int = 16
    epochs: int = 10
    learning_rate: float = 2e-5
    val_split: float = 0.15
    test_split: float = 0.15

    # Audio limits
    min_audio_duration: float = 0.5   # seconds
    max_audio_duration: float = 30.0  # seconds
    chunk_duration: float = 5.0       # seconds for chunking long clips

    @classmethod
    def from_env(cls) -> "IndicSynthConfig":
        """Build config from environment variables."""
        languages_str = os.environ.get("INDICSYNTH_LANGUAGES", "")
        generators_str = os.environ.get("INDICSYNTH_GENERATORS", "")
        max_samples_str = os.environ.get("INDICSYNTH_MAX_SAMPLES", "")
        max_per_lang_str = os.environ.get("INDICSYNTH_MAX_SAMPLES_PER_LANGUAGE", "")

        languages = (
            [l.strip() for l in languages_str.split(",") if l.strip()]
            if languages_str else list(SUPPORTED_LANGUAGES)
        )
        generators = (
            [g.strip() for g in generators_str.split(",") if g.strip()]
            if generators_str else list(SUPPORTED_GENERATORS)
        )

        return cls(
            enabled=os.environ.get("INDICSYNTH_ENABLED", "true").lower() == "true",
            repo_id=os.environ.get("INDICSYNTH_REPO", "vdivyasharma/IndicSynth"),
            streaming=os.environ.get("INDICSYNTH_STREAMING", "true").lower() == "true",
            languages=languages,
            generators=generators,
            max_samples=int(max_samples_str) if max_samples_str else None,
            max_samples_per_language=int(max_per_lang_str) if max_per_lang_str else None,
            cache_dir=os.environ.get("INDICSYNTH_CACHE_DIR") or None,
            sample_rate=int(os.environ.get("AUDIO_SAMPLE_RATE", "16000")),
            hf_token=os.environ.get("HF_TOKEN") or None,
            batch_size=int(os.environ.get("TRAIN_BATCH_SIZE", "16")),
            epochs=int(os.environ.get("TRAIN_EPOCHS", "10")),
            learning_rate=float(os.environ.get("TRAIN_LR", "2e-5")),
        )

    def validate(self) -> List[str]:
        """Return a list of validation errors (empty = valid)."""
        errors = []
        for lang in self.languages:
            if lang not in SUPPORTED_LANGUAGES:
                errors.append(f"Unsupported language: {lang}")
        for gen in self.generators:
            if gen not in SUPPORTED_GENERATORS:
                errors.append(f"Unsupported generator: {gen}")
        if self.sample_rate not in (8000, 16000, 22050, 44100, 48000):
            errors.append(f"Unusual sample rate: {self.sample_rate}")
        return errors
