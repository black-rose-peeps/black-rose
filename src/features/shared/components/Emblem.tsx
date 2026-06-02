import emblem from "@/assets/black-rose-emblem.png";

export function Emblem({ className = "", spin = false }: { className?: string; spin?: boolean }) {
  return (
    <img
      src={emblem}
      alt="Black Rose emblem"
      width={1024}
      height={1024}
      className={`object-contain ${className} ${spin ? "animate-spin-slow" : ""}`}
      style={{ filter: "invert(1)" }}
    />
  );
}
