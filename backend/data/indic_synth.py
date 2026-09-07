"""
IndicSynth dataset loader — streaming-first, configurable by language/generator.

The dataset (~845 GB) is NEVER downloaded in full. Streaming mode is the
default, and max_samples caps how many items are consumed.

All audio from IndicSynth is synthetic (FAKE). If a bona-fide (REAL) dataset
is provided alongside, the combined pipeline merges both with correct labels.

License: CC BY-NC 4.0 — non-commercial use only.
"""

import logging
from typing import Dict, Iterator, List, Optional

from datasets import load_dataset, IterableDataset, Dataset, Audio

from data.dataset_config import (
    IndicSynthConfig,
    COLUMN_AUDIO,
    COLUMN_GENERATOR,
    COLUMN_SOURCE_SPEAKER,
    COLUMN_TARGET_SPEAKER,
    COLUMN_GENDER,
    LABEL_FAKE,
    LABEL_REAL,
    SUPPORTED_LANGUAGES,
)

logger = logging.getLogger("voxguard.data")

# Map the generator strings in IndicSynth metadata to our canonical names
_GENERATOR_ALIASES: Dict[str, str] = {
    "xtts_v2": "xtts_v2",
    "xtts-v2": "xtts_v2",
    "XTTS-v2": "xtts_v2",
    "vits": "vits",
    "VITS": "vits",
    "freevc24": "freevc24",
    "FreeVC24": "freevc24",
    "freevc": "freevc24",
    "FreeVC": "freevc24",
}


def _normalize_generator(raw: str) -> str:
    """Normalize generator name to canonical form."""
    return _GENERATOR_ALIASES.get(raw, raw.lower().replace("-", "_"))


def load_indicsynth(
    languages: Optional[List[str]] = None,
    split: str = "train",
    streaming: bool = True,
    max_samples: Optional[int] = None,
    max_samples_per_language: Optional[int] = None,
    generative_models: Optional[List[str]] = None,
    config: Optional[IndicSynthConfig] = None,
) -> Iterator[Dict]:
    """
    Load IndicSynth samples as an iterator of normalized dicts.

    Each yielded item has:
        {
            "audio": {"array": np.ndarray, "sampling_rate": int},
            "label": 1,  (FAKE — all IndicSynth is synthetic)
            "language": "Hindi",
            "generator": "xtts_v2",
            "source_speaker_id": str | None,
            "target_speaker_id": str | None,
            "gender": str | None,
        }

    Parameters:
        languages: list of language names to load (None = all supported)
        split: HF split name
        streaming: use HF streaming to avoid full download
        max_samples: total cap across all languages
        max_samples_per_language: per-language cap (for balanced loading)
        generative_models: filter to these generators only
        config: optional IndicSynthConfig for defaults
    """
    if config is None:
        config = IndicSynthConfig.from_env()

    langs = languages or config.languages
    gens = generative_models or config.generators
    use_streaming = streaming if streaming is not None else config.streaming
    total_cap = max_samples or config.max_samples
    per_lang_cap = max_samples_per_language or config.max_samples_per_language

    # Normalize requested generator names for comparison
    gens_normalized = {_normalize_generator(g) for g in gens}

    total_yielded = 0

    for lang in langs:
        if lang not in SUPPORTED_LANGUAGES:
            logger.warning("Skipping unsupported language: %s", lang)
            continue

        lang_yielded = 0
        logger.info("Loading IndicSynth [%s] streaming=%s", lang, use_streaming)

        try:
            ds = load_dataset(
                config.repo_id,
                name=lang,
                split=split,
                streaming=use_streaming,
                token=config.hf_token,
                cache_dir=config.cache_dir,
                trust_remote_code=False,
            ).cast_column("audio", Audio(decode=False))
        except Exception:
            logger.exception("Failed to load IndicSynth for language: %s", lang)
            continue

        for sample in ds:
            # Check total cap
            if total_cap is not None and total_yielded >= total_cap:
                return
            # Check per-language cap
            if per_lang_cap is not None and lang_yielded >= per_lang_cap:
                break

            # Filter by generator if specified
            raw_gen = sample.get(COLUMN_GENERATOR, "")
            gen_normalized = _normalize_generator(str(raw_gen))
            if gen_normalized not in gens_normalized:
                continue

            # Extract audio — dictionary with 'bytes' or 'path'
            audio_data = sample.get(COLUMN_AUDIO)
            if audio_data is None:
                continue

            # We will decode in preprocessing.py now

            yield {
                "audio": audio_data,
                "label": LABEL_FAKE,
                "language": lang,
                "generator": gen_normalized,
                "source_speaker_id": sample.get(COLUMN_SOURCE_SPEAKER),
                "target_speaker_id": sample.get(COLUMN_TARGET_SPEAKER),
                "gender": sample.get(COLUMN_GENDER),
            }

            total_yielded += 1
            lang_yielded += 1

        logger.info("Loaded %d samples from IndicSynth [%s]", lang_yielded, lang)

    logger.info("Total IndicSynth samples loaded: %d", total_yielded)


def load_indicsynth_balanced(
    languages: Optional[List[str]] = None,
    samples_per_language: int = 1000,
    generative_models: Optional[List[str]] = None,
    streaming: bool = True,
    config: Optional[IndicSynthConfig] = None,
) -> Iterator[Dict]:
    """
    Load IndicSynth with equal samples per language for balanced training.

    This is the recommended loading mode for multilingual training to prevent
    high-volume languages from dominating.
    """
    return load_indicsynth(
        languages=languages,
        streaming=streaming,
        max_samples_per_language=samples_per_language,
        generative_models=generative_models,
        config=config,
    )


def get_speaker_groups(samples: List[Dict]) -> Dict[str, List[int]]:
    """
    Group sample indices by speaker identity for speaker-aware splitting.

    Uses source_speaker_id as the grouping key. Samples from the same
    speaker go into the same split to prevent data leakage.

    Returns: {speaker_id: [sample_indices]}
    """
    groups: Dict[str, List[int]] = {}
    for idx, sample in enumerate(samples):
        # Use source speaker as the identity anchor
        speaker = sample.get("source_speaker_id") or sample.get("target_speaker_id")
        if speaker is None:
            speaker = f"__unknown_{idx}"
        speaker = str(speaker)
        groups.setdefault(speaker, []).append(idx)
    return groups
