import { ImageResponse } from "next/og";

export const runtime = "edge";

export const alt = "BrennerBot - Operationalizing Sydney Brenner's Scientific Methodology";
export const size = {
  width: 1200,
  height: 600,
};
export const contentType = "image/png";

export default async function Image() {
  return new ImageResponse(
    <div
      style={{
        height: "100%",
        width: "100%",
        display: "flex",
        flexDirection: "row",
        alignItems: "center",
        justifyContent: "space-between",
        background: "linear-gradient(135deg, #0f172a 0%, #1e293b 50%, #0f172a 100%)",
        fontFamily: "system-ui, sans-serif",
        position: "relative",
        overflow: "hidden",
        padding: "60px 80px",
      }}
    >
      {/* Background accents */}
      <div
        style={{
          position: "absolute",
          top: -100,
          right: -100,
          width: 400,
          height: 400,
          borderRadius: "50%",
          background: "radial-gradient(circle, rgba(6,182,212,0.25) 0%, transparent 70%)",
          display: "flex",
        }}
      />
      <div
        style={{
          position: "absolute",
          bottom: -100,
          left: -100,
          width: 350,
          height: 350,
          borderRadius: "50%",
          background: "radial-gradient(circle, rgba(8,145,178,0.15) 0%, transparent 70%)",
          display: "flex",
        }}
      />

      {/* Left content */}
      <div
        style={{
          display: "flex",
          flexDirection: "column",
          justifyContent: "center",
          zIndex: 10,
          maxWidth: "60%",
        }}
      >
        {/* Badge */}
        <div
          style={{
            display: "flex",
            alignItems: "center",
            gap: 8,
            marginBottom: 24,
            fontSize: 16,
            color: "#06b6d4",
            textTransform: "uppercase",
            letterSpacing: "0.1em",
            fontWeight: 600,
          }}
        >
          <span
            style={{
              width: 8,
              height: 8,
              borderRadius: "50%",
              background: "#22c55e",
              display: "flex",
            }}
          />
          Research Lab
        </div>

        {/* Title */}
        <h1
          style={{
            fontSize: 64,
            fontWeight: 800,
            background: "linear-gradient(135deg, #22d3ee 0%, #06b6d4 50%, #0891b2 100%)",
            backgroundClip: "text",
            color: "transparent",
            margin: 0,
            marginBottom: 16,
            letterSpacing: "-0.02em",
            lineHeight: 1.1,
            display: "flex",
          }}
        >
          BrennerBot
        </h1>

        {/* Subtitle */}
        <p
          style={{
            fontSize: 24,
            color: "#94a3b8",
            margin: 0,
            marginBottom: 24,
            lineHeight: 1.4,
            display: "flex",
          }}
        >
          Operationalizing Sydney Brenner&apos;s Scientific Methodology via Multi-Agent
          Collaboration
        </p>

        {/* Stats */}
        <div
          style={{
            display: "flex",
            alignItems: "center",
            gap: 24,
            fontSize: 16,
            color: "#64748b",
          }}
        >
          <span style={{ display: "flex" }}>236 Segments</span>
          <span style={{ color: "#475569", display: "flex" }}>•</span>
          <span style={{ display: "flex" }}>3 Distillations</span>
          <span style={{ color: "#475569", display: "flex" }}>•</span>
          <span style={{ display: "flex" }}>40k+ Words</span>
        </div>
      </div>

      {/* Right - Bacteriophage */}
      <div
        style={{
          display: "flex",
          alignItems: "center",
          justifyContent: "center",
          zIndex: 10,
        }}
      >
        <svg
          width="200"
          height="200"
          viewBox="0 0 32 32"
          fill="none"
          style={{ filter: "drop-shadow(0 0 30px rgba(6,182,212,0.4))" }}
        >
          <defs>
            <linearGradient id="headGrad" x1="0%" y1="0%" x2="100%" y2="100%">
              <stop offset="0%" stopColor="#22d3ee" />
              <stop offset="50%" stopColor="#0891b2" />
              <stop offset="100%" stopColor="#0e7490" />
            </linearGradient>
            <linearGradient id="tailGrad" x1="50%" y1="0%" x2="50%" y2="100%">
              <stop offset="0%" stopColor="#0891b2" />
              <stop offset="100%" stopColor="#164e63" />
            </linearGradient>
          </defs>
          <polygon
            points="16,3 24,7.5 24,16.5 16,21 8,16.5 8,7.5"
            fill="url(#headGrad)"
            stroke="#06b6d4"
            strokeWidth="0.5"
          />
          <polygon points="16,4.5 22,8 22,12 16,15 10,12 10,8" fill="rgba(255,255,255,0.15)" />
          <path
            d="M14,8 Q16,10 14,12 Q12,14 14,16"
            stroke="rgba(255,255,255,0.25)"
            strokeWidth="0.8"
            fill="none"
            strokeLinecap="round"
          />
          <path
            d="M18,8 Q16,10 18,12 Q20,14 18,16"
            stroke="rgba(255,255,255,0.25)"
            strokeWidth="0.8"
            fill="none"
            strokeLinecap="round"
          />
          <rect x="14.5" y="21" width="3" height="6" fill="url(#tailGrad)" rx="0.5" />
          <polygon points="12,27 20,27 18,28.5 14,28.5" fill="#0e7490" />
          <g stroke="#06b6d4" strokeWidth="0.8" strokeLinecap="round" fill="none">
            <path d="M14,28 L10,31 L8,30" />
            <path d="M13,28 L9,30" />
            <path d="M12.5,27.5 L8,29" />
            <path d="M18,28 L22,31 L24,30" />
            <path d="M19,28 L23,30" />
            <path d="M19.5,27.5 L24,29" />
          </g>
        </svg>
      </div>

      {/* Bottom accent */}
      <div
        style={{
          position: "absolute",
          bottom: 0,
          left: 0,
          right: 0,
          height: 4,
          background: "linear-gradient(90deg, transparent, #06b6d4, transparent)",
          display: "flex",
        }}
      />
    </div>,
    {
      ...size,
    },
  );
}
