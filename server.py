"""GreenWave local server: serves the app and downloads YouTube traffic videos on request."""
import http.server, json, os, re, subprocess, sys, threading, urllib.parse

ROOT = os.path.dirname(os.path.abspath(__file__))
VIDEOS = os.path.join(ROOT, 'videos')
os.makedirs(VIDEOS, exist_ok=True)
jobs = {}  # url -> {'status': 'running'|'done'|'error', 'file': name, 'msg': text, 'pct': n}
lock = threading.Lock()


def safe_name(title):
    return re.sub(r'[^A-Za-z0-9._ -]+', '', title).strip()[:60] or 'video'


def download(url):
    with lock:
        jobs[url] = {'status': 'running', 'pct': 0, 'msg': 'starting'}
    try:
        subprocess.run([sys.executable, '-m', 'pip', 'install', '-q', 'yt-dlp'], capture_output=True)
        info = subprocess.run([sys.executable, '-m', 'yt_dlp', '--no-playlist', '--print', '%(title)s', url], capture_output=True, text=True, timeout=120)
        title = safe_name(info.stdout.strip().splitlines()[-1] if info.stdout.strip() else 'video')
        out = os.path.join(VIDEOS, title + '.mp4')
        if os.path.exists(out):
            with lock:
                jobs[url] = {'status': 'done', 'pct': 100, 'file': title + '.mp4', 'msg': 'already downloaded'}
            return
        cmd = [sys.executable, '-m', 'yt_dlp', '-f', '18/b[height<=480][ext=mp4]/b', '--extractor-args', 'youtube:player_client=android,web', '--no-playlist', '--newline', '-o', out, url]
        p = subprocess.Popen(cmd, stdout=subprocess.PIPE, stderr=subprocess.STDOUT, text=True)
        for line in p.stdout:
            m = re.search(r'(\d+(?:\.\d+)?)%', line)
            if m:
                with lock:
                    jobs[url]['pct'] = float(m.group(1)); jobs[url]['msg'] = 'downloading'
        p.wait()
        if p.returncode == 0 and os.path.exists(out):
            with lock:
                jobs[url] = {'status': 'done', 'pct': 100, 'file': title + '.mp4', 'msg': 'ready'}
        else:
            with lock:
                jobs[url] = {'status': 'error', 'pct': 0, 'msg': 'download failed (check the link or your internet)'}
    except Exception as e:
        with lock:
            jobs[url] = {'status': 'error', 'pct': 0, 'msg': str(e)}


class H(http.server.SimpleHTTPRequestHandler):
    def __init__(self, *a, **k):
        super().__init__(*a, directory=ROOT, **k)

    def log_message(self, *a):
        pass

    def send_json(self, obj, code=200):
        b = json.dumps(obj).encode()
        self.send_response(code); self.send_header('Content-Type', 'application/json'); self.send_header('Content-Length', str(len(b))); self.end_headers(); self.wfile.write(b)

    def do_GET(self):
        u = urllib.parse.urlparse(self.path)
        q = urllib.parse.parse_qs(u.query)
        if u.path == '/api/fetch':
            url = (q.get('url') or [''])[0].strip()
            if not url.startswith('http'):
                return self.send_json({'status': 'error', 'msg': 'paste a full YouTube link'})
            with lock:
                j = jobs.get(url)
            if not j or j['status'] == 'error':
                threading.Thread(target=download, args=(url,), daemon=True).start()
                return self.send_json({'status': 'running', 'pct': 0, 'msg': 'starting'})
            return self.send_json(j)
        if u.path == '/api/videos':
            files = sorted(f for f in os.listdir(VIDEOS) if f.lower().endswith(('.mp4', '.webm', '.mkv', '.mov')))
            return self.send_json({'files': files})
        return super().do_GET()


if __name__ == '__main__':
    port = int(sys.argv[1]) if len(sys.argv) > 1 else 8765
    print(f'GreenWave server on http://localhost:{port}  (Ctrl+C to stop)')
    http.server.ThreadingHTTPServer(('127.0.0.1', port), H).serve_forever()
