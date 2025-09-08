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
      <h2 style="margin-bottom: 30px;">User Dashboard</h2>
      <input
        value={query}
        onChange={(e) => setQuery(e.target.value)}
        placeholder="Ask anything about your transit (e.g. passes, tickets, routes)..."
      />

      <label
        style={{
          display: "block",
          marginBottom: "6px",
          color: "#38bdf8",
          fontWeight: "bold",
        }}
      >
        Select City
      </label>
      <select
        value={city}
        onChange={(e) => setCity(e.target.value)}
        style={{
          background: "#1e293b",
          color: "white",
          borderRadius: "8px",
          padding: "10px",
          width: "100%",
          marginBottom: "10px",
          border: "1px solid #38bdf8",
        }}
      >
        <option value="Tokyo">Tokyo</option>
        <option value="Osaka">Osaka</option>
        <option value="Kyoto">Kyoto</option>
      </select>

      <button onClick={ask} disabled={loading || !query.trim()}>
        {loading ? "Thinking…" : "Submit"}
      </button>

      <div style={{ marginTop: 16, whiteSpace: "pre-wrap", maxHeight: "300px", overflowY: "auto" }}>
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
      <h2>Admin: Ingest URLs</h2>
      <select
        value={city}
        onChange={(e) => setCity(e.target.value)}
        style={{
          background: "#1e293b",
          color: "white",
          borderRadius: "8px",
          padding: "10px",
          width: "100%",
          marginBottom: "10px",
          border: "1px solid #38bdf8",
        }}
      >
        <option value="Tokyo">Tokyo</option>
        <option value="Osaka">Osaka</option>
        <option value="Kyoto">Kyoto</option>
      </select>
      <textarea
        rows={3}
        value={urls}
        onChange={(e) => setUrls(e.target.value)}
        placeholder="Enter URLs separated by spaces"
      />
      <input
        value={tags}
        onChange={(e) => setTags(e.target.value)}
        placeholder="Enter tags, comma separated"
      />
      <button onClick={ingest}>Ingest</button>
      <pre style={{ marginTop: 12, fontSize: "0.85em", whiteSpace: "pre-wrap" }}>
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
      {/* 🌊 rotating wave layers */}
      <div className="wave"></div>
      <div className="wave wave2"></div>
      <div className="wave wave3"></div>

      <div className="container">
         <h1 style={{ marginTop: "60px", marginBottom: "30px" }}>Transiter (Travel Made Easy)</h1>


        <Chat />

        {!isAdmin ? (
          <div className="card">
            <h2>Want to expand our knowledge base?</h2>
            <input
              value={adminToken}
              onChange={(e) => setAdminToken(e.target.value)}
              placeholder="For authorization, enter the admin token."
            />
            <button onClick={tryLogin}>Enter</button>
          </div>
        ) : (
          <Admin token={adminToken} />
        )}
      </div>
    </>
  );
}
