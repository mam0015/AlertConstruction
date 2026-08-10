/* eslint-disable @next/next/no-img-element */

export type BrandKind = "construction" | "engineers" | "tradie";
type LogoTone = "auto" | "dark";

const brandLogoDetails: Record<BrandKind, { name: string; division: string; mark: string }> = {
  construction: {
    name: "Alert Construction",
    division: "CONSTRUCTION",
    mark: "/images/logo-alert-construction-mark.png",
  },
  engineers: {
    name: "Alert Engineers",
    division: "ENGINEERS",
    mark: "/images/logo-alert-engineers-mark.png",
  },
  tradie: {
    name: "Alert Tradie Pro",
    division: "TRADIE PRO",
    mark: "/images/logo-alert-tradie-pro-mark-v53.png",
  },
};

export default function BrandLogo({
  kind,
  tone = "auto",
  className = "",
}: {
  kind: BrandKind;
  tone?: LogoTone;
  className?: string;
}) {
  const brand = brandLogoDetails[kind];

  return (
    <span
      className={`brand-lockup brand-lockup-${kind} brand-lockup-${tone} ${className}`.trim()}
      role="img"
      aria-label={kind === "tradie" ? `${brand.name}, powered by Alert Construction` : brand.name}
    >
      <span className="brand-lockup-mark" aria-hidden="true">
        <img src={brand.mark} alt="" />
      </span>
      <span className="brand-lockup-copy" aria-hidden="true">
        <span className="brand-lockup-alert">ALERT</span>
        <span className="brand-lockup-division">{brand.division}</span>
      </span>
    </span>
  );
}
