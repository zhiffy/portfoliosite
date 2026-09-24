# The Sitting Room booking setup

The booking page is live at https://www.shavonnewong.art/works/unsilvered/book/ and linked from the English and Chinese Unsilvered pages.

## Verification on 24 September 2026

- Production build and Works preflight passed for 87 pages. Desktop and mobile layouts were checked.
- A two-person test reservation saved to the Sheet and its confirmation arrived in the studio inbox.
- Fixed automatic Google Sheets time conversion so saved slots count correctly toward capacity. Apps Script deployment was updated to version 2.
- The live slot decreased from eight places to six. Duplicate and over-capacity requests were rejected; retrying the original request returned the same booking.
- The test row is marked `Cancelled`. All seven slots were verified back at eight available places.
- Old Conditional URLs redirect to Unsilvered. Both Chinese project pages and their booking links work.

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
- One email can hold one active reservation per slot. The booking page asks for only one contact name and email per group.
- A confirmation email is sent automatically after the reservation is saved. If Google cannot send it, the page still confirms the saved booking and tells the visitor to note their time.
- To handle a cancellation request, change that row's **Status** to `Cancelled`. Send any personal reply from the studio inbox if needed.
- Google Apps Script has daily email limits. There are 56 places in total; cancellations and rebookings can generate additional confirmations.

Run `node tools/test-unsilvered-booking.mjs` to check capacity, duplicate submissions, cancellations and the Netlify endpoint locally.
