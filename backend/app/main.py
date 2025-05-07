# backend/app/main.py
from fastapi import FastAPI, UploadFile, File, HTTPException
from fastapi.middleware.cors import CORSMiddleware
from pydantic import BaseModel
from yt_dlp import YoutubeDL
import tempfile, uuid, os, glob

from .asr import transcribe
from .qg import generate_questions

app = FastAPI(title="NLP Web App API")

app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"],
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

# ────────────────────────────────
# 1. Dosya Yükle ve Transkrip
# ────────────────────────────────
@app.post("/transcribe/")
async def do_transcribe(file: UploadFile = File(...)):
    tmp_path = os.path.join(tempfile.gettempdir(), uuid.uuid4().hex)
    with open(tmp_path, "wb") as f:
        f.write(await file.read())

    text, timestamps = transcribe(tmp_path)
    os.remove(tmp_path)
    return {"text": text, "timestamps": timestamps}


# ────────────────────────────────
# 2. YouTube URL'den Transkrip
# ────────────────────────────────
FFMPEG_BIN_DIR = r"C:\Users\yusuf\AppData\Local\Microsoft\WinGet\Links"

class UrlInput(BaseModel):
    url: str

@app.post("/transcribe_url/")
async def do_transcribe_url(data: UrlInput):
    if not data.url.startswith("http"):
        raise HTTPException(400, "Invalid URL")

    base = os.path.join(tempfile.gettempdir(), uuid.uuid4().hex)
    ydl_opts = {
        "format": "bestaudio/best",
        "outtmpl": base + ".%(ext)s",
        "noplaylist": True,
        "quiet": True,
        "ffmpeg_location": FFMPEG_BIN_DIR,
    }

    try:
        with YoutubeDL(ydl_opts) as ydl:
            ydl.download([data.url])
    except Exception as e:
        raise HTTPException(400, f"Download failed: {e}")

    downloaded = glob.glob(base + ".*")
    if not downloaded:
        raise HTTPException(500, "No file was downloaded")

    audio_path = downloaded[0]
    text, timestamps = transcribe(audio_path)
    os.remove(audio_path)
    return {"text": text, "timestamps": timestamps}


# ────────────────────────────────
# 3. Soru Oluşturma
# ────────────────────────────────
class TextInput(BaseModel):
    text: str

@app.post("/questions/")
async def do_questions(data: TextInput):
    if not data.text.strip():
        raise HTTPException(400, "Text is empty")
    return {"questions": generate_questions(data.text)}
