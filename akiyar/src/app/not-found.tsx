import Link from "next/link";
import { EkusiMark } from "@/components/EkusiMark";
import { Rule } from "@/components/ui";

export default function NotFound() {
  return (
    <>
      <Rule />
      <main className="mx-auto flex w-full max-w-2xl flex-1 flex-col items-center justify-center gap-6 px-5 py-20 text-center">
        <EkusiMark size={56} />
        <div>
          <h1 className="display text-4xl">This page has wandered off</h1>
          <p className="mx-auto mt-3 max-w-[46ch] text-[15px] leading-relaxed text-muted">
            The link you followed does not lead anywhere. No harm done. Let us get you back to where
            the work is happening.
          </p>
        </div>
        <Link
          href="/"
          className="rounded-[var(--radius-md)] bg-signal px-6 py-3.5 text-base font-bold text-screen transition-[filter] hover:brightness-105"
        >
          Take me to the register
        </Link>
      </main>
    </>
  );
}
