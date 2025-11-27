import { useEffect, useState } from "react";
import { Stack } from "expo-router";
import {
  StatusBar,
  Alert,
  Platform,
  Modal,
  View,
  Text,
  TouchableOpacity,
  StyleSheet,
} from "react-native";
import { initDatabase } from "../utils/database";
import { theme } from "../constants/theme";

const { colors, radii } = theme;

const WELCOME_MESSAGE = [
  "歡迎體驗 EmoGo 情緒記錄！",
  "",
  "• 在「記錄」頁依序完成心情、自拍照與 GPS 三步驟後即可儲存。",
  "• 所有資料會安全地存放於本機資料庫，歷史頁可快速回顧與刪除紀錄。",
  "• 設定頁提供每日提醒與 JSON / CSV 匯出，也能查看影片存放位置。",
  "",
  "祝記錄順利，有任何想法再告訴我 🙌",
].join("\n");

export default function RootLayout() {
  const [showWelcome, setShowWelcome] = useState(false);

  useEffect(() => {
    // 初始化資料庫
    initDatabase().catch((error) => {
      console.error("Database init error:", error);
    });

    // 跨平台歡迎提示
    if (Platform.OS === "web") {
      setShowWelcome(true);
    } else {
      Alert.alert("Hi 使用者 👋", WELCOME_MESSAGE, [{ text: "開始體驗" }]);
    }
  }, []);

  return (
    <>
      <StatusBar barStyle="light-content" backgroundColor={colors.background} />

      {/* Web 專用歡迎彈窗 */}
      {Platform.OS === "web" && (
        <Modal
          visible={showWelcome}
          transparent
          animationType="fade"
          onRequestClose={() => setShowWelcome(false)}
        >
          <View style={modalStyles.overlay}>
            <View style={modalStyles.card}>
              <Text style={modalStyles.title}>Hi 使用者 👋</Text>
              <Text style={modalStyles.message}>{WELCOME_MESSAGE}</Text>
              <TouchableOpacity
                style={modalStyles.button}
                onPress={() => setShowWelcome(false)}
              >
                <Text style={modalStyles.buttonText}>開始體驗</Text>
              </TouchableOpacity>
            </View>
          </View>
        </Modal>
      )}

      <Stack
        screenOptions={{
          headerStyle: {
            backgroundColor: colors.background,
          },
          headerTintColor: colors.textPrimary,
          headerTitleStyle: {
            fontWeight: "bold",
          },
          contentStyle: {
            backgroundColor: colors.background,
          },
        }}
      >
        <Stack.Screen
          name="(tabs)"
          options={{ headerShown: false }}
        />
        <Stack.Screen
          name="camera"
          options={{
            headerShown: false,
            presentation: "fullScreenModal",
          }}
        />
      </Stack>
    </>
  );
}

const modalStyles = StyleSheet.create({
  overlay: {
    flex: 1,
    backgroundColor: "rgba(0,0,0,0.7)",
    justifyContent: "center",
    alignItems: "center",
    padding: 24,
  },
  card: {
    backgroundColor: colors.surface,
    borderRadius: radii.lg,
    padding: 28,
    maxWidth: 420,
    width: "100%",
    borderWidth: 1,
    borderColor: colors.border,
  },
  title: {
    fontSize: 24,
    fontWeight: "bold",
    color: colors.textPrimary,
    marginBottom: 16,
    textAlign: "center",
  },
  message: {
    fontSize: 15,
    color: colors.textSecondary,
    lineHeight: 24,
    marginBottom: 24,
  },
  button: {
    backgroundColor: colors.primary,
    borderRadius: radii.md,
    paddingVertical: 14,
    alignItems: "center",
  },
  buttonText: {
    fontSize: 16,
    fontWeight: "600",
    color: colors.background,
  },
});
