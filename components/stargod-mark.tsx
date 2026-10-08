export function StarGodMark({ size = 24, className = "" }: { size?: number; className?: string }) {
  return <img className={`stargod-mark ${className}`} src="/assets/brand/stargod.svg" width={size} height={size} alt="" aria-hidden="true" />;
}
