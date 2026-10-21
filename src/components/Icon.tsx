import type { CSSProperties } from "react";

/** Material Symbols Outlined — the icon set the Figma file is drawn with. */
export function Icon({
  name,
  size = 20,
  fill = false,
  color,
  className,
}: {
  name: string;
  size?: number;
  fill?: boolean;
  color?: string;
  className?: string;
}) {
  const style: CSSProperties = { fontSize: size, color };
  if (fill) style.fontVariationSettings = "'FILL' 1";
  return (
    <span className={className ? `ms ${className}` : "ms"} style={style} aria-hidden>
      {name}
    </span>
  );
}
