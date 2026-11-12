import { cn } from "@/lib/utils";

type Variant = "dashboard" | "team" | "list" | "document" | "chat";

const NAVY = "#0b1642";
const NAVY_LIGHT = "#1c2b6b";
const ORANGE = "#f5a623";
const MUTED = "#e6e9f2";

/** Simple animated "app window" illustration. Variant changes the content inside. */
export function Illustration({
  variant = "dashboard",
  className,
  label,
}: {
  variant?: Variant;
  className?: string;
  label?: string;
}) {
  return (
    <svg
      viewBox="0 0 720 540"
      role="img"
      aria-label={label ?? "Illustration of a web application interface"}
      className={cn("block bg-white", className)}
    >
      <rect width="720" height="540" fill="#f7f8fc" />
      <rect x="56" y="48" width="608" height="444" rx="20" fill="#fff" stroke={MUTED} />
      <rect x="56" y="48" width="608" height="44" rx="20" fill={MUTED} opacity=".55" />
      <circle cx="84" cy="70" r="6" fill="#d4d9e8" />
      <circle cx="104" cy="70" r="6" fill="#d4d9e8" />
      <circle cx="124" cy="70" r="6" fill="#d4d9e8" />
      <rect x="80" y="116" width="120" height="14" rx="4" fill={NAVY} />
      <rect x="560" y="112" width="80" height="22" rx="11" fill={ORANGE} />

      {variant === "dashboard" && (
        <>
          {[0, 1, 2].map((i) => (
            <g key={i} className="dash-card" style={{ animationDelay: `${i * 100}ms` }}>
              <rect x={80 + i * 192} y="150" width="176" height="84" rx="12" fill="#f1f3f8" />
              <rect x={96 + i * 192} y="168" width="60" height="8" rx="4" fill="#c9cfe0" />
              <rect x={96 + i * 192} y="192" width="88" height="20" rx="5" fill={i === 1 ? ORANGE : NAVY} />
            </g>
          ))}
          {[70, 110, 90, 140, 120, 170, 150, 190].map((h, i) => (
            <rect
              key={i}
              className="dash-bar"
              style={{ animationDelay: `${300 + i * 70}ms` }}
              x={96 + i * 62}
              y={452 - h}
              width="34"
              height={h}
              rx="6"
              fill={i % 3 === 1 ? ORANGE : NAVY_LIGHT}
            />
          ))}
        </>
      )}

      {variant === "team" &&
        [0, 1, 2, 3, 4, 5].map((i) => {
          const x = 80 + (i % 3) * 192;
          const y = 160 + Math.floor(i / 3) * 160;
          return (
            <g key={i} className="dash-card" style={{ animationDelay: `${i * 90}ms` }}>
              <rect x={x} y={y} width="176" height="140" rx="14" fill="#f1f3f8" />
              <circle cx={x + 88} cy={y + 50} r="26" fill={i === 1 ? ORANGE : i % 2 ? NAVY : NAVY_LIGHT} />
              <rect x={x + 44} y={y + 92} width="88" height="9" rx="4" fill="#c9cfe0" />
              <rect x={x + 62} y={y + 110} width="52" height="7" rx="3" fill="#dde1ee" />
            </g>
          );
        })}

      {variant === "list" &&
        [0, 1, 2, 3, 4].map((i) => (
          <g key={i} className="dash-card" style={{ animationDelay: `${i * 90}ms` }}>
            <rect x="80" y={150 + i * 66} width="560" height="52" rx="12" fill="#f1f3f8" />
            <rect x="98" y={166 + i * 66} width="20" height="20" rx="6" fill={i === 0 ? ORANGE : NAVY_LIGHT} />
            <rect x="134" y={169 + i * 66} width={220 - i * 18} height="9" rx="4" fill="#c9cfe0" />
            <rect x="134" y={185 + i * 66} width={140 - i * 10} height="7" rx="3" fill="#dde1ee" />
          </g>
        ))}

      {variant === "document" &&
        [0, 1, 2, 3, 4, 5, 6].map((i) => (
          <rect
            key={i}
            className="dash-card"
            style={{ animationDelay: `${i * 80}ms` }}
            x="104"
            y={158 + i * 44}
            width={i % 3 === 2 ? 300 : 512}
            height="10"
            rx="5"
            fill={i === 0 ? NAVY : "#d4d9e8"}
          />
        ))}

      {variant === "chat" && (
        <>
          {[0, 1, 2, 3].map((i) => (
            <rect
              key={i}
              className="dash-card"
              style={{ animationDelay: `${i * 120}ms` }}
              x={i % 2 ? 330 : 96}
              y={150 + i * 66}
              width="294"
              height="48"
              rx="14"
              fill={i % 2 ? NAVY : "#f1f3f8"}
            />
          ))}
        </>
      )}
    </svg>
  );
}
