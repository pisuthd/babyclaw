const steps = [
  {
    id: 1,
    label: "Observe",
    color: "#3edfdf", // accent-cyan
    glowColor: "rgba(62, 223, 223, 0.3)",
    details: ["Read on-chain utilization rate", "Fetch supply & borrow APY", "Pull external yield data"],
  },
  {
    id: 2,
    label: "Decide",
    color: "#22d3ee", // cyan-400
    glowColor: "rgba(34, 211, 238, 0.3)",
    details: ["U = 18% — below 30% threshold", "Net yield: 5.2% − 2.1% − 0.4% = +2.7%", "Opportunity confirmed"],
  },
  {
    id: 3,
    label: "Plan",
    color: "#a78bfa", // purple-400
    glowColor: "rgba(167, 139, 250, 0.3)",
    details: ["Risk level: Conservative", "Max borrow cap: 100 USDT", "Optimal amount: 80 USDT"],
  },
  {
    id: 4,
    label: "Execute",
    color: "#f472b6", // pink-400
    glowColor: "rgba(244, 114, 182, 0.3)",
    details: ["Borrow 80 USDT from protocol", "Bridge to target chain", "Deploy into yield strategy"],
  },
  {
    id: 5,
    label: "Settle",
    color: "#34d399", // emerald-400
    glowColor: "rgba(52, 211, 153, 0.3)",
    details: ["Withdraw from strategy", "Repay 80 USDT loan", "Net profit: 2.1 USDT"],
  },
  {
    id: 6,
    label: "Burn",
    color: "#fb923c", // orange-400
    glowColor: "rgba(251, 146, 60, 0.3)",
    details: ["Swap 2.1 USDT to $BABY", "Execute burn transaction", "Supply reduced permanently"],
  },
];

const CX = 400;
const CY = 260;
const R = 108;
const IR = 66;
const GAP = 3;
const SLICE = (360 - steps.length * GAP) / steps.length;

function polarXY(r, deg) {
  const rad = ((deg - 90) * Math.PI) / 180;
  return { x: CX + r * Math.cos(rad), y: CY + r * Math.sin(rad) };
}

function slicePath(startDeg, endDeg) {
  const s1 = polarXY(R, startDeg);
  const e1 = polarXY(R, endDeg);
  const s2 = polarXY(IR, endDeg);
  const e2 = polarXY(IR, startDeg);
  const lg = endDeg - startDeg > 180 ? 1 : 0;
  return `M${s1.x},${s1.y} A${R},${R} 0 ${lg} 1 ${e1.x},${e1.y} L${s2.x},${s2.y} A${IR},${IR} 0 ${lg} 0 ${e2.x},${e2.y}Z`;
}

// Fixed panel positions around the donut
// Each panel: { x, y } = top-left corner, width=190, height=90
// anchor side: which edge connects to the line
const PANEL_W = 190;
const PANEL_H = 90;

const panelPositions = [
  { x: CX - 95,         y: CY - 260 },   // top center    (step 1, ~-90°)
  { x: CX + 155,        y: CY - 190 },   // top right     (step 2, ~-30°)
  { x: CX + 175,        y: CY + 20  },   // right         (step 3, ~30°)
  { x: CX - 95,         y: CY + 155 },   // bottom center (step 4, ~90°)
  { x: CX - 380,        y: CY + 20  },   // left          (step 5, ~150°)
  { x: CX - 370,        y: CY - 190 },   // top left      (step 6, ~210°)
];

// The anchor point on the panel closest to the donut
function panelAnchor(idx, midDeg) {
  const p = panelPositions[idx];
  const norm = ((midDeg % 360) + 360) % 360;

  if (idx === 0) return { x: p.x + PANEL_W / 2, y: p.y + PANEL_H }; // bottom edge
  if (idx === 1) return { x: p.x, y: p.y + PANEL_H * 0.6 };           // left edge
  if (idx === 2) return { x: p.x, y: p.y + PANEL_H * 0.4 };           // left edge
  if (idx === 3) return { x: p.x + PANEL_W / 2, y: p.y };             // top edge
  if (idx === 4) return { x: p.x + PANEL_W, y: p.y + PANEL_H * 0.4 }; // right edge
  if (idx === 5) return { x: p.x + PANEL_W, y: p.y + PANEL_H * 0.6 }; // right edge
  return { x: p.x + PANEL_W / 2, y: p.y + PANEL_H / 2 };
}

export default function HowItWorks() {
  return (
    <section className="px-4 md:px-8 py-24 md:py-32 relative overflow-hidden">
      
      {/* Subtle glow effects */}
      <div className="absolute top-1/4 left-1/4 w-96 h-96 bg-accent-cyan/5 rounded-full blur-3xl"></div>
      <div className="absolute bottom-1/4 right-1/4 w-96 h-96 bg-accent-cyan/5 rounded-full blur-3xl"></div>
      
      <div className="relative max-w-6xl mx-auto flex items-center justify-center">
        {/* Section header */}
        <div className="absolute -top-4 md:-top-8 left-0 w-full text-center">
          <h2 className="text-3xl md:text-4xl font-bold mb-3 text-text-primary">
            How BABY Operates
          </h2>
          <p className="text-base md:text-lg text-text-secondary  mx-auto">
           Powered by OpenClaw, BABY autonomously observes, decides, and executes across chains
          </p>
        </div>

        <svg
          viewBox="0 0 800 520"
          width="100%"
          style={{ maxWidth: 900, overflow: "visible" }}
          className="mt-16 md:mt-20"
        >
          {steps.map((s, i) => {
            const startDeg = i * (SLICE + GAP);
            const endDeg = startDeg + SLICE;
            const midDeg = (startDeg + endDeg) / 2;
            const rimPt = polarXY(R + 6, midDeg);
            const anchor = panelAnchor(i, midDeg);
            const panel = panelPositions[i];

            // Connector: elbow line
            const dx = anchor.x - rimPt.x;
            const dy = anchor.y - rimPt.y;
            const cx1 = rimPt.x + dx * 0.5;
            const cy1 = rimPt.y;
            const cx2 = rimPt.x + dx * 0.5;
            const cy2 = anchor.y;

            return (
              <g key={s.id}>
                {/* Connector curve */}
                <path
                  d={`M${rimPt.x},${rimPt.y} C${cx1},${cy1} ${cx2},${cy2} ${anchor.x},${anchor.y}`}
                  fill="none"
                  stroke={s.color}
                  strokeWidth="1.2"
                  opacity="0.35"
                  strokeDasharray="4 3"
                />
                {/* Rim dot */}
                <circle cx={rimPt.x} cy={rimPt.y} r="3.5" fill={s.color} opacity="0.7" />
                {/* Panel dot */}
                <circle cx={anchor.x} cy={anchor.y} r="3.5" fill={s.color} />

                {/* Panel card */}
                <rect
                  x={panel.x} y={panel.y}
                  width={PANEL_W} height={PANEL_H}
                  rx="6"
                  fill="#1e293b"
                  stroke="#334155"
                  strokeWidth="1"
                />
                {/* Left accent bar */}
                <rect
                  x={panel.x} y={panel.y}
                  width="3" height={PANEL_H}
                  rx="2"
                  fill={s.color}
                />

                {/* Step index */}
                <text
                  x={panel.x + 12} y={panel.y + 16}
                  fontSize="9" fontWeight="600"
                  fill={s.color}
                  fontFamily="'Inter', sans-serif"
                  letterSpacing="0.06em"
                >{`0${s.id}`}</text>

                {/* Step name */}
                <text
                  x={panel.x + 12} y={panel.y + 31}
                  fontSize="12.5" fontWeight="600"
                  fill="#f8fafc"
                  fontFamily="'Inter', sans-serif"
                >{s.label}</text>

                {/* Divider */}
                <line
                  x1={panel.x + 12} y1={panel.y + 38}
                  x2={panel.x + PANEL_W - 10} y2={panel.y + 38}
                  stroke="#334155" strokeWidth="1"
                />

                {/* Details */}
                {s.details.map((line, li) => (
                  <text
                    key={li}
                    x={panel.x + 12}
                    y={panel.y + 51 + li * 13}
                    fontSize="9"
                    fill="#94a3b8"
                    fontFamily="'Inter', sans-serif"
                  >{line}</text>
                ))}
              </g>
            );
          })}

          {/* Donut slices */}
          {steps.map((s, i) => {
            const startDeg = i * (SLICE + GAP);
            const endDeg = startDeg + SLICE;
            return (
              <path
                key={s.id}
                d={slicePath(startDeg, endDeg)}
                fill={s.color}
                opacity="0.9"
              />
            );
          })}

          {/* Inner fill */}
          <circle cx={CX} cy={CY} r={IR} fill="#1e293b" />
          <circle cx={CX} cy={CY} r={IR} fill="none" stroke="#334155" strokeWidth="1" />

          {/* Center text */}
          <text x={CX} y={CY - 3} textAnchor="middle"
            fontSize="13" fontWeight="600" fill="#3edfdf"
            fontFamily="'Inter', sans-serif" letterSpacing="0.1em">
            BABY
          </text>
          <text x={CX} y={CY + 15} textAnchor="middle"
            fontSize="10" fill="#cbd5e1"
            fontFamily="'Inter', sans-serif">
            Agent
          </text>
          {/* <text x={CX} y={CY + 22} textAnchor="middle"
            fontSize="9" fill="#64748b"
            fontFamily="'Inter', sans-serif">
            6 steps
          </text> */}
        </svg>
      </div>
    </section>
  );
}