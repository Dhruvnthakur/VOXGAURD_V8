import unittest
from data.indic_synth import load_indicsynth
from data.dataset_config import IndicSynthConfig

class TestIndicSynth(unittest.TestCase):
    def test_loader(self):
        config = IndicSynthConfig(enabled=True, languages=["Hindi"], max_samples=5)
        samples = list(load_indicsynth(languages=["Hindi"], max_samples=5, config=config))
        self.assertLessEqual(len(samples), 5)
        if len(samples) > 0:
            self.assertEqual(samples[0]["label"], 1) # FAKE
            self.assertEqual(samples[0]["language"], "Hindi")

if __name__ == "__main__":
    unittest.main()
