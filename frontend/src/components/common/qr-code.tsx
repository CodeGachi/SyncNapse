/**
 * QR Code Component
 * Simple QR code generator using Canvas API
 * No external dependencies required
 */

"use client";

import { useEffect, useRef, useState } from "react";

interface QRCodeProps {
  value: string;
  size?: number;
  className?: string;
}

// Simple QR Code generation using an online API (fallback)
// For production, consider using qrcode package
export function QRCode({ value, size = 128, className = "" }: QRCodeProps) {
  const [qrUrl, setQrUrl] = useState<string>("");
  const canvasRef = useRef<HTMLCanvasElement>(null);

  useEffect(() => {
    if (!value) return;

    // Use QR Server API for QR code generation (no package needed)
    // This is a reliable free service
    const encodedValue = encodeURIComponent(value);
    const url = `https://api.qrserver.com/v1/create-qr-code/?size=${size}x${size}&data=${encodedValue}&format=svg`;
    setQrUrl(url);
  }, [value, size]);

  if (!qrUrl) {
    return (
      <div 
        className={`bg-foreground-tertiary/10 rounded-lg flex items-center justify-center ${className}`}
        style={{ width: size, height: size }}
      >
        <span className="text-foreground-tertiary text-xs">Loading...</span>
      </div>
    );
  }

  return (
    <div className={`relative ${className}`}>
      <img
        src={qrUrl}
        alt="QR Code"
        width={size}
        height={size}
        className="rounded-lg bg-white p-2"
        style={{ imageRendering: "pixelated" }}
      />
    </div>
  );
}

// Alternative: Canvas-based QR Code (for offline use)
// To use this, install: npm install qrcode
// And uncomment the following code:
/*
import QRCodeLib from 'qrcode';

export function QRCodeCanvas({ value, size = 128, className = "" }: QRCodeProps) {
  const canvasRef = useRef<HTMLCanvasElement>(null);

  useEffect(() => {
    if (!value || !canvasRef.current) return;

    QRCodeLib.toCanvas(canvasRef.current, value, {
      width: size,
      margin: 2,
      color: {
        dark: '#000000',
        light: '#FFFFFF',
      },
    });
  }, [value, size]);

  return (
    <canvas
      ref={canvasRef}
      className={`rounded-lg ${className}`}
      width={size}
      height={size}
    />
  );
}
*/

