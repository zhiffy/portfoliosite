# Google Analytics digest, one-time setup (work account, internal app)

Your work account blocks two things: downloadable keys, and outside apps. This method gets past both by using an "internal" app, which your organization treats as its own rather than as an outside app. There is no key file. You sign in once and approve, a helper saves the login, and the weekly task takes it from there. About ten to fifteen minutes, free.

Stay signed in with your work account throughout, and reuse the Google Cloud project you already have (`core-chemist-500107-f4`).

## Part 1, make an internal app and download its client

1. Go to console.cloud.google.com with your work account. Top left, confirm the project is `core-chemist-500107-f4` (or whichever you used before).
2. In the search bar type "Google Analytics Data API", open it, and click "Enable" if it is not already.
3. In the search bar type "OAuth consent screen" and open it. If it asks for a User Type, choose "Internal" and create. Fill in an app name like "GA digest", put your work email in the support and developer contact fields, and save through the steps. "Internal" is the key word; it means only your organization can use the app, which is exactly what gets past the block.
4. Go to "Credentials" (under APIs & Services). Click "Create credentials", then "OAuth client ID". For Application type choose "Desktop app", name it "GA digest desktop", and create.
5. In the dialog that appears, click "Download JSON". Rename that file to `ga-oauth-client.json` and put it in the `tools` folder of your website (next to `ga-auth.mjs`). It is gitignored, so it will not be committed.

## Part 2, the one-time login

6. Open a terminal in your website folder and run:

   ```
   node tools/ga-auth.mjs
   ```

   A browser window opens. Sign in with your work account and click Allow. Because the app is internal, it should not say "this app is blocked" this time. The helper saves your login to a file in your website's tools folder (gitignored). You only ever do this once.

## Part 3, property id and test

7. Go to analytics.google.com, click the gear icon (Admin), open "Property settings", and copy the numeric "PROPERTY ID".
8. Open `tools/ga-digest.config.json` and put that number in `propertyId`. The `quotaProjectId` is already set to `core-chemist-500107-f4`. Save.
9. Run:

   ```
   node tools/ga-digest.mjs
   ```

   It should print a short traffic summary. Your work account already has access to the property, so there is nothing to share or grant.

## If it still says "this app is blocked"

Then your organization has also locked down internal apps, which is unusual and is an administrator setting. At that point the realistic options are to ask whoever runs your Google Workspace to trust this one app, or to park analytics and just read it in the GA dashboard or phone app. Tell me which and I will help. Nothing else in your setup depends on this.
