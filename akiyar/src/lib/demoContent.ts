import "server-only";
// Types only: `content.ts` imports this module at runtime, so a value import
// back the other way would close a cycle.
import type { EventEntry, Post } from "./content";

/*
  In-memory news and diary, for demo mode.

  Same reasoning as `demo.ts`: the campaign has to be able to click through a
  fully working site — including publishing a post and watching it appear on the
  front page — before any database exists. Everything here is sample copy and
  says so.

  It resets whenever the server restarts, which is correct: this is a
  demonstration, not a draft anybody should be trusting.
*/

const iso = (daysAgo: number) => new Date(Date.now() - daysAgo * 86_400_000).toISOString();

const day = (daysAhead: number) =>
  new Date(Date.now() + daysAhead * 86_400_000).toISOString().slice(0, 10);

let posts: Post[] = [
  {
    id: "demo-post-1",
    slug: "sample-ward-visit",
    title: "Sample post — a ward visit",
    excerpt:
      "This is sample copy so the news log is not empty in the demonstration. Campaign staff write real posts from the dashboard.",
    body: "This is sample copy. It exists so that the news log, the front page and the single-post page can all be seen working before the campaign has published anything real.\n\nA real post is written in the dashboard at /admin/content. Staff type plain paragraphs — no HTML, no formatting menu, nothing that needs explaining over the phone — and press publish.",
    category: "Sample",
    state: "published",
    published_at: iso(3),
    author_label: "Demo",
  },
  {
    id: "demo-post-2",
    slug: "sample-statement",
    title: "Sample post — a statement",
    excerpt: "A second sample entry, so the log shows more than one line.",
    body: "A second piece of sample copy, so the log has something to be a log of.\n\nNothing here is a real campaign statement.",
    category: "Sample",
    state: "published",
    published_at: iso(11),
    author_label: "Demo",
  },
];

let events: EventEntry[] = [
  {
    id: "demo-event-1",
    title: "Sample stop — ward meeting",
    when_text: "Saturday, from 10am",
    where_text: "Sample location, Turkana Central",
    summary:
      "Sample diary entry. Real stops are added in the dashboard and removed once they have happened.",
    state: "published",
    starts_on: day(9),
  },
  {
    id: "demo-event-2",
    title: "Sample stop — open baraza",
    when_text: "Sunday afternoon",
    where_text: "Sample location, Turkana West",
    summary: "A second sample entry.",
    state: "published",
    starts_on: day(23),
  },
];

export function demoPosts(includeDrafts = false): Post[] {
  return posts
    .filter((p) => includeDrafts || p.state === "published")
    .slice()
    .sort((a, b) => (b.published_at ?? "").localeCompare(a.published_at ?? ""));
}

export function demoPost(slug: string): Post | null {
  return posts.find((p) => p.slug === slug && p.state === "published") ?? null;
}

export function demoEvents(includeDrafts = false): EventEntry[] {
  return events
    .filter((e) => includeDrafts || e.state === "published")
    .slice()
    .sort((a, b) => a.starts_on.localeCompare(b.starts_on));
}

export function demoUpsertPost(post: Post): Post {
  const existing = posts.findIndex((p) => p.id === post.id);
  if (existing >= 0) posts[existing] = post;
  else posts = [post, ...posts];
  return post;
}

export function demoDeletePost(id: string): void {
  posts = posts.filter((p) => p.id !== id);
}

export function demoUpsertEvent(entry: EventEntry): EventEntry {
  const existing = events.findIndex((e) => e.id === entry.id);
  if (existing >= 0) events[existing] = entry;
  else events = [entry, ...events];
  return entry;
}

export function demoDeleteEvent(id: string): void {
  events = events.filter((e) => e.id !== id);
}
