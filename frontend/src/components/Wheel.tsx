"use client";

import { useEffect, useRef, useState } from "react";

type Props = {
  latestNumber?: number;
  isSpinning: boolean;
};

export function Wheel({ latestNumber, isSpinning }: Props) {
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const animationIdRef = useRef<number>();
  const lastHandledNumberRef = useRef<number | null>(null);
  const resumeAtRef = useRef<number | null>(null);
  const lastFrameTimeRef = useRef<number | null>(null);
  const [currentRotation, setCurrentRotation] = useState(0);
  const [stoppedNumber, setStoppedNumber] = useState<number | null>(null);

  // 當新數字進來時，停止轉盤
  useEffect(() => {
    if (latestNumber === undefined) {
      return;
    }

    // 首次載入時只記錄當前數字，不觸發停盤。
    if (lastHandledNumberRef.current === null) {
      lastHandledNumberRef.current = latestNumber;
      return;
    }

    if (latestNumber !== lastHandledNumberRef.current) {
      lastHandledNumberRef.current = latestNumber;
      setStoppedNumber(latestNumber);
      resumeAtRef.current = performance.now() + 3000;
    }
  }, [latestNumber]);

  // 繪製轉盤
  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;

    const ctx = canvas.getContext("2d");
    if (!ctx) return;

    const width = canvas.width;
    const height = canvas.height;
    const centerX = width / 2;
    const centerY = height / 2;
    const radius = Math.min(width, height) / 2 - 20;

    // 清除畫布
    ctx.clearRect(0, 0, width, height);

    // 保存狀態
    ctx.save();

    // 套用旋轉
    ctx.translate(centerX, centerY);
    ctx.rotate((currentRotation * Math.PI) / 180);
    ctx.translate(-centerX, -centerY);

    // 繪製每個數字區間（紅色和藍色交替）
    for (let i = 0; i < 10; i++) {
      const startAngle = (i * 36 - 90) * (Math.PI / 180);
      const endAngle = ((i + 1) * 36 - 90) * (Math.PI / 180);

      // 交替繪製紅色和藍色分段
      ctx.fillStyle = i % 2 === 0 ? "#d32f2f" : "#1a47a0";
      ctx.beginPath();
      ctx.moveTo(centerX, centerY);
      ctx.arc(centerX, centerY, radius, startAngle, endAngle);
      ctx.lineTo(centerX, centerY);
      ctx.fill();

      // 繪製分段邊框（金色）
      ctx.strokeStyle = "#ffd700";
      ctx.lineWidth = 2;
      ctx.beginPath();
      ctx.moveTo(centerX, centerY);
      ctx.arc(centerX, centerY, radius, startAngle, endAngle);
      ctx.lineTo(centerX, centerY);
      ctx.stroke();

      // 繪製數字
      const angle = (i * 36 + 18 - 90) * (Math.PI / 180);
      const x = centerX + Math.cos(angle) * (radius - 45);
      const y = centerY + Math.sin(angle) * (radius - 45);

      ctx.fillStyle = "#ffd700";
      ctx.font = "bold 32px Arial";
      ctx.textAlign = "center";
      ctx.textBaseline = "middle";
      ctx.fillText(i.toString(), x, y);
    }

    ctx.restore();

    // 繪製指針（在頂部）
    ctx.fillStyle = "#ffd700";
    ctx.beginPath();
    ctx.moveTo(centerX - 18, centerY - radius - 15);
    ctx.lineTo(centerX + 18, centerY - radius - 15);
    ctx.lineTo(centerX, centerY - radius + 15);
    ctx.closePath();
    ctx.fill();

    ctx.strokeStyle = "#d32f2f";
    ctx.lineWidth = 2;
    ctx.stroke();

    // 繪製中心圓（金色）
    ctx.fillStyle = "#ffd700";
    ctx.beginPath();
    ctx.arc(centerX, centerY, 16, 0, Math.PI * 2);
    ctx.fill();

    ctx.strokeStyle = "#d32f2f";
    ctx.lineWidth = 3;
    ctx.stroke();
  }, [currentRotation]);

  // 動畫循環
  useEffect(() => {
    if (!isSpinning) {
      return;
    }

    const speedDegPerSecond = 400;

    const animate = (timestamp: number) => {
      if (lastFrameTimeRef.current === null) {
        lastFrameTimeRef.current = timestamp;
      }

      const deltaSec = Math.min((timestamp - (lastFrameTimeRef.current ?? timestamp)) / 1000, 0.05);
      lastFrameTimeRef.current = timestamp;

      if (stoppedNumber !== null && resumeAtRef.current !== null) {
        if (timestamp >= resumeAtRef.current) {
          setStoppedNumber(null);
          resumeAtRef.current = null;
        }
      }

      if (stoppedNumber === null) {
        setCurrentRotation((prev) => (prev + speedDegPerSecond * deltaSec) % 360);
      }

      animationIdRef.current = requestAnimationFrame(animate);
    };

    animationIdRef.current = requestAnimationFrame(animate);

    return () => {
      if (animationIdRef.current) {
        cancelAnimationFrame(animationIdRef.current);
      }
      lastFrameTimeRef.current = null;
    };
  }, [isSpinning, stoppedNumber]);

  // 計算停止位置
  useEffect(() => {
    if (stoppedNumber !== undefined && stoppedNumber !== null) {
      // 數字i在 (i * 36 + 18 - 90) 度的位置
      // 指針在270度（頂部）
      // 要讓數字i到達指針位置，需要旋轉 (342 - i * 36) 度
      const targetRotation = (342 - stoppedNumber * 36) % 360;
      setCurrentRotation(targetRotation);
    }
  }, [stoppedNumber]);

  return (
    <div style={{ display: "flex", flexDirection: "column", alignItems: "center", justifyContent: "center", gap: 20 }}>
      <canvas
        ref={canvasRef}
        width={420}
        height={420}
        style={{
          display: "block",
          borderRadius: "50%",
          background: "linear-gradient(135deg, #0f2438 0%, #1a3a52 100%)",
          boxShadow: "0 8px 32px rgba(0, 0, 0, 0.5)",
        }}
      />
      {stoppedNumber !== null && (
        <div style={{ fontSize: 28, fontWeight: "bold", color: "#ffd700", textShadow: "0 2px 8px rgba(0, 0, 0, 0.5)" }}>
          🎯 {stoppedNumber}
        </div>
      )}
    </div>
  );
}
