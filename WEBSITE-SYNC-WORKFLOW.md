# How the vault, the website, and Claude work together

The short version: your vault is the single source of truth for your words, the website is a published copy of them, and Claude is the operator that moves verified copy out to the site and pulls signals back in. You do almost nothing. Here is the whole loop.

## The three roles

Your vault holds the canon. Your bio, artist statement, social bios, CV, and the factual record live in `Public/`. When your words need to change, they change in the vault first. Nowhere else.

The website is a published copy. It should always match the canon. It is never the place where wording quietly gets reworded.

Claude is the operator. It propagates approved copy from the vault to the site, never inventing, and it pulls analytics and other signals from the site back into the vault.

## What you actually do

Two things, both things you already do.

You edit your bio or statement in the vault when you want to change them. That is it for copy.

You deploy the site when you are ready to publish. Same as today.

Everything between those two is automatic or handled by Claude.

## What runs on its own

A copy guard protects your words. Your bio and statement on the About page are locked. If any formatting or layout work ever changes a single word by accident, the check fails and the change is caught before it ships. Formatting changes pass silently. You never run this; Claude runs it before delivering any change, and the rule is written into the project so every future session obeys it.

A weekly check-in watches the canon and asks you. Every Monday morning, a scheduled task compares your vault bio and statement to what the site last published. If you changed them, it tells you in plain language what changed and asks "want me to update the website?" You reply yes and Claude pushes it everywhere, including the Chinese pages, and re-locks the guard. If nothing changed, it stays quiet. The same task drops a short site-signals digest into `_AI_Drafts/Site Signals.md` once analytics is connected.

## When you change your bio or statement

You have two easy paths. Either edit it in the vault and wait for Monday's check-in to ask you, or just tell Claude "update my site bio from the vault" any time you want it sooner. Both end the same way: the site matches your canon, in every language, with the copy guard re-locked. You never touch a command.

## The one setup step left

Connecting Google Analytics so the weekly digest has real numbers. It is a one-time, ten-minute, free setup, written out click by click in `tools/ga-setup-guide.md`. Until you do it, the weekly check-in still runs and still watches your bio and statement; it just notes that analytics is awaiting setup.

## Where things live

- Canon: vault `Public/Artist Bio.md`, `Public/Artist Statement.md`
- Copy guard: `tools/check-copy-lock.mjs`, baseline in `tools/copy-lock.snapshot.json`, rule C11 in `CLAUDE.md`
- Canon watcher baseline: `tools/vault-canon.snapshot.json`
- Weekly task: "website-weekly-checkin" in the Scheduled section
- Analytics: `tools/ga-digest.mjs`, `tools/ga-digest.config.json`, setup in `tools/ga-setup-guide.md`
- Weekly output: vault `_AI_Drafts/Site Signals.md`
