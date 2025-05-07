/* frontend/src/api.js */

const BASE = "http://127.0.0.1:8000";        // backend’in çalıştığı adres

// ───────────────────────── 1) Dosya yükleyerek transkripsiyon ─────────────────────────
export async function transcribeFile(file) {
  const fd = new FormData();
  fd.append("file", file);

  const res = await fetch(`${BASE}/transcribe/`, {
    method: "POST",
    body: fd,
  });

  if (!res.ok) {
    const msg = await res.text();
    throw new Error(`[${res.status}] ${msg}`);
  }
  return res.json();               //  { text, timestamps }
}

// ───────────────────────── 2) YouTube (veya başka) URL transkripsiyon ─────────────────
export async function transcribeUrl(url) {
  const res = await fetch(`${BASE}/transcribe_url/`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ url }),       //  ← url anahtarı ŞART
  });

  if (!res.ok) {
    const msg = await res.text();
    throw new Error(`[${res.status}] ${msg}`);
  }
  return res.json();
}

// ───────────────────────── 3) Metinden soru üretme ────────────────────────────────────
export async function getQuestions(text) {
  const res = await fetch(`${BASE}/questions/`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ text }),
  });

  if (!res.ok) {
    const msg = await res.text();
    throw new Error(`[${res.status}] ${msg}`);
  }
  return res.json();                //  { questions: [...] }
}
