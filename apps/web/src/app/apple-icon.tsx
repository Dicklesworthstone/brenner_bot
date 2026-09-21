import { ImageResponse } from "next/og";

export const runtime = "edge";

export const size = {
  width: 180,
  height: 180,
};
export const contentType = "image/png";

export default function Icon() {
  return new ImageResponse(
    <div
      style={{
        width: "100%",
        height: "100%",
        display: "flex",
        alignItems: "center",
        justifyContent: "center",
        background: "linear-gradient(135deg, #0f172a 0%, #1e293b 100%)",
        borderRadius: 40,
      }}
    >
      {/* Bacteriophage */}
      <svg width="140" height="140" viewBox="0 0 32 32" fill="none">
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
        {/* Icosahedral head */}
        <polygon
          points="16,3 24,7.5 24,16.5 16,21 8,16.5 8,7.5"
          fill="url(#headGrad)"
          stroke="#06b6d4"
          strokeWidth="0.5"
        />
        {/* Head highlight */}
        <polygon points="16,4.5 22,8 22,12 16,15 10,12 10,8" fill="rgba(255,255,255,0.15)" />
        {/* DNA strands */}
        <path
          d="M14,8 Q16,10 14,12 Q12,14 14,16"
          stroke="rgba(255,255,255,0.3)"
          strokeWidth="0.8"
          fill="none"
          strokeLinecap="round"
        />
        <path
          d="M18,8 Q16,10 18,12 Q20,14 18,16"
          stroke="rgba(255,255,255,0.3)"
          strokeWidth="0.8"
          fill="none"
          strokeLinecap="round"
        />
        {/* Tail sheath */}
        <rect x="14.5" y="21" width="3" height="6" fill="url(#tailGrad)" rx="0.5" />
        {/* Baseplate */}
        <polygon points="12,27 20,27 18,28.5 14,28.5" fill="#0e7490" />
        {/* Tail fibers */}
        <g stroke="#06b6d4" strokeWidth="0.8" strokeLinecap="round" fill="none">
          <path d="M14,28 L10,31 L8,30" />
          <path d="M13,28 L9,30" />
          <path d="M12.5,27.5 L8,29" />
          <path d="M18,28 L22,31 L24,30" />
          <path d="M19,28 L23,30" />
          <path d="M19.5,27.5 L24,29" />
        </g>
      </svg>
    </div>,
    {
      ...size,
    },
  );
}
