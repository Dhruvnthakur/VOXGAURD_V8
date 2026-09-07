"""
Evaluation metrics for multilingual deepfake detection.
"""

from typing import List, Dict
from sklearn.metrics import accuracy_score, precision_recall_fscore_support, roc_auc_score

def calculate_metrics(y_true: List[int], y_pred: List[int], y_probs: List[float]) -> Dict:
    precision, recall, f1, _ = precision_recall_fscore_support(y_true, y_pred, average='binary')
    return {
        "accuracy": accuracy_score(y_true, y_pred),
        "precision": precision,
        "recall": recall,
        "f1": f1,
        "roc_auc": roc_auc_score(y_true, y_probs)
    }
