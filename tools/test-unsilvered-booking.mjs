import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import vm from 'node:vm';
import bookingEndpoint from '../netlify/functions/unsilvered-booking.js';

const rows = [];
const emails = [];
let locked = false;
let failVisitorEmail = false;
let failStudioEmail = false;
const sheet = {
  getLastRow: () => rows.length,
  appendRow: (row) => {
    if (/^\d{2}:\d{2}$/.test(row[2])) row[2] = new TestDate(`2026-09-23T${row[2]}:00+08:00`);
    rows.push(row);
  },
  getParent: () => ({ getSpreadsheetTimeZone: () => 'Asia/Singapore', getUrl: () => 'https://docs.google.com/spreadsheets/d/test/edit' }),
  getSheetId: () => 123,
  getRange: (start, column, count) => ({
    getValues: () => rows.slice(start - 1, start - 1 + count).map((row) => row.slice(column - 1)),
    setValue: (value) => { rows[start - 1][column - 1] = value; },
  }),
};
const RealDate = Date;
class TestDate extends RealDate {
  constructor(...args) { super(...(args.length ? args : ['2026-09-23T12:00:00+08:00'])); }
  static now() { return RealDate.parse('2026-09-23T12:00:00+08:00'); }
}
const context = vm.createContext({
  Date: TestDate, JSON, Number, Object, String, console,
  Utilities: { formatDate: (date, timezone) => new Intl.DateTimeFormat('en-GB', {
    timeZone: timezone, hour: '2-digit', minute: '2-digit', hourCycle: 'h23',
  }).format(date) },
  ContentService: {
    MimeType: { JSON: 'json' },
    createTextOutput: (text) => ({ text, setMimeType() { return this; } }),
  },
  SpreadsheetApp: { getActiveSpreadsheet: () => ({ getSheetByName: () => sheet }), flush() {} },
  PropertiesService: { getScriptProperties: () => ({ getProperty: () => 'test-secret' }) },
  LockService: { getScriptLock: () => ({
    tryLock: () => { assert.equal(locked, false); locked = true; return true; },
    releaseLock: () => { locked = false; },
  }) },
  MailApp: { sendEmail: (message) => {
    if ((failVisitorEmail && message.subject === 'Your viewing time for The Sitting Room') ||
        (failStudioEmail && message.to === 'studio@shavonnewong.art')) throw new Error('Simulated mail failure');
    emails.push(message);
  } },
});
vm.runInContext(readFileSync(new URL('./unsilvered-booking-apps-script.gs', import.meta.url), 'utf8'), context);
const call = (data) => JSON.parse(context.doPost({ postData: { contents: JSON.stringify({ secret: 'test-secret', ...data }) } }).text);
const id = (number) => `00000000-0000-4000-8000-${String(number).padStart(12, '0')}`;

assert.equal(call({ action: 'availability' }).slots['14:00'], 8);
assert.equal(call({ action: 'book', slot: '18:00', quantity: 1, name: 'A', email: 'a@example.com', requestId: id(1) }).status, 400);
assert.equal(call({ action: 'book', slot: '14:00', quantity: 3, name: 'A', email: 'a@example.com', requestId: id(1) }).status, 200);
assert.equal(call({ action: 'availability' }).slots['14:00'], 5);
assert.equal(call({ action: 'book', slot: '14:00', quantity: 6, name: 'B', email: 'b@example.com', requestId: id(2) }).status, 409);
assert.equal(call({ action: 'book', slot: '14:00', quantity: 5, name: 'B', email: 'b@example.com', requestId: id(2) }).status, 200);
assert.equal(call({ action: 'availability' }).slots['14:00'], 0);
assert.equal(call({ action: 'book', slot: '14:00', quantity: 3, name: 'A', email: 'a@example.com', requestId: id(1) }).status, 200);
assert.equal(rows.length, 3); // Header plus two reservations, no duplicate.
assert.equal(emails.length, 4); // One visitor confirmation and one studio notice per new booking.
assert.equal(emails[0].replyTo, 'studio@shavonnewong.art');
assert.match(emails[0].htmlBody, /unsilvered-2026-confirmation-poster\.jpg/);
assert.equal(emails[1].to, 'studio@shavonnewong.art');
assert.equal(emails[1].replyTo, 'a@example.com');
assert.match(emails[1].body, /#gid=123&range=G2/);
assert.equal(rows[1][8], 'Yes');
assert.equal(rows[0][8], 'Studio notified');
const escaped = context.bookingConfirmation_('<b>A&B</b>', 'a@example.com', '14:00', 1);
assert.match(escaped.htmlBody, /&lt;b&gt;A&amp;B&lt;\/b&gt;/);
assert.equal(call({ action: 'book', slot: '14:00', quantity: 1, name: 'A', email: 'a@example.com', requestId: id(3) }).status, 409);
rows[1][6] = 'Cancelled';
assert.equal(call({ action: 'availability' }).slots['14:00'], 3);
assert.equal(call({ action: 'book', slot: '14:00', quantity: 3, name: 'C', email: 'c@example.com', requestId: id(4) }).status, 200);
assert.equal(call({ action: 'availability' }).slots['14:00'], 0);

// A saved reservation and studio notice survive a failed visitor email.
failVisitorEmail = true;
const visitorFailure = call({ action: 'book', slot: '15:00', quantity: 1, name: 'D', email: 'd@example.com', requestId: id(6) });
assert.equal(visitorFailure.status, 200);
assert.equal(visitorFailure.emailSent, false);
assert.equal(rows.at(-1)[7], 'No');
assert.equal(rows.at(-1)[8], 'Yes');
assert.match(emails.at(-1).body, /could not be sent/);
failVisitorEmail = false;
failStudioEmail = true;
const studioFailure = call({ action: 'book', slot: '16:00', quantity: 1, name: 'E', email: 'e@example.com', requestId: id(7) });
assert.equal(studioFailure.status, 200);
assert.equal(studioFailure.emailSent, true);
assert.equal(rows.at(-1)[7], 'Yes');
assert.equal(rows.at(-1)[8], 'No');
failStudioEmail = false;

process.env.UNSILVERED_BOOKING_WEBHOOK_URL = 'https://example.com/test';
process.env.UNSILVERED_BOOKING_SECRET = 'test-secret';
const originalFetch = globalThis.fetch;
globalThis.fetch = async (_url, options) => new Response(context.doPost({ postData: { contents: options.body } }).text, { status: 200 });
try {
  const bad = await bookingEndpoint(new Request('https://example.com/api/unsilvered-booking', {
    method: 'POST', body: JSON.stringify({ name: 'A', email: 'a@example.com', slot: '18:00', quantity: 1, requestId: id(5) }),
  }));
  assert.equal(bad.status, 400);
  const availability = await bookingEndpoint(new Request('https://example.com/api/unsilvered-booking'));
  assert.equal(availability.status, 200);
  const snapshot = await availability.json();
  assert.equal(snapshot.slots['14:00'], 0);
  assert.ok(Number.isFinite(snapshot.checkedAt));
  assert.match(availability.headers.get('Netlify-CDN-Cache-Control'), /max-age=15/);
  assert.match(availability.headers.get('Netlify-CDN-Cache-Control'), /stale-while-revalidate=300/);
  assert.equal(availability.headers.get('Cache-Control'), 'no-store');
  const fresh = await bookingEndpoint(new Request('https://example.com/api/unsilvered-booking?fresh=1'));
  assert.equal(fresh.headers.get('Netlify-CDN-Cache-Control'), null);
  // A visitor with an earlier count still cannot reserve an already full slot.
  const full = await bookingEndpoint(new Request('https://example.com/api/unsilvered-booking', {
    method: 'POST', body: JSON.stringify({ name: 'F', email: 'f@example.com', slot: '14:00', quantity: 1, requestId: id(8) }),
  }));
  assert.equal(full.status, 409);
  assert.equal(full.headers.get('Netlify-CDN-Cache-Control'), null);
  assert.equal(full.headers.get('Cache-Control'), 'no-store');
  globalThis.fetch = async () => { throw new Error('Network unavailable'); };
  const failed = await bookingEndpoint(new Request('https://example.com/api/unsilvered-booking'));
  assert.equal(failed.status, 502);
  assert.equal(failed.headers.get('Netlify-CDN-Cache-Control'), null);
} finally {
  globalThis.fetch = originalFetch;
}
console.log('Unsilvered booking checks passed');
