import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import vm from 'node:vm';
import bookingEndpoint from '../netlify/functions/unsilvered-booking.js';

const rows = [];
const emails = [];
let locked = false;
const sheet = {
  getLastRow: () => rows.length,
  appendRow: (row) => {
    if (/^\d{2}:\d{2}$/.test(row[2])) row[2] = new TestDate(`2026-09-23T${row[2]}:00+08:00`);
    rows.push(row);
  },
  getParent: () => ({ getSpreadsheetTimeZone: () => 'Asia/Singapore' }),
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
  MailApp: { sendEmail: (message) => emails.push(message) },
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
assert.equal(emails.length, 2);
assert.equal(call({ action: 'book', slot: '14:00', quantity: 1, name: 'A', email: 'a@example.com', requestId: id(3) }).status, 409);
rows[1][6] = 'Cancelled';
assert.equal(call({ action: 'availability' }).slots['14:00'], 3);
assert.equal(call({ action: 'book', slot: '14:00', quantity: 3, name: 'C', email: 'c@example.com', requestId: id(4) }).status, 200);
assert.equal(call({ action: 'availability' }).slots['14:00'], 0);

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
  assert.equal((await availability.json()).slots['14:00'], 0);
} finally {
  globalThis.fetch = originalFetch;
}
console.log('Unsilvered booking checks passed');
