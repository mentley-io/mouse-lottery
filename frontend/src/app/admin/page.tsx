"use client";

import { useEffect, useState } from "react";
import { apiFetch } from "../../lib/apiClient";

const WINNERS_PAGE_SIZE = 20;

type WinnerRow = {
  payoutId: string;
  entryId: string;
  userId: string;
  phone: string;
  winningNumber: string;
  winningTime: string | null;
  settledAt: string;
  payoutKES: number;
  jackpotBeforeSplitKES: number;
  winnerCount: number;
  settlementKey: string;
};

export default function AdminPage() {
  const [jackpotIncrementAmount, setJackpotIncrementAmount] = useState("");
  const [youtubeVideoId, setYoutubeVideoId] = useState("");
  const [liveOverlayEnabled, setLiveOverlayEnabled] = useState(false);
  const [announcementEnabled, setAnnouncementEnabled] = useState(false);
  const [announcementContent, setAnnouncementContent] = useState("");
  const [winners, setWinners] = useState<WinnerRow[]>([]);
  const [winnersTotal, setWinnersTotal] = useState(0);
  const [winnersPage, setWinnersPage] = useState(1);
  const [winnersFromInput, setWinnersFromInput] = useState("");
  const [winnersToInput, setWinnersToInput] = useState("");
  const [appliedWinnersFromIso, setAppliedWinnersFromIso] = useState<string | null>(null);
  const [appliedWinnersToIso, setAppliedWinnersToIso] = useState<string | null>(null);
  const [isLoadingWinners, setIsLoadingWinners] = useState(false);
  const [isDownloadingCsv, setIsDownloadingCsv] = useState(false);
  const [isLoading, setIsLoading] = useState(true);
  const [message, setMessage] = useState("");

  const buildWinnersPath = (params: {
    limit: number;
    offset: number;
    fromIso?: string | null;
    toIso?: string | null;
  }) => {
    const search = new URLSearchParams();
    search.set("limit", String(params.limit));
    search.set("offset", String(params.offset));

    if (params.fromIso) {
      search.set("from", params.fromIso);
    }

    if (params.toIso) {
      search.set("to", params.toIso);
    }

    return `/api/admin/winners?${search.toString()}`;
  };

  const toIsoIfValid = (value: string): string | null => {
    if (!value.trim()) {
      return null;
    }

    const parsed = new Date(value);
    if (isNaN(parsed.getTime())) {
      return null;
    }

    return parsed.toISOString();
  };

  const loadWinners = async (params: {
    page: number;
    fromIso?: string | null;
    toIso?: string | null;
  }) => {
    const token = localStorage.getItem("accessToken");
    if (!token) {
      setMessage("Please log in with an admin account.");
      setIsLoading(false);
      return;
    }

    setIsLoadingWinners(true);

    try {
      const safePage = params.page < 1 ? 1 : params.page;
      const offset = (safePage - 1) * WINNERS_PAGE_SIZE;
      const winnersRes = await apiFetch(
        buildWinnersPath({
          limit: WINNERS_PAGE_SIZE,
          offset,
          fromIso: params.fromIso,
          toIso: params.toIso,
        }),
      );

      if (winnersRes.status === 401) {
        setMessage("Session expired. Please log in again.");
        setIsLoadingWinners(false);
        return;
      }

      if (winnersRes.status === 403) {
        setMessage("You do not have admin permission.");
        setIsLoadingWinners(false);
        return;
      }

      if (!winnersRes.ok) {
        setMessage("Failed to load winner list.");
        setIsLoadingWinners(false);
        return;
      }

      const winnersPayload = (await winnersRes.json()) as {
        total: number;
        items: WinnerRow[];
      };

      const total = typeof winnersPayload.total === "number" ? winnersPayload.total : 0;
      const totalPages = Math.max(1, Math.ceil(total / WINNERS_PAGE_SIZE));
      const normalizedPage = safePage > totalPages ? totalPages : safePage;

      setWinnersTotal(total);
      setWinners(Array.isArray(winnersPayload.items) ? winnersPayload.items : []);
      setWinnersPage(normalizedPage);
    } catch {
      setMessage("Failed to load winner list.");
    } finally {
      setIsLoadingWinners(false);
    }
  };

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

        await loadWinners({ page: 1 });
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

  const downloadWinnersCsv = async () => {
    setIsDownloadingCsv(true);
    try {
      const search = new URLSearchParams();
      if (appliedWinnersFromIso) {
        search.set("from", appliedWinnersFromIso);
      }
      if (appliedWinnersToIso) {
        search.set("to", appliedWinnersToIso);
      }

      const path = search.toString().length > 0
        ? `/api/admin/winners/csv?${search.toString()}`
        : "/api/admin/winners/csv";

      const response = await apiFetch(path);
      if (!response.ok) {
        if (response.status === 401) {
          setMessage("Session expired. Please log in again.");
        } else if (response.status === 403) {
          setMessage("You do not have admin permission.");
        } else {
          setMessage("Failed to download winners CSV.");
        }
        setIsDownloadingCsv(false);
        return;
      }

      const blob = await response.blob();
      const disposition = response.headers.get("Content-Disposition") ?? "";
      const matched = disposition.match(/filename=([^;]+)/i);
      const filename = matched?.[1]?.replace(/^"|"$/g, "") || "winner-list.csv";
      const blobUrl = window.URL.createObjectURL(blob);
      const anchor = document.createElement("a");
      anchor.href = blobUrl;
      anchor.download = filename;
      document.body.appendChild(anchor);
      anchor.click();
      anchor.remove();
      window.URL.revokeObjectURL(blobUrl);
      setMessage("Winners CSV downloaded.");
    } catch {
      setMessage("Failed to download winners CSV.");
    } finally {
      setIsDownloadingCsv(false);
    }
  };

  const applyWinnersDateFilter = async () => {
    const fromIso = toIsoIfValid(winnersFromInput);
    const toIso = toIsoIfValid(winnersToInput);

    if (winnersFromInput.trim() && !fromIso) {
      setMessage("Invalid start date format.");
      return;
    }

    if (winnersToInput.trim() && !toIso) {
      setMessage("Invalid end date format.");
      return;
    }

    if (fromIso && toIso && new Date(fromIso).getTime() > new Date(toIso).getTime()) {
      setMessage("Start date must be earlier than end date.");
      return;
    }

    setAppliedWinnersFromIso(fromIso);
    setAppliedWinnersToIso(toIso);
    await loadWinners({ page: 1, fromIso, toIso });
  };

  const resetWinnersDateFilter = async () => {
    setWinnersFromInput("");
    setWinnersToInput("");
    setAppliedWinnersFromIso(null);
    setAppliedWinnersToIso(null);
    await loadWinners({ page: 1 });
  };

  const totalWinnerPages = Math.max(1, Math.ceil(winnersTotal / WINNERS_PAGE_SIZE));
  const canGoPrevPage = winnersPage > 1;
  const canGoNextPage = winnersPage < totalWinnerPages;

  return (
    <main style={{ padding: 24, maxWidth: 760, margin: "0 auto" }}>
      <a href="/" style={{ display: "inline-flex", alignItems: "center", gap: 6, fontSize: 14, textDecoration: "none", opacity: 0.7, marginBottom: 16 }}>
        <svg xmlns="http://www.w3.org/2000/svg" width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><polyline points="15 18 9 12 15 6"/></svg>
        Back
      </a>
      <h1>Admin Console</h1>
      <p>Manage jackpot increment, YouTube live source config, site announcement, and winner records.</p>

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

      <section style={{ marginTop: 28 }}>
        <h2 style={{ marginBottom: 8 }}>Winner List</h2>
        <p style={{ marginTop: 0, opacity: 0.8 }}>
          Page {winnersPage}/{totalWinnerPages}, {WINNERS_PAGE_SIZE} records per page. Current page: {winners.length} records. Total winners: {winnersTotal}.
        </p>

        <div style={{ display: "flex", flexWrap: "wrap", alignItems: "end", gap: 10, marginBottom: 12 }}>
          <label htmlFor="winners-from" style={{ display: "grid", gap: 4 }}>
            <span>Start Time</span>
            <input
              id="winners-from"
              type="datetime-local"
              value={winnersFromInput}
              onChange={(event) => setWinnersFromInput(event.target.value)}
              disabled={isLoading || isLoadingWinners}
            />
          </label>
          <label htmlFor="winners-to" style={{ display: "grid", gap: 4 }}>
            <span>End Time</span>
            <input
              id="winners-to"
              type="datetime-local"
              value={winnersToInput}
              onChange={(event) => setWinnersToInput(event.target.value)}
              disabled={isLoading || isLoadingWinners}
            />
          </label>
          <button type="button" onClick={() => void applyWinnersDateFilter()} disabled={isLoading || isLoadingWinners}>
            Search
          </button>
          <button type="button" onClick={() => void resetWinnersDateFilter()} disabled={isLoading || isLoadingWinners}>
            Reset
          </button>
        </div>

        <button type="button" onClick={downloadWinnersCsv} disabled={isLoading || isDownloadingCsv}>
          {isDownloadingCsv ? "Downloading..." : "Download CSV"}
        </button>
        {isLoadingWinners ? <p style={{ marginTop: 8 }}>Loading winner list...</p> : null}

        <div style={{ overflowX: "auto", marginTop: 12 }}>
          <table style={{ width: "100%", borderCollapse: "collapse", minWidth: 920 }}>
            <thead>
              <tr>
                <th style={{ textAlign: "left", borderBottom: "1px solid #ddd", padding: "8px 6px" }}>Phone</th>
                <th style={{ textAlign: "left", borderBottom: "1px solid #ddd", padding: "8px 6px" }}>Winning Number</th>
                <th style={{ textAlign: "left", borderBottom: "1px solid #ddd", padding: "8px 6px" }}>Winning Time</th>
                <th style={{ textAlign: "right", borderBottom: "1px solid #ddd", padding: "8px 6px" }}>Payout (KES)</th>
                <th style={{ textAlign: "right", borderBottom: "1px solid #ddd", padding: "8px 6px" }}>Jackpot Before Split</th>
                <th style={{ textAlign: "right", borderBottom: "1px solid #ddd", padding: "8px 6px" }}>Winner Count</th>
              </tr>
            </thead>
            <tbody>
              {winners.map((winner) => (
                <tr key={winner.payoutId}>
                  <td style={{ borderBottom: "1px solid #f0f0f0", padding: "8px 6px" }}>{winner.phone || "-"}</td>
                  <td style={{ borderBottom: "1px solid #f0f0f0", padding: "8px 6px" }}>{winner.winningNumber || "-"}</td>
                  <td style={{ borderBottom: "1px solid #f0f0f0", padding: "8px 6px" }}>
                    {winner.winningTime ? new Date(winner.winningTime).toLocaleString() : "-"}
                  </td>
                  <td style={{ borderBottom: "1px solid #f0f0f0", padding: "8px 6px", textAlign: "right" }}>{winner.payoutKES}</td>
                  <td style={{ borderBottom: "1px solid #f0f0f0", padding: "8px 6px", textAlign: "right" }}>{winner.jackpotBeforeSplitKES}</td>
                  <td style={{ borderBottom: "1px solid #f0f0f0", padding: "8px 6px", textAlign: "right" }}>{winner.winnerCount}</td>
                </tr>
              ))}
              {!isLoading && winners.length === 0 ? (
                <tr>
                  <td colSpan={6} style={{ padding: "12px 6px", opacity: 0.8 }}>
                    No winner records found.
                  </td>
                </tr>
              ) : null}
            </tbody>
          </table>
        </div>

        <div style={{ display: "flex", alignItems: "center", gap: 8, marginTop: 12 }}>
          <button
            type="button"
            disabled={isLoadingWinners || !canGoPrevPage}
            onClick={() => void loadWinners({ page: winnersPage - 1, fromIso: appliedWinnersFromIso, toIso: appliedWinnersToIso })}
          >
            Previous
          </button>
          <span>Page {winnersPage} of {totalWinnerPages}</span>
          <button
            type="button"
            disabled={isLoadingWinners || !canGoNextPage}
            onClick={() => void loadWinners({ page: winnersPage + 1, fromIso: appliedWinnersFromIso, toIso: appliedWinnersToIso })}
          >
            Next
          </button>
        </div>
      </section>
    </main>
  );
}
