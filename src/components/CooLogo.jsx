// SVG wordmark — "c" + "oo" as an infinity sign
// The two loops of the infinity are sized to match the "c" x-height
// so they read as both "oo" and ∞ simultaneously

export default function CooLogo({ height = 56, color = '#3A4858' }) {
  const vw = 112;
  const vh = 72;
  const width = height * (vw / vh);

  // Infinity path: two loops, each ~28px wide × 26px tall (roughly circular)
  // Centered at x=72, y=41 — aligned to the "c" x-height
  // Left loop: x 44–72, Right loop: x 72–100
  const inf = "M 72,41 C 65,28 44,28 44,41 C 44,54 65,54 72,41 C 79,28 100,28 100,41 C 100,54 79,54 72,41 Z";

  return (
    <svg
      viewBox={`0 0 ${vw} ${vh}`}
      width={width}
      height={height}
      aria-label="coo"
    >
      {/* "c" letterform */}
      <text
        x="4"
        y="54"
        fontFamily="Georgia, 'Times New Roman', serif"
        fontSize="54"
        fontWeight="300"
        fill={color}
      >
        c
      </text>

      {/* "oo" as infinity — stroke only, reads as two connected circles */}
      <path
        d={inf}
        fill="none"
        stroke={color}
        strokeWidth="2.5"
        strokeLinejoin="round"
      />
    </svg>
  );
}
