"use client";

import { useEffect, useMemo, useState } from "react";
import { LiveYoutube } from "../components/LiveYoutube";
import { apiFetch, clearTokens, setTokens } from "../lib/apiClient";

type GameState = {
  youtubeVideoId: string;
  jackpot: { amount: number; currency: string };
  draw: {
    stream: { number: number; receivedAt: string }[];
    totalToday: number;
    dayKey: string;
    history: {
      dayKey: string;
      numbers: number[];
      total: number;
      lastReceivedAt: string;
    }[];
  };
  resultPolicy: {
    nonWinningTerminalStatus: string;
    payoutRemainderPolicy: string;
    realtimeMode: string;
    pollingIntervalSeconds: number;
    liveOverlayEnabled: boolean;
    otpEnabled: boolean;
  };
  updatedAt: string;
};

type AuthPayload = {
  user: {
    id: string;
    phone: string;
    role: string;
    permissions: string[];
  };
  accessToken: string;
  refreshToken: string;
};

type MeResponse = {
  id: string;
  phone: string;
  role: string;
  permissions: string[];
  canAccessAdmin: boolean;
};

type TicketEntry = {
  id: string;
  numbers: number[];
  status: "Pending" | "Won" | "Expired" | "Voided";
  placedAt: string;
  validFrom: string;
  expiresAt: string;
  settledAt: string | null;
  winningSequenceEndedAt: string | null;
  createdAt: string | null;
};

type HowToRule = {
  id: number;
  icon: string;
  title: string;
  body?: string;
  isComplex?: boolean;
};

const FIXED_POLLING_INTERVAL_MS = 5000;
const AUTH_EXPIRED_FLAG = "authExpired";
const LAST_LOGIN_PHONE_KEY = "lastLoginPhone";
const REMEMBER_LOGIN_PHONE_KEY = "rememberLoginPhone";

function normalizeKenyanPhone(phone: string): string {
  const value = phone.trim();
  if (/^\+254[71]\d{8}$/.test(value)) {
    return value;
  }
  if (/^0[71]\d{8}$/.test(value)) {
    return `+254${value.slice(1)}`;
  }
  return value;
}

export default function HomePage() {
  const JACKPOT_MIN = 12345678;
  const JACKPOT_MAX = 22345678;
  const JACKPOT_STEP = 123;

  const [state, setState] = useState<GameState | null>(null);
  const [me, setMe] = useState<MeResponse | null>(null);
  const [canAccessAdmin, setCanAccessAdmin] = useState(false);
  const [phone, setPhone] = useState("");
  const [password, setPassword] = useState("");
  const [authMode, setAuthMode] = useState<"login" | "register">("login");
  const [authMessage, setAuthMessage] = useState("");
  const [authOpen, setAuthOpen] = useState(false);
  const [rememberLoginPhone, setRememberLoginPhone] = useState(true);
  const [selectedNumbers, setSelectedNumbers] = useState<number[]>([]);
  const [entries, setEntries] = useState<TicketEntry[]>([]);
  const [playMessage, setPlayMessage] = useState("");
  const [submittingEntry, setSubmittingEntry] = useState(false);
  const [jackpotDisplay, setJackpotDisplay] = useState(JACKPOT_MIN);
  const [historyOpen, setHistoryOpen] = useState(false);
  const [ticketHistoryOpen, setTicketHistoryOpen] = useState(false);
  const [howToOpen, setHowToOpen] = useState<number>(6);

  useEffect(() => {
    const rememberPhone = localStorage.getItem(REMEMBER_LOGIN_PHONE_KEY);
    setRememberLoginPhone(rememberPhone !== "0");

    const params = new URLSearchParams(window.location.search);
    const hasExpiredQuery = params.get("auth") === "expired";
    const hasExpiredFlag = localStorage.getItem(AUTH_EXPIRED_FLAG) === "1";

    if (hasExpiredQuery || hasExpiredFlag) {
      setAuthMessage("Session expired. Please log in again.");
      localStorage.removeItem(AUTH_EXPIRED_FLAG);
    }

    if (hasExpiredQuery) {
      params.delete("auth");
      const next = params.toString();
      const url = next ? `/?${next}` : "/";
      window.history.replaceState({}, "", url);
    }
  }, []);

  useEffect(() => {
    const onForbidden = () => {
      setAuthMessage("You do not have permission to perform this action.");
    };

    window.addEventListener("api-forbidden", onForbidden);
    return () => window.removeEventListener("api-forbidden", onForbidden);
  }, []);

  useEffect(() => {
    const id = setInterval(() => {
      setJackpotDisplay((current) => {
        const next = current + JACKPOT_STEP;
        return next > JACKPOT_MAX ? JACKPOT_MIN : next;
      });
    }, 120);

    return () => clearInterval(id);
  }, []);

  useEffect(() => {
    let mounted = true;

    const fetchState = async () => {
      const res = await apiFetch("/api/game/state", { cache: "no-store" });
      if (!res.ok) {
        return;
      }
      const data = (await res.json()) as GameState;
      if (mounted) {
        setState(data);
      }
    };

    fetchState();
    const id = setInterval(fetchState, FIXED_POLLING_INTERVAL_MS);
    return () => {
      mounted = false;
      clearInterval(id);
    };
  }, []);

  useEffect(() => {
    const loadMe = async () => {
      const token = localStorage.getItem("accessToken");
      if (!token) {
        setCanAccessAdmin(false);
        setMe(null);
        return;
      }

      try {
        const response = await apiFetch("/api/auth/me");

        if (!response.ok) {
          setCanAccessAdmin(false);
          setMe(null);
          return;
        }

        const payload = (await response.json()) as MeResponse;
        setMe(payload);
        setCanAccessAdmin(payload.canAccessAdmin);
      } catch {
        setCanAccessAdmin(false);
        setMe(null);
      }
    };

    void loadMe();
  }, []);

  useEffect(() => {
    let mounted = true;

    const loadEntries = async () => {
      const token = localStorage.getItem("accessToken");
      if (!token) {
        if (mounted) {
          setEntries([]);
        }
        return;
      }

      const response = await apiFetch("/api/game/my-entries", { cache: "no-store" });
      if (!response.ok) {
        return;
      }

      const payload = (await response.json()) as TicketEntry[];
      if (mounted) {
        setEntries(payload);
      }
    };

    void loadEntries();
    const id = setInterval(() => {
      void loadEntries();
    }, FIXED_POLLING_INTERVAL_MS);

    return () => {
      mounted = false;
      clearInterval(id);
    };
  }, [me?.id]);

  const onSubmitAuth = async () => {
    setAuthMessage("");
    try {
      const normalizedPhone = normalizeKenyanPhone(phone);
      const endpoint = authMode === "login" ? "login" : "register";
      const response = await apiFetch(`/api/auth/${endpoint}`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ phone: normalizedPhone, password }),
      });

      const payload = (await response.json()) as AuthPayload | { message?: string };
      if (!response.ok || !("accessToken" in payload)) {
        const maybeError = payload as { message?: string };
        setAuthMessage(maybeError.message ?? "Authentication failed");
        return;
      }

      setTokens({
        accessToken: payload.accessToken,
        refreshToken: payload.refreshToken,
      });

      const meResponse = await apiFetch("/api/auth/me");

      if (!meResponse.ok) {
        setAuthMessage("Signed in, but failed to load profile");
        return;
      }

      const mePayload = (await meResponse.json()) as MeResponse;
      setMe(mePayload);
      setCanAccessAdmin(mePayload.canAccessAdmin);
      if (authMode === "login") {
        if (rememberLoginPhone) {
          localStorage.setItem(LAST_LOGIN_PHONE_KEY, mePayload.phone);
        } else {
          localStorage.removeItem(LAST_LOGIN_PHONE_KEY);
        }
      }
      setAuthMessage(`${authMode === "login" ? "Logged in" : "Registered"} as ${mePayload.phone}`);
      setAuthOpen(false);
    } catch {
      setAuthMessage("Unable to reach auth service");
    }
  };

  const logout = () => {
    clearTokens();
    setCanAccessAdmin(false);
    setMe(null);
    setAuthMessage("Logged out");
  };

  const openAuthModal = (mode: "login" | "register") => {
    const rememberPhone = localStorage.getItem(REMEMBER_LOGIN_PHONE_KEY) !== "0";
    const lastLoginPhone = localStorage.getItem(LAST_LOGIN_PHONE_KEY) ?? "";
    setRememberLoginPhone(rememberPhone);
    setAuthMode(mode);
    setPhone(mode === "login" && rememberPhone ? lastLoginPhone : "");
    setPassword("");
    setAuthMessage("");
    setAuthOpen(true);
  };

  const onToggleRememberLoginPhone = (checked: boolean) => {
    setRememberLoginPhone(checked);
    localStorage.setItem(REMEMBER_LOGIN_PHONE_KEY, checked ? "1" : "0");
    if (!checked) {
      localStorage.removeItem(LAST_LOGIN_PHONE_KEY);
    }
  };

  const formattedJackpot = useMemo(() => {
    const currency = state?.jackpot.currency ?? "KES";
    return `${currency} ${new Intl.NumberFormat("en-US").format(jackpotDisplay)}`;
  }, [jackpotDisplay, state?.jackpot.currency]);

  const toggleNumber = (value: number) => {
    setSelectedNumbers((current) => {
      if (current.length >= 4) {
        return current;
      }
      return [...current, value];
    });
  };

  const clearNumbers = () => {
    setSelectedNumbers([]);
  };

  const confirmNumbers = async () => {
    if (!me) {
      setPlayMessage("Please log in to submit your numbers.");
      openAuthModal("login");
      return;
    }

    if (selectedNumbers.length !== 4) {
      setPlayMessage("Select exactly 4 numbers before confirming.");
      return;
    }

    setSubmittingEntry(true);
    setPlayMessage("");

    const response = await apiFetch("/api/game/entries", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ numbers: selectedNumbers }),
    });

    const payload = (await response.json()) as
      | {
          id: string;
          numbers: number[];
          status: string;
          placedAt: string;
          validFrom: string;
          expiresAt: string;
        }
      | { message?: string };

    if (!response.ok || !("id" in payload)) {
      const maybeError = payload as { message?: string };
      setPlayMessage(maybeError.message ?? "Failed to submit numbers.");
      setSubmittingEntry(false);
      return;
    }

    setPlayMessage(
      `Ticket submitted: ${payload.numbers.join("-")}. Valid from ${new Date(payload.validFrom).toLocaleTimeString()} until 23:59.`,
    );
    setSelectedNumbers([]);
    setSubmittingEntry(false);

    const refreshResponse = await apiFetch("/api/game/my-entries", { cache: "no-store" });
    if (refreshResponse.ok) {
      const refreshed = (await refreshResponse.json()) as TicketEntry[];
      setEntries(refreshed);
    }
  };

  const streamNumbers = state?.draw.stream ?? [];
  const todayTotal = state?.draw.totalToday ?? 0;
  const dayKey = state?.draw.dayKey ?? "";
  const drawHistory = state?.draw.history ?? [];
  const latestFourNumbers = streamNumbers.slice(-4).map((item) => item.number);
  const previewEntries = entries.slice(0, 5);

  const howToPlay: HowToRule[] = [
    {
      id: 1,
      icon: "🎯",
      title: "Eligibility",
      body: "Players who wager at least 500 KES in cash on Wezabet within the same day gain eligibility for the next day's draw.",
    },
    {
      id: 2,
      icon: "🔢",
      title: "Number Selection",
      body: "Choose 4 digits from 0–9. Once confirmed, your selection is locked until the next valid cycle.",
    },
    {
      id: 3,
      icon: "🏆",
      title: "Winning Criteria",
      body: "If the Mouse Lottery Machine reveals your selected four digits in the next valid draw, you win the Jackpot prize.",
    },
    {
      id: 4,
      icon: "💰",
      title: "Jackpot Calculation",
      body: "The Jackpot is shared among all winners (e.g., 10,000 KES / 2 winners = 5,000 KES each).",
    },
    {
      id: 5,
      icon: "🔄",
      title: "Re-selection Rule",
      body: "You may reselect your numbers every 30 minutes, after which your previous selection becomes void.",
    },
    {
      id: 6,
      icon: "🎯",
      title: "Prize Validation Rule",
      isComplex: true,
    },
  ];

  return (
    <main className="page page-dark">
      <header className="topbar">
        <img src="/logo.png" alt="Hamster Spin" className="topbar-logo" />
        <span className="topbar-title">Mouse Lottery</span>
        <div className="actions">
          {!me ? (
            <>
              <button
                type="button"
                className="btn btn-outline"
                onClick={() => {
                  openAuthModal("login");
                }}
              >
                Log In
              </button>
              <button
                type="button"
                className="btn btn-primary"
                onClick={() => {
                  openAuthModal("register");
                }}
              >
                Sign Up
              </button>
            </>
          ) : null}
          {me ? (
            <div className="user-session">
              <span className="user-phone">
                <svg xmlns="http://www.w3.org/2000/svg" width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><circle cx="12" cy="8" r="4"/><path d="M4 20c0-4 3.6-7 8-7s8 3 8 7"/></svg>
                {me.phone}
              </span>
              <button type="button" className="btn btn-outline" onClick={logout}>Log Out</button>
            </div>
          ) : null}
          {canAccessAdmin ? <a className="btn btn-outline" href="/admin">Admin</a> : null}
        </div>
      </header>

      {authOpen ? (
        <div className="auth-modal-backdrop" onClick={() => setAuthOpen(false)}>
          <section className="auth-modal" onClick={(event) => event.stopPropagation()}>
            <h2>{authMode === "login" ? "Log In" : "Sign Up"}</h2>
            <div className="auth-form">
              <input
                placeholder="+2547XXXXXXXX or 07XXXXXXXX"
                value={phone}
                onChange={(event) => setPhone(event.target.value)}
                onBlur={() => setPhone(normalizeKenyanPhone(phone))}
              />
              <input
                type="password"
                placeholder="Password"
                value={password}
                onChange={(event) => setPassword(event.target.value)}
              />
              {authMode === "login" ? (
                <label style={{ display: "flex", alignItems: "center", gap: 8, fontSize: 14 }}>
                  <input
                    type="checkbox"
                    checked={rememberLoginPhone}
                    onChange={(event) => onToggleRememberLoginPhone(event.target.checked)}
                  />
                  Remember my phone
                </label>
              ) : null}
              <button type="button" className="btn btn-primary" onClick={onSubmitAuth}>
                {authMode === "login" ? "Log In" : "Sign Up"}
              </button>
            </div>
            {authMessage ? <p className="auth-message">{authMessage}</p> : null}
          </section>
        </div>
      ) : null}

      <LiveYoutube
        videoId={state?.youtubeVideoId}
        overlayEnabled={state?.resultPolicy.liveOverlayEnabled ?? false}
        latestNumber={streamNumbers.length > 0 ? streamNumbers[streamNumbers.length - 1].number : undefined}
      />

      <section className="jackpot-band">
        <div>
          <p className="band-caption">CURRENT JACKPOT</p>
          <p className="band-amount">{formattedJackpot}</p>
          <p className="band-note">Growing with every bet placed on Wezabet</p>
        </div>
      </section>

      <section className="panel drawn-panel">
        <div className="drawn-header">
          <h2>Today&apos;s Draw Stream {dayKey ? `(${dayKey})` : ""}</h2>
          <div style={{ display: "flex", alignItems: "center", gap: 12 }}>
            <span style={{ fontSize: 14, opacity: 0.7 }}>{todayTotal} numbers today</span>
            <button type="button" className="btn btn-outline" onClick={() => setHistoryOpen(true)}>
              History
            </button>
          </div>
        </div>
        <div className="drawn-track">
          <div className="history-strip">
            {streamNumbers.map((item, index) => (
              <span key={`${item.number}-${index}`} className="history-pill">{item.number}</span>
            ))}
            {streamNumbers.length === 0 ? <span style={{ opacity: 0.5, fontSize: 14 }}>No numbers received yet today.</span> : null}
          </div>
          <div className="current-draw">
            {latestFourNumbers.map((item, index) => (
              <span key={`${item}-${index}`} className="draw-pill">{item}</span>
            ))}
            {latestFourNumbers.length === 0 ? (
              <span style={{ opacity: 0.5, fontSize: 14 }}>Latest 4 numbers will appear here.</span>
            ) : null}
          </div>
        </div>
      </section>

      {historyOpen ? (
        <div className="history-modal-backdrop" onClick={() => setHistoryOpen(false)}>
          <section className="history-modal" onClick={(event) => event.stopPropagation()}>
            <div className="history-modal-header">
              <h3>Draw History</h3>
              <button type="button" className="btn btn-outline" onClick={() => setHistoryOpen(false)}>Close</button>
            </div>
            <div className="history-table">
              {drawHistory.map((item) => (
                <div key={item.dayKey} className="history-row">
                  <span>{item.dayKey}</span>
                  <strong>{item.numbers.join("-")}</strong>
                  <span>{item.total} numbers · last at {new Date(item.lastReceivedAt).toLocaleString()}</span>
                </div>
              ))}
              {drawHistory.length === 0 ? <p>No draw history yet.</p> : null}
            </div>
          </section>
        </div>
      ) : null}

      <section className="betting-grid">
        <article className="panel betting-card">
          <h2>Select Your Numbers</h2>
          <p>Choose 4 numbers from 0-9. Match all 4 to win the jackpot.</p>
          <div className="number-grid">
            {Array.from({ length: 10 }, (_, i) => i).map((item) => (
              <button
                key={item}
                type="button"
                className={`num-btn ${selectedNumbers.includes(item) ? "num-selected" : ""}`}
                onClick={() => toggleNumber(item)}
              >
                {item}
              </button>
            ))}
          </div>

          <h3>Your Numbers</h3>
          <div className="selected-slots">
            {Array.from({ length: 4 }, (_, i) => (
              <div key={i} className={`slot-box ${selectedNumbers[i] !== undefined ? "slot-filled" : ""}`}>
                {selectedNumbers[i] ?? "?"}
              </div>
            ))}
          </div>

          <div className="betting-actions">
            <button type="button" className="btn btn-outline" onClick={clearNumbers}>Clear</button>
            <button type="button" className="btn btn-primary" onClick={() => void confirmNumbers()} disabled={submittingEntry}>
              {submittingEntry ? "Submitting..." : "Confirm Numbers"}
            </button>
          </div>

          <p className="subtle-text">You can change your numbers every 30 minutes. Previous selections will be voided.</p>
          {playMessage ? <p className="subtle-text">{playMessage}</p> : null}
        </article>

        <aside className="panel status-card">
          <div className="status-icon">🕒</div>
          <h3>Select Your Numbers</h3>
          <p>Choose 4 numbers above to participate in the upcoming draws</p>
          {me ? <small>Signed in as {me.phone} ({me.role})</small> : null}
          <small>Realtime mode: {state?.resultPolicy.realtimeMode ?? "polling"}, Polling: {FIXED_POLLING_INTERVAL_MS / 1000}s</small>
          <div className="entry-status-list">
            {previewEntries.map((entry) => (
              <div key={entry.id} className={`entry-status entry-${entry.status.toLowerCase()}`}>
                <strong>{entry.numbers.join("-")}</strong> · {entry.status}
                {entry.status === "Pending" ? (
                  <small>Valid from {new Date(entry.validFrom).toLocaleTimeString()} · expires 23:59</small>
                ) : entry.status === "Won" ? (
                  <small>Won! 🎉 {entry.winningSequenceEndedAt ? new Date(entry.winningSequenceEndedAt).toLocaleTimeString() : ""}</small>
                ) : (
                  <small>{entry.settledAt ? new Date(entry.settledAt).toLocaleString() : ""}</small>
                )}
              </div>
            ))}
            {me ? (
              <button type="button" className="entry-more-btn" onClick={() => setTicketHistoryOpen(true)}>
                ...
              </button>
            ) : null}
            {me && entries.length === 0 ? <small>No tickets yet.</small> : null}
          </div>
        </aside>
      </section>

      {ticketHistoryOpen ? (
        <div className="history-modal-backdrop" onClick={() => setTicketHistoryOpen(false)}>
          <section className="history-modal" onClick={(event) => event.stopPropagation()}>
            <div className="history-modal-header">
              <h3>My Ticket History</h3>
              <button type="button" className="btn btn-outline" onClick={() => setTicketHistoryOpen(false)}>Close</button>
            </div>
            <div className="history-table">
              {entries.map((entry) => (
                <div key={entry.id} className="history-row">
                  <span>{entry.numbers.join("-")} · {entry.status}</span>
                  <strong>{entry.status === "Pending"
                    ? `Valid from ${new Date(entry.validFrom).toLocaleTimeString()}`
                    : entry.status === "Won"
                    ? `Won 🎉`
                    : entry.status}</strong>
                  <span>
                    {entry.settledAt
                      ? new Date(entry.settledAt).toLocaleString()
                      : `Expires 23:59`}
                  </span>
                </div>
              ))}
              {entries.length === 0 ? <p>No ticket history yet.</p> : null}
            </div>
          </section>
        </div>
      ) : null}

      <section className="panel howto-panel">
        <h2>How to Play Mouse Lottery</h2>
        <div className="howto-list">
          {howToPlay.map((rule) => (
            <article key={rule.id} className="howto-item">
              <button
                type="button"
                className="howto-title"
                onClick={() => setHowToOpen((current) => (current === rule.id ? 0 : rule.id))}
              >
                <span>{rule.icon} {rule.id}. {rule.title}</span>
                <span>{howToOpen === rule.id ? "⌃" : "⌄"}</span>
              </button>
              {howToOpen === rule.id ? (
                rule.isComplex ? (
                  <div className="howto-complex">
                    <p>
                      Your selected numbers become eligible starting from the next complete draw after the current one, and remain valid for the following four draw results. This means your selection will not be compared against the current draw or any overlapping sequential combinations that include it.
                    </p>
                    <p className="howto-example-title"><strong>Example:</strong></p>
                    <p>
                      If the current draw result is <span className="gold-text">1–2–3–4</span> and the next draw result is <span className="gold-text">5–6–7–8</span>, your entry becomes valid starting from <span className="gold-text">5–6–7–8</span>, which is the next complete draw after the current one.
                    </p>
                    <p>
                      Combinations such as <span className="gold-text">1–2–3–4</span>, <span className="gold-text">2–3–4–5</span>, <span className="gold-text">3–4–5–6</span>, and <span className="gold-text">4–5–6–7</span> are considered invalid sequences and do not qualify for prizes.
                    </p>
                    <p>
                      Only when <span className="gold-text">5–6–7–8</span> or any future complete draw combinations match your selected four digits will it be recognized as a winning result.
                    </p>
                    <p className="howto-note">
                      <em>In other words, your ticket's eligibility window begins after the current draw's full result, and any overlapping or extended sequences that bridge from the current draw are not counted as valid wins.</em>
                    </p>
                  </div>
                ) : (
                  <p>
                    {rule.id === 1 ? (
                      <>
                        Players who wager at least <span className="gold-text">500 KES</span> in cash on Wezabet within the same day gain eligibility for the next day's draw.
                      </>
                    ) : null}
                    {rule.id === 4 ? (
                      <>
                        The Jackpot is shared among all winners (e.g., <span className="gold-text">10,000 KES</span> / 2 winners = <span className="gold-text">5,000 KES</span> each).
                      </>
                    ) : null}
                    {rule.id !== 1 && rule.id !== 4 ? rule.body : null}
                  </p>
                )
              ) : null}
            </article>
          ))}
        </div>
      </section>

      <footer className="site-footer">
        <p>© 2025 Mouse Lottery. Powered by Wezabet.</p>
        <p>Play responsibly. Must be 18+ to participate.</p>
      </footer>
    </main>
  );
}
