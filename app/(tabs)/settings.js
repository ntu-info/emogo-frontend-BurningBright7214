import { useState, useEffect } from "react";
import {
  View,
  Text,
  StyleSheet,
  TouchableOpacity,
  ScrollView,
  Alert,
  ActivityIndicator,
  Switch,
} from "react-native";
import { Ionicons } from "@expo/vector-icons";
import { File, Paths } from "expo-file-system/next";
import * as Sharing from "expo-sharing";
import {
  getAllRecords,
  getRecordCount,
  getTimeRange,
  deleteAllRecords,
  exportRecordsAsJson,
  exportRecordsAsCsv,
} from "../../utils/database";
import {
  requestNotificationPermissions,
  scheduleReminders,
  cancelAllReminders,
  sendTestNotification,
  getScheduledReminders,
} from "../../utils/notifications";
import { theme } from "../../constants/theme";

const { colors, radii } = theme;

export default function SettingsScreen() {
  const [recordCount, setRecordCount] = useState(0);
  const [timeRange, setTimeRange] = useState(null);
  const [isExporting, setIsExporting] = useState(false);
  const [notificationsEnabled, setNotificationsEnabled] = useState(false);
  const [scheduledCount, setScheduledCount] = useState(0);

  useEffect(() => {
    loadStats();
    loadNotificationStatus();
  }, []);

  const verifyExportFile = async (file) => {
    if (!file.exists) {
      throw new Error("產生匯出檔案時發生錯誤，請稍後再試");
    }
    return true;
  };

  const loadStats = async () => {
    try {
      const count = await getRecordCount();
      const range = await getTimeRange();
      setRecordCount(count);
      setTimeRange(range);
    } catch (error) {
      console.error("Stats load error:", error);
      Alert.alert("錯誤", "無法取得資料統計，請稍後再試");
      setRecordCount(0);
      setTimeRange(null);
    }
  };

  const loadNotificationStatus = async () => {
    try {
      const scheduled = await getScheduledReminders();
      setScheduledCount(scheduled.length);
      setNotificationsEnabled(scheduled.length > 0);
    } catch (error) {
      console.error("Notification status error:", error);
      setScheduledCount(0);
      setNotificationsEnabled(false);
    }
  };

  const calculateDuration = () => {
    if (!timeRange?.first_timestamp || !timeRange?.last_timestamp) return 0;
    const first = new Date(timeRange.first_timestamp);
    const last = new Date(timeRange.last_timestamp);
    return ((last - first) / (1000 * 60 * 60)).toFixed(1);
  };

  const handleExportJson = async () => {
    if (recordCount === 0) {
      Alert.alert("提示", "沒有資料可匯出");
      return;
    }

    setIsExporting(true);
    try {
      const jsonData = await exportRecordsAsJson();
      const fileName = `emogo_export_${new Date().toISOString().split("T")[0]}.json`;
      const file = new File(Paths.cache, fileName);

      if (file.exists) {
        await file.delete();
      }

      await file.create();
      await file.write(jsonData);
      await verifyExportFile(file);

      if (await Sharing.isAvailableAsync()) {
        await Sharing.shareAsync(file.uri, {
          mimeType: "application/json",
          dialogTitle: "匯出 EmoGo 資料",
        });
      } else {
        Alert.alert("成功", `檔案已儲存至: ${file.uri}`);
      }
    } catch (error) {
      console.error("Export error:", error);
      Alert.alert("錯誤", error?.message || "匯出失敗，請重試");
    } finally {
      setIsExporting(false);
    }
  };

  const handleExportCsv = async () => {
    if (recordCount === 0) {
      Alert.alert("提示", "沒有資料可匯出");
      return;
    }

    setIsExporting(true);
    try {
      const csvData = await exportRecordsAsCsv();
      const fileName = `emogo_export_${new Date().toISOString().split("T")[0]}.csv`;
      const file = new File(Paths.cache, fileName);

      if (file.exists) {
        await file.delete();
      }

      await file.create();
      await file.write(csvData);
      await verifyExportFile(file);

      if (await Sharing.isAvailableAsync()) {
        await Sharing.shareAsync(file.uri, {
          mimeType: "text/csv",
          dialogTitle: "匯出 EmoGo 資料",
        });
      } else {
        Alert.alert("成功", `檔案已儲存至: ${file.uri}`);
      }
    } catch (error) {
      console.error("Export error:", error);
      Alert.alert("錯誤", error?.message || "匯出失敗，請重試");
    } finally {
      setIsExporting(false);
    }
  };

  const handleExportVideos = async () => {
    setIsExporting(true);
    try {
      const records = await getAllRecords();
      const videoPaths = records.filter((r) => r.video_uri).map((r) => r.video_uri);

      if (videoPaths.length === 0) {
        Alert.alert("提示", "沒有影片可匯出");
        setIsExporting(false);
        return;
      }

      // 逐一分享影片
      let exportedCount = 0;
      for (let i = 0; i < videoPaths.length; i++) {
        const videoUri = videoPaths[i];
        const videoFile = new File(videoUri);
        
        if (videoFile.exists) {
          if (await Sharing.isAvailableAsync()) {
            await Sharing.shareAsync(videoUri, {
              mimeType: "video/mp4",
              dialogTitle: `匯出影片 ${i + 1}/${videoPaths.length}`,
            });
            exportedCount++;
          }
        }
      }

      Alert.alert("完成", `已匯出 ${exportedCount} 個影片檔案`);
    } catch (error) {
      console.error("Video export error:", error);
      Alert.alert("錯誤", error?.message || "匯出影片失敗，請重試");
    } finally {
      setIsExporting(false);
    }
  };

  const handleDeleteAll = () => {
    if (recordCount === 0) {
      Alert.alert("提示", "沒有資料可刪除");
      return;
    }

    Alert.alert(
      "⚠️ 確認刪除所有資料",
      "此操作無法復原！確定要刪除所有記錄嗎？",
      [
        { text: "取消", style: "cancel" },
        {
          text: "刪除全部",
          style: "destructive",
          onPress: async () => {
            await deleteAllRecords();
            await loadStats();
            Alert.alert("完成", "所有資料已刪除");
          },
        },
      ]
    );
  };

  const toggleNotifications = async (value) => {
    if (value) {
      const hasPermission = await requestNotificationPermissions();
      if (hasPermission) {
        await scheduleReminders();
        setNotificationsEnabled(true);
        await loadNotificationStatus();
        Alert.alert("成功", "已設定每日提醒通知（09:00、14:00、20:00）");
      } else {
        Alert.alert("錯誤", "請在設定中允許通知權限");
      }
    } else {
      await cancelAllReminders();
      setNotificationsEnabled(false);
      setScheduledCount(0);
      Alert.alert("已關閉", "已取消所有提醒通知");
    }
  };

  const handleTestNotification = async () => {
    await sendTestNotification();
    Alert.alert("已發送", "測試通知已發送！");
  };

  return (
    <ScrollView style={styles.container} contentContainerStyle={styles.content}>
      {/* 資料統計 */}
      <View style={styles.statsCard}>
        <Text style={styles.sectionTitle}>📊 資料統計</Text>
        <View style={styles.statsGrid}>
          <View style={styles.statItem}>
            <Text style={styles.statValue}>{recordCount}</Text>
            <Text style={styles.statLabel}>總記錄數</Text>
          </View>
          <View style={styles.statItem}>
            <Text style={styles.statValue}>{calculateDuration()}</Text>
            <Text style={styles.statLabel}>小時跨度</Text>
          </View>
        </View>
        {timeRange?.first_timestamp && (
          <View style={styles.timeRangeInfo}>
            <Text style={styles.timeRangeText}>
              首筆記錄:{" "}
              {new Date(timeRange.first_timestamp).toLocaleString("zh-TW")}
            </Text>
            <Text style={styles.timeRangeText}>
              最新記錄:{" "}
              {new Date(timeRange.last_timestamp).toLocaleString("zh-TW")}
            </Text>
          </View>
        )}
        {parseFloat(calculateDuration()) >= 12 && (
          <View style={styles.successBadge}>
            <Ionicons name="checkmark-circle" size={20} color={colors.success} />
            <Text style={styles.successText}>
              ✅ 已達成 12 小時跨度要求！
            </Text>
          </View>
        )}
      </View>

      {/* 通知設定 */}
      <View style={styles.section}>
        <Text style={styles.sectionTitle}>🔔 通知設定</Text>
        <View style={styles.settingRow}>
          <View style={styles.settingInfo}>
            <Text style={styles.settingLabel}>每日提醒</Text>
            <Text style={styles.settingDescription}>
              {scheduledCount > 0
                ? `已設定 ${scheduledCount} 個提醒`
                : "開啟後每天會提醒你記錄心情"}
            </Text>
          </View>
          <Switch
            value={notificationsEnabled}
            onValueChange={toggleNotifications}
            trackColor={{ false: colors.borderMuted, true: colors.primary }}
            thumbColor={notificationsEnabled ? colors.textPrimary : colors.textMuted}
          />
        </View>
        <TouchableOpacity
          style={styles.settingButton}
          onPress={handleTestNotification}
        >
          <Ionicons name="notifications-outline" size={20} color={colors.primary} />
          <Text style={styles.settingButtonText}>發送測試通知</Text>
        </TouchableOpacity>
      </View>

      {/* 資料匯出 */}
      <View style={styles.section}>
        <Text style={styles.sectionTitle}>📤 資料匯出</Text>
        <TouchableOpacity
          style={styles.exportButton}
          onPress={handleExportJson}
          disabled={isExporting}
        >
          {isExporting ? (
            <ActivityIndicator color={colors.primary} />
          ) : (
            <Ionicons name="code-slash" size={24} color={colors.primary} />
          )}
          <View style={styles.exportButtonText}>
            <Text style={styles.exportButtonTitle}>匯出 JSON</Text>
            <Text style={styles.exportButtonSubtitle}>
              包含完整資料結構，適合程式處理
            </Text>
          </View>
          <Ionicons name="share-outline" size={24} color={colors.textMuted} />
        </TouchableOpacity>

        <TouchableOpacity
          style={styles.exportButton}
          onPress={handleExportCsv}
          disabled={isExporting}
        >
          <Ionicons name="document-text" size={24} color={colors.success} />
          <View style={styles.exportButtonText}>
            <Text style={styles.exportButtonTitle}>匯出 CSV</Text>
            <Text style={styles.exportButtonSubtitle}>
              可用 Excel 開啟，適合資料分析
            </Text>
          </View>
          <Ionicons name="share-outline" size={24} color={colors.textMuted} />
        </TouchableOpacity>

        <TouchableOpacity
          style={styles.exportButton}
          onPress={handleExportVideos}
        >
          <Ionicons name="videocam" size={24} color={colors.accent} />
          <View style={styles.exportButtonText}>
            <Text style={styles.exportButtonTitle}>影片檔案</Text>
            <Text style={styles.exportButtonSubtitle}>
              查看已錄製的 Vlog 影片
            </Text>
          </View>
          <Ionicons name="folder-outline" size={24} color={colors.textMuted} />
        </TouchableOpacity>
      </View>

      {/* 危險區域 */}
      <View style={styles.section}>
        <Text style={[styles.sectionTitle, { color: colors.danger }]}>
          ⚠️ 危險區域
        </Text>
        <TouchableOpacity
          style={styles.dangerButton}
          onPress={handleDeleteAll}
        >
          <Ionicons name="trash" size={24} color={colors.danger} />
          <Text style={styles.dangerButtonText}>刪除所有資料</Text>
        </TouchableOpacity>
      </View>

      {/* App 資訊 */}
      <View style={styles.appInfo}>
        <Text style={styles.appName}>EmoGo ESM App</Text>
        <Text style={styles.appVersion}>Version 1.0.0</Text>
        <Text style={styles.appDescription}>
          經驗取樣法 (Experience Sampling Method) App
        </Text>
        <Text style={styles.appCopyright}>心理資訊課程作業 © 2024</Text>
      </View>

      <View style={{ height: 40 }} />
    </ScrollView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: colors.background,
  },
  content: {
    padding: 20,
    paddingBottom: 60,
  },
  statsCard: {
    backgroundColor: colors.surface,
    borderRadius: radii.lg,
    padding: 22,
    marginBottom: 24,
    borderWidth: 1,
    borderColor: colors.borderMuted,
  },
  sectionTitle: {
    fontSize: 18,
    fontWeight: "600",
    color: colors.textPrimary,
    marginBottom: 16,
  },
  statsGrid: {
    flexDirection: "row",
    justifyContent: "space-around",
    marginBottom: 16,
  },
  statItem: {
    alignItems: "center",
  },
  statValue: {
    fontSize: 36,
    fontWeight: "bold",
    color: colors.primary,
  },
  statLabel: {
    fontSize: 14,
    color: colors.textSecondary,
    marginTop: 4,
  },
  timeRangeInfo: {
    backgroundColor: colors.surfaceAlt,
    borderRadius: radii.sm,
    padding: 12,
    gap: 4,
    borderWidth: 1,
    borderColor: colors.borderMuted,
  },
  timeRangeText: {
    fontSize: 12,
    color: colors.textSecondary,
  },
  successBadge: {
    flexDirection: "row",
    alignItems: "center",
    gap: 8,
    marginTop: 16,
    backgroundColor: colors.successSoft,
    borderRadius: radii.sm,
    padding: 12,
  },
  successText: {
    fontSize: 14,
    color: colors.success,
    fontWeight: "600",
  },
  section: {
    backgroundColor: colors.surface,
    borderRadius: radii.lg,
    padding: 20,
    marginBottom: 16,
    borderWidth: 1,
    borderColor: colors.borderMuted,
  },
  settingRow: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
    marginBottom: 16,
  },
  settingInfo: {
    flex: 1,
  },
  settingLabel: {
    fontSize: 16,
    fontWeight: "500",
    color: colors.textPrimary,
  },
  settingDescription: {
    fontSize: 14,
    color: colors.textSecondary,
    marginTop: 2,
  },
  settingButton: {
    flexDirection: "row",
    alignItems: "center",
    gap: 8,
    padding: 12,
    backgroundColor: colors.surfaceAlt,
    borderRadius: radii.sm,
    borderWidth: 1,
    borderColor: colors.borderMuted,
  },
  settingButtonText: {
    fontSize: 14,
    color: colors.primary,
    fontWeight: "500",
  },
  exportButton: {
    flexDirection: "row",
    alignItems: "center",
    backgroundColor: colors.surfaceAlt,
    borderRadius: radii.md,
    padding: 16,
    marginBottom: 12,
    gap: 16,
    borderWidth: 1,
    borderColor: colors.borderMuted,
  },
  exportButtonText: {
    flex: 1,
  },
  exportButtonTitle: {
    fontSize: 16,
    fontWeight: "600",
    color: colors.textPrimary,
  },
  exportButtonSubtitle: {
    fontSize: 12,
    color: colors.textMuted,
    marginTop: 2,
  },
  dangerButton: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
    backgroundColor: colors.dangerSoft,
    borderRadius: radii.md,
    padding: 16,
    gap: 12,
    borderWidth: 1,
    borderColor: colors.danger,
  },
  dangerButtonText: {
    fontSize: 16,
    fontWeight: "600",
    color: colors.danger,
  },
  appInfo: {
    alignItems: "center",
    paddingVertical: 24,
  },
  appName: {
    fontSize: 20,
    fontWeight: "bold",
    color: colors.primary,
  },
  appVersion: {
    fontSize: 14,
    color: colors.textMuted,
    marginTop: 4,
  },
  appDescription: {
    fontSize: 14,
    color: colors.textSecondary,
    marginTop: 8,
  },
  appCopyright: {
    fontSize: 12,
    color: colors.textMuted,
    marginTop: 4,
  },
});
