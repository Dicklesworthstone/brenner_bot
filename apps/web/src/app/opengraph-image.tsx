import { ImageResponse } from "next/og";

export const runtime = "edge";

export const alt = "BrennerBot - Operationalizing Sydney Brenner's Scientific Methodology";
export const size = {
  width: 1200,
  height: 630,
};
export const contentType = "image/png";

export default async function Image() {
  return new ImageResponse(
    <div
      style={{
        height: "100%",
        width: "100%",
        display: "flex",
        flexDirection: "column",
        alignItems: "center",
        justifyContent: "center",
        background: "linear-gradient(135deg, #0f172a 0%, #1e293b 50%, #0f172a 100%)",
        fontFamily: "system-ui, sans-serif",
        position: "relative",
        overflow: "hidden",
      }}
    >
      {/* Background pattern - DNA helix hint */}
      <div
        style={{
          position: "absolute",
          top: 0,
          left: 0,
          right: 0,
          bottom: 0,
          opacity: 0.05,
          backgroundImage: `url("data:image/svg+xml,%3Csvg width='60' height='60' viewBox='0 0 60 60' xmlns='http://www.w3.org/2000/svg'%3E%3Cg fill='none' fill-rule='evenodd'%3E%3Cg fill='%2306b6d4' fill-opacity='1'%3E%3Cpath d='M36 34v-4h-2v4h-4v2h4v4h2v-4h4v-2h-4zm0-30V0h-2v4h-4v2h4v4h2V6h4V4h-4zM6 34v-4H4v4H0v2h4v4h2v-4h4v-2H6zM6 4V0H4v4H0v2h4v4h2V6h4V4H6z'/%3E%3C/g%3E%3C/g%3E%3C/svg%3E")`,
          display: "flex",
        }}
      />

      {/* Glowing orbs for depth */}
      <div
        style={{
          position: "absolute",
          top: -100,
          right: -100,
          width: 400,
          height: 400,
          borderRadius: "50%",
          background: "radial-gradient(circle, rgba(6,182,212,0.3) 0%, transparent 70%)",
          display: "flex",
        }}
      />
      <div
        style={{
          position: "absolute",
          bottom: -150,
          left: -150,
          width: 500,
          height: 500,
          borderRadius: "50%",
          background: "radial-gradient(circle, rgba(8,145,178,0.2) 0%, transparent 70%)",
          display: "flex",
        }}
      />

      {/* Main content */}
      <div
        style={{
          display: "flex",
          flexDirection: "column",
          alignItems: "center",
          justifyContent: "center",
          zIndex: 10,
          padding: "60px",
        }}
      >
        {/* Bacteriophage icon */}
        <div
          style={{
            display: "flex",
            alignItems: "center",
            justifyContent: "center",
            marginBottom: 40,
          }}
        >
          <svg
            width="120"
            height="120"
            viewBox="0 0 32 32"
            fill="none"
            style={{ filter: "drop-shadow(0 0 20px rgba(6,182,212,0.5))" }}
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

        {/* Title */}
        <h1
          style={{
            fontSize: 72,
            fontWeight: 800,
            background: "linear-gradient(135deg, #22d3ee 0%, #06b6d4 50%, #0891b2 100%)",
            backgroundClip: "text",
            color: "transparent",
            margin: 0,
            marginBottom: 20,
            letterSpacing: "-0.02em",
            display: "flex",
          }}
        >
          BrennerBot
        </h1>

        {/* Subtitle */}
        <p
          style={{
            fontSize: 28,
            color: "#94a3b8",
            margin: 0,
            marginBottom: 30,
            textAlign: "center",
            maxWidth: 800,
            lineHeight: 1.4,
            display: "flex",
          }}
        >
          Operationalizing Sydney Brenner&apos;s Scientific Methodology
        </p>

        {/* Tagline */}
        <div
          style={{
            display: "flex",
            alignItems: "center",
            gap: 16,
            fontSize: 18,
            color: "#64748b",
          }}
        >
          <span
            style={{
              display: "flex",
              alignItems: "center",
              gap: 8,
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
            Multi-Agent Research Lab
          </span>
          <span style={{ color: "#475569", display: "flex" }}>•</span>
          <span style={{ display: "flex" }}>236 Interview Segments</span>
          <span style={{ color: "#475569", display: "flex" }}>•</span>
          <span style={{ display: "flex" }}>3 Model Distillations</span>
        </div>
      </div>

      {/* Bottom accent line */}
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
