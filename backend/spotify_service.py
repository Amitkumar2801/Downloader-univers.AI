import os
import re
import json
import time
import requests
from bs4 import BeautifulSoup

SPOTIFY_TOKEN_CACHE = {
    'token': None,
    'expires_at': 0
}

DEFAULT_HEADERS = {
    "User-Agent": "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36",
    "Accept": "text/html,application/xhtml+xml,application/xml;q=0.9,image/webp,*/*;q=0.8",
    "Accept-Language": "en-US,en;q=0.9"
}

def is_spotify_url(url: str) -> bool:
    if not url or not isinstance(url, str):
        return False
    u = url.lower().strip()
    return 'spotify.com' in u or 'spotify.link' in u or u.startswith('spotify:')

def resolve_spotify_url(url: str) -> str:
    """Resolve spotify.link short URLs to full open.spotify.com URLs."""
    url = url.strip()
    if 'spotify.link' in url.lower():
        try:
            res = requests.head(url, headers=DEFAULT_HEADERS, allow_redirects=True, timeout=8)
            if res.url:
                return res.url
        except Exception as e:
            print(f"[SPOTIFY] Error resolving shortlink: {e}")
    return url

def parse_spotify_url(url: str):
    """
    Returns (item_type, item_id)
    e.g. ('track', '4cOdK2wGLETKBW3PvgPWqT'), ('album', '...'), ('playlist', '...')
    """
    url = resolve_spotify_url(url)
    
    # Check URI format spotify:track:id
    uri_match = re.search(r'spotify:(track|album|playlist|episode):([a-zA-Z0-9]+)', url)
    if uri_match:
        return uri_match.group(1), uri_match.group(2)
        
    # Check Web URL open.spotify.com/(intl-xx/)?(track|album|playlist|episode)/id
    url_match = re.search(r'/(track|album|playlist|episode)/([a-zA-Z0-9]+)', url)
    if url_match:
        return url_match.group(1), url_match.group(2)
        
    return None, None

def get_anonymous_spotify_token() -> str:
    """Fetch or return cached anonymous web player access token from Spotify."""
    global SPOTIFY_TOKEN_CACHE
    now = time.time()
    if SPOTIFY_TOKEN_CACHE['token'] and now < SPOTIFY_TOKEN_CACHE['expires_at'] - 60:
        return SPOTIFY_TOKEN_CACHE['token']
        
    try:
        url = "https://open.spotify.com/get_access_token?reason=transport&productType=web_player"
        res = requests.get(url, headers=DEFAULT_HEADERS, timeout=8)
        if res.status_code == 200:
            data = res.json()
            token = data.get('accessToken')
            expires_ms = data.get('accessTokenExpirationTimestampMs')
            if token:
                expires_at = (expires_ms / 1000) if expires_ms else (now + 3600)
                SPOTIFY_TOKEN_CACHE['token'] = token
                SPOTIFY_TOKEN_CACHE['expires_at'] = expires_at
                print("[SPOTIFY] Successfully acquired anonymous web access token.")
                return token
    except Exception as e:
        print(f"[SPOTIFY] Failed to fetch anonymous token: {e}")
        
    return None

def get_spotify_audio_formats(duration_secs: int = 0):
    """Return standard audio and Lo-Fi format choices for a Spotify track."""
    return [
        {
            'format_id': 'spotify_320k',
            'ext': 'mp3',
            'format_note': '320kbps MP3 (Studio Master Ultra HD)',
            'filesize': int(duration_secs * 40000) if duration_secs else None,
            'is_lofi': False,
            'quality_badge': 'Ultra HD'
        },
        {
            'format_id': 'spotify_256k',
            'ext': 'mp3',
            'format_note': '256kbps MP3 (High Quality)',
            'filesize': int(duration_secs * 32000) if duration_secs else None,
            'is_lofi': False,
            'quality_badge': 'HQ Audio'
        },
        {
            'format_id': 'spotify_192k',
            'ext': 'mp3',
            'format_note': '192kbps MP3 (Standard Quality)',
            'filesize': int(duration_secs * 24000) if duration_secs else None,
            'is_lofi': False,
            'quality_badge': 'Standard'
        },
        {
            'format_id': 'spotify_flac',
            'ext': 'flac',
            'format_note': 'Lossless FLAC (Studio Master Audio)',
            'filesize': int(duration_secs * 110000) if duration_secs else None,
            'is_lofi': False,
            'quality_badge': 'Lossless'
        },
        {
            'format_id': 'spotify_m4a',
            'ext': 'm4a',
            'format_note': 'Apple AAC / M4A (192kbps High Quality)',
            'filesize': int(duration_secs * 24000) if duration_secs else None,
            'is_lofi': False,
            'quality_badge': 'Apple AAC'
        },
        {
            'format_id': 'spotify_wav',
            'ext': 'wav',
            'format_note': 'Studio WAV (Lossless Uncompressed)',
            'filesize': int(duration_secs * 176400) if duration_secs else None,
            'is_lofi': False,
            'quality_badge': 'Studio WAV'
        },
        {
            'format_id': 'lofi_320k',
            'ext': 'mp3',
            'format_note': 'Lo-Fi Chill Edition (Slowed + Reverb 320k)',
            'filesize': int(duration_secs * 40000) if duration_secs else None,
            'is_lofi': True,
            'quality_badge': 'Lo-Fi Chill'
        }
    ]

def fetch_spotify_track(track_id: str, original_url: str):
    """
    Fetch track details with multiple fallback layers:
    1. Spotify Web API (via anonymous token)
    2. Spotify Embed page (Next.js SSR payload)
    3. Spotify oEmbed API
    4. OpenGraph and JSON-LD HTML scraping
    """
    title = None
    artists = None
    album = None
    cover_url = None
    duration = 0
    year = ''

    # Layer 1: Spotify Web API
    token = get_anonymous_spotify_token()
    if token:
        try:
            api_url = f"https://api.spotify.com/v1/tracks/{track_id}"
            headers = {**DEFAULT_HEADERS, "Authorization": f"Bearer {token}"}
            res = requests.get(api_url, headers=headers, timeout=8)
            if res.status_code == 200:
                data = res.json()
                title = data.get('name')
                artist_list = [a.get('name') for a in data.get('artists', []) if a.get('name')]
                artists = ", ".join(artist_list) if artist_list else 'Unknown Artist'
                
                album_data = data.get('album', {})
                album = album_data.get('name') or 'Single'
                release_date = album_data.get('release_date', '')
                year = release_date[:4] if release_date else ''
                
                images = album_data.get('images', [])
                if images:
                    cover_url = images[0].get('url') # 640x640 is usually first
                    
                duration_ms = data.get('duration_ms', 0)
                duration = int(duration_ms / 1000) if duration_ms else 0
                
                print(f"[SPOTIFY] API matched track: {title} by {artists}")
        except Exception as e:
            print(f"[SPOTIFY] Web API track query failed: {e}")

    # Layer 2: Spotify Embed page
    if not title or not artists:
        try:
            embed_url = f"https://open.spotify.com/embed/track/{track_id}"
            res = requests.get(embed_url, headers=DEFAULT_HEADERS, timeout=8)
            if res.status_code == 200:
                soup = BeautifulSoup(res.text, 'html.parser')
                next_data = soup.find('script', id='__NEXT_DATA__')
                if next_data and next_data.string:
                    payload = json.loads(next_data.string)
                    entity = payload.get('props', {}).get('pageProps', {}).get('state', {}).get('data', {}).get('entity', {})
                    if entity:
                        title = title or entity.get('name')
                        artist_list = [a.get('name') for a in entity.get('artists', []) if a.get('name')]
                        artists = artists or (", ".join(artist_list) if artist_list else None)
                        album = album or entity.get('album', {}).get('name')
                        images = entity.get('album', {}).get('images', [])
                        if images and not cover_url:
                            cover_url = images[0].get('url')
                        duration_ms = entity.get('duration', 0)
                        if duration_ms and not duration:
                            duration = int(duration_ms / 1000)
        except Exception as e:
            print(f"[SPOTIFY] Embed page parsing error: {e}")

    # Layer 3: Spotify oEmbed
    if not title or not artists or not cover_url:
        try:
            oembed_url = f"https://open.spotify.com/oembed?url=https://open.spotify.com/track/{track_id}"
            res = requests.get(oembed_url, headers=DEFAULT_HEADERS, timeout=8)
            if res.status_code == 200:
                odata = res.json()
                raw_title = odata.get('title')
                author = odata.get('author_name')
                cover_url = cover_url or odata.get('thumbnail_url')
                
                if raw_title and not title:
                    # Often "Song Name" or "Song Name by Artist"
                    if ' by ' in raw_title:
                        parts = raw_title.split(' by ')
                        title = parts[0].strip()
                        artists = artists or parts[1].strip()
                    else:
                        title = raw_title.strip()
                        artists = artists or author
        except Exception as e:
            print(f"[SPOTIFY] oEmbed fallback error: {e}")

    # Layer 4: OpenGraph / HTML scraping
    if not title or not artists or not cover_url:
        try:
            page_url = f"https://open.spotify.com/track/{track_id}"
            res = requests.get(page_url, headers=DEFAULT_HEADERS, timeout=8)
            if res.status_code == 200:
                soup = BeautifulSoup(res.text, 'html.parser')
                
                # Check JSON-LD
                for script in soup.find_all('script', type='application/ld+json'):
                    try:
                        ld = json.loads(script.string)
                        if ld.get('@type') == 'MusicRecording':
                            title = title or ld.get('name')
                            by_artist = ld.get('byArtist', [])
                            if isinstance(by_artist, list):
                                artists = artists or ", ".join([a.get('name') for a in by_artist if a.get('name')])
                            elif isinstance(by_artist, dict):
                                artists = artists or by_artist.get('name')
                            cover_url = cover_url or ld.get('image')
                            if ld.get('duration') and not duration:
                                # ISO 8601 duration e.g. PT3M25S
                                dur_str = ld.get('duration')
                                m = re.search(r'PT(?:(\d+)M)?(?:(\d+)S)?', dur_str)
                                if m:
                                    mins = int(m.group(1) or 0)
                                    secs = int(m.group(2) or 0)
                                    duration = mins * 60 + secs
                    except Exception:
                        pass

                # Check Meta tags
                og_title = soup.find('meta', property='og:title')
                if og_title and not title:
                    title = og_title.get('content')
                    
                og_image = soup.find('meta', property='og:image')
                if og_image and not cover_url:
                    cover_url = og_image.get('content')
                    
                og_desc = soup.find('meta', property='og:description')
                if og_desc and not artists:
                    desc_content = og_desc.get('content', '')
                    # Format: "Song · Artist · Album · Year" or "Artist · Song · Year"
                    parts = [p.strip() for p in re.split(r"[·•|]", desc_content)]
                    if len(parts) >= 2:
                        artists = parts[1] if parts[0].lower() == (title or '').lower() else parts[0]
        except Exception as e:
            print(f"[SPOTIFY] OpenGraph scraping error: {e}")

    # Fallback defaults if title still not resolved
    if not title:
        title = f"Spotify Track {track_id}"
    if not artists:
        artists = "Spotify Artist"
    if not album:
        album = "Spotify Music"
        
    formats = get_spotify_audio_formats(duration)

    return {
        'type': 'spotify_track',
        'is_spotify': True,
        'title': f"{artists} - {title}" if artists and title and artists not in title else title,
        'song_title': title,
        'artist': artists,
        'uploader': artists,
        'album': album,
        'year': year,
        'thumbnail': cover_url or 'https://storage.googleapis.com/pr-newsroom-wp/1/2018/11/Spotify_Logo_RGB_Green.png',
        'duration': duration,
        'url': original_url,
        'search_query': f"{artists} - {title} official audio",
        'formats': {
            'video': [],
            'audio': formats
        }
    }

def fetch_spotify_album(album_id: str, original_url: str):
    """Fetch Spotify album and its tracks."""
    title = None
    artists = None
    cover_url = None
    tracks = []
    
    # Layer 1: Spotify Web API
    token = get_anonymous_spotify_token()
    if token:
        try:
            api_url = f"https://api.spotify.com/v1/albums/{album_id}"
            headers = {**DEFAULT_HEADERS, "Authorization": f"Bearer {token}"}
            res = requests.get(api_url, headers=headers, timeout=8)
            if res.status_code == 200:
                data = res.json()
                title = data.get('name')
                artist_list = [a.get('name') for a in data.get('artists', []) if a.get('name')]
                artists = ", ".join(artist_list) if artist_list else 'Various Artists'
                images = data.get('images', [])
                if images:
                    cover_url = images[0].get('url')
                    
                tracks_data = data.get('tracks', {})
                items = list(tracks_data.get('items', []))
                next_url = tracks_data.get('next')
                page = 1
                while next_url and page < 10:
                    try:
                        next_res = requests.get(next_url, headers=headers, timeout=8)
                        if next_res.status_code == 200:
                            next_data = next_res.json()
                            items.extend(next_data.get('items', []))
                            next_url = next_data.get('next')
                            page += 1
                        else:
                            break
                    except Exception:
                        break

                for t in items:
                    t_id = t.get('id')
                    t_name = t.get('name')
                    t_dur = int(t.get('duration_ms', 0) / 1000) if t.get('duration_ms') else 0
                    t_artists = ", ".join([a.get('name') for a in t.get('artists', []) if a.get('name')]) or artists
                    tracks.append({
                        'id': t_id,
                        'title': f"{t_artists} - {t_name}",
                        'song_title': t_name,
                        'artist': t_artists,
                        'album': title,
                        'thumbnail': cover_url,
                        'duration': t_dur,
                        'url': f"https://open.spotify.com/track/{t_id}",
                        'search_query': f"{t_artists} - {t_name} official audio"
                    })
        except Exception as e:
            print(f"[SPOTIFY] Album Web API error: {e}")

    # Layer 2: Spotify Embed page
    if not tracks:
        try:
            embed_url = f"https://open.spotify.com/embed/album/{album_id}"
            res = requests.get(embed_url, headers=DEFAULT_HEADERS, timeout=8)
            if res.status_code == 200:
                soup = BeautifulSoup(res.text, 'html.parser')
                next_data = soup.find('script', id='__NEXT_DATA__')
                if next_data and next_data.string:
                    payload = json.loads(next_data.string)
                    entity = payload.get('props', {}).get('pageProps', {}).get('state', {}).get('data', {}).get('entity', {})
                    if entity:
                        title = title or entity.get('name')
                        images = entity.get('images', [])
                        if images and not cover_url:
                            cover_url = images[0].get('url')
                        track_list = entity.get('trackList', [])
                        for t in track_list:
                            t_title = t.get('title')
                            t_subtitle = t.get('subtitle') or artists or ''
                            t_dur = int(t.get('duration', 0) / 1000) if t.get('duration') else 0
                            t_uri = t.get('uri', '')
                            t_id = t_uri.split(':')[-1] if ':' in t_uri else f"track_{len(tracks)+1}"
                            tracks.append({
                                'id': t_id,
                                'title': f"{t_subtitle} - {t_title}" if t_subtitle else t_title,
                                'song_title': t_title,
                                'artist': t_subtitle,
                                'album': title or 'Spotify Album',
                                'thumbnail': cover_url,
                                'duration': t_dur,
                                'url': f"https://open.spotify.com/track/{t_id}",
                                'search_query': f"{t_subtitle} - {t_title} official audio"
                            })
        except Exception as e:
            print(f"[SPOTIFY] Embed album error: {e}")

    if not title:
        title = f"Spotify Album {album_id}"
        
    return {
        'type': 'playlist',
        'is_spotify': True,
        'title': f"{artists} - {title}" if artists and artists not in title else title,
        'thumbnail': cover_url or 'https://storage.googleapis.com/pr-newsroom-wp/1/2018/11/Spotify_Logo_RGB_Green.png',
        'uploader': artists or 'Spotify',
        'entries': tracks
    }

def fetch_spotify_playlist(playlist_id: str, original_url: str):
    """Fetch Spotify playlist and its tracks."""
    title = None
    owner = None
    cover_url = None
    tracks = []

    # Layer 1: Spotify Web API
    token = get_anonymous_spotify_token()
    if token:
        try:
            api_url = f"https://api.spotify.com/v1/playlists/{playlist_id}"
            headers = {**DEFAULT_HEADERS, "Authorization": f"Bearer {token}"}
            res = requests.get(api_url, headers=headers, timeout=8)
            if res.status_code == 200:
                data = res.json()
                title = data.get('name')
                owner = data.get('owner', {}).get('display_name') or 'Spotify Curator'
                images = data.get('images', [])
                if images:
                    cover_url = images[0].get('url')
                    
                tracks_data = data.get('tracks', {})
                items = list(tracks_data.get('items', []))
                next_url = tracks_data.get('next')
                page = 1
                while next_url and page < 20: # Support up to 2000 tracks seamlessly
                    try:
                        next_res = requests.get(next_url, headers=headers, timeout=8)
                        if next_res.status_code == 200:
                            next_data = next_res.json()
                            items.extend(next_data.get('items', []))
                            next_url = next_data.get('next')
                            page += 1
                        else:
                            break
                    except Exception:
                        break

                for item in items:
                    t = item.get('track')
                    if t and t.get('id'):
                        t_id = t.get('id')
                        t_name = t.get('name')
                        t_artists = ", ".join([a.get('name') for a in t.get('artists', []) if a.get('name')])
                        t_dur = int(t.get('duration_ms', 0) / 1000) if t.get('duration_ms') else 0
                        t_images = t.get('album', {}).get('images', [])
                        t_cover = t_images[0].get('url') if t_images else cover_url
                        t_album = t.get('album', {}).get('name', '')
                        tracks.append({
                            'id': t_id,
                            'title': f"{t_artists} - {t_name}" if t_artists else t_name,
                            'song_title': t_name,
                            'artist': t_artists,
                            'album': t_album,
                            'thumbnail': t_cover,
                            'duration': t_dur,
                            'url': f"https://open.spotify.com/track/{t_id}",
                            'search_query': f"{t_artists} - {t_name} official audio"
                        })
        except Exception as e:
            print(f"[SPOTIFY] Playlist Web API error: {e}")

    # Layer 2: Spotify Embed page
    if not tracks:
        try:
            embed_url = f"https://open.spotify.com/embed/playlist/{playlist_id}"
            res = requests.get(embed_url, headers=DEFAULT_HEADERS, timeout=8)
            if res.status_code == 200:
                soup = BeautifulSoup(res.text, 'html.parser')
                next_data = soup.find('script', id='__NEXT_DATA__')
                if next_data and next_data.string:
                    payload = json.loads(next_data.string)
                    entity = payload.get('props', {}).get('pageProps', {}).get('state', {}).get('data', {}).get('entity', {})
                    if entity:
                        title = title or entity.get('name')
                        images = entity.get('images', [])
                        if images and not cover_url:
                            cover_url = images[0].get('url')
                        track_list = entity.get('trackList', [])
                        for t in track_list:
                            t_title = t.get('title')
                            t_subtitle = t.get('subtitle') or 'Spotify Artist'
                            t_dur = int(t.get('duration', 0) / 1000) if t.get('duration') else 0
                            t_uri = t.get('uri', '')
                            t_id = t_uri.split(':')[-1] if ':' in t_uri else f"track_{len(tracks)+1}"
                            tracks.append({
                                'id': t_id,
                                'title': f"{t_subtitle} - {t_title}" if t_subtitle else t_title,
                                'song_title': t_title,
                                'artist': t_subtitle,
                                'album': title or 'Spotify Playlist',
                                'thumbnail': cover_url,
                                'duration': t_dur,
                                'url': f"https://open.spotify.com/track/{t_id}",
                                'search_query': f"{t_subtitle} - {t_title} official audio"
                            })
        except Exception as e:
            print(f"[SPOTIFY] Embed playlist error: {e}")

    if not title:
        title = f"Spotify Playlist {playlist_id}"

    return {
        'type': 'playlist',
        'is_spotify': True,
        'title': title,
        'thumbnail': cover_url or 'https://storage.googleapis.com/pr-newsroom-wp/1/2018/11/Spotify_Logo_RGB_Green.png',
        'uploader': owner or 'Spotify Playlist',
        'entries': tracks
    }

def handle_spotify_info(url: str):
    """Main entrypoint for /api/info when a Spotify link is requested."""
    resolved_url = resolve_spotify_url(url)
    item_type, item_id = parse_spotify_url(resolved_url)
    
    if not item_type or not item_id:
        raise ValueError("Could not parse Spotify Track, Album, or Playlist ID from URL.")
        
    if item_type in ('track', 'episode'):
        return fetch_spotify_track(item_id, resolved_url)
    elif item_type == 'album':
        return fetch_spotify_album(item_id, resolved_url)
    elif item_type == 'playlist':
        return fetch_spotify_playlist(item_id, resolved_url)
    else:
        raise ValueError(f"Unsupported Spotify media type '{item_type}'. Only tracks, albums, and playlists are supported.")

def apply_lofi_audio_filter(input_path: str, output_path: str, ffmpeg_exe: str, bitrate: str = '320k'):
    """
    Apply professional Lo-Fi Chill DSP filter to audio:
    - Pitch & tempo reduction (0.91x rate resampling for vintage slowed vibe)
    - Warm lowpass cutoff at 4.2 kHz (removes harsh digital treble)
    - Deep warm bass boost (+4dB at 120Hz)
    - Dreamy atmospheric room reverb
    - Analog soft limiter to prevent clipping
    """
    import subprocess
    
    lofi_filter = "asetrate=44100*0.91,aresample=44100,lowpass=f=4200,bass=g=4:f=120:w=0.8,aecho=0.8:0.85:50|70:0.25|0.15,volume=1.4,alimiter=limit=0.98"
    
    cmd = [
        ffmpeg_exe, '-y',
        '-i', input_path,
        '-af', lofi_filter,
        '-acodec', 'libmp3lame',
        '-b:a', bitrate,
        output_path
    ]
    
    result = subprocess.run(cmd, stdout=subprocess.PIPE, stderr=subprocess.PIPE, text=True, timeout=120)
    if result.returncode != 0:
        raise Exception(f"Lo-Fi FFmpeg conversion error: {result.stderr}")
        
    if not os.path.exists(output_path) or os.path.getsize(output_path) < 1000:
        raise Exception("Lo-Fi processing did not produce a valid audio file.")
        
    return output_path

