# PROCESS.md — 智慧旅遊規劃書 開發流程

> 本文件規範開發的階段拆分、執行順序、驗收條件。
> 設計理念與技術選型請見 `CLAUDE.md`。
> 建議按 Phase 順序開發，每個 Phase 完成驗收後再進入下一階段。

---

## 開發流程總覽

```
Phase 0 → Phase 1 → Phase 2 → Phase 3 → Phase 4 → Phase 5 → Phase 6 → Phase 7 → Phase 8
環境準備   基礎架構   搜尋系統   行程編輯   手機查看   多人同步   PWA化     加分功能   部署上線
```

**重要**：此專案為**全新建立**的 `index.html`，**不是修改** `D:\vscode\travelplan\plan.html`。  
plan.html 僅作為「函式邏輯參考」（Leaflet、OSRM、Google URL 解析、Nominatim fallback 等）。

每個 Phase 預計開發時間（給 Claude Code 操作）：
- Phase 0~2: 環境 + 搜尋核心（最重要）
- Phase 3~4: 兩大編輯/查看視圖
- Phase 5~6: 雲端同步 + PWA 化
- Phase 7~8: 加分功能 + 部署

---

## Phase 0 — 環境準備（人類操作）

> 此階段需要使用者本人配合，無法由 Claude Code 完成。

### 目標
建立可用的 Firebase 專案與本地開發環境。

### 步驟

#### 0.1 Firebase 專案建立
1. 開啟 https://console.firebase.google.com
2. 點「新增專案」，命名為 `travel-plan-richie`（或任意名稱）
3. 是否啟用 Google Analytics：**選否**（個人用不需要）
4. 等待建立完成

#### 0.2 啟用 Authentication
1. 左側選單 → Authentication → 開始使用
2. 登入方式 → **匿名** → 啟用 → 儲存（給家人觀看者用）
3. 登入方式 → **Google** → 啟用 → 設定支援電子郵件 → 儲存（給規劃者用）
4. （可選）Settings → Authorized domains → 加入 `richie.github.io`（之後 Pages 部署的網域）

#### 0.3 建立 Firestore 資料庫
1. 左側選單 → Firestore Database → 建立資料庫
2. 模式：**啟動於正式模式**（之後改規則）
3. 位置：`asia-east1`（台灣最近）
4. 完成後到「規則」分頁，貼入以下內容並發布：

```javascript
rules_version = '2';
service cloud.firestore {
  match /databases/{database}/documents {

    // 規劃者私有空間：只有 owner 能讀寫
    match /artifacts/{appId}/users/{userId}/{document=**} {
      allow read, write: if request.auth != null && request.auth.uid == userId;
    }

    // 家庭分享入口：任何已登入者可讀，只有 owner 能寫
    match /artifacts/{appId}/shared_family/{shareCode} {
      allow read: if request.auth != null;
      allow write: if request.auth != null && request.auth.uid == resource.data.ownerUid;
    }

    // 分享行程：任何已登入者可讀，只有 owner 能寫
    match /artifacts/{appId}/shared_trips/{tripId} {
      allow read: if request.auth != null;
      allow write: if request.auth != null && request.auth.uid == resource.data.ownerUid;

      match /participants/{participantId} {
        allow read: if request.auth != null;
        allow write: if request.auth != null && request.auth.uid == participantId;
      }
    }
  }
}
```

#### 0.4 取得 Firebase Config
1. 左側齒輪圖示 → 專案設定
2. 「您的應用程式」→ 新增 Web 應用
3. 暱稱：`travel-plan-web`，**不勾選 Firebase Hosting**
4. 複製 `firebaseConfig` 物件

#### 0.5 本地檔案準備
建立 `config.js`，貼入剛才複製的 config：
```javascript
window.firebaseConfig = {
  apiKey: "AIza...",
  authDomain: "xxx.firebaseapp.com",
  projectId: "xxx",
  storageBucket: "xxx.appspot.com",
  messagingSenderId: "xxx",
  appId: "1:xxx:web:xxx"
};
window.appId = "travel-plan-personal";
```

### 驗收條件
- [ ] Firebase Console 看得到 Authentication 與 Firestore
- [ ] `config.js` 已建立且填入正確金鑰
- [ ] Firestore 規則已發布

### 後續處理
本階段完成後，可以開始 Phase 1。Claude Code 不需要做這部分，但需要在 `docs/firebase-setup.md` 內保留完整教學供使用者操作。

---

## Phase 1 — 基礎架構

### 目標
建立 `index.html` 骨架，完成「規劃者 Google 登入」與「家人匿名加入」雙身分流程、五大頁面導航，可看到空的 Dashboard。

### 任務清單
1. **建立 `index.html` 骨架**
   - 引入 React 18, ReactDOM, Babel, Tailwind, Leaflet, Firebase v9 compat
   - 引入 `config.js`
   - 設定 `<title>智慧旅遊規劃書</title>`、`<meta viewport>` (mobile-friendly)
   - 建立 `<div id="root">` 與 `<script type="text/babel">` 區塊
   - 引入 `manifest.json`、`<link rel="manifest">`

2. **初始化 Firebase**
   - `firebase.initializeApp(window.firebaseConfig)`
   - 設定全域 `auth`, `db`, `appId = window.appId`

3. **身分判定流程（重點）**
   - 偵測 URL：是否含 `?family={code}`？
   - **有** → 觀看者模式 → `auth.signInAnonymously()` → 載入家人首次設定流程
   - **沒有** → 規劃者模式 → 若未登入，顯示 Google 登入畫面

4. **Google 登入流程（規劃者）**
   ```javascript
   const provider = new firebase.auth.GoogleAuthProvider();
   await auth.signInWithPopup(provider);
   ```
   - 取得 user.uid、user.displayName、user.email
   - 寫入 `users/{uid}/profile`（首次）
   - 自動產生 `familyShareCode`（如 `${displayName.toUpperCase().slice(0,6)}${year}`，並檢查唯一性）
   - 建立 `shared_family/{code}` 文件

5. **匿名登入流程（家人觀看者）**
   - `auth.signInAnonymously()`
   - 讀 `shared_family/{code}` 取得 `ownerUid`, `activeTripId`
   - 若 localStorage 無 profile → 跳首次設定 Modal（稱呼、圖示、顏色、位置開關）
   - 同步寫入：
     - localStorage（裝置記住）
     - `users/{ownerUid}/known_family/{currentUid}`（讓規劃者看得到）
     - `shared_trips/{activeTripId}/participants/{currentUid}`（即時位置）

6. **五大頁面導航**
   - 用 React state 控制 view: `dashboard | family_list | editor | mobile_view | settings`
   - URL hash 路由：
     - `#/` → Dashboard
     - `#/family` → 家人名單頁
     - `#/edit/{tripId}` → Editor
     - `#/trip/{tripId}` → 規劃者 Mobile View
     - `#/settings` → 設定頁
     - `?family={code}` → 家人模式（無論 hash 是什麼都先進觀看模式）

7. **Dashboard 元件（基本骨架）**
   - 頂部固定區：家庭分享連結（含複製、QR、LINE 分享按鈕）
   - 「+ 建立新計畫」按鈕
   - 行程分組：🟢 進行中 / 📅 即將前往 / 📜 歷史（折疊）
   - 右上角入口：👨‍👩‍👧 家人名單、⚙️ 設定
   - 即時監聽 `users/{uid}/trips`，依 `status` 與 `startDate` 排序分組

8. **家人 Mobile View 基本骨架**
   - 觀看者模式進來看到的第一個畫面
   - 顯示「Richie's Family」與當前行程標題
   - 若 `activeTripId === null` → 顯示「目前沒有進行中的行程」+ 歷史行程列表

### 驗收條件
- [ ] 規劃者首次開啟 → 看到「使用 Google 登入」按鈕
- [ ] 登入後自動產生 `familyShareCode` 並寫入 Firestore
- [ ] Dashboard 頂部顯示家庭分享連結，可複製
- [ ] 「建立新計畫」會在 Firestore 建立 trip 文件，預設 `status='draft'`
- [ ] Dashboard 即時顯示新計畫（用 onSnapshot）
- [ ] 從另一個瀏覽器開 `?family={code}` → 看到首次設定 Modal
- [ ] 家人填完稱呼後，規劃者的 known_family 即時新增此人
- [ ] 換到另一台電腦用同個 Google 登入 → 看到所有歷史行程
- [ ] 清除瀏覽器資料後重新登入 → 行程資料完整保留

---

## Phase 2 — 搜尋系統（核心競爭力）

### 目標
實作四層 fallback 搜尋，特別驗證「集元果觀光工廠」「集集車站」等台灣特色景點能搜得到。

### 任務清單

1. **觀光署資料庫下載與快取**
   - 首次開啟時呼叫觀光署 API 下載景點、餐廳、住宿
   - 精簡欄位：`{id, name, address, lat, lon, category, opening_hours}`
   - 過濾無座標的資料
   - 存於 localStorage key `tw_poi_cache`，並記錄 `lastUpdate`
   - 若已有快取且未過期（< 7 天） → 跳過下載
   - 提供 loading UI：「正在下載台灣景點資料庫...（首次需要 5-10 秒）」

2. **搜尋演算法實作**
   ```javascript
   function searchLocalPOI(query, twPOIs) {
     // 三層比對：精確 → 關鍵字 → 模糊
   }
   ```
   - 精確比對：`name === query`
   - 關鍵字比對：將 query 用空格切割，每個 token 都包含於 name 或 address
   - 模糊比對：部分字串符合

3. **整合 OSM Nominatim**
   - 當本地搜尋無結果時，呼叫 Nominatim
   - 預設加 `countrycodes=tw` 篩選台灣
   - 提供「全球搜尋」勾選選項

4. **Google Maps URL 解析**
   - 支援 `place/`、`dir/`、短網址 `goo.gl/maps`、`maps.app.goo.gl`
   - 用正則抓 `@lat,lon`
   - 短網址先 follow redirect
   - 解析失敗時提示使用者改貼完整網址

5. **地圖手動釘選**
   - 提供「在地圖上點選」按鈕
   - 切換為十字游標
   - 點擊地圖 → 反查地名 → 加入清單

6. **搜尋 UI**
   - 統一搜尋框，輸入後依序執行四層
   - 結果以卡片列出，標示來源（標籤如「觀光景點」「OSM 地址」「Google Maps」）
   - 點擊卡片 → 加入行程

### 驗收條件
- [ ] 第一次開啟自動下載觀光署資料（且顯示 loading）
- [ ] 搜尋「集集車站」找得到（觀光署）
- [ ] 搜尋「集元果觀光工廠」找得到（觀光署）
- [ ] 搜尋「南投縣集集鎮民生路 28 號」找得到（OSM）
- [ ] 貼上 Google Maps 連結能解析座標
- [ ] 在地圖上點擊能新增地點
- [ ] localStorage 已存 `tw_poi_cache` 並有 timestamp
- [ ] 重新整理後不再下載（快取生效）

---

## Phase 3 — 行程編輯（桌面優先）

### 目標
完整的桌面端行程編輯體驗。

### 任務清單

1. **Editor 視圖佈局**
   - 響應式雙欄（桌面）/ 上下欄（手機）
   - 左：搜尋框 + 行程清單
   - 右：Leaflet 地圖

2. **行程清單元件**
   - 顯示每個 Location（名稱、地址、預估停留時間、預約時間）
   - 拖拉排序（HTML5 drag and drop 或 react-beautiful-dnd）
   - 上移/下移按鈕（手機用）
   - 刪除按鈕
   - 點擊地點 → 地圖飛過去（`map.flyTo`）

3. **地圖視圖**
   - 顯示所有 Location 為 marker
   - 起點綠色、終點紅色、中間藍色
   - 點對點連線（先用 straight line，路徑計算在 Phase 5 完整化）
   - 自動縮放到所有 marker 範圍

4. **多天行程支援**
   - 頂部 Tabs：Day 1 / Day 2 / Day 3
   - 點 Tab 切換顯示對應日的 locations
   - 「+ 新增一天」按鈕
   - 刪除某天（含確認對話框）
   - 拖拉地點可跨天移動（進階，可後做）

5. **行程設定面板**
   - 計畫標題（可編輯）
   - 出發時間（time input）
   - 分享開關（toggle，開啟才產生 shareCode）

6. **儲存機制**
   - 自動儲存：locations 變更後 debounce 500ms 寫入 Firestore
   - 手動儲存按鈕（給安心感）
   - 儲存中 / 已儲存的狀態指示

7. **繞路警告**
   - 計算每個中途點是否造成路徑 > 直線 × 1.5 倍
   - 命中時顯示紅色「⚠️ 繞路警告」標籤

8. **祕密景點設定**（規劃者專屬）
   - 每個 Location 旁加「🎁」開關
   - 開啟時跳出輸入框：「家人看到的代號是？」預設「🎁 驚喜景點」，可改成「神秘晚餐」「秘境探險」等
   - 標記為祕密的 Location 在清單中加 🎁 emoji
   - 設定後同步寫入 Firestore，並更新 `shared_trips` 為遮蔽版本

9. **預計停留時間與時間鬆緊度**
   - 加入地點時依 category 自動帶入 `estimatedStayMinutes`：
     - restaurant: 90, scenic: 60, rest: 15, gas: 5, hotel: null(過夜), custom: 60
   - 每個 Location 旁可手動調整停留時間
   - 自動計算抵達/離開時間（從 `departureTime` 起，串接各段 OSRM 時間 + 停留時間）
   - 在 Editor 頂部顯示鬆緊度標籤：🟢 充裕 / 🟡 緊湊 / 🟠 過滿 / 🔴 不可行
   - 各站旁顯示「抵達 09:30 → 離開 10:30」
   - 若某站預估抵達超過營業時間 → 該站旁紅色警示
   - 若預約時間 vs 預估抵達 > 0 → 紅色「將遲到 X 分」

10. **必去 / 可選 標籤**
    - 每個 Location 旁可切換 ⭐ 必去 / 可選（預設可選）
    - 必去顯示金色 ⭐

11. **行程總備註欄**
    - Editor 頂部或側邊一個 textarea
    - 寫入 `Trip.notes`，自動儲存

12. **景點備註與電話**
    - 每個 Location 可展開填寫 `notes`（自由文字）與 `phone`（電話）
    - 電話格式自動驗證（台灣格式）
    - UI 顯示時電話為可點擊 `tel:` 連結

13. **費用統計（Editor 端）**
    - 行程頂部「💰 費用」按鈕開啟費用面板
    - 列出 `Trip.expenses` 與按類別統計
    - 「+ 新增費用」表單：金額、類別、是否已付、備註、可選綁定地點
    - 每個 Location 下方亦有「💰 加費用」快捷按鈕（自動帶入 `relatedLocationId`）
    - **觀看者完全看不到此區塊**（透過 `ownerUid === currentUid` 判定）
    - 同步到 `shared_trips` 時自動過濾 `expenses` 欄位

14. **本次參與家人勾選**
    - Editor 右側面板列出 `known_family` 所有成員
    - 每個成員旁有 ☑ checkbox，控制 `trip.activeMembers` 陣列
    - 新加入的家人預設勾選
    - 勾選狀態變更即時寫入 Firestore
    - 旁邊顯示「邀請更多家人」按鈕（複製分享連結 / QR）

15. **共享相簿欄位**
    - Trip 設定區加「📷 共享相簿」區塊：
      - 「一鍵複製建議相簿名稱」按鈕（複製 `{startDate} {title}` 到剪貼簿）
      - 教學步驟：開 Google Photos → 建相簿 → 複製連結
      - 連結貼上欄位 → 寫入 `Trip.sharedAlbumUrl`
      - 顯示文字欄位（可選）→ 寫入 `Trip.sharedAlbumLabel`

16. **行程狀態管理**
    - Trip 設定有 `status` 下拉選單：draft / active / completed / archived
    - 預設 'draft'
    - 出發日當天或手動切到 'active'
    - 系統可選自動將 'active' 切 'completed'（最後一站抵達 + 24 小時後）
    - 'archived' 從 Dashboard 主要列表移除，但歷史區仍可看到

### 驗收條件
- [ ] 可建立新計畫，輸入標題與出發時間
- [ ] 可加入多個地點，地圖即時更新
- [ ] 拖拉可調整順序
- [ ] 可新增 Day 2, Day 3 分頁
- [ ] 跨天切換地點顯示正確
- [ ] 修改後自動儲存，重整頁面內容保留
- [ ] 繞路時亮警示
- [ ] 在小螢幕（< 768px）佈局自動切換為手機版
- [ ] 可將景點設為祕密景點，自訂家人看到的代號

---

## Phase 4 — 手機查看模式（旅程中）

### 目標
手機優先的旅程進行中視圖，即時顯示行程進度、下一站資訊、沿途推薦。

### 任務清單

1. **Mobile Trip View 元件**
   - 觸發條件：手機開啟自己的計畫，或開啟分享連結
   - 全螢幕佈局，無 sidebar

2. **頂部導航卡片**
   - 大字顯示下一站名稱
   - 距離 + 預估抵達時刻（如 `14:30 抵達`）
   - 開始/結束導航按鈕

3. **行程進度條**
   - 視覺化的圓點進度（如 `●●●○○○○○ 3/8 站`）
   - 點擊任一圓點可跳到該站詳細
   - 顯示「預計 17:00 抵達終點」

4. **GPS 抵達自動判定**
   - `watchPosition` 監聽位置變化
   - 距離下一站 < 500m 持續 30 秒 → 自動更新 `currentLocationIndex`
   - 同時上傳 `currentStatus` 到 Firestore

5. **沿途推薦景點**
   - 計算當前位置到下一站的路徑
   - 用 Overpass API 查詢路徑沿途 5km 內的：
     - 觀光景點（tourism=attraction）
     - 餐廳（amenity=restaurant）
     - 廁所（amenity=toilets）
     - 加油站（amenity=fuel）
   - 分類顯示，每類最多 3-5 個
   - 點擊「加入順遊」 → 加進主行程（規劃者才能加）

6. **預估時間計算**
   - 用 OSRM 計算各段路徑時間
   - 加上每站預估停留時間（預設 60 分，可設）
   - 計算全程預估完成時間

7. **即時更新**
   - 每 15 秒重新計算「下一站預估抵達」
   - 監聽 Firestore 變化（規劃者改動）

8. **祕密景點處理**
   - 讀取行程資料時，依當前使用者身分判定顯示
   - 觀看者：若 `isSurprise && !revealedAt` → 名稱顯示為 `surpriseAlias`，遮蔽 address/opening_hours，地圖 marker 改 🎁 圖示
   - 觀看者：仍可看到距離、預估抵達時間（保有期待感）
   - 規劃者：永遠看真實名稱，並顯示「🎁 家人看到：XXX」提示
   - 自動揭曉：當 GPS<500m 觸發抵達時，同時設定 `revealedAt`
   - 揭曉後家人手機 UI 用動畫過渡顯示真實名稱

9. **規劃者手機快速編輯模式**
   - 規劃者 Mobile Trip View 右上角加「✏️」按鈕（觀看者隱藏）
   - 切換進入編輯狀態（同一視圖內，不跳頁）
   - 編輯模式新增 UI：
     - 頂部「+ 搜尋並加入景點」搜尋框
     - 行程列表每個地點旁顯示 ⬆⬇🗑 按鈕
     - 祕密景點旁顯示「✨ 提前揭曉」按鈕（按下設定 `revealedAt`）
     - 底部「✅ 完成編輯」按鈕
   - 編輯動作即時同步 Firestore
   - 完成後切回查看模式

### 驗收條件
- [ ] 手機開啟看到全螢幕導航卡片
- [ ] 進度條正確顯示目前位置
- [ ] 抵達 500m 內自動切換到「已抵達」狀態
- [ ] 沿途推薦列表正確分類顯示
- [ ] 預估抵達時間動態更新
- [ ] 切換到下一站後預估時間重算
- [ ] 桌面開啟自動切回 Editor 視圖（除非強制 mobile mode）
- [ ] 觀看者看到祕密景點為遮蔽名稱，但仍有距離與時間
- [ ] 觀看者地圖上祕密景點 marker 為 🎁 圖示
- [ ] 抵達祕密景點自動揭曉真實名稱，家人手機即時更新
- [ ] 規劃者可手動按「✨ 提前揭曉」立刻公開
- [ ] 規劃者手機端可進入快速編輯，加入新景點、調順序、刪除
- [ ] 編輯動作即時同步到家人手機

---

## Phase 5 — 多人同步與 GPS 共享

### 目標
完整實作家庭永久分享碼、known_family 自動建立、家人名單頁管理、活躍行程切換、多人位置同步。

### 任務清單

1. **家庭永久分享碼**
   - Phase 1 已建立 `familyShareCode`，本階段完成相關 UI 與 sync 邏輯
   - 規劃者 Dashboard 頂部固定顯示分享連結
   - 提供「複製連結」、「QR Code」、「分享到 LINE」三種快速操作
   - 同步寫入 `shared_family/{code}`，更新 `activeTripId`（指向目前 active 行程）

2. **known_family 自動建立**
   - 任何家人首次點 `?family={code}` 並完成設定後
   - 用 `participantUid` 在 `users/{ownerUid}/known_family/{participantUid}` 建立文件
   - 寫入 nickname, icon, color, firstSeenAt, lastSeenAt
   - 後續每次該家人開啟 → 更新 lastSeenAt、totalTrips（透過 cloud function 或客戶端邏輯）

3. **家人名單頁元件**
   - URL: `#/family`
   - 列出 `known_family` 所有成員，依 totalTrips 與 lastSeenAt 排序
   - 每位顯示：圖示、稱呼、累計次數、最後活動時間
   - 操作：✏️ 編輯（改稱呼/顏色，會同步到本人 profile）、🗑️ 移除
   - 偵測重複（同 nickname 不同 UID）顯示「可能是同一人 [合併?]」提示
   - 頂部固定顯示家庭分享連結

4. **觀看者首次加入流程**（從 Phase 1 延伸）
   - URL `?family={code}` 進入
   - 若 localStorage 無 profile → 跳出設定畫面：
     - 稱呼輸入框
     - emoji 圖示選擇（🚙🚗🚐🛻🏍🚌）
     - 顏色選擇（6 色）
     - 「分享我的位置」開關
   - 完成後同時寫入：
     - localStorage（裝置記住）
     - `known_family/{uid}`（規劃者名冊）
     - 若有 `activeTripId`，也寫入 `shared_trips/{tripId}/participants/{uid}`

5. **本次參與家人篩選邏輯**
   - 讀取 `trip.activeMembers` 陣列
   - 觀看者進入後，比對自己 UID 是否在 activeMembers 中
   - 不在 → 顯示「您不在本次行程的參與者中，僅能查看行程」+ 不上傳位置
   - 在 → 正常上傳位置、出現在多人位置列表

6. **位置上傳機制**
   - `navigator.geolocation.watchPosition`
   - 寫入 `participants/{uid}`
   - 移動中（GPS 變化 > 100m）：每 30 秒更新
   - 靜止 > 5 分鐘：改為每 2 分鐘
   - 關閉位置分享：刪除 lat/lon，保留 nickname

7. **活躍行程切換**
   - 規劃者切換 `trip.status` 為 'active' 時：
     - 更新 `shared_family/{code}.activeTripId` 為該 tripId
     - 家人 PWA 開啟時自動載入此行程

8. **多人位置 UI**
   - 顯示所有 participants 的 emoji + 稱呼
   - 「最後更新：X 分鐘前」（強調 GPS 限制）
   - 點擊某人 → 地圖飛到該位置
   - 地圖上每個參與者一個 marker，色彩依個人 profile

9. **緊急重設家庭分享碼**
   - 設定頁加「重設家庭分享碼」按鈕
   - 二次確認後執行：
     - 刪除舊 `shared_family/{舊碼}`
     - 產生新 `familyShareCode`
     - 建立 `shared_family/{新碼}`
     - 更新 `profile.familyShareCode`
   - 舊碼立即失效

### 驗收條件
- [ ] Dashboard 頂部固定顯示家庭分享連結
- [ ] 複製、QR、LINE 三按鈕功能正常
- [ ] 在另一瀏覽器開 `?family={code}` 觸發首次設定
- [ ] 完成後 known_family 即時新增該家人
- [ ] 家人名單頁正確顯示所有家人
- [ ] 編輯家人稱呼後，行程內顯示也同步更新
- [ ] 移除家人會從 known_family 刪除
- [ ] 規劃者切換 active 行程後，家人 PWA 自動載入新行程
- [ ] 不在 activeMembers 的家人開啟 → 顯示「僅查看」提示
- [ ] 在 activeMembers 的家人開啟 → 位置正常上傳
- [ ] 重設家庭分享碼後舊連結失效

---

## Phase 6 — PWA 化

### 目標
讓家人可以把工具「加到主畫面」，像 APP 一樣使用。

### 任務清單

1. **建立 `manifest.json`**
   - 內容見 `CLAUDE.md` 第 9 節
   - 名稱：智慧旅遊規劃書
   - icon 192x192, 512x512（PNG）

2. **建立 PWA 圖示**
   - 可用 favicon.io 或 realfavicongenerator.net 產生
   - 主題色 #3b82f6（藍）

3. **建立 `service-worker.js`**
   - 註冊 SW
   - 快取核心檔案：HTML, CDN scripts
   - Cache First 策略（OSM tiles 不快取避免佔用空間）

4. **在 `index.html` 註冊 SW**
   ```javascript
   if ('serviceWorker' in navigator) {
     navigator.serviceWorker.register('./service-worker.js');
   }
   ```

5. **「加入主畫面」提示**
   - 監聽 `beforeinstallprompt` 事件
   - 適當時機顯示「加到主畫面」按鈕（觀看者首次設定完成後）

6. **預下載路線地圖**
   - Dashboard 與 Editor 每個 Trip 旁加「📥 預下載地圖」按鈕
   - 點擊後計算行程沿線涵蓋的 OSM 圖磚：
     - 依各 Location 座標計算 bounding box
     - 加上沿線緩衝（5km 寬走廊）
     - 多個 zoom level（10、12、14、16）
   - 用 fetch 逐張下載並存入 IndexedDB（不是 localStorage，避免容量上限）
   - 顯示進度條（已下載 X / 總共 Y 張，預估剩餘時間）
   - Service Worker 在 fetch 攔截 OSM tile 請求：
     - 先查 IndexedDB → 命中直接回傳（離線可用）
     - 未命中 → 從網路下載並順便存入 IndexedDB
   - 提供「清除地圖快取」按鈕（行程結束後手動清）

7. **觀光署 POI 資料快取背景更新**
   - Phase 2 完成基本下載，本階段加上背景自動更新
   - 在 SW 中註冊 `periodic-sync`（若瀏覽器支援）或在 APP 啟動時檢查
   - 若 lastUpdate > 7 天 → 背景下載新版 POI 並更新 localStorage

### 驗收條件
- [ ] Lighthouse PWA 檢查通過
- [ ] Android Chrome 開啟後跳出「加到主畫面」提示
- [ ] 加入主畫面後從桌面圖示開啟為全螢幕模式
- [ ] 重複開啟速度明顯變快（SW 快取生效）
- [ ] 「📥 預下載地圖」按下後顯示進度條
- [ ] 下載完成後切換為飛航模式，地圖仍可顯示已快取區域
- [ ] 觀光署 POI 每 7 天背景更新一次

---

## Phase 7 — 加分功能

### 目標
完成已決定的三項加分功能：行程複製、PDF 匯出、預約提醒。

### 7.1 行程複製
- Dashboard 每個計畫卡片右上角加「複製」icon
- 點擊 → 確認對話框 → 複製 trip 文件
- 清空 `arrivedAt`、`currentStatus`、`shareCode`
- 標題前加「(複製)」

### 7.2 PDF 匯出
- 引入 `jspdf` 與 `html2canvas`（CDN）
- Editor 工具列加「匯出 PDF」按鈕
- 產出內容：
  - 標題、出發時間
  - 各站名稱、地址、營業時間、預估抵達時間
  - 地圖縮圖（用 Leaflet `screenshoter` 或 html2canvas）
  - QR Code（指向分享連結）
- A4 直式版型，繁體中文支援

### 7.3 預約提醒
- Location 物件加 `reservation: { time, party }` 欄位
- Editor 中每個地點可展開「設定預約」
- 計算「預估抵達 vs 預約時間」
- 紅警示：將遲到（預估 > 預約）
- 黃提示：太早到（預估 < 預約 - 30 分鐘）
- 行程中（Mobile View）即時警示

### 7.4 天氣預報（Dashboard）
- 註冊中央氣象署開放資料平台：https://opendata.cwa.gov.tw
- 取得免費 API Key，加到 `config.js`：`window.cwaApiKey`
- API 呼叫：一週天氣預報 `F-C0032-001` 或鄉鎮天氣預報 `F-D0047-091`
- 依當前位置（或行程起點）取得對應縣市/鄉鎮代碼
- Dashboard 顯示：
  - 今日天氣（規劃者位置）
  - 即將出發行程的當日天氣（若 startDate 在 7 天內）
- UI 元素：圖示（☀️🌤️⛅🌧️）、氣溫範圍、降雨機率
- 失敗時不顯示天氣區塊（不影響主功能）

### 7.5 共享相簿引導
- Editor Trip 設定頁加「📷 共享相簿」區塊：
  - 「一鍵複製建議相簿名稱」按鈕（複製 `{startDate} {title}` 到剪貼簿）
  - 教學步驟條列：
    1. 開啟 Google Photos APP 或網頁
    2. 點「相簿」→「+」→「共用相簿」
    3. 貼上建議名稱
    4. 點「分享」→ 複製連結
    5. 貼回此處
  - 連結欄位 → 寫入 `Trip.sharedAlbumUrl`
- Mobile View 加「📷 上傳照片」按鈕（規劃者與家人都看得到）：
  - 點按鈕在新分頁開啟 sharedAlbumUrl
  - 行程結束時自動跳大提示

### 驗收條件
- [ ] 可成功複製計畫，新計畫獨立可編輯
- [ ] PDF 匯出排版正確，中文不亂碼
- [ ] PDF 內 QR code 可掃描開啟分享連結
- [ ] 預約遲到警示正確觸發
- [ ] Dashboard 顯示當日天氣（成功取得 CWA 資料）
- [ ] 共享相簿教學引導完整，可一鍵複製建議名稱
- [ ] 貼上連結後 Mobile View 顯示「📷 上傳照片」按鈕
- [ ] 點按鈕能正確開啟 Google Photos 連結

---

## Phase 8 — 部署上線

### 目標
工具上線到 GitHub Pages，取得固定網址，全家可用。

### 任務清單

#### 8.1 準備檔案
- 確認 `config.js` 已填入正確 Firebase config
- 確認 `manifest.json`、`service-worker.js` 在根目錄
- 確認 PWA 圖示存在

#### 8.2 GitHub 倉庫
1. 在 GitHub 建立 repository（建議命名 `travel-plan` 或 `travelplan`）
2. 設為 Public（GitHub Pages 免費版需要）
3. 透過 VS Code Git 介面 push 全部檔案
4. **重要**：在 `.gitignore` 加入 `config.js`（避免 Firebase 金鑰外洩）
   
   但這會造成 GitHub Pages 上的版本沒有 config.js → 改用以下其中一種策略：
   
   - **策略 A（建議）**：將 Firebase 金鑰直接 commit 進 `config.js`。Firebase Web 金鑰本來就是公開的，安全性靠 Firestore Rules 保證
   - **策略 B**：建立 private repo（GitHub Free 不支援 Pages on private，需 Pro）

#### 8.3 啟用 GitHub Pages
1. Repository → Settings → Pages
2. Source: Deploy from a branch
3. Branch: `main` / `(root)`
4. Save
5. 等 1-2 分鐘，網址生效（`https://{username}.github.io/{repo}/`）

#### 8.4 Firebase 授權網域
1. Firebase Console → Authentication → Settings → Authorized domains
2. 加入 GitHub Pages 網址（如 `richie.github.io`）
3. **重要**：若用自訂網域也要加入，否則 Google 登入會被阻擋

#### 8.5 OAuth 同意畫面（Google Sign-in 用）
1. Google Cloud Console → APIs & Services → OAuth consent screen
2. User Type: External
3. App name: 智慧旅遊規劃書
4. 加入您的 email 作為支援聯絡
5. Scopes 不需要額外加（預設 email/profile 即可）
6. Test users：加入您與朋友的 Google 帳號（External + Testing 模式上限 100 人）

#### 8.6 測試清單
- [ ] 桌面 Chrome 開啟網址，能用 Google 登入並建立計畫
- [ ] 手機 Chrome 開啟同網址，能用 Google 登入
- [ ] 加到主畫面後從圖示開啟運作正常
- [ ] 分享 `?family={code}` 連結傳給家人，家人能匿名加入
- [ ] 家人加到主畫面後再次開啟 → 直接看到當前行程
- [ ] 多人 GPS 同步正常（規劃者切到 active 行程後家人看到位置）
- [ ] 切換不同電腦用同個 Google 登入 → 歷史行程完整保留

### 驗收條件
- [ ] GitHub Pages URL 正常開啟
- [ ] PWA 安裝測試成功
- [ ] 至少 2 個裝置同時開啟可看到彼此位置
- [ ] 觀光署資料庫下載正常
- [ ] 搜尋集集車站、集元果等景點成功

---

## Phase 9 — 上線後改版

### 目標
記錄上線後實際使用發現的 UX 問題與優化項目，依優先度排程處理。
**本階段為持續累積，每完成一項就在驗收條件打勾並標日期。**

### 9.1 LINE 內建瀏覽器偵測與引導

**問題情境**（2026-05-17 上線測試後發現）
- 將分享連結 `?family={code}` 貼到 LINE 群組給家人
- 家人在 LINE 點連結 → 預設用 LINE 內建瀏覽器（LIFF browser）開啟
- LINE 內建瀏覽器**不支援 PWA 安裝**（沒有「加到主畫面」橫幅）
- 也不支援 Service Worker、Google OAuth 不穩定
- 結果家人能看到行程，但無法享受 APP 體驗（違背專案核心訴求）

**目前的暫時解法**
- 用 QR Code 分享（家人掃碼直接開 Chrome，繞過 LINE 瀏覽器）
- 或請家人手動點 LINE 瀏覽器右上 ⋮ → 「在外部瀏覽器開啟」

**本任務要做的事**

1. **偵測 LINE 內建瀏覽器**
   - 用 `navigator.userAgent` 判斷字串包含 `Line/`
   - 同步檢測其他常見 in-app browsers（FB Messenger、Instagram、WeChat 等）
   - 提供統一的 `isInAppBrowser()` helper function

2. **顯示醒目橫幅**
   - 偵測到 in-app browser 時，頁面頂部出現紅色 / 黃色橫幅：
     ```
     ⚠️ 您正在 LINE 內開啟，無法安裝為 APP
     [👉 在外部瀏覽器開啟] 按鈕（教學動畫或圖示）
     ```
   - 橫幅持續顯示（不可關閉），直到使用者切換到外部瀏覽器
   - Android：點按鈕嘗試呼叫 `intent://...#Intent;...end;` 強制跳 Chrome
   - iOS：顯示靜態圖示教學「點右上 ⋯ → Safari 開啟」

3. **隱藏無效的 PWA 安裝按鈕**
   - 偵測到 in-app browser 時，Dashboard 上方「加到主畫面」橫幅自動隱藏
   - 避免使用者點了沒反應而困惑

4. **複製連結快速操作**
   - 橫幅內提供「📋 複製此網址」按鈕
   - 家人可貼到 Chrome 網址列開啟

5. **使用者教育文案**
   - 在 Dashboard「家庭分享連結」區塊加說明文字：
     ```
     💡 提示：若家人用 LINE 點連結，請告知他們點右上 ⋮ 
     →「在外部瀏覽器開啟」才能完整使用 APP 體驗
     ```
   - 提供「📋 複製含教學文字的訊息」一鍵複製按鈕（連結 + 教學步驟組合）

**實作位置**
- `index.html` 加 `isInAppBrowser()` helper（放在 utils 區塊）
- 全域 React state `inAppBrowser`，在 App 元件 mount 時偵測
- 條件渲染 `<InAppBrowserBanner />` 元件（觀看者模式與規劃者模式都顯示）
- Dashboard 元件加分享連結說明文字 + 一鍵複製教學訊息

### 驗收條件
- [ ] 在 LINE 內建瀏覽器開啟測試網址 → 看到紅色橫幅警示
- [ ] 「在外部瀏覽器開啟」按鈕在 Android 能成功跳 Chrome
- [ ] iOS 版本顯示對應教學圖示（無法自動跳轉但有引導）
- [ ] FB Messenger、Instagram 內建瀏覽器也能偵測（測試 user-agent）
- [ ] 正常 Chrome / Safari 開啟不顯示橫幅
- [ ] Dashboard 顯示複製含教學文字的訊息按鈕

---

## 測試策略

### 手動測試
每個 Phase 完成後，依驗收條件逐項測試。

### 重點測試情境
1. **首次使用情境**：清空 localStorage 與 Firestore 後，能順利進入並設定
2. **網路中斷情境**：4G 訊號弱時 UI 是否會卡住（要有 timeout）
3. **多裝置同步情境**：兩台手機同時開分享連結看效果
4. **重新整理情境**：任何階段重新整理頁面，狀態能正確恢復

### 開發過程中除錯工具
- Chrome DevTools → Application → Storage 觀察 localStorage
- Firebase Console → Firestore 直接看資料變化
- DevTools → Console 不應出現紅色錯誤

---

## 開發注意事項（給 Claude Code）

1. **不要破壞已通過驗收的功能**：開發新 Phase 時若需修改舊功能，先確認不影響原功能
2. **善用 commit message**：每完成一個小功能 commit 一次，方便回滾
3. **保持單檔架構**：除了 manifest.json / service-worker.js / config.js / docs/ 之外，所有程式碼集中在 `index.html`
4. **CSS 用 Tailwind class**：不要寫客製 CSS（除非 Leaflet 必需）
5. **效能注意**：
   - 觀光署資料庫可能超過 1MB，要 lazy load
   - `watchPosition` 不要回呼太頻繁
   - Firestore 監聽結束時要 `unsubscribe`
6. **錯誤訊息中文化**：給使用者看的訊息用繁體中文，給開發者看的 console log 用英文

---

## 文件維護

- 開發過程若有重大決策變更，請同步更新 `CLAUDE.md`
- 各 Phase 完成後在本 `PROCESS.md` 對應的驗收條件 checkbox 打勾
- 若新增/變更 Firebase 資料結構，務必同步更新 `CLAUDE.md` 第 6 節

---

**最後更新**：2026-05-16
