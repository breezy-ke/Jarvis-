import manifest from "./galleryManifest.json";

/*
  The photograph library.

  45 documentary photographs of the candidate in the wards. This is the
  campaign's least copyable asset — evidence of presence — and the argument the
  gallery makes is volume, so the list is used whole rather than curated down.

  The manifest carries the real pixel dimensions of each source, which is what
  lets the browser reserve the right box before the file arrives so nothing on
  the page moves. It was generated once by the photo pipeline that came with
  the old WordPress theme; that tooling was deleted with the theme and is in
  git history. Adding photographs means either restoring it or writing the
  dimensions in by hand — there are 45 entries, so by hand is not unreasonable.

  Sizing and format conversion are `next/image`'s job here. The grading that
  pipeline used to bake into the files is applied in CSS instead (`.wall img`),
  which also reaches photographs uploaded later.
*/

export type Photograph = {
  /** Public path, e.g. /campaign/gallery/g01.jpg */
  src: string;
  width: number;
  height: number;
  alt: string;
};

const raw = manifest as { file: string; w: number; h: number; src: string }[];

export const PHOTOGRAPHS: Photograph[] = raw.map((p, i) => ({
  src: `/campaign/gallery/${p.file}`,
  width: p.w,
  height: p.h,
  /*
    A generic alt, honestly generic. The photographs are not captioned by ward
    in the source data, and inventing a place name for each one would put a
    factual claim in an accessibility attribute where nobody would ever check
    it. The number lets a screen reader user refer to a specific frame.
  */
  alt: `Hon. Ekusi Lore campaigning in Turkana County, photograph ${i + 1}`,
}));

/** The front page shows a slice: enough to read as volume, few enough to stay
    inside the byte budget once lazy loading has done its work. */
export function photographs(limit = 0): Photograph[] {
  return limit > 0 ? PHOTOGRAPHS.slice(0, limit) : PHOTOGRAPHS;
}
