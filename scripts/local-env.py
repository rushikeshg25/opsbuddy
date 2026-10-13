#!/usr/bin/env python3
"""Create local-only configuration without overwriting existing files."""
from pathlib import Path
import os
import secrets
import shlex

ROOT = Path(__file__).resolve().parents[1]

def main():
    target = ROOT / '.local'
    target.mkdir(mode=0o700, exist_ok=True)
    values = {
        'APP_ENV': 'local', 'GIN_MODE': 'release', 'PORT': '8080',
        'DB_HOST': '127.0.0.1', 'DB_PORT': '5433',
        'DB_DATABASE': 'opsbuddy_local', 'DB_NAME': 'opsbuddy_local',
        'DB_USERNAME': 'postgres', 'DB_USER': 'postgres',
        'DB_PASSWORD': 'local-opsbuddy-password', 'DB_SCHEMA': 'public', 'DB_SSLMODE': 'disable',
        'REDIS_HOST': '127.0.0.1', 'REDIS_PORT': '6379', 'REDIS_PASSWORD': '',
        'KAFKA_BROKERS': 'localhost:9094', 'KAFKA_TOPIC': 'notifications',
        'JWT_SECRET': secrets.token_hex(32), 'SESSION_SECRET': secrets.token_hex(32),
        'GOOGLE_CLIENT_ID': '', 'GOOGLE_CLIENT_SECRET': '',
        'SMTP_FROM_EMAIL': '', 'SMTP_FROM_PASSWORD': '',
        'GEMINI_API_KEY': '', 'GOOGLE_API_KEY': '', 'GOOGLE_GENAI_USE_VERTEXAI': 'false',
        'GEMINI_MODEL': 'gemini-2.5-flash',
        'NEXT_PUBLIC_API_URL': 'http://localhost:8080',
    }
    for name, contents in {
        'env.sh': '# Generated local settings. Source from the repository root.\n' + ''.join(
            f'export {key}={shlex.quote(value)}\n' for key, value in values.items()),
        'ai.env': '# Optional: add your Gemini key locally; never commit this file.\nexport GEMINI_API_KEY=\'\'\n',
    }.items():
        path = target / name
        try:
            fd = os.open(path, os.O_WRONLY | os.O_CREAT | os.O_EXCL, 0o600)
        except FileExistsError:
            print(f'Kept existing {path.relative_to(ROOT)}')
            continue
        with os.fdopen(fd, 'w') as f:
            f.write(contents)
        print(f'Created {path.relative_to(ROOT)}')

if __name__ == '__main__':
    main()
