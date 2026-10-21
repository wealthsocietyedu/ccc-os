import { useEffect, useState } from "react";
import { auth } from "./lib/api";
import SmartClipper from "./components/SmartClipper";
import VideoDownloader from "./components/VideoDownloader";
import ChannelDownloader from "./components/ChannelDownloader";
import "./clipper.css";

export default function App() {
  const [user, setUser] = useState(null),
    [loading, setLoading] = useState(true),
    [page, setPage] = useState("clipper"),
    [error, setError] = useState("");
  useEffect(() => {
    if (!localStorage.getItem("ccc_token")) {
      setLoading(false);
      return;
    }
    auth
      .me()
      .then((d) => setUser(d.user))
      .catch(() => localStorage.removeItem("ccc_token"))
      .finally(() => setLoading(false));
  }, []);
  async function login(e) {
    e.preventDefault();
    setError("");
    setLoading(true);
    const data = new FormData(e.currentTarget);
    try {
      const r = await auth.login(data.get("email"), data.get("password"));
      localStorage.setItem("ccc_token", r.token);
      setUser(r.user);
    } catch (e) {
      setError(e.message);
    } finally {
      setLoading(false);
    }
  }
  if (!user)
    return (
      <main className="login">
        <form className="panel" onSubmit={login}>
          <span className="eyebrow">CCC OS / PERSONAL WORKSPACE</span>
          <h1>
            Find the moments
            <br />
            worth keeping.
          </h1>
          <p>Sign in to your clipping workspace.</p>
          <label>
            Email
            <input name="email" type="email" autoComplete="username" required />
          </label>
          <label>
            Password
            <input
              name="password"
              type="password"
              autoComplete="current-password"
              required
            />
          </label>
          {error && (
            <p role="alert" className="error">
              {error}
            </p>
          )}
          <button className="primary" disabled={loading}>
            {loading ? "Loading…" : "Sign in"}
          </button>
        </form>
      </main>
    );
  return (
    <div className="workspace">
      <aside className="rail">
        <div>
          <div className="brand">
            CCC<span>OS</span>
          </div>
          <p className="muted">Your clipping workspace</p>
        </div>
        <nav aria-label="Workspace">
          {[
            ["clipper", "✂", "Clipper"],
            ["video", "↓", "Video Downloader"],
            ["channel", "⇣", "Channel Downloader"],
          ].map(([id, icon, label]) => (
            <button
              key={id}
              className={page === id ? "active" : ""}
              onClick={() => setPage(id)}
            >
              <span>{icon}</span>
              {label}
            </button>
          ))}
        </nav>
        <div className="account">
          <span>{user.name}</span>
          <button
            onClick={() => {
              localStorage.removeItem("ccc_token");
              setUser(null);
            }}
          >
            Sign out
          </button>
        </div>
      </aside>
      <main className="main">
        <header className="top">
          <span>
            {page === "clipper"
              ? "CLIPPING WORKSPACE"
              : page === "video"
                ? "VIDEO DOWNLOADER"
                : "CHANNEL DOWNLOADER"}
          </span>
          <span className="badge">Personal</span>
        </header>
        {page === "clipper" ? (
          <SmartClipper />
        ) : page === "video" ? (
          <VideoDownloader />
        ) : (
          <ChannelDownloader />
        )}
      </main>
    </div>
  );
}
