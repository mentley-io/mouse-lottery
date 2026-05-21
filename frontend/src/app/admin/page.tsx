"use client";

import { useEffect, useState } from "react";
import { apiFetch } from "../../lib/apiClient";

export default function AdminPage() {
  const [jackpotIncrementAmount, setJackpotIncrementAmount] = useState("");
  const [youtubeVideoId, setYoutubeVideoId] = useState("");
  const [liveOverlayEnabled, setLiveOverlayEnabled] = useState(false);
  const [announcementEnabled, setAnnouncementEnabled] = useState(false);
  const [announcementContent, setAnnouncementContent] = useState("");
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
        const [jackpotRes, liveRes, announcementRes] = await Promise.all([
          apiFetch("/api/admin/jackpot-increment"),
          apiFetch("/api/admin/live-config"),
          apiFetch("/api/announcement"),
        ]);

        if (jackpotRes.status === 401 || liveRes.status === 401 || announcementRes.status === 401) {
          setMessage("Session expired. Please log in again.");
          setIsLoading(false);
          return;
        }

        if (jackpotRes.status === 403 || liveRes.status === 403 || announcementRes.status === 403) {
          setMessage("You do not have admin permission.");
          setIsLoading(false);
          return;
        }

        if (jackpotRes.ok) {
          const jackpot = (await jackpotRes.json()) as { jackpotIncrementAmount: number };
          setJackpotIncrementAmount(String(jackpot.jackpotIncrementAmount));
        }

        if (liveRes.ok) {
          const live = (await liveRes.json()) as {
            youtubeVideoId: string;
            liveOverlayEnabled?: boolean;
          };
          setYoutubeVideoId(live.youtubeVideoId);
          setLiveOverlayEnabled(live.liveOverlayEnabled ?? true);
        }

        if (announcementRes.ok) {
          const announcement = (await announcementRes.json()) as {
            enabled: boolean;
            content: string;
          };
          setAnnouncementEnabled(Boolean(announcement.enabled));
          setAnnouncementContent(typeof announcement.content === "string" ? announcement.content : "");
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
      const [jackpotRes, liveRes] = await Promise.all([
        apiFetch("/api/admin/jackpot-increment", {
          method: "PATCH",
          headers: {
            "Content-Type": "application/json",
          },
          body: JSON.stringify({ amount: Number(jackpotIncrementAmount) }),
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

      const announcementRes = await apiFetch("/api/announcement", {
        method: "PATCH",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          enabled: announcementEnabled,
          content: announcementContent,
        }),
      });

      if (jackpotRes.ok && liveRes.ok && announcementRes.ok) {
        setMessage("Admin configuration updated.");
        return;
      }

      if (jackpotRes.status === 401 || liveRes.status === 401 || announcementRes.status === 401) {
        setMessage("Session expired. Please log in again.");
        return;
      }

      if (jackpotRes.status === 403 || liveRes.status === 403 || announcementRes.status === 403) {
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
      <p>Manage jackpot increment, YouTube live source config, and site announcement.</p>

      <section style={{ display: "grid", gap: 10, marginTop: 14 }}>
        <label htmlFor="jackpot-increment">Jackpot Increment (KES/second)</label>
        <input
          id="jackpot-increment"
          type="number"
          min={1}
          value={jackpotIncrementAmount}
          onChange={(event) => setJackpotIncrementAmount(event.target.value)}
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

        <label htmlFor="announcement-enabled">Announcement Enabled</label>
        <input
          id="announcement-enabled"
          type="checkbox"
          checked={announcementEnabled}
          onChange={(event) => setAnnouncementEnabled(event.target.checked)}
          disabled={isLoading}
          style={{ width: 20, height: 20 }}
        />

        <label htmlFor="announcement-content">Announcement Content</label>
        <textarea
          id="announcement-content"
          value={announcementContent}
          onChange={(event) => setAnnouncementContent(event.target.value)}
          disabled={isLoading}
          rows={6}
          style={{ resize: "vertical", fontFamily: "inherit", padding: 10 }}
          placeholder="Enter announcement details shown on the homepage popup"
        />

        <button type="button" onClick={save} style={{ width: "fit-content" }} disabled={isLoading || !jackpotIncrementAmount.trim() || !youtubeVideoId.trim()}>
          Save
        </button>
        {isLoading ? <p>Loading admin config...</p> : null}
        {message ? <p>{message}</p> : null}
      </section>
    </main>
  );
}
