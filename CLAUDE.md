# CLAUDE.md — 智慧旅遊規劃書 專案規格書

> 本文件是給 Claude Code（VS Code）的工作指引，包含本專案的完整脈絡、技術選型與設計決策。
> 開發時請以本文件為單一事實來源（Single Source of Truth）。
> 開發流程請另行參考 `PROCESS.md`。

---

## 1. 專案概覽

| 項目 | 內容 |
|------|------|
| 專案名稱 | 智慧旅遊規劃書 |
| 專案類型 | 單檔 Web App（Single File Application） + PWA |
| 主要使用者 | Richie（規劃者）+ 家人（觀看者，多人） |
| 規劃裝置 | 桌面瀏覽器（Chrome / Edge） |
| 旅程中裝置 | Android 手機（全家皆為 Android） |
| 部署平台 | GitHub Pages（已決定） |
| 預算 | 完全免費、零綁卡 |

## 2. 專案緣由

### 使用者痛點
1. 每次帶家人外出旅遊，要在 Google Maps 上手動輸入所有景點，列印麻煩
2. 過去嘗試的 OSM 方案搜不到「集元果觀光工廠」、「集集車站」等台灣特色景點
3. Google Maps Places API 要綁信用卡且有費用顧慮
4. 缺乏「電腦規劃 → 手機即時查看 → 家人同步」的整合體驗

### 設計目標
- **完整解決資料缺漏**：四層搜尋保底機制，沒有找不到的地點
- **無縫家庭同步**：Firebase 即時同步，家人點連結就能看到完整行程與大家位置
- **APP 體驗**：PWA 加到 Android 主畫面，使用體驗等同原生 APP
- **零成本永續**：所有服務均使用免費方案，個人使用不會超額

## 3. 核心設計原則

1. **單檔架構（Single File Application）**
   - 主要應用程式為單一 `index.html`，所有 UI、邏輯、樣式內嵌
   - 第三方依賴透過 CDN 載入（不使用 Webpack、不需要 Node.js 環境）
   - 例外：`manifest.json` 與 `service-worker.js` 因 PWA 規範限制需獨立檔

2. **零綁卡、零月費**
   - 不使用任何需要綁定信用卡的 API
   - Firebase 個人免費方案、OSM、OSRM 均為開放服務

3. **手機優先 UX（Mobile First）**
   - 旅程中所有互動以手機操作為主
   - 大字體、大按鈕、單欄佈局
   - 桌面版視為「進階編輯」模式

4. **容錯優於完美**
   - 搜尋失敗時有層層 fallback，永不卡死
   - 任何外部 API 失敗時都要 graceful degradation
   - 沒網路時至少能顯示已快取的資料

5. **隱私友善**
   - 使用 Firebase 匿名登入，不收集 email、電話
   - 家人僅輸入自選稱呼（如「媽媽」「妹妹」）
   - 位置分享可隨時開關

## 4. 技術選型

### 前端框架
| 技術 | 用途 | CDN |
|------|------|-----|
| React 18 | UI 框架 | `https://unpkg.com/react@18/umd/react.production.min.js` |
| ReactDOM 18 | 渲染 | `https://unpkg.com/react-dom@18/umd/react-dom.production.min.js` |
| Babel Standalone | JSX 編譯 | `https://unpkg.com/@babel/standalone/babel.min.js` |
| Tailwind CSS | 樣式 | `https://cdn.tailwindcss.com` |

### 地圖系統
| 技術 | 用途 |
|------|------|
| Leaflet 1.9.4 | 地圖元件 |
| OpenStreetMap | 圖磚（免費） |
| OSRM | 真實道路路徑計算（免費） |
| OSM Nominatim | 地址→座標、座標→地址（免費） |

### 後端服務
| 技術 | 用途 |
|------|------|
| Firebase Authentication | 匿名登入（不需註冊） |
| Firebase Firestore | 即時資料同步 |

### 資料來源
| 來源 | 用途 | API 端點範例 |
|------|------|------------|
| 交通部觀光署 Open Data | 台灣景點 POI | `https://media.taiwan.net.tw/XMLReleaseALL_public/scenic_spot_C_f.json` |
| 觀光署餐飲 API | 餐廳 POI | `https://media.taiwan.net.tw/XMLReleaseALL_public/restaurant_C_f.json` |
| 觀光署旅宿 API | 住宿 POI | `https://media.taiwan.net.tw/XMLReleaseALL_public/hotel_C_f.json` |
| OSM Nominatim | 地址搜尋 | `https://nominatim.openstreetmap.org/search` |
| OSM Overpass | 周邊 POI 推薦 | `https://overpass-api.de/api/interpreter` |
| OSRM | 路徑規劃 | `https://router.project-osrm.org/route/v1/driving/` |

## 5. 系統架構

### 三大視圖

```
┌──────────────────────────────────────────────┐
│  Dashboard（計畫列表）                         │
│  └─ 列出所有行程、建立新行程、匯入分享行程     │
└──────────────────────────────────────────────┘
              │
              ├──→ Editor（規劃模式，桌面優先）
              │    └─ 雙欄佈局：左清單、右地圖
              │    └─ 搜尋、加入、排序、編輯
              │
              └──→ Mobile Trip View（旅程模式，手機優先）
                   └─ 全螢幕導航卡片
                   └─ 多人位置追蹤
                   └─ 沿途推薦
                   └─ 行程進度條
```

### 角色模型

```
[ 規劃者 ]                          [ 觀看者（家人）]
   │                                    │
   ├─ Google 帳號登入                    ├─ 匿名 Firebase Auth
   ├─ 跨裝置同步（電腦/手機同 UID）        ├─ UID 綁定當前裝置
   ├─ 歷史行程永久保存                    ├─ 不需要註冊
   ├─ 可使用 Dashboard / Editor          ├─ 只看得到 Mobile View
   ├─ 管理 known_family 名單             ├─ 可改自己稱呼/圖示/顏色
   ├─ 設定 familyShareCode 永久分享連結   ├─ 可分享 GPS
   ├─ 可分享 GPS                        ├─ 看到所有人位置
   ├─ 可手動標記抵達 / 跳過站點           ├─ 看到行程進度與推薦
   └─ 設定行程 metadata、費用、祕密景點    └─ 祕密景點看遮蔽名稱
```

### 多家庭共存設計
- **單一 Firebase 專案、多家庭使用**：朋友的家庭也能用同個網址
- **資料隔離**：每位規劃者的 Google UID 不同，Firestore Rules 強制每個 `users/{uid}/` 只有該 UID 能讀寫
- **互不干擾**：朋友家無法看到您的行程，您也無法看到朋友家的行程（介面與 API 皆隔離）
- **免費額度共享**：Firestore 免費方案每天 50K 讀、20K 寫，少量家庭（< 10 個）使用綽綽有餘
- **隱私提醒**：因為 Firebase 是您建立的，您技術上仍可從 Firebase Console 看到朋友的資料庫內容；若朋友介意，建議朋友 fork 一份自建 Firebase

### 身分判定流程
```
APP 開啟
  ├─ 偵測 URL 有無 ?family={code}
  │   ├─ 有 → 觀看者模式
  │   │       └─ 自動匿名登入 + 載入該家庭當前行程
  │   └─ 沒有 → 規劃者模式
  │           ├─ 已登入 Google → 直接進 Dashboard
  │           └─ 未登入 → 顯示「使用 Google 登入」按鈕
```

判定是否為該 Trip 擁有者：比對當前使用者 UID 與 `trip.ownerUid`，相符才顯示編輯功能。

## 6. 資料模型（Firestore）

### Collection 結構

```
artifacts/{appId}/
├─ users/{ownerUid}/                  // Google 帳號 UID
│   ├─ profile (doc)
│   │   ├─ nickname: string           // 例：「Richie」
│   │   ├─ email: string              // 從 Google 帳號取得
│   │   ├─ icon: string               // emoji 例如 🚙
│   │   ├─ color: string              // 例：「#3B82F6」
│   │   ├─ home: { name, lat, lon }   // 預設住家
│   │   └─ familyShareCode: string    // 永久家庭分享碼，例如「RICHIE2026」
│   │
│   ├─ known_family/{memberUid}/      // 跨行程家人名冊（自動建立）
│   │   ├─ nickname: string           // 家人的自訂稱呼
│   │   ├─ icon: string
│   │   ├─ color: string
│   │   ├─ firstSeenAt: timestamp
│   │   ├─ lastSeenAt: timestamp
│   │   └─ totalTrips: number         // 累積參加次數
│   │
│   └─ trips/{tripId}/
│       ├─ title: string
│       ├─ ownerUid: string
│       ├─ status: string             // 'draft'|'active'|'completed'|'archived'
│       ├─ createdAt: timestamp
│       ├─ updatedAt: timestamp
│       ├─ startDate: string          // "2026-05-16"
│       ├─ departureTime: string      // "09:00"
│       ├─ notes: string              // 行程總備註
│       ├─ coverImage?: string        // (未來擴充)
│       ├─ sharedAlbumUrl?: string    // 共享相簿連結（Google Photos 等）
│       ├─ sharedAlbumLabel?: string  // 顯示文字，預設「共享相簿」
│       ├─ activeMembers: [string]    // 本次參與家人 UID 清單
│       ├─ days: [                    // 多天行程
│       │   {
│       │     dayNumber: 1,
│       │     date: "2026-05-20",
│       │     locations: [Location]
│       │   }
│       │  ]
│       └─ expenses: [Expense]        // 費用清單（規劃者私有，不同步到 shared_trips）
│
├─ shared_family/{familyShareCode}/   // 家庭永久公開入口（家人 PWA URL 進入點）
│   ├─ ownerUid: string
│   ├─ ownerName: string              // 顯示給家人看的規劃者名稱
│   ├─ activeTripId: string | null    // 當前進行中行程
│   └─ recentTrips: [                 // 最近行程列表（最多 5 個）
│       { tripId, title, startDate, status }
│      ]
│
└─ shared_trips/{tripId}/             // 公開讀取的分享計畫（即時同步快照）
    ├─ tripRef: string
    ├─ ownerUid: string
    ├─ title: string
    ├─ status: string                 // 同 Trip.status
    ├─ activeMembers: [string]        // 同 Trip.activeMembers
    ├─ days: [...]                    // 唯讀快照（祕密景點以 alias 顯示、過濾 expenses）
    ├─ sharedAlbumUrl?: string
    ├─ notes: string                  // 行程總備註（家人也能看）
    ├─ currentStatus: {
    │   currentDayIndex: 0,
    │   currentLocationIndex: 2,
    │   status: 'arrived' | 'moving' | 'departed',
    │   updatedAt: timestamp
    │  }
    └─ participants/{participantUid}/ // 子集合：每位本次參與者的即時資訊
        ├─ nickname: string
        ├─ icon: string
        ├─ color: string
        ├─ shareLocation: boolean
        ├─ lat: number
        ├─ lon: number
        └─ lastUpdate: timestamp
```

### Firestore 安全規則範例

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

      // 參與者：任何人可讀（看大家位置），只有自己能寫自己的
      match /participants/{participantUid} {
        allow read: if request.auth != null;
        allow write: if request.auth != null && request.auth.uid == participantUid;
      }
    }
  }
}
```

### Location 物件結構

```typescript
interface Location {
  id: string;                  // 唯一 ID
  name: string;                // 真實名稱（規劃者看到）
  originalName: string;        // 原始完整名稱（含地址）
  lat: number;
  lon: number;
  address?: string;
  source: 'tourism_bureau' | 'osm' | 'gmaps_url' | 'manual_pin' | 'home' | 'current';
  category?: 'scenic' | 'restaurant' | 'hotel' | 'rest' | 'gas' | 'parking' | 'shopping' | 'custom';
  opening_hours?: string;

  // === 備註與聯絡 ===
  notes?: string;              // 簡易備註（自由文字，例：訂位 11:30、要帶優惠券）
  phone?: string;              // 店家電話（家人可一鍵撥打）

  // === 時間規劃 ===
  estimatedStayMinutes?: number; // 預估停留時間（依類別自動帶預設值，可手調）
  // 預設值：餐廳 90 / 景點 60 / 住宿 跨夜 / 休息站 15 / 加油站 5 / 自訂 60

  // === 預約 ===
  reservation?: {
    time: string;              // "12:30"
    party?: number;            // 預約人數
  };

  // === 優先級 ===
  priority?: 'must' | 'optional'; // must=必去（跳過時警告）/ optional=可選（預設）

  // === 狀態追蹤 ===
  status?: 'pending' | 'visiting' | 'visited' | 'skipped';
  arrivedAt?: timestamp;       // 自動或手動標記抵達時間
  leftAt?: timestamp;          // 離開時間（下一站抵達時觸發）
  skippedAt?: timestamp;       // 跳過時間（若 status=skipped）

  // === 祕密景點（驚喜功能）===
  isSurprise?: boolean;        // 是否為祕密景點
  surpriseAlias?: string;      // 家人看到的代號（預設「🎁 驚喜景點」，可自訂如「神秘晚餐」）
  revealedAt?: timestamp;      // 揭曉時間（null = 未揭曉；有值 = 已揭曉）
}
```

### Expense 物件結構（費用統計）

```typescript
interface Expense {
  id: string;
  amount: number;              // 金額（新台幣，整數）
  category: 'ticket' | 'meal' | 'lodging' | 'transport' | 'parking' | 'shopping' | 'other';
  description?: string;        // 備註，如「加油站 92 無鉛」
  paid: boolean;               // true=已付 / false=預計
  relatedLocationId?: string;  // 可選綁定 Location（綁定後可在該地點下顯示）
  addedAt: timestamp;
}
```

## 7. 搜尋系統設計（核心）

### 四層 Fallback 策略

```
使用者輸入 → 1. 觀光署 POI 本地資料庫（模糊比對名稱）
              ↓ 找不到
            2. OSM Nominatim API（地址搜尋）
              ↓ 找不到
            3. 提示：「貼 Google Maps 分享連結」（最強保底）
              ↓ 連 Google 也沒有
            4. 地圖手動釘選（最終 fallback）
```

### 觀光署資料庫處理

- **首次載入**：第一次開啟工具時，從觀光署 API 下載最新 POI 資料
- **快取機制**：存於 `localStorage` key: `tw_poi_cache`，含 `lastUpdate` 時間戳
- **自動更新**：每 7 天背景靜默更新一次
- **手動更新**：設定頁有「立即更新景點資料庫」按鈕
- **資料精簡**：只保留 `{name, lat, lon, address, category, opening_hours}` 欄位減少體積

### 搜尋演算法

```javascript
function searchPOI(query, twPOIs) {
  // 1. 精確比對
  const exact = twPOIs.filter(p => p.name === query);
  if (exact.length) return exact;
  
  // 2. 包含關鍵字（不分順序）
  const keywords = query.split(/\s+/);
  const contains = twPOIs.filter(p => 
    keywords.every(k => p.name.includes(k) || p.address?.includes(k))
  );
  if (contains.length) return contains.slice(0, 20);
  
  // 3. 模糊比對（編輯距離 / 部分字串）
  const fuzzy = twPOIs.filter(p => 
    query.split('').some(c => p.name.includes(c))
  ).slice(0, 10);
  return fuzzy;
}
```

### Google Maps URL 解析

支援格式：
- `https://www.google.com/maps/place/.../@lat,lon,zoom/data=...`
- `https://www.google.com/maps/dir/.../地址1/地址2/.../@lat,lon,zoom/`
- `https://goo.gl/maps/XXXXXXXXX`（需先 follow redirect）
- `https://maps.app.goo.gl/XXXXXXXXX`（同上）

解析策略：用正則抓 `@lat,lon` 後，必要時再呼叫 OSM 反查地名。

## 8. 多人位置同步機制

### GPS 上傳策略
- 使用 `navigator.geolocation.watchPosition`
- 每 30 秒上傳一次到 Firestore（節省電量）
- 移動中（GPS 變化 > 100m）才上傳
- 靜止時間 > 5 分鐘改為每 2 分鐘上傳一次

### 觀看者讀取策略
- 訂閱 `shared_trips/{shareCode}/participants/` collection
- 即時收到所有人位置更新
- 在地圖上以各自的 emoji + 顏色標示
- 顯示「最後更新：X 分鐘前」

### 抵達自動判定
- 條件：使用者 GPS 與下一站距離 < 500m，持續 > 30 秒
- 自動更新 `currentLocationIndex`
- 同時記錄 `arrivedAt` 時間
- 觸發推播：「📍 已抵達 XXX」（瀏覽器通知 API）

### 隱私控制
- 家人首次進入時詢問「是否分享位置」
- 設定頁可隨時切換 `shareLocation` 開關
- 關閉時：刪除自己在 `participants` 的 GPS 欄位，但保留 nickname/icon

## 9. PWA 配置

### manifest.json
```json
{
  "name": "智慧旅遊規劃書",
  "short_name": "旅遊計畫",
  "description": "家庭旅遊規劃與導航工具",
  "start_url": "./",
  "display": "standalone",
  "orientation": "portrait",
  "background_color": "#f8fafc",
  "theme_color": "#3b82f6",
  "icons": [
    { "src": "icon-192.png", "sizes": "192x192", "type": "image/png" },
    { "src": "icon-512.png", "sizes": "512x512", "type": "image/png" }
  ]
}
```

### Service Worker（基本快取）
- 快取 HTML、CDN 資源（避免重複下載）
- 不做激進的離線策略（使用者已說明 4G 全程可用）
- 主要目的是：1) PWA 安裝合規 2) 加快第二次開啟速度

## 10. UI 設計原則

### 五大頁面結構（規劃者看得到全部，家人僅 Mobile View + 個人設定）

```
APP 開啟
  │
  ├─📍 Dashboard（首頁）            ← 規劃者進入第一個畫面
  │   ├─ 家庭分享連結（永久顯示）
  │   ├─ 行程列表（進行中 / 即將前往 / 歷史）
  │   └─ 入口：👨‍👩‍👧 家人名單 / ⚙️ 設定
  │
  ├─👨‍👩‍👧 家人名單頁              ← 規劃者管理所有家人
  │   └─ 跨行程的 known_family 清單
  │
  ├─✏️ Editor（行程編輯）            ← 規劃者點某行程或新增進入
  │   ├─ 左：搜尋 + 行程清單
  │   ├─ 右：地圖
  │   └─ 設定區：基本資訊、本次參與家人、共享相簿、費用
  │
  ├─📱 Mobile Trip View（手機旅程模式） ← 規劃者與家人都看的到
  │   ├─ 規劃者額外有 💰 ✏️ 編輯入口
  │   └─ 家人僅查看
  │
  └─⚙️ 設定頁                        ← 規劃者：家庭分享碼、Firebase 設定等
                                    ← 家人：稱呼、圖示、顏色、位置開關
```

### Dashboard（規劃者首頁）

```
┌──────────────────────────────────────┐
│ 🚗 智慧旅遊規劃書         👨‍👩‍👧 ⚙️   │
│ Richie's Family                     │
├──────────────────────────────────────┤
│ 👨‍👩‍👧 家庭分享連結                  │
│ https://richie.github.io/travel/    │
│   ?family=RICHIE2026                │
│ [📋 複製] [📱 QR] [💬 LINE 分享]    │
├──────────────────────────────────────┤
│              [ + 建立新計畫 ]         │
├──────────────────────────────────────┤
│ 🟢 進行中                            │
│ ┌──────────────────────────────────┐│
│ │ 南投兩日遊  5/16-17              ││
│ │ 第 3/8 站 · 預計 17:30 結束 🟢   ││
│ │ [📥 預下載地圖] [💰 費用] [✏️]   ││
│ └──────────────────────────────────┘│
│                                     │
│ 📅 即將前往                          │
│ ┌──────────────────────────────────┐│
│ │ 花蓮三日 · 6/1-3                 ││
│ │ 已規劃 12 個地點                 ││
│ └──────────────────────────────────┘│
│                                     │
│ 📜 歷史行程（可折疊）                │
│ • 2026/3/15 台南一日                │
│ • 2025/12/25 宜蘭兩日              │
└──────────────────────────────────────┘
```

### 家人名單頁

```
┌──────────────────────────────────────┐
│ ← 👨‍👩‍👧 家人名單                    │
├──────────────────────────────────────┤
│ 👨‍👩‍👧 我家有 5 位家人加入過          │
│                                     │
│ 📥 邀請更多家人加入：                │
│ [📋 複製連結] [📱 QR Code]          │
├──────────────────────────────────────┤
│ 🚙 媽媽                             │
│   參加 5 次 · 最後 5/16             │
│   [✏️ 改稱呼/顏色] [🗑️ 移除]        │
│ ───────────────────────────────────│
│ 🚐 阿姨                             │
│   參加 3 次 · 最後 5/16             │
│   [✏️] [🗑️]                        │
│ ───────────────────────────────────│
│ 🛻 舅舅                             │
│   參加 1 次 · 最後 3/15             │
│   [✏️] [🗑️]                        │
│ ───────────────────────────────────│
│ 🚙 媽媽（新裝置）                   │
│   參加 1 次 · 最後 5/16             │
│   ⚠️ 可能與「媽媽」是同一人          │
│   [合併?] [✏️] [🗑️]                │
└──────────────────────────────────────┘
```

### Editor 中的「本次參與家人」區塊

```
┌──────────────────────────────────────┐
│ 👨‍👩‍👧 本次旅遊參與家人              │
├──────────────────────────────────────┤
│ ☑ 🚙 媽媽（曾參加 5 次）             │
│ ☑ 🚐 阿姨（曾參加 3 次）             │
│ ☐ 🛻 舅舅（曾參加 1 次，這次沒去）   │
│ ☑ 🚗 妹妹（曾參加 5 次）             │
│                                     │
│ 📥 邀請新家人：                      │
│ [📋 複製連結] [📱 QR Code]          │
└──────────────────────────────────────┘
```

新家人首次點連結加入後，自動寫入 `known_family`，下次打開 Editor 自動出現於本清單，**預設勾選為「本次參與」**。

### 桌面版（Editor）

```
┌───────────────────────────────────────────────────────┐
│ 🗺️ Day 1  Day 2  Day 3              [儲存][分享][設定] │
├──────────────┬────────────────────────────────────────┤
│  搜尋地點    │                                        │
│  ┌────────┐ │                                        │
│  │ 🔍     │ │                                        │
│  └────────┘ │           [   地    圖   ]              │
│  [+目前位置] │                                        │
│  [+住家]    │                                        │
│  [+Google ] │                                        │
│              │                                        │
│  行程清單    │                                        │
│  1. 起點     │                                        │
│  2. ...     │                                        │
│  3. ...     │                                        │
└──────────────┴────────────────────────────────────────┘
```

- 左欄：固定 350px，搜尋 + 行程清單
- 右欄：地圖佔滿剩餘空間
- 拖拉排序：使用 react-beautiful-dnd 或原生 HTML5 drag

### 手機版（Mobile Trip View）

完整佈局含「下一站醒目卡片 + 今日完整行程清單」，並非只顯示下一站。

```
┌──────────────────────────┐
│ 🚗 我的南投兩日遊  💰 ✏️  │ ← 規劃者才有 💰 ✏️
├──────────────────────────┤
│ [Day 1 今天]  Day 2       │ ← 多天 tab（單天不顯示）
├──────────────────────────┤
│ 👥 多人位置（可折疊）       │
│ 🚙 爸爸 在 Cona's          │
│ 🚗 媽媽 距 2.5 km          │
├──────────────────────────┤
│ ●●●○○○○○  3/8 站            │ ← 進度條
│ 預計 17:30 抵達終點 🟢       │ ← 鬆緊度標籤
├──────────────────────────┤
│ ╔════════════════════════╗ │
│ ║ 📍 下一站                ║│ ← 醒目大卡片
│ ║ Cona's 妮娜巧克力        ║│
│ ║ 8.2 km · 14:30 抵達      ║│
│ ║ ⏰ 9:00-17:00 營業中     ║│
│ ║ [🚗 導航] [⏭️ 跳過]      ║│ ← 規劃者才有跳過
│ ╚════════════════════════╝ │
├──────────────────────────┤
│ [    小  地  圖   ]  ↑      │ ← 可折疊
├──────────────────────────┤
│ 📋 今日全部行程              │
│ ✅ 1. 🏞️ 牛耳藝術渡假村     │
│      抵達 09:30 → 離開 10:30│
│ ✅ 2. 🍽️ 沃克泰式料理       │
│      抵達 11:00 → 離開 12:30│
│      📝 訂位 11:30 (4 人)   │
│      📞 049-1234-567        │ ← 一鍵撥打
│ 📍 3. 🎁 驚喜景點 ← 進行中  │
│      預計離開 13:50         │
│ ⬇️ 4. 🏞️ 集元果觀光工廠     │
│      預計 14:25 抵達        │
│ ⏭️ 5. 🏞️ 集集車站（已跳過） │ ← 灰色
│ ⬇️ 6. ⭐ 武昌宮 [必去]      │
│      預計 16:30 抵達        │
├──────────────────────────┤
│ 📝 行程總備註  ▼            │
│ 「記得帶傘、阿嬤不吃花生」    │
├──────────────────────────┤
│ 🍽️ 沿途餐廳推薦  ▼          │ ← 可折疊
│ 🏞️ 沿途景點推薦  ▼          │
│ 🚻 沿途休息站    ▼          │
│ ⛽ 沿途加油站    ▼          │
└──────────────────────────┘
```

### 狀態圖示對照
| 圖示 | 意義 |
|------|------|
| ✅ | 已抵達 / 已造訪（status='visited'） |
| 📍 | 目前位置（規劃者所在站，status='visiting'） |
| ⬇️ | 即將前往（status='pending'） |
| ⏭️ | 已跳過（status='skipped'，整列灰色） |
| 🎁 | 祕密景點代號（家人看到） |
| ⭐ | 必去（金色） |

### 規劃者 vs 家人差異
| 元素 | 規劃者 | 家人 |
|------|--------|------|
| 標題列 💰 費用按鈕 | ✅ | ❌ |
| 標題列 ✏️ 編輯按鈕 | ✅ | ❌ |
| 下一站「跳過」按鈕 | ✅ | ❌ |
| 祕密景點「✨ 揭曉」按鈕 | ✅ | ❌ |
| 沿途推薦「加入行程」 | ✅ | ❌ |
| 多人位置、今日清單、進度條、鬆緊度 | ✅ | ✅ |
| 祕密景點真實名稱 | ✅ | ❌（看代號） |
| 一鍵撥打 phone | ✅ | ✅ |
| 行程總備註 | ✅ | ✅ |

### 互動細節
- 點任一站 → 地圖飛到該位置 + 詳情展開
- 長按某站（規劃者）→ 快速選單：跳過、設為祕密、調順序
- 下拉刷新 → 強制同步最新資料
- 可折疊區塊：多人位置、地圖、總備註、各類沿途推薦
- 大字體（最小 14px，重點 18-24px）
- 顏色語意：綠=起點/已抵達、紅=終點/警告、藍=進行中、紫=推薦

### 家人首次加入頁面

如 process.md 中所述，含稱呼、圖示、顏色、位置分享意願選擇。

### 祕密景點 UI 對照

**規劃者看到（含真實名稱與設定）：**
```
3. 🎁 Cona's 妮娜巧克力夢想城堡    [✨ 提前揭曉]
   📍 8.2 km · 14:30 抵達
   ⚙️ 家人看到：「🎁 驚喜景點」
```

**家人看到（未揭曉，仍有距離時間）：**
```
3. 🎁 驚喜景點
   📍 8.2 km · 14:30 抵達
```

**家人看到（已揭曉）：**
```
3. ✨ Cona's 妮娜巧克力夢想城堡
   📍 已抵達 · 14:25 揭曉
```

### 規劃者手機快速編輯模式

```
┌──────────────────────┐
│ ← 我的南投行 ✏️ 編輯中 │ ← 右上 ✏️ 切換
├──────────────────────┤
│ 🔍 搜尋並加入景點...   │ ← 編輯模式才出現
├──────────────────────┤
│ ✅ 1. 牛耳藝術渡假村   │
│ ✅ 2. 沃克泰式料理     │
│ 📍 3. 🎁 Cona's...    │ ← 目前位置
│       [✨ 提前揭曉]    │
│ ⬜ 4. 集元果觀光工廠 ⬆⬇🗑│ ← 編輯模式下顯示控制
│ ⬜ 5. 集集車站      ⬆⬇🗑│
├──────────────────────┤
│       [ ✅ 完成編輯 ]  │
└──────────────────────┘
```

## 11. 加分功能說明

### 祕密景點（驚喜功能）⭐

**情境**：規劃者想給家人驚喜，不希望提前透露下一站是哪裡。

**規劃者行為**
- 桌面端 Editor：每個 Location 旁有「🎁 設為祕密景點」開關
- 開啟後可自訂家人看到的代號（如「🎁 驚喜景點」「神秘晚餐」「秘境探險」）
- 開啟後該地點旁顯示 🎁 emoji 提醒

**家人觀看者行為**
- 未揭曉時看到：
  - 名稱顯示為 `surpriseAlias` 而非真實名稱
  - **仍顯示距離、預估抵達時間**（保有期待感）
  - 不顯示 `address`、`opening_hours`
  - 地圖上顯示位置但 marker 改為 🎁 圖示
  - 在行程清單中以「🎁 神秘」標籤標示

**揭曉機制**
- **自動揭曉**：GPS 距離 < 500m 觸發抵達時，自動設定 `revealedAt = now`
- **手動提前揭曉**：規劃者手機/桌面端旁有「✨ 提前揭曉」按鈕
- 揭曉後家人手機上立刻變成真實名稱，並顯示「✨ 已揭曉於 14:25」動畫效果

**實作要點**
- 揭曉後的 location 在 Firestore `shared_trips` 中才會公開真實 `name`
- 在揭曉前，同步到 `shared_trips` 的版本要將 `name` 替換為 `surpriseAlias`
- `revealedAt` 一旦設定就無法收回（簡化設計）

### 規劃者手機端「快速編輯」模式

**情境**：旅程中臨時想加景點、調順序、刪掉跳過的站。

**進入方式**
- 規劃者手機 Mobile Trip View 右上角有「✏️」按鈕
- 點擊切換到「快速編輯模式」（不離開手機視圖）

**功能範圍（快速版）**
- ✅ 搜尋並加入新景點（沿用桌面搜尋系統）
- ✅ 刪除景點
- ✅ 上移／下移調整順序
- ✅ 提前揭曉祕密景點（按「✨ 提前揭曉」）
- ❌ 不可設定祕密景點（要回桌面）
- ❌ 不可管理多天行程（要回桌面）
- ❌ 不可改其他設定（出發時間、計畫標題）

**UI 設計**
- 跟觀看模式同樣的列表，但每個地點旁加上 ☰、🗑 按鈕
- 頂部出現「+ 加入景點」搜尋框
- 完成編輯後按「✅ 完成」回到查看模式

**權限判定**
- 只有 `ownerUid === currentUid` 才看得到編輯按鈕
- 觀看者完全沒這個入口

### 行程複製（模板）
- 在 Dashboard 每個計畫旁加「複製」按鈕
- 複製時清空 `arrivedAt`、`leftAt`、`status`、`revealedAt`、`expenses`，保留地點清單與 `notes`
- 標題自動加上「(複製)」前綴

### PDF 匯出
- 使用 `jspdf` + `html2canvas`（CDN 載入）
- 匯出內容：行程標題、各站名稱地址、預估時間、地圖縮圖、QR code（指向分享連結）
- 列印友善版型（A4 直式），繁體中文字型支援

### 預約提醒
- 每個 Location 可選填 `reservation.time`
- 系統計算「預估抵達時間 vs 預約時間」差距
- 若預估抵達 > 預約時間 → 紅色警示「⚠️ 將遲到 15 分鐘」
- 若提前 > 30 分鐘 → 黃色提示「將提早 30 分鐘到達」

### 跳過景點 ⭐
- 旅程中規劃者按「⏭️ 跳過此站」一鍵跳過
- 該 Location.status = 'skipped'，UI 上灰色顯示
- 後續所有站時間自動重算（會提早）
- 家人端進度條顯示 ⊘ 圖示與「規劃者跳過 XXX」
- 已跳過可「取消跳過」（除非當天已過該時段）
- 標為 `priority='must'` 的站跳過時要二次確認

### 行程時間鬆緊度標籤 ⭐
- 根據出發時間、各站預估停留、各段 OSRM 路徑時間自動計算
- 計算「預計回家時間」並顯示鬆緊度標籤：
  - 🟢 充裕：結束 < 17:00
  - 🟡 緊湊：17:00-19:00
  - 🟠 過滿：19:00-21:00（建議拿掉一站）
  - 🔴 不可行：> 21:00 或某站超過營業時間
- 預設「默默顯示」不彈窗（使用者選的低干擾設計）
- 個別站若會超過營業時間或預約遲到，個別站旁仍會有紅黃警示

### 費用統計（規劃者私有）⭐
- 整個 Trip 一份 `expenses` 陣列
- 7 種類別：🎫 門票 / 🍽️ 餐飲 / 🏨 住宿 / 🚗 交通油錢 / 🅿️ 停車費 / 🛍️ 購物 / 📦 其他
- 兩種綁定方式：
  - 綁定地點（`relatedLocationId`）：在該 Location UI 下顯示
  - 不綁地點（如過路費、加油費）
- 「預計 vs 已付」狀態追蹤
- 統計顯示：總額、各類別百分比、預計總額、已付總額
- **不需要分攤計算、不需要預算上限警示**（使用者選簡單版）
- 觀看者完全看不到：同步到 `shared_trips` 時自動過濾 `expenses` 欄位

### 必去 / 可選 標籤 ⭐
- Location.priority = 'must' | 'optional'（預設 optional）
- UI 標示：⭐ 必去（金色）/ 可選不顯示標籤
- 跳過「必去」站時跳出確認對話框（避免誤跳）
- 沿途推薦景點若加入時可標為「可選」（允許旅程中彈性跳過）

### ~~天氣預報（Dashboard）~~ ❌ 已移除（2026-09-25）

曾以中央氣象署 F-C0032-001 實作，2026-09-25 整塊移除。

**移除理由**：出發前本來就會自己查天氣，放在規劃書裡沒有實際價值；
而金鑰必須跟著前端送到瀏覽器，等於長期公開一把憑證來換一個沒人用的功能，
不划算。移除後 `config.js` 不再有 `window.cwaApiKey`。

⚠️ 舊的 CWA 金鑰曾 commit 進這個公開 repo，**已在 CWA 後台作廢**。
git 歷史裡的那串已經是廢字串。

### 行程總備註欄 ⭐
- Trip.notes 一個自由文字欄位
- 在 Editor 與 Mobile View 都看得到
- 用途範例：「記得帶傘」「門票 60+ 有優惠」「阿嬤不能吃花生」
- 觀看者也看得到（不是私人資訊）

### 共享相簿連結 ⭐

**情境**：旅程結束後，家人各自拍的照片要集中。傳統做法是發 LINE 一張一張收，很煩。

**運作機制**（手動 + 引導，不串 Google Photos API）
- Trip 物件有 `sharedAlbumUrl` 與 `sharedAlbumLabel` 欄位
- Editor 中提供「📷 共享相簿」設定區
- 引導：
  - 教學步驟（開 Google Photos → 建相簿 → 取連結）
  - 「一鍵複製建議相簿名稱」按鈕（自動帶入 `{startDate} {title}`）
  - 貼回連結欄位即可
- 行程進行中與結束時，Mobile View 都會顯示「📷 上傳照片」按鈕
- 點按鈕在新分頁開啟該共享相簿連結
- 家人在 Google Photos 內各自上傳

**為什麼不串 API**
- Google Photos Library API 對第三方建立相簿有政策限制（隨時可能變動）
- 需 OAuth 授權，家人都要登入 Google
- 開發複雜度高（1-2 週），對個人家庭工具 CP 值低
- 手動引導已能解決 90% 痛點

### 家庭永久分享碼與緊急重設 ⭐

**永久分享碼**
- 規劃者首次設定時自動產生（如 `RICHIE2026`，可手動改）
- 寫入 `profile.familyShareCode`，並建立 `shared_family/{code}` 公開入口
- 家人 PWA URL: `https://.../?family={code}`
- 加入主畫面後永久使用，不會隨行程變動

**緊急重設**（少用但保留功能）
- 設定頁有「重設家庭分享碼」按鈕（紅色 + 二次確認）
- 重設後舊碼立刻失效、所有家人 PWA 圖示不可用
- 系統會自動清空 `shared_family/{舊碼}`、建立 `shared_family/{新碼}`
- 您要重新把新連結給想保留的家人
- 適用情境：朋友撕破臉、孩子玩太兇等極端狀況

### 跨行程家人名冊（known_family）⭐

**自動建立**
- 任何家人首次點 `?family={code}` 連結並設定稱呼後
- 系統自動寫入 `users/{ownerUid}/known_family/{memberUid}`
- 記錄稱呼、圖示、顏色、首次加入時間、累計參加次數

**Editor 整合**
- 建立新行程時，Editor 中「本次參與家人」自動列出所有 known_family 成員
- 預設全勾選（剛加入的新家人也預設勾選）
- 取消勾選 = 從 `trip.activeMembers` 移除 = 本次行程不顯示其位置

**家人名單頁管理**
- 規劃者可手動編輯每位家人的稱呼、顏色（同步更新到 Firestore）
- 「移除」會從 known_family 永久刪除（家人下次點連結重新註冊就好）
- 重複紀錄（同人不同 UID，如手機重灌）由規劃者手動刪除舊紀錄

### 預下載路線地圖（離線快取）⭐
- 為山區或網路不佳的場景設計
- Dashboard / Editor 每個 Trip 旁加「📥 預下載地圖」按鈕
- 運作機制：
  1. 計算行程沿線涵蓋的地圖圖磚（多個 zoom level）
  2. 透過 Service Worker `Cache API` 或 `IndexedDB` 儲存
  3. 進度條顯示下載進度
  4. 完成後即使完全沒網路也能顯示地圖
- 儲存位置：`IndexedDB`（不算進 localStorage 上限）
- 預估體積：20-50 MB 每趟（依路線長度）
- 提供「清除地圖快取」設定（行程結束後手動清）
- Service Worker 攔截 OSM 圖磚請求，命中快取直接回傳

## 12. 開發約定

### 檔案結構
```
旅遊計劃書/
├── CLAUDE.md           # 本文件
├── PROCESS.md          # 開發流程
├── index.html          # 主應用（單檔架構，全新建立）
├── manifest.json       # PWA manifest
├── service-worker.js   # PWA SW（含地圖圖磚快取邏輯）
├── icon-192.png        # PWA 圖示
├── icon-512.png        # PWA 圖示
├── config.example.js   # Firebase 設定範例
└── docs/
    ├── firebase-setup.md  # Firebase 一次性設定教學
    └── deployment.md      # GitHub Pages 部署教學

# 上層資料夾還有：
D:\vscode\travelplan\plan.html  # 舊版參考檔，僅供查看部分函式邏輯
```

### 與 plan.html 的關係（重要）

**`plan.html` 是舊版參考檔，不是要修改的對象。**

開發 `index.html` 時應**完全新建**，但可參考 plan.html 以下幾段邏輯：
- Leaflet 地圖元件設定（`MapView` component）
- OSRM 路徑串接（`fetchRoute` 函式）
- 繞路警告計算（`locationsWithWarnings`）
- Google Maps URL 解析（`handleImport` 函式）
- OSM Nominatim 搜尋的 fallback 機制（剝洋蔥邏輯）

plan.html 不適合直接修改的原因：
- 使用 `__firebase_config` 全域變數佔位符，不能直接執行
- 資料模型缺少新功能所需欄位（status、priority、expense 等）
- 沒有多人 GPS 同步、祕密景點、PWA、預下載地圖等本次新規劃功能
- UI 結構是「Editor + Mobile 混合在同個視圖」，不符合本次三視圖分離設計

### 程式碼風格
- React 元件用函式型 + Hooks，不用 class component
- 命名：元件用 PascalCase、函式用 camelCase、常數用 UPPER_SNAKE_CASE
- JSX 內容請維持可讀性，避免過深巢狀
- 註解採用繁體中文（這是個人工具，可讀性優先）

### Firebase 設定處理
- 不要將 `firebaseConfig` 硬編碼進 `index.html`
- 提供 `config.example.js` 範本
- 使用者複製為 `config.js` 後填入自己的金鑰
- 在 `index.html` 中以 `<script src="config.js"></script>` 載入
- `.gitignore` 加入 `config.js`（若使用者要 push 到 GitHub）

### 錯誤處理
- 所有 fetch 都要 try-catch
- API 失敗時要 console.warn + 使用者友善訊息（不要噴 stack trace）
- localStorage 寫入也要 try-catch（容量超限會丟錯）

## 13. 已知限制

1. **iOS 限制**：iOS Safari 對 PWA 支援較差，但全家用 Android 故不影響
2. **背景定位**：瀏覽器無法真正「背景」抓 GPS，APP 必須在前景才會更新位置
3. **觀光署 API CORS**：若有 CORS 問題，需透過 CORS proxy（如 `corsproxy.io`）或將資料下載後存到 GitHub 倉庫供讀取
4. **OSRM 公共服務**：免費服務有 rate limit，重度使用可能需要自架（目前個人用不會遇到）
5. **Firebase 免費額度**：Firestore 免費方案每天 50K 讀、20K 寫，個人家庭用綽綽有餘
6. **山區網路**：4G 在山區（南投山區、信義鄉等）可能轉 3G 或斷訊，預下載路線地圖功能可緩解
7. **localStorage 容量**：一般約 5-10 MB 上限，觀光署 POI 資料庫接近上限，地圖圖磚改用 IndexedDB
8. **Service Worker 範圍**：只能快取同網域資源，CDN 資源無法 cache-first（但瀏覽器自身 HTTP cache 仍有效）

## 14. 未來擴充方向（不在初版範圍）

- 家人的「建議景點投票」功能
- 行程心得紀錄（旅遊後寫感想、上傳照片）
- 預算追蹤
- 即時聊天（家人在行程內留言）
- 多語系（英文版）
- iOS 推播支援（需更複雜的 PWA 設定）

---

## 15. 使用者預期管理（重要設計依據）

本章節記錄與使用者討論後確認的「使用情境假設」與「行為預期」，避免開發時做錯決策。

### GPS 啟動時機（瀏覽器限制 + 設計取捨）
- **家人 APP 開啟時**：watchPosition 啟動，每 30 秒上傳位置
- **家人 APP 關閉/鎖螢幕時**：watchPosition 自動停止，位置停留在最後一次更新
- **這是瀏覽器本身的限制**，無法做到真正背景持續抓 GPS
- **設計理由**：省電、省流量、隱私佳（沒打開 APP 別人看不到您）
- 規劃者也適用此限制（看 APP 才能更新位置給家人）
- UI 必須顯示「最後更新時間」（如「更新於 3 分鐘前」）

### 家人加入流程預期（不必另寫使用者手冊）
- 點分享連結 → 自動跳「設定稱呼/圖示/顏色/位置權限」→ 進入觀看模式
- Chrome 自動跳出「加到主畫面？」→ 點是即完成 PWA 安裝
- 之後家人從桌面圖示開啟，自動載入該行程

### 流量預期
- **整趟旅遊家人總流量**：約 10-20 MB（首次）/ 5-15 MB（後續）
- 主要消耗：地圖圖磚（5-15 MB）、Firebase 同步（1-2 MB）、CDN 資源（500-700 KB）
- 對 4G 月流量 5-30 GB 來說非常少，**不需要警告流量問題**
- 但仍建議透過「📥 預下載路線地圖」做山區保險

### PWA 快取機制（Service Worker）
- 註冊時快取核心檔案：HTML、所有 CDN script 與 CSS
- 圖磚快取策略：Cache First with Network Fallback（先看快取，沒有再下載）
- 觀光署 POI 資料：localStorage（非 SW 範疇）
- 行程資料：Firestore 自帶離線快取
- 觸發 SW 更新時機：版本號變更（在 SW 檔案中放 `const VERSION = "1.0.x"`）

### 同步即時性預期
- 規劃者改動 → 觀看者最多延遲 1-2 秒（Firestore onSnapshot 推播）
- 位置更新 → 家人之間最多 30 秒（每 30 秒上傳一次）
- 抵達判定 → GPS 距離 < 500m **持續 30 秒**才觸發（避免誤判）

### 山區/斷訊情境預期
- 行程資料：已存 Firestore 客戶端快取，可離線讀取
- 地圖圖磚：若使用者已「預下載」或先前看過，可離線顯示
- 路徑計算：OSRM 需即時呼叫，若斷網則顯示「無法計算路徑，請待網路恢復」
- 沿途推薦：Overpass API 需即時呼叫，斷網時隱藏推薦區塊

---

## 16. 機敏資訊處理與 GitHub 上傳守則 ⚠️

> **本章優先級最高。任何 commit 前都要先確認本章規則。**

### 16.1 這個 repo 是「公開」的

- Remote：`https://github.com/Richie0426/travelplan.git`
- 部署：GitHub Pages（`https://richie0426.github.io/travelplan/`）
- **GitHub Pages 免費方案必須使用 public repo**，所以這個 repo 無法改成私有而仍保有家庭分享連結。

因此：**任何進入 Git 的內容 = 對全世界公開**。
而且 Git 會保留歷史，事後刪檔並不會讓金鑰消失，必須改寫歷史（`filter-repo` / BFG）並強制推送才清得掉——遠比一開始就不要 commit 麻煩太多。

### 16.2 分級：什麼算機敏、什麼不算

| 等級 | 項目 | 可否進 Git | 說明 |
|------|------|-----------|------|
| 🔴 高 | LINE Channel Access Token / Channel Secret | ❌ 絕對不可 | 等同官方帳號密碼，可冒名發訊息、吃光免費額度 |
| 🔴 高 | Google 服務帳號金鑰 JSON（`service-account*.json`） | ❌ 絕對不可 | 可直接讀寫 Firestore / Drive，等同後門 |
| 🔴 高 | Google OAuth Client Secret、refresh token | ❌ 絕對不可 | 可存取本人 Google 帳號資料 |
| 🟡 低 | Google Drive 資料夾 ID、Sheet ID | ⚠️ 建議不要 | 不是密碼，但會洩漏檔案位置 |
| 🟢 無 | `config.js` 的 Firebase Web API Key | ✅ 可以 | **設計上就是公開的**，安全靠 Firestore Rules 保證，不 commit 反而部署會壞 |
| 🟢 無 | 家庭分享碼（`familyShareCode`） | ✅ 可以 | 本來就是要發給家人的；真要作廢用設定頁的「重設分享碼」 |

**常見誤解：** 「Firebase 金鑰在 index.html 裡看得到，那不是很危險？」
不危險。Firebase Web API Key 只是專案識別碼，不是授權憑證。真正的防線是 Firestore 安全規則（見第 6 章）。
**但 LINE Token 與服務帳號金鑰完全不同，那些是真的密碼。**

### 16.3 金鑰要放哪裡

| 情境 | 作法 |
|------|------|
| 本機留存備忘 | 寫進 `SECRETS.local.md`（已被 `.gitignore` 排除） |
| Google Apps Script 程式中使用 | 用 `PropertiesService.getScriptProperties().getProperty('LINE_TOKEN')`，**絕不硬編碼在 `.gs` 裡** |
| Cloudflare Workers | 用 `wrangler secret put`，不要寫在 `wrangler.toml` |
| 前端網頁（index.html） | 只放 Firebase Web Config，其餘一律不放——前端沒有任何藏東西的能力 |

### 16.4 .gitignore 已涵蓋的保護規則

```
*.local.md            # 含 SECRETS.local.md、NOTES.local.md
SECRETS.local.md
prog/ 、 gas/          # LINE BOT / Apps Script 程式碼與金鑰
service-account*.json
*-serviceaccount.json
*credentials*.json
.env 、 .env.*
*.pem 、 *.key 、 secrets/
```

新增任何含金鑰的檔案時，**先把規則加進 `.gitignore`，再建立檔案**（順序相反的話，檔案可能已被 `git add` 追蹤）。

### 16.5 commit 前的固定檢查

```bash
# 1. 看清楚這次到底要送什麼上去
git status
git diff --cached

# 2. 掃一次常見金鑰特徵（有輸出就停下來檢查）
git diff --cached | grep -iE "token|secret|password|api[_-]?key|BEGIN.*PRIVATE KEY"

# 3. 確認機敏檔案確實被忽略
git check-ignore -v SECRETS.local.md
```

**永遠不要用 `git add .` 當作習慣動作**，尤其是在新增了未知檔案之後。改用 `git add <明確檔名>`。

### 16.6 萬一金鑰已經推上去了

1. **先輪替（最重要）**：LINE Console 重新簽發 token / Google Cloud 刪除並重建服務帳號金鑰。**舊金鑰作廢後，外流的那份就變廢紙**，這一步比清歷史更關鍵、也更即時。
2. 再清歷史：`git filter-repo` 移除該檔案 → `git push --force`。
3. 注意：GitHub 上的 fork、cache、以及第三方爬蟲可能已經抓走，所以第 1 步才是真正的解法。

### 16.7 LINE BOT 專案的位置約定

家庭 LINE BOT（Google Apps Script）**不放在本 repo 內**，理由：
- 部署目標不同（GAS 線上專案 vs GitHub Pages 靜態站）
- 生命週期不同
- 本 repo 為公開，GAS 程式必然帶有金鑰

建議位置：`D:/vscode/linebot-gas/`（獨立資料夾，需要版控就在該處 `git init` 且**不加 remote**）。
程式碼的唯一真實來源是 Google Apps Script 線上專案本身。

---

**最後更新**：2026-09-20  
**規格決策來源**：與 Richie 在 Cowork mode 的需求討論
