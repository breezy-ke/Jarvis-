import Image from "next/image";

/* The knockout artwork is 768x702. The plated one is square, because an app
   icon has to be, and the plate is padded to square with its own green. */
const KNOCKOUT_RATIO = 702 / 768;

/**
 * The campaign's own mark: "EKUSI / SENATOR 2027", white lettering around a
 * sage diamond, drawn by the campaign's designer.
 *
 * TWO BUILDS, AND THE CHOICE IS NOT COSMETIC. The lettering is white. On the
 * old near-black page the knocked-out mark sat straight on the ground and
 * needed nothing behind it; on paper that same file is white-on-white and the
 * mark disappears entirely. So the default is now the plated build, which
 * carries the designer's own deep green behind the lettering and reads on any
 * ground.
 *
 * Use `variant="knockout"` only where the mark sits on something dark — over a
 * photograph, or on the hero's scrim. Getting this backwards fails silently:
 * nothing errors, the mark is simply not there.
 *
 * `alt` defaults to the campaign's name and should be set to "" wherever the
 * mark sits beside text that already says it. A lockup that announces itself
 * twice to a screen reader is worse than one that says it once.
 */
export function EkusiMark({
  size = 44,
  alt = "Ekusi Lore for Turkana Senate",
  variant = "plate",
  className = "",
}: {
  size?: number;
  alt?: string;
  variant?: "plate" | "knockout";
  className?: string;
}) {
  if (variant === "knockout") {
    return (
      <Image
        src="/brand/ekusi-mark-256.png"
        alt={alt}
        width={size}
        height={Math.round(size * KNOCKOUT_RATIO)}
        className={className}
        priority
        style={{ width: size, height: "auto" }}
      />
    );
  }

  return (
    <Image
      src="/brand/ekusi-plate-512.png"
      alt={alt}
      width={size}
      height={size}
      className={className}
      priority
      /* A small radius, because a hard-cornered green square at 36px reads as a
         missing image rather than as a mark. */
      style={{ width: size, height: size, borderRadius: 3 }}
    />
  );
}
