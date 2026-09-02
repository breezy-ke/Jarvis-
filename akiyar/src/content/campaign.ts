/*
  The campaign site's fixed copy.

  Everything here used to live inside WordPress block patterns. It is text that
  changes rarely and needs a developer's eye when it does — the constitutional
  bounds on each promise, the IEBC denominators, the honest note under the
  register button. The /news and /events pages were removed from the public site, so the
  posts and events tables in Supabase now have no public reader. The staff
  newsroom at /admin/content still writes to them.

  Everything below is fixed copy: it carries legal or factual weight and wants
  a developer's eye when it changes.
*/

/** The supporter register now lives inside this same application. */
export const REGISTER_PATH = "/join";

export const NAV = [
  { href: "/about", label: "The candidate" },
  { href: "/manifesto", label: "The mandate" },
  { href: "/gallery", label: "Gallery" },
  { href: "/get-involved", label: "Get involved" },
  { href: "/contact", label: "Contact" },
] as const;

/*
  The ticker: wards the candidate has actually visited.

  STAFF NOTE: this is the one piece of front-page copy still in code. It is a
  factual claim about where the campaign has been, so it is deliberately not
  editable from the dashboard — a ward added here by mistake is a lie on the
  home page.
*/
export const VISITED = [
  "Turkana Central",
  "Lodwar Township",
  "Kalokol",
  "Turkana North",
  "Lokitaung",
  "Kaeris",
  "Turkana South",
  "Katilu",
  "Lokichar",
  "Turkana East",
  "Kapedo",
  "Turkana West",
  "Kakuma",
  "Loima",
  "Lokiriama",
] as const;

/*
  The county's own numbers, from the IEBC 2022 register.

  These are the denominators the supporter register measures itself against,
  which is why they are on the front page and not treated as decoration. They
  match `supabase/seed/0001_geography_turkana.sql` — if the seed changes, these
  change with it. Provenance: docs/iebc-turkana/README.md.
*/
export const COUNTY_FIGURES = [
  {
    value: "238,528",
    label: "Registered voters",
    note: "Turkana County, IEBC register, 2022.",
  },
  {
    value: "30",
    label: "Wards",
    note: "Across six constituencies.",
  },
  {
    value: "559",
    label: "Polling stations",
    note: "Every one of them named in the register.",
  },
] as const;

/*
  The pledge — the candidate in the first person.

  Everything else on this site is written ABOUT him. This block is the one place
  he speaks, which is why it sits at the top of the front page and why the voice
  changes: "I will", not "the campaign will". A visitor should be able to tell,
  within one sentence, that a person is asking rather than an organisation.

  It ends on a limit rather than a flourish on purpose. The whole argument of
  this site is that a candidate who is precise about what the office cannot do
  is more trustworthy on what it can — so the pledge closes the way the ledger
  below it does.
*/
export const PLEDGE = {
  lines: [
    "I am asking you for one seat in the Senate, and I want to be clear about what I intend to do with it. Four commitments — education, employment, development, and oversight that includes everybody. Not forty. Four, written plainly, so that you can hold me to them.",
    "I trained in law, and that training taught me one thing above all others: a promise is only worth the instrument behind it. So beneath each commitment I have set out its limit — the point where this office stops. Those limits are not excuses. They are how you will know whether I am telling you the truth, and they are the reason you should believe the rest.",
    "This county is not poor. It is owed. What we have lacked has never been worth or capability or ambition — it is somebody in the room, with the papers open, asking where the money went and staying until there is an answer.",
    "I intend to be that person. Add your name to the register, and hold me to this.",
  ],
  signature: "Ekusi Lore",
  role: "Candidate for Senator, Turkana County",
} as const;

export type Promise_ = {
  claim: string;
  detail: string;
  boundLabel: string;
  bound: string;
};

/*
  The mandate, short form, for the front page.

  Four commitments, each written to fit inside Article 96. The `bound` field is
  not a disclaimer bolted on afterwards — it is the argument. Anyone can promise
  a road. Saying precisely which lever a senator actually holds, and admitting
  where it stops, is the thing a voter can hold this campaign to afterwards.

  There used to be a MANIFESTO_SIGNED_OFF switch here that wrapped all of this
  in a "needs sign-off" marker on the live site. The wording is approved; the
  switch and the marker are gone.
*/
/*
  THE FOUR HEADINGS ARE THE CAMPAIGN'S OWN WORDS AND ARE NOT TO BE REWRITTEN.

  "Promote Education: Bursaries, Scholarships", "Promote Employment
  Opportunities", "Promote Development Infrastructure", "Promote Inclusive
  Oversight". They were supplied by the campaign exactly as they read here. An
  earlier version replaced them with sharper-sounding lines of its own; that was
  wrong. The job of this file is to expand on them, not to improve them.

  The prose under each one is written to stay general on purpose. It speaks to
  the principle rather than inventing places, figures or incidents to illustrate
  it — specifics are the campaign's to supply, and anything invented here would
  be a factual claim nobody has checked.
*/
export const PROMISES_BRIEF: Promise_[] = [
  {
    claim: "Promote Education: Bursaries, Scholarships",
    detail:
      "Every child born in this county carries the same promise as a child born anywhere else. What differs is whether anyone pays for that promise to be kept. Bursaries and scholarships are how a county decides that ability decides a future, and not income. I will press for that provision to be funded properly, awarded fairly, and accounted for in the open — so that no family loses a place in a classroom to the price of it.",
    boundLabel: "What I cannot do",
    bound:
      "I cannot set a curriculum or post a teacher. What I hold is the county's share of national revenue and the standing to demand a public account of how it was spent.",
  },
  {
    claim: "Promote Employment Opportunities",
    detail:
      "Work is dignity before it is income. The people of this county should stand first in line for the opportunities created here, and our young people should not have to leave home in order to begin a life. I will press for local participation to be a written condition of the work done in Turkana, and for the training that lets our own take it up rather than watch it pass.",
    boundLabel: "What I cannot do",
    bound:
      "I cannot hire. This is oversight of the money and of the conditions attached to it; the hiring itself belongs to the county government and to private employers.",
  },
  {
    claim: "Promote Development Infrastructure",
    detail:
      "Roads, water, power and connection are not luxuries. They are the floor a county stands on, and every ambition we hold rests on them. Development is worth what is still standing years after the ceremony, so I will press for infrastructure that is planned honestly, funded fully, and maintained long after the attention has moved elsewhere.",
    boundLabel: "What I cannot do",
    bound:
      "The Senate does not build. It decides how revenue is divided between counties and scrutinises what is done with our share once it arrives.",
  },
  {
    claim: "Promote Inclusive Oversight",
    detail:
      "Public money belongs to the public, and its use should be answerable to them. Inclusive means every ward heard rather than the loudest few, and women, youth and persons with disability inside the decision rather than informed of it afterwards. I will use this seat to ask openly, to publish plainly, and to make accountability something the people of this county can actually see.",
    boundLabel: "What I cannot do",
    bound:
      "The Senate scrutinises and summons; it does not prosecute. What it produces is a public finding and a referral to the offices that do.",
  },
];

/*
  The long form, for /manifesto. The same four headings — again, exactly as the
  campaign wrote them — with more room to argue underneath.

  A fifth follows them, on reporting back. It is an addition rather than one of
  the four, and it is kept because it is the commitment that makes the other
  four checkable: without an account at the end of the year, the rest are
  sentences. If the campaign wants only its own four, this is the one to remove.
*/
export const PROMISES_FULL: Promise_[] = [
  {
    claim: "Promote Education: Bursaries, Scholarships",
    detail:
      "Every child born in this county carries the same promise as a child born anywhere else. What differs is whether anyone pays for that promise to be kept. A bursary is not charity — it is a county deciding, deliberately, that ability will decide a future and income will not. Scholarships are the same decision carried further, for the students who can take this county into rooms it has never been represented in. So the work is threefold: to argue for the funds in the first place, to see them awarded on need and merit rather than acquaintance, and to publish who received what. A fund nobody can audit helps fewer children than a smaller one that everybody can see.",
    boundLabel: "What I cannot do",
    bound:
      "I cannot set a curriculum, post a teacher or mark an examination — those are national functions and will remain so whoever holds this seat. What I hold is the county's share of national revenue and the standing to demand, in public, a full account of how it was spent.",
  },
  {
    claim: "Promote Employment Opportunities",
    detail:
      "Work is dignity before it is income. It is the difference between a young person who can plan and one who can only wait. The people of this county should stand first in line for the opportunities created here, and no family should accept that its children must leave home in order to begin a life. That means local participation written into the work done in Turkana as a condition rather than requested as a courtesy, and it means the training that allows our own to take those opportunities up instead of watching them pass to somebody better prepared. Opportunity that arrives without preparation is not opportunity; it is a spectacle.",
    boundLabel: "What I cannot do",
    bound:
      "I cannot create or award a single job, and any candidate who suggests otherwise is asking you to believe something the Constitution does not permit. Hiring belongs to the county government and to private employers. What belongs to me is scrutiny of the money and of the conditions attached to it.",
  },
  {
    claim: "Promote Development Infrastructure",
    detail:
      "Roads, water, power and connection are not luxuries and they are not favours. They are the floor a county stands on, and every other ambition we hold — a business, a clinic that can refrigerate, a child who reaches school before the day is over — rests on them. Development is worth what is still standing years after the ceremony, which is why the unglamorous half of this work matters more than the announcement: what was planned honestly, what was funded fully, what was completed, and what is still working today. I would rather defend a shorter list of projects that endure than read out a longer one that does not.",
    boundLabel: "What I cannot do",
    bound:
      "The Senate does not build. It decides how nationally raised revenue is divided between counties and scrutinises what happens to our share once it arrives. I will not claim credit for laying what I did not lay.",
  },
  {
    claim: "Promote Inclusive Oversight",
    detail:
      "Public money belongs to the public, and its use should be answerable to them in language they can follow. Oversight is not hostility towards anyone doing their job honestly; it is the ordinary condition of holding public office, and those with nothing to hide lose nothing to it. Inclusive means the table is not only the people already sitting at it — every ward heard rather than the loudest few, and women, youth and persons with disability inside the decision rather than informed of it once it has been taken. I will use this seat to ask openly, to publish plainly, and to make accountability something the people of this county can see rather than something they are assured is happening.",
    boundLabel: "What I cannot do",
    bound:
      "The Senate scrutinises and summons; it does not prosecute. What it produces is a public finding and a referral to the offices that do. I will not promise verdicts I have no power to deliver.",
  },
  {
    claim: "An account, every year",
    detail:
      "Each year: what I voted on, what I said in committee, what this county was allocated and what actually arrived. Published in plain language, whether or not it flatters me. This is not one of the four commitments above — it is the one that makes them checkable. Without an account at the end of the year, a mandate is a set of sentences, and this county has heard a great many sentences. Judge the four by this one.",
    boundLabel: "What I cannot do",
    bound:
      "Nothing stands in the way of this. It needs no other institution's cooperation and no new budget, only the willingness to be measured — which is exactly why it is worth asking every candidate whether they will commit to it.",
  },
];

/*
  Get involved, ordered by what the campaign needs rather than by what is
  easiest to ask for. Being counted is first because the register is the thing
  the whole platform exists to build.

  NOTE ON DONATIONS: no payment mechanism exists here and none should be added
  without checking the Election Campaign Financing Act obligations first. The
  third entry deliberately asks for time, not money.
*/
export const TAKE_PART: (Promise_ & { action?: { href: string; label: string; register?: boolean } })[] = [
  {
    claim: "Be counted on the register",
    detail:
      "Add your name, your ward and your phone number to the supporter register, and confirm it with the code you are sent. It takes about a minute. A confirmed supporter in a named ward is the single most useful thing this campaign can have, because it tells us where we actually stand rather than where we hope we do.",
    boundLabel: "What it costs you",
    bound:
      "One SMS code, and your details held by the campaign's register under Kenya's Data Protection Act. Nothing is published about you.",
    action: { href: REGISTER_PATH, label: "Join the movement", register: true },
  },
  {
    claim: "Bring your ward with you",
    detail:
      "The register gives every supporter a referral code. Share it with people who will actually turn out, and the campaign can see which wards are organising themselves. This is how a campaign with no budget for advertising finds out where its strength is.",
    boundLabel: "What it costs you",
    bound:
      "A conversation. Codes are read aloud and typed in, so they contain no characters that can be confused for one another.",
  },
  {
    claim: "Stand as a ground agent",
    detail:
      "On primary day the campaign needs people at named polling stations who know the process. If you can give a day, say so — the campaign will contact you about your own station rather than send you somewhere you have never been.",
    boundLabel: "What it costs you",
    bound:
      "A day, and training beforehand. The campaign is not asking the public for money on this page.",
    action: { href: "/contact", label: "Contact the campaign" },
  },
];

/*
  Contact details.

  There is deliberately no contact form. A form means personal messages sitting
  in a database this site does not otherwise need, and an address puts the
  message in the campaign's own hands instead.

  STAFF: the telephone number and the office address are the two things still to
  add here, and they are the two things that must not be guessed at — a wrong
  number on a campaign site rings in a stranger's pocket for two years. Replace
  the wording below once the line and the office are actually live, rather than
  publishing a number nobody answers.
*/
export const CONTACT = [
  {
    heading: "By email",
    body: "info@ekusilore.co.ke — read by the campaign team, and the fastest way to reach the office about a meeting, a ward visit or a question about the mandate.",
  },
  {
    heading: "By phone",
    body: "The campaign office line is published here the day it is answered by a person. Until then email reaches the same team, and reaches them faster than a number nobody picks up.",
  },
  {
    heading: "In person",
    body: "The campaign is in the wards most weeks rather than behind a desk. If you want to meet, write first and the team will tell you where he will be — that answer is more useful than an address.",
  },
];
