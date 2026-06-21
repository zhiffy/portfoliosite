# Search Console digest, one-time setup

This is the Search Console twin of the GA digest. It reuses the same internal
OAuth app and the same Cloud project you already set up for GA, so there is
nothing new to create. You only grant one extra read permission and sign in once.

Two steps, about five minutes, free.

## Step 1, turn on the Search Console API (one click)

Open this with your work account and click "Enable" if it is not already on:

https://console.cloud.google.com/apis/library/searchconsole.googleapis.com?project=core-chemist-500107-f4

This is the same project (`core-chemist-500107-f4`) you used for GA. You are only
switching on a second API inside it.

## Step 2, the one-time login

In a terminal in your website folder, run:

```
node tools/gsc-auth.mjs
```

A browser window opens. Sign in with the same work account that owns the
Search Console property, and click Allow. Because the app is internal, it should
not say "this app is blocked." The helper saves your login to
`tools/gsc-oauth.json` (gitignored). You only ever do this once.

## Step 3, test

```
node tools/gsc-digest.mjs
```

It prints a short summary: clicks, impressions, average CTR, average position,
your top search queries, top pages, and top countries, for the last 28 days.

The site url is already set in `tools/gsc-digest.config.json` to
`https://www.shavonnewong.art/`. If the test says it could not read that property,
it will list the exact property names your account can see, so copy the right one
into `siteUrl` and run the test again. (URL-prefix properties look like
`https://www.shavonnewong.art/`; domain properties look like
`sc-domain:shavonnewong.art`.)

## Notes

- Search Console data lags two to three days, so the digest reports a window
  ending three days ago. That is normal, not a missing-data problem.
- Nothing here changes the website or posts anything. It only reads your numbers.
- The weekly website check-in task can run `node tools/gsc-digest.mjs` and drop
  the output into the vault, the same way it does for the GA digest.
