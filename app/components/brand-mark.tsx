export function BrandMark({ size = 32, className = "" }: { size?: number; className?: string }) {
  return (
    <img
      src="/h-mark.svg"
      alt=""
      width={size}
      height={size}
      className={`brand-mark${className ? ` ${className}` : ""}`}
      decoding="async"
    />
  );
}
