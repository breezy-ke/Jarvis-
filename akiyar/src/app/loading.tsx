import { Rule } from "@/components/ui";

/**
 * Shown while a server component streams. Kept to the party band and a quiet
 * line, because on a slow Turkana connection this is the screen a supporter
 * stares at, and a spinning wheel that says nothing only raises the temperature.
 */
export default function Loading() {
  return (
    <>
      <Rule />
      <main className="mx-auto flex w-full max-w-2xl flex-1 flex-col items-center justify-center gap-4 px-5 py-24 text-center">
        <div
          aria-hidden="true"
          className="h-9 w-9 animate-spin rounded-full border-[3px] border-line border-t-signal"
        />
        <p className="text-[14px] font-semibold text-muted">Loading&hellip;</p>
      </main>
    </>
  );
}
