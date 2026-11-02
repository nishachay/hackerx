import type { CSSProperties } from "react";
import { initials } from "../lib/format";

type AvatarProps = {
  name: string;
  size?: number;
  className?: string;
};

/**
 * Initials-only avatar. We never load profile images from X (twimg or any
 * other X host); the letter mark is derived from the handle.
 */
export function Avatar({ name, size = 40, className = "" }: AvatarProps) {
  const style = { "--avatar-size": `${size}px` } as CSSProperties;
  return (
    <span className={`avatar${className ? ` ${className}` : ""}`} style={style} aria-hidden="true">
      <span className="avatar-initials">{initials(name || "HN")}</span>
    </span>
  );
}
