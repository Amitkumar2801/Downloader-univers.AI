import os
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

try:
    from backend.spotify_scraper import parse_spotify_url, get_spotify_track_info, get_spotify_playlist_info, get_spotify_album_info
except ModuleNotFoundError:
    from spotify_scraper import parse_spotify_url, get_spotify_track_info, get_spotify_playlist_info, get_spotify_album_info

COOKIES_FILE = os.path.join(os.path.dirname(os.path.abspath(__file__)), 'yt_cookies.txt')

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


def get_cookie_args():
    """Get cookies for yt-dlp. Prioritizes cookies.txt file, then browser extraction."""
    # First check if a manual cookies.txt file exists
    if os.path.exists(COOKIES_FILE) and os.path.getsize(COOKIES_FILE) > 100:
        print(f"[COOKIES] Using cookies file: {COOKIES_FILE}")
        return {'cookiefile': COOKIES_FILE}
    
    # Try browser extraction (only works when browsers are closed)
    browsers = ['chrome', 'edge', 'brave', 'firefox', 'opera']
    for browser in browsers:
        try:
            test_opts = {'cookiesfrombrowser': (browser, None, None, None), 'quiet': True, 'no_warnings': True}
            with yt_dlp.YoutubeDL(test_opts) as ydl:
                # Force cookie loading to verify access works (e.g. not locked/permission denied)
                _ = ydl.cookiejar
            print(f"[COOKIES] Using browser cookies: {browser}")
            return {'cookiesfrombrowser': (browser, None, None, None)}
        except Exception:
            continue
    
    print("[COOKIES] No cookies available - YouTube may block requests")
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

    sp_type, sp_id = parse_spotify_url(url)
    if sp_type and sp_id:
        try:
            if sp_type == 'track':
                track_info = get_spotify_track_info(sp_id)
                if not track_info:
                    return jsonify({'error': 'Failed to fetch Spotify track details'}), 404
                
                duration = track_info['duration']
                estimated_size = int(duration * 40000)
                
                return jsonify({
                    'title': f"{track_info['artists']} - {track_info['title']}",
                    'thumbnail': track_info['thumbnail'],
                    'uploader': track_info['artists'],
                    'duration': int(duration),
                    'url': track_info['url'],
                    'formats': {
                        'video': [],
                        'audio': [
                            {
                                'format_id': 'spotify_flac',
                                'ext': 'flac',
                                'format_note': 'Lossless FLAC (Super High Quality)',
                                'filesize': int(duration * 100000)
                            },
                            {
                                'format_id': 'spotify_wav',
                                'ext': 'wav',
                                'format_note': 'Uncompressed WAV (Lossless)',
                                'filesize': int(duration * 176400)
                            },
                            {
                                'format_id': 'spotify_m4a',
                                'ext': 'm4a',
                                'format_note': '320kbps M4A/AAC (Best Quality)',
                                'filesize': int(duration * 40000)
                            },
                            {
                                'format_id': 'spotify_320k',
                                'ext': 'mp3',
                                'format_note': '320kbps MP3 (Ultra HQ)',
                                'filesize': estimated_size
                            },
                            {
                                'format_id': 'spotify_256k',
                                'ext': 'mp3',
                                'format_note': '256kbps MP3 (HQ)',
                                'filesize': int(duration * 32000)
                            },
                            {
                                'format_id': 'spotify_128k',
                                'ext': 'mp3',
                                'format_note': '128kbps MP3 (Medium)',
                                'filesize': int(duration * 16000)
                            }
                        ]
                    }
                })
            elif sp_type in ('playlist', 'album'):
                if sp_type == 'playlist':
                    playlist_info = get_spotify_playlist_info(sp_id)
                else:
                    playlist_info = get_spotify_album_info(sp_id)
                
                if not playlist_info:
                    return jsonify({'error': 'Failed to fetch Spotify details'}), 404
                
                return jsonify({
                    'type': 'playlist',
                    'title': playlist_info['title'],
                    'entries': playlist_info['entries']
                })
        except Exception as e:
            return jsonify({'error': f'Spotify parser error: {str(e)}'}), 500

    cookie_opts = get_cookie_args()
    ydl_opts = {
        'quiet': True,
        'no_warnings': True,
        'extract_flat': 'in_playlist',
        'socket_timeout': 30,
        'nocheckcertificate': True,
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

            if 'formats' in info:
                for f in info['formats']:
                    # Video formats
                    if f.get('vcodec') != 'none' and f.get('acodec') == 'none':
                        # Video only
                        height = get_video_height(f.get('resolution'), f.get('height'))
                        video_formats.append({
                            'format_id': f['format_id'],
                            'ext': f.get('ext', 'mp4'),
                            'resolution': f.get('resolution') or f"{height}p" if height else "Unknown",
                            'height': height,
                            'filesize': f.get('filesize') or f.get('filesize_approx')
                        })
                    elif f.get('vcodec') != 'none' and f.get('acodec') != 'none':
                        # Video + Audio
                        height = get_video_height(f.get('resolution'), f.get('height'))
                        video_formats.append({
                            'format_id': f['format_id'],
                            'ext': f.get('ext', 'mp4'),
                            'resolution': f.get('resolution') or f"{height}p" if height else "Unknown",
                            'height': height,
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
            else:
                # Direct file or simple structure
                video_formats.append({
                    'format_id': 'best',
                    'ext': info.get('ext', 'mp4'),
                    'resolution': 'Best',
                    'height': 1080,
                    'filesize': None
                })

            # Group by height and select the best format for each height
            height_to_format = {}
            for v in video_formats:
                h = v.get('height', 0)
                if h <= 0:
                    continue
                if h not in height_to_format:
                    height_to_format[h] = v
                else:
                    existing = height_to_format[h]
                    existing_is_mp4 = existing.get('ext') == 'mp4'
                    current_is_mp4 = v.get('ext') == 'mp4'
                    
                    if current_is_mp4 and not existing_is_mp4:
                        height_to_format[h] = v
                    elif existing_is_mp4 == current_is_mp4:
                        existing_size = existing.get('filesize') or 0
                        current_size = v.get('filesize') or 0
                        if current_size > existing_size:
                            height_to_format[h] = v

            # Sort formats by height ascending
            unique_vids = sorted(list(height_to_format.values()), key=lambda x: x.get('height', 0))

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
        return jsonify({'error': str(e)}), 500

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
                        status_text = "Merging video and audio tracks... This may take a moment."
                    elif media_type == 'audio':
                        status_text = "Post-processing audio... Please wait."
                    else:
                        status_text = "Finalizing media file... Please wait."
                    combined_progress = 95

                job.update({
                    'progress': combined_progress,
                    'status_text': status_text,
                    'speed': '0.0 MB/s',
                    'eta': '0s'
                })
    return hook

def run_download_thread(job_id, url, target_format, merge_format, filepath_without_ext, media_type, format_id, ext, safe_title):
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
            'concurrent_fragment_downloads': 16,
            'buffersize': 1024 * 1024,
            'socket_timeout': 15,
            'retries': 10,
            'http_headers': {
                'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36',
                'Accept': 'text/html,application/xhtml+xml,application/xml;q=0.9,*/*;q=0.8',
                'Accept-Language': 'en-US,en;q=0.5',
                'Connection': 'keep-alive',
            },
            'progress_hooks': [make_progress_hook(job_id)],
            **cookie_opts
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
                # default fallback
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
        if os.path.exists(filepath):
            final_path = filepath
        else:
            # Fallback check
            base_filename = os.path.basename(filepath_without_ext)
            for f in os.listdir(DOWNLOADS_DIR):
                if f.startswith(base_filename):
                    final_path = os.path.join(DOWNLOADS_DIR, f)
                    ext = f.split('.')[-1]
                    break
        
        if final_path and os.path.exists(final_path):
            # Check and write Spotify metadata
            job = download_jobs.get(job_id)
            if job and 'spotify_metadata' in job:
                meta = job['spotify_metadata']
                tag_audio_metadata(final_path, meta['title'], meta['artists'], meta['cover_url'], ext)
                
            download_jobs[job_id].update({
                'status': 'completed',
                'progress': 100,
                'status_text': 'Download complete!',
                'filepath': final_path,
                'filename': f"{safe_title}.{ext}"
            })
        else:
            raise Exception("Failed to locate downloaded file on server.")
    except Exception as e:
        import traceback
        import glob
        import time
        # Try to heal rename locks (WinError 32)
        temp_patterns = [
            f"{filepath_without_ext}.temp.*",
            f"{filepath_without_ext}.*.part"
        ]
        temp_files = []
        for p in temp_patterns:
            temp_files.extend(glob.glob(p))
        healed = False
        if temp_files:
            temp_file = temp_files[0]
            if temp_file.endswith('.part'):
                final_path = temp_file[:-5]
                final_ext = final_path.split('.')[-1]
            else:
                final_ext = temp_file.split('.')[-1]
                final_path = f"{filepath_without_ext}.{final_ext}"
            print(f"[SELF-HEAL] Thread: Found locked file {temp_file}. Retrying rename to {final_path}...")
            for attempt in range(5):
                try:
                    time.sleep(1.0)
                    if os.path.exists(final_path):
                        os.remove(final_path)
                    os.rename(temp_file, final_path)
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
            download_jobs[job_id].update({
                'status': 'failed',
                'error': str(e)
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

    sp_type, sp_id = parse_spotify_url(url)
    if sp_type and sp_id and sp_type == 'track':
        track_info = get_spotify_track_info(sp_id)
        if track_info:
            title = f"{track_info['artists']} - {track_info['title']}"
            media_type = 'audio'
            
            ext = 'mp3'
            if format_id == 'spotify_flac':
                ext = 'flac'
            elif format_id == 'spotify_wav':
                ext = 'wav'
            elif format_id == 'spotify_m4a':
                ext = 'm4a'
            
            bitrate_suffix = '320k'
            if format_id and format_id.startswith('spotify_'):
                part = format_id[8:]
                if part.endswith('k') and part[:-1].isdigit():
                    bitrate_suffix = part
                elif part.isdigit():
                    bitrate_suffix = f"{part}k"
            format_id = f"bestaudio/{bitrate_suffix}"
            
            url = f"ytsearch:{track_info['artists']} - {track_info['title']}"

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
        # Determine extension based on desired height (if >1080 use mkv for higher resolutions)
        if height > 1080:
            ext = 'mkv'
            merge_format = 'mkv'
        else:
            ext = 'mp4'
            merge_format = 'mp4'

        # Use video_quality if provided, otherwise fallback to format_id/heights logic
        if video_quality:
            try:
                q_enum = VideoQuality['P' + video_quality.rstrip('p')]
                target_format = map_video_quality_to_format(q_enum)
            except Exception:
                target_format = f"{format_id}+bestaudio/best"
        else:
            if '+bestaudio' not in format_id:
                target_format = f"{format_id}+bestaudio/best"
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
        'concurrent_fragment_downloads': 16,
        'buffersize': 1024 * 1024,
        'socket_timeout': 15,
        'retries': 10,
        'http_headers': {
            'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36',
            'Accept': 'text/html,application/xhtml+xml,application/xml;q=0.9,*/*;q=0.8',
            'Accept-Language': 'en-US,en;q=0.5',
            'Connection': 'keep-alive',
        },
        **cookie_opts
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
        # Try to heal rename locks (WinError 32)
        temp_patterns = [
            f"{filepath_without_ext}.temp.*",
            f"{filepath_without_ext}.*.part"
        ]
        temp_files = []
        for p in temp_patterns:
            temp_files.extend(glob.glob(p))
        healed = False
        if temp_files:
            temp_file = temp_files[0]
            if temp_file.endswith('.part'):
                final_path = temp_file[:-5]
                final_ext = final_path.split('.')[-1]
            else:
                final_ext = temp_file.split('.')[-1]
                final_path = f"{filepath_without_ext}.{final_ext}"
            print(f"[SELF-HEAL] Server: Found locked file {temp_file}. Retrying rename to {final_path}...")
            for attempt in range(5):
                try:
                    time.sleep(1.0)
                    if os.path.exists(final_path):
                        os.remove(final_path)
                    os.rename(temp_file, final_path)
                    print(f"[SELF-HEAL] Server: Successfully renamed on attempt {attempt+1}!")
                    filepath = final_path
                    ext = final_ext
                    healed = True
                    break
                except Exception as rename_err:
                    print(f"[SELF-HEAL] Server: Attempt {attempt+1} failed: {rename_err}")
        if not healed:
            return jsonify({'error': str(e)}), 500

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

    if sp_type and sp_id and sp_type == 'track' and ext in ('mp3', 'flac', 'm4a'):
        track_info = get_spotify_track_info(sp_id)
        if track_info:
            tag_audio_metadata(filepath, track_info['title'], track_info['artists'], track_info['thumbnail'], ext)

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
        # Schedule cleanup after 2 minutes to let browser finish downloading
        threading.Timer(120.0, cleanup_file, args=[filepath]).start()
        return send_file(
            filepath,
            as_attachment=True,
            download_name=filename
        )
    else:
        return jsonify({'error': 'File has been deleted or is missing.'}), 404

@app.route('/api/start_download', methods=['POST'])
def start_download():
    data = request.json
    url = data.get('url')
    format_id = data.get('format_id', 'best')
    ext = data.get('ext', 'mp4')
    title = data.get('title', 'downloaded_media')
    media_type = data.get('type', 'video')
    height_val = data.get('height')
    video_quality = data.get('video_quality')
    audio_bitrate = data.get('audio_bitrate')

    if not url:
        return jsonify({'error': 'URL is required'}), 400

    sp_type, sp_id = parse_spotify_url(url)
    spotify_meta = None
    if sp_type and sp_id and sp_type == 'track':
        media_type = 'audio'
        ext = 'mp3'
        if format_id == 'spotify_flac':
            ext = 'flac'
        elif format_id == 'spotify_wav':
            ext = 'wav'
        elif format_id == 'spotify_m4a':
            ext = 'm4a'
        
        bitrate_suffix = '320k'
        if format_id and format_id.startswith('spotify_'):
            part = format_id[8:]
            if part.endswith('k') and part[:-1].isdigit():
                bitrate_suffix = part
            elif part.isdigit():
                bitrate_suffix = f"{part}k"
        format_id = f"bestaudio/{bitrate_suffix}"

        track_info = get_spotify_track_info(sp_id)
        if track_info:
            title = f"{track_info['artists']} - {track_info['title']}"
            url = f"ytsearch:{track_info['artists']} - {track_info['title']}"
            spotify_meta = {
                'title': track_info['title'],
                'artists': track_info['artists'],
                'cover_url': track_info['thumbnail']
            }
        else:
            # Fallback to frontend-provided title to avoid DRM block and Spotify embed rate-limit!
            print(f"[SPOTIFY] Fallback search for {title}")
            url = f"ytsearch:{title}"

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
        if height > 1080:
            ext = 'mkv'
            merge_format = 'mkv'
        else:
            ext = 'mp4'
            merge_format = 'mp4'

        if video_quality:
            try:
                q_enum = VideoQuality['P' + video_quality.rstrip('p')]
                target_format = map_video_quality_to_format(q_enum)
            except Exception:
                target_format = f"{format_id}+bestaudio/best"
        else:
            if '+bestaudio' not in format_id:
                target_format = f"{format_id}+bestaudio/best"
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

    if spotify_meta:
        download_jobs[job_id]['spotify_metadata'] = spotify_meta

    t = threading.Thread(
        target=run_download_thread,
        args=(job_id, url, target_format, merge_format, filepath_without_ext, media_type, format_id, ext, safe_title)
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

if __name__ == '__main__':
    app.run(host='127.0.0.1', port=5000, debug=True)
