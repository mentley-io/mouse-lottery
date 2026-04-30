"use client";

import { useMemo, useState } from "react";
import { Wheel } from "./Wheel";

type Props = {
  videoId?: string;
  overlayEnabled: boolean;
  latestNumber?: number;
};

export function LiveYoutube({ videoId, overlayEnabled, latestNumber }: Props) {
  const [wheelMode, setWheelMode] = useState(false);

  const src = useMemo(() => {
    if (!videoId) {
      return null;
    }
    const id = encodeURIComponent(videoId);
    return `https://www.youtube.com/embed/${id}?enablejsapi=1&autoplay=0&mute=1`;
  }, [videoId]);

  return (
    <>
      {/* 视频/转盘区块 */}
      <section className="live-stage">
        <div className="video-wrap">
          {wheelMode ? (
            <div style={{ display: "flex", justifyContent: "center", alignItems: "center", minHeight: 550, background: "linear-gradient(135deg, #0f2438 0%, #1a3a52 100%)", borderRadius: 14, padding: "24px 16px" }}>
              <Wheel latestNumber={latestNumber} isSpinning={true} />
            </div>
          ) : (
            <>
              {src ? (
                <iframe
                  title="Mouse Lotto Live"
                  src={src}
                  allow="accelerometer; autoplay; clipboard-write; encrypted-media; gyroscope; picture-in-picture; web-share"
                  allowFullScreen
                />
              ) : (
                <div className="video-skeleton" aria-live="polite" aria-label="Loading live video">
                  <div className="video-skeleton-top" />
                  <div className="video-skeleton-center" />
                  <div className="video-skeleton-bottom" />
                </div>
              )}
              {overlayEnabled ? (
                <div className="stage-overlay">
                  <p className="live-tag">(◉) LIVE</p>
                  <p className="stage-mouse">🐭</p>
                  <h2>Mouse Lottery Draw Stream</h2>
                  <p>Watch the live draw in real-time</p>
                </div>
              ) : null}
            </>
          )}
        </div>
      </section>

      {/* 控制按钮区块 */}
      <section className="live-controls">
        <button
          type="button"
          className={`btn ${wheelMode ? "btn-primary" : "btn-outline"}`}
          onClick={() => setWheelMode(true)}
        >
          🎡 Wheel Mode
        </button>
        <button
          type="button"
          className={`btn ${!wheelMode ? "btn-primary" : "btn-outline"}`}
          onClick={() => setWheelMode(false)}
        >
          📺 Watch Video
        </button>
      </section>
    </>
  );
}
