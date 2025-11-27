import * as SQLite from 'expo-sqlite';

let db = null;

function sanitizeRecord(record) {
  if (!record) {
    throw new Error('記錄內容不可為空');
  }

  const ts = record.timestamp ?? new Date();
  const timestampDate = new Date(ts);
  if (Number.isNaN(timestampDate.getTime())) {
    throw new Error('時間戳記格式錯誤');
  }
  const timestamp = timestampDate.toISOString();

  const moodScore = Number(record.moodScore);
  if (!Number.isFinite(moodScore)) {
    throw new Error('心情分數遺失或格式錯誤');
  }

  const latitude = Number(record.latitude);
  const longitude = Number(record.longitude);
  if (!Number.isFinite(latitude) || !Number.isFinite(longitude)) {
    throw new Error('GPS 位置未取得，無法儲存');
  }

  const videoUri = typeof record.videoUri === 'string' ? record.videoUri.trim() : '';
  if (!videoUri) {
    throw new Error('自拍檔案遺失，請重新拍攝');
  }

  return {
    timestamp,
    moodScore,
    moodLabel: typeof record.moodLabel === 'string' ? record.moodLabel : '',
    latitude,
    longitude,
    videoUri,
    notes: typeof record.notes === 'string' ? record.notes : '',
  };
}

// 初始化資料庫
export async function initDatabase() {
  if (db) return db;

  try {
    db = await SQLite.openDatabaseAsync('emogo_esm.db');

    // 建立記錄表格
    await db.execAsync(`
      CREATE TABLE IF NOT EXISTS records (
        id INTEGER PRIMARY KEY AUTOINCREMENT,
        timestamp TEXT NOT NULL,
        mood_score INTEGER NOT NULL,
        mood_label TEXT,
        latitude REAL,
        longitude REAL,
        video_uri TEXT,
        notes TEXT,
        created_at TEXT DEFAULT CURRENT_TIMESTAMP
      );
    `);
  
    console.log('✅ Database initialized');
    return db;
  } catch (error) {
    console.error('❌ Database initialization failed:', error);
    throw error;
  }
}

// 取得資料庫實例
export async function getDatabase() {
  if (!db) {
    await initDatabase();
  }
  return db;
}

// 新增記錄
export async function insertRecord(record) {
  const database = await getDatabase();
  const sanitized = sanitizeRecord(record);

  try {
    const result = await database.runAsync(
      `INSERT INTO records (timestamp, mood_score, mood_label, latitude, longitude, video_uri, notes)
       VALUES (?, ?, ?, ?, ?, ?, ?)`,
      [
        sanitized.timestamp,
        sanitized.moodScore,
        sanitized.moodLabel,
        sanitized.latitude,
        sanitized.longitude,
        sanitized.videoUri,
        sanitized.notes,
      ]
    );
  
    console.log('✅ Record inserted with ID:', result.lastInsertRowId);
    return result.lastInsertRowId;
  } catch (error) {
    console.error('❌ Failed to insert record:', error);
    throw error;
  }
}

// 取得所有記錄
export async function getAllRecords() {
  const database = await getDatabase();
  try {
    return await database.getAllAsync(
      'SELECT * FROM records ORDER BY timestamp DESC'
    );
  } catch (error) {
    console.error('❌ Failed to load records:', error);
    throw error;
  }
}

// 取得記錄數量
export async function getRecordCount() {
  const database = await getDatabase();
  try {
    const result = await database.getFirstAsync(
      'SELECT COUNT(*) as count FROM records'
    );
    return result?.count || 0;
  } catch (error) {
    console.error('❌ Failed to get record count:', error);
    throw error;
  }
}

// 取得時間範圍
export async function getTimeRange() {
  const database = await getDatabase();
  try {
    const result = await database.getFirstAsync(`
      SELECT 
        MIN(timestamp) as first_timestamp,
        MAX(timestamp) as last_timestamp
      FROM records
    `);
    
    // 如果沒有記錄，result 可能是 null 或屬性為 null
    if (!result || !result.first_timestamp) {
      return {
        first_timestamp: null,
        last_timestamp: null
      };
    }
    
    return result;
  } catch (error) {
    console.error('❌ Failed to get time range:', error);
    throw error;
  }
}

// 刪除單筆記錄
export async function deleteRecord(id) {
  const database = await getDatabase();
  try {
    await database.runAsync('DELETE FROM records WHERE id = ?', [id]);
    console.log('🗑️ Record deleted:', id);
  } catch (error) {
    console.error('❌ Failed to delete record:', error);
    throw error;
  }
}

// 刪除所有記錄
export async function deleteAllRecords() {
  const database = await getDatabase();
  try {
    // 先清空表格
    await database.runAsync('DELETE FROM records');
    
    // 重置 SQLite 自增 ID
    await database.runAsync('DELETE FROM sqlite_sequence WHERE name="records"');
    
    console.log('🗑️ All records deleted and sequence reset');
  } catch (error) {
    console.error('❌ Failed to delete all records:', error);
    throw error;
  }
}

// 匯出記錄為 JSON 格式
export async function exportRecordsAsJson() {
  try {
    const records = await getAllRecords();
    const timeRange = await getTimeRange();
    
    // 處理空資料情況
    const firstTimestamp = timeRange?.first_timestamp ? new Date(timeRange.first_timestamp) : null;
    const lastTimestamp = timeRange?.last_timestamp ? new Date(timeRange.last_timestamp) : null;
    const durationHours = firstTimestamp && lastTimestamp 
      ? (lastTimestamp - firstTimestamp) / (1000 * 60 * 60) 
      : 0;
  
    const exportData = {
      appName: 'EmoGo ESM App',
      exportDate: new Date().toISOString(),
      totalRecords: records.length,
      timeRange: {
        firstRecord: timeRange?.first_timestamp || null,
        lastRecord: timeRange?.last_timestamp || null,
        durationHours,
      },
      records: records.map(r => ({
        id: r.id,
        timestamp: r.timestamp,
        moodScore: r.mood_score,
        moodLabel: r.mood_label,
        location: {
          latitude: r.latitude,
          longitude: r.longitude,
        },
        videoUri: r.video_uri,
        notes: r.notes,
      })),
    };
  
    return JSON.stringify(exportData, null, 2);
  } catch (error) {
    console.error('❌ Failed to export JSON:', error);
    throw error;
  }
}

// 匯出記錄為 CSV 格式
export async function exportRecordsAsCsv() {
  try {
    const records = await getAllRecords();
  
    const headers = ['id', 'timestamp', 'mood_score', 'mood_label', 'latitude', 'longitude', 'video_uri', 'notes'];
    const csvLines = [headers.join(',')];
  
    records.forEach(r => {
      const row = [
        r.id,
        `"${r.timestamp}"`,
        r.mood_score,
        `"${r.mood_label || ''}"`,
        r.latitude ?? '',
        r.longitude ?? '',
        `"${r.video_uri || ''}"`,
        `"${(r.notes || '').replace(/"/g, '""')}"`
      ];
      csvLines.push(row.join(','));
    });
  
    return csvLines.join('\n');
  } catch (error) {
    console.error('❌ Failed to export CSV:', error);
    throw error;
  }
}

