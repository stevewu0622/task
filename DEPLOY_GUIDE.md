# TeamTask Sync 上線指南 (Deploy to Netlify)

恭喜您！您的程式碼已經準備好上線了。請依照以下步驟將其部署到 Netlify 產生永久網址。

## 方法 A: 使用 GitHub (推薦，最穩定)

這是最標準的做法，日後您只要修改程式碼並 push 到 GitHub，網站就會自動更新。

1.  **建立 Repository:** 在 GitHub 上建立一個新的 Repository (例如 `teamtask-sync`)。
2.  **上傳程式碼:** 將所有檔案推送到該 Repository。
3.  **前往 Netlify:**
    *   登入 [Netlify](https://www.netlify.com/)。
    *   點擊 **"Add new site"** > **"Import from existing project"**。
    *   選擇 **GitHub** 並授權。
    *   選擇您剛剛建立的 `teamtask-sync` repository。
4.  **設定 Build Settings (通常會自動偵測):**
    *   **Build command:** `npm run build`
    *   **Publish directory:** `dist`
5.  點擊 **"Deploy site"**。

## 方法 B: 手動上傳 (Netlify Drop)

如果您不想使用 GitHub，可以直接用拖拉的方式。

1.  **本機打包:**
    *   確認您的電腦有安裝 Node.js。
    *   在專案資料夾開啟終端機 (Terminal)。
    *   執行 `npm install` (安裝依賴)。
    *   執行 `npm run build` (開始打包)。
    *   成功後，您會看到一個新的資料夾 `dist`。
2.  **上傳:**
    *   前往 [Netlify Drop](https://app.netlify.com/drop)。
    *   登入後，將剛剛產生的 **`dist` 資料夾** 直接拖拉到網頁上的虛線框框中。
    *   等待幾秒鐘，網站就上線了！

## 上線後注意事項

1.  **Google Sheets 連線:** 
    *   網站上線後，因為網域變更 (從 `localhost` 變成 `xxx.netlify.app`)，原本存在瀏覽器的設定可能會消失。
    *   請準備好您的 **Google Apps Script Web App URL**，首次開啟新網站時，依照畫面指示重新貼上即可。

2.  **通知權限:**
    *   新網址會被瀏覽器視為新的網站，請務必在跳出提示時點擊 **"允許通知"**。

祝您的團隊協作順利！
