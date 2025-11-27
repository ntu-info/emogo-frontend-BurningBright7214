# EmoGo ESM App 🎭

**經驗取樣法 (Experience Sampling Method) 情緒記錄 App**

一個用於心理學研究的多模態資料收集應用程式，能夠記錄使用者的情緒狀態、GPS 位置和 1 秒鐘 Vlog。

## 📱 App 連結

**📥 Android APK 下載連結**:  
https://expo.dev/accounts/blake_su/projects/emogo-esm-app/builds/9774b31c-7d52-4e1d-8905-7396e98f40f1

## ✨ 功能特色

### 1. 情緒問卷 📊
- 1-5 分情緒評分系統
- 視覺化的表情符號選擇
- 可選填的備註欄位

### 2. 1 秒 Vlog 🎬
- 前後鏡頭切換
- 3 秒倒數計時
- 自動錄製 1 秒影片
- 影片儲存至本地

### 3. GPS 座標 📍
- 自動抓取經緯度
- 高精度定位

### 4. 通知提醒 🔔
- 每日三次提醒 (09:00, 14:00, 20:00)
- 可自由開關

### 5. 資料匯出 📤
- JSON 格式匯出
- CSV 格式匯出
- 分享功能

## 🛠️ 技術架構

### 使用的 Expo 套件

| 套件 | 用途 |
|------|------|
| `expo-sqlite` | 本地資料庫儲存 |
| `expo-camera` | 相機錄影功能 |
| `expo-location` | GPS 定位 |
| `expo-notifications` | 推播通知提醒 |
| `expo-file-system` | 檔案管理 |
| `expo-sharing` | 資料匯出分享 |
| `expo-media-library` | 媒體檔案存取 |
| `expo-av` | 影音處理 |

### 專案結構

```
emogo-frontend-BurningBright7214/
├── app/
│   ├── (tabs)/
│   │   ├── _layout.js      # Tab 導航配置
│   │   ├── index.js        # 記錄頁面 (首頁)
│   │   ├── history.js      # 歷史紀錄頁面
│   │   └── settings.js     # 設定與匯出頁面
│   ├── camera.js           # 相機錄影頁面
│   ├── _layout.js          # Root Layout
│   └── index.js            # 入口重導向
├── utils/
│   ├── database.js         # SQLite 資料庫操作
│   ├── location.js         # GPS 定位功能
│   └── notifications.js    # 通知管理
├── assets/                 # 靜態資源
├── data/                   # 匯出的資料
│   ├── videos/             # 匯出的影片檔案
│   ├── *.json              # JSON 匯出檔 (包含全部歷史紀錄與統計)
│   └── *.csv               # CSV 匯出檔 (包含全部歷史紀錄)
├── app.json
├── package.json
└── README.md
```

## 🚀 安裝與執行

### 1. 安裝依賴

```bash
npm install
```

### 2. 啟動開發伺服器

```bash
npx expo start
```

### 3. 在手機上執行

- 下載 **Expo Go** App
- 掃描終端機顯示的 QR Code
- 或使用 USB 連接執行 `npx expo run:android` / `npx expo run:ios`

## 📊 資料格式

**注意：匯出的 JSON 與 CSV 檔案皆包含資料庫內所有的歷史記錄，並非僅限當次操作。**

### JSON 匯出範例

```json
{
  "appName": "EmoGo ESM App",
  "exportDate": "2024-11-26T12:00:00.000Z",
  "totalRecords": 5,
  "timeRange": {
    "firstRecord": "2024-11-25T09:30:00.000Z",
    "lastRecord": "2024-11-26T10:00:00.000Z",
    "durationHours": 24.5
  },
  "records": [
    {
      "id": 1,
      "timestamp": "2024-11-25T09:30:00.000Z",
      "moodScore": 4,
      "moodLabel": "不錯",
      "location": {
        "latitude": 25.0330,
        "longitude": 121.5654
      },
      "videoUri": "file:///..../vlog_1732537800000.mp4",
      "notes": "今天心情不錯"
    }
  ]
}
```

### CSV 匯出格式

| id | timestamp | mood_score | mood_label | latitude | longitude | video_uri | notes |
|----|-----------|------------|------------|----------|-----------|-----------|-------|
| 1  | 2024-11-25T09:30:00.000Z | 4 | 不錯 | 25.0330 | 121.5654 | file:///... | 今天心情不錯 |

## ✅ 作業要求 Checklist

- [x] **情緒問卷** - 結構化、主動數據
- [x] **1 秒 Vlog** - 非結構化、主動數據
- [x] **GPS 座標** - 結構化、被動數據
- [x] **本地儲存** - expo-sqlite
- [x] **通知提醒** - expo-notifications
- [x] **資料匯出** - expo-sharing

### 資料收集要求

- [x] 至少 3 筆記錄
- [x] 時間跨度 > 12 小時

## 📁 Data 資料夾

此資料夾包含實際測試收集的數據：

1. `*.json`: 完整資料庫匯出，包含統計資訊。
2. `*.csv`: 完整資料庫匯出，試算表格式。
3. `videos/`: 每次紀錄對應的 1 秒 Vlog 影片檔。

## 🤖 AI 協作紀錄

本專案使用 Cursor AI 協助開發，對話紀錄請見：
- `cursor_.md`: 完整開發對話紀錄，包含功能實作、除錯與優化過程。

## 👨‍💻 開發者

- **學號**: [請填入]
- **姓名**: [請填入]

## 📝 License

MIT License - 僅供教育用途

---

**心理資訊課程作業 © 2024**
