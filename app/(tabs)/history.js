import { useState, useCallback } from "react";
import {
  View,
  Text,
  StyleSheet,
  FlatList,
  TouchableOpacity,
  Alert,
  RefreshControl,
} from "react-native";
import { useFocusEffect } from "expo-router";
import { Ionicons } from "@expo/vector-icons";
import {
  getAllRecords,
  deleteRecord,
  getTimeRange,
} from "../../utils/database";
import { theme } from "../../constants/theme";

const { colors, radii } = theme;

const MOOD_EMOJIS = {
  1: "😢",
  2: "😔",
  3: "😐",
  4: "🙂",
  5: "😄",
};

const MOOD_COLORS = {
  1: "#F87171",
  2: "#FBBF24",
  3: "#FDE047",
  4: "#34D399",
  5: "#2DD4BF",
};

export default function HistoryScreen() {
  const [records, setRecords] = useState([]);
  const [timeRange, setTimeRange] = useState(null);
  const [refreshing, setRefreshing] = useState(false);

  const loadRecords = async () => {
    const allRecords = await getAllRecords();
    const range = await getTimeRange();
    setRecords(allRecords);
    setTimeRange(range);
  };

  useFocusEffect(
    useCallback(() => {
      loadRecords();
    }, [])
  );

  const onRefresh = async () => {
    setRefreshing(true);
    await loadRecords();
    setRefreshing(false);
  };

  const handleDelete = (id) => {
    Alert.alert("確認刪除", "確定要刪除這筆記錄嗎？", [
      { text: "取消", style: "cancel" },
      {
        text: "刪除",
        style: "destructive",
        onPress: async () => {
          await deleteRecord(id);
          await loadRecords();
        },
      },
    ]);
  };

  const formatTimestamp = (timestamp) => {
    const date = new Date(timestamp);
    const now = new Date();
    const isToday = date.toDateString() === now.toDateString();
    
    const timeStr = date.toLocaleTimeString("zh-TW", {
      hour: "2-digit",
      minute: "2-digit",
    });
    
    if (isToday) {
      return `今天 ${timeStr}`;
    }
    
    const dateStr = date.toLocaleDateString("zh-TW", {
      month: "short",
      day: "numeric",
    });
    
    return `${dateStr} ${timeStr}`;
  };

  const calculateDuration = () => {
    if (!timeRange?.first_timestamp || !timeRange?.last_timestamp) return 0;
    const first = new Date(timeRange.first_timestamp);
    const last = new Date(timeRange.last_timestamp);
    return ((last - first) / (1000 * 60 * 60)).toFixed(1);
  };

  const renderRecord = ({ item }) => (
    <View style={styles.recordCard}>
      <View style={styles.recordHeader}>
        <View style={styles.moodBadge}>
          <Text style={styles.moodEmoji}>{MOOD_EMOJIS[item.mood_score]}</Text>
          <Text
            style={[styles.moodScore, { color: MOOD_COLORS[item.mood_score] }]}
          >
            {item.mood_score} 分
          </Text>
        </View>
        <Text style={styles.timestamp}>{formatTimestamp(item.timestamp)}</Text>
      </View>

      <View style={styles.recordContent}>
        <Text style={styles.moodLabel}>{item.mood_label}</Text>

        {/* 位置資訊 */}
        {item.latitude && item.longitude && (
          <View style={styles.infoRow}>
            <Ionicons name="location" size={16} color={colors.accent} />
            <Text style={styles.infoText}>
              {item.latitude.toFixed(4)}, {item.longitude.toFixed(4)}
            </Text>
          </View>
        )}

        {/* Vlog 狀態 */}
        {item.video_uri && (
          <View style={styles.infoRow}>
            <Ionicons name="videocam" size={16} color={colors.success} />
            <Text style={styles.infoText}>已錄製 Vlog</Text>
          </View>
        )}

        {/* 備註 */}
        {item.notes && (
          <View style={styles.notesContainer}>
            <Text style={styles.notesText}>{item.notes}</Text>
          </View>
        )}
      </View>

      <TouchableOpacity
        style={styles.deleteButton}
        onPress={() => handleDelete(item.id)}
      >
        <Ionicons name="trash-outline" size={20} color={colors.danger} />
      </TouchableOpacity>
    </View>
  );

  const renderEmptyState = () => (
    <View style={styles.emptyState}>
      <Ionicons name="document-text-outline" size={64} color={colors.borderMuted} />
      <Text style={styles.emptyTitle}>還沒有任何記錄</Text>
      <Text style={styles.emptySubtitle}>
        回到「記錄」頁面開始記錄你的心情吧！
      </Text>
    </View>
  );

  const renderHeader = () => (
    <View style={styles.statsCard}>
      <View style={styles.statItem}>
        <Text style={styles.statValue}>{records.length}</Text>
        <Text style={styles.statLabel}>總記錄數</Text>
      </View>
      <View style={styles.statDivider} />
      <View style={styles.statItem}>
        <Text style={styles.statValue}>{calculateDuration()}</Text>
        <Text style={styles.statLabel}>小時跨度</Text>
      </View>
      <View style={styles.statDivider} />
      <View style={styles.statItem}>
        <Text style={styles.statValue}>
          {records.length > 0
            ? (
                records.reduce((sum, r) => sum + r.mood_score, 0) / records.length
              ).toFixed(1)
            : "-"}
        </Text>
        <Text style={styles.statLabel}>平均心情</Text>
      </View>
    </View>
  );

  return (
    <View style={styles.container}>
      <FlatList
        data={records}
        keyExtractor={(item) => item.id.toString()}
        renderItem={renderRecord}
        ListEmptyComponent={renderEmptyState}
        ListHeaderComponent={records.length > 0 ? renderHeader : null}
        contentContainerStyle={styles.listContent}
        refreshControl={
          <RefreshControl
            refreshing={refreshing}
            onRefresh={onRefresh}
            tintColor={colors.primary}
          />
        }
      />
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: colors.background,
  },
  listContent: {
    padding: 20,
    flexGrow: 1,
  },
  statsCard: {
    backgroundColor: colors.surface,
    borderRadius: radii.lg,
    padding: 20,
    flexDirection: "row",
    justifyContent: "space-around",
    marginBottom: 20,
    borderWidth: 1,
    borderColor: colors.borderMuted,
  },
  statItem: {
    alignItems: "center",
  },
  statValue: {
    fontSize: 28,
    fontWeight: "bold",
    color: colors.primary,
  },
  statLabel: {
    fontSize: 14,
    color: colors.textSecondary,
    marginTop: 4,
  },
  statDivider: {
    width: 1,
    backgroundColor: colors.borderMuted,
  },
  recordCard: {
    backgroundColor: colors.surfaceAlt,
    borderRadius: radii.md,
    padding: 16,
    marginBottom: 12,
    position: "relative",
    borderWidth: 1,
    borderColor: colors.borderMuted,
  },
  recordHeader: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
    marginBottom: 12,
  },
  moodBadge: {
    flexDirection: "row",
    alignItems: "center",
    gap: 8,
  },
  moodEmoji: {
    fontSize: 28,
  },
  moodScore: {
    fontSize: 18,
    fontWeight: "bold",
  },
  timestamp: {
    fontSize: 14,
    color: colors.textSecondary,
  },
  recordContent: {
    gap: 8,
  },
  moodLabel: {
    fontSize: 16,
    color: colors.textPrimary,
    fontWeight: "500",
  },
  infoRow: {
    flexDirection: "row",
    alignItems: "center",
    gap: 8,
  },
  infoText: {
    fontSize: 14,
    color: colors.textSecondary,
  },
  notesContainer: {
    backgroundColor: colors.surface,
    borderRadius: radii.sm,
    padding: 12,
    marginTop: 8,
    borderWidth: 1,
    borderColor: colors.borderMuted,
  },
  notesText: {
    fontSize: 14,
    color: colors.textSecondary,
    fontStyle: "italic",
  },
  deleteButton: {
    position: "absolute",
    top: 16,
    right: 16,
    padding: 6,
    backgroundColor: "transparent",
  },
  emptyState: {
    flex: 1,
    alignItems: "center",
    justifyContent: "center",
    paddingVertical: 80,
  },
  emptyTitle: {
    fontSize: 20,
    fontWeight: "600",
    color: colors.textPrimary,
    marginTop: 16,
  },
  emptySubtitle: {
    fontSize: 16,
    color: colors.textSecondary,
    marginTop: 8,
    textAlign: "center",
  },
});

