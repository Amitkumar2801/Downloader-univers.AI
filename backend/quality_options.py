from enum import Enum

class VideoQuality(Enum):
    P144 = "144p"
    P240 = "240p"
    P360 = "360p"
    P480 = "480p"
    P720 = "720p"
    P1080 = "1080p"
    P1440 = "1440p"
    P2160 = "2160p"
    P4320 = "4320p"  # 8K

class AudioBitrate(Enum):
    K64 = "64k"
    K128 = "128k"
    K192 = "192k"
    K256 = "256k"
    K320 = "320k"

def map_video_quality_to_format(quality: VideoQuality) -> str:
    """Return yt-dlp format selector for the given video quality.
    Uses the "bestvideo[height<=X]+bestaudio/best" pattern.
    """
    # Extract numeric height
    height_str = quality.value.rstrip('p')
    try:
        height = int(height_str)
    except ValueError:
        height = 1080
    return f"bestvideo[height<={height}]+bestaudio/best"

def map_audio_bitrate_to_format(bitrate: AudioBitrate) -> str:
    """Return yt-dlp format selector for audio extraction at given bitrate.
    We'll use bestaudio and postprocess to mp3 with desired bitrate.
    """
    # Use bestaudio and set postprocessor quality via options later.
    return "bestaudio"
