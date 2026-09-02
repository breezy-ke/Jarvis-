import type { ReactNode, ButtonHTMLAttributes, InputHTMLAttributes, SelectHTMLAttributes } from "react";

/* Shared primitives.
   Colour comes from semantic tokens, never a raw hex, so the whole surface can
   be re-grounded from globals.css without any component knowing about it. */

/*
  The lit rule.

  Replaces the printed beadwork band that used to head every surface. Same job —
  it marks the top edge of a card as the campaign's — but it reads as a light
  source running along the edge rather than as decoration, which is the whole
  difference between this design and the last one. Purely decorative, so it is
  hidden from assistive technology.
*/
export function Rule({ className = "" }: { className?: string }) {
  return <div aria-hidden="true" className={`rule-lit h-px w-full ${className}`} />;
}

export function Button({
  variant = "primary",
  className = "",
  ...props
}: ButtonHTMLAttributes<HTMLButtonElement> & {
  variant?: "primary" | "quiet" | "ghost";
}) {
  /*
    The disabled state does not dim the button.

    Fading a filled control to 40% composites the label toward its own
    background: the lit primary became a muddy olive with unreadable text, which
    reads as a broken button rather than as one that is not ready yet. Instead
    the light is taken away entirely and the control drops to an inert surface
    with muted-but-legible text, so a supporter can still read what the button
    will say when they have filled the field in.
  */
  const base =
    "w-full rounded-[var(--radius-md)] px-5 py-4 text-base font-bold transition-[box-shadow,background-color,border-color,transform] duration-200 active:translate-y-px disabled:cursor-not-allowed disabled:border-line disabled:bg-ink-600 disabled:text-faint disabled:shadow-none";

  const variants = {
    /* The only lit thing on the page. Black on signal yellow measures 12.88:1 —
       the most legible pair in the system — and the bloom means a supporter
       finds the button before they have read a word of the label. */
    primary: "bloom bg-signal text-screen hover:bg-signal-bright",
    /* A real second action: present, obviously pressable, not competing with
       the primary for the one bit of light on the screen. */
    quiet: "border border-line bg-ink-600 text-body hover:border-accent",
    ghost: "border border-line bg-transparent font-semibold text-muted hover:border-accent hover:text-body",
  } as const;

  return <button className={`${base} ${variants[variant]} ${className}`} {...props} />;
}

export function Field({
  label,
  hint,
  error,
  htmlFor,
  children,
}: {
  label: string;
  hint?: string;
  error?: string;
  htmlFor: string;
  children: ReactNode;
}) {
  return (
    <div className="flex flex-col gap-2">
      <label
        htmlFor={htmlFor}
        className="text-[11px] font-bold uppercase tracking-[0.1em] text-muted"
      >
        {label}
      </label>
      {children}
      {error ? (
        <span role="alert" className="text-[13px] font-semibold text-alarm">
          {error}
        </span>
      ) : hint ? (
        <span className="text-[12.5px] text-faint">{hint}</span>
      ) : null}
    </div>
  );
}

/*
  The field border is --field-line, an opaque grey, and not the hairline used
  everywhere else. WCAG 1.4.11 wants 3:1 for the visual boundary of a control,
  and a control sitting on a dark card has two neighbours that both count: the
  card outside it and its own darker fill inside. This value clears both
  (3.49:1 and 3.16:1) and `npm run check:contrast` fails if that stops being
  true. An input a supporter cannot find is the most expensive failure here, so
  the boundary is not left to a decorative hairline.

  min-height 52px is above the 44px touch minimum, with room for a thumb in
  direct sun.
*/
const controlClass =
  "min-h-[52px] w-full rounded-[var(--radius-md)] border border-field-line bg-surface-2 px-4 py-3.5 text-base text-body transition-colors placeholder:text-faint focus:border-accent disabled:opacity-50";

export function TextInput(props: InputHTMLAttributes<HTMLInputElement>) {
  return <input {...props} className={`${controlClass} ${props.className ?? ""}`} />;
}

export function Select(props: SelectHTMLAttributes<HTMLSelectElement>) {
  return <select {...props} className={`${controlClass} ${props.className ?? ""}`} />;
}

/*
  Progress, as frames on a strip rather than dots.

  Square segments, no radius, matching the near-square corners the rest of the
  design uses. Done is green, here is lit yellow, ahead is an unlit hairline —
  three states told by brightness as well as hue, so it still reads for a
  colour-blind supporter. The count is announced in text next to it by the
  wizard, which is why this is hidden from assistive technology rather than
  duplicated into it.
*/
export function StepTrack({ total, current }: { total: number; current: number }) {
  return (
    <div className="flex gap-1" aria-hidden="true">
      {Array.from({ length: total }, (_, i) => (
        <i
          key={i}
          className={`h-1 flex-1 transition-colors duration-200 ${
            i < current
              ? "bg-verified"
              : i === current
                ? "bg-signal shadow-[0_0_12px_-2px_var(--signal)]"
                : "bg-line"
          }`}
        />
      ))}
    </div>
  );
}

export function Pill({
  tone,
  children,
}: {
  tone: "cold" | "watch" | "hold" | "strong";
  children: ReactNode;
}) {
  /* Alarm is always an outline, never a fill — fills are reserved for
     magnitude, so "how big" and "how worrying" never compete. */
  const tones = {
    cold: "text-alarm",
    watch: "text-warn",
    hold: "text-faint",
    strong: "text-verified",
  } as const;

  return (
    <span
      className={`inline-block whitespace-nowrap rounded-full border border-current px-2.5 py-0.5 text-[10.5px] font-bold uppercase tracking-[0.09em] ${tones[tone]}`}
    >
      {children}
    </span>
  );
}

export function ErrorNote({ children }: { children: ReactNode }) {
  return (
    <p
      role="alert"
      className="rounded-[var(--radius-md)] border border-alarm/40 bg-alarm/10 px-4 py-3 text-[13.5px] leading-relaxed text-alarm"
    >
      {children}
    </p>
  );
}
