#!/usr/bin/env python3
"""
Faster population script using asyncio + aiohttp.

Usage:
  pip install aiohttp
  python scripts/populate_db_fast.py --api http://localhost:8000 --users 50 --min-posts 1 --max-posts 6 --concurrency 200

Notes:
- Sends many requests concurrently; tune --concurrency to avoid overwhelming your DB.
- If the backend is single-threaded or limited, increase uvicorn workers, or reduce concurrency.
"""

import argparse
import asyncio
import random
import string
from datetime import datetime, timedelta

import aiohttp

ALPHANUM_UNDER = string.ascii_letters + string.digits + '_'
LOREM = (
    "In a strange dream I found myself walking through an endless library, "
    "where each book opened to a memory I had never lived. The shelves hummed, "
    "and shadows moved like sentences. Suddenly I was flying and the city below "
    "was stitched from clockwork and glass."
)
TAGS_POOL = ['flying', 'lucid', 'nightmare', 'space', 'work', 'friend', 'sea', 'animal', 'family', 'chase']


def rand_username(i):
    suffix = ''.join(random.choices(string.ascii_lowercase + string.digits, k=5))
    return f'user{i}_{suffix}'


def rand_password(length=10):
    return ''.join(random.choices(ALPHANUM_UNDER, k=length))


def rand_date(start_year=2020):
    start = datetime(start_year, 1, 1)
    end = datetime.now()
    delta = end - start
    days = random.randrange(delta.days + 1)
    d = start + timedelta(days=days)
    return d.date().isoformat()


def rand_time():
    h = random.randrange(0, 24)
    m = random.choice([0, 15, 30, 45])
    return f"{h:02d}:{m:02d}"


def rand_text():
    words = LOREM.split()
    length = random.randint(20, 200)
    out = []
    while len(' '.join(out).split()) < length:
        out.append(random.choice(words))
    return ' '.join(out)[:5000]


def rand_tags():
    count = random.randint(0, 3)
    return ','.join(random.sample(TAGS_POOL, count))


async def register_user(session, api_base, username, password, sem):
    url = f"{api_base.rstrip('/')}/register"
    payload = {"username": username, "password": password}
    async with sem:
        async with session.post(url, json=payload) as r:
            if r.status == 200:
                try:
                    data = await r.json()
                    token = data.get('access_token') or data.get('token')
                    return True, token
                except Exception:
                    return True, None
            else:
                text = await r.text()
                return False, text


async def login_user(session, api_base, username, password, sem):
    url = f"{api_base.rstrip('/')}/login"
    payload = {"username": username, "password": password}
    async with sem:
        async with session.post(url, json=payload) as r:
            if r.status == 200:
                data = await r.json()
                return True, data.get('access_token')
            else:
                text = await r.text()
                return False, text


async def create_post(session, api_base, token, entry, sem):
    url = f"{api_base.rstrip('/')}/sleep/add"
    headers = {"Authorization": f"Bearer {token}"} if token else {}
    async with sem:
        async with session.post(url, json=entry, headers=headers) as r:
            ok = r.status == 200
            txt = await r.text()
            return ok, txt


async def create_user_and_posts(i, api_base, min_posts, max_posts, start_year, make_public_prob, session, sem):
    username = rand_username(i)
    password = "12345678"
    ok, token_or_err = await register_user(session, api_base, username, password, sem)
    if not ok:
        # try login
        ok2, token_or_err = await login_user(session, api_base, username, password, sem)
        if not ok2:
            return {'username': username, 'created': False, 'reason': token_or_err}
    token = token_or_err
    posts = random.randint(min_posts, max_posts)
    tasks = []
    for _ in range(posts):
        entry = {
            'date': rand_date(start_year),
            'sleep_time': rand_time(),
            'wake_time': rand_time(),
            'dream_text': rand_text(),
            'tags': rand_tags(),
            'mood': random.randint(-10, 10),
            'realism': random.randint(-10, 10),
            'public': random.random() < make_public_prob
        }
        tasks.append(create_post(session, api_base, token, entry, sem))
    results = await asyncio.gather(*tasks)
    created = sum(1 for ok, _ in results if ok)
    return {'username': username, 'created': True, 'token': bool(token), 'posts_created': created, 'attempted': posts}


async def main():
    parser = argparse.ArgumentParser()
    parser.add_argument('--api', default='http://localhost:8000')
    parser.add_argument('--users', type=int, default=50)
    parser.add_argument('--min-posts', type=int, default=1)
    parser.add_argument('--max-posts', type=int, default=5)
    parser.add_argument('--start-year', type=int, default=2020)
    parser.add_argument('--make-public-prob', type=float, default=0.5)
    parser.add_argument('--concurrency', type=int, default=200)
    args = parser.parse_args()

    sem = asyncio.Semaphore(args.concurrency)
    connector = aiohttp.TCPConnector(limit=args.concurrency)
    timeout = aiohttp.ClientTimeout(total=60)
    async with aiohttp.ClientSession(connector=connector, timeout=timeout) as session:
        tasks = [create_user_and_posts(i, args.api, args.min_posts, args.max_posts, args.start_year, args.make_public_prob, session, sem) for i in range(1, args.users + 1)]
        results = []
        for chunk in [tasks[i:i+100] for i in range(0, len(tasks), 100)]:
            res = await asyncio.gather(*chunk)
            results.extend(res)
            print(f"Completed chunk of {len(chunk)} users")

    total_users = len([r for r in results if r.get('created')])
    total_posts = sum(r.get('posts_created', 0) for r in results if r.get('created'))
    print(f"Done. Users created: {total_users}, posts created: {total_posts}")


if __name__ == '__main__':
    asyncio.run(main())
