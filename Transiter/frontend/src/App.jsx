import { useMemo, useState } from "react";
import ReactMarkdown from "react-markdown";
import logo from "./assets/logo.png";

const API = import.meta.env.VITE_API_URL;

const CITIES = ["Tokyo", "Osaka", "Kyoto"];
const ITEM_HEIGHT = 44;
const VISIBLE_COUNT = 3;

function CityWheel({ value, onChange }) {
  const [scrollTop, setScrollTop] = useState(0);
  const selectedIndex = useMemo(
    () => Math.max(0, CITIES.indexOf(value)),
    [value]
  );

  const onScroll = (e) => {
    const t = e.currentTarget.scrollTop;
    setScrollTop(t);
  };

  const onWheelClick = (index) => {
    const city = CITIES[index];
    if (city) onChange(city);
  };

  // Compute aria-selected based on scroll position
  const active = Math.round(scrollTop / ITEM_HEIGHT);

  return (
    <div
      className="city-wheel"
      onScroll={onScroll}
      style={{
        paddingTop: (VISIBLE_COUNT - 1) / 2 * ITEM_HEIGHT,
        paddingBottom: (VISIBLE_COUNT - 1) / 2 * ITEM_HEIGHT,
      }}
    >
      {CITIES.map((c, i) => (
        <div
          key={c}
          className="city-wheel-item"
          aria-selected={i === active || i === selectedIndex}
          role="option"
          onClick={() => onWheelClick(i)}
        >
          {c}
        </div>
      ))}
      <div className="city-wheel-overlay" aria-hidden="true" />
    </div>
  );
}

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
    <div className="card" id="ask">
      <h2>Ask Transiter</h2>
      <p className="section-sub">
        Get accurate answers about tickets, passes, and routes.
      </p>

      <label className="field-label">Your question</label>
      <input
        value={query}
        onChange={(e) => setQuery(e.target.value)}
        placeholder="E.g. What is the cheapest way to get from Shinjuku to Narita?"
      />

      <label className="field-label">City</label>
      <CityWheel value={city} onChange={setCity} />

      <div style={{ display: "flex", gap: 10 }}>
        <button onClick={ask} disabled={loading || !query.trim()}>
          {loading ? "Thinking…" : "Get Answer"}
        </button>
        <button
          className="btn-secondary"
          onClick={() => {
            setQuery("");
            setAnswer("");
          }}
        >
          Clear
        </button>
      </div>

      <div className="card-divider" />

      <div style={{ marginTop: 6, whiteSpace: "pre-wrap", maxHeight: "340px", overflowY: "auto" }} className="markdown">
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
    <div className="card" id="admin">
      <h2>Knowledge Ingestion</h2>
      <p className="section-sub">
        Add trusted URLs to improve Transiter’s city-specific guidance.
      </p>

      <label className="field-label">City</label>
      <CityWheel value={city} onChange={setCity} />

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

      <div style={{ display: "flex", gap: 10 }}>
        <button onClick={ingest}>Ingest</button>
        <button
          className="btn-secondary"
          onClick={() => {
            setUrls("");
            setTags("");
            setResult("");
          }}
        >
          Reset
        </button>
      </div>

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

  // Simple active nav highlighting based on hash
  const [hash, setHash] = useState(window.location.hash);
  window.onhashchange = () => setHash(window.location.hash);

  return (
    <>
      <header className="app-header">
        <div className="app-header-inner">
          <div className="brand">
            <img src={logo} alt="Transiter logo" />
            <div className="brand-name">Transiter</div>
          </div>
          <nav className="app-nav" aria-label="Primary">
            <a href="#ask" className={`nav-link ${hash === "#ask" ? "active" : ""}`}>Ask</a>
            <a href="#admin" className={`nav-link ${hash === "#admin" ? "active" : ""}`}>Admin</a>
          </nav>
          <div className="header-sub">Travel made easy</div>
        </div>
      </header>

      {/* soft animated brand waves */}
      <div className="bg-waves" aria-hidden="true">
        <div className="wave w1"></div>
        <div className="wave w2"></div>
        <div className="wave w3"></div>
      </div>

      {/* hero */}
      <section className="hero">
        <h1 className="hero-title">Transit answers, simplified.</h1>
        <p className="hero-lead">
          Smart, city‑aware guidance for tickets, passes, and routes—built to be fast,
          accurate, and easy on the eyes.
        </p>
        <div className="cta-group">
          <a href="#ask" className="btn">Ask a question</a>
          <a href="#admin" className="btn btn-secondary">Admin sign in</a>
        </div>
      </section>

      <div className="container">
        {/* value props */}
        <div className="card" style={{ display: "grid", gridTemplateColumns: "repeat(auto-fit,minmax(180px,1fr))", gap: 12 }}>
          <div>
            <h2 style={{ marginBottom: 6 }}>Reliable</h2>
            <p className="section-sub" style={{ margin: 0 }}>
              Answers sourced from official providers.
            </p>
          </div>
          <div>
            <h2 style={{ marginBottom: 6 }}>Localized</h2>
            <p className="section-sub" style={{ margin: 0 }}>
              Tailored to the city you select.
            </p>
          </div>
          <div>
            <h2 style={{ marginBottom: 6 }}>Up‑to‑date</h2>
            <p className="section-sub" style={{ margin: 0 }}>
              Continuously refreshed knowledge base.
            </p>
          </div>
        </div>

        <Chat />

        {!isAdmin ? (
          <div className="card" id="admin">
            <h2>Administrator Access</h2>
            <p className="section-sub">
              Enter your token to add official sources and keep results fresh.
            </p>
            <label className="field-label">Admin token</label>
            <input
              value={adminToken}
              onChange={(e) => setAdminToken(e.target.value)}
              placeholder="Enter admin token"
            />
            <div style={{ display: "flex", gap: 10 }}>
              <button onClick={tryLogin}>Sign in</button>
              <button
                className="btn-secondary"
                onClick={() => setAdminToken("")}
              >
                Clear
              </button>
            </div>
          </div>
        ) : (
          <Admin token={adminToken} />
        )}

        <footer className="footer">
          © {new Date().getFullYear()} Transiter. All rights reserved.
        </footer>
      </div>
    </>
  );
}
