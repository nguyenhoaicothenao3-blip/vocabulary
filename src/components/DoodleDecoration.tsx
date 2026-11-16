import React from 'react';

export function NotebookBinderHoles() {
  return (
    <div
      aria-hidden="true"
      className="pointer-events-none fixed left-2.5 top-0 bottom-0 hidden sm:flex flex-col justify-around py-16 z-0"
    >
      {[0, 1, 2].map((idx) => (
        <svg key={idx} width="26" height="26" viewBox="0 0 26 26" className="opacity-70">
          <circle
            cx="13"
            cy="13"
            r="9.5"
            fill="#e2e8f0"
            stroke="#94a3b8"
            strokeWidth="1.5"
            strokeDasharray="18 2 14 2"
          />
          <circle cx="13" cy="13" r="6.5" fill="#fcf9f2" stroke="#cbd5e1" strokeWidth="1" />
        </svg>
      ))}
    </div>
  );
}

export function DoodleRocketLogo({ className = 'w-10 h-10' }: { className?: string }) {
  return (
    <svg
      viewBox="0 0 64 64"
      fill="none"
      className={className}
      aria-hidden="true"
    >
      {/* Flame */}
      <path
        d="M27 48 C27 54, 30 58, 32 60 C34 58, 37 54, 37 48"
        fill="#fb923c"
        stroke="#ea580c"
        strokeWidth="2.2"
        strokeLinecap="round"
        strokeLinejoin="round"
      />
      {/* Left wing */}
      <path
        d="M22 34 C14 38, 12 45, 14 49 L23 44 Z"
        fill="#93c5fd"
        stroke="#1e293b"
        strokeWidth="2.4"
        strokeLinejoin="round"
      />
      {/* Right wing */}
      <path
        d="M42 34 C50 38, 52 45, 50 49 L41 44 Z"
        fill="#93c5fd"
        stroke="#1e293b"
        strokeWidth="2.4"
        strokeLinejoin="round"
      />
      {/* Body */}
      <path
        d="M32 6 C42 16, 44 34, 41 47 C35 49, 29 49, 23 47 C20 34, 22 16, 32 6 Z"
        fill="#ffffff"
        stroke="#1e293b"
        strokeWidth="2.6"
        strokeLinejoin="round"
      />
      {/* Red tip */}
      <path
        d="M32 6 C36.5 11, 38.5 16, 39 20 C34 21.5, 30 21.5, 25 20 C25.5 16, 27.5 11, 32 6 Z"
        fill="#fca5a5"
        stroke="#1e293b"
        strokeWidth="2.2"
        strokeLinejoin="round"
      />
      {/* Window */}
      <circle cx="32" cy="30" r="5.5" fill="#bae6fd" stroke="#1e293b" strokeWidth="2.3" />
      <circle cx="30.2" cy="28.3" r="1.4" fill="#ffffff" />
    </svg>
  );
}

export function RedUnderlineSvg({ className = 'w-44 h-3' }: { className?: string }) {
  return (
    <svg viewBox="0 0 220 14" fill="none" className={className} aria-hidden="true" preserveAspectRatio="none">
      <path
        d="M4 9 C55 4, 140 12, 216 6"
        stroke="#dc2626"
        strokeWidth="3"
        strokeLinecap="round"
      />
      <path
        d="M12 12 C75 8, 155 13, 206 10"
        stroke="#dc2626"
        strokeWidth="1.5"
        strokeLinecap="round"
        opacity="0.65"
      />
    </svg>
  );
}

export function DoodleStar({ className = 'w-6 h-6' }: { className?: string }) {
  return (
    <svg viewBox="0 0 32 32" fill="none" className={className} aria-hidden="true">
      <path
        d="M16 3 L19.5 11.2 L28.5 12 L21.7 17.8 L23.8 26.8 L16 22 L8.2 26.8 L10.3 17.8 L3.5 12 L12.5 11.2 Z"
        fill="#fef08a"
        stroke="#1e293b"
        strokeWidth="2.2"
        strokeLinejoin="round"
      />
    </svg>
  );
}
