import test from 'node:test';
import assert from 'node:assert/strict';
import {readFileSync} from 'node:fs';
import {runInNewContext} from 'node:vm';

const receiver = readFileSync(new URL('../docs/concert/google-sheets/Code.gs', import.meta.url), 'utf8');

test('notifications update the same roster after registration, repeat delivery, a door scan and cancellation', () => {
  let roster = [{attendee:'=Synthetic guest', registered:'2026-12-06 15:10:00', attendance:'Registered', checked_in:''}];
  let cells: string[][] = [];
  let writes = 0;
  let requests = 0;
  let locked = false;
  let status = 200;
  let authorized = true;
  const sheet = {
    getLastRow: () => 4 + cells.length, getMaxRows: () => 1000,
    getRange: (address: string | number) => ({
      getDisplayValues: () => [['Attendee','Registered · Pacific','Attendance','Checked in · Pacific']],
      setValues: (rows: string[][]) => { assert.equal(address, 5); cells = JSON.parse(JSON.stringify(rows)); writes++; },
      setValue: () => ({setNumberFormat: () => {}}),
    }),
  };
  const receive = runInNewContext(receiver + '\ndoPost', {
    ContentService: {createTextOutput: (value: string) => ({setMimeType: () => JSON.parse(value)}), MimeType: {JSON:'json'}},
    LockService: {getScriptLock: () => ({
      tryLock: () => (locked = true), hasLock: () => locked, releaseLock: () => {locked = false;},
    })},
    UrlFetchApp: {fetch: (url: string, options: {headers:{Authorization:string}}) => {
      assert.equal(url, 'https://lvz.app/api/concert/sheet-snapshot'); assert.ok(locked); requests++;
      authorized = options.headers.Authorization === 'Bearer ' + token;
      return {getResponseCode: () => authorized ? status : 401, getContentText: () => JSON.stringify({sheetId:'test',rows:roster})};
    }},
    SpreadsheetApp: {openById: (id: string) => {
      assert.equal(id, 'test'); return {getSheetByName: (name: string) => {assert.equal(name, 'Attendance'); return sheet;}};
    }, flush: () => {}},
  });
  const token = 'v1.1796598000.' + 'a'.repeat(43);
  const send = (value = token) => receive({postData:{contents:JSON.stringify({token:value})}}).ok;
  assert.equal(send('bogus'), false); assert.equal(requests, 0);
  assert.ok(send()); assert.ok(send()); assert.equal(cells.length, 1); assert.equal(cells[0][0], "'=Synthetic guest");
  roster[0].attendance = 'Checked in'; roster[0].checked_in = '2026-12-06 16:25:00';
  assert.ok(send()); assert.equal(cells[0][2], 'Checked in'); assert.equal(cells[0][3], roster[0].checked_in);
  status = 503; roster = []; assert.equal(send(), false); assert.equal(writes, 3); assert.equal(locked, false);
  status = 200; assert.ok(send()); assert.deepEqual(cells, [['','','','']]);
});
