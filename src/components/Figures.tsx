// Drawn stick figures with motion for the Home sections. Decorative only.

const base = {
  width: 130, height: 120, viewBox: "0 0 130 120", fill: "none", strokeWidth: 3,
  strokeLinecap: "round" as const, strokeLinejoin: "round" as const, "aria-hidden": true,
};

export function CartFigure() {
  return (
    <svg {...base} stroke="#F1ECE4" className="shrink-0 self-center">
      <line x1="2" y1="108" x2="128" y2="108" stroke="#4A433C" strokeWidth="2" strokeDasharray="6 8" />
      <g style={{ animation: "push 1.6s ease-in-out infinite" }}>
        <g style={{ animation: "bob 0.8s ease-in-out infinite" }}>
          <circle cx="30" cy="22" r="9" />
          <line x1="30" y1="31" x2="30" y2="68" />
          <line x1="30" y1="42" x2="72" y2="54" />
          <line x1="30" y1="46" x2="72" y2="56" />
        </g>
        <line x1="30" y1="68" x2="30" y2="104" style={{ transformOrigin: "30px 68px", animation: "legA 0.8s ease-in-out infinite" }} />
        <line x1="30" y1="68" x2="30" y2="104" style={{ transformOrigin: "30px 68px", animation: "legB 0.8s ease-in-out infinite" }} />
        <path d="M72 55 L78 55 L84 86 L120 86 L126 62 L80 62" />
        <rect x="88" y="50" width="12" height="12" rx="2" fill="#F48D3C" stroke="#F48D3C" />
        <rect x="103" y="46" width="10" height="16" rx="2" fill="#F1ECE4" />
        <circle cx="117" cy="56" r="5" fill="#F48D3C" stroke="#F48D3C" />
        <circle cx="90" cy="98" r="5" />
        <circle cx="114" cy="98" r="5" />
        <line x1="84" y1="86" x2="88" y2="93" />
      </g>
    </svg>
  );
}

export function TagFigure() {
  return (
    <svg {...base} stroke="#14110E" className="shrink-0 self-center">
      <line x1="2" y1="108" x2="128" y2="108" strokeWidth="2" />
      <rect x="78" y="62" width="44" height="46" rx="3" fill="#F1ECE4" />
      <line x1="78" y1="74" x2="122" y2="74" />
      <g style={{ transformOrigin: "100px 88px", animation: "pop 2.4s ease-in-out infinite" }}>
        <path d="M92 82 L104 82 L110 88 L104 94 L92 94 Z" fill="#14110E" />
        <circle cx="96" cy="88" r="1.5" fill="#F48D3C" stroke="#F48D3C" />
      </g>
      <circle cx="40" cy="26" r="9" />
      <line x1="40" y1="35" x2="40" y2="72" />
      <line x1="40" y1="46" x2="28" y2="64" />
      <g style={{ animation: "stick 2.4s ease-in-out infinite" }}>
        <line x1="40" y1="44" x2="72" y2="58" />
        <path d="M70 52 L80 52 L85 57 L80 62 L70 62 Z" fill="#F1ECE4" />
      </g>
      <line x1="40" y1="72" x2="30" y2="106" />
      <line x1="40" y1="72" x2="50" y2="106" />
    </svg>
  );
}

export function ScaleFigure() {
  return (
    <svg {...base} stroke="#14110E" className="shrink-0 self-center">
      <line x1="2" y1="108" x2="128" y2="108" stroke="#D9D2C8" strokeWidth="2" />
      <circle cx="26" cy="30" r="9" />
      <line x1="26" y1="39" x2="26" y2="74" />
      <line x1="26" y1="50" x2="56" y2="44" />
      <line x1="26" y1="50" x2="16" y2="66" />
      <line x1="26" y1="74" x2="18" y2="106" />
      <line x1="26" y1="74" x2="34" y2="106" />
      <line x1="92" y1="34" x2="92" y2="104" />
      <line x1="80" y1="106" x2="104" y2="106" />
      <g style={{ transformOrigin: "92px 34px", animation: "tilt 3s ease-in-out infinite" }}>
        <line x1="66" y1="34" x2="118" y2="34" />
        <line x1="66" y1="34" x2="60" y2="56" />
        <line x1="66" y1="34" x2="72" y2="56" />
        <path d="M58 56 Q66 64 74 56 Z" />
        <line x1="118" y1="34" x2="112" y2="56" />
        <line x1="118" y1="34" x2="124" y2="56" />
        <path d="M110 56 Q118 64 126 56 Z" />
        <circle cx="66" cy="51" r="4" fill="#F48D3C" stroke="#F48D3C" />
        <circle cx="118" cy="51" r="4" fill="#F48D3C" stroke="#F48D3C" />
      </g>
    </svg>
  );
}
