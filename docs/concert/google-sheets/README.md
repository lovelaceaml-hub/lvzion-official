# Connect the private Google Sheet

1. Open the concert spreadsheet under its owner account and select **Extensions → Apps Script** on a computer.
2. Replace the starter code with [Code.gs](Code.gs) and save.
3. Choose **Deploy → New deployment → Web app**. Set **Execute as** to **Me** and **Who has access** to **Anyone**. Authorize the script when Google asks. The spreadsheet keeps its existing private sharing settings.
4. Copy the web app URL ending in `/exec` to the app administrator. Configure it as `LVZ_CONCERT_SHEET_WEBHOOK` in the concert app's production environment, then redeploy.

The receiver accepts write notifications from LV Zion. It fetches a short-lived authenticated snapshot from the fixed LV Zion endpoint and writes to the event's configured sheet. The receiver returns only delivery success or failure. Keep the Attendance tab name, its headers on row 4, and the data area A5:D available for synchronization. Each update includes earlier registrations and corrections.
