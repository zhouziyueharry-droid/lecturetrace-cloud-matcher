import base64
import io
import json
import tempfile
import unittest
from pathlib import Path
from unittest.mock import patch

import numpy as np
from PIL import Image
import server


class MatcherTests(unittest.TestCase):
    def test_real_sift_preserves_separate_appearances_and_version(self):
        buffer = io.BytesIO()
        Image.fromarray(np.random.default_rng(17).integers(0, 256, (400, 400), dtype=np.uint8)).save(buffer, format='JPEG')
        raw = buffer.getvalue()
        digest = server.hashlib.sha256(raw).hexdigest()
        version = 'sha256:' + 'a' * 64
        snapshot = {'video_id': '123456abcdef', 'navigation': {'version': version,
            'evidence': {'pages': [{'id': 'S001', 'image': 'frame.jpg'}], 'sections': [
                {'id': 'S001.1', 'page': 'S001', 'jump': 2, 'display_end': 8},
                {'id': 'S001.2', 'page': 'S001', 'jump': 20, 'speech_end': 30}]},
            'image_hashes': {'frame.jpg': digest}}}
        body = {'snapshot': 'b' * 64, 'video_id': snapshot['video_id'], 'version': version,
                'image_base64': base64.b64encode(raw).decode(), 'offset': 0}
        with tempfile.TemporaryDirectory() as tmp, patch.object(server, 'ROOT', Path(tmp)), patch.object(server, 'asset', side_effect=lambda kind, _: raw if kind == 'images' else json.dumps(snapshot).encode()):
            result = server.locate(body)
            self.assertEqual([m['timestamp'] for m in result['matches']], [2, 20])
            self.assertEqual(result['skipped_images'], 0)
            self.assertEqual(result['version'], version)
            self.assertEqual(result['method'], 'sift_ransac')
            body['version'] = 'sha256:' + 'c' * 64
            with self.assertRaises(ValueError):
                server.locate(body)

    def test_invalid_requests_do_not_fetch_assets(self):
        with patch.object(server, 'asset') as fetch:
            for body in ({}, {'snapshot': '../secret', 'video_id': 'x', 'version': 'x', 'image_base64': 'url', 'offset': 0}):
                with self.assertRaises(ValueError):
                    server.locate(body)
            fetch.assert_not_called()
        with self.assertRaises(ValueError):
            server.asset('images', '../secret')


if __name__ == '__main__':
    unittest.main()
