import re
import torch
from collections import Counter
from transformers import AutoTokenizer, AutoModelForSeq2SeqLM

# Cihaz kontrolü
device = torch.device("cuda" if torch.cuda.is_available() else "cpu")

# Açık kaynak çok dilli mT5 modeli
MODEL_NAME = "csebuetnlp/mT5_multilingual_XLSum"
tokenizer = AutoTokenizer.from_pretrained(MODEL_NAME)
model = AutoModelForSeq2SeqLM.from_pretrained(MODEL_NAME).to(device)

def extract_keywords(text: str, max_keywords: int = 5) -> list[str]:
    clean_text = re.sub(r"[^\w\s]", "", text.lower())
    words = clean_text.split()

    stop_words = {
        "ve", "bir", "bu", "ile", "için", "çok", "olan", "de", "da", "ne",
        "ki", "mi", "ama", "gibi", "şey", "daha", "ise", "yani", "veya"
    }

    filtered = [w for w in words if len(w) > 3 and w not in stop_words]
    most_common = Counter(filtered).most_common(max_keywords)
    return [word for word, _ in most_common]

def generate_questions(text: str, num_questions: int = 5) -> list[dict]:
    if not text.strip():
        return []

    keywords = extract_keywords(text, max_keywords=10)
    results = []
    seen = set()

    for keyword in keywords:
        # Bu model özetleme için eğitildiği için prompt'ı özel ayarlıyoruz
        prompt = f"Generate question about '{keyword}' from this text: {text.strip()}"
        input_ids = tokenizer.encode(prompt, return_tensors="pt", truncation=True, max_length=512).to(device)

        outputs = model.generate(
            input_ids,
            max_length=64,
            num_beams=5,
            num_return_sequences=3,
            early_stopping=True,
            no_repeat_ngram_size=2
        )

        for output in outputs:
            question = tokenizer.decode(output, skip_special_tokens=True).strip()
            if question and question not in seen:
                seen.add(question)
                results.append({
                    "question": question,
                    "answer": keyword,
                    "context": text
                })
                if len(results) >= num_questions:
                    return results

    return results
