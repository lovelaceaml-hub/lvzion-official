// Google Apps Script web app for the organizer's private concert spreadsheet.
// Each notification fetches the current committed roster from LV Zion.
function doPost(e) {
  const reply = ok => ContentService.createTextOutput(JSON.stringify({ok: ok}))
    .setMimeType(ContentService.MimeType.JSON);
  const lock = LockService.getScriptLock();
  try {
    const request = JSON.parse(e.postData.contents);
    if (typeof request.token !== 'string' || request.token.length > 2048) return reply(false);
    if (!lock.tryLock(8000)) return reply(false);
    const response = UrlFetchApp.fetch('https://lvz.app/api/concert/sheet-snapshot', {
      method: 'post',
      headers: {Authorization: 'Bearer ' + request.token},
      followRedirects: false,
      muteHttpExceptions: true
    });
    if (response.getResponseCode() !== 200) return reply(false);
    const snapshot = JSON.parse(response.getContentText());
    if (!Array.isArray(snapshot.rows) || typeof snapshot.sheetId !== 'string') return reply(false);

    const sheet = SpreadsheetApp.openById(snapshot.sheetId).getSheetByName('Attendance');
    if (!sheet) return reply(false);
    const headings = sheet.getRange('A4:D4').getDisplayValues()[0];
    if (headings.join('|') !== 'Attendee|Registered · Pacific|Attendance|Checked in · Pacific') return reply(false);

    const values = snapshot.rows.map(row => [row.attendee, row.registered, row.attendance, row.checked_in]
      .map(value => {
        const text = String(value == null ? '' : value);
        return /^[=+@\-\t\r]/.test(text) ? "'" + text : text;
      }));
    const lastRow = Math.max(sheet.getLastRow(), 4 + values.length);
    if (lastRow > sheet.getMaxRows()) sheet.insertRowsAfter(sheet.getMaxRows(), lastRow - sheet.getMaxRows());
    while (values.length < lastRow - 4) values.push(['', '', '', '']);
    if (values.length) sheet.getRange(5, 1, values.length, 4).setValues(values);
    sheet.getRange('C3').setValue(new Date()).setNumberFormat('mmm d, yyyy h:mm AM/PM');
    SpreadsheetApp.flush();
    return reply(true);
  } catch (_) {
    return reply(false);
  } finally {
    if (lock.hasLock()) lock.releaseLock();
  }
}
