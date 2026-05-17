# 部署到 GitHub Pages — 完整教學

> 把這份專案部署到 `https://{your-username}.github.io/{repo-name}/`，
> 部署完才能完整測試 PWA（加到主畫面、預下載地圖、Service Worker 快取）。

---

## 0. 前置確認

開始之前，確認以下檔案都在專案根目錄：

- [x] `index.html`（主應用）
- [x] `config.js`（**含您的 Firebase 與 CWA 金鑰**）
- [x] `manifest.json`
- [x] `service-worker.js`
- [x] `icon-192.svg` / `icon-512.svg`
- [x] `.gitignore`
- [x] `CLAUDE.md` / `PROCESS.md`（可選，留著當文件）
- [x] `docs/firebase-setup.md` / `docs/deployment.md`

### 關於 config.js 與金鑰公開

`config.js` 內含：

```javascript
window.firebaseConfig = { apiKey: "AIza...", ... };
window.cwaApiKey = "CWA-XXXX-...";
```

**這兩個 key 都是「Web 公開金鑰」設計上就會被瀏覽器看到**：

| Key | 為何公開無妨 |
|---|---|
| `firebaseConfig.apiKey` | Firebase Web SDK 設計如此，安全靠 Firestore Rules 保證 |
| `cwaApiKey` | 中央氣象署免費 key 本來就只用於請求簽署，無付費風險 |

所以這個 `config.js` 直接 commit 進 repo 沒問題。專案的 `.gitignore` 預設不忽略它。

> 如果您堅持不想 commit，把 `.gitignore` 最後一行的 `# config.js` 取消註解。但這會讓 GitHub Pages 部署的版本沒有 config.js → 整個 app 跑不起來。簡單做法：直接 commit。

---

## 1. 建立 GitHub Repository

1. 開 [GitHub](https://github.com) → 右上 `+` → **New repository**
2. Repository name：建議 `travelplan` 或 `family-travel`
3. **Public**（GitHub Pages 免費版必須是 Public；想 Private 就要 GitHub Pro $4/月）
4. **不要** 勾選 `Add a README` / `Add .gitignore` / `Add license`（您本機已有檔案會衝突）
5. **Create repository** → 看到「Quick setup」頁面

---

## 2. 把本機檔案推上去

開 VS Code 整合終端機（Terminal → New Terminal），確認您在 `旅遊計劃書/` 資料夾下：

```bash
# 初始化 Git（如果還沒）
git init
git branch -M main

# 設定您的身份（如果第一次用）
git config user.name "Richie Yang"
git config user.email "richie.yang@ycmcnc.com"

# 加檔案 + 第一次 commit
git add .
git status   # 確認沒有奇怪的檔案被加進來
git commit -m "Initial commit: phases 0-7 完成"

# 連線到剛建立的 GitHub repo
git remote add origin https://github.com/{您的-username}/{repo-name}.git
git push -u origin main
```

把 `{您的-username}` 和 `{repo-name}` 換成實際的值。

> **VS Code 替代方案**：左側活動列「原始檔控制」圖示 → `Initialize Repository` → 填 commit 訊息 → `✓ Commit` → 右上「Publish Branch」會跳出來，選 Public repository 即可一鍵建立並推送。

---

## 3. 啟用 GitHub Pages

1. 進到 GitHub 上的 repo 頁面 → **Settings** 分頁
2. 左欄找 **Pages**
3. **Source** 下拉：選 `Deploy from a branch`
4. **Branch** 下拉：選 `main`，資料夾選 `/ (root)`
5. **Save**
6. 等 1~2 分鐘，頁面上方會出現綠色：

   > Your site is live at `https://{username}.github.io/{repo-name}/`

7. 點那個網址確認頁面開啟（會看到 Google 登入畫面，但暫時還不能登入——下一步處理）

---

## 4. Firebase 加入授權網域

剛剛部署的網址要先在 Firebase 那邊「掛號」，否則 Google 登入會被擋。

1. 開 [Firebase Console](https://console.firebase.google.com) → 您的 `travel-plan-richie` 專案
2. 左側 **Authentication** → 上方分頁 **Settings**
3. 下方 **Authorized domains** → **Add domain**
4. 輸入 `{your-username}.github.io`（**只要網域，不含路徑**）→ Add
5. 列表應該會看到：
   - `localhost`
   - `travel-plan-richie.firebaseapp.com`
   - `travel-plan-richie.web.app`
   - `{your-username}.github.io`  ← 新加的

---

## 5. Google OAuth 同意畫面（如果還沒設定）

第一次使用 Google 登入時通常會跳 OAuth 同意畫面警告。Firebase 已經有預設設定但需要確認：

1. 開 [Google Cloud Console](https://console.cloud.google.com)
2. 選擇對應 Firebase 專案的 GCP 專案（通常同名 `travel-plan-richie`）
3. 左欄選單 → **APIs & Services** → **OAuth consent screen**
4. 確認狀態：
   - 若為「Testing」狀態：需把要登入的 Google 帳號加進 **Test users**（自己 + 想用桌面端的家人）
   - 想開放任何 Google 帳號用：點 **Publish app**（會跳警告說會被 Google 審核；個人用其實留在 Testing 就好）

**Test users 加帳號**：
- App name 區下方往下捲 → **Test users** → **+ Add users** → 輸入 email（您自己的 Gmail 一定要加）→ Save

---

## 6. 第一次測試

開部署的網址 `https://{username}.github.io/{repo-name}/`：

- [ ] 看到「使用 Google 登入」按鈕 → 點 → Google 登入 popup → 完成登入
- [ ] 進入 Dashboard，看到「Richie Yang's Family」標題
- [ ] 上方家庭分享連結，**網址變成 `https://{username}.github.io/{repo}/?family=RICHIE2026`**（而不是 localhost）
- [ ] 之前在 localhost 建立的行程**還在**（Firestore 同步生效）

如果某步失敗：

| 症狀 | 解法 |
|---|---|
| 點 Google 登入沒反應 | F12 看 console。若 `auth/unauthorized-domain` → Firebase Authorized domains 沒加好 |
| Google 登入回 `auth/internal-error` | OAuth consent screen 沒設好，自己 email 加進 Test users |
| 「找不到 config.js 或 window.firebaseConfig 未設定」 | config.js 沒 push 上去，檢查 `.gitignore` 並 `git status` 看狀態 |
| 頁面全白、F12 看到 404 | Pages 還沒部署完成，再等 1 分鐘 |

---

## 7. 測試 PWA（這個 Phase 6 等的就是這步）

部署到 https 後 Service Worker 才會啟用。

### 7.1 加到主畫面

**桌面 Chrome**：
- 網址列右側會出現 ⬇️ 圖示 → 點 → **安裝**
- 或進 Dashboard 看到頂部「📱 把它加到主畫面」橫幅 → 點安裝
- 安裝完桌面會多一個圖示，點開是全螢幕 APP 模式（沒有瀏覽器網址列）

**Android Chrome**：
- 第一次開啟會在底部跳「新增至主畫面」橫幅
- 或瀏覽器右上 ⋮ → 「加到主畫面」
- 完成後桌面圖示就跟原生 APP 一樣

### 7.2 Service Worker 啟用驗證

- F12 → **Application** 分頁 → 左欄 **Service Workers**
- 應該看到 `service-worker.js` 狀態 `activated and is running`
- 左欄 **Cache Storage** 應該有 `tw-travel-core-1.0.0`（含 index.html、CDN 資源）

### 7.3 預下載地圖

- Dashboard 任一行程 → **📥 預下載地圖** → 看 modal → **開始下載** → 進度條跑完
- F12 Application → Cache Storage → 應該多出 `tw-travel-tiles-1.0.0`，裡面是 OSM 圖磚

### 7.4 離線測試

- F12 → Network 分頁 → 上方下拉切換成 **Offline**
- 重整頁面 → 應該還能載入（從 SW 快取）
- 進入已預下載地圖的行程 → 地圖該區域仍能顯示

---

## 8. 把分享連結傳給家人

進 Dashboard 上方「家庭分享連結」區塊：

- **📋 複製** → 貼到 LINE 群組
- **📱 QR Code** → 給家人掃
- **💬 LINE 分享** → 直接開 LINE 對話

家人在 Android Chrome 開連結 → 完成稱呼/圖示/顏色設定 → Chrome 跳「加到主畫面」 → 完成 → 桌面圖示直接點開就是觀看者模式。

---

## 9. 後續更新流程

之後修改任何檔案：

```bash
git add .
git commit -m "更新內容說明"
git push
```

GitHub Pages 會自動重新部署，約 1~2 分鐘後生效。**已安裝 PWA 的家人會收到 SW 更新通知**（會看到一個 🔄 橫幅，點重新整理套用）。

### SW 版本號

修改 `service-worker.js` 的 `VERSION` 常數（如 `1.0.0` → `1.0.1`），下次部署時舊快取會清掉、新檔案重新快取。建議**任何 index.html 重大改動後都升一次版**，避免家人開 PWA 看到舊版本。

---

## 10. 常見問題

### Q：可以用自己的網域嗎？
A：可以。Settings → Pages → **Custom domain** 填您的網域，DNS 加一筆 CNAME 指到 `{username}.github.io`。記得回到 Firebase Authorized domains 把新網域加進去。

### Q：每次 push 都要重新加家人嗎？
A：不用。家人的稱呼存在他們手機的 localStorage 跟 Firestore 的 `known_family`，不會因為您重新部署而消失。

### Q：CWA API key 被人拿走怎麼辦？
A：中央氣象署 key 沒有額度上限的計費風險，被偷用也不會收您錢。如果想換，到 [opendata.cwa.gov.tw](https://opendata.cwa.gov.tw) → 我的金鑰 → 重新產生，改 config.js push 即可。

### Q：Firebase key 真的不用擔心？
A：對。Firebase Web SDK 設計上就會把 key 露出在瀏覽器，安全靠 Firestore Rules（已部署：「使用者私有空間只有 owner 能讀寫」「shared 空間需要已登入」）。除非您 Rules 設錯讓任意人能寫您的資料庫，否則 key 公開無妨。
