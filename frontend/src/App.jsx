import { useState, useRef } from "react";
import { transcribeFile, transcribeUrl, getQuestions } from "./api";

export default function App() {
  const [mode, setMode] = useState("upload");
  const [url, setUrl] = useState("");
  const [file, setFile] = useState(null);
  const [text, setText] = useState("");
  const [qas, setQas] = useState([]);
  const [progress, setProgress] = useState(0);
  const [recording, setRecording] = useState(false);
  const mediaRecorderRef = useRef(null);
  const audioChunksRef = useRef([]);

  const resetInputs = () => {
    setUrl("");
    setFile(null);
    setText("");
    setQas([]);
  };

  const handleModeClick = (m) => {
    setMode(m);
    resetInputs();
  };

  const handleUrlChange = (e) => setUrl(e.target.value);
  const handleFileChange = (e) => setFile(e.target.files[0]);

  const handleRecord = async () => {
    if (!recording) {
      const stream = await navigator.mediaDevices.getUserMedia({ audio: true });
      const mr = new MediaRecorder(stream);
      audioChunksRef.current = [];
      mr.ondataavailable = (e) => audioChunksRef.current.push(e.data);
      mr.start();
      mediaRecorderRef.current = mr;
      setRecording(true);
    } else {
      mediaRecorderRef.current.stop();
      mediaRecorderRef.current.onstop = () => {
        const blob = new Blob(audioChunksRef.current, { type: "audio/webm" });
        setFile(new File([blob], "recording.webm"));
      };
      setRecording(false);
    }
  };

  const startSmartProgress = () => {
    let current = 0;
    return setInterval(() => {
      setProgress((prev) => {
        current += 1;
        if (prev < 90) return prev + 1;
        if (prev < 98) return prev + 0.25;
        return prev;
      });
    }, 500);
  };

  const handleTranscribe = async () => {
    setText("");
    setQas([]);
    setProgress(1);
    const timer = startSmartProgress();

    try {
      let result;
      if (mode === "url") {
        if (!url.startsWith("http")) {
          alert("Geçerli bir URL girin.");
          return;
        }
        result = await transcribeUrl(url);
      } else {
        if (!file) {
          alert("Önce bir dosya seçin veya kayıt yapın.");
          return;
        }
        result = await transcribeFile(file);
      }
      setText(result.text);
      setProgress(100);
    } catch (err) {
      alert("Transkripsiyon başarısız: " + err.message);
      setProgress(0);
    } finally {
      clearInterval(timer);
      setTimeout(() => setProgress(0), 1200);
    }
  };

  const handleGenerate = async () => {
    if (!text) {
      alert("Önce metni oluşturun.");
      return;
    }

    setQas([]);
    setProgress(1);
    const timer = startSmartProgress();

    try {
      const { questions } = await getQuestions(text);
      setQas(questions);
      setProgress(100);
    } catch (err) {
      alert("Soru oluşturulamadı: " + err.message);
      setProgress(0);
    } finally {
      clearInterval(timer);
      setTimeout(() => setProgress(0), 1200);
    }
  };

  return (
    <div className="flex h-screen bg-gray-100">
      <aside className="w-1/4 bg-white p-6 shadow-lg space-y-4">
        <h1 className="text-2xl font-bold text-indigo-600">NLP App</h1>

        <div className="flex flex-col gap-2">
          {["url", "upload", "record"].map((m) => (
            <button
              key={m}
              onClick={() => handleModeClick(m)}
              className={`py-2 rounded ${mode === m ? "bg-indigo-600 text-white" : "bg-indigo-100 text-gray-700"}`}
            >
              {m === "url" && "Paste URL"}
              {m === "upload" && "Upload File"}
              {m === "record" && (recording ? "Stop Recording" : "Record Audio")}
            </button>
          ))}
        </div>

        {mode === "url" && (
          <input
            type="text"
            className="w-full p-2 border rounded"
            placeholder="Audio URL"
            value={url}
            onChange={handleUrlChange}
          />
        )}
        {mode === "upload" && (
          <input
            type="file"
            accept="audio/*"
            className="w-full"
            onChange={handleFileChange}
          />
        )}

        <button
          onClick={mode === "record" ? handleRecord : handleTranscribe}
          className="w-full py-2 bg-green-600 text-white font-semibold rounded"
        >
          {mode === "record"
            ? (recording ? "Stop & Convert" : "Start Recording")
            : "Convert to Text"}
        </button>

        {progress > 0 && (
          <div className="mt-4">
            <div className="w-full bg-gray-300 rounded-full h-4">
              <div
                className="bg-indigo-600 h-4 rounded-full transition-all"
                style={{ width: `${progress}%` }}
              ></div>
            </div>
            <div className="text-center text-sm text-indigo-700 mt-1">
              {Math.floor(progress)}%
            </div>
          </div>
        )}
      </aside>

      <main className="flex-1 p-6 flex flex-col">
        <h2 className="text-xl font-semibold mb-4">Transcript / Input</h2>

        <textarea
          className="flex-1 mb-4 p-3 border rounded resize-none bg-white"
          placeholder="Transcribed text appears here…"
          value={text}
          onChange={(e) => setText(e.target.value)}
        />

        <div className="text-right mb-6">
          <button
            onClick={handleGenerate}
            className="px-6 py-2 bg-indigo-600 text-white rounded font-medium"
          >
            Generate Questions
          </button>
        </div>

        {qas.length > 0 && (
          <section className="bg-white p-4 rounded shadow overflow-auto">
            <h3 className="text-lg font-semibold mb-3">Questions</h3>
            <ul className="list-decimal list-inside space-y-2">
              {qas.map((qa, i) => (
                <li key={i}>
                  <strong>Q:</strong> {qa.question}
                  <br />
                  <em className="text-sm text-gray-600">Context:</em> {qa.sentence}
                </li>
              ))}
            </ul>
          </section>
        )}
      </main>
    </div>
  );
}
