/**
 * Shown wherever the app needs a database it has not been given.
 *
 * The alternative — a 500, or a dashboard of confident zeroes — is worse. A
 * campaign staffer seeing "0 verified supporters" on a misconfigured deploy
 * would have no way to tell that apart from genuinely having no supporters.
 */
export function SetupNotice({
  title = "Database not connected",
  detail,
  missing,
}: {
  title?: string;
  detail?: string;
  /** Names of absent environment variables, listed so the fix is unambiguous. */
  missing?: string[];
}) {
  return (
    <div className="rounded-[var(--radius-lg)] border border-warn/50 bg-warn/5 p-6">
      <h2 className="display text-xl">{title}</h2>
      <p className="mt-3 text-[13.5px] leading-relaxed text-muted">
        {detail ??
          "No Supabase connection is configured, so there is nothing to read or write."}
      </p>

      {missing && missing.length > 0 && (
        <p className="mt-3 text-[13.5px] leading-relaxed text-muted">
          Not set:{" "}
          {missing.map((name, i) => (
            <span key={name}>
              {i > 0 && ", "}
              <code className="font-mono text-[12.5px] text-body">{name}</code>
            </span>
          ))}
          .
        </p>
      )}
      <ol className="mt-4 flex list-decimal flex-col gap-2 pl-5 text-[13.5px] leading-relaxed text-muted">
        <li>
          Copy <code className="font-mono text-[12.5px]">.env.example</code> to{" "}
          <code className="font-mono text-[12.5px]">.env.local</code> and fill in your project URL
          and keys.
        </li>
        <li>
          Run the migrations in{" "}
          <code className="font-mono text-[12.5px]">supabase/migrations/</code> in order.
        </li>
        <li>
          Load <code className="font-mono text-[12.5px]">supabase/seed/</code> — the real IEBC
          Turkana geography, wards carrying their published registered-voter counts.
        </li>
      </ol>
      <p className="mt-4 text-[13.5px] leading-relaxed text-muted">
        Full steps are in <code className="font-mono text-[12.5px]">README.md</code>.
      </p>
    </div>
  );
}
