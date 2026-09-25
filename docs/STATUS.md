# 開發進度 — 2026-05-17

> 跨對話的狀態交接文件。新對話可以從這裡接續工作。

---

## 整體進度

| Phase | 狀態 | 摘要 |
|---|---|---|
| Phase 0 環境準備 | ✅ 完成 | Firebase + Firestore Rules + config.js |
| Phase 1 基礎架構 | ✅ 完成 | Google 登入、匿名觀看者、家庭分享碼、Dashboard、家人加入流程 |
| Phase 2 搜尋系統 | ✅ 完成 | 觀光署 POI、四層 fallback、Google Maps URL 解析 |
| Phase 3 行程編輯 | ✅ 完成 | Editor 全功能（含 3A 骨架、3B 智慧時間、3C 三件套+額外） |
| Phase 4 手機旅程模式 | ✅ 完成 | PlannerMobileView、下一站卡、沿途推薦、快速編輯 |
| Phase 5 多人同步 | ✅ 完成 | shared_trips 同步、Viewer 完整、GPS 上傳、多人位置、家人名單管理 |
| Phase 6 PWA | ⚠️ 程式碼完成，部署後驗證 | manifest、SW、預下載、安裝/更新提示 |
| Phase 7 加分功能 | ✅ 完成 | 行程複製、PDF 匯出、（預約警示與相簿在 3B/3C）<br>~~CWA 天氣~~ 已於 2026-09-25 移除 |
| **Phase 8 部署** | ⏳ **下一步** | 見 `docs/deployment.md` |

---

## 各 Phase 完成功能明細

### Phase 0/1 — 基礎
- Google 登入（規劃者）、匿名登入（家人觀看者）
- 自動產生家庭永久分享碼 `{NAME}{YEAR}`
- Hash 路由：`#/` / `#/family` / `#/edit/{id}` / `#/trip/{id}` / `#/settings`
- Dashboard：家庭分享連結、建立計畫、行程分組（進行中/草稿/歷史）
- 家人首次設定 Modal：稱呼/圖示/顏色/位置開關
- 跨裝置 Google 同帳號 → 看到所有歷史行程

### Phase 2 — 搜尋
- 觀光署景點/餐廳/住宿三 API → 合併 24,842 筆 POI → localStorage 快取（7 天 TTL）
- 四層 fallback：精確 → 包含 → 2-gram 模糊（80% 門檻）→ OSM Nominatim
- Google Maps URL 解析（支援 google.com / google.com.tw / `!3d!4d` 真實座標 / `/place/` 地址）
- 地圖點選（Leaflet）
- 「🔗 在 Google Maps 找」快捷鈕（救援用）

### Phase 3 — 行程編輯
**3A 骨架**：標題編輯、Day Tabs、Leaflet 地圖、自動儲存、刪除行程
**3B 智慧時間**：
- OSRM 道路時間 + geometry（沿路藍線）
- 鬆緊度標籤（充裕/緊湊/過滿/不可行）
- 繞路警告（中間站 via/direct > 1.5×）
- 預約警示（將遲到 / 太早）
- 預估停留時間（依 category 預設）、必去/可選、預約時間、電話、備註
- 多日獨立出發時間（per-day `departureTime`）
- 出發地點 origin（住家/目前位置/自訂；Day N>1 自動繼承前一天最後一站）

**3C 三件套+額外**：
- 💰 費用統計（7 類別、預計/已付、可綁地點、規劃者私有）
- 拖拉排序（HTML5 drag-and-drop + ↑↓ 備援）
- 🎁 祕密景點（alias 別名、提前揭曉）
- 📷 共享相簿欄位（教學引導、一鍵複製建議名稱）
- 👨‍👩‍👧 本次參與家人勾選（綁定 `trip.activeMembers`）
- 行程總備註

### Phase 4 — 手機旅程模式
- PlannerMobileView：標題、Day Tabs、進度條、鬆緊度、下一站大卡
- 手動狀態：✅ 我到了 / ⏭️ 跳過 / ↶ 撤回 / 🚗 導航（開 Google Maps）
- 抵達祕密景點自動揭曉 `revealedAt`
- 今日清單緊湊版（顯示電話、備註、費用）
- 🧭 沿途推薦（Overpass API 查下一站 3km 內餐廳/景點/廁所/加油站 → 一鍵加入順遊）
- ✏️ 快速編輯模式（搜尋加入、↑↓🗑、揭曉祕密）
- 💰 費用面板（與 Editor 同元件）
- 📷 共享相簿入口

### Phase 5 — 多人同步
- shared_trips 寫入機制：每次更新 trip 自動同步公開快照（過濾 expenses、祕密景點以 alias 顯示）
- activeTripId 指針：trip 切 active 自動更新 `shared_family/{code}.activeTripId`
- ViewerMobileView 完整：唯讀渲染、Day Tabs、下一站、進度、清單、共享相簿
- GPS 上傳 hook（規劃者 + 家人皆上傳）：100m 移動 + 30s/120s 限流規則
- ParticipantsBar：頂部摺疊式多人列表，emoji + 顏色 + 「最後更新 X 分鐘前」
- FamilyListPage 完整：改稱呼/顏色/圖示、移除家人、偵測重名警告
- ⚙️ 設定頁「🔁 重設家庭分享碼」（雙重確認、新碼 + 刪舊碼）
- 不在 activeMembers 的家人：頂部黃色警告「您不在參與名單」+ GPS 不上傳

### Phase 6 — PWA（程式碼完成，部署後測試）
- manifest.json（含 icons、display:standalone）
- icon-192.svg / icon-512.svg（藍漸層 + 🚙 emoji，maskable）
- service-worker.js：Cache First 策略，OSM 圖磚單獨快取分區
- SW 在 localhost 自動 unregister + 清快取（dev 友善）
- SW 只在 https 部署環境啟用
- PwaPromptBanner：beforeinstallprompt 觸發「安裝」橫幅
- SW 更新提示：偵測到新版顯示「重新整理」橫幅
- 預下載地圖：每張 TripCard「📥」按鈕 → modal 顯示圖磚數量、預估容量 → 透過 SW message 寫入 Cache → 進度條 + 清除快取

### Phase 7 — 加分功能
- 📋 行程複製：清掉狀態/抵達/費用/揭曉，標題加「(複製)」
- 📄 PDF 匯出：開新分頁列印版 → window.print() → 儲存為 PDF（中文系統字型完美）
- ✅ 預約遲到/太早警示（Phase 3B 已做）
- ✅ 共享相簿引導（Phase 3C 已做）

---

## ⏳ Phase 8 — 待您執行

依 [`docs/deployment.md`](deployment.md) 步驟：

1. 建立 GitHub public repo
2. `git init` → `git add .` → `git commit` → `git push`
3. Settings → Pages → 啟用 main / root
4. Firebase Console → Authorized domains 加 `{username}.github.io`
5. Google Cloud Console → OAuth consent screen → Test users 加自己 email
6. 用部署網址驗證 Google 登入、家庭分享、PWA 安裝、預下載地圖

---

## 🐛 已知 / 待後續處理

| 項目 | 嚴重度 | 描述 |
|---|---|---|
| GPS 抵達自動判定未做 | 中 | 規格說「距下一站 < 500m 持續 30 秒自動標 visited」，目前只能手動「✅ 我到了」。Phase 5 沒做（怕 GPS 在路上不穩誤判）。要做的話可加 throttle 後在 PlannerMobileView 加 useEffect 監聽自己上傳的位置 |
| 新家人 join 不會自動加入現有 trip 的 activeMembers | 低 | 若 `trip.activeMembers` 是明確陣列（不是 null/undefined），新加入的家人不會自動入隊。規劃者要在 Editor「本次參與家人」勾選。可在 `handleFamilySetupComplete` 順手加進去 |
| PWA 圖示是 SVG 不是 PNG | 低 | SVG 在某些舊裝置可能不認，正式上線可用 [favicon.io](https://favicon.io) 產 PNG 取代 |
| Service Worker 版本 hard-coded | 低 | 每次重大更新要手動改 `VERSION = '1.0.x'`，可考慮自動產生（如 commit hash） |
| OSM tile 限流 | 低 | 大量預下載偶爾 429。modal 已說明，重試即可 |

---

## 📐 重要技術決策（避免新對話重新討論）

1. **PDF 用 window.print() 而非 jsPDF**：免外部套件、中文系統字型完美、所見即所得
2. ~~**CWA 天氣端點選 F-C0032-001**~~：功能已於 2026-09-25 整塊移除（見 CLAUDE.md）
3. **shared_trips 寫入時機**：每次 `updateTrip` 後自動同步 + 初次載入 Editor/MobileView 也同步一次
4. **GPS 上傳限流**：100m + 30s/120s 規則，平衡省電與即時
5. **祕密景點過濾**：在規劃者側（`buildSharedTripSnapshot`）就過濾掉真名/地址，viewer 端拿到的本就是 alias
6. **Live Server 注入問題**：source 不要寫完整 `</body>` 字面（包括註解），改用拼接 `'<' + '/body>'`
7. **config.js 公開無妨**：Firebase key 是 Web 公開設計，安全靠 Rules。
   ⚠️ 原本這條把 CWA key 一起算進來是**錯的**——CWA key 是憑證不是識別碼，
   與 CLAUDE.md 的金鑰分級表（標為 🟠 建議不要）互相矛盾。
   2026-09-25 移除天氣功能後此爭議消失。

---

## 📂 檔案結構

```
旅遊計劃書/
├── CLAUDE.md             # 專案規格（單一事實來源）
├── PROCESS.md            # 開發流程（按 Phase 列驗收）
├── index.html            # 主應用（單檔架構，~5700 行）
├── config.js             # Firebase 設定（已 commit，公開無妨）
├── manifest.json         # PWA manifest
├── service-worker.js     # PWA SW
├── icon-192.svg          # PWA 圖示
├── icon-512.svg          # PWA 圖示
├── .gitignore
└── docs/
    ├── firebase-setup.md # Firebase 一次性設定教學
    ├── deployment.md     # ★ Phase 8 部署教學（本次新增）
    └── STATUS.md         # ★ 本檔案
```

---

## 💡 新對話開始時建議的第一步

1. 讓 Claude 先讀 `CLAUDE.md`、`PROCESS.md`、`docs/STATUS.md`
2. 告訴 Claude 您現在的位置（部署到哪一步、有無遇到問題）
3. 如果是部署後測試出現 bug，把 console error 截圖貼給 Claude
4. 如果要繼續開新功能，從「待後續處理」清單挑一個說「請繼續做 X」

---

**最後更新**：2026-05-17  
**累積完成**：Phase 0-7 全功能 + Phase 8 部署教學  
**累積 commit 數**：3（phase 0/1/2，後續本機未 commit）  
**index.html 行數**：~5700  
**累積開發時間**：1.5 天（5/16-5/17）
