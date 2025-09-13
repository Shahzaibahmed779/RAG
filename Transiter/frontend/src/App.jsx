import { useState } from "react";
import ReactMarkdown from "react-markdown";

const API = import.meta.env.VITE_API_URL;

function Chat() {
  const [query, setQuery] = useState("");
  const [city, setCity] = useState("Tokyo");
  const [answer, setAnswer] = useState("");
  const [loading, setLoading] = useState(false);

  const ask = async () => {
    setLoading(true);
    setAnswer("");
    try {
      const res = await fetch(`${API}/ask`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ query, city }),
      });
      const data = await res.json();
      setAnswer(data.answer || data.error);
    } catch {
      setAnswer("Error fetching answer.");
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="card">
      <h2 style={{ marginBottom: "14px" }}>Ask Transiter</h2>
      <p style={{ marginTop: 0, marginBottom: "14px", opacity: 0.9 }}>
        Get fast, friendly answers about tickets, passes, routes and more.
      </p>

      <label className="field-label">Your question</label>
      <input
        value={query}
        onChange={(e) => setQuery(e.target.value)}
        placeholder="E.g. What is the cheapest way to get from Shinjuku to Narita?"
      />

      <label className="field-label">City</label>
      <select
        value={city}
        onChange={(e) => setCity(e.target.value)}
      >
        <option value="Tokyo">Tokyo</option>
        <option value="Osaka">Osaka</option>
        <option value="Kyoto">Kyoto</option>
      </select>

      <button onClick={ask} disabled={loading || !query.trim()}>
        {loading ? "Thinking…" : "Get Answer"}
      </button>

      <div style={{ marginTop: 16, whiteSpace: "pre-wrap", maxHeight: "320px", overflowY: "auto" }} className="markdown">
        <ReactMarkdown>{answer}</ReactMarkdown>
      </div>
    </div>
  );
}

function Admin({ token }) {
  const [city, setCity] = useState("Tokyo");
  const [urls, setUrls] = useState("");
  const [tags, setTags] = useState("");
  const [result, setResult] = useState("");

  const ingest = async () => {
    setResult("Working…");
    try {
      const body = {
        city,
        category: "Transit",
        urls: urls.split(/\s+/).filter(Boolean),
        tags: tags.split(",").map((t) => t.trim()).filter(Boolean),
      };
      const res = await fetch(`${API}/admin/ingest/url`, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          "x-admin-token": token,
        },
        body: JSON.stringify(body),
      });
      const data = await res.json();
      setResult(JSON.stringify(data, null, 2));
    } catch {
      setResult("Error ingesting.");
    }
  };

  return (
    <div className="card">
      <h2>Knowledge Ingestion</h2>
      <p style={{ marginTop: 0, marginBottom: "12px", opacity: 0.9 }}>
        Add trusted URLs to improve Transiter’s city-specific guidance.
      </p>

      <label className="field-label">City</label>
      <select
        value={city}
        onChange={(e) => setCity(e.target.value)}
      >
        <option value="Tokyo">Tokyo</option>
        <option value="Osaka">Osaka</option>
        <option value="Kyoto">Kyoto</option>
      </select>

      <label className="field-label">URLs (space separated)</label>
      <textarea
        rows={3}
        value={urls}
        onChange={(e) => setUrls(e.target.value)}
        placeholder="https://www.metro.tokyo.jp/ ... https://www.jreast.co.jp/ ..."
      />

      <label className="field-label">Tags (comma separated)</label>
      <input
        value={tags}
        onChange={(e) => setTags(e.target.value)}
        placeholder="fares, passes, routes"
      />

      <button onClick={ingest}>Ingest</button>
      <pre style={{ marginTop: 12, fontSize: "0.9em", whiteSpace: "pre-wrap" }}>
        {result}
      </pre>
    </div>
  );
}

export default function App() {
  const [adminToken, setAdminToken] = useState("");
  const [isAdmin, setIsAdmin] = useState(false);

  const tryLogin = () => {
    if (adminToken === "iamironman") {
      setIsAdmin(true);
    } else {
      alert("Wrong admin token!");
    }
  };

  return (
    <>
      {/* brand background accents */}
      <div className="wave"></div>
      <div className="wave wave2"></div>
      <div className="wave wave3"></div>

      <div className="container">
        <h1 style={{ marginTop: "46px", marginBottom: "6px" }}>Transiter</h1>
        <p style={{ textAlign: "center", marginTop: 0, marginBottom: "26px", opacity: 0.9 }}>
          Travel made easy with clear, local transit guidance.
        </p>

        <Chat />

        {!isAdmin ? (
          <div className="card">
            <h2>Administrator Access</h2>
            <p style={{ marginTop: 0, marginBottom: "12px", opacity: 0.9 }}>
              Enter your token to add official sources and keep results fresh.
            </p>
            <label className="field-label">Admin token</label>
            <input
              value={adminToken}
              onChange={(e) => setAdminToken(e.target.value)}
              placeholder="Enter admin token"
            />
            <button onClick={tryLogin}>Sign in</button>
          </div>
        ) : (
          <Admin token={adminToken} />
        )}
      </div>
    </>
  );
}
