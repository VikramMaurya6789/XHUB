"""Push single files to VikramMaurya6789/XHUB via Contents API (bypasses gh.py 6k truncation)."""
import sys, json, base64
sys.path.insert(0, '/home/hatch/workspace/skills/github/bin')
sys.path.insert(0, '/opt/muse/skills/custom-connector-setup/bin')
from gh import api_request

REPO = '/repos/VikramMaurya6789/XHUB'

def get_sha(path):
    status, payload = api_request('GET', f'{REPO}/contents/{path}?ref=main')
    if status != 200:
        print(f'GET {path}: HTTP {status}', payload.get('message', ''))
        return None
    print(f'{path}: remote size={payload["size"]} sha={payload["sha"][:12]}')
    return payload['sha']

def put_file(path, local_path, message):
    sha = get_sha(path)
    if not sha:
        return False
    with open(local_path, 'rb') as f:
        content = base64.b64encode(f.read()).decode()
    print(f'uploading {path} ({len(content)} b64 chars)...')
    status, payload = api_request('PUT', f'{REPO}/contents/{path}', {
        'message': message,
        'content': content,
        'sha': sha,
        'branch': 'main',
    })
    if status in (200, 201):
        print(f'OK {path} -> commit {payload["commit"]["sha"][:10]}')
        return True
    print(f'PUT {path}: HTTP {status}', json.dumps(payload)[:500])
    return False

if __name__ == '__main__':
    # usage: push_files.py <path:local> [<path:local> ...]
    ok = True
    for arg in sys.argv[1:]:
        repo_path, local_path = arg.split(':', 1)
        ok &= put_file(repo_path, local_path,
                       f'fix: refresh streams for newest feed videos + repair sync pipeline')
    sys.exit(0 if ok else 1)
