import React from "react";

export default function AnimatedAmbulance() {
  return (
    <div className="w-full relative h-11 overflow-hidden pointer-events-none select-none flex items-center" id="animated-ambulance-track">
      {/* Dynamic keyframe styles declared inline for perfect self-containment */}
      <style>{`
        @keyframes drive-across {
          0% {
            transform: translateX(-150px);
          }
          100% {
            transform: translateX(100vw);
          }
        }
        @keyframes lights-alternate {
          0%, 100% {
            fill: #ef4444; /* red-500 */
            filter: drop-shadow(0 0 4px #ef4444);
          }
          50% {
            fill: #3b82f6; /* blue-500 */
            filter: drop-shadow(0 0 4px #3b82f6);
          }
        }
        @keyframes wheel-spin {
          0% {
            transform: rotate(0deg);
          }
          100% {
            transform: rotate(360deg);
          }
        }
        @keyframes suspension-vibrate {
          0%, 100% {
            transform: translateY(0);
          }
          50% {
            transform: translateY(-1.2px);
          }
        }
        .ambulance-container {
          animation: drive-across 20s linear infinite;
        }
        .ambulance-body {
          animation: suspension-vibrate 0.15s ease-in-out infinite;
        }
        .ambulance-light {
          animation: lights-alternate 0.3s steps(2) infinite;
        }
        .ambulance-wheel {
          animation: wheel-spin 0.4s linear infinite;
          transform-origin: center;
        }
        .road-line {
          background-image: repeating-linear-gradient(90deg, #475569 0px, #475569 15px, transparent 15px, transparent 35px);
        }
      `}</style>

      {/* The Road dashed line */}
      <div className="absolute inset-x-0 bottom-1.5 h-[2px] road-line opacity-30"></div>

      {/* Ambulance Unit wrapper - Matched perfectly to full 110x40 ratio */}
      <div className="absolute left-0 bottom-1 flex items-end ambulance-container" style={{ width: "110px", height: "40px" }}>
        
        {/* Ambulance SVG */}
        <svg
          viewBox="0 0 110 40"
          className="w-full h-auto"
          fill="none"
          xmlns="http://www.w3.org/2000/svg"
        >
          {/* Main Cabin and chassis group applying suspension vibrate */}
          <g className="ambulance-body">
            {/* White modern ambulance vehicle shape */}
            <path
              d="M10 28 L10 10 C10 8 12 7 14 7 L70 7 C72 7 74 8 75 10 L88 20 C90 22 92 24 92 28 C92 30 90 31 87 31 L14 31 C11 31 10 29 10 28 Z"
              fill="#FFFFFF"
              stroke="#cbd5e1"
              strokeWidth="1.5"
            />

            {/* Front windshield window */}
            <path
              d="M74 10 L84 19 C85 20 86 21 86 23 L72 23 L72 10 Z"
              fill="#0f172a"
            />

            {/* Side window */}
            <rect x="44" y="10" width="16" height="10" rx="1.5" fill="#1e293b" />
            <rect x="22" y="10" width="16" height="10" rx="1.5" fill="#1e293b" />

            {/* Official INSALUD APURE stripe markings */}
            <rect x="11" y="22" width="77" height="3.5" fill="#0085d0" />
            
            {/* Red Heart/Cross emblem on the side */}
            <path
              d="M33 14 C33 14 30.5 11.5 30.5 9.5 C30.5 8 31.5 7.5 32.5 8.5 C33.5 7.5 34.5 8 34.5 9.5 C34.5 11.5 33 14 33 14 Z"
              fill="#d91a1a"
            />
            
            {/* "INSALUD" text print */}
            <text
              x="13"
              y="18"
              fontFamily="monospace"
              fontWeight="bold"
              fontSize="4.5px"
              fill="#0085d0"
              letterSpacing="-0.2px"
            >
              INSALUD 171
            </text>

            {/* Front & back bumper */}
            <rect x="88" y="26" width="5" height="4" rx="1" fill="#64748b" />
            <rect x="6" y="27" width="4" height="3" rx="1" fill="#64748b" />

            {/* Glowing Emergency lightbars support & light */}
            <rect x="36" y="5" width="6" height="2" fill="#64748b" />
            <ellipse cx="39" cy="4" rx="3.5" ry="1.5" fill="#ef4444" className="ambulance-light" />
          </g>

          {/* Front & back Spinning WheeIs (not affected by body suspension) */}
          {/* Wheel Rear (Left) */}
          <g className="ambulance-wheel" style={{ transformBox: "fill-box" }}>
            <circle cx="25" cy="30" r="7" fill="#0f172a" stroke="#94a3b8" strokeWidth="1" />
            <circle cx="25" cy="30" r="4.5" fill="#475569" />
            {/* Spokes to see spin */}
            <line x1="25" y1="23" x2="25" y2="37" stroke="#cbd5e1" strokeWidth="0.8" />
            <line x1="18" y1="30" x2="32" y2="30" stroke="#cbd5e1" strokeWidth="0.8" />
          </g>

          {/* Wheel Front (Right) */}
          <g className="ambulance-wheel" style={{ transformBox: "fill-box" }}>
            <circle cx="72" cy="30" r="7" fill="#0f172a" stroke="#94a3b8" strokeWidth="1" />
            <circle cx="72" cy="30" r="4.5" fill="#475569" />
            {/* Spokes to see spin */}
            <line x1="72" y1="23" x2="72" y2="37" stroke="#cbd5e1" strokeWidth="0.8" />
            <line x1="65" y1="30" x2="79" y2="30" stroke="#cbd5e1" strokeWidth="0.8" />
          </g>
        </svg>

      </div>
    </div>
  );
}
