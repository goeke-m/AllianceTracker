# Hero Power Upload — Design

## Intent

The sync function's hero power (THP) scrape of lastwarrank.com now fails with a 403. The site
added a Cloudflare bot challenge (`cf-mitigated: challenge`), which blocks all automated requests.
We will not get around the challenge. Instead, the owner opens the alliance page in their own
browser, saves it as `.html`, and uploads that file in the admin panel to update THP.

## Goals

- Owner-only upload of a saved lastwarrank.com alliance page (`.html`) on the admin panel's Members tab.
- A preview before anything is written: rows found on the page, members matched, how many THP
  values would change, and the members not on the page.
- Apply updates only `members.THP`. It never changes names and never adds or deletes members.
- Name matching ignores case and repeated internal whitespace (e.g. `Chainsaw  Man` on the page
  matches `Chainsaw Man` in the DB).

## Non-goals

- Screenshot/OCR import, or pasting the table as text.
- Changes to the lastwar.tools member sync.
- Getting past the Cloudflare challenge in any way.

## Constraints

- The page only lists members in the server's top 200. Members not on the page keep their current
  THP and are listed as "not on page" in the preview.
- The parsing and matching code (`parseHeroPower` and `matchHeroPower` in
  `supabase/functions/sync-alliance-members/heropower.ts`) is shared between the edge function and
  the browser. There is one copy, not two.
- Verified on 2026-11-25: the existing `parseHeroPower` parses a real saved page
  (95 rows, Tricky100original 284.48M … DazMiq 132.46M) without changes.
- All user-facing strings go in all four locales (en, es, ko, pt-BR).

## Approaches

1. **Upload the saved `.html` page (chosen).** The existing parser works on it unchanged, so this
   is the least new code, and it is what the owner asked for.
2. Paste the copied table as text. This needs a new parser for text whose format varies by
   browser. Rejected.
3. Keep the scrape and get past the challenge with a browser disguise or a solving service.
   Rejected: it defeats the site owner's access control.

## Decided

- Owner-only, gated on `OWNER_USER_ID`, like the Sync button.
- Flow: choose file → preview → Apply / Cancel → refresh the member list.
- The scrape code stays in the sync function. The owner removes the `LASTWARRANK_ALLIANCE_ID`
  Supabase secret so the sync stops trying the scrape (and reporting the 403) until access comes
  back.

## Left to the builder

- How the frontend imports the shared module (tsconfig/vite path), as long as there is one copy
  and the edge function still deploys.
- The exact preview layout, following the existing MemberManager styling.
- Whether to show the THP changes per member in the preview, or only the count.
