"use client";

import { useEffect, useState } from "react";
import { apiFetch } from "../../lib/apiClient";

export default function AdminPage() {
  const [drawInterval, setDrawInterval] = useState("");
  const [youtubeVideoId, setYoutubeVideoId] = useState("");
  const [liveOverlayEnabled, setLiveOverlayEnabled] = useState(false);
  const [isLoading, setIsLoading] = useState(true);
  const [message, setMessage] = useState("");

  useEffect(() => {
    const token = localStorage.getItem("accessToken");
    if (!token) {
      setMessage("Please log in with an admin account.");
      setIsLoading(false);
      return;
    }

    const load = async () => {
      try {
        const [drawRes, liveRes] = await Promise.all([
          apiFetch("/api/admin/draw-interval"),
          apiFetch("/api/admin/live-config"),
        ]);

        if (drawRes.status === 401 || liveRes.status === 401) {
          setMessage("Session expired. Please log in again.");
          setIsLoading(false);
          return;
        }

        if (drawRes.status === 403 || liveRes.status === 403) {
          setMessage("You do not have admin permission.");
          setIsLoading(false);
          return;
        }

        if (drawRes.ok) {
          const draw = (await drawRes.json()) as { seconds: number };
          setDrawInterval(String(draw.seconds));
        }

        if (liveRes.ok) {
          const live = (await liveRes.json()) as {
            youtubeVideoId: string;
            liveOverlayEnabled?: boolean;
          };
          setYoutubeVideoId(live.youtubeVideoId);
          setLiveOverlayEnabled(live.liveOverlayEnabled ?? true);
        }
        setIsLoading(false);
      } catch {
        setMessage("Failed to load admin config. Backend service may be unavailable.");
        setIsLoading(false);
      }
    };

    void load();
  }, []);

  const save = async () => {
    const token = localStorage.getItem("accessToken");
    if (!token) {
      setMessage("Please log in with an admin account.");
      return;
    }

    try {
      const [drawRes, liveRes] = await Promise.all([
        apiFetch("/api/admin/draw-interval", {
          method: "PATCH",
          headers: {
            "Content-Type": "application/json",
          },
          body: JSON.stringify({ seconds: Number(drawInterval) }),
        }),
        apiFetch("/api/admin/live-config", {
          method: "PATCH",
          headers: {
            "Content-Type": "application/json",
          },
          body: JSON.stringify({
            youtubeVideoId,
            liveOverlayEnabled,
          }),
        }),
      ]);

      if (drawRes.ok && liveRes.ok) {
        setMessage("Admin configuration updated.");
        return;
      }

      if (drawRes.status === 401 || liveRes.status === 401) {
        setMessage("Session expired. Please log in again.");
        return;
      }

      if (drawRes.status === 403 || liveRes.status === 403) {
        setMessage("You do not have admin permission.");
        return;
      }

      setMessage("Failed to update one or more settings.");
    } catch {
      setMessage("Failed to save. Backend service may be unavailable.");
    }
  };

  return (
    <main style={{ padding: 24, maxWidth: 760, margin: "0 auto" }}>
      <a href="/" style={{ display: "inline-flex", alignItems: "center", gap: 6, fontSize: 14, textDecoration: "none", opacity: 0.7, marginBottom: 16 }}>
        <svg xmlns="http://www.w3.org/2000/svg" width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><polyline points="15 18 9 12 15 6"/></svg>
        Back
      </a>
      <h1>Admin Console</h1>
      <p>Manage draw interval and YouTube live source.</p>

      <section style={{ display: "grid", gap: 10, marginTop: 14 }}>
        <label htmlFor="draw-interval">Draw Interval (seconds)</label>
        <input
          id="draw-interval"
          type="number"
          min={10}
          value={drawInterval}
          onChange={(event) => setDrawInterval(event.target.value)}
          disabled={isLoading}
        />

        <label htmlFor="youtube-video-id">YouTube Video ID</label>
        <input
          id="youtube-video-id"
          value={youtubeVideoId}
          onChange={(event) => setYoutubeVideoId(event.target.value)}
          disabled={isLoading}
        />

        <label htmlFor="live-overlay-enabled">Live Overlay Enabled</label>
        <input
          id="live-overlay-enabled"
          type="checkbox"
          checked={liveOverlayEnabled}
          onChange={(event) => setLiveOverlayEnabled(event.target.checked)}
          disabled={isLoading}
          style={{ width: 20, height: 20 }}
        />

        <button type="button" onClick={save} style={{ width: "fit-content" }} disabled={isLoading || !drawInterval.trim() || !youtubeVideoId.trim()}>
          Save
        </button>
        {isLoading ? <p>Loading admin config...</p> : null}
        {message ? <p>{message}</p> : null}
      </section>
    </main>
  );
}
