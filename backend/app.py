import sys
import os
sys.path.insert(0, os.path.dirname(os.path.abspath(__file__)))
sys.path.insert(0, os.path.dirname(os.path.dirname(os.path.abspath(__file__))))

import json
import uuid
import threading
from flask import Flask, request, jsonify, send_file
from flask_cors import CORS
import yt_dlp
try:
    from backend.quality_options import VideoQuality, AudioBitrate, map_video_quality_to_format, map_audio_bitrate_to_format
except ModuleNotFoundError:
    from quality_options import VideoQuality, AudioBitrate, map_video_quality_to_format, map_audio_bitrate_to_format
import imageio_ffmpeg
import re as _re
import requests
from mutagen.mp3 import MP3
from mutagen.id3 import ID3, TIT2, TPE1, APIC, error
from mutagen.flac import FLAC, Picture
from mutagen.mp4 import MP4, MP4Cover

COOKIES_FILE = os.path.join(os.path.dirname(os.path.abspath(__file__)), 'yt_cookies.txt')

def handle_compliance_check(error_message):
    err_lower = error_message.lower()
    compliance_keywords = [
        "private", "members-only", "copyright", "drm", "protected", "login", 
        "sign in", "restricted", "password", "age-restricted", "paid", "subscription",
        "geo-restricted", "country-restricted", "blocked"
    ]
    for kw in compliance_keywords:
        if kw in err_lower:
            return True, (
                "Legal & Compliance Block: This content is private, DRM-protected, paywalled, "
                "or copyright restricted. Downloadyfy.AI is intended solely for personal or educational "
                "downloads of public, non-copyright-locked content in compliance with platform terms."
            )
    return False, error_message

def tag_mp3_metadata(file_path, title, artists, cover_url):
    try:
        try:
            tags = ID3(file_path)
        except error:
            tags = ID3()
        tags.add(TIT2(encoding=3, text=title))
        tags.add(TPE1(encoding=3, text=artists))
        if cover_url:
            try:
                response = requests.get(cover_url, timeout=10)
                if response.status_code == 200:
                    tags.add(APIC(
                        encoding=3,
                        mime='image/jpeg',
                        type=3,
                        desc=u'Cover',
                        data=response.content
                    ))
            except Exception as e:
                print(f"[METADATA] Failed to fetch cover art: {e}")
        tags.save(file_path)
        print(f"[METADATA] Successfully tagged {file_path}")
    except Exception as e:
        print(f"[METADATA] Error tagging MP3: {e}")


def tag_audio_metadata(file_path, title, artists, cover_url, ext):
    try:
        if ext == 'mp3':
            tag_mp3_metadata(file_path, title, artists, cover_url)
        elif ext == 'flac':
            audio = FLAC(file_path)
            audio['title'] = title
            audio['artist'] = artists
            if cover_url:
                try:
                    response = requests.get(cover_url, timeout=10)
                    if response.status_code == 200:
                        pic = Picture()
                        pic.data = response.content
                        pic.type = 3 # Front Cover
                        pic.mime = 'image/jpeg'
                        pic.description = u'Cover'
                        audio.add_picture(pic)
                except Exception as e:
                    print(f"[METADATA] Failed to fetch FLAC cover art: {e}")
            audio.save()
            print(f"[METADATA] Successfully tagged FLAC {file_path}")
        elif ext == 'm4a':
            audio = MP4(file_path)
            audio['\xa9nam'] = [title]
            audio['\xa9ART'] = [artists]
            if cover_url:
                try:
                    response = requests.get(cover_url, timeout=10)
                    if response.status_code == 200:
                        cover_format = MP4Cover.FORMAT_JPEG
                        audio['covr'] = [MP4Cover(response.content, imageformat=cover_format)]
                except Exception as e:
                    print(f"[METADATA] Failed to fetch M4A cover art: {e}")
            audio.save()
            print(f"[METADATA] Successfully tagged M4A {file_path}")
    except Exception as e:
        print(f"[METADATA] Error tagging metadata for extension {ext}: {e}")


_COOKIE_CACHE = None
_COOKIE_CACHE_TIME = 0

def get_cookie_args():
    """Get cookies for yt-dlp. Uses cookies.txt if provided, avoids blocking browser locks."""
    global _COOKIE_CACHE, _COOKIE_CACHE_TIME
    import time
    now = time.time()
    if _COOKIE_CACHE is not None and (now - _COOKIE_CACHE_TIME) < 60:
        return _COOKIE_CACHE

    if os.path.exists(COOKIES_FILE) and os.path.getsize(COOKIES_FILE) > 100:
        _COOKIE_CACHE = {'cookiefile': COOKIES_FILE}
        _COOKIE_CACHE_TIME = now
        return _COOKIE_CACHE

    _COOKIE_CACHE = {}
    _COOKIE_CACHE_TIME = now
    return {}



app = Flask(__name__)
CORS(app)

DOWNLOADS_DIR = os.path.join(os.path.dirname(os.path.abspath(__name__)), 'downloads')
os.makedirs(DOWNLOADS_DIR, exist_ok=True)

download_jobs = {}

def cleanup_file(filepath):
    try:
        if os.path.exists(filepath):
            os.remove(filepath)
    except Exception as e:
        print(f"Error cleaning up file: {e}")

def classify_video_tier(f):
    """
    Correctly classify video resolution tier (144p, 240p, 360p, 480p, 720p, 1080p, 1440p, 2160p, 4320p)
    accounting for widescreen aspect ratios (e.g. 1280x684 is 720p, 1920x800 is 1080p, etc.).
    """
    format_note = str(f.get('format_note') or '').lower()
    width = f.get('width') or 0
    height = f.get('height') or 0
    res_str = str(f.get('resolution') or '')
    
    if 'x' in res_str:
        try:
            parts = res_str.split('x')
            w_val = int(parts[0])
            h_val = int(parts[1])
            if not width: width = w_val
            if not height: height = h_val
        except Exception:
            pass

    import re
    match = re.search(r'(\d+)p', format_note)
    note_h = int(match.group(1)) if match else 0
    if not note_h:
        match_res = re.search(r'(\d+)p', res_str)
        if match_res:
            note_h = int(match_res.group(1))

    if note_h >= 4320 or '8k' in format_note or width >= 7680 or height >= 3800:
        return 4320, "8K Ultra HD (4320p)"
    elif note_h >= 2160 or '4k' in format_note or width >= 3840 or height >= 1900:
        return 2160, "4K Ultra HD (2160p)"
    elif note_h >= 1440 or '2k' in format_note or width >= 2560 or height >= 1300:
        return 1440, "2K Quad HD (1440p)"
    elif note_h >= 1080 or width >= 1800 or height >= 950:
        return 1080, "1080p Full HD"
    elif note_h >= 720 or width >= 1200 or height >= 600:
        return 720, "720p HD"
    elif note_h >= 480 or width >= 800 or height >= 420:
        return 480, "480p (SD)"
    elif note_h >= 360 or width >= 600 or height >= 320:
        return 360, "360p (SD)"
    elif note_h >= 240 or width >= 400 or height >= 200:
        return 240, "240p (SD)"
    elif note_h >= 144 or height > 0 or width > 0:
        return 144, "144p (SD)"
    return 360, "360p (SD)"

def get_video_height(resolution_str, height_val):
    if height_val and isinstance(height_val, (int, float)):
        return int(height_val)
    
    if height_val:
        try:
            return int(height_val)
        except ValueError:
            pass

    if resolution_str:
        if 'x' in resolution_str:
            try:
                return int(resolution_str.split('x')[1])
            except (ValueError, IndexError):
                pass
        import re
        match = re.search(r'(\d+)p', resolution_str)
        if match:
            return int(match.group(1))
        match = re.search(r'\b(\d+)\b', resolution_str)
        if match:
            return int(match.group(1))
            
    return 0

@app.route('/api/info', methods=['POST'])
def get_video_info():
    data = request.json
    url = data.get('url')
    if not url:
        return jsonify({'error': 'URL is required'}), 400

    # Custom Pinterest extractor fallback
    is_pinterest = 'pinterest.com' in url.lower() or 'pin.it' in url.lower()
    if is_pinterest:
        try:
            import urllib.parse
            import json
            import re
            
            headers = {
                "User-Agent": "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36",
                "Accept": "text/html,application/xhtml+xml,application/xml;q=0.9,image/webp,*/*;q=0.8",
                "Accept-Language": "en-US,en;q=0.5",
            }
            res = requests.get(url, headers=headers, timeout=12)
            if res.status_code == 200:
                html_text = res.text
                
                for match in re.finditer(r'__PWS_RELAY_REGISTER_COMPLETED_REQUEST__\((.*?)\)', html_text, re.DOTALL):
                    try:
                        raw_param = match.group(1).strip()
                        
                        data_part = None
                        comma_idx = raw_param.find('",')
                        if comma_idx != -1:
                            data_part = raw_param[comma_idx + 2:].strip()
                        else:
                            comma_idx = raw_param.find("',")
                            if comma_idx != -1:
                                data_part = raw_param[comma_idx + 2:].strip()
                                
                        if data_part:
                            payload = json.loads(data_part)
                            if 'data' in payload and 'v3GetPinQueryv2' in payload['data']:
                                pin_data = payload['data']['v3GetPinQueryv2']
                                is_video = pin_data.get('isVideo', False)
                                title = pin_data.get('title') or pin_data.get('gridTitle') or "Pinterest Media"
                                
                                video_formats = []
                                if is_video and 'videos' in pin_data and pin_data['videos']:
                                    v_list = pin_data['videos'].get('video_list', {})
                                    for v_key, v_info in v_list.items():
                                        v_url = v_info.get('url')
                                        if v_url:
                                            note = f"Pinterest Video ({v_key})"
                                            video_formats.append({
                                                'format_id': v_url,
                                                'ext': 'mp4',
                                                'format_note': note,
                                                'resolution': f"{v_info.get('width', 0)}x{v_info.get('height', 0)}",
                                                'filesize': None
                                            })
                                            
                                img_url = None
                                if 'imageSpecs' in pin_data:
                                    img_url = pin_data.get('imageSpecs', {}).get('originals', {}).get('url')
                                if not img_url:
                                    urls = []
                                    def search_urls(node):
                                        if isinstance(node, dict):
                                            for k, v in node.items():
                                                if k == 'url' and isinstance(v, str) and '/originals/' in v:
                                                    urls.append(v)
                                                else:
                                                    search_urls(v)
                                        elif isinstance(node, list):
                                            for item in node:
                                                search_urls(item)
                                    search_urls(pin_data)
                                    if urls:
                                        img_url = urls[0]
                                        
                                if not img_url:
                                    img_url = pin_data.get('imageLargeUrl')
                                    
                                if is_video and video_formats:
                                    return jsonify({
                                        'title': title,
                                        'thumbnail': img_url or pin_data.get('imageLargeUrl', ''),
                                        'uploader': pin_data.get('pinner', {}).get('username') or 'Pinterest User',
                                        'duration': int(pin_data.get('duration', 0) / 1000) if pin_data.get('duration') else 0,
                                        'url': res.url,
                                        'formats': {
                                            'video': video_formats,
                                            'audio': []
                                        }
                                    })
                                elif img_url:
                                    return jsonify({
                                        'title': title,
                                        'thumbnail': img_url,
                                        'uploader': pin_data.get('pinner', {}).get('username') or 'Pinterest User',
                                        'duration': 0,
                                        'url': res.url,
                                        'formats': {
                                            'video': [
                                                {
                                                    'format_id': img_url,
                                                    'ext': 'jpg',
                                                    'format_note': 'Original High Resolution Image',
                                                    'resolution': 'Original',
                                                    'filesize': None,
                                                    'media_type': 'image'
                                                }
                                            ],
                                            'audio': []
                                        }
                                    })
                    except Exception as json_err:
                        print(f"[PINTEREST] Regex match parse failed: {json_err}")
                        continue
        except Exception as pin_err:
            print(f"[PINTEREST] Custom scraper failed: {pin_err}")

    cookie_opts = get_cookie_args()
    ydl_opts = {
        'quiet': True,
        'no_warnings': True,
        'extract_flat': 'in_playlist',
        'socket_timeout': 30,
        'nocheckcertificate': True,
        'js_runtimes': {'node': {}},
        'http_headers': {
            'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36',
            'Accept': 'text/html,application/xhtml+xml,application/xml;q=0.9,*/*;q=0.8',
            'Accept-Language': 'en-US,en;q=0.5',
        },
        **cookie_opts
    }

    try:
        with yt_dlp.YoutubeDL(ydl_opts) as ydl:
            info = ydl.extract_info(url, download=False)
            
            is_instagram = 'instagram.com' in url.lower()

            if is_instagram:
                if info.get('_type') in ['playlist', 'multi_video']:
                    entries = []
                    for entry in info.get('entries', []):
                        if entry:
                            ext = entry.get('ext') or ''
                            entry_url = entry.get('url') or entry.get('webpage_url')
                            media_type = 'video'
                            if ext in ['jpg', 'jpeg', 'png', 'webp'] or entry.get('vcodec') == 'none':
                                media_type = 'image'
                            
                            entries.append({
                                'id': entry.get('id'),
                                'title': entry.get('title') or f"Slide {len(entries)+1}",
                                'url': entry_url,
                                'duration': entry.get('duration'),
                                'thumbnail': entry.get('thumbnail') or entry_url,
                                'media_type': media_type,
                                'ext': ext or ('jpg' if media_type == 'image' else 'mp4')
                            })
                    return jsonify({
                        'type': 'instagram_carousel',
                        'title': info.get('title') or 'Instagram Post',
                        'uploader': info.get('uploader') or info.get('uploader_id') or 'instagram_user',
                        'like_count': info.get('like_count'),
                        'comment_count': info.get('comment_count'),
                        'share_count': info.get('repost_count') or info.get('share_count'),
                        'entries': entries
                    })
                else:
                    video_formats = []
                    audio_formats = []
                    
                    if 'formats' in info:
                        for f in info['formats']:
                            if f.get('vcodec') != 'none':
                                video_formats.append({
                                    'format_id': f['format_id'],
                                    'ext': f.get('ext', 'mp4'),
                                    'resolution': f.get('resolution') or f.get('format_note') or 'High Quality',
                                    'filesize': f.get('filesize') or f.get('filesize_approx'),
                                    'url': f.get('url')
                                })
                    
                    if not video_formats and info.get('url'):
                        video_formats.append({
                            'format_id': 'best',
                            'ext': info.get('ext', 'mp4'),
                            'resolution': 'Best Quality',
                            'filesize': info.get('filesize') or info.get('filesize_approx'),
                            'url': info.get('url')
                        })
                    
                    is_image = info.get('ext') in ['jpg', 'jpeg', 'png', 'webp'] or info.get('vcodec') == 'none'
                    media_type = 'image' if is_image else 'video'
                    
                    if not is_image:
                        duration = info.get('duration', 0) or 0
                        estimated_audio_size = int(duration * 24000) if duration > 0 else None
                        audio_formats.append({
                            'format_id': 'bestaudio',
                            'ext': 'mp3',
                            'format_note': 'Extract Audio (MP3)',
                            'filesize': estimated_audio_size
                        })

                    return jsonify({
                        'type': 'instagram_single',
                        'media_type': media_type,
                        'title': info.get('title') or 'Instagram Media',
                        'thumbnail': info.get('thumbnail') or info.get('url') if is_image else info.get('thumbnail'),
                        'uploader': info.get('uploader') or info.get('uploader_id') or 'instagram_user',
                        'like_count': info.get('like_count'),
                        'comment_count': info.get('comment_count'),
                        'share_count': info.get('repost_count') or info.get('share_count'),
                        'duration': info.get('duration', 0) or 0,
                        'url': url,
                        'formats': {
                            'video': video_formats,
                            'audio': audio_formats
                        }
                    })

            # Check if it's a playlist
            if info.get('_type') in ['playlist', 'multi_video']:
                entries = []
                for entry in info.get('entries', []):
                    if entry:
                        entries.append({
                            'id': entry.get('id'),
                            'title': entry.get('title'),
                            'url': entry.get('url') or (f"https://www.youtube.com/watch?v={entry.get('id')}" if entry.get('id') else None),
                            'duration': entry.get('duration'),
                            'thumbnail': entry.get('thumbnail')
                        })
                return jsonify({
                    'type': 'playlist',
                    'title': info.get('title'),
                    'entries': entries
                })

            # It's a single video
            video_formats = []
            audio_formats = []
            duration = info.get('duration', 0) or 0

            if 'formats' in info and info['formats']:
                for f in info['formats']:
                    # Video formats
                    if f.get('vcodec') != 'none':
                        tier_height, tier_label = classify_video_tier(f)
                        video_formats.append({
                            'format_id': f['format_id'],
                            'ext': 'mp4',
                            'resolution': tier_label,
                            'height': tier_height,
                            'filesize': f.get('filesize') or f.get('filesize_approx')
                        })
                    # Audio only
                    elif f.get('vcodec') == 'none' and f.get('acodec') != 'none':
                        audio_formats.append({
                            'format_id': f['format_id'],
                            'ext': f.get('ext', 'm4a'),
                            'format_note': f.get('format_note') or 'Audio',
                            'filesize': f.get('filesize') or f.get('filesize_approx')
                        })

            # Group by standard tier height and select the best format for each tier
            height_to_format = {}
            for v in video_formats:
                h = v.get('height', 0)
                if h <= 0:
                    continue
                if h not in height_to_format:
                    height_to_format[h] = v
                else:
                    existing = height_to_format[h]
                    existing_size = existing.get('filesize') or 0
                    current_size = v.get('filesize') or 0
                    if current_size > existing_size:
                        height_to_format[h] = v

            # Sort formats by height ascending
            unique_vids = sorted(list(height_to_format.values()), key=lambda x: x.get('height', 0))

            # If unique_vids is empty, provide all standard resolution options including 8K
            if not unique_vids:
                default_resolutions = [
                    (360, '360p (SD)', 'bestvideo[height<=360]+bestaudio/best'),
                    (480, '480p (SD)', 'bestvideo[height<=480]+bestaudio/best'),
                    (720, '720p HD', 'bestvideo[height<=720]+bestaudio/best'),
                    (1080, '1080p Full HD', 'bestvideo[height<=1080]+bestaudio/best'),
                    (1440, '2K Quad HD (1440p)', 'bestvideo[height<=1440]+bestaudio/best'),
                    (2160, '4K Ultra HD (2160p)', 'bestvideo[height<=2160]+bestaudio/best'),
                    (4320, '8K Ultra HD (4320p)', 'bestvideo[height<=4320]+bestaudio/best'),
                ]
                for h, res_label, fmt_id in default_resolutions:
                    unique_vids.append({
                        'format_id': fmt_id,
                        'ext': 'mp4',
                        'resolution': res_label,
                        'height': h,
                        'filesize': int(duration * h * 500) if duration > 0 else None
                    })

            # Prepare audio formats.
            # 1. Add MP3 options from 64k to 320k
            mp3_qualities = [
                ('bestaudio/320k', '320kbps MP3 (Ultra HQ)', 40000),
                ('bestaudio/256k', '256kbps MP3 (HQ)', 32000),
                ('bestaudio/192k', '192kbps MP3 (Standard)', 24000),
                ('bestaudio/128k', '128kbps MP3 (Medium)', 16000),
                ('bestaudio/64k', '64kbps MP3 (Low)', 8000),
            ]
            unique_auds = []
            for fmt_id, note, multiplier in mp3_qualities:
                estimated_size = int(duration * multiplier) if duration > 0 else None
                unique_auds.append({
                    'format_id': fmt_id,
                    'ext': 'mp3',
                    'format_note': note,
                    'filesize': estimated_size
                })

            # 2. Add native audio formats
            seen_ext = set()
            for a in audio_formats:
                ext = a.get('ext')
                if ext not in seen_ext:
                    seen_ext.add(ext)
                    a['format_note'] = f"Original {ext.upper()}"
                    unique_auds.append(a)

            response_data = {
                'title': info.get('title'),
                'thumbnail': info.get('thumbnail'),
                'uploader': info.get('uploader'),
                'duration': info.get('duration'),
                'url': url,
                'formats': {
                    'video': unique_vids,
                    'audio': unique_auds
                }
            }
            return jsonify(response_data)

    except Exception as e:
        err_msg = str(e)
        is_blocked, comp_msg = handle_compliance_check(err_msg)
        if is_blocked:
            return jsonify({'error': comp_msg}), 403
        return jsonify({'error': err_msg}), 500

def make_progress_hook(job_id):
    def hook(d):
        if d['status'] == 'downloading':
            downloaded = d.get('downloaded_bytes') or 0
            total = d.get('total_bytes') or d.get('total_bytes_estimate') or 0
            speed = d.get('speed') or 0
            eta = d.get('eta') or 0

            # Format speed
            if speed > 1024 * 1024:
                speed_str = f"{speed / (1024 * 1024):.1f} MB/s"
            elif speed > 1024:
                speed_str = f"{speed / 1024:.1f} KB/s"
            elif speed > 0:
                speed_str = f"{speed:.1f} B/s"
            else:
                speed_str = "0.0 MB/s"

            # Format sizes
            downloaded_mb = downloaded / (1024 * 1024)
            if total > 0:
                total_mb = total / (1024 * 1024)
                processed_str = f"{downloaded_mb:.1f} MB / {total_mb:.1f} MB"
                percent = int((downloaded / total) * 100)
            else:
                processed_str = f"{downloaded_mb:.1f} MB / Unknown Size"
                percent = min(95, int(downloaded_mb * 2)) # approximation

            eta_str = f"{eta}s" if eta else "--s"

            if job_id in download_jobs:
                job = download_jobs[job_id]
                media_type = job.get('media_type', 'video')
                has_two_streams = job.get('has_two_streams', False)
                current_stream = job.get('current_stream', 1)
                
                # Check filename to see if we switched streams
                filename = d.get('filename')
                last_filename = job.get('last_filename')
                if filename and last_filename and filename != last_filename:
                    current_stream = 2
                    job['current_stream'] = 2
                
                if filename:
                    job['last_filename'] = filename

                if has_two_streams:
                    if current_stream == 1:
                        combined_progress = int(percent * 0.7)
                        status_text = f"Downloading video track... {percent}%"
                    else:
                        combined_progress = 70 + int(percent * 0.2)
                        status_text = f"Downloading audio track... {percent}%"
                else:
                    combined_progress = int(percent * 0.9)
                    if media_type == 'audio':
                        status_text = f"Downloading audio track... {percent}%"
                    else:
                        status_text = f"Downloading media track... {percent}%"

                job.update({
                    'progress': combined_progress,
                    'status_text': status_text,
                    'speed': speed_str,
                    'processed': processed_str,
                    'eta': eta_str
                })
        elif d['status'] == 'finished':
            if job_id in download_jobs:
                job = download_jobs[job_id]
                media_type = job.get('media_type', 'video')
                has_two_streams = job.get('has_two_streams', False)
                current_stream = job.get('current_stream', 1)

                if has_two_streams and current_stream == 1:
                    status_text = "Video track complete. Initializing audio download..."
                    combined_progress = 70
                else:
                    if media_type == 'video' and has_two_streams:
                        status_text = "⚡ Instant fast merging video & audio tracks... Chrome download starting..."
                    elif media_type == 'audio':
                        status_text = "⚡ Instant audio conversion... Chrome download starting..."
                    else:
                        status_text = "Finalizing media file... Chrome download starting..."
                    combined_progress = 95

                job.update({
                    'progress': combined_progress,
                    'status_text': status_text,
                    'speed': '0.0 MB/s',
                    'eta': '0s'
                })
    return hook

def parse_time_to_seconds(val):
    if val is None:
        return 0.0
    s = str(val).strip()
    if not s:
        return 0.0
    if ':' in s:
        parts = s.split(':')
        try:
            if len(parts) == 2:
                return float(parts[0]) * 60 + float(parts[1])
            elif len(parts) >= 3:
                return float(parts[0]) * 3600 + float(parts[1]) * 60 + float(parts[2])
        except ValueError:
            return 0.0
    if '.' in s:
        parts = s.split('.')
        if len(parts) == 2 and len(parts[1]) == 2 and parts[1].isdigit() and int(parts[1]) < 60:
            try:
                return float(parts[0]) * 60 + float(parts[1])
            except ValueError:
                pass
    try:
        return float(s)
    except ValueError:
        return 0.0

def process_multi_segment_trim(input_filepath, segments, is_video, output_ext):
    """
    Given an input media file and list of segments [{'start': '01:04', 'end': '02:00'}, ...],
    cuts each segment and concatenates all parts into a single seamless output file.
    """
    import subprocess
    ffmpeg_exe = imageio_ffmpeg.get_ffmpeg_exe()
    
    valid_segments = []
    if isinstance(segments, list):
        for seg in segments:
            if isinstance(seg, dict):
                s = parse_time_to_seconds(seg.get('start', 0))
                e = parse_time_to_seconds(seg.get('end', 0))
                if e > s:
                    valid_segments.append((s, e))
                    
    if not valid_segments:
        return input_filepath
        
    trim_uid = uuid.uuid4().hex[:8]
    dir_name = os.path.dirname(input_filepath)
    
    # If single segment, do direct trim
    if len(valid_segments) == 1:
        s, e = valid_segments[0]
        trimmed_output = os.path.join(dir_name, f"trimmed_{trim_uid}.{output_ext}")
        if is_video:
            cmd = [
                ffmpeg_exe, '-y',
                '-ss', str(s),
                '-to', str(e),
                '-i', input_filepath,
                '-c:v', 'libx264',
                '-preset', 'fast',
                '-crf', '20',
                '-c:a', 'aac',
                '-b:a', '192k',
                '-avoid_negative_ts', 'make_zero',
                trimmed_output
            ]
        else:
            cmd = [
                ffmpeg_exe, '-y',
                '-ss', str(s),
                '-to', str(e),
                '-i', input_filepath,
                '-acodec', 'libmp3lame',
                '-b:a', '320k',
                trimmed_output
            ]
        try:
            res = subprocess.run(cmd, stdout=subprocess.PIPE, stderr=subprocess.PIPE, text=True, timeout=180)
            if res.returncode == 0 and os.path.exists(trimmed_output):
                return trimmed_output
            else:
                print(f"[TRIM ERROR] Single trim failed: {res.stderr}")
                return input_filepath
        except Exception as e:
            print(f"[TRIM EXCEPTION] {e}")
            return input_filepath

    # Multiple segments: cut pieces then concat
    temp_pieces = []
    concat_list_file = os.path.join(dir_name, f"concat_{trim_uid}.txt")
    
    try:
        for idx, (s, e) in enumerate(valid_segments):
            piece_path = os.path.join(dir_name, f"piece_{trim_uid}_{idx}.{output_ext}")
            if is_video:
                cmd = [
                    ffmpeg_exe, '-y',
                    '-ss', str(s),
                    '-to', str(e),
                    '-i', input_filepath,
                    '-c:v', 'libx264',
                    '-preset', 'veryfast',
                    '-crf', '20',
                    '-c:a', 'aac',
                    '-b:a', '192k',
                    '-avoid_negative_ts', 'make_zero',
                    piece_path
                ]
            else:
                cmd = [
                    ffmpeg_exe, '-y',
                    '-ss', str(s),
                    '-to', str(e),
                    '-i', input_filepath,
                    '-acodec', 'libmp3lame',
                    '-b:a', '320k',
                    piece_path
                ]
            res = subprocess.run(cmd, stdout=subprocess.PIPE, stderr=subprocess.PIPE, text=True, timeout=120)
            if res.returncode == 0 and os.path.exists(piece_path):
                temp_pieces.append(piece_path)
            else:
                print(f"[MULTI-TRIM] Error cutting segment {idx} ({s}-{e}): {res.stderr}")

        if not temp_pieces:
            return input_filepath

        # Create concat demuxer manifest
        with open(concat_list_file, 'w', encoding='utf-8') as f:
            for p in temp_pieces:
                clean_p = os.path.abspath(p).replace('\\', '/')
                f.write(f"file '{clean_p}'\n")

        final_merged = os.path.join(dir_name, f"merged_trim_{trim_uid}.{output_ext}")
        
        # Concat copy attempt
        concat_cmd = [
            ffmpeg_exe, '-y',
            '-f', 'concat',
            '-safe', '0',
            '-i', concat_list_file,
            '-c', 'copy',
            final_merged
        ]
        concat_res = subprocess.run(concat_cmd, stdout=subprocess.PIPE, stderr=subprocess.PIPE, text=True, timeout=180)
        
        if concat_res.returncode != 0 or not os.path.exists(final_merged) or os.path.getsize(final_merged) < 1000:
            # Fallback to re-encode concat
            if is_video:
                fallback_cmd = [
                    ffmpeg_exe, '-y',
                    '-f', 'concat',
                    '-safe', '0',
                    '-i', concat_list_file,
                    '-c:v', 'libx264',
                    '-preset', 'veryfast',
                    '-c:a', 'aac',
                    final_merged
                ]
            else:
                fallback_cmd = [
                    ffmpeg_exe, '-y',
                    '-f', 'concat',
                    '-safe', '0',
                    '-i', concat_list_file,
                    '-acodec', 'libmp3lame',
                    '-b:a', '320k',
                    final_merged
                ]
            subprocess.run(fallback_cmd, stdout=subprocess.PIPE, stderr=subprocess.PIPE, text=True, timeout=180)

        if os.path.exists(final_merged) and os.path.getsize(final_merged) > 1000:
            return final_merged
        return input_filepath
    finally:
        if os.path.exists(concat_list_file):
            try: os.remove(concat_list_file)
            except: pass
        for p in temp_pieces:
            if os.path.exists(p):
                try: os.remove(p)
                except: pass

def run_download_thread(job_id, url, target_format, merge_format, filepath_without_ext, media_type, format_id, ext, safe_title, segments=None):
    try:
        if media_type == 'image':
            import urllib.request
            filepath = f"{filepath_without_ext}.{ext}"
            req = urllib.request.Request(
                url, 
                headers={'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36'}
            )
            with urllib.request.urlopen(req, timeout=15) as response, open(filepath, 'wb') as out_file:
                out_file.write(response.read())
            
            download_jobs[job_id].update({
                'status': 'completed',
                'progress': 100,
                'status_text': 'Download complete!',
                'filepath': filepath,
                'filename': f"{safe_title}.{ext}"
            })
            return

        cookie_opts = get_cookie_args()
        ydl_opts = {
            'format': target_format,
            'merge_output_format': merge_format,
            'outtmpl': f"{filepath_without_ext}.%(ext)s",
            'quiet': True,
            'no_warnings': True,
            'ffmpeg_location': imageio_ffmpeg.get_ffmpeg_exe(),
            'nocheckcertificate': True,
            'windowsfilenames': True,
            'overwrites': True,
            'retries': 25,
            'fragment_retries': 25,
            'file_access_retries': 25,
            'concurrent_fragment_downloads': 8,
            'buffersize': 1024 * 1024,
            'http_headers': {
                'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36',
                'Accept': 'text/html,application/xhtml+xml,application/xml;q=0.9,*/*;q=0.8',
                'Accept-Language': 'en-US,en;q=0.5',
                'Connection': 'keep-alive',
            },
            'progress_hooks': [make_progress_hook(job_id)],
            **cookie_opts
        }

        # If video download, use instant stream copy merging without slow CPU re-encoding
        if media_type == 'video':
            ydl_opts['postprocessor_args'] = {
                'merger': ['-c', 'copy']
            }

        # Add postprocessor for MP3/FLAC/WAV/M4A audio conversion with selected bitrate
        if media_type == 'audio' and (format_id.startswith('bestaudio/') or ext in ('mp3', 'flac', 'wav', 'm4a')):
            codec = ext
            bitrate = '320'
            if format_id.startswith('bestaudio/'):
                part = format_id.split('/')[-1]
                if part.endswith('k') and part[:-1].isdigit():
                    bitrate = part[:-1]
            elif ext == 'mp3':
                bitrate = '320'
            ydl_opts['postprocessors'] = [{
                'key': 'FFmpegExtractAudio',
                'preferredcodec': codec,
                'preferredquality': bitrate,
            }]

        with yt_dlp.YoutubeDL(ydl_opts) as ydl:
            ydl.download([url])

        filepath = f"{filepath_without_ext}.{ext}"
        final_path = None
        if os.path.exists(filepath) and os.path.getsize(filepath) > 1024:
            final_path = filepath
        else:
            # Fallback check
            base_filename = os.path.basename(filepath_without_ext)
            for f in os.listdir(DOWNLOADS_DIR):
                if f.startswith(base_filename) and not f.endswith('.part') and not f.endswith('.ytdl'):
                    candidate = os.path.join(DOWNLOADS_DIR, f)
                    if os.path.exists(candidate) and os.path.getsize(candidate) > 1024:
                        final_path = candidate
                        ext = f.split('.')[-1]
                        break
        
        if final_path and os.path.exists(final_path):
            # Process multi-segment trimming ONLY if valid segments were requested
            if segments and isinstance(segments, list) and len(segments) > 0:
                download_jobs[job_id].update({
                    'progress': 96,
                    'status_text': 'Cutting and merging selected video segments with FFmpeg...'
                })
                trimmed_file = process_multi_segment_trim(final_path, segments, (media_type == 'video'), ext)
                if trimmed_file and os.path.exists(trimmed_file) and trimmed_file != final_path:
                    try:
                        os.remove(final_path)
                    except Exception:
                        pass
                    final_path = trimmed_file
                    safe_title = f"{safe_title}_trimmed"

            download_jobs[job_id].update({
                'status': 'completed',
                'progress': 100,
                'status_text': 'Download complete!',
                'filepath': final_path,
                'filename': f"{safe_title}.{ext}"
            })
        else:
            raise Exception("Failed to locate completed download file on server.")
    except Exception as e:
        import traceback
        import glob
        import time
        # Try to heal rename locks ONLY for fully merged temp files (WinError 32)
        temp_patterns = [
            f"{filepath_without_ext}.temp.*"
        ]
        temp_files = []
        for p in temp_patterns:
            temp_files.extend(glob.glob(p))
        healed = False
        if temp_files:
            temp_file = temp_files[0]
            final_ext = temp_file.split('.')[-1]
            final_path = f"{filepath_without_ext}.{final_ext}"
            print(f"[SELF-HEAL] Thread: Found locked temp file {temp_file}. Retrying rename to {final_path}...")
            for attempt in range(5):
                try:
                    time.sleep(1.0)
                    if os.path.exists(final_path):
                        os.remove(final_path)
                    os.rename(temp_file, final_path)
                    if os.path.exists(final_path) and os.path.getsize(final_path) > 1024:
                        print(f"[SELF-HEAL] Thread: Successfully renamed on attempt {attempt+1}!")
                        download_jobs[job_id].update({
                            'status': 'completed',
                            'progress': 100,
                            'status_text': 'Download complete!',
                            'filepath': final_path,
                            'filename': f"{safe_title}.{final_ext}"
                        })
                        healed = True
                        break
                except Exception as rename_err:
                    print(f"[SELF-HEAL] Thread: Attempt {attempt+1} failed: {rename_err}")
        if not healed:
            print(f"Download thread error: {e}")
            traceback.print_exc()
            err_msg = str(e)
            is_blocked, comp_msg = handle_compliance_check(err_msg)
            if is_blocked:
                err_msg = comp_msg
            download_jobs[job_id].update({
                'status': 'failed',
                'error': err_msg
            })

@app.route('/api/download', methods=['GET'])
def download_video():
    url = request.args.get('url')
    format_id = request.args.get('format_id', 'best')
    ext = request.args.get('ext', 'mp4')
    title = request.args.get('title', 'downloaded_media')
    media_type = request.args.get('type', 'video')
    height_val = request.args.get('height')
    video_quality = request.args.get('video_quality')  # e.g., '720p'
    audio_bitrate = request.args.get('audio_bitrate')  # e.g., '320k'

    if not url:
        return jsonify({'error': 'URL is required'}), 400

    try:
        height = int(height_val) if height_val else 0
    except ValueError:
        height = 0

    # Parse height from format_id if height is still 0
    if height == 0 and format_id:
        import re
        match = re.search(r'height\s*<=\s*(\d+)', format_id)
        if match:
            height = int(match.group(1))

    safe_title = "".join([c for c in title if c.isalpha() or c.isdigit() or c==' ']).rstrip()
    if not safe_title:
        safe_title = "media"

    # Set up formats and extensions
    if media_type == 'video':
        ext = 'mp4'
        merge_format = 'mp4'

        # Use video_quality if provided, otherwise fallback to format_id/heights logic
        if video_quality:
            try:
                q_enum = VideoQuality['P' + video_quality.rstrip('p')]
                target_format = map_video_quality_to_format(q_enum)
            except Exception:
                target_format = f"{format_id}+bestaudio/bestvideo+bestaudio/best"
        else:
            if '+bestaudio' not in format_id:
                if height > 0:
                    target_format = f"{format_id}+bestaudio[ext=m4a]/{format_id}+bestaudio/bestvideo[height<={height}]+bestaudio[ext=m4a]/bestvideo[height<={height}]+bestaudio/best"
                else:
                    target_format = f"{format_id}+bestaudio[ext=m4a]/{format_id}+bestaudio/bestvideo+bestaudio[ext=m4a]/bestvideo+bestaudio/best"
            else:
                target_format = format_id
    else:
        merge_format = None
        if audio_bitrate:
            try:
                b_enum = AudioBitrate['K' + audio_bitrate.rstrip('k')]
                target_format = map_audio_bitrate_to_format(b_enum)
                if ext not in ('flac', 'wav', 'm4a'):
                    ext = 'mp3'
            except Exception:
                target_format = format_id
        elif format_id.startswith('bestaudio/'):
            target_format = 'bestaudio/best'
            if ext not in ('flac', 'wav', 'm4a'):
                ext = 'mp3'
        else:
            target_format = format_id

    uid = uuid.uuid4().hex[:8]
    base_filename = f"{safe_title}_{uid}"
    filepath_without_ext = os.path.join(DOWNLOADS_DIR, base_filename)

    cookie_opts = get_cookie_args()
    ydl_opts = {
        'format': target_format,
        'merge_output_format': merge_format,
        'outtmpl': f"{filepath_without_ext}.%(ext)s",
        'quiet': True,
        'no_warnings': True,
        'ffmpeg_location': imageio_ffmpeg.get_ffmpeg_exe(),
        'nocheckcertificate': True,
        'windowsfilenames': True,
        'overwrites': True,
        'retries': 10,
        'fragment_retries': 10,
        'concurrent_fragment_downloads': 8,
        'buffersize': 1024 * 1024,
        'http_headers': {
            'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36',
            'Accept': 'text/html,application/xhtml+xml,application/xml;q=0.9,*/*;q=0.8',
            'Accept-Language': 'en-US,en;q=0.5',
            'Connection': 'keep-alive',
        },
        **cookie_opts
    }

    # If video download, use instant stream copy merging without slow CPU re-encoding
    if media_type == 'video':
        ydl_opts['postprocessor_args'] = {
            'merger': ['-c', 'copy']
        }

    # Add postprocessor for MP3/FLAC/WAV/M4A audio conversion with selected bitrate
    if media_type == 'audio' and (format_id.startswith('bestaudio/') or ext in ('mp3', 'flac', 'wav', 'm4a')):
        codec = ext
        bitrate = '320'
        if format_id.startswith('bestaudio/'):
            part = format_id.split('/')[-1]
            if part.endswith('k') and part[:-1].isdigit():
                bitrate = part[:-1]
        elif audio_bitrate and audio_bitrate.endswith('k') and audio_bitrate[:-1].isdigit():
            bitrate = audio_bitrate[:-1]
        ydl_opts['postprocessors'] = [{
            'key': 'FFmpegExtractAudio',
            'preferredcodec': codec,
            'preferredquality': bitrate,
        }]

    try:
        with yt_dlp.YoutubeDL(ydl_opts) as ydl:
            ydl.download([url])
    except Exception as e:
        import glob
        import time
        # Try to heal rename locks ONLY for fully merged temp files (WinError 32)
        temp_patterns = [
            f"{filepath_without_ext}.temp.*"
        ]
        temp_files = []
        for p in temp_patterns:
            temp_files.extend(glob.glob(p))
        healed = False
        if temp_files:
            temp_file = temp_files[0]
            final_ext = temp_file.split('.')[-1]
            final_path = f"{filepath_without_ext}.{final_ext}"
            print(f"[SELF-HEAL] Server: Found locked file {temp_file}. Retrying rename to {final_path}...")
            for attempt in range(5):
                try:
                    time.sleep(1.0)
                    if os.path.exists(final_path):
                        os.remove(final_path)
                    os.rename(temp_file, final_path)
                    if os.path.exists(final_path) and os.path.getsize(final_path) > 1024:
                        print(f"[SELF-HEAL] Server: Successfully renamed on attempt {attempt+1}!")
                        filepath = final_path
                        ext = final_ext
                        healed = True
                        break
                except Exception as rename_err:
                    print(f"[SELF-HEAL] Server: Attempt {attempt+1} failed: {rename_err}")
        if not healed:
            err_msg = str(e)
            is_blocked, comp_msg = handle_compliance_check(err_msg)
            if is_blocked:
                return jsonify({'error': comp_msg}), 403
            return jsonify({'error': err_msg}), 500

    # Find the downloaded file
    filepath = f"{filepath_without_ext}.{ext}"
    if not os.path.exists(filepath):
        # Try to find any file that matches the base name
        import glob
        matches = glob.glob(f"{filepath_without_ext}.*")
        if matches:
            filepath = matches[0]
            ext = os.path.splitext(filepath)[1].lstrip('.')
        else:
            return jsonify({'error': 'Downloaded file not found on server.'}), 500

    download_name = f"{safe_title}.{ext}"

    # Stream file to client, then clean up
    def generate():
        with open(filepath, 'rb') as f:
            while True:
                chunk = f.read(65536)
                if not chunk:
                    break
                yield chunk
        # Cleanup after streaming
        threading.Timer(5.0, cleanup_file, args=[filepath]).start()

    from flask import Response, stream_with_context
    mime = 'video/mp4' if ext in ('mp4', 'mkv', 'webm') else 'audio/mpeg'
    headers = {
        'Content-Disposition': f'attachment; filename="{download_name}"',
        'Content-Type': mime,
    }
    if os.path.exists(filepath):
        headers['Content-Length'] = str(os.path.getsize(filepath))

    return Response(stream_with_context(generate()), headers=headers)

@app.route('/api/download_status/<job_id>', methods=['GET'])
def get_download_status(job_id):
    job = download_jobs.get(job_id)
    if not job:
        return jsonify({'error': 'Job not found'}), 404
    return jsonify(job)

@app.route('/api/download_file/<job_id>', methods=['GET'])
def download_file(job_id):
    job = download_jobs.get(job_id)
    if not job or job.get('status') != 'completed':
        return jsonify({'error': 'File not found or download not completed.'}), 404
        
    filepath = job.get('filepath')
    filename = job.get('filename')
    
    if os.path.exists(filepath):
        # Schedule cleanup after 10 minutes to allow large 4K/8K files to finish transferring to browser
        threading.Timer(600.0, cleanup_file, args=[filepath]).start()
        return send_file(
            filepath,
            as_attachment=True,
            download_name=filename
        )
    else:
        return jsonify({'error': 'File has been deleted or is missing.'}), 404

@app.route('/api/start_download', methods=['POST'])
def start_download():
    data = request.json or {}
    url = data.get('url')
    format_id = data.get('format_id', 'best')
    ext = data.get('ext', 'mp4')
    title = data.get('title', 'downloaded_media')
    media_type = data.get('type', 'video')
    height_val = data.get('height')
    video_quality = data.get('video_quality')
    audio_bitrate = data.get('audio_bitrate')
    
    # Check if format_id is a direct URL (like Pinterest media)
    is_direct_url = format_id and (format_id.startswith('http://') or format_id.startswith('https://'))
    if is_direct_url:
        url = format_id
        format_id = 'best'
        if ext in ('jpg', 'jpeg', 'png', 'webp'):
            media_type = 'image'
            
    if not url:
        return jsonify({'error': 'URL is required'}), 400

    try:
        height = int(height_val) if height_val else 0
    except ValueError:
        height = 0

    # Parse height from format_id if height is still 0
    if height == 0 and format_id:
        import re
        match = re.search(r'height\s*<=\s*(\d+)', format_id)
        if match:
            height = int(match.group(1))

    safe_title = "".join([c for c in title if c.isalpha() or c.isdigit() or c==' ']).rstrip()
    if not safe_title:
        safe_title = "media"

    # Set up formats and extensions
    if media_type == 'video':
        ext = 'mp4'
        merge_format = 'mp4'

        if video_quality:
            try:
                q_enum = VideoQuality['P' + video_quality.rstrip('p')]
                target_format = map_video_quality_to_format(q_enum)
            except Exception:
                target_format = f"{format_id}+bestaudio/bestvideo+bestaudio/best"
        else:
            if '+bestaudio' not in format_id:
                if height > 0:
                    target_format = f"{format_id}+bestaudio[ext=m4a]/{format_id}+bestaudio/bestvideo[height<={height}]+bestaudio[ext=m4a]/bestvideo[height<={height}]+bestaudio/best"
                else:
                    target_format = f"{format_id}+bestaudio[ext=m4a]/{format_id}+bestaudio/bestvideo+bestaudio[ext=m4a]/bestvideo+bestaudio/best"
            else:
                target_format = format_id
    elif media_type == 'image':
        merge_format = None
        target_format = 'best'
    else:
        merge_format = None
        if audio_bitrate:
            try:
                b_enum = AudioBitrate['K' + audio_bitrate.rstrip('k')]
                target_format = map_audio_bitrate_to_format(b_enum)
                if ext not in ('flac', 'wav', 'm4a'):
                    ext = 'mp3'
            except Exception:
                target_format = format_id
        elif format_id.startswith('bestaudio/'):
            target_format = 'bestaudio/best'
            if ext not in ('flac', 'wav', 'm4a'):
                ext = 'mp3'
        else:
            target_format = format_id

    job_id = uuid.uuid4().hex[:12]
    base_filename = f"{safe_title}_{job_id[:8]}"
    filepath_without_ext = os.path.join(DOWNLOADS_DIR, base_filename)

    has_two_streams = (media_type == 'video' and '+' in target_format)
    download_jobs[job_id] = {
        'status': 'downloading',
        'progress': 0,
        'speed': '0.0 MB/s',
        'processed': '0.0 MB',
        'eta': '--s',
        'title': safe_title,
        'media_type': media_type,
        'has_two_streams': has_two_streams,
        'current_stream': 1,
        'last_filename': None,
        'status_text': 'Preparing download...'
    }

    segments = data.get('segments')
    if segments and isinstance(segments, list) and len(segments) > 0:
        download_jobs[job_id]['has_trim_segments'] = True
        download_jobs[job_id]['segments_count'] = len(segments)

    t = threading.Thread(
        target=run_download_thread,
        args=(job_id, url, target_format, merge_format, filepath_without_ext, media_type, format_id, ext, safe_title, segments)
    )
    t.daemon = True
    t.start()

    return jsonify({'job_id': job_id})

@app.route('/api/cookies-status', methods=['GET'])
def cookies_status():
    """Check if cookies are available."""
    has_file = os.path.exists(COOKIES_FILE) and os.path.getsize(COOKIES_FILE) > 100
    return jsonify({
        'has_cookies': has_file,
        'cookies_file': COOKIES_FILE if has_file else None
    })

@app.route('/api/export-cookies', methods=['POST'])
def export_cookies():
    """Try to export cookies from browser (browser must be closed for this to work)."""
    browsers = ['chrome', 'edge', 'brave', 'firefox']
    for browser in browsers:
        try:
            import subprocess
            result = subprocess.run(
                ['python', '-m', 'yt_dlp',
                 '--cookies-from-browser', browser,
                 '--cookies', COOKIES_FILE,
                 '--skip-download', '--quiet',
                 'https://www.youtube.com/'],
                capture_output=True, text=True, timeout=30
            )
            if os.path.exists(COOKIES_FILE) and os.path.getsize(COOKIES_FILE) > 100:
                return jsonify({'success': True, 'browser': browser, 'message': f'Cookies exported from {browser}!'})
        except Exception as e:
            continue
    
    return jsonify({
        'success': False, 
        'message': 'Could not auto-export cookies. Please close your browser first, then try again. Or manually export cookies.txt from the browser extension.'
    }), 400

@app.route('/api/upload-cookies', methods=['POST'])
def upload_cookies():
    """Upload cookies.txt file directly from the browser."""
    if 'file' not in request.files:
        return jsonify({'success': False, 'message': 'No file provided'}), 400
    
    file = request.files['file']
    if not file or file.filename == '':
        return jsonify({'success': False, 'message': 'Empty file'}), 400
    
    content = file.read()
    if len(content) < 100:
        return jsonify({'success': False, 'message': 'File too small - invalid cookies.txt'}), 400
    
    with open(COOKIES_FILE, 'wb') as f:
        f.write(content)
    
    return jsonify({'success': True, 'message': f'Cookies uploaded! ({len(content)} bytes)'})

# ==========================================
# Device Fingerprint Ad Gating Registry
# ==========================================

REGISTRY_FILE = os.path.join(os.path.dirname(os.path.abspath(__file__)), 'device_registry.json')

def load_registry():
    if not os.path.exists(REGISTRY_FILE):
        return {"devices": {}}
    try:
        with open(REGISTRY_FILE, 'r', encoding='utf-8') as f:
            return json.load(f)
    except Exception:
        return {"devices": {}}

def save_registry(registry):
    try:
        with open(REGISTRY_FILE, 'w', encoding='utf-8') as f:
            json.dump(registry, f, indent=2)
    except Exception as e:
        print(f"Error saving registry: {e}")

def check_and_consume_device_action(device_id=None, ad_token=None):
    return True, "free"

@app.route('/api/device-status', methods=['GET'])
def device_status():
    device_id = request.args.get('device_id') or 'default_device'
    return jsonify({
        'device_id': device_id,
        'free_downloads_used': 0,
        'free_downloads_remaining': 999999
    })

@app.route('/api/register-ad-complete', methods=['POST'])
def register_ad_complete():
    return jsonify({'success': True, 'ad_token': 'unlimited_token'})

@app.route('/api/convert-to-audio', methods=['POST'])
def convert_to_audio():

    if 'file' not in request.files:
        return jsonify({'error': 'No file provided'}), 400
    file = request.files['file']
    out_format = request.form.get('format', 'mp3')
    if file.filename == '':
        return jsonify({'error': 'Empty filename'}), 400
        
    if out_format not in ('mp3', 'wav', 'flac', 'm4a'):
        out_format = 'mp3'
        
    video_uid = uuid.uuid4().hex[:8]
    video_ext = os.path.splitext(file.filename)[1].lower() or '.mp4'
    video_path = os.path.join(DOWNLOADS_DIR, f"conv_{video_uid}{video_ext}")
    file.save(video_path)
    
    audio_path = os.path.join(DOWNLOADS_DIR, f"conv_{video_uid}.{out_format}")
    
    try:
        import subprocess
        ffmpeg_exe = imageio_ffmpeg.get_ffmpeg_exe()
        cmd = [ffmpeg_exe, '-y', '-i', video_path, '-vn']
        
        if out_format == 'mp3':
            cmd.extend(['-acodec', 'libmp3lame', '-q:a', '2'])
        elif out_format == 'flac':
            cmd.extend(['-acodec', 'flac'])
        elif out_format == 'wav':
            cmd.extend(['-acodec', 'pcm_s16le'])
        elif out_format == 'm4a':
            cmd.extend(['-acodec', 'aac', '-b:a', '192k'])
            
        cmd.append(audio_path)
        
        result = subprocess.run(cmd, stdout=subprocess.PIPE, stderr=subprocess.PIPE, text=True, timeout=60)
        if result.returncode != 0:
            raise Exception(f"FFmpeg error: {result.stderr}")
            
        if not os.path.exists(audio_path):
            raise Exception("Failed to extract audio track.")
            
        threading.Timer(60.0, cleanup_file, args=[video_path]).start()
        threading.Timer(120.0, cleanup_file, args=[audio_path]).start()
        
        download_name = f"{os.path.splitext(file.filename)[0]}.{out_format}"
        return send_file(audio_path, as_attachment=True, download_name=download_name)
    except Exception as e:
        cleanup_file(video_path)
        cleanup_file(audio_path)
        return jsonify({'error': str(e)}), 500

@app.route('/api/trim-audio', methods=['POST'])
def trim_audio():

    if 'file' not in request.files:
        return jsonify({'error': 'No file provided'}), 400
    file = request.files['file']
    start_time = request.form.get('start', '0')
    end_time = request.form.get('end', '10')
    
    if file.filename == '':
        return jsonify({'error': 'Empty filename'}), 400
        
    audio_uid = uuid.uuid4().hex[:8]
    audio_ext = os.path.splitext(file.filename)[1].lower() or '.mp3'
    input_path = os.path.join(DOWNLOADS_DIR, f"trim_in_{audio_uid}{audio_ext}")
    file.save(input_path)
    
    output_path = os.path.join(DOWNLOADS_DIR, f"trim_out_{audio_uid}.mp3")
    
    try:
        import subprocess
        ffmpeg_exe = imageio_ffmpeg.get_ffmpeg_exe()
        
        # ffmpeg audio cut command
        cmd = [
            ffmpeg_exe, '-y',
            '-ss', str(start_time),
            '-to', str(end_time),
            '-i', input_path,
            '-acodec', 'libmp3lame',
            '-q:a', '2',
            output_path
        ]
        
        result = subprocess.run(cmd, stdout=subprocess.PIPE, stderr=subprocess.PIPE, text=True, timeout=60)
        if result.returncode != 0:
            raise Exception(f"FFmpeg error: {result.stderr}")
            
        if not os.path.exists(output_path):
            raise Exception("Failed to trim audio track.")
            
        threading.Timer(60.0, cleanup_file, args=[input_path]).start()
        threading.Timer(120.0, cleanup_file, args=[output_path]).start()
        
        download_name = f"{os.path.splitext(file.filename)[0]}_trimmed.mp3"
        return send_file(output_path, as_attachment=True, download_name=download_name)
    except Exception as e:
        cleanup_file(input_path)
        cleanup_file(output_path)
        return jsonify({'error': str(e)}), 500

@app.route('/api/vocal-remover', methods=['POST'])
def vocal_remover():

    if 'file' not in request.files:
        return jsonify({'error': 'No file provided'}), 400
    file = request.files['file']
    mode = request.form.get('mode', 'instrumental')  # 'instrumental' or 'vocals'
    
    if file.filename == '':
        return jsonify({'error': 'Empty filename'}), 400
        
    audio_uid = uuid.uuid4().hex[:8]
    audio_ext = os.path.splitext(file.filename)[1].lower() or '.mp3'
    input_path = os.path.join(DOWNLOADS_DIR, f"voc_in_{audio_uid}{audio_ext}")
    file.save(input_path)
    
    output_path = os.path.join(DOWNLOADS_DIR, f"voc_out_{audio_uid}_{mode}.mp3")
    
    try:
        import subprocess
        ffmpeg_exe = imageio_ffmpeg.get_ffmpeg_exe()
        
        if mode == 'instrumental':
            # High-precision center channel vocal cancellation filter
            af_filter = "pan=stereo|c0=c0-c1|c1=c1-c0, volume=1.6"
        else:
            # Vocal isolation filter (isolate center vocal frequencies + human voice bandpass)
            af_filter = "pan=stereo|c0=0.5*c0+0.5*c1|c1=0.5*c0+0.5*c1, bandpass=f=1400:width_type=h:w=2600, volume=2.0"
        
        cmd = [
            ffmpeg_exe, '-y',
            '-i', input_path,
            '-af', af_filter,
            '-acodec', 'libmp3lame',
            '-b:a', '320k',
            output_path
        ]
        
        result = subprocess.run(cmd, stdout=subprocess.PIPE, stderr=subprocess.PIPE, text=True, timeout=90)
        if result.returncode != 0:
            raise Exception(f"FFmpeg error: {result.stderr}")
            
        if not os.path.exists(output_path):
            raise Exception("Failed to process vocal track.")
            
        threading.Timer(60.0, cleanup_file, args=[input_path]).start()
        threading.Timer(120.0, cleanup_file, args=[output_path]).start()
        
        suffix = "Karaoke_Instrumental" if mode == 'instrumental' else "Isolated_Vocals"
        download_name = f"{os.path.splitext(file.filename)[0]}_{suffix}.mp3"
        return send_file(output_path, as_attachment=True, download_name=download_name)
    except Exception as e:
        cleanup_file(input_path)
        cleanup_file(output_path)
        return jsonify({'error': str(e)}), 500

@app.route('/api/audio-boost', methods=['POST'])
def audio_boost():

    if 'file' not in request.files:
        return jsonify({'error': 'No file provided'}), 400
    file = request.files['file']
    
    if file.filename == '':
        return jsonify({'error': 'Empty filename'}), 400
        
    vol_multiplier = float(request.form.get('volume', '1.5'))
    bass_boost = float(request.form.get('bass', '0'))
    spatial_3d = request.form.get('spatial_3d', 'false') == 'true'
    reverb = request.form.get('reverb', 'false') == 'true'
    speed = float(request.form.get('speed', '1.0'))
    
    audio_uid = uuid.uuid4().hex[:8]
    audio_ext = os.path.splitext(file.filename)[1].lower() or '.mp3'
    input_path = os.path.join(DOWNLOADS_DIR, f"boost_in_{audio_uid}{audio_ext}")
    file.save(input_path)
    
    output_path = os.path.join(DOWNLOADS_DIR, f"boost_out_{audio_uid}.mp3")
    
    try:
        import subprocess
        ffmpeg_exe = imageio_ffmpeg.get_ffmpeg_exe()
        
        filters = []
        
        # 1. Bass boost filter
        if bass_boost > 0:
            filters.append(f"bass=g={bass_boost}:f=90:w=0.8")
            
        # 2. Volume boost with soft-knee limiter to prevent harsh digital clipping
        if vol_multiplier != 1.0:
            filters.append(f"volume={vol_multiplier}")
            filters.append("alimiter=limit=0.98:attack=5:release=50:asc=1")
            
        # 3. 8D Spatial Audio (Binaural rotation + stereo widening)
        if spatial_3d:
            filters.append("apulsator=mode=sine:hz=0.12:amount=0.85")
            filters.append("stereowiden=delay=20:feedback=0.25:crossfeed=0.25")
            
        # 4. Reverb simulation (concert hall / slowed + reverb vibe)
        if reverb:
            filters.append("aecho=0.8:0.85:50:0.35")
            
        # 5. Speed / Tempo adjustment
        if speed != 1.0 and 0.5 <= speed <= 2.0:
            filters.append(f"atempo={speed}")
            
        filter_str = ",".join(filters) if filters else "anull"
        
        cmd = [
            ffmpeg_exe, '-y',
            '-i', input_path,
            '-af', filter_str,
            '-acodec', 'libmp3lame',
            '-b:a', '320k',
            output_path
        ]
        
        result = subprocess.run(cmd, stdout=subprocess.PIPE, stderr=subprocess.PIPE, text=True, timeout=90)
        if result.returncode != 0:
            raise Exception(f"FFmpeg error: {result.stderr}")
            
        if not os.path.exists(output_path):
            raise Exception("Failed to boost audio.")
            
        threading.Timer(60.0, cleanup_file, args=[input_path]).start()
        threading.Timer(120.0, cleanup_file, args=[output_path]).start()
        
        download_name = f"{os.path.splitext(file.filename)[0]}_Enhanced.mp3"
        return send_file(output_path, as_attachment=True, download_name=download_name)
    except Exception as e:
        cleanup_file(input_path)
        cleanup_file(output_path)
        return jsonify({'error': str(e)}), 500

@app.route('/api/fetch-metadata', methods=['GET'])
def fetch_metadata():
    query = request.args.get('query', '')
    if not query:
        return jsonify({'error': 'Query required'}), 400
    try:
        url = f"https://itunes.apple.com/search?term={requests.utils.quote(query)}&entity=song&limit=6"
        res = requests.get(url, timeout=8)
        if res.status_code == 200:
            data = res.json()
            results = []
            for item in data.get('results', []):
                artwork = item.get('artworkUrl100', '')
                if artwork:
                    artwork = artwork.replace('100x100bb', '600x600bb')
                results.append({
                    'title': item.get('trackName'),
                    'artist': item.get('artistName'),
                    'album': item.get('collectionName'),
                    'genre': item.get('primaryGenreName'),
                    'year': item.get('releaseDate', '')[:4] if item.get('releaseDate') else '',
                    'artwork': artwork
                })
            return jsonify({'results': results})
        return jsonify({'results': []})
    except Exception as e:
        return jsonify({'error': str(e)}), 500

@app.route('/api/edit-tags', methods=['POST'])
def edit_tags():
    if 'file' not in request.files:
        return jsonify({'error': 'No file provided'}), 400
    file = request.files['file']
    title = request.form.get('title', '')
    artist = request.form.get('artist', '')
    album = request.form.get('album', '')
    genre = request.form.get('genre', '')
    year = request.form.get('year', '')
    cover_file = request.files.get('cover')
    cover_url = request.form.get('cover_url')
    
    if file.filename == '':
        return jsonify({'error': 'Empty filename'}), 400
        
    audio_uid = uuid.uuid4().hex[:8]
    ext = os.path.splitext(file.filename)[1].lower().lstrip('.') or 'mp3'
    audio_path = os.path.join(DOWNLOADS_DIR, f"tag_{audio_uid}.{ext}")
    file.save(audio_path)
    
    try:
        cover_bytes = None
        if cover_file and cover_file.filename:
            cover_bytes = cover_file.read()
        elif cover_url:
            try:
                img_res = requests.get(cover_url, timeout=10)
                if img_res.status_code == 200:
                    cover_bytes = img_res.content
            except Exception:
                pass
                
        if ext == 'mp3':
            try:
                tags = ID3(audio_path)
            except error:
                tags = ID3()
            if title:
                tags.add(TIT2(encoding=3, text=title))
            if artist:
                tags.add(TPE1(encoding=3, text=artist))
            if album:
                from mutagen.id3 import TALB
                tags.add(TALB(encoding=3, text=album))
            if genre:
                from mutagen.id3 import TCON
                tags.add(TCON(encoding=3, text=genre))
            if year:
                from mutagen.id3 import TYER
                tags.add(TYER(encoding=3, text=str(year)))
            if cover_bytes:
                tags.add(APIC(
                    encoding=3,
                    mime='image/jpeg' if cover_bytes.startswith(b'\xff\xd8') else 'image/png',
                    type=3,
                    desc='Cover',
                    data=cover_bytes
                ))
            tags.save(audio_path)
        elif ext == 'flac':
            audio = FLAC(audio_path)
            if title: audio['title'] = title
            if artist: audio['artist'] = artist
            if album: audio['album'] = album
            if genre: audio['genre'] = genre
            if year: audio['date'] = str(year)
            if cover_bytes:
                pic = Picture()
                pic.data = cover_bytes
                pic.type = 3
                pic.mime = 'image/jpeg' if cover_bytes.startswith(b'\xff\xd8') else 'image/png'
                audio.add_picture(pic)
            audio.save()
        elif ext in ('m4a', 'mp4'):
            audio = MP4(audio_path)
            if title: audio['\xa9nam'] = [title]
            if artist: audio['\xa9ART'] = [artist]
            if album: audio['\xa9alb'] = [album]
            if genre: audio['\xa9gen'] = [genre]
            if year: audio['\xa9day'] = [str(year)]
            if cover_bytes:
                cov_fmt = MP4Cover.FORMAT_JPEG if cover_bytes.startswith(b'\xff\xd8') else MP4Cover.FORMAT_PNG
                audio['covr'] = [MP4Cover(cover_bytes, imageformat=cov_fmt)]
            audio.save()
            
        download_name = f"{artist} - {title}.{ext}" if (artist and title) else file.filename
        threading.Timer(120.0, cleanup_file, args=[audio_path]).start()
        return send_file(audio_path, as_attachment=True, download_name=download_name)
    except Exception as e:
        cleanup_file(audio_path)
        return jsonify({'error': str(e)}), 500


def parse_timestamp_to_seconds(ts_val):
    if ts_val is None:
        return 0.0
    ts_str = str(ts_val).strip()
    if not ts_str:
        return 0.0
    try:
        if ':' in ts_str:
            parts = [float(p) for p in ts_str.split(':')]
            if len(parts) == 2:
                return parts[0] * 60 + parts[1]
            elif len(parts) == 3:
                return parts[0] * 3600 + parts[1] * 60 + parts[2]
        return max(0.0, float(ts_str))
    except (ValueError, TypeError):
        return 0.0


@app.route('/api/trim-file', methods=['POST'])
@app.route('/api/trim-audio', methods=['POST'])
def trim_uploaded_media():
    if 'file' not in request.files:
        return jsonify({'error': 'No file uploaded'}), 400
    file = request.files['file']
    if file.filename == '':
        return jsonify({'error': 'Empty filename'}), 400

    export_type = request.form.get('export_type', 'auto').lower()
    raw_segments = request.form.get('segments')
    
    segments = []
    if raw_segments:
        try:
            parsed = json.loads(raw_segments)
            if isinstance(parsed, list):
                segments = parsed
        except Exception:
            pass

    # Fallback to single start and end if no list provided
    if not segments:
        s_val = request.form.get('start', '0')
        e_val = request.form.get('end', '30')
        segments = [{'start': s_val, 'end': e_val}]

    # Validate segments
    valid_segments = []
    for seg in segments:
        s_sec = parse_timestamp_to_seconds(seg.get('start', 0))
        e_sec = parse_timestamp_to_seconds(seg.get('end', 30))
        if e_sec > s_sec:
            valid_segments.append((s_sec, e_sec))

    if not valid_segments:
        return jsonify({'error': 'Please provide at least 1 valid segment where End Time is greater than Start Time.'}), 400

    orig_ext = os.path.splitext(file.filename)[1].lower().lstrip('.') or 'mp4'
    is_video_input = orig_ext in ['mp4', 'mov', 'mkv', 'webm', 'avi', 'flv', 'm4v', 'ts']
    
    if export_type == 'auto':
        target_mode = 'video' if is_video_input else 'audio'
    elif export_type == 'video':
        target_mode = 'video'
    else:
        target_mode = 'audio'

    uid = uuid.uuid4().hex[:10]
    input_filename = f"upload_{uid}.{orig_ext}"
    input_path = os.path.join(DOWNLOADS_DIR, input_filename)
    file.save(input_path)

    temp_files = [input_path]
    ffmpeg_exe = imageio_ffmpeg.get_ffmpeg_exe()

    try:
        segment_files = []
        for idx, (s_sec, e_sec) in enumerate(valid_segments):
            dur_sec = e_sec - s_sec
            if target_mode == 'video':
                seg_out = os.path.join(DOWNLOADS_DIR, f"seg_{uid}_{idx}.mp4")
                cmd = [
                    ffmpeg_exe, '-y',
                    '-ss', str(s_sec),
                    '-t', str(dur_sec),
                    '-i', input_path,
                    '-c:v', 'libx264',
                    '-preset', 'fast',
                    '-crf', '20',
                    '-c:a', 'aac',
                    '-b:a', '192k',
                    seg_out
                ]
            else:
                seg_out = os.path.join(DOWNLOADS_DIR, f"seg_{uid}_{idx}.mp3")
                cmd = [
                    ffmpeg_exe, '-y',
                    '-ss', str(s_sec),
                    '-t', str(dur_sec),
                    '-i', input_path,
                    '-vn',
                    '-acodec', 'libmp3lame',
                    '-b:a', '320k',
                    seg_out
                ]
            
            import subprocess
            proc = subprocess.run(cmd, stdout=subprocess.PIPE, stderr=subprocess.PIPE, text=True, timeout=120)
            if proc.returncode != 0 or not os.path.exists(seg_out):
                raise Exception(f"FFmpeg trim error on segment {idx + 1}: {proc.stderr}")
            
            segment_files.append(seg_out)
            temp_files.append(seg_out)

        # Merge segments if multiple, or use single
        final_ext = 'mp4' if target_mode == 'video' else 'mp3'
        final_output = os.path.join(DOWNLOADS_DIR, f"trimmed_{uid}.{final_ext}")
        temp_files.append(final_output)

        if len(segment_files) == 1:
            final_output = segment_files[0]
        else:
            # Create concat list
            concat_list_path = os.path.join(DOWNLOADS_DIR, f"concat_{uid}.txt")
            temp_files.append(concat_list_path)
            with open(concat_list_path, 'w', encoding='utf-8') as f:
                for s_file in segment_files:
                    f.write(f"file '{os.path.abspath(s_file)}'\n")

            concat_cmd = [
                ffmpeg_exe, '-y',
                '-f', 'concat',
                '-safe', '0',
                '-i', concat_list_path,
                '-c', 'copy',
                final_output
            ]
            c_proc = subprocess.run(concat_cmd, stdout=subprocess.PIPE, stderr=subprocess.PIPE, text=True, timeout=180)
            if c_proc.returncode != 0 or not os.path.exists(final_output):
                # Fallback re-encode if copy fails
                if target_mode == 'video':
                    fallback_cmd = [ffmpeg_exe, '-y', '-f', 'concat', '-safe', '0', '-i', concat_list_path, '-c:v', 'libx264', '-c:a', 'aac', final_output]
                else:
                    fallback_cmd = [ffmpeg_exe, '-y', '-f', 'concat', '-safe', '0', '-i', concat_list_path, '-acodec', 'libmp3lame', final_output]
                subprocess.run(fallback_cmd, stdout=subprocess.PIPE, stderr=subprocess.PIPE, text=True, timeout=180)

        # Schedule temp cleanup
        for t_file in temp_files:
            if t_file != final_output:
                threading.Timer(60.0, cleanup_file, args=[t_file]).start()
        threading.Timer(180.0, cleanup_file, args=[final_output]).start()

        base_name = os.path.splitext(file.filename)[0]
        download_name = f"{base_name}_Trimmed.{final_ext}"
        mimetype = 'video/mp4' if final_ext == 'mp4' else 'audio/mpeg'
        return send_file(final_output, as_attachment=True, download_name=download_name, mimetype=mimetype)

    except Exception as e:
        for t_file in temp_files:
            cleanup_file(t_file)
        return jsonify({'error': f"Trimming failed: {str(e)}"}), 500


if __name__ == '__main__':
    app.run(host='127.0.0.1', port=5000, debug=True)

