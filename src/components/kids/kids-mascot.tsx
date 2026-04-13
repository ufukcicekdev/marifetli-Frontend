'use client';

/**
 * Marfi — Marifetli Kids maskotu
 *
 * Kullanim:
 *   <KidsMascot mood="idle" size={120} />
 *   <KidsMascot mood="happy" size={140} />
 *
 * Moodlar:
 *   idle      → hafif yuzme, sakin
 *   happy     → gulumser, kollar yukari, yanaklar pembe
 *   excited   → agiz acik, ziplama, etrafta yildizlar
 *   proud     → bir kolu yukari, goz kirpar, gurur pozu
 *   thinking  → yana bakan, dusunce balonu
 */

export type MascoMood = 'idle' | 'happy' | 'excited' | 'proud' | 'thinking';

interface KidsMascotProps {
  mood?: MascoMood;
  size?: number;
  className?: string;
  'aria-hidden'?: boolean;
}

export function KidsMascot({
  mood = 'idle',
  size = 120,
  className = '',
  'aria-hidden': ariaHidden = true,
}: KidsMascotProps) {
  const isHappy = mood === 'happy';
  const isExcited = mood === 'excited';
  const isProud = mood === 'proud';
  const isThinking = mood === 'thinking';
  const showCheeks = isHappy || isExcited || isProud;

  return (
    <svg
      viewBox="0 0 160 200"
      width={size}
      height={(size * 200) / 160}
      className={`marfi-mascot marfi-mood-${mood} ${className}`}
      aria-hidden={ariaHidden}
      xmlns="http://www.w3.org/2000/svg"
    >
      <defs>
        {/* Govde */}
        <radialGradient id={`mg-body-${mood}`} cx="38%" cy="32%" r="70%">
          <stop offset="0%" stopColor="#a78bfa" />
          <stop offset="50%" stopColor="#7c3aed" />
          <stop offset="100%" stopColor="#4c1d95" />
        </radialGradient>
        {/* Karin acik kisim */}
        <radialGradient id={`mg-belly-${mood}`} cx="50%" cy="40%" r="60%">
          <stop offset="0%" stopColor="#ede9fe" />
          <stop offset="100%" stopColor="#ddd6fe" />
        </radialGradient>
        {/* Kulak */}
        <radialGradient id={`mg-ear-${mood}`} cx="40%" cy="30%" r="70%">
          <stop offset="0%" stopColor="#8b5cf6" />
          <stop offset="100%" stopColor="#5b21b6" />
        </radialGradient>
        {/* Kol */}
        <linearGradient id={`mg-arm-${mood}`} x1="0" y1="0" x2="1" y2="1">
          <stop offset="0%" stopColor="#8b5cf6" />
          <stop offset="100%" stopColor="#6d28d9" />
        </linearGradient>
        {/* Anten yildizi */}
        <radialGradient id={`mg-star-${mood}`} cx="40%" cy="30%" r="70%">
          <stop offset="0%" stopColor="#fde68a" />
          <stop offset="100%" stopColor="#f59e0b" />
        </radialGradient>
        {/* Ic parca parlama */}
        <radialGradient id={`mg-shine-${mood}`} cx="35%" cy="25%" r="55%">
          <stop offset="0%" stopColor="white" stopOpacity="0.25" />
          <stop offset="100%" stopColor="white" stopOpacity="0" />
        </radialGradient>
      </defs>

      {/* ─── Ucucu yildizlar (happy/excited/proud) ─── */}
      {(isHappy || isExcited || isProud) && (
        <>
          <g className="marfi-star marfi-star-1">
            <polygon points="18,28 20,22 22,28 28,28 23,32 25,38 20,34 15,38 17,32 12,28" fill="#fbbf24" />
          </g>
          <g className="marfi-star marfi-star-2">
            <polygon points="142,20 144,14 146,20 152,20 147,24 149,30 144,26 139,30 141,24 136,20" fill="#f0abfc" />
          </g>
          {isExcited && (
            <>
              <g className="marfi-star marfi-star-3">
                <polygon points="8,60 10,55 12,60 17,60 13,63 14,68 10,65 6,68 7,63 3,60" fill="#a5f3fc" />
              </g>
              <g className="marfi-star marfi-star-4">
                <polygon points="152,65 154,60 156,65 161,65 157,68 158,73 154,70 150,73 151,68 147,65" fill="#86efac" />
              </g>
              <g className="marfi-star marfi-star-5">
                <polygon points="80,5 82.5,−2 85,5 92,5 87,9 89,16 84,12 79,16 81,9 76,5" fill="#fde68a" />
              </g>
            </>
          )}
        </>
      )}

      {/* ─── Anten ─── */}
      <line x1="80" y1="44" x2="80" y2="26" stroke="#8b5cf6" strokeWidth="4" strokeLinecap="round" />
      {/* Anten topu — star */}
      <circle cx="80" cy="20" r="10" fill={`url(#mg-star-${mood})`} />
      <circle cx="80" cy="20" r="5" fill="#fef3c7" opacity="0.7" />
      <circle cx="77" cy="17" r="2.5" fill="white" opacity="0.9" />

      {/* ─── Kulaklar (govde arkasinda) ─── */}
      <ellipse cx="44" cy="72" rx="14" ry="20" fill={`url(#mg-ear-${mood})`} transform="rotate(-15,44,72)" />
      <ellipse cx="116" cy="72" rx="14" ry="20" fill={`url(#mg-ear-${mood})`} transform="rotate(15,116,72)" />
      {/* Kulak ic */}
      <ellipse cx="44" cy="72" rx="7" ry="11" fill="#c4b5fd" opacity="0.6" transform="rotate(-15,44,72)" />
      <ellipse cx="116" cy="72" rx="7" ry="11" fill="#c4b5fd" opacity="0.6" transform="rotate(15,116,72)" />

      {/* ─── Ana govde ─── */}
      <ellipse cx="80" cy="115" rx="58" ry="65" fill={`url(#mg-body-${mood})`} />

      {/* Karin acik yon */}
      <ellipse cx="80" cy="125" rx="32" ry="36" fill={`url(#mg-belly-${mood})`} />

      {/* Govde parlama */}
      <ellipse cx="62" cy="85" rx="28" ry="18" fill={`url(#mg-shine-${mood})`} />

      {/* ─── Yanaklar ─── */}
      {showCheeks && (
        <>
          <ellipse cx="42" cy="120" rx="12" ry="8" fill="#fda4af" opacity="0.55" />
          <ellipse cx="118" cy="120" rx="12" ry="8" fill="#fda4af" opacity="0.55" />
        </>
      )}

      {/* ─── Gozler ─── */}
      {/* Sol goz */}
      {isProud ? (
        <path d="M 54 98 Q 64 89 74 98" stroke="#1e1b4b" fill="none" strokeWidth="4" strokeLinecap="round" />
      ) : (
        <g>
          <circle cx="64" cy="96" r="13" fill="white" />
          {/* Goz kapagi — scaleY ile kirpar */}
          <ellipse cx="64" cy="96" rx="13" ry="13" fill="#7c3aed">
            <animate
              attributeName="ry"
              values="0; 0; 13; 13; 0; 13; 13"
              keyTimes="0; 0.01; 0.06; 0.92; 0.94; 0.98; 1"
              dur="5s"
              begin="1s"
              repeatCount="indefinite"
            />
          </ellipse>
          <circle cx="67" cy="99" r="7" fill="#1e1b4b" />
          <circle cx="70" cy="95" r="3" fill="white" opacity="0.95" />
          <path d="M 52 90 Q 64 83 76 90" stroke="#1e1b4b" fill="none" strokeWidth="2.5" strokeLinecap="round" opacity="0.5" />
        </g>
      )}
      {/* Sag goz */}
      {isThinking ? (
        <g>
          <circle cx="96" cy="96" r="13" fill="white" />
          <ellipse cx="96" cy="96" rx="13" ry="13" fill="#7c3aed">
            <animate attributeName="ry" values="0; 0; 13; 13; 0; 13; 13" keyTimes="0; 0.01; 0.06; 0.92; 0.94; 0.98; 1" dur="5s" begin="1.4s" repeatCount="indefinite" />
          </ellipse>
          <circle cx="102" cy="99" r="7" fill="#1e1b4b" />
          <circle cx="105" cy="95" r="3" fill="white" opacity="0.95" />
          <path d="M 84 90 Q 96 83 108 90" stroke="#1e1b4b" fill="none" strokeWidth="2.5" strokeLinecap="round" opacity="0.5" />
        </g>
      ) : (
        <g>
          <circle cx="96" cy="96" r="13" fill="white" />
          <ellipse cx="96" cy="96" rx="13" ry="13" fill="#7c3aed">
            <animate attributeName="ry" values="0; 0; 13; 13; 0; 13; 13" keyTimes="0; 0.01; 0.06; 0.92; 0.94; 0.98; 1" dur="5s" begin="1.4s" repeatCount="indefinite" />
          </ellipse>
          <circle cx="99" cy="99" r="7" fill="#1e1b4b" />
          <circle cx="102" cy="95" r="3" fill="white" opacity="0.95" />
          <path d="M 84 90 Q 96 83 108 90" stroke="#1e1b4b" fill="none" strokeWidth="2.5" strokeLinecap="round" opacity="0.5" />
        </g>
      )}

      {/* ─── Agiz ─── */}
      {mood === 'idle' && (
        <path d="M 65 118 Q 80 128 95 118" stroke="#1e1b4b" fill="none" strokeWidth="3.5" strokeLinecap="round" />
      )}
      {isHappy && (
        <>
          {/* Buyuk gulucuk */}
          <path d="M 60 116 Q 80 134 100 116" stroke="#1e1b4b" strokeWidth="3.5" fill="#fecdd3" strokeLinecap="round" />
          {/* Ust dis goster */}
          <rect x="67" y="116" width="26" height="8" rx="3" fill="white" opacity="0.9" />
        </>
      )}
      {isExcited && (
        /* Acik agiz WOW ifadesi */
        <ellipse cx="80" cy="122" rx="16" ry="13" fill="#1e1b4b" opacity="0.85" />
      )}
      {isProud && (
        <path d="M 63 117 Q 80 130 97 117" stroke="#1e1b4b" fill="none" strokeWidth="3.5" strokeLinecap="round" />
      )}
      {isThinking && (
        /* Yan gulucuk */
        <path d="M 66 118 Q 82 127 94 117" stroke="#1e1b4b" fill="none" strokeWidth="3" strokeLinecap="round" />
      )}

      {/* ─── Kollar ─── */}
      {/* SOL KOL */}
      {(isHappy || isExcited) ? (
        /* Yukari kalkmis kol */
        <>
          <path d="M 22 95 Q 16 72 28 58" stroke={`url(#mg-arm-${mood})`} strokeWidth="11" strokeLinecap="round" fill="none" />
          {/* El */}
          <circle cx="28" cy="55" r="9" fill="#8b5cf6" />
          <circle cx="25" cy="50" r="4.5" fill="#a78bfa" />
          <circle cx="32" cy="50" r="4.5" fill="#a78bfa" />
        </>
      ) : isProud ? (
        /* Sol kol yukari (gurur) */
        <>
          <path d="M 22 95 Q 14 75 24 60" stroke={`url(#mg-arm-${mood})`} strokeWidth="11" strokeLinecap="round" fill="none" />
          <circle cx="24" cy="57" r="9" fill="#8b5cf6" />
          <circle cx="21" cy="52" r="4.5" fill="#a78bfa" />
          <circle cx="28" cy="52" r="4.5" fill="#a78bfa" />
        </>
      ) : isThinking ? (
        /* Sol kol - belde */
        <>
          <path d="M 22 108 Q 14 118 18 132" stroke={`url(#mg-arm-${mood})`} strokeWidth="11" strokeLinecap="round" fill="none" />
          <circle cx="18" cy="136" r="9" fill="#8b5cf6" />
        </>
      ) : (
        /* Idle: sol kol — SVG native animateTransform ile omuzdan sallama */
        <g>
          <path d="M 24 105 Q 12 115 14 130" stroke={`url(#mg-arm-${mood})`} strokeWidth="11" strokeLinecap="round" fill="none" />
          <circle cx="14" cy="134" r="9" fill="#8b5cf6" />
          <animateTransform
            attributeName="transform"
            type="rotate"
            values="0 24 105; 28 24 105; -10 24 105; 0 24 105"
            keyTimes="0; 0.12; 0.24; 1"
            dur="4s"
            begin="1.5s"
            repeatCount="indefinite"
            calcMode="spline"
            keySplines="0.4 0 0.6 1; 0.4 0 0.6 1; 0.4 0 0.6 1"
          />
        </g>
      )}

      {/* SAG KOL */}
      {(isHappy || isExcited) ? (
        <>
          <path d="M 138 95 Q 144 72 132 58" stroke={`url(#mg-arm-${mood})`} strokeWidth="11" strokeLinecap="round" fill="none" />
          <circle cx="132" cy="55" r="9" fill="#8b5cf6" />
          <circle cx="128" cy="50" r="4.5" fill="#a78bfa" />
          <circle cx="135" cy="50" r="4.5" fill="#a78bfa" />
        </>
      ) : isProud ? (
        /* Sag kol - belde (gurur pozu) */
        <>
          <path d="M 138 105 Q 146 115 142 128" stroke={`url(#mg-arm-${mood})`} strokeWidth="11" strokeLinecap="round" fill="none" />
          <circle cx="142" cy="132" r="9" fill="#8b5cf6" />
        </>
      ) : isThinking ? (
        /* Sag el yanak altinda */
        <>
          <path d="M 138 100 Q 148 108 145 118" stroke={`url(#mg-arm-${mood})`} strokeWidth="11" strokeLinecap="round" fill="none" />
          <circle cx="145" cy="122" r="9" fill="#8b5cf6" />
        </>
      ) : (
        /* Idle: sag kol sallama */
        <g>
          <path d="M 136 105 Q 148 115 146 130" stroke={`url(#mg-arm-${mood})`} strokeWidth="11" strokeLinecap="round" fill="none" />
          <circle cx="146" cy="134" r="9" fill="#8b5cf6" />
          <animateTransform
            attributeName="transform"
            type="rotate"
            values="0 136 105; -22 136 105; 8 136 105; 0 136 105"
            keyTimes="0; 0.1; 0.2; 1"
            dur="6s"
            begin="3.5s"
            repeatCount="indefinite"
            calcMode="spline"
            keySplines="0.4 0 0.6 1; 0.4 0 0.6 1; 0.4 0 0.6 1"
          />
        </g>
      )}

      {/* ─── Ayaklar ─── */}
      <ellipse cx="62" cy="176" rx="20" ry="12" fill="#6d28d9" />
      <ellipse cx="98" cy="176" rx="20" ry="12" fill="#6d28d9" />
      {/* Parmaklar */}
      <ellipse cx="50" cy="178" rx="8" ry="6" fill="#7c3aed" />
      <ellipse cx="62" cy="181" rx="8" ry="6" fill="#7c3aed" />
      <ellipse cx="74" cy="178" rx="8" ry="6" fill="#7c3aed" />
      <ellipse cx="86" cy="178" rx="8" ry="6" fill="#7c3aed" />
      <ellipse cx="98" cy="181" rx="8" ry="6" fill="#7c3aed" />
      <ellipse cx="110" cy="178" rx="8" ry="6" fill="#7c3aed" />

      {/* ─── Dusunce balonu ─── */}
      {isThinking && (
        <>
          <circle cx="122" cy="68" r="3" fill="white" opacity="0.75" />
          <circle cx="131" cy="56" r="5" fill="white" opacity="0.82" />
          <rect x="122" y="32" width="32" height="22" rx="10" fill="white" opacity="0.88" />
          <text x="138" y="47" fontSize="12" textAnchor="middle" fill="#7c3aed" fontWeight="bold">?</text>
        </>
      )}

      {/* ─── Alt golge ─── */}
      <ellipse cx="80" cy="190" rx="44" ry="8" fill="#4c1d95" opacity="0.15" />
    </svg>
  );
}
