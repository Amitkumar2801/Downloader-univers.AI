import requests
import re
import json
import html

# Standard headers to mimic a browser request
HEADERS = {
    "User-Agent": "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36",
    "Accept": "text/html,application/xhtml+xml,application/xml;q=0.9,image/webp,*/*;q=0.8",
    "Accept-Language": "en-US,en;q=0.5",
    "Connection": "keep-alive"
}

def parse_spotify_url(url):
    """
    Parses a Spotify URL to extract the type and ID.
    Supports track, playlist, and album.
    """
    cleaned_url = url.split("?")[0].strip()
    # Match: open.spotify.com/track/ID or open.spotify.com/playlist/ID or open.spotify.com/album/ID
    match = re.search(r"spotify\.com/(track|playlist|album)/([a-zA-Z0-9]+)", cleaned_url)
    if match:
        return match.group(1), match.group(2)
    # Also support spotify URI format: spotify:track:ID
    match_uri = re.search(r"spotify:(track|playlist|album):([a-zA-Z0-9]+)", cleaned_url)
    if match_uri:
        return match_uri.group(1), match_uri.group(2)
    return None, None

def get_next_data(url):
    """
    Fetches a Spotify embed page and extracts the Next.js __NEXT_DATA__ dict.
    """
    try:
        response = requests.get(url, headers=HEADERS, timeout=10)
        if response.status_code != 200:
            return None
        
        match = re.search(r'<script id="__NEXT_DATA__"[^>]*>(.*?)</script>', response.text, re.DOTALL)
        if match:
            data_str = match.group(1)
            return json.loads(html.unescape(data_str))
    except Exception as e:
        print(f"[SPOTIFY] Error fetching embed page: {e}")
    return None

def get_spotify_track_info(track_id):
    """
    Extracts metadata for a single Spotify track.
    Returns: {type: 'track', title, artists, duration (sec), thumbnail, url} or None
    """
    url = f"https://open.spotify.com/embed/track/{track_id}"
    data = get_next_data(url)
    if not data:
        return None
    
    try:
        page_props = data.get("props", {}).get("pageProps", {})
        status = page_props.get("status", 200)
        if status == 404:
            return None
            
        entity = page_props.get("state", {}).get("data", {}).get("entity", {})
        if not entity:
            return None
            
        title = entity.get("title") or entity.get("name")
        artists = ", ".join([a.get("name") for a in entity.get("artists", [])])
        duration_sec = entity.get("duration", 0) / 1000.0
        
        # Get highest resolution image if available
        images = entity.get("visualIdentity", {}).get("image", [])
        thumbnail = ""
        if images:
            # Sort by resolution if specified, otherwise take first
            images_sorted = sorted(images, key=lambda x: x.get("maxWidth", 0), reverse=True)
            thumbnail = images_sorted[0].get("url")
            
        return {
            "type": "track",
            "title": title,
            "artists": artists,
            "duration": duration_sec,
            "thumbnail": thumbnail,
            "url": f"https://open.spotify.com/track/{track_id}"
        }
    except Exception as e:
        print(f"[SPOTIFY] Error parsing track details: {e}")
    return None

def get_spotify_playlist_info(playlist_id):
    """
    Extracts track list and details for a Spotify playlist.
    Returns: {type: 'playlist', title, uploader, thumbnail, entries: [{id, title, url, duration, thumbnail}]} or None
    """
    url = f"https://open.spotify.com/embed/playlist/{playlist_id}"
    data = get_next_data(url)
    if not data:
        return None
        
    try:
        page_props = data.get("props", {}).get("pageProps", {})
        status = page_props.get("status", 200)
        if status == 404:
            return None
            
        entity = page_props.get("state", {}).get("data", {}).get("entity", {})
        if not entity:
            return None
            
        title = entity.get("title") or entity.get("name")
        uploader = entity.get("subtitle") or "Spotify Creator"
        
        # Playlist thumbnail
        cover_sources = entity.get("coverArt", {}).get("sources", [])
        playlist_thumb = ""
        if cover_sources:
            playlist_thumb = cover_sources[0].get("url")
            
        entries = []
        track_list = entity.get("trackList", [])
        for t in track_list:
            t_uri = t.get("uri", "")
            t_id = t_uri.split(":")[-1] if t_uri else ""
            if not t_id:
                continue
            
            # Subtitle contains the artists (formatted as a string)
            t_artists = t.get("subtitle", "Unknown Artist")
            t_title = t.get("title", "Unknown Track")
            
            entries.append({
                "id": t_id,
                "title": f"{t_artists} - {t_title}", # Combining artist and title makes it load nicely
                "url": f"https://open.spotify.com/track/{t_id}",
                "duration": t.get("duration", 0) / 1000.0,
                "thumbnail": playlist_thumb # Fallback to playlist thumbnail for fast loading
            })
            
        return {
            "type": "playlist",
            "title": title,
            "uploader": uploader,
            "thumbnail": playlist_thumb,
            "entries": entries
        }
    except Exception as e:
        print(f"[SPOTIFY] Error parsing playlist details: {e}")
    return None

def get_spotify_album_info(album_id):
    """
    Extracts track list and details for a Spotify album.
    Returns: {type: 'playlist', title, uploader, thumbnail, entries: [{id, title, url, duration, thumbnail}]} or None
    """
    url = f"https://open.spotify.com/embed/album/{album_id}"
    data = get_next_data(url)
    if not data:
        return None
        
    try:
        page_props = data.get("props", {}).get("pageProps", {})
        status = page_props.get("status", 200)
        if status == 404:
            return None
            
        entity = page_props.get("state", {}).get("data", {}).get("entity", {})
        if not entity:
            return None
            
        title = entity.get("title") or entity.get("name")
        # Subtitle contains the artist name
        uploader = entity.get("subtitle") or "Unknown Artist"
        
        cover_sources = entity.get("coverArt", {}).get("sources", [])
        album_thumb = ""
        if cover_sources:
            album_thumb = cover_sources[0].get("url")
            
        entries = []
        track_list = entity.get("trackList", [])
        for t in track_list:
            t_uri = t.get("uri", "")
            t_id = t_uri.split(":")[-1] if t_uri else ""
            if not t_id:
                continue
                
            t_artists = t.get("subtitle", uploader)
            t_title = t.get("title", "Unknown Track")
            
            entries.append({
                "id": t_id,
                "title": f"{t_artists} - {t_title}",
                "url": f"https://open.spotify.com/track/{t_id}",
                "duration": t.get("duration", 0) / 1000.0,
                "thumbnail": album_thumb
            })
            
        return {
            "type": "playlist", # Treat album as playlist on frontend
            "title": f"Album: {title}",
            "uploader": uploader,
            "thumbnail": album_thumb,
            "entries": entries
        }
    except Exception as e:
        print(f"[SPOTIFY] Error parsing album details: {e}")
    return None

if __name__ == "__main__":
    # Quick test
    print("Testing track scraper...")
    info = get_spotify_track_info("6rqhFgbbKwnb9MLmUQDhG6")
    print(info)
    print("\nTesting playlist scraper...")
    pl_info = get_spotify_playlist_info("6lnfkAgnVtNzvj8KScLSkj")
    if pl_info:
        print(f"Playlist Title: {pl_info['title']}, Creator: {pl_info['uploader']}, Tracks: {len(pl_info['entries'])}")
        print("First track:", pl_info['entries'][0])
