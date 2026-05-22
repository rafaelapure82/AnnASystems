import React from "react";

interface InsaludLogoProps {
  className?: string;
  variant?: "full" | "icon" | "minimal";
}

export default function InsaludLogo({ className = "w-48 h-auto", variant = "full" }: InsaludLogoProps) {
  // Medical colors
  const blueColor = "#0085d0"; // Official INSALUD Blue
  const redColor = "#d91a1a";  // Official INSALUD Red

  if (variant === "icon") {
    return (
      <svg
        viewBox="0 0 160 160"
        className={className}
        fill="none"
        xmlns="http://www.w3.org/2000/svg"
        id="insalud-logo-icon"
      >
        {/* Heart Stethoscope Outer Blue Shell */}
        <path
          d="M80 142C80 142 20 88 20 48C20 18 47 -2 80 28C113 -2 140 18 140 48C140 88 80 142 80 142Z"
          fill={blueColor}
        />
        {/* Inner White Gap */}
        <path
          d="M80 134C80 134 26 84 26 48C26 23 48 5 80 32C112 5 134 23 134 48C134 84 80 134 80 134Z"
          fill="white"
        />
        {/* Inner Solid Red Heart */}
        <path
          d="M80 126C80 126 32 80 32 48C32 28 50 12 80 37C110 12 128 28 128 48C128 80 80 126 80 126Z"
          fill={redColor}
        />
        
        {/* Stethoscope cord & bell details */}
        <rect x="74" y="138" width="12" height="15" rx="3" fill={blueColor} />
      </svg>
    );
  }

  return (
    <div className={`flex flex-col items-center justify-center ${className}`} id="insalud-logo-full">
      <svg
        viewBox="0 0 600 450"
        className="w-full h-auto"
        fill="none"
        xmlns="http://www.w3.org/2000/svg"
      >
        {/* === MAIN HEART STETHOSCOPE HEADER === */}
        {/* Outer Heart Shape in Blue */}
        <path
          d="M300 240 C300 240 170 140 170 65 C170 15 225 -20 300 35 C375 -20 430 15 430 65 C430 140 300 240 300 240 Z"
          fill={blueColor}
        />
        {/* White Inner Gap */}
        <path
          d="M300 228 C300 228 182 132 182 65 C182 25 228 -6 300 43 C372 -6 418 25 418 65 C418 132 300 228 300 228 Z"
          fill="#FFFFFF"
        />
        {/* Inner Heart in Red */}
        <path
          d="M300 215 C300 215 195 124 195 65 C195 33 234 5 300 52 C366 5 405 33 405 65 C405 124 300 215 300 215 Z"
          fill={redColor}
        />

        {/* === TUBING CONNECTIVITY & BELL / DIAPHRAGM === */}
        {/* Left hanging stethoscope Bell */}
        {/* Small loop wire */}
        <path
          d="M80 155 C80 110 115 130 115 170 L115 250"
          stroke={blueColor}
          strokeWidth="11"
          strokeLinecap="round"
        />
        {/* Blue metallic casing */}
        <circle cx="58" cy="205" r="30" fill={blueColor} />
        {/* Red core diaphragm */}
        <circle cx="58" cy="205" r="18" fill={redColor} />

        {/* Solid base tube flow going under writing */}
        {/* Begins from left bell cord (around y=375) and loops under */}
        <path
          d="M100 240 L100 375 C100 395 300 395 300 365 C300 355 312 355 312 368"
          stroke={blueColor}
          strokeWidth="13"
          strokeLinecap="round"
          strokeLinejoin="round"
        />

        {/* Lower U-loop support under S-A zone */}
        <path
          d="M312 365 L312 410 C312 435 348 435 348 410 L348 375"
          stroke={blueColor}
          strokeWidth="13"
          strokeLinecap="round"
          strokeLinejoin="round"
        />

        {/* Red tube line continuing rightwards to text support */}
        <path
          d="M362 388 L496 388"
          stroke={redColor}
          strokeWidth="8"
          strokeLinecap="round"
        />

        {/* === "INSALUD" SOLID TYPEFACE === */}
        <text
          x="30"
          y="360"
          fontFamily="system-ui, -apple-system, sans-serif"
          fontWeight="900"
          fontSize="118px"
          letterSpacing="-3px"
          fill={blueColor}
          style={{ fontStyle: "normal" }}
        >
          INSALUD
        </text>

        {/* === "APURE" TEXT RED === */}
        <rect x="502" y="364" width="86" height="32" fill="none" />
        <text
          x="502"
          y="398"
          fontFamily="system-ui, -apple-system, sans-serif"
          fontWeight="950"
          fontSize="41px"
          letterSpacing="-0.5px"
          fill={redColor}
          style={{ fontStyle: "normal" }}
        >
          APURE
        </text>
      </svg>
    </div>
  );
}
