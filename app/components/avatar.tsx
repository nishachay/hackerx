"use client";

import { useState, type CSSProperties } from "react";
import { initials } from "../lib/format";

type AvatarProps = {
  name: string;
  src?: string;
  size?: number;
  className?: string;
};

export function Avatar({ name, src, size = 40, className = "" }: AvatarProps) {
  const [failed, setFailed] = useState(false);
  const style = { "--avatar-size": `${size}px` } as CSSProperties;
  return (
    <span className={`avatar${className ? ` ${className}` : ""}`} style={style} aria-hidden="true">
      {src && !failed ? (
        <img src={src} alt="" width={size} height={size} loading="lazy" decoding="async" referrerPolicy="no-referrer" onError={() => setFailed(true)} />
      ) : (
        <span className="avatar-initials">{initials(name || "HN")}</span>
      )}
    </span>
  );
}
