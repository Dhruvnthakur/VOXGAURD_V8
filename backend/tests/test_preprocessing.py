import unittest
import numpy as np
from data.preprocessing import preprocess_audio

class TestPreprocessing(unittest.TestCase):
    def test_resampling_no_librosa(self):
        # 24kHz -> 16kHz
        sr_src = 24000
        sr_target = 16000
        audio = np.random.randn(sr_src).astype(np.float32)

        processed = preprocess_audio(audio, source_sr=sr_src, target_sr=sr_target)

        self.assertIsNotNone(processed)
        # Expected length for 1s of 24k audio resampled to 16k is 16000 samples
        self.assertEqual(len(processed), sr_target)
        self.assertEqual(processed.dtype, np.float32)

if __name__ == "__main__":
    unittest.main()
