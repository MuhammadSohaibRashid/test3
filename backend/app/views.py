import os
from django.http import JsonResponse
from googleapiclient.discovery import build
from googleapiclient.errors import HttpError
from urllib.parse import urlparse, parse_qs
import boto3
import yt_dlp
import logging
from django.conf import settings
from django.views.decorators.csrf import csrf_exempt
import json
import tempfile
import whisper
from transformers import pipeline
from youtube_transcript_api import YouTubeTranscriptApi
import torch
import openai

logger = logging.getLogger(__name__)

# Ensure the YouTube API key is set in environment variables
YOUTUBE_API_KEY = os.getenv("YOUTUBE_API_KEY")
OPENAI_API_KEY = os.getenv("OPENAI_API_KEY")

if not YOUTUBE_API_KEY:
    raise ValueError("YouTube API Key not set. Please configure it in environment variables.")
if not OPENAI_API_KEY:
    raise ValueError("OpenAI API Key not set. Please configure it in environment variables.")

openai.api_key = OPENAI_API_KEY

# Extract Video ID from URL
def extract_video_id(video_url):
    try:
        parsed_url = urlparse(video_url)
        if parsed_url.netloc in ["www.youtube.com", "youtube.com"]:
            query_params = parse_qs(parsed_url.query)
            return query_params.get("v", [None])[0]
        elif parsed_url.netloc == "youtu.be":
            return parsed_url.path.strip("/")
        return None
    except Exception as e:
        logger.error(f"Error extracting video ID: {e}")
        return None

# Fetch Video Metadata
@csrf_exempt
def fetch_video_data(request):
    if request.method != "GET":
        return JsonResponse({"error": "Invalid request method."}, status=405)

    video_url = request.GET.get("url")
    if not video_url:
        return JsonResponse({"error": "No URL provided"}, status=400)

    video_id = extract_video_id(video_url)
    if not video_id:
        return JsonResponse({"error": "Invalid YouTube URL"}, status=400)

    try:
        youtube = build("youtube", "v3", developerKey=YOUTUBE_API_KEY)
        response = youtube.videos().list(part="snippet", id=video_id).execute()

        if "items" not in response or not response["items"]:
            return JsonResponse({"error": "Video not found"}, status=404)

        video_data = response["items"][0]["snippet"]
        return JsonResponse({
            "title": video_data["title"],
            "thumbnail": video_data["thumbnails"]["high"]["url"],
        })

    except HttpError as e:
        logger.error(f"Error fetching video metadata: {e}")
        return JsonResponse({"error": f"Error fetching video metadata: {e}"}, status=500)
    except Exception as e:
        logger.error(f"An unexpected error occurred: {e}")
        return JsonResponse({"error": f"An unexpected error occurred: {e}"}, status=500)

# Download Video and Upload to S3
@csrf_exempt
def download_video(request):
    if request.method != "POST":
        return JsonResponse({"error": "Invalid request method."}, status=405)

    data = json.loads(request.body)
    video_url = data.get("url")

    if not video_url:
        return JsonResponse({"error": "No URL provided"}, status=400)

    video_id = extract_video_id(video_url)
    if not video_id:
        return JsonResponse({"error": "Invalid YouTube URL"}, status=400)

    downloaded_file = f"/tmp/{video_id}.mp4"
    try:
        ydl_opts = {
            'format': 'best',
            'outtmpl': downloaded_file,
            'quiet': False,
            'logger': logger,
        }

        with yt_dlp.YoutubeDL(ydl_opts) as ydl:
            logger.debug(f"Downloading video: {video_url}")
            ydl.download([video_url])

        if not os.path.exists(downloaded_file):
            return JsonResponse({"error": "Downloaded file not found."}, status=500)

        s3_client = boto3.client(
            's3',
            aws_access_key_id=settings.AWS_ACCESS_KEY_ID,
            aws_secret_access_key=settings.AWS_SECRET_ACCESS_KEY
        )
        s3_key = f"videos/{video_id}.mp4"
        logger.debug(f"Uploading to S3 bucket: {settings.AWS_STORAGE_BUCKET_NAME}, key: {s3_key}")
        s3_client.upload_file(downloaded_file, settings.AWS_STORAGE_BUCKET_NAME, s3_key)

        os.remove(downloaded_file)

        video_url_s3 = f"https://{settings.AWS_STORAGE_BUCKET_NAME}.s3.amazonaws.com/{s3_key}"
        return JsonResponse({"message": "Video uploaded successfully.", "url": video_url_s3})

    except yt_dlp.utils.DownloadError as e:
        logger.error(f"Download failed: {str(e)}")
        return JsonResponse({"error": f"Download error: {str(e)}"}, status=500)
    except boto3.exceptions.S3UploadFailedError as e:
        logger.error(f"S3 upload failed: {str(e)}")
        return JsonResponse({"error": f"S3 upload failed: {str(e)}"}, status=500)
    except Exception as e:
        logger.exception("Unexpected error occurred")
        return JsonResponse({"error": f"Unexpected error: {str(e)}"}, status=500)
    finally:
        if os.path.exists(downloaded_file):
            try:
                os.remove(downloaded_file)
            except Exception as e:
                logger.error(f"Failed to clean up file: {downloaded_file}, Error: {str(e)}")

# Fetch Video Transcript
def fetch_transcript(video_id):
    """Fetches the transcript using YouTubeTranscriptApi if available."""
    try:
        transcript_list = YouTubeTranscriptApi.list_transcripts(video_id)
        for transcript in transcript_list:
            if not transcript.is_generated:
                segments = transcript.fetch()
                return " ".join(segment['text'] for segment in segments)
        
        auto_transcript = transcript_list.find_generated_transcript(['en'])
        if auto_transcript:
            segments = auto_transcript.fetch()
            return " ".join(segment['text'] for segment in segments)

    except Exception as e:
        logger.error(f"Error fetching transcript: {e}")
    return None

# Whisper Transcription Fallback
def transcribe_with_whisper(video_url):
    try:
        with tempfile.TemporaryDirectory() as temp_dir:
            temp_audio_file = os.path.join(temp_dir, "audio.mp3")

            ydl_opts = {
                'format': 'bestaudio/best',
                'outtmpl': temp_audio_file,
                'extractaudio': True,
                'audioquality': 1,
            }

            # Download audio using yt-dlp
            with yt_dlp.YoutubeDL(ydl_opts) as ydl:
                ydl.download([video_url])

            # Convert to wav for Whisper
            audio = whisper.audio.load_audio(temp_audio_file)
            model = whisper.load_model("large")
            result = model.transcribe(audio)
            return result['text']

    except Exception as e:
        logger.error(f"Error during Whisper transcription: {e}")
    return None

# Hugging Face Summarization
def summarize_text(text):
    try:
        summarizer = pipeline("summarization", model="facebook/bart-large-cnn", device=0 if torch.cuda.is_available() else -1)
        max_input_length = 1024
        chunk_overlap = 100
        text_chunks = [
            text[i:i + max_input_length]
            for i in range(0, len(text), max_input_length - chunk_overlap)
        ]
        summaries = [
            summarizer(chunk, max_length=100, min_length=50, do_sample=False)[0]['summary_text']
            for chunk in text_chunks
        ]
        return " ".join(summaries)
    except Exception as e:
        logger.error(f"Error summarizing text: {e}")
        return None

# Generate Optimized Content with OpenAI
def generate_optimized_content(summarized_transcript):
    try:
        prompt = f"""
        Analyze the following summarized YouTube video transcript and:
        1. Extract the top 10 keywords.
        2. Generate an optimized title (less than 65 characters).
        3. Create an engaging description.
        4. Generate related tags for the video.

        Summarized Transcript:
        {summarized_transcript}

        Provide the results in the following JSON format:
        {{
            "keywords": ["keyword1", "keyword2", ..., "keyword10"],
            "title": "Generated Title",
            "description": "Generated Description",
            "tags": ["tag1", "tag2", ..., "tag10"]
        }}
        """
        response = openai.ChatCompletion.create(
            model="gpt-4o",
            messages=[
                {"role": "system", "content": "You are an SEO expert."},
                {"role": "user", "content": prompt}
            ]
        )
        response_content = response['choices'][0]['message']['content']
        return json.loads(response_content)

    except Exception as e:
        logger.error(f"Error generating optimized content: {e}")
        return None

# API Endpoint for Content Optimization
@csrf_exempt
def optimize_video_content(request):
    if request.method != "POST":
        return JsonResponse({"error": "Invalid request method."}, status=405)

    data = json.loads(request.body)
    video_url = data.get("url")

    if not video_url:
        return JsonResponse({"error": "No URL provided"}, status=400)

    video_id = extract_video_id(video_url)
    if not video_id:
        return JsonResponse({"error": "Invalid YouTube URL"}, status=400)

    # Fetch transcript
    transcript = fetch_transcript(video_id)
    if not transcript:
        transcript = transcribe_with_whisper(video_url)

    if not transcript:
        return JsonResponse({"error": "Could not fetch or transcribe the video."}, status=500)

    # Summarize transcript
    summary = summarize_text(transcript)
    if not summary:
        return JsonResponse({"error": "Error summarizing transcript."}, status=500)

    # Generate optimized content
    optimized_content = generate_optimized_content(summary)
    if not optimized_content:
        return JsonResponse({"error": "Error generating optimized content."}, status=500)

    return JsonResponse({"summary": summary, "optimized_content": optimized_content})
