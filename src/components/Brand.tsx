import Link from "next/link";

export function Mark() {
  // A small mosaic of four tiles, one in gold.
  return (
    <svg className="mark" viewBox="0 0 24 24" aria-hidden="true">
      <rect x="2" y="2" width="9" height="9" rx="2" fill="currentColor" />
      <rect x="13" y="2" width="9" height="9" rx="2" fill="currentColor" opacity="0.55" />
      <rect x="2" y="13" width="9" height="9" rx="2" fill="currentColor" opacity="0.55" />
      <rect x="13" y="13" width="9" height="9" rx="2" fill="#b08d4a" />
    </svg>
  );
}

export function Brand({ href = "/" }: { href?: string }) {
  return (
    <Link href={href} className="brand" aria-label="StayMosaic home">
      <Mark />
      StayMosaic
    </Link>
  );
}
