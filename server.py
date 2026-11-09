"""Single-flight OpenCV service. Course assets stay in Sites R2, never in Git."""
import copy
import hashlib
import hmac
from http.server import BaseHTTPRequestHandler, ThreadingHTTPServer
import json
import os
from pathlib import Path
import re
import tempfile
import threading
from urllib.request import Request, build_opener, HTTPRedirectHandler

import geometry

HEX = re.compile(r'[0-9a-f]{64}')
ROOT = Path(tempfile.gettempdir()) / 'lecturetrace-matcher'
ROOT.mkdir(exist_ok=True)
geometry.artifacts.video_dir = lambda _: ROOT
geometry.cv2.setNumThreads(1)
LOCK = threading.Lock()


class NoRedirect(HTTPRedirectHandler):
    def redirect_request(self, *args, **kwargs):
        return None


def asset(kind, digest):
    if kind not in ('snapshots', 'images') or not isinstance(digest, str) or not HEX.fullmatch(digest):
        raise ValueError('Invalid asset reference')
    origin = os.environ['SITE_ORIGIN'].rstrip('/')
    if not re.fullmatch(r'https://[a-z0-9.-]+\.chatgpt\.site', origin):
        raise ValueError('Invalid configured Site origin')
    headers = {'X-Matcher-Token': os.environ['MATCHER_TOKEN'], 'User-Agent': 'LectureTraceMatcher/1.0'}
    if os.environ.get('SITES_SERVICE_TOKEN'):
        headers['OAI-Sites-Authorization'] = 'Bearer ' + os.environ['SITES_SERVICE_TOKEN']
    request = Request(origin + '/matcher/' + kind + '/' + digest, headers=headers)
    limit = (8 if kind == 'snapshots' else 3) * 1024 * 1024
    with build_opener(NoRedirect).open(request, timeout=30) as response:
        raw = response.read(limit + 1)
    if len(raw) > limit or hashlib.sha256(raw).hexdigest() != digest:
        raise ValueError('Invalid asset content hash or size')
    return raw


class Reader:
    def __init__(self, snapshot, version):
        nav = snapshot.get('navigation')
        if not nav or nav['version'] != version:
            raise ValueError('Evidence changed; retry from get_video_context')
        self.video_id = snapshot['video_id']
        self.version = version
        self.pages = {r['id']: copy.deepcopy(r) for r in nav['evidence']['pages']}
        self.sections = {r['id']: copy.deepcopy(r) for r in nav['evidence']['sections']}
        for record in [*self.pages.values(), *self.sections.values()]:
            if record.get('image'):
                digest = nav['image_hashes'][record['image']]
                if not isinstance(digest, str) or not HEX.fullmatch(digest):
                    raise ValueError('Invalid image reference')
                record['image'] = digest

    def _check_version(self):
        # The request and every asset are bound to one immutable SHA-256 snapshot.
        pass

    def _end(self, section):
        return max(float(section.get(k) or section['jump']) for k in ('display_end', 'speech_end'))


def locate(body):
    if not isinstance(body, dict) or set(body) != {'snapshot', 'video_id', 'version', 'image_base64', 'offset'}:
        raise ValueError('Invalid request fields')
    if type(body['offset']) is not int or body['offset'] < 0:
        raise ValueError('Invalid offset')
    # Validate the query before downloading any course images.
    if not isinstance(body['image_base64'], str) or len(body['image_base64']) > 4194304:
        raise ValueError('Image exceeds 3 MiB')
    try:
        raw = geometry.base64.b64decode(body['image_base64'], validate=True)
    except ValueError:
        raise ValueError('Invalid image base64') from None
    geometry.decode_image(raw)
    snapshot = json.loads(asset('snapshots', body['snapshot']))
    if snapshot['video_id'] != body['video_id']:
        raise ValueError('Wrong video snapshot')
    reader = Reader(snapshot, body['version'])
    needed = {r['image'] for r in [*reader.pages.values(), *reader.sections.values()] if r.get('image')}
    try:
        for digest in needed:
            path = ROOT / digest
            if not path.exists():
                path.write_bytes(asset('images', digest))
        return {'video_id': reader.video_id, 'version': reader.version,
                **geometry.locate(reader, body['image_base64'], body['offset'])}
    finally:
        # Immutable files can be cached safely; cap disk use across courses.
        files = sorted(ROOT.iterdir(), key=lambda p: p.stat().st_mtime, reverse=True)
        for path in files[256:]:
            path.unlink()


class Handler(BaseHTTPRequestHandler):
    def setup(self):
        super().setup()
        self.connection.settimeout(30)

    def log_message(self, *_):
        pass

    def reply(self, status, body):
        raw = json.dumps(body).encode()
        self.send_response(status)
        self.send_header('Content-Type', 'application/json')
        self.send_header('Content-Length', str(len(raw)))
        self.send_header('Cache-Control', 'no-store')
        self.end_headers()
        self.wfile.write(raw)

    def do_GET(self):
        self.reply(200 if self.path == '/health' else 404, {'ok': self.path == '/health'})

    def do_POST(self):
        expected = os.environ.get('MATCHER_TOKEN', '')
        if not expected or not hmac.compare_digest(self.headers.get('X-Matcher-Token', ''), expected):
            return self.reply(401, {'error': 'Unauthorized'})
        if self.path != '/locate':
            return self.reply(404, {'error': 'Not found'})
        try:
            length = int(self.headers.get('Content-Length', '0'))
            if self.headers.get('Transfer-Encoding') or not 0 < length <= 4259840:
                return self.reply(413, {'error': 'Invalid request size'})
        except ValueError:
            return self.reply(400, {'error': 'Invalid content length'})
        if not LOCK.acquire(blocking=False):
            return self.reply(503, {'error': 'Matcher busy; retry shortly'})
        try:
            body = json.loads(self.rfile.read(length))
            self.reply(200, locate(body))
        except (ValueError, KeyError, TypeError):
            self.reply(400, {'error': 'Invalid image, snapshot or evidence version'})
        except Exception as error:
            print(json.dumps({'event': 'matcher_failed', 'type': type(error).__name__, 'http_status': getattr(error, 'code', None)}), flush=True)
            self.reply(502, {'error': 'Course assets unavailable; retry shortly', 'failure_type': type(error).__name__, 'upstream_status': getattr(error, 'code', None)})
        finally:
            LOCK.release()


if __name__ == '__main__':
    ThreadingHTTPServer(('0.0.0.0', int(os.environ.get('PORT', '10000'))), Handler).serve_forever()
