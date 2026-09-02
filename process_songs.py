#!/usr/bin/env python3
"""
Audio Processing & Cloudinary Upload Script for Ethiopian Songs.
Processes MP3 files, extracts metadata/cover art, generates audio snippets,
uploads assets to Cloudinary, and saves metadata to songs_metadata.json.
"""

import os
import json
import sys
import re
import time
import shutil
from mutagen.easyid3 import EasyID3
import mutagen.id3
from mutagen.id3 import ID3, APIC
import pydub
from pydub import AudioSegment
import cloudinary
import cloudinary.uploader
from dotenv import load_dotenv

# Ensure stdout/stderr output in UTF-8 with line buffering for real-time progress logging
if sys.platform == 'win32':
    try:
        sys.stdout.reconfigure(encoding='utf-8', line_buffering=True)
        sys.stderr.reconfigure(encoding='utf-8', line_buffering=True)
    except AttributeError:
        pass

# Configure pydub converter using imageio_ffmpeg (or static_ffmpeg fallback)
try:
    import imageio_ffmpeg
    ffmpeg_bin = imageio_ffmpeg.get_ffmpeg_exe()
    ffmpeg_dir = os.path.dirname(ffmpeg_bin)
    if ffmpeg_dir not in os.environ.get('PATH', ''):
        os.environ['PATH'] = ffmpeg_dir + os.pathsep + os.environ.get('PATH', '')
    AudioSegment.converter = ffmpeg_bin
    AudioSegment.ffmpeg = ffmpeg_bin
except Exception:
    try:
        import static_ffmpeg
        static_ffmpeg.add_paths()
    except Exception:
        pass

# Load environment variables
load_dotenv()

# Cloudinary Configuration
cloudinary.config(
    cloud_name=os.getenv('CLOUDINARY_CLOUD_NAME'),
    api_key=os.getenv('CLOUDINARY_API_KEY'),
    api_secret=os.getenv('CLOUDINARY_API_SECRET')
)

SONGS_INPUT_FOLDER = './songs_input'
OUTPUT_JSON = 'songs_metadata.json'
SNIPPET_DURATIONS = [1.0, 2.0, 4.0, 8.0, 10.0]

# Known lists for difficulty assignment
EASY_SONGS = [
    ('mulatu astatke', 'tezeta'),
    ('tilahun gessesse', 'abeba'),
    ('mahmoud ahmed', 'ere mela mela'),
    ('aster aweke', 'hagere'),
    ('teddy afro', 'tikur sew'),
    ('gigi', 'guramayne')
]

MEDIUM_SONGS = [
    ('alemayehu eshete', 'wedeku'),
    ('bizunesh bekele', 'chenai'),
    ('neway bebebe', 'esuriyefu'),
    ('kiros alemayehu', 'angetiu')
]


def find_mp3_files(folder_path):
    """Scan folder and return sorted list of full paths to MP3 files."""
    if not os.path.exists(folder_path) or not os.path.isdir(folder_path):
        print(f"Error: {folder_path} folder not found")
        return []

    files = os.listdir(folder_path)
    mp3_files = [
        os.path.join(folder_path, f)
        for f in files
        if f.lower().endswith('.mp3')
    ]
    mp3_files.sort()

    if not mp3_files:
        print("Error: No MP3 files found")

    return mp3_files


def extract_metadata(mp3_path):
    """Extract metadata (artist, title, album, year, album_art_bytes) from ID3 or filename."""
    filename = os.path.basename(mp3_path)
    filename_no_ext = os.path.splitext(filename)[0]

    artist = None
    title = None
    album = None
    year = None
    album_art_bytes = None

    # Step 1: Try reading ID3 tags using EasyID3
    try:
        easy_tags = EasyID3(mp3_path)
        artist_tag = easy_tags.get('artist', [None])[0]
        title_tag = easy_tags.get('title', [None])[0]
        album_tag = easy_tags.get('album', [None])[0]
        date_tag = easy_tags.get('date', [None])[0] or easy_tags.get('year', [None])[0]

        if artist_tag and str(artist_tag).strip():
            artist = str(artist_tag).strip()
        if title_tag and str(title_tag).strip():
            title = str(title_tag).strip()
        if album_tag and str(album_tag).strip():
            album = str(album_tag).strip()
        if date_tag and str(date_tag).strip():
            match = re.search(r'\d{4}', str(date_tag))
            if match:
                year = match.group(0)
            else:
                year = str(date_tag).strip()[:4]
    except Exception:
        # EasyID3 reading failed or no ID3 tag
        pass

    # Step 2: Try extracting APIC frame for album cover art
    try:
        id3_tags = ID3(mp3_path)
        for key in id3_tags.keys():
            if key.startswith('APIC'):
                apic_frame = id3_tags[key]
                if hasattr(apic_frame, 'data') and apic_frame.data:
                    album_art_bytes = apic_frame.data
                    break
    except Exception:
        pass

    # Step 3: Fallback to parsing filename if artist or title missing
    if not artist or not title:
        if " - " in filename_no_ext:
            parts = filename_no_ext.split(" - ", 1)
            parsed_artist = parts[0].strip()
            parsed_title = parts[1].strip()
            if not artist:
                artist = parsed_artist
            if not title:
                title = parsed_title
        elif "_" in filename_no_ext:
            parts = filename_no_ext.split("_", 1)
            parsed_artist = parts[0].replace('_', ' ').strip().title()
            parsed_title = parts[1].replace('_', ' ').strip().title()
            if not artist:
                artist = parsed_artist
            if not title:
                title = parsed_title
        else:
            if not artist:
                artist = "Unknown"
            if not title:
                title = filename_no_ext.strip()

    if not artist:
        artist = "Unknown"
    if not title:
        title = filename_no_ext

    return {
        'artist': artist,
        'title': title,
        'album': album,
        'year': year,
        'album_art_bytes': album_art_bytes
    }


import subprocess
import tempfile


def load_audio_file(mp3_path):
    """Load an MP3 file into a pydub AudioSegment cleanly with ffmpeg fallback."""
    try:
        return AudioSegment.from_file(mp3_path, format="mp3")
    except Exception:
        pass

    try:
        return AudioSegment.from_mp3(mp3_path)
    except Exception:
        pass

    # Fallback to decoding via direct ffmpeg execution to temporary wav
    ffmpeg_bin = None
    try:
        import imageio_ffmpeg
        ffmpeg_bin = imageio_ffmpeg.get_ffmpeg_exe()
    except Exception:
        ffmpeg_bin = 'ffmpeg'

    with tempfile.NamedTemporaryFile(suffix='.wav', delete=False) as tmp:
        tmp_wav = tmp.name

    try:
        cmd = [ffmpeg_bin, '-y', '-i', mp3_path, '-f', 'wav', tmp_wav]
        res = subprocess.run(cmd, stdout=subprocess.PIPE, stderr=subprocess.PIPE)
        if res.returncode == 0:
            return AudioSegment.from_wav(tmp_wav)
        else:
            raise RuntimeError(f"FFmpeg decoding failed: {res.stderr.decode('utf-8', errors='ignore')}")
    finally:
        if os.path.exists(tmp_wav):
            try:
                os.remove(tmp_wav)
            except Exception:
                pass


def generate_snippets(mp3_path, output_dir='./snippets_temp'):
    """Create 6 snippet files (0.1s, 0.3s, 1.0s, 2.0s, 4.0s, full) in output_dir."""
    os.makedirs(output_dir, exist_ok=True)
    snippets = {}

    try:
        audio = load_audio_file(mp3_path)
    except Exception as e:
        print(f"  ✗ Error loading MP3 file {mp3_path}: {e}")
        return {}

    try:
        for duration in SNIPPET_DURATIONS:
            duration_ms = int(duration * 1000)
            snippet = audio[:duration_ms]
            snippet = snippet.set_frame_rate(44100).set_channels(2)
            snippet_path = os.path.join(output_dir, f"snippet_{duration}.mp3")
            snippet.export(snippet_path, format="mp3", bitrate="192k")
            snippets[str(duration)] = snippet_path

        # Full song snippet
        full_audio = audio.set_frame_rate(44100).set_channels(2)
        full_path = os.path.join(output_dir, "full.mp3")
        full_audio.export(full_path, format="mp3", bitrate="192k")
        snippets['full'] = full_path

    except Exception as e:
        print(f"  ✗ Error generating audio snippets for {mp3_path}: {e}")
        return {}

    return snippets


def sanitize_public_id(text):
    """Sanitize song identifier for Cloudinary public_id."""
    cleaned = re.sub(r'[^\w\s-]', '', text).strip()
    return re.sub(r'[-\s]+', '_', cleaned).lower()


def upload_snippet_to_cloudinary(file_path, song_name, snippet_type):
    """Upload snippet file to Cloudinary with retry logic."""
    if not file_path or not os.path.exists(file_path):
        return None

    clean_song_name = sanitize_public_id(song_name)
    public_id = f"ethiopian_songs/{clean_song_name}_{snippet_type}"

    max_retries = 3
    for attempt in range(1, max_retries + 1):
        try:
            print(f"  ├─ Uploading snippet {snippet_type}s...")
            response = cloudinary.uploader.upload(
                file_path,
                resource_type='video',  # Cloudinary audio assets are uploaded under video resource_type
                public_id=public_id,
                folder='ethiopian_songs',
                overwrite=True
            )
            return response.get('secure_url')
        except Exception as e:
            print(f"  ✗ Cloudinary snippet upload attempt {attempt}/{max_retries} failed: {e}")
            if attempt < max_retries:
                time.sleep(2)
    return None


def upload_album_art_to_cloudinary(image_bytes, song_name):
    """Upload album art image bytes to Cloudinary with retry logic."""
    if not image_bytes:
        return None

    clean_song_name = sanitize_public_id(song_name)
    public_id = f"ethiopian_songs_art/{clean_song_name}"

    temp_art_path = os.path.join('./snippets_temp', f"temp_art_{clean_song_name}.jpg")
    try:
        os.makedirs('./snippets_temp', exist_ok=True)
        with open(temp_art_path, 'wb') as f:
            f.write(image_bytes)

        max_retries = 3
        for attempt in range(1, max_retries + 1):
            try:
                print(f"  ├─ Uploading album art...")
                response = cloudinary.uploader.upload(
                    temp_art_path,
                    resource_type='image',
                    public_id=public_id,
                    folder='ethiopian_songs_art',
                    overwrite=True
                )
                return response.get('secure_url')
            except Exception as e:
                print(f"  ✗ Cloudinary art upload attempt {attempt}/{max_retries} failed: {e}")
                if attempt < max_retries:
                    time.sleep(2)
    finally:
        if os.path.exists(temp_art_path):
            try:
                os.remove(temp_art_path)
            except Exception:
                pass
    return None


def assign_difficulty(artist, title):
    """Assign difficulty rating ('easy', 'medium', 'hard') based on artist and title."""
    artist_lower = (artist or '').lower().strip()
    title_lower = (title or '').lower().strip()

    for e_artist, e_title in EASY_SONGS:
        if e_artist in artist_lower or e_title in title_lower:
            return 'easy'

    for m_artist, m_title in MEDIUM_SONGS:
        if m_artist in artist_lower or m_title in title_lower:
            return 'medium'

    return 'hard'


def process_song(mp3_path, song_id):
    """Process a single MP3 file: metadata -> snippets -> upload -> cleanup -> song dict."""
    temp_dir = os.path.join('./snippets_temp', f"song_{song_id}")
    try:
        print("  ├─ Extracting metadata from ID3 tags...")
        metadata = extract_metadata(mp3_path)

        song_identifier = f"{metadata['artist']}_{metadata['title']}"

        print("  ├─ Generating audio snippets...")
        snippets_local = generate_snippets(mp3_path, output_dir=temp_dir)
        if not snippets_local:
            print(f"  ✗ Failed to generate snippets for {mp3_path}")
            return None

        # Upload snippets to Cloudinary
        uploaded_snippets = {}
        for snippet_key in ['1.0', '2.0', '4.0', '8.0', '10.0', 'full']:
            file_path = snippets_local.get(snippet_key)
            if file_path:
                url = upload_snippet_to_cloudinary(file_path, song_identifier, snippet_key)
                uploaded_snippets[snippet_key] = url
            else:
                uploaded_snippets[snippet_key] = None

        # Upload album cover art if available
        art_url = None
        if metadata.get('album_art_bytes'):
            art_url = upload_album_art_to_cloudinary(metadata['album_art_bytes'], song_identifier)

        parsed_year = None
        if metadata['year']:
            try:
                parsed_year = int(metadata['year'])
            except (ValueError, TypeError):
                parsed_year = None

        song_data = {
            'id': song_id,
            'filename': os.path.basename(mp3_path),
            'artist': metadata['artist'],
            'title': metadata['title'],
            'album': metadata['album'] or 'Unknown',
            'year': parsed_year,
            'difficulty': assign_difficulty(metadata['artist'], metadata['title']),
            'albumArt': art_url,
            'snippets': {
                '1.0': uploaded_snippets.get('1.0'),
                '2.0': uploaded_snippets.get('2.0'),
                '4.0': uploaded_snippets.get('4.0'),
                '8.0': uploaded_snippets.get('8.0'),
                '10.0': uploaded_snippets.get('10.0'),
                'full': uploaded_snippets.get('full')
            }
        }

        return song_data
    finally:
        if os.path.exists(temp_dir):
            try:
                shutil.rmtree(temp_dir)
            except Exception:
                pass


def load_existing_metadata(output_file):
    """Load existing metadata list and find max ID."""
    if not os.path.exists(output_file):
        return [], 0
    try:
        with open(output_file, 'r', encoding='utf-8') as f:
            songs = json.load(f)
            if not isinstance(songs, list):
                return [], 0
            max_id = 0
            for song in songs:
                if isinstance(song, dict) and 'id' in song and isinstance(song['id'], int):
                    if song['id'] > max_id:
                        max_id = song['id']
            return songs, max_id
    except Exception as e:
        print(f"Warning: Could not read existing {output_file}: {e}")
        return [], 0


def save_json(songs_list, output_file):
    """Write songs list to JSON file."""
    try:
        with open(output_file, 'w', encoding='utf-8') as f:
            json.dump(songs_list, f, indent=2, ensure_ascii=False)
        print(f"\n✓ Successfully saved {len(songs_list)} songs to {output_file}")
    except Exception as e:
        print(f"✗ Error saving JSON to {output_file}: {e}")


def main():
    start_time = time.time()
    print("Starting audio processing... Loading configuration...")

    cloud_name = os.getenv('CLOUDINARY_CLOUD_NAME')
    if not cloud_name:
        print("✗ Error: CLOUDINARY_CLOUD_NAME is not set in environment or .env file")
        sys.exit(1)

    print(f"Configuration loaded:\n  Cloud Name: {cloud_name}\n  Folder: {SONGS_INPUT_FOLDER}/\n")

    mp3_files = find_mp3_files(SONGS_INPUT_FOLDER)
    if not mp3_files:
        print(f"No MP3 files to process. Make sure to place MP3 files in '{SONGS_INPUT_FOLDER}'.")
        return

    print(f"Found {len(mp3_files)} MP3 files in '{SONGS_INPUT_FOLDER}'\n")

    force_reprocess = '--force' in sys.argv or '--reprocess' in sys.argv
    existing_songs, max_id = load_existing_metadata(OUTPUT_JSON)

    existing_by_filename = {}
    existing_by_key = {}

    if not force_reprocess and existing_songs:
        print(f"✓ Loaded {len(existing_songs)} existing songs from {OUTPUT_JSON} (Highest ID: {max_id})")
        for s in existing_songs:
            if isinstance(s, dict):
                if 'filename' in s and s['filename']:
                    existing_by_filename[s['filename'].lower()] = s
                if 'artist' in s and 'title' in s:
                    key = f"{s['artist'].lower().strip()}_{s['title'].lower().strip()}"
                    existing_by_key[key] = s
    else:
        existing_songs = []
        max_id = 0
        if force_reprocess:
            print("Notice: --force flag active. Re-processing all files from scratch.")

    all_songs_map = {s['id']: s for s in existing_songs if isinstance(s, dict) and 'id' in s}
    current_max_id = max_id

    new_count = 0
    skipped_count = 0

    for idx, mp3_path in enumerate(mp3_files, 1):
        filename = os.path.basename(mp3_path)
        filename_key = filename.lower()

        # Fast extract metadata to check if song exists
        meta = extract_metadata(mp3_path)
        artist_title_key = f"{meta['artist'].lower().strip()}_{meta['title'].lower().strip()}"

        existing_song = existing_by_filename.get(filename_key) or existing_by_key.get(artist_title_key)

        if existing_song and not force_reprocess:
            print(f"[{idx}/{len(mp3_files)}] ↳ Skipping existing song (ID {existing_song['id']}): {filename}")
            skipped_count += 1
            all_songs_map[existing_song['id']] = existing_song
            continue

        # Process new song
        current_max_id += 1
        print(f"[{idx}/{len(mp3_files)}] Processing NEW song (Assigning ID {current_max_id}): {filename}")
        try:
            song_data = process_song(mp3_path, song_id=current_max_id)
            if song_data:
                all_songs_map[song_data['id']] = song_data
                new_count += 1
                print(f"  ✓ Successfully processed: {song_data['artist']} - {song_data['title']}\n")
            else:
                print(f"  ✗ Failed to process: {filename}\n")
                current_max_id -= 1
        except Exception as e:
            print(f"  ✗ Error processing song {filename}: {e}\n")
            current_max_id -= 1

    if os.path.exists('./snippets_temp'):
        try:
            shutil.rmtree('./snippets_temp')
        except Exception:
            pass

    final_songs = sorted(all_songs_map.values(), key=lambda s: s.get('id', 0))
    save_json(final_songs, OUTPUT_JSON)

    elapsed = time.time() - start_time
    minutes = int(elapsed // 60)
    seconds = int(elapsed % 60)

    print(f"\n✓ Complete! Total in dataset: {len(final_songs)} songs ({new_count} newly processed, {skipped_count} skipped)")
    print(f"Completed in {minutes} minutes {seconds} seconds")


if __name__ == "__main__":
    main()

