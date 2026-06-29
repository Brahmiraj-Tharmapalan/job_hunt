import Link from "next/link";
import Image from "next/image";

/** OpenJobHunt wordmark + monogram. Server component (no interactivity). */
export function Brand({ className = "" }: { className?: string }) {
  return (
    <Link
      href="/"
      className={`group inline-flex items-center gap-2.5 ${className}`}
      aria-label="OpenJobHunt home"
    >
      <Image
        src="/logo/favicon_512.png"
        alt=""
        width={36}
        height={36}
        priority
        className="h-9 w-9 transition-transform group-hover:scale-105"
      />
      <span className="text-base font-bold tracking-tight text-foreground">
        Open<span className="text-accent">JobHunt</span>
      </span>
    </Link>
  );
}
