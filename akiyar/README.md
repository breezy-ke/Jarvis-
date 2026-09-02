# Akiyar

Supporter register and mobilisation platform for **Hon. Ekusi Lore**, Turkana County senate campaign.

---

## What this is

A campaign platform for Hon. Ekusi Lore built around one question: **how many supporters does he actually have, and where exactly do they vote?**

Supporters register their name, ward, chief's area and polling station, then confirm by SMS. Nothing counts until that phone answers back. While they register they are also asked what they want him to fight for, how far they will go with the campaign, and how they found it, so the register doubles as a live reading of his own base.

It is **not** a survey of the county and it is not a forecast. Everyone here chose to sign up. The totals describe this campaign's supporters and nothing more, and every public surface says so.

## The one number that matters

Because each **ward** carries its real registered-voter count from the IEBC register, every figure becomes a ratio rather than a headcount:

```
Kakuma ward       604 / 12,153 =  5.0%   needs work
Lokichar ward      89 /  9,881 =  0.9%   cold zone
```

A raw total of 30,000 supporters tells the campaign nothing. A map of the coldest wards tells it where to send the caravan on Tuesday. (Per-station voter counts are not public, so saturation is ward-level; see `docs/iebc-turkana/README.md`.)

**This depends entirely on importing the real register.** See [Reference data](#3-reference-data).

---

## Setup

### 1. Supabase project

Create a project at [supabase.com](https://supabase.com), then:

```bash
cp .env.example .env.local
```

Fill in the URL, anon key and service-role key from **Project settings → API**. Generate the OTP pepper:

```bash
node -e "console.log(require('crypto').randomBytes(32).toString('hex'))"
```

### 2. Migrations

Starting from no Supabase account at all, follow **[docs/supabase-setup.md](docs/supabase-setup.md)** — it covers signup, project creation, keys, the first admin and the checks, and is the shortest path.

`npm run db:bundle` concatenates everything below into two files, `supabase/bundle/schema.sql` and `seed.sql`, so the SQL editor takes two pastes instead of eleven. Neither is re-runnable — see the header each file carries.

Applied individually, run each file in `supabase/migrations/` **in order**, via the Supabase SQL editor or `psql`:

| File                              | What it creates                                            |
| --------------------------------- | ---------------------------------------------------------- |
| `0001_extensions_and_enums.sql`   | `pgcrypto`, `pg_trgm`, shared enum types                    |
| `0002_geography.sql`              | Both reference hierarchies                                  |
| `0003_supporters_and_staff.sql`   | The register, staff roles, ward/station consistency trigger |
| `0004_verification_and_audit.sql` | OTP challenges, integrity queue, append-only audit log      |
| `0005_analytics_views.sql`        | Saturation and momentum views (verified-only)               |
| `0006_rls_policies.sql`           | Row level security                                          |
| `0007_integrity_functions.sql`    | Duplicate detection, anomaly detection, referral resolution |
| `0008_supporter_insights.sql`     | Issue, pledge and source columns plus insight views          |
| `0009_ward_saturation.sql`        | Real ward registered-voter denominators; ward-level saturation |
| `0010_site_content.sql`          | Staff-published posts and events behind RLS                 |

### 3. Reference data

```sql
\i supabase/seed/0001_geography_turkana.sql
```

This loads the **real** Turkana geography: 6 constituencies and 30 wards with their true IEBC codes and registered voters (summing to the official 238,528), plus all 559 real polling stations. Provenance is documented in `docs/iebc-turkana/README.md`.

Saturation is computed at **ward level**, on the real ward denominators. Per-station registered-voter counts are not published as structured data; if you ever obtain them from the full IEBC Register of Voters, add them to `polling_stations.registered_voters` and extend the views. There is no provisional or sample seed any more — the geography is real.

### 4. First admin

Create a user in **Authentication → Users**, then grant a role:

```sql
insert into staff (id, full_name, role)
values ('<auth-user-uuid>', 'Your Name', 'admin');
```

A Supabase account without a `staff` row can sign in and see nothing — that is intentional.

### 5. Run

```bash
npm run dev
```

`/` is the campaign site, `/join` is the public register, `/admin` is the Command Center.

Without SMS credentials the app prints verification codes to the server console and shows them in the UI, so the flow is testable end to end. In production it refuses to fake delivery.

Every page degrades to a setup notice rather than a 500 when no database is configured — a dashboard of confident zeroes would be indistinguishable from genuinely having no supporters.

## Verifying

```bash
npm run check          # integrity logic — phone normalisation, referral codes, CSV escaping
npm run check:contrast # WCAG ratios for every colour pair the design depends on
npm run db:verify      # every migration + the seed, against real Postgres
npm run db:verify:rls  # proves RLS actually denies, not just that it compiles
npm run typecheck
npm run lint
npm run build
```

`db:verify` and `db:verify:rls` need no database and no network. They run the real SQL against PGlite — Postgres compiled to WebAssembly — so the schema is provable on a machine with no Docker, no psql and no Supabase CLI. `db:verify:rls` reproduces Supabase's default grants first, so that a denial proves a policy refused rather than a permission being absent.

`npm run check` needs no database or network. It pins the two things that are easy to break and silent when broken:

- **Phone normalisation** — `0712345678`, `+254 712 345 678` and `254712345678` must all collapse to one stored string, or the unique-phone constraint stops meaning "one person".
- **CSV escaping** — a supporter named `=cmd|'/c calc'!A1` must not execute when a coordinator opens the export in Excel.

---

## Backups

This repository has **no git remote**. Every commit exists only on disks you
physically own, so backing it up is not housekeeping — it is the only copy.

```bash
npm run backup     # pushes every branch and tag to the `backup` remote
```

That remote is machine-local — it lives in `.git/config`, which is not itself
committed — so each machine sets it up once:

```bash
git clone --mirror . F:/backups/senator-polls.git
git remote add backup F:/backups/senator-polls.git
```

On the campaign's current machine `F:` is a **separate physical disk** from the
working copy, which is the whole point of choosing it: `C:` is a spinning HDD
and is the likeliest single component here to fail.

It is still the same computer. This survives a dead drive; it does not survive
theft, fire, or a wiped machine. A genuine off-site copy needs either a hosted
remote to push to, or a removable drive kept somewhere else — and if you add a
hosted one, make the repository **private**: this is a political campaign, and
the supporter register's schema and access rules are in here.

Verify a backup rather than trusting it:

```bash
git --git-dir=F:/backups/senator-polls.git fsck
git --git-dir=F:/backups/senator-polls.git log --oneline -3
```

---

## Architecture notes

### Two hierarchies, deliberately

The form asks for a ward *and* a sub-location because Kenya runs two parallel geographies:

```
ELECTORAL       county → constituency → ward → polling station
                the only chain along which votes are tallied

ADMINISTRATIVE  county → sub-county → location → sub-location
                the chain chiefs work in, and how you convene a baraza
```

They cross-cut rather than nest — one ward spans several sub-locations and vice versa — so `ward_sub_locations` carries a many-to-many instead of pretending it is a tree. Collecting only one of the two makes half the campaign's questions unanswerable.

### Supporter insight, captured at sign up

Migration 0008 adds four optional columns to the supporter record: top issue, second issue, pledge and how they heard about the campaign. They are asked as one step inside registration rather than as a separate survey, and that placement is the whole point.

An anonymous survey tells you *38 per cent of respondents care about water*. This tells you *in Kalokol, water is the top issue, and here are the 46 verified people who said so and offered to help*. One is a statistic. The other is a ground plan.

Every answer is optional. Somebody who only wants to be counted is never blocked from being counted, and the register is worth more with their name in it than without it.

The `ground_team_pool` view is the payoff: everyone who offered to do more than vote, grouped by ward. That is the recruiting list.

### Verified-only by construction

`verified_supporters` is a view, and every analytics view is built on it. Unverified sign-ups appear in the dashboard as a separate pending figure and are never mixed into a headline number. Phone OTP is the gate.

### Integrity

- **One person, one number** — unique constraint on E.164 phone, with normalisation on the way in so `0712345678` and `+254712345678` cannot both exist.
- **Ward/station consistency** — a database trigger rejects any supporter whose polling station belongs to a different ward than the one submitted.
- **Denominator tripwire** — verified supporters exceeding a ward's registered voters raises a flag; it means the mapping is wrong or the registrations are not real.
- **Near-duplicate detection** — trigram name match scoped to a ward, raised for human review rather than auto-deleted.
- **Append-only audit log** — enforced by trigger, not convention.

### Brand and typography

The palette is one accent on a near-black ground. **ODM orange `#F47B20`** is
both the party's colour and the design's only accent: ODM is the orange party
and orange is what supporters wear at every rally in the photo library, so brand
identity and visual hierarchy are a single decision rather than two that have to
be reconciled.

| Token | Hex | Role |
| ----- | --- | ---- |
| `signal` | `#F47B20` | The single accent — headings, labels, the one lit button |
| `signal-deep` | `#C85F10` | Its pressed and folded state |
| `signal-bright` | `#FF9445` | Its hover state |
| `verified` | `#35C46F` | A confirmed supporter, and only that |
| `paper` | `#F4F2EE` | Body type — warm white, never pure `#FFF` |

**The rule that shapes the whole system: the ground is black so the orange can
carry text.** On white it measures **2.73:1**, which clears the 3:1 bar for large
type and nothing else — a light build has to ban the brand colour from type and
invent a darkened substitute for it. On this ground it measures **7.43:1** and
the workaround disappears.

| Combination | Ratio |
| ----------- | ----- |
| Orange on the page ground (headings *and* small labels) | **7.43:1** |
| Black on orange (the primary button) | **7.43:1** |
| Orange on a raised card | **6.75:1** |

`npm run check:contrast` reads the shipped token file and exits non-zero on any
pair that drops below its WCAG AA threshold, so editing a colour without editing
that script fails the check.

Type is **Fraunces** for headlines — a warm variable serif with real character. This campaign asks strangers to put their name down, which is an act of trust, and trust reads as dignified rather than loud; a condensed poster grotesque was tried first and read as shouting. **Figtree** carries everything a person must actually read: humanist rather than geometric, because geometric sans faces are cold by construction and its open shapes hold up on a cracked screen in sun. Both are self-hosted by `next/font` with `display: swap`, so there is no runtime font-CDN request and text never blocks on a font.

> When auditing contrast in the browser, disable CSS transitions first. `getComputedStyle` returns mid-transition values and will report both false positives and false negatives.

### Security posture

The browser is never trusted with the register. Anonymous clients can read reference geography (the form needs it) and nothing else. Writes go through server actions holding the service role; RLS is the second line of defence for the day a key is misconfigured.

---

## Data protection

Kenya's **Data Protection Act, 2019** applies in full, and political opinion is *sensitive personal data* under it. Before launch:

- [ ] **Register with the ODPC** as a Data Controller. Non-registration is itself an offence.
- [ ] Publish a privacy notice covering purpose, retention and the erasure route.
- [ ] Complete a **Data Protection Impact Assessment**.
- [ ] Confirm the retention and deletion schedule after the election is declared.
- [ ] Have an election lawyer confirm nothing here conflicts with the Elections Act or party nomination rules.

Built in already:

- Consent to join the register and consent to receive SMS are **separate purposes**, never bundled into one checkbox. The wording version and timestamp are stored per record.
- **Full national ID numbers are never stored** — last four digits only, and optional.
- Year of birth rather than full date of birth.
- IP and device values are hashed, never stored raw.
- Phone numbers are masked in exports unless the caller is an admin, and every export is audited.

**Data residency:** Supabase has no African region. The DPA permits cross-border transfer with consent and safeguards, but a rival can weaponise "your data sits in Europe." The schema is plain Postgres, so migrating to a Kenyan host is a `pg_dump` if that becomes a political problem.

---

## Not yet built

Deferred deliberately, in rough priority order:

- **USSD (`*XXX#`) and SMS registration** — the channels that reach feature phones, which is most of rural Turkana. Requires Africa's Talking plus CA shortcode approval; **start that paperwork first, it is the long pole.**
- **Offline agent PWA** — IndexedDB queue and background sync so coordinators can register at barazas with no signal.
- Referral leaderboards by ward, shareable supporter cards.
- Anonymous sentiment module (structurally severed from the register).
- Turnout-day check-in mode.
- Trilingual UI — English / Kiswahili / Ng'aturkana.

## SMS verification

Real OTP delivery runs on Africa's Talking. You can test the whole sign-up and verification flow **today** with the free sandbox simulator, then flip to live once your sender ID is approved — one environment variable switches between the two. Full walkthrough: [docs/africas-talking-setup.md](docs/africas-talking-setup.md).

## Reference

- `docs/akiyar-prototype.html` — the standalone clickable prototype this was built from.
- `docs/africas-talking-setup.md` — SMS gateway setup, sandbox testing and go-live.
