// SVG wordmark — "c" in Jost geometric sans + "oo" as uniform-stroke infinity
// Stroke weight matched to Jost Light at 54px (~2.5px)

export default function CooLogo({ height = 56, color = '#3A4858' }) {
  const vw = 100;
  const vh = 72;
  const width = height * (vw / vh);

  // Figure-8 path: tight crossing, vertically stretched loops
  // Crossing at (66, 42), left loop x=38–66, right loop x=66–94
  // Vertical range y=20–64 (stretched well above/below x-height)
  // Tight crossing: control points at y=32/52 (10px from center y=42)
  const inf = "M 66,42 C 66,32 38,20 38,42 C 38,64 66,52 66,42 C 66,32 94,20 94,42 C 94,64 66,52 66,42 Z";

  return (
    <svg
      viewBox={`0 0 ${vw} ${vh}`}
      width={width}
      height={height}
      aria-label="coo"
    >
      <text
        x="4"
        y="56"
        fontFamily="'Jost', sans-serif"
        fontSize="54"
        fontWeight="300"
        fill={color}
      >
        c
      </text>

      <path
        d={inf}
        fill="none"
        stroke={color}
        strokeWidth="2.5"
        strokeLinecap="round"
        strokeLinejoin="round"
      />
    </svg>
  );
}
