"""
Modular audio deepfake detector interface.

Allows swapping between the original Wav2Vec2 detector and custom multilingual
models trained on IndicSynth, without changing the API or inference pipeline.
"""

import logging
from abc import ABC, abstractmethod
from typing import Dict, Union

import torch
import numpy as np

logger = logging.getLogger("voxguard.models")


class AudioDeepfakeDetector(ABC):
    """Abstract interface for audio deepfake detection models."""

    @abstractmethod
    def predict(self, audio: np.ndarray, sr: int) -> Dict[str, Union[str, float, Dict]]:
        """
        Run inference on mono audio.

        Returns:
            {
                "prediction": "real" | "fake",
                "confidence": float,
                "probabilities": {"real": float, "fake": float}
            }
        """
        pass

    @abstractmethod
    def save(self, path: str):
        """Save model state."""
        pass

    @abstractmethod
    def load(self, path: str):
        """Load model state."""
        pass


class Wav2Vec2Detector(AudioDeepfakeDetector):
    """
    Multilingual-capable Wav2Vec2 audio deepfake detector.
    This replaces/augments the original model.py implementation.
    """

    def __init__(self, model_name: str, device: str = "cuda"):
        from transformers import AutoModelForAudioClassification, AutoFeatureExtractor
        self.device = device if torch.cuda.is_available() else "cpu"
        self.feature_extractor = AutoFeatureExtractor.from_pretrained(model_name)
        self.model = AutoModelForAudioClassification.from_pretrained(model_name)
        self.model.to(self.device)
        self.model.eval()

    def predict(self, audio: np.ndarray, sr: int) -> Dict[str, Union[str, float, Dict]]:
        inputs = self.feature_extractor(
            audio,
            sampling_rate=sr,
            return_tensors="pt",
            padding=True
        )
        inputs = {k: v.to(self.device) for k, v in inputs.items()}

        with torch.inference_mode():
            outputs = self.model(**inputs)
            probs = torch.nn.functional.softmax(outputs.logits, dim=-1)

        # Assuming index 1 is FAKE, index 0 is REAL
        prob_real = probs[0][0].item()
        prob_fake = probs[0][1].item()

        prediction = "fake" if prob_fake > prob_real else "real"
        confidence = max(prob_real, prob_fake)

        return {
            "prediction": prediction,
            "confidence": round(confidence, 4),
            "probabilities": {
                "real": round(prob_real, 4),
                "fake": round(prob_fake, 4)
            }
        }

    def save(self, path: str):
        self.model.save_pretrained(path)
        self.feature_extractor.save_pretrained(path)

    def load(self, path: str):
        from transformers import AutoModelForAudioClassification, AutoFeatureExtractor
        self.feature_extractor = AutoFeatureExtractor.from_pretrained(path)
        self.model = AutoModelForAudioClassification.from_pretrained(path)
        self.model.to(self.device)
        self.model.eval()
