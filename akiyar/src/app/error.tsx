"use client";

import { useEffect } from "react";
import { EkusiMark } from "@/components/EkusiMark";
import { Rule } from "@/components/ui";

/**
 * Route-level error boundary. Catches a render or data error in any page and
 * shows a calm, branded recovery screen instead of a white void.
 *
 * The message stays deliberately vague on the cause: a supporter does not need
 * a stack trace, and leaking one on a live campaign site is its own small
 * embarrassment. The real error goes to the server console for the team.
 */
export default function Error({
  error,
  reset,
}: {
  error: Error & { digest?: string };
  reset: () => void;
}) {
  useEffect(() => {
    console.error("[app error]", error);
  }, [error]);

  return (
    <>
      <Rule />
      <main className="mx-auto flex w-full max-w-2xl flex-1 flex-col items-center justify-center gap-6 px-5 py-20 text-center">
        <EkusiMark size={56} />
        <div>
          <h1 className="display text-4xl">Something went wrong on our end</h1>
          <p className="mx-auto mt-3 max-w-[48ch] text-[15px] leading-relaxed text-muted">
            This is on us, not on you. Nothing you typed was lost. Try once more, and if it keeps
            happening please tell the campaign office so we can fix it fast.
          </p>
        </div>
        <div className="flex flex-wrap items-center justify-center gap-3">
          <button
            onClick={reset}
            className="rounded-[var(--radius-md)] bg-signal px-6 py-3.5 text-base font-bold text-screen transition-[filter] hover:brightness-105"
          >
            Try again
          </button>
          {/* A full-page load, not a client transition. After an error the
              client state is already suspect, so a hard reload of "/" is the
              more reliable escape than next/link's soft navigation. */}
          {/* eslint-disable-next-line @next/next/no-html-link-for-pages */}
          <a
            href="/"
            className="rounded-[var(--radius-md)] border border-line px-6 py-3 text-base font-semibold text-muted hover:border-accent"
          >
            Back to the start
          </a>
        </div>
        {error.digest && (
          <p className="font-mono text-[11px] text-faint">Reference: {error.digest}</p>
        )}
      </main>
    </>
  );
}
