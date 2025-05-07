# backend/app/qg.py

from transformers import T5ForConditionalGeneration, T5Tokenizer
import torch

# GPU varsa kullan, yoksa CPU
device = torch.device("cuda" if torch.cuda.is_available() else "cpu")

# T5-large modelini ve tokenizer'ı yükle
tokenizer = T5Tokenizer.from_pretrained("t5-large")
model = T5ForConditionalGeneration.from_pretrained("t5-large").to(device)

def generate_questions(text: str):
    if not text.strip():
        return []

    input_text = f"generate question: {text.strip()} </s>"
    input_ids = tokenizer.encode(
        input_text,
        return_tensors="pt",
        truncation=True,      # çok uzun metinleri keser
        max_length=512        # T5 için giriş sınırı
    ).to(device)

    # Modelden 3 farklı soru üret
    outputs = model.generate(
        input_ids,
        max_length=64,
        num_beams=4,
        early_stopping=True,
        num_return_sequences=3
    )

    questions = []
    for out in outputs:
        question = tokenizer.decode(out, skip_special_tokens=True)
        questions.append({
            "question": question,
            "sentence": text  # bağlam için orijinal metni ekle
        })

    return questions
