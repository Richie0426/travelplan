window.firebaseConfig = {
    apiKey: "AIzaSyAkKNmOM8-KsbjZcGZgbd_4zGthVdqHdbI",
    authDomain: "travel-plan-richie.firebaseapp.com",
    projectId: "travel-plan-richie",
    storageBucket: "travel-plan-richie.firebasestorage.app",
    messagingSenderId: "343571726851",
    appId: "1:343571726851:web:9a8a13aa2cb3031d3d0436"
  };

  // 應用程式內部識別碼,用於 Firestore 路徑分隔
// (與 firebaseConfig.appId 不同,這是業務邏輯用的)
window.appId = "travel-plan-personal";

// (Phase 7 用)中央氣象署 API Key,可現在留空,之後申請後填入
// 申請網址:https://opendata.cwa.gov.tw
window.cwaApiKey = "CWA-1918544C-491A-440C-A927-D73C23063957";