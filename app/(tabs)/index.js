import { useState, useEffect, useRef } from "react";
import {
  View,
  Text,
  StyleSheet,
  TouchableOpacity,
  ScrollView,
  Alert,
  ActivityIndicator,
  TextInput,
  Platform,
} from "react-native";
import { useRouter } from "expo-router";
import { Ionicons } from "@expo/vector-icons";
import { initDatabase, insertRecord, getRecordCount } from "../../utils/database";
import { getCurrentLocation } from "../../utils/location";
import { theme } from "../../constants/theme";

const { colors, radii } = theme;

const MOOD_OPTIONS = [
  { score: 1, label: "非常低落", emoji: "😢", color: "#F97386" },
  { score: 2, label: "有點低落", emoji: "😔", color: "#F59E0B" },
  { score: 3, label: "普通", emoji: "😐", color: "#FBBF24" },
  { score: 4, label: "不錯", emoji: "🙂", color: theme.colors.success },
  { score: 5, label: "非常好", emoji: "😄", color: "#2DD4BF" },
];

export default function RecordScreen() {
  const router = useRouter();
  const [selectedMood, setSelectedMood] = useState(null);
  const [notes, setNotes] = useState("");
  const [location, setLocation] = useState(null);
  const [videoUri, setVideoUri] = useState(null);
  const [isLoading, setIsLoading] = useState(false);
  const [isFetchingLocation, setIsFetchingLocation] = useState(false);
  const [recordCount, setRecordCount] = useState(0);

  useEffect(() => {
    // 初始化資料庫
    initDatabase();
    // 取得記錄數量
    loadRecordCount();
  }, []);

  const loadRecordCount = async () => {
    const count = await getRecordCount();
    setRecordCount(count);
  };

  const fetchLocation = async () => {
    setIsFetchingLocation(true);
    try {
      const loc = await getCurrentLocation();
      if (loc) {
        setLocation(loc);
        Alert.alert("成功", "已取得您的位置！");
      } else {
        Alert.alert("錯誤", "無法取得位置，請確認已開啟定位權限");
      }
    } catch (error) {
      Alert.alert("錯誤", "取得位置時發生錯誤");
    }
    setIsFetchingLocation(false);
  };

  const openCamera = () => {
    router.push("/camera");
  };

  const handleSubmit = async () => {
    // 驗證必填項目
    if (!selectedMood) {
      Alert.alert("提醒", "請選擇您的心情狀態");
      return;
    }

    if (!location) {
      Alert.alert("提醒", "請先取得 GPS 位置");
      return;
    }

    if (!videoUri) {
      Alert.alert("提醒", "請先拍攝自拍照");
      return;
    }

    setIsLoading(true);

    try {
      await initDatabase();
      const moodData = MOOD_OPTIONS.find((m) => m.score === selectedMood);
      
      await insertRecord({
        timestamp: new Date().toISOString(),
        moodScore: selectedMood,
        moodLabel: moodData?.label || "",
        latitude: location?.latitude,
        longitude: location?.longitude,
        videoUri: videoUri,
        notes: notes,
      });

      Alert.alert("成功！🎉", "已成功記錄您的心情狀態", [
        {
          text: "確定",
          onPress: () => {
            // 重置表單
            setSelectedMood(null);
            setNotes("");
            setLocation(null);
            setVideoUri(null);
            loadRecordCount();
          },
        },
      ]);
    } catch (error) {
      console.error("Error saving record:", error);
      Alert.alert("錯誤", error?.message || "儲存時發生錯誤，請重試");
    } finally {
      setIsLoading(false);
    }
  };

  // 從相機頁面返回時接收 videoUri
  useEffect(() => {
    const checkVideoUri = () => {
      if (global.capturedVideoUri) {
        setVideoUri(global.capturedVideoUri);
        global.capturedVideoUri = null;
      }
    };
    
    const interval = setInterval(checkVideoUri, 500);
    return () => clearInterval(interval);
  }, []);

  const getCompletionStatus = () => {
    let completed = 0;
    if (selectedMood) completed++;
    if (location) completed++;
    if (videoUri) completed++;
    return completed;
  };

  return (
    <ScrollView style={styles.container} contentContainerStyle={styles.content}>
      {/* 進度指示器 */}
      <View style={styles.progressCard}>
        <Text style={styles.progressTitle}>記錄進度</Text>
        <View style={styles.progressBar}>
          <View
            style={[
              styles.progressFill,
              { width: `${(getCompletionStatus() / 3) * 100}%` },
            ]}
          />
        </View>
        <Text style={styles.progressText}>
          已完成 {getCompletionStatus()}/3 項目 • 總共 {recordCount} 筆記錄
        </Text>
      </View>

      {/* 情緒選擇區塊 */}
      <View style={styles.section}>
        <View style={styles.sectionHeader}>
          <Ionicons
            name={selectedMood ? "checkmark-circle" : "ellipse-outline"}
            size={24}
            color={selectedMood ? colors.success : colors.textMuted}
          />
          <Text style={styles.sectionTitle}>1. 你現在的心情如何？</Text>
        </View>
        <View style={styles.moodGrid}>
          {MOOD_OPTIONS.map((mood) => (
            <TouchableOpacity
              key={mood.score}
              style={[
                styles.moodButton,
                selectedMood === mood.score && {
                  borderColor: mood.color,
                  backgroundColor: mood.color + "20",
                },
              ]}
              onPress={() => setSelectedMood(mood.score)}
            >
              <Text style={styles.moodEmoji}>{mood.emoji}</Text>
              <Text style={styles.moodScore}>{mood.score} 分</Text>
              <Text style={styles.moodLabel}>{mood.label}</Text>
            </TouchableOpacity>
          ))}
        </View>
      </View>

      {/* 自拍照區塊 */}
      <View style={styles.section}>
        <View style={styles.sectionHeader}>
          <Ionicons
            name={videoUri ? "checkmark-circle" : "ellipse-outline"}
            size={24}
            color={videoUri ? colors.success : colors.textMuted}
          />
          <Text style={styles.sectionTitle}>2. 拍攝自拍照</Text>
        </View>
        <TouchableOpacity
          style={[styles.actionButton, videoUri && styles.actionButtonCompleted]}
          onPress={openCamera}
        >
          <Ionicons
            name={videoUri ? "camera" : "camera-outline"}
            size={32}
            color={videoUri ? colors.success : colors.primary}
          />
          <View style={styles.actionButtonText}>
            <Text style={styles.actionButtonTitle}>
              {videoUri ? "已拍攝 ✓" : "開啟相機"}
            </Text>
            <Text style={styles.actionButtonSubtitle}>
              {videoUri ? "點擊可重新拍攝" : "拍攝你當下的表情"}
            </Text>
          </View>
          <Ionicons name="chevron-forward" size={24} color={colors.textMuted} />
        </TouchableOpacity>
      </View>

      {/* GPS 位置區塊 */}
      <View style={styles.section}>
        <View style={styles.sectionHeader}>
          <Ionicons
            name={location ? "checkmark-circle" : "ellipse-outline"}
            size={24}
            color={location ? colors.success : colors.textMuted}
          />
          <Text style={styles.sectionTitle}>3. 取得 GPS 位置</Text>
        </View>
        <TouchableOpacity
          style={[styles.actionButton, location && styles.actionButtonCompleted]}
          onPress={fetchLocation}
          disabled={isFetchingLocation}
        >
          {isFetchingLocation ? (
            <ActivityIndicator size="small" color={colors.primary} />
          ) : (
            <Ionicons
              name={location ? "location" : "location-outline"}
              size={32}
              color={location ? colors.success : colors.primary}
            />
          )}
          <View style={styles.actionButtonText}>
            <Text style={styles.actionButtonTitle}>
              {location ? "已取得位置 ✓" : "取得位置"}
            </Text>
            <Text style={styles.actionButtonSubtitle}>
              {location
                ? `${location.latitude.toFixed(4)}, ${location.longitude.toFixed(4)}`
                : "自動記錄您的經緯度"}
            </Text>
          </View>
          <Ionicons name="chevron-forward" size={24} color={colors.textMuted} />
        </TouchableOpacity>
      </View>

      {/* 備註區塊 */}
      <View style={styles.section}>
        <Text style={styles.sectionTitle}>📝 備註（選填）</Text>
        <TextInput
          style={styles.notesInput}
          placeholder="記錄當下的想法或感受..."
          placeholderTextColor={colors.textMuted}
          multiline
          numberOfLines={3}
          value={notes}
          onChangeText={setNotes}
        />
      </View>

      {/* 提交按鈕 */}
      <TouchableOpacity
        style={[
          styles.submitButton,
          getCompletionStatus() < 3 && styles.submitButtonDisabled,
        ]}
        onPress={handleSubmit}
        disabled={isLoading || getCompletionStatus() < 3}
      >
        {isLoading ? (
          <ActivityIndicator color={colors.textPrimary} />
        ) : (
          <>
            <Ionicons name="save" size={24} color={colors.background} />
            <Text style={styles.submitButtonText}>儲存記錄</Text>
          </>
        )}
      </TouchableOpacity>

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
  },
  progressCard: {
    backgroundColor: colors.surface,
    borderRadius: radii.lg,
    padding: 22,
    marginBottom: 28,
    borderWidth: 1,
    borderColor: colors.borderMuted,
  },
  progressTitle: {
    fontSize: 16,
    fontWeight: "600",
    color: colors.textSecondary,
    marginBottom: 12,
  },
  progressBar: {
    height: 10,
    backgroundColor: colors.borderMuted,
    borderRadius: 999,
    overflow: "hidden",
    marginBottom: 10,
  },
  progressFill: {
    height: "100%",
    backgroundColor: colors.primary,
    borderRadius: 999,
  },
  progressText: {
    fontSize: 14,
    color: colors.textSecondary,
  },
  section: {
    marginBottom: 28,
  },
  sectionHeader: {
    flexDirection: "row",
    alignItems: "center",
    gap: 8,
    marginBottom: 12,
  },
  sectionTitle: {
    fontSize: 18,
    fontWeight: "600",
    color: colors.textPrimary,
  },
  moodGrid: {
    flexDirection: "row",
    flexWrap: "wrap",
    gap: 12,
  },
  moodButton: {
    width: "18%",
    minWidth: 60,
    aspectRatio: 0.85,
    backgroundColor: colors.surfaceAlt,
    borderRadius: 16,
    borderWidth: 1,
    borderColor: colors.borderMuted,
    alignItems: "center",
    justifyContent: "center",
    padding: 8,
  },
  moodEmoji: {
    fontSize: 28,
    marginBottom: 4,
  },
  moodScore: {
    fontSize: 14,
    fontWeight: "bold",
    color: colors.textPrimary,
  },
  moodLabel: {
    fontSize: 10,
    color: colors.textMuted,
    textAlign: "center",
  },
  actionButton: {
    flexDirection: "row",
    alignItems: "center",
    backgroundColor: colors.surface,
    borderRadius: radii.md,
    padding: 18,
    gap: 16,
    borderWidth: 1,
    borderColor: colors.borderMuted,
  },
  actionButtonCompleted: {
    borderColor: colors.success,
  },
  actionButtonText: {
    flex: 1,
  },
  actionButtonTitle: {
    fontSize: 16,
    fontWeight: "600",
    color: colors.textPrimary,
    marginBottom: 4,
  },
  actionButtonSubtitle: {
    fontSize: 14,
    color: colors.textSecondary,
  },
  notesInput: {
    backgroundColor: colors.surfaceAlt,
    borderRadius: radii.md,
    padding: 16,
    fontSize: 16,
    color: colors.textPrimary,
    textAlignVertical: "top",
    minHeight: 110,
    borderWidth: 1,
    borderColor: colors.borderMuted,
  },
  submitButton: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
    backgroundColor: colors.primary,
    borderRadius: radii.md,
    padding: 18,
    gap: 12,
    marginTop: 6,
  },
  submitButtonDisabled: {
    backgroundColor: colors.surfaceAlt,
    borderColor: colors.borderMuted,
    borderWidth: 1,
    opacity: 0.6,
  },
  submitButtonText: {
    fontSize: 18,
    fontWeight: "bold",
    color: colors.background,
  },
});
