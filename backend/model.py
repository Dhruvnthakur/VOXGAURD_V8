import torch

from transformers import (
    AutoModelForAudioClassification,
    AutoFeatureExtractor
)

from typing import Optional
from models.detector import AudioDeepfakeDetector, Wav2Vec2Detector

MODEL_NAME = "garystafford/wav2vec2-deepfake-voice-detector"

_detector: Optional[AudioDeepfakeDetector] = None

def load_model():
    global _detector
    if _detector is None:
        _detector = Wav2Vec2Detector(MODEL_NAME)

def is_model_loaded():
    return _detector is not None

def analyze_audio(audio):
    """Run deepfake detection on already-loaded, 16kHz mono audio (numpy array)."""
    if _detector is None:
        load_model()
    return _detector.predict(audio, 16000)
