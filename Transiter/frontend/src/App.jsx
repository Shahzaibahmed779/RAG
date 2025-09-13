import { useEffect, useMemo, useRef, useState } from "react";
import ReactMarkdown from "react-markdown";
import logo from "./assets/logo.png";

const API = import.meta.env.VITE_API_URL;

const CITIES = ["Tokyo", "Osaka", "Kyoto"];
const ITEM_HEIGHT = 44;

function CityWheel({ value, onChange }) {
  const containerRef = useRef(null);
  const [active, setActive] = useState(0);

  const selectedIndex = useMemo(
    () => Math.max(0, CITIES.indexOf(value)),
    [value]
  );

  // Keep the selected item centered when value changes
  useEffect(() => {
    const el = containerRef.current;
    if (!el) return;
    const idx = Math.max(0, CITIES.indexOf(value));
    const centerOffset = el.clientHeight / 2 - ITEM_HEIGHT / 2;
    const target = Math.max(0, idx * ITEM_HEIGHT - centerOffset);
    el.scrollTo({ top: target, behavior: "smooth" });
    setActive(idx);
  }, [value]);

  const onScroll = (e) => {
    const el = e.currentTarget;
    const centerOffset = el.clientHeight / 2 - ITEM_HEIGHT / 2;
    const idx = Math.round((el.scrollTop + centerOffset) / ITEM_HEIGHT);
    setActive(idx);
  };

  const onWheelClick = (index) => {
    const city = CITIES[index];
    if (city) onChange(city);
  };

  return (
    <div
      ref={containerRef}
      className="city-wheel"
      onScroll={onScroll}
      role="listbox"
      aria-label="Select city"
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
    <div className="card reveal" id="ask">
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
      <div className="city-pills" aria-label="Quick city selection">
        {CITIES.map((c) => (
          <button
            key={c}
            type="button"
            className={`pill ${city === c ? "active" : ""}`}
            onClick={() => setCity(c)}
          >
            {c}
          </button>
        ))}
      </div>
      <div className="field-hint">Tip: Tap a city above or scroll the wheel below.</div>
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
    <div className="card reveal" id="admin">
      <h2>Administrator Access</h2>
      <p className="section-sub">
        Enter your token to add official sources and keep results fresh.
      </p>

      <label className="field-label">City</label>
      <div className="city-pills" aria-label="Quick city selection">
        {CITIES.map((c) => (
          <button
            key={c}
            type="button"
            className={`pill ${city === c ? "active" : ""}`}
            onClick={() => setCity(c)}
          >
            {c}
          </button>
        ))}
      </div>
      <div className="field-hint">Tip: Tap a city above or scroll the wheel below.</div>
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

  // Reveal-on-scroll effect for sections
  useEffect(() => {
    const els = Array.from(document.querySelectorAll(".reveal"));
    if (!("IntersectionObserver" in window) || els.length === 0) {
      els.forEach((el) => el.classList.add("is-visible"));
      return;
    }
    const obs = new IntersectionObserver(
      (entries) => {
        entries.forEach((entry) => {
          if (entry.isIntersecting) {
            entry.target.classList.add("is-visible");
          }
        });
      },
      { threshold: 0.1 }
    );
    els.forEach((el) => obs.observe(el));
    return () => obs.disconnect();
  }, []);

  return (
    <>
      <header className="app-header">
        <div className="app-header-inner">
          <div className="brand">
            <img src={logo} alt="Transiter logo" />
            <div className="brand-name">Transiter</div>
          </div>
        </div>
      </header>

      {/* original-style rotating wave layers */}
      <div className="wave"></div>
      <div className="wave wave2"></div>
      <div className="wave wave3"></div>

      {/* hero */}
      <section className="hero">
        <h1 className="hero-title">Transit answers, simplified.</h1>
        <div className="cta-group">
          <a href="#ask" className="btn">Ask a question</a>
          <a href="#admin" className="btn btn-secondary">Admin sign in</a>
        </div>
      </section>

      <div className="container">
        {/* value props */}
        <div className="card reveal" style={{ display: "grid", gridTemplateColumns: "repeat(auto-fit,minmax(180px,1fr))", gap: 12 }}>
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
          <div className="card reveal" id="admin">
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
