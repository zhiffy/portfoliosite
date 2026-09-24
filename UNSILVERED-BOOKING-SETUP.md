# The Sitting Room booking setup

The booking page is live at https://www.shavonnewong.art/works/unsilvered/book/ and linked from the English and Chinese Unsilvered pages.

## Verification on 24 September 2026

- Production build and Works preflight passed for 87 pages. Desktop and mobile layouts were checked.
- A two-person test reservation saved to the Sheet and its confirmation arrived in the studio inbox.
- Fixed automatic Google Sheets time conversion so saved slots count correctly toward capacity. Apps Script deployment was updated to version 2.
- The live slot decreased from eight places to six. Duplicate and over-capacity requests were rejected; retrying the original request returned the same booking.
- The test row is marked `Cancelled`. All seven slots were verified back at eight available places.
- Old Conditional URLs redirect to Unsilvered. Both Chinese project pages and their booking links work.

### Poster and studio notification update

- Apps Script version 3 is live. A one-person test produced both the visitor confirmation with its full poster and the separate studio notification, verified in the studio inbox.
- The notification's management link selected the correct booking row. Both email delivery columns showed `Yes`.
- Increased the server's Google response timeout after a slow response initially reported an error despite a successful reservation. The live retry returned HTTP 200 with the original booking.
- The test reservation was then cancelled. Live availability for 8:30 pm returned from seven to eight places, while the existing 3 pm reservation remained untouched.

## One-time account setup

1. In the Google account that should own the bookings, create a Google Sheet called **The Sitting Room bookings**. In **Extensions → Apps Script**, replace the starter code with the contents of `tools/unsilvered-booking-apps-script.gs` and save. The script creates its own **Unsilvered bookings** tab.
2. In Apps Script, open **Project Settings → Script Properties**. Add `BOOKING_SECRET` with a long random value. Keep it private.
3. Use **Deploy → New deployment → Web app**. Set **Execute as** to **Me** and access to **Anyone**. Google will ask the owner to authorize access to the Sheet and to send confirmation emails. Copy the `/exec` URL.
4. In Netlify site settings, add `UNSILVERED_BOOKING_WEBHOOK_URL` with that `/exec` URL and `UNSILVERED_BOOKING_SECRET` with the same secret. The secret stays on the server. Redeploy the site so the function receives the settings.

The web app is reachable by anyone with its URL, but it rejects requests without the secret. The public page only calls the same-origin Netlify function. It never contains the URL or secret.

## Before opening bookings

1. Deploy the prepared site to a Netlify preview with the booking environment settings available. Its clean booking URL is `/works/unsilvered/book/`.
2. Make a test booking for one place. Confirm that the Sheet receives the row, the confirmation email arrives, and the chosen time shows seven places left.
3. Change that row's **Status** cell from `Confirmed` to `Cancelled`. The place should become available again after refreshing the booking page. Delete the test row if desired.
4. Verify the English and Chinese Unsilvered links, then publish the site.

The seven windows are 2–3, 3–4, 4–5, 5–6, 6:30–7:30, 7:30–8:30 and 8:30–9:30 pm, Singapore time, with eight places each. The 6–6:30 pm break has no booking option.

## Managing bookings

- Each confirmed row occupies its **Places** count in its **Slot**. A `Cancelled` row releases those places.
- Visitors can choose a time immediately while availability loads. Each time shows a loading indicator until counts arrive. The request starts in the page head before styles and fonts load.
- Public counts are fresh in Netlify's cache for 15 seconds, then may be served for up to five more minutes while refreshing. Every response includes its check time. Older counts are visibly marked as updating and replaced with an uncached live check. Manual cancellations appear in that live refresh. An unsuccessful refresh is labelled clearly.
- The reservation itself always checks the live Sheet under its existing lock, independent of the displayed counts. A rejected reservation refreshes counts without the cache.
- One email can hold one active reservation per slot. The booking page asks for only one contact name and email per group.
- A confirmation email is sent automatically after the reservation is saved. If Google cannot send it, the page still confirms the saved booking and tells the visitor to note their time.
- Visitor confirmations include the event poster below the booking details, with a plain-text alternative. Replies go to the studio inbox.
- Each new booking also sends a separate notification to `studio@shavonnewong.art`, including the visitor details and a link to that row's Status cell. Replying to this notification addresses the visitor. Column I, **Studio notified**, records whether sending succeeded.
- To handle a cancellation request, change that row's **Status** to `Cancelled`. Send any personal reply from the studio inbox if needed.
- For a partial cancellation, reduce **Places** in column D to the number still attending. A whole-booking cancellation uses **Status** in column G. Keep the row as a record; cancellation itself does not send an email.
- Google Apps Script has daily email limits. There are 56 places in total; cancellations and rebookings can generate additional confirmations.

Run `node tools/test-unsilvered-booking.mjs` to check capacity, duplicate submissions, cancellations and the Netlify endpoint locally.
