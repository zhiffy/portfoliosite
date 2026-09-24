// Deploy as a Google Apps Script web app, executing as the owner and open to
// anyone. Set script property BOOKING_SECRET to match the Netlify secret.
// Bind this script to the bookings spreadsheet. Do not reuse the contact tab.

var BOOKING_TAB = 'Unsilvered bookings';
var BOOKING_HEADERS = ['Created at', 'Request ID', 'Slot', 'Places', 'Name', 'Email', 'Status', 'Email sent'];
var BOOKING_SLOTS = {
  '14:00': '2 to 3 pm', '15:00': '3 to 4 pm', '16:00': '4 to 5 pm', '17:00': '5 to 6 pm',
  '18:30': '6:30 to 7:30 pm', '19:30': '7:30 to 8:30 pm', '20:30': '8:30 to 9:30 pm'
};
var BOOKING_DATE = 'Friday 2 October 2026';
var BOOKING_END = new Date('2026-10-02T21:30:00+08:00').getTime();

function bookingResponse_(result) {
  return ContentService.createTextOutput(JSON.stringify(result)).setMimeType(ContentService.MimeType.JSON);
}

function bookingSheet_() {
  var book = SpreadsheetApp.getActiveSpreadsheet();
  var sheet = book.getSheetByName(BOOKING_TAB) || book.insertSheet(BOOKING_TAB);
  if (sheet.getLastRow() === 0) sheet.appendRow(BOOKING_HEADERS);
  return sheet;
}

function bookingRows_(sheet) {
  var last = sheet.getLastRow();
  if (last < 2) return [];
  var timezone = sheet.getParent().getSpreadsheetTimeZone();
  return sheet.getRange(2, 1, last - 1, BOOKING_HEADERS.length).getValues().map(function (row) {
    // Sheets can convert a slot such as 14:00 into a Date automatically.
    if (row[2] instanceof Date) row[2] = Utilities.formatDate(row[2], timezone, 'HH:mm');
    return row;
  });
}

function bookingAvailability_(rows) {
  var used = {};
  Object.keys(BOOKING_SLOTS).forEach(function (slot) { used[slot] = 0; });
  rows.forEach(function (row) {
    if (String(row[6]).toLowerCase() === 'confirmed' && Object.prototype.hasOwnProperty.call(used, String(row[2]))) {
      used[String(row[2])] += Number(row[3]) || 0;
    }
  });
  var available = {};
  Object.keys(used).forEach(function (slot) {
    var start = new Date('2026-10-02T' + slot + ':00+08:00').getTime();
    available[slot] = Date.now() >= start + 60 * 60 * 1000 ? 0 : Math.max(0, 8 - used[slot]);
  });
  return available;
}

function doPost(e) {
  try {
    var data = JSON.parse((e && e.postData && e.postData.contents) || '{}');
    var secret = PropertiesService.getScriptProperties().getProperty('BOOKING_SECRET');
    if (!secret || data.secret !== secret) return bookingResponse_({ status: 400, error: 'Invalid request.' });
    if (Date.now() >= BOOKING_END) return bookingResponse_({ status: 410, error: 'Bookings for this event have closed.' });
    if (data.action === 'availability') {
      return bookingResponse_({ status: 200, slots: bookingAvailability_(bookingRows_(bookingSheet_())) });
    }
    if (data.action !== 'book') return bookingResponse_({ status: 400, error: 'Invalid request.' });

    var name = String(data.name || '').trim();
    var email = String(data.email || '').trim().toLowerCase();
    var slot = String(data.slot || '');
    var quantity = Number(data.quantity);
    var requestId = String(data.requestId || '');
    if (!name || name.length > 120 || !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email) || email.length > 254 ||
        !Object.prototype.hasOwnProperty.call(BOOKING_SLOTS, slot) ||
        !Number.isInteger(quantity) || quantity < 1 || quantity > 8 || !/^[0-9a-f-]{36}$/i.test(requestId)) {
      return bookingResponse_({ status: 400, error: 'Please check your booking details.' });
    }
    var slotEnd = new Date('2026-10-02T' + slot + ':00+08:00').getTime() + 60 * 60 * 1000;
    if (Date.now() >= slotEnd) return bookingResponse_({ status: 410, error: 'This viewing time has ended.' });

    var lock = LockService.getScriptLock();
    if (!lock.tryLock(10000)) return bookingResponse_({ status: 503, error: 'The booking system is busy. Please try again.' });
    var sheet, rowNumber, rows;
    try {
      sheet = bookingSheet_();
      rows = bookingRows_(sheet);
      var existing = rows.find(function (row) { return String(row[1]) === requestId && String(row[6]).toLowerCase() === 'confirmed'; });
      if (existing) {
        return bookingResponse_({ status: 200, slot: String(existing[2]), quantity: Number(existing[3]), emailSent: String(existing[7]).toLowerCase() === 'yes' });
      }
      var duplicate = rows.some(function (row) {
        return String(row[2]) === slot && String(row[5]).toLowerCase() === email && String(row[6]).toLowerCase() === 'confirmed';
      });
      if (duplicate) return bookingResponse_({ status: 409, error: 'This email already has a booking for that viewing time.' });
      if (bookingAvailability_(rows)[slot] < quantity) {
        return bookingResponse_({ status: 409, error: 'There are not enough places left in that viewing time. Please choose another.' });
      }
      sheet.appendRow([new Date(), requestId, slot, quantity, name, email, 'Confirmed', 'No']);
      SpreadsheetApp.flush();
      rowNumber = sheet.getLastRow();
    } finally {
      lock.releaseLock();
    }

    var emailSent = false;
    try {
      MailApp.sendEmail({
        to: email,
        subject: 'Your viewing time for The Sitting Room',
        body: 'Hello ' + name + ',\n\nYour places are confirmed for The Sitting Room open showcase.\n\n' +
          BOOKING_DATE + '\n' + BOOKING_SLOTS[slot] + ' Singapore time\n' +
          quantity + (quantity === 1 ? ' place' : ' places') + '\n' +
          'NAC Arts x Tech Lab, Aliwal Arts Centre\n28 Aliwal Street, #02-05, Singapore 199918\n\n' +
          'You can arrive at any time during your reserved hour. Entry is free.\n\n' +
          'If your plans change, please email studio@shavonnewong.art so the places can be released.\n\nShavonne Wong Studio'
      });
      emailSent = true;
      sheet.getRange(rowNumber, 8).setValue('Yes');
    } catch (mailError) {
      console.error('Booking saved, confirmation email failed', mailError);
    }
    return bookingResponse_({ status: 200, slot: slot, quantity: quantity, emailSent: emailSent });
  } catch (error) {
    console.error('Booking error', error);
    return bookingResponse_({ status: 503, error: 'Bookings are temporarily unavailable. Please try again.' });
  }
}
