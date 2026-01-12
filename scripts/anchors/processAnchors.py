#!/usr/bin/env python3
"""Queue processor for Bitcoin/OpenTimestamps anchoring.

Usage:
  SUPABASE_URL=https://xxx.supabase.co \
  SUPABASE_SERVICE_ROLE_KEY=... \
    python3 scripts/processAnchors.py --limit 5

Requires the opentimestamps-client pipx environment bundled with the repo
(`ots` CLI). This script runs locally, stamps queued hashes via calendar
servers, and updates the `anchors` table with the serialized proof.
"""

import argparse
import base64
import json
import os
import sys
import urllib.request
from datetime import datetime
from types import SimpleNamespace

from opentimestamps.core.timestamp import Timestamp, DetachedTimestampFile
from opentimestamps.core.op import OpSHA256
from opentimestamps.core.serialize import BytesSerializationContext
from otsclient import cmds
from otsclient.cache import InMemoryCache

DEFAULT_CALENDARS = [
    'https://a.pool.opentimestamps.org',
    'https://b.pool.opentimestamps.org',
    'https://a.pool.eternitywall.com',
    'https://ots.btc.catallaxy.com'
]

SUPABASE_URL = os.environ.get('SUPABASE_URL')
SUPABASE_SERVICE_KEY = os.environ.get('SUPABASE_SERVICE_ROLE_KEY')

if not SUPABASE_URL or not SUPABASE_SERVICE_KEY:
    print('Missing SUPABASE_URL or SUPABASE_SERVICE_ROLE_KEY environment variables.', file=sys.stderr)
    sys.exit(1)

REST_BASE = SUPABASE_URL.rstrip('/') + '/rest/v1'
HEADERS = {
    'apikey': SUPABASE_SERVICE_KEY,
    'Authorization': f'Bearer {SUPABASE_SERVICE_KEY}',
    'Content-Type': 'application/json'
}


def fetch_queued(limit):
    url = f"{REST_BASE}/anchors?anchor_type=eq.opentimestamps&anchor_status=eq.queued&order=created_at.asc&limit={limit}"
    req = urllib.request.Request(url, headers=HEADERS)
    with urllib.request.urlopen(req) as resp:
        return json.loads(resp.read().decode('utf-8'))


def update_anchor(anchor_id, payload):
    url = f"{REST_BASE}/anchors?id=eq.{anchor_id}"
    req = urllib.request.Request(url, data=json.dumps(payload).encode('utf-8'), headers=HEADERS, method='PATCH')
    with urllib.request.urlopen(req):
        pass


def stamp_hash(document_hash, calendars, timeout):
    timestamp = Timestamp(bytes.fromhex(document_hash))
    args = SimpleNamespace(
        use_btc_wallet=False,
        setup_bitcoin=None,
        calendar_urls=list(calendars),
        timeout=timeout,
        m=2,
        wait=False,
        cache=InMemoryCache()
    )

    cmds.create_timestamp(timestamp, args.calendar_urls, args)

    detached = DetachedTimestampFile(OpSHA256(), timestamp)
    ctx = BytesSerializationContext()
    detached.serialize(ctx)
    return base64.b64encode(ctx.getbytes()).decode('ascii')


def main():
    parser = argparse.ArgumentParser(description='Process queued Bitcoin anchoring jobs.')
    parser.add_argument('--limit', type=int, default=5, help='Maximum anchors to process per run (default: 5)')
    parser.add_argument('--timeout', type=int, default=5, help='Calendar timeout in seconds (default: 5)')
    args = parser.parse_args()

    queued = fetch_queued(args.limit)
    if not queued:
        print('No queued anchors found.')
        return

    for row in queued:
        anchor_id = row['id']
        document_hash = row['document_hash']
        print(f"Stamping anchor {anchor_id} for hash {document_hash[:16]}…")
        try:
            proof_base64 = stamp_hash(document_hash, DEFAULT_CALENDARS, args.timeout)
            update_anchor(anchor_id, {
                'anchor_status': 'pending',
                'raw_proof': proof_base64,
                'metadata': {
                    **(row.get('metadata') or {}),
                    'calendars': DEFAULT_CALENDARS,
                    'lastAnchoredAt': datetime.utcnow().isoformat() + 'Z'
                }
            })
            print(f"  ✔ Stored OpenTimestamps proof for anchor {anchor_id}")
        except Exception as exc:
            print(f"  ✖ Failed to stamp anchor {anchor_id}: {exc}")
            update_anchor(anchor_id, {
                'anchor_status': 'failed',
                'metadata': {
                    **(row.get('metadata') or {}),
                    'anchorError': str(exc)
                }
            })


if __name__ == '__main__':
    main()
