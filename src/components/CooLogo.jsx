// SVG wordmark — "c" + "oo" as calligraphic infinity
// Built as a filled outlined path (like a real font glyph) so stroke weight varies:
// thick on sides (~4px), thin at top/bottom (~1.5px), thin at crossing (~2px)

export default function CooLogo({ height = 56, color = '#3A4858' }) {
  const vw = 100;
  const vh = 72;
  const width = height * (vw / vh);

  // Outer boundary: single closed figure-8 path (clockwise)
  // Crossing at x=65, y=43/45 (2px gap — thin crossing)
  // Sides: x=38 (left, thick) and x=92 (right, thick)
  // Top/bottom: y=24 (thin) and y=64 (thin)
  const outerBoundary = "M 65,43 C 68,24 92,24 92,44 C 92,64 68,64 65,45 C 62,64 38,64 38,44 C 38,24 62,24 65,43 Z";

  // Inner counters (counterclockwise = negative winding with nonzero rule → creates holes)
  // rx=10 (narrow), ry=18.5 (tall) → sides 4px thick, top/bottom 1.5px thin
  const leftCounter  = "M 52,25.5 A 10,18.5 0 1 0 52,62.5 A 10,18.5 0 1 0 52,25.5 Z";
  const rightCounter = "M 78,25.5 A 10,18.5 0 1 0 78,62.5 A 10,18.5 0 1 0 78,25.5 Z";

  const inf = [outerBoundary, leftCounter, rightCounter].join(" ");

  return (
    <svg
      viewBox={`0 0 ${vw} ${vh}`}
      width={width}
      height={height}
      aria-label="coo"
    >
      {/* "c" — thin serif, baseline y=54 */}
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

      {/* "oo" as calligraphic infinity — filled glyph, not stroke */}
      <path
        d={inf}
        fill={color}
        fillRule="nonzero"
      />
    </svg>
  );
}
