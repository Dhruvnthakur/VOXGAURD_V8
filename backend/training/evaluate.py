"""
Evaluation metrics for multilingual deepfake detection.
"""

from typing import List, Dict
from sklearn.metrics import accuracy_score, precision_recall_fscore_support, roc_auc_score
import torch


def calculate_metrics(y_true: List[int], y_pred: List[int], y_probs: List[float]) -> Dict:
    precision, recall, f1, _ = precision_recall_fscore_support(y_true, y_pred, average='binary')
    return {
        "accuracy": accuracy_score(y_true, y_pred),
        "precision": precision,
        "recall": recall,
        "f1": f1,
        "roc_auc": roc_auc_score(y_true, y_probs)
    }


@torch.no_grad()
def evaluate(model, dataloader, device) -> Dict:
    """
    Run evaluation on a validation dataset.

    Returns dict with metrics: accuracy, precision, recall, f1, roc_auc.
    """
    model.eval()
    all_labels = []
    all_preds = []
    all_probs = []

    for batch in dataloader:
        inputs = {k: v.to(device) for k, v in batch.items()}
        inputs["labels"] = inputs["labels"].to(device)

        outputs = model(**inputs)
        logits = outputs.logits if hasattr(outputs, "logits") else outputs[0]

        probs = torch.softmax(logits, dim=-1)[:, 1].cpu().numpy()
        preds = (probs > 0.5).astype(int)

        all_labels.extend(inputs["labels"].cpu().numpy().tolist())
        all_preds.extend(preds.tolist())
        all_probs.extend(probs.tolist())

    return calculate_metrics(all_labels, all_preds, all_probs)
