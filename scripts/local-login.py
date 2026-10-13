#!/usr/bin/env python3
"""One-shot, loopback-only browser login for the seeded local test account.
Does not change API authentication or require Google OAuth credentials.
"""
import base64
import hashlib
import hmac
from http.server import BaseHTTPRequestHandler, HTTPServer
import json
import os
import secrets
import time


def make_token(secret):
    def encode(value):
        return base64.urlsafe_b64encode(json.dumps(value, separators=(',', ':')).encode()).rstrip(b'=')
    now = int(time.time())
    payload = encode({'user_id': '1', 'user_name': 'Test User', 'iat': now, 'nbf': now, 'exp': now + 86400})
    message = encode({'alg': 'HS256', 'typ': 'JWT'}) + b'.' + payload
    signature = base64.urlsafe_b64encode(hmac.new(secret.encode(), message, hashlib.sha256).digest()).rstrip(b'=')
    return (message + b'.' + signature).decode()


def main():
    if os.environ.get('APP_ENV') != 'local' or os.environ.get('DB_DATABASE') != 'opsbuddy_local' or os.environ.get('DB_HOST') != '127.0.0.1':
        raise SystemExit('Refusing non-local configuration. Source .local/env.sh first.')
    secret = os.environ.get('JWT_SECRET', '')
    if len(secret) < 32:
        raise SystemExit('A local JWT_SECRET of at least 32 characters is required.')
    login_path = '/login/' + secrets.token_urlsafe(24)
    completed = False

    class Handler(BaseHTTPRequestHandler):
        def log_message(self, *args):
            pass  # Do not put the one-use login URL or cookie in access logs.

        def do_GET(self):
            nonlocal completed
            if self.headers.get('Host') != 'localhost:8090' or self.path != login_path:
                self.send_error(404)
                return
            self.send_response(302)
            self.send_header('Set-Cookie', 'auth_token=' + make_token(secret) + '; Path=/; HttpOnly; SameSite=Lax; Max-Age=86400')
            self.send_header('Cache-Control', 'no-store')
            self.send_header('Referrer-Policy', 'no-referrer')
            self.send_header('Location', 'http://localhost:3000/services')
            self.end_headers()
            completed = True

    with HTTPServer(('127.0.0.1', 8090), Handler) as server:
        server.timeout = 1
        print('Open this one-use local URL in the browser:', flush=True)
        print('http://localhost:8090' + login_path, flush=True)
        deadline = time.monotonic() + 300
        while not completed and time.monotonic() < deadline:
            server.handle_request()
        if not completed:
            raise SystemExit('Local login expired after five minutes. Run the helper again.')

if __name__ == '__main__':
    main()
