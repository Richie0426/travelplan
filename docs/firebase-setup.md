# Firebase 一次性設定教學

> 本文件對應 `PROCESS.md` Phase 0「環境準備」。
> 完成本文所有步驟後，您將擁有可用的 Firebase 專案，並能進入 Phase 1 開始開發 `index.html`。
> 全程約需 **15~20 分鐘**，完全免費、不需綁信用卡。

---

## 目錄

- [前置準備](#前置準備)
- [步驟 0.1：建立 Firebase 專案](#步驟-01建立-firebase-專案)
- [步驟 0.2：啟用 Authentication](#步驟-02啟用-authentication)
- [步驟 0.3：建立 Firestore 資料庫](#步驟-03建立-firestore-資料庫)
- [步驟 0.4：取得 Firebase Config](#步驟-04取得-firebase-config)
- [步驟 0.5：建立本地 config.js](#步驟-05建立本地-configjs)
- [驗收清單](#驗收清單)
- [常見問題排除](#常見問題排除)
- [安全性說明](#安全性說明)

---

## 前置準備

### 您需要

| 項目 | 說明 |
|------|------|
| Google 帳號 | 用來登入 Firebase Console 與作為規劃者身分 |
| 桌面瀏覽器 | 建議 Chrome 或 Edge |
| 約 15~20 分鐘 | 完整跑完所有步驟的時間 |

### 您不需要

- ❌ 信用卡（Firebase 個人方案完全免費）
- ❌ Node.js、npm 等開發環境（本專案為單檔 HTML）
- ❌ 任何 CLI 工具（全部在網頁 Console 完成）

---

## 步驟 0.1：建立 Firebase 專案

### 1. 開啟 Firebase Console

前往 <https://console.firebase.google.com> 並用 Google 帳號登入。

### 2. 建立新專案

- 點擊畫面上的 **「新增專案」** 或 **「Add project」** 大按鈕。
- **專案名稱**：建議命名為 `travel-plan-richie`（您也可以自取名稱，例：`my-family-trip`）。
- 系統會在底下自動產生一個專案 ID（例：`travel-plan-richie-a1b2c`），記下這個 ID（之後 `config.js` 會用到）。
- 點 **「繼續」**。

### 3. 關閉 Google Analytics

- 在「為這個專案啟用 Google Analytics」畫面，**將開關切到關閉**。
- 個人家庭工具不需要分析資料，關掉可省去後續設定步驟。
- 點 **「建立專案」**。

### 4. 等待建立完成

- 大約 30~60 秒。
- 完成後點 **「繼續」** 進入專案首頁。

> ✅ **完成檢查**：您應該看到 Firebase 專案儀表板，左側選單有 Authentication、Firestore Database 等選項。

---

## 步驟 0.2：啟用 Authentication

本專案需要兩種登入方式：**匿名**（給家人觀看者）+ **Google**（給規劃者 Richie 自己）。

### 1. 進入 Authentication 設定

- 左側選單 → **產品類別** → 點 **「安全性」** 展開 → 點 **「Authentication」**
- 點擊中央的 **「開始使用」** 按鈕。

> 💡 **新版 Firebase Console 中文介面變動**:舊版的「Build」區塊現已重新分類為「產品類別」,Authentication 改放在「**安全性**」底下。若您看到的是英文版,對應為 **Product categories → Security → Authentication**。

### 2. 啟用「匿名」登入

- 進入 **Sign-in method** 分頁。
- 在「原生供應商」列表找到 **「匿名」（Anonymous）**。
- 點擊該列 → 將開關切到 **「啟用」** → 點 **「儲存」**。

> 為什麼？家人不需要 Google 帳號，點分享連結就能匿名加入並看到行程。

### 3. 啟用「Google」登入

- 一樣在 **Sign-in method** 分頁。
- 找到 **「Google」** → 點擊 → 將開關切到 **「啟用」**。
- **公開顯示的應用程式名稱**：填「智慧旅遊規劃書」或您喜歡的名稱。
- **專案的支援電子郵件**：選您自己的 Google 信箱。
- 點 **「儲存」**。

> 為什麼？規劃者用 Google 登入後，UID 跨裝置相同，可在電腦與手機看到同一份歷史行程。

### 4.（可選，Phase 0 可跳過）授權網域

**什麼是授權網域？** Firebase 的白名單機制：只有列在名單上的網域才能使用您的 Authentication 服務登入，防止他人複製您公開的 `firebaseConfig` 冒用您的 Firebase 專案。預設已包含 `localhost`、`<您的專案>.firebaseapp.com`、`<您的專案>.web.app`，本機開發夠用。

**Phase 0 階段請直接跳過此步驟**，等 Phase 8 部署到 GitHub Pages 時再回來新增 `<您的 GitHub 帳號>.github.io`，否則部署後家人點連結會出現 `auth/unauthorized-domain` 錯誤。

若想提前看看，操作位置（避免與左側齒輪混淆）：
- 在 **Authentication 頁面內**（不是左側齒輪 ⚙️「設定」！）
- 點 Authentication 頁面**頂端**的分頁列：**使用者 ｜ 登入方式 ｜ 範本 ｜ 用量 ｜ 設定**
- 點 Authentication 內的 **「設定」分頁** → 往下捲到 **「授權網域」** 區塊

> ⚠️ **兩個「設定」很容易混淆**：
> - **左側齒輪 ⚙️「設定」** = 整個 Firebase 專案的設定（成員、帳單、服務帳戶等）
> - **Authentication 頂端的「設定」分頁** = 登入服務設定（授權網域、使用者動作等）

> ✅ **完成檢查**：**Sign-in method** 分頁的「匿名」與「Google」兩列都顯示「已啟用」。

---

## 步驟 0.3：建立 Firestore 資料庫

### 1. 建立資料庫

- 左側選單 → **產品類別** → 點 **「資料庫和儲存空間」** 展開 → 點 **「Firestore Database」**
- 點擊 **「建立資料庫」**。

> 💡 對應英文介面為 **Product categories → Databases and storage → Firestore Database**。

### 2. 步驟 ①「選取版本」

新版 Firebase 將建立流程拆成三步：

- 選 **「Standard 版」**（左邊藍底卡片，預設選項）。
- ⚠️ 不要選 **「Enterprise 版」**，那個沒有免費額度、從第一筆讀寫就計費。
- Standard 版的免費方案（每天 50K 讀、20K 寫）對家庭使用綽綽有餘。
- 點 **「下一步」**。

### 3. 步驟 ②「資料庫 ID 和位置」

- **資料庫 ID**：保留預設值 **`(default)`**，不要改。
- **位置（Location）**：選 **`asia-east1`**（台灣最近的節點，在彰化，延遲約 10ms）。
- ⚠️ **位置一旦選定永久無法修改**，請務必選對。不建議選 `us-central1` 等北美節點（延遲 150ms+）。
- 點 **「下一步」**。

### 4. 步驟 ③「設定」

- 安全規則模式：選 **「以正式版模式啟動」**（Production mode）。
- ⚠️ 不要選「測試模式」，那會讓全世界都能讀寫您的資料 30 天。
- 我們待會兒會手動貼入安全規則。
- 點 **「建立」** 或 **「啟用」**。

### 5. 等待建立完成

- 約 30 秒。
- 完成後會看到空的 Firestore Database 畫面。

### 6. 設定安全規則（最關鍵步驟）

- 切換到頂部的 **「規則」（Rules）** 分頁。
- 把編輯器內預設內容**全部刪除**。
- 貼入以下內容：

```javascript
rules_version = '2';
service cloud.firestore {
  match /databases/{database}/documents {

    // 規劃者私有空間（預設規則）：只有 owner 能讀寫自己的所有資料
    match /artifacts/{appId}/users/{userId}/{document=**} {
      allow read, write: if request.auth != null && request.auth.uid == userId;
    }

    // 例外：家人可在規劃者的 known_family 自我註冊（只能寫 docId == 自己 UID 那筆）
    match /artifacts/{appId}/users/{userId}/known_family/{memberId} {
      allow read: if request.auth != null;
      allow create, update: if request.auth != null && request.auth.uid == memberId;
      allow delete: if request.auth != null && (request.auth.uid == userId || request.auth.uid == memberId);
    }

    // 家庭分享入口：任何已登入者可讀，只有 owner 能寫
    match /artifacts/{appId}/shared_family/{shareCode} {
      allow read: if request.auth != null;
      allow create: if request.auth != null && request.resource.data.ownerUid == request.auth.uid;
      allow update, delete: if request.auth != null && request.auth.uid == resource.data.ownerUid;
    }

    // 分享行程：任何已登入者可讀，只有 owner 能寫
    match /artifacts/{appId}/shared_trips/{tripId} {
      allow read: if request.auth != null;
      allow create: if request.auth != null && request.resource.data.ownerUid == request.auth.uid;
      allow update, delete: if request.auth != null && request.auth.uid == resource.data.ownerUid;

      // 參與者：任何人可讀（看大家位置），只有自己能寫自己的
      match /participants/{participantUid} {
        allow read: if request.auth != null;
        allow write: if request.auth != null && request.auth.uid == participantUid;
      }
    }
  }
}
```

> **修正說明（Phase 1 實作後發現）**：
> - 原 `write: if ... resource.data.ownerUid == request.auth.uid` 在 `create` 時 `resource` 為 null 會永遠失敗，須拆成 `create`（用 `request.resource`）與 `update/delete`（用 `resource`）。
> - 家人匿名登入後須能寫入規劃者的 `known_family/{自己UID}`，所以針對 known_family 加開放規則。

- 點 **「發布」（Publish）**。
- 應該會看到「規則已發布」提示。

> **規則重點解讀**：
> - 每個規劃者的私有空間（含費用、私人備註）只有自己能讀寫
> - 家庭分享入口、行程公開快照僅限「已登入者」可讀（包含匿名登入的家人）
> - 每個家人只能寫自己的位置，無法竄改其他家人或規劃者的資料

> ✅ **完成檢查**：規則分頁頂端顯示「已發布」與發布時間。

---

## 步驟 0.4：取得 Firebase Config

接下來要拿到一組「金鑰物件」貼進 `config.js`，讓 `index.html` 知道要連到哪個 Firebase 專案。

### 1. 進入專案設定

- 點擊左側選單的 **齒輪圖示 ⚙️「設定」** → **「專案設定」**
- 確認位於 **「一般設定」** 分頁(不是「使用者和權限」分頁)。

### 2. 新增 Web 應用程式

- 往下捲到 **「您的應用程式」** 區塊。
- 點擊 **`</>`**（Web）圖示。
- **應用程式暱稱**：填 `travel-plan-web`（隨意）。
- **不要勾選 ☐ Firebase Hosting**（本專案部署在 GitHub Pages，不用 Firebase Hosting）。
- 點 **「註冊應用程式」**。

### 3. 複製設定物件

下一頁會顯示一段程式碼，類似：

```javascript
const firebaseConfig = {
  apiKey: "AIzaSyA...........",
  authDomain: "travel-plan-richie.firebaseapp.com",
  projectId: "travel-plan-richie",
  storageBucket: "travel-plan-richie.appspot.com",
  messagingSenderId: "123456789012",
  appId: "1:123456789012:web:abcdef1234567890"
};
```

- 把整個 **`firebaseConfig` 物件**選起來複製（不需要 `const firebaseConfig =` 與 `;`）。
- 點 **「繼續前往主控台」**。

> 💡 之後若忘了複製：在「專案設定」往下捲，「您的應用程式」→ 選 `travel-plan-web` → **「SDK 設定和配置」** → 選 **「設定」** 即可再次看到。

---

## 步驟 0.5：建立本地 config.js

### 1. 建立檔案

在專案資料夾根目錄（與 `CLAUDE.md`、`index.html` 同層）建立新檔案：

```
d:\vscode\travelplan\旅遊計劃書\config.js
```

### 2. 貼入內容

```javascript
window.firebaseConfig = {
  apiKey: "AIzaSyA...........",
  authDomain: "travel-plan-richie.firebaseapp.com",
  projectId: "travel-plan-richie",
  storageBucket: "travel-plan-richie.appspot.com",
  messagingSenderId: "123456789012",
  appId: "1:123456789012:web:abcdef1234567890"
};

// 應用程式內部識別碼,用於 Firestore 路徑分隔
// (與 firebaseConfig.appId 不同,這是業務邏輯用的)
window.appId = "travel-plan-personal";

```

- 把上面 6 個欄位的值替換成步驟 0.4 複製到的內容。

### 3.（可選）建立 config.example.js

為了方便未來分享原始碼或自己備份，可順手建立一份**不含金鑰**的範本：

```javascript
// config.example.js — 複製為 config.js 後填入您的 Firebase 金鑰
window.firebaseConfig = {
  apiKey: "YOUR_API_KEY",
  authDomain: "YOUR_PROJECT.firebaseapp.com",
  projectId: "YOUR_PROJECT",
  storageBucket: "YOUR_PROJECT.appspot.com",
  messagingSenderId: "YOUR_SENDER_ID",
  appId: "YOUR_APP_ID"
};
window.appId = "travel-plan-personal";
```

### 4. 加入 .gitignore（push 到 GitHub 前必做）

Phase 8 部署時會討論策略；目前若您尚未建立 Git 倉庫可先略過。
若已 git init，建議建立 `.gitignore`：

```
config.js
```

> ⚠️ **重要**：Firebase Web API Key **本身設計就是公開可見**的（即使藏起來，瀏覽器 DevTools 也能看到），真正的安全靠 **Firestore Rules** 保證。所以 Phase 8 也可以選擇直接 commit `config.js`（見 PROCESS.md 8.2 策略 A）。

---

## 驗收清單

逐項打勾，全部完成才能進入 Phase 1：

- [ ] Firebase Console 看得到專案，名稱與 ID 已記下
- [ ] Authentication → Sign-in method：**匿名** 與 **Google** 均顯示「已啟用」
- [ ] Firestore Database 已建立，位置為 `asia-east1`
- [ ] Firestore 規則已發布（規則分頁頂部顯示發布時間）
- [ ] 已在「您的應用程式」註冊 Web 應用程式 `travel-plan-web`
- [ ] `config.js` 已建立於專案根目錄，內含完整的 6 個欄位值
- [ ] `config.js` 內 `window.appId = "travel-plan-personal"` 已設定

---

## 常見問題排除

### Q1：建立專案時提示「您已達到專案上限」

每個免費 Google 帳號最多可建立 10 個 Firebase 專案。
若已達上限，可至 [Firebase Console](https://console.firebase.google.com) → 找一個用不到的舊專案 → 設定 → 刪除專案。

### Q2：Authentication 啟用 Google 後一直跳「指紋驗證」或「OAuth consent screen 未設定」

這通常發生在「自架網域要部署」時才會卡住，Phase 0 階段在 localhost 不會遇到。
若提前遇到，可至 Google Cloud Console → APIs & Services → OAuth consent screen → 完成基本資訊（User Type 選 External，App name 自取，加入您的 email），詳細步驟在 PROCESS.md Phase 8.5。

### Q3：Firestore 規則發布時跳「Syntax error」

- 確認**全部刪除預設內容**再貼新規則，不要把新舊規則混在一起。
- 確認貼進來的是文字而非格式化後的 Markdown（複製時不要從 GitHub 渲染畫面複製，建議從 raw 內容複製或從 PROCESS.md 原始檔複製）。

### Q4：可以選別的 Firestore 位置嗎？

- 可以，但**位置一旦設定無法修改**。
- 對台灣使用者來說，`asia-east1`（彰化）延遲最低（~10ms），其次 `asia-northeast1`（東京，~30ms）。
- 不建議選 `us-central1` 等北美節點（延遲 150ms+）。

### Q5：firebaseConfig 金鑰外洩會怎樣？

- Web 端 Firebase API Key 設計上**就是公開**的（無法藏住，瀏覽器網路請求中可見）。
- 真正的安全靠 **Firestore Rules**：
  - 我們的規則限制「只有 owner UID 才能寫該 user 的私有資料」
  - 攻擊者即使拿到 Key，沒有對應的 Google 登入 UID 也無法寫您的資料
- 唯一風險是有人惡意大量呼叫消耗免費額度，個人家庭工具基本不會被盯上。

### Q6：朋友也想用同一個 Firebase 專案可以嗎？

- 可以。CLAUDE.md 第 5 節「多家庭共存設計」已說明：
  - 每位規劃者用自己的 Google UID，資料完全隔離
  - 免費額度（每天 50K 讀、20K 寫）少量家庭（< 10 個）共用綽綽有餘
- 但**您技術上可從 Firebase Console 看到朋友的資料庫內容**，若朋友介意隱私，建議朋友 fork 一份自建 Firebase。

---

## 安全性說明

| 元素 | 是否敏感 | 處置方式 |
|------|---------|---------|
| `firebaseConfig.apiKey` | ❌ 不敏感 | 可公開 commit；安全靠 Firestore Rules |
| `firebaseConfig.projectId` | ❌ 不敏感 | 公開無妨 |
| Firestore 安全規則 | ⚠️ 重要 | 部署前務必發布；本文步驟 0.3 已完成 |
| Google 帳號密碼 | ✅ 高度敏感 | 永遠不要寫進程式碼或檔案 |
| OAuth Client Secret（若使用）| ✅ 高度敏感 | 本專案的 Web OAuth 不需要 secret |

---

## 下一步

完成本文所有步驟與驗收清單後，您可以開始 **Phase 1：基礎架構**。
建議透過 Claude Code 執行：

```
請依 PROCESS.md Phase 1 的任務清單,開始建立 index.html 骨架
```

---

**最後更新**：2026-05-16
**對應文件**：`CLAUDE.md` 第 6 節「資料模型」、`PROCESS.md` Phase 0
