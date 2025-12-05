# Google Sheets Backend Setup Guide

為了讓 App 能夠連線到您的 Google 試算表，您需要建立一個 Google Apps Script (GAS) 專案。請依照以下步驟操作：

## 步驟 1: 建立 Google Sheet

1.  前往 [Google Sheets](https://sheets.google.com) 建立一個新的試算表。
2.  將試算表命名為 `TeamTaskDB` (或任何您喜歡的名字)。
3.  **不需要** 手動建立欄位，程式碼會自動處理。

## 步驟 2: 開啟 Apps Script

1.  在試算表中，點擊上方選單的 **擴充功能 (Extensions)** > **Apps Script**。
2.  這會開啟一個新的程式碼編輯器分頁。

## 步驟 3: 貼上後端程式碼

1.  刪除編輯器中原本的 `myFunction`。
2.  將下方的程式碼完整複製並貼上：

```javascript
/* --- SERVER.GS START --- */

function doPost(e) {
  const lock = LockService.getScriptLock();
  lock.tryLock(10000);

  try {
    const sheetId = SpreadsheetApp.getActiveSpreadsheet().getId();
    const data = JSON.parse(e.postData.contents);
    const action = data.action;
    const sheetName = data.sheet;
    
    const ss = SpreadsheetApp.openById(sheetId);
    let sheet = ss.getSheetByName(sheetName);

    // Auto-create sheet if missing
    if (!sheet) {
      sheet = ss.insertSheet(sheetName);
      // Add headers based on sheet type
      if (sheetName === 'Users') {
        sheet.appendRow(['id', 'json']); // We store full object in json column for flexibility
      } else if (sheetName === 'Tasks') {
        sheet.appendRow(['id', 'json']);
      }
    }

    let result = {};

    if (action === 'READ') {
      const rows = sheet.getDataRange().getValues();
      const headers = rows[0];
      // Assuming column 1 (index 1) is 'json'
      const jsonData = rows.slice(1).map(row => {
        try {
          return JSON.parse(row[1]);
        } catch (err) { return null; }
      }).filter(item => item !== null);
      
      result = { status: 'success', data: jsonData };
    } 
    
    else if (action === 'CREATE') {
      const newItem = data.item;
      // Store ID in col 0, JSON in col 1
      sheet.appendRow([newItem.id, JSON.stringify(newItem)]);
      result = { status: 'success' };
    } 
    
    else if (action === 'UPDATE') {
      const idToUpdate = data.id;
      const updates = data.updates; // Object with fields to update
      
      const rows = sheet.getDataRange().getValues();
      // Find row index (1-based for getRange, but loop is 0-based)
      // rows[i][0] is the ID
      let rowIndex = -1;
      let currentItem = null;

      for (let i = 1; i < rows.length; i++) {
        if (rows[i][0] == idToUpdate) {
          rowIndex = i + 1; // Sheet row number
          try {
            currentItem = JSON.parse(rows[i][1]);
          } catch(e) {}
          break;
        }
      }

      if (rowIndex !== -1 && currentItem) {
        // Merge updates
        const updatedItem = { ...currentItem, ...updates };
        sheet.getRange(rowIndex, 2).setValue(JSON.stringify(updatedItem));
        result = { status: 'success' };
      } else {
        result = { status: 'error', message: 'ID not found' };
      }
    }

    return ContentService.createTextOutput(JSON.stringify(result))
      .setMimeType(ContentService.MimeType.JSON);

  } catch (e) {
    return ContentService.createTextOutput(JSON.stringify({ status: 'error', message: e.toString() }))
      .setMimeType(ContentService.MimeType.JSON);
  } finally {
    lock.releaseLock();
  }
}

// Setup CORS (Optional but recommended for strict browsers, though direct fetch usually works)
function doGet(e) {
  return ContentService.createTextOutput("App is running.");
}
/* --- SERVER.GS END --- */
```

3.  點擊磁片圖示 (💾) 儲存專案，命名為 `API`。

## 步驟 4: 部署為 Web App

1.  點擊右上角的 **部署 (Deploy)** > **新增部署 (New deployment)**。
2.  點擊左側齒輪圖示，選擇 **網頁應用程式 (Web app)**。
3.  設定如下：
    *   **說明 (Description):** TeamTask API
    *   **執行身分 (Execute as):** **我 (Me)** (重要！這樣才會用您的權限讀寫試算表)
    *   **誰可以存取 (Who has access):** **所有人 (Anyone)** (重要！這樣 App 才能連線)
4.  點擊 **部署 (Deploy)**。
5.  初次部署會要求授權，請點擊 **授權存取 (Authorize access)**，選擇您的帳號，若出現「Google 尚未驗證此應用程式」，請點擊 **進階 (Advanced)** > **前往... (Go to...) (不安全)**，然後點擊 **允許 (Allow)**。

## 步驟 5: 取得 URL

1.  部署成功後，會看到一個 **網頁應用程式網址 (Web app URL)** (以 `https://script.google.com/macros/s/.../exec` 結尾)。
2.  **複製這個網址**。
3.  回到 TeamTask Sync 網頁 App，將此網址貼入設定畫面中。

DONE! 您的 App 現在已經連接到 Google Sheets 了。
