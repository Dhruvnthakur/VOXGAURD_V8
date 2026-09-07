"""
CLI Training Pipeline for Multilingual Indian Deepfake Detection.
"""

import argparse
import json
import logging
import os
import random
import time
from collections import defaultdict
from typing import Dict, List

import numpy as np
import torch
from torch.utils.data import DataLoader, Dataset
from transformers import (
    AutoFeatureExtractor,
    AutoModelForAudioClassification,
)

from data.dataset_config import IndicSynthConfig, LABEL_FAKE, LABEL_REAL
from data.indic_synth import load_indicsynth
from data.preprocessing import preprocess_hf_sample
from training.evaluate import calculate_metrics

logging.basicConfig(level=logging.INFO)
logger = logging.getLogger("voxguard.train")

BASE_MODEL = "facebook/wav2vec2-base"
TARGET_SR = 16000
MAX_AUDIO_LEN = TARGET_SR * 5

class VoxGuardDataset(Dataset):
    def __init__(self, samples: List[dict], feature_extractor):
        self.samples = samples
        self.feature_extractor = feature_extractor

    def __len__(self):
        return len(self.samples)

    def __getitem__(self, idx):
        sample = self.samples[idx]
        inputs = self.feature_extractor(
            sample["audio"], sampling_rate=TARGET_SR, return_tensors="pt",
            padding="max_length", max_length=MAX_AUDIO_LEN, truncation=True,
        )
        item = {k: v.squeeze(0) for k, v in inputs.items()}
        item["labels"] = torch.tensor(sample["label"], dtype=torch.long)
        return item

def speaker_aware_stratified_split(samples: List[dict]) -> tuple:
    """
    Split samples strictly by speaker identity, ensuring class balance across splits
    by balancing speaker-group assignment independently for each class.
    """
    # 1. Group by speaker ID and label
    speaker_class_groups = defaultdict(lambda: {LABEL_FAKE: [], LABEL_REAL: []})
    for idx, s in enumerate(samples):
        sid = str(s.get("source_speaker_id") or s.get("target_speaker_id") or f"unknown_{s.get('label')}_{idx}")
        speaker_class_groups[sid][s["label"]].append(s)

    train_data, val_data, test_data = [], [], []

    # 2. Split each class independently to guarantee balance
    for label in [LABEL_FAKE, LABEL_REAL]:
        # Filter speakers who have samples for this label
        active_speakers = [sid for sid, groups in speaker_class_groups.items() if groups[label]]
        random.shuffle(active_speakers)

        # Split speakers for this class
        num_spks = len(active_speakers)
        test_limit = max(1, int(num_spks * 0.15))
        val_limit = max(1, int(num_spks * 0.15))

        for i, sid in enumerate(active_speakers):
            group = speaker_class_groups[sid][label]
            if i < test_limit:
                test_data.extend(group)
            elif i < test_limit + val_limit:
                val_data.extend(group)
            else:
                train_data.extend(group)

    return train_data, val_data, test_data

def report_split_diagnostics(train, val, test):
    for name, data in [("Train", train), ("Val", val), ("Test", test)]:
        labels = [s["label"] for s in data]
        spks = {str(s.get("source_speaker_id") or s.get("target_speaker_id") or f"u{id(s)}") for s in data}
        logger.info(f"{name}: Samples={len(data)}, FAKE={labels.count(LABEL_FAKE)}, REAL={labels.count(LABEL_REAL)}, Speakers={len(spks)}")

def generate_real_samples(count: int) -> List[dict]:
    # Group all synthetic real samples under 1 fake 'speaker' ID to allow splitting
    return [{
        "audio": np.random.randn(int(2.5 * TARGET_SR)).astype(np.float32),
        "label": LABEL_REAL,
        "language": "synthetic_real",
        "generator": "none",
        "source_speaker_id": "synthetic_real_pool",
        "target_speaker_id": None,
        "gender": None,
    } for _ in range(count)]

def train_pipeline(args):
    config = IndicSynthConfig.from_env()
    device = "cuda" if torch.cuda.is_available() else "cpu"

    # 1. Load FAKE (IndicSynth)
    fake_samples = []
    for s in load_indicsynth(languages=args.languages, max_samples=args.max_samples, config=config):
        p = preprocess_hf_sample(s, config)
        if p: fake_samples.append(p)

    # 2. Add REAL samples and split
    all_samples = fake_samples + generate_real_samples(len(fake_samples))
    train, val, test = speaker_aware_stratified_split(all_samples)
    report_split_diagnostics(train, val, test)

    # Validate splits
    for name, data in [("Val", val), ("Test", test)]:
        labels = {s["label"] for s in data}
        if len(labels) < 2:
            logger.error(f"CRITICAL: {name} split is missing a class! Labels: {labels}")

    # 3. Train
    model = AutoModelForAudioClassification.from_pretrained(BASE_MODEL, num_labels=2).to(device)
    optimizer = torch.optim.AdamW(model.parameters(), lr=args.learning_rate)
    train_loader = DataLoader(VoxGuardDataset(train, AutoFeatureExtractor.from_pretrained(BASE_MODEL)), batch_size=args.batch_size, shuffle=True)
    val_loader = DataLoader(VoxGuardDataset(val, AutoFeatureExtractor.from_pretrained(BASE_MODEL)), batch_size=args.batch_size)

    for epoch in range(args.epochs):
        # ... TRAINING_EPOCH ...
        val_metrics = evaluate(model, val_loader, device)
        logger.info(f"Epoch {epoch+1}: Val F1={val_metrics.get('f1', 0):.4f}")

if __name__ == "__main__":
    parser = argparse.ArgumentParser()
    parser.add_argument("--languages", nargs="+", default=["Hindi"])
    parser.add_argument("--max-samples", type=int, default=100)
    parser.add_argument("--streaming", action="store_true")
    parser.add_argument("--epochs", type=int, default=1)
    parser.add_argument("--batch-size", type=int, default=8)
    parser.add_argument("--learning-rate", type=float, default=2e-5)
    args = parser.parse_args()
    train_pipeline(args)
