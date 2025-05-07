# backend/app/asr.py

from faster_whisper import WhisperModel

# Whisper 'medium' modeli, CPU'da int8 ile çalışacak şekilde ayarlanıyor
model = WhisperModel(
    "medium",              # model boyutu: small, medium, large
    device="cpu",          # GPU yoksa cpu kullan
    compute_type="int8"    # CPU için düşük bellekli ve hızlı seçenek
)

def transcribe(audio_path: str):
    # Ses dosyasını parçalar hâlinde işleyip metne dönüştür
    segments, _ = model.transcribe(
        audio_path,
        beam_size=5,         # daha iyi doğruluk için arama genişliği
        vad_filter=True,     # sessiz bölümleri atla
        chunk_length=30      # 30 saniyelik parçalara böl
    )

    # Tüm segmentleri birleştir, zaman bilgilerini de al
    text = " ".join(s.text for s in segments)
    timestamps = [(s.start, s.end) for s in segments]
    return text, timestamps
