import { useState, useRef } from "react";
import {
  View,
  Text,
  StyleSheet,
  TouchableOpacity,
  Alert,
  Platform,
  Image,
} from "react-native";
import { useRouter } from "expo-router";
import { CameraView, useCameraPermissions, useMicrophonePermissions } from "expo-camera";
import { Ionicons } from "@expo/vector-icons";
import { Video } from "expo-av";
import { theme } from "../constants/theme";

const { colors } = theme;

export default function CameraScreen() {
  const router = useRouter();
  const cameraRef = useRef(null);
  const [cameraPermission, requestCameraPermission] = useCameraPermissions();
  const [micPermission, requestMicPermission] = useMicrophonePermissions();
  const [facing, setFacing] = useState("front");
  const [capturedMedia, setCapturedMedia] = useState(null);
  const [mediaType, setMediaType] = useState(null);
  const [isProcessing, setIsProcessing] = useState(false);
  const [isRecording, setIsRecording] = useState(false);
  const [isReady, setIsReady] = useState(false);
  const [status, setStatus] = useState("等待相機...");
  const [mode, setMode] = useState("photo");
  const [cameraKey, setCameraKey] = useState(0); // 用於強制重新渲染相機

  if (!cameraPermission || !micPermission) {
    return (
      <View style={styles.container}>
        <Text style={styles.loadingText}>載入中...</Text>
      </View>
    );
  }

  if (!cameraPermission.granted) {
    return (
      <View style={styles.permissionContainer}>
        <Ionicons name="camera-outline" size={64} color={colors.primary} />
        <Text style={styles.permissionTitle}>需要相機權限</Text>
        <Text style={styles.permissionText}>請允許 App 使用相機</Text>
        <TouchableOpacity 
          style={styles.permissionButton} 
          onPress={async () => {
            await requestCameraPermission();
            await requestMicPermission();
          }}
        >
          <Text style={styles.permissionButtonText}>授予權限</Text>
        </TouchableOpacity>
        <TouchableOpacity style={styles.backButton} onPress={() => router.back()}>
          <Text style={styles.backButtonText}>返回</Text>
        </TouchableOpacity>
      </View>
    );
  }

  const toggleCameraFacing = () => {
    // 切換鏡頭時重置狀態並強制重新渲染
    setIsReady(false);
    setStatus("切換鏡頭中...");
    setFacing((current) => (current === "back" ? "front" : "back"));
    setCameraKey((prev) => prev + 1); // 強制重新渲染相機
  };

  const toggleMode = () => {
    if (isRecording) return; // 錄影中不能切換
    const newMode = mode === "photo" ? "video" : "photo";
    setMode(newMode);
    setStatus(newMode === "photo" ? "📷 拍照模式" : "🎬 錄影模式");
  };

  const handleCameraReady = () => {
    console.log("✅ Camera ready, facing:", facing);
    setIsReady(true);
    setStatus(mode === "photo" ? "準備拍照" : "準備錄影");
  };

  // 拍照
  const takePhoto = async () => {
    if (isProcessing || !cameraRef.current || !isReady) return;

    setIsProcessing(true);
    setStatus("拍攝中...");

    try {
      const photo = await cameraRef.current.takePictureAsync();
      
      if (photo && photo.uri) {
        setCapturedMedia(photo.uri);
        setMediaType("photo");
        setStatus("拍攝成功！");
      } else {
        throw new Error("未取得照片");
      }
    } catch (error) {
      console.error("Photo error:", error);
      setStatus("拍照失敗");
      Alert.alert("拍照失敗", error.message);
    }

    setIsProcessing(false);
  };

  // 錄影控制
  const handleRecordPress = async () => {
    if (!cameraRef.current || !isReady) return;

    if (isRecording) {
      // 停止錄影
      console.log("⏹️ Stopping recording...");
      setStatus("停止中...");
      try {
        cameraRef.current.stopRecording();
      } catch (e) {
        console.log("Stop error:", e);
      }
    } else {
      // 開始錄影
      if (!micPermission.granted) {
        const result = await requestMicPermission();
        if (!result.granted) {
          Alert.alert("錯誤", "需要麥克風權限");
          return;
        }
      }

      setIsRecording(true);
      setStatus("🔴 錄影中... 按下停止");

      try {
        console.log("🎬 Starting recording...");
        const video = await cameraRef.current.recordAsync({
          maxDuration: 60,
        });
        
        console.log("✅ Video recorded:", video);
        
        if (video && video.uri) {
          setCapturedMedia(video.uri);
          setMediaType("video");
          setStatus("錄影成功！");
        }
      } catch (error) {
        console.error("Recording error:", error);
        if (!capturedMedia) {
          setStatus("錄影失敗: " + error.message);
        }
      }

      setIsRecording(false);
    }
  };

  const confirmMedia = () => {
    global.capturedVideoUri = capturedMedia;
    router.back();
  };

  const retakeMedia = () => {
    setCapturedMedia(null);
    setMediaType(null);
    setStatus(mode === "photo" ? "準備拍照" : "準備錄影");
  };

  // 顯示預覽
  if (capturedMedia) {
    return (
      <View style={styles.container}>
        {mediaType === "photo" ? (
          <Image source={{ uri: capturedMedia }} style={styles.preview} />
        ) : (
          <Video
            source={{ uri: capturedMedia }}
            style={styles.preview}
            useNativeControls
            resizeMode="contain"
            isLooping
            shouldPlay
          />
        )}
        
        <View style={styles.previewButtons}>
          <TouchableOpacity style={styles.retakeButton} onPress={retakeMedia}>
            <Ionicons name="refresh" size={24} color={colors.textPrimary} />
            <Text style={styles.buttonText}>重拍</Text>
          </TouchableOpacity>
          
          <TouchableOpacity style={styles.confirmButton} onPress={confirmMedia}>
            <Ionicons name="checkmark" size={24} color={colors.textPrimary} />
            <Text style={styles.buttonText}>使用</Text>
          </TouchableOpacity>
        </View>
      </View>
    );
  }

  return (
    <View style={styles.container}>
      <CameraView
        key={cameraKey}
        ref={cameraRef}
        style={styles.camera}
        facing={facing}
        mode={mode === "video" ? "video" : "picture"}
        onCameraReady={handleCameraReady}
      >
        {/* 頂部工具列 */}
        <View style={styles.topBar}>
          <TouchableOpacity
            style={styles.topButton}
            onPress={() => router.back()}
          >
            <Ionicons name="close" size={28} color={colors.textPrimary} />
          </TouchableOpacity>
          
          <TouchableOpacity 
            style={[styles.modeToggle, isRecording && styles.modeDisabled]}
            onPress={toggleMode}
            disabled={isRecording}
          >
            <Text style={styles.modeText}>
              {mode === "photo" ? "📷 拍照" : "🎬 錄影"}
            </Text>
          </TouchableOpacity>
          
          <TouchableOpacity
            style={[styles.topButton, isRecording && styles.buttonDisabled]}
            onPress={toggleCameraFacing}
            disabled={isRecording}
          >
            <Ionicons name="camera-reverse" size={28} color={colors.textPrimary} />
          </TouchableOpacity>
        </View>

        {/* 目前鏡頭 */}
        <View style={styles.facingIndicator}>
          <Text style={styles.facingText}>
            {facing === "front" ? "前鏡頭" : "後鏡頭"}
          </Text>
        </View>

        {/* 狀態顯示 */}
        <View style={styles.statusContainer}>
          <Text style={[
            styles.statusText,
            isRecording && styles.recordingStatus
          ]}>
            {status}
          </Text>
        </View>

        {/* 底部控制區 */}
        <View style={styles.bottomBar}>
          {mode === "photo" ? (
            <TouchableOpacity
              style={[
                styles.captureButton,
                (!isReady || isProcessing) && styles.buttonDisabled,
              ]}
              onPress={takePhoto}
              disabled={!isReady || isProcessing}
            >
              <View style={styles.photoButtonInner}>
                <Ionicons name="camera" size={36} color={colors.textPrimary} />
              </View>
            </TouchableOpacity>
          ) : (
            <TouchableOpacity
              style={[
                styles.recordButton,
                isRecording && styles.recordingButton,
                (!isReady || isProcessing) && styles.buttonDisabled,
              ]}
              onPress={handleRecordPress}
              disabled={!isReady || isProcessing}
            >
              <View style={[
                styles.recordButtonInner,
                isRecording && styles.stopButtonInner
              ]}>
                {isRecording ? (
                  <View style={styles.stopIcon} />
                ) : (
                  <Ionicons name="videocam" size={36} color={colors.textPrimary} />
                )}
              </View>
            </TouchableOpacity>
          )}

          <Text style={styles.tipText}>
            {!isReady 
              ? "等待相機..." 
              : mode === "photo" 
                ? "按下拍照"
                : isRecording 
                  ? "按下停止" 
                  : "按下開始錄影"
            }
          </Text>
        </View>
      </CameraView>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: colors.background,
  },
  camera: {
    flex: 1,
  },
  loadingText: {
    color: colors.textPrimary,
    fontSize: 18,
    textAlign: "center",
    marginTop: 100,
  },
  permissionContainer: {
    flex: 1,
    backgroundColor: colors.backgroundAlt,
    alignItems: "center",
    justifyContent: "center",
    padding: 32,
  },
  permissionTitle: {
    fontSize: 24,
    fontWeight: "bold",
    color: colors.textPrimary,
    marginTop: 24,
    marginBottom: 12,
  },
  permissionText: {
    fontSize: 16,
    color: colors.textSecondary,
    textAlign: "center",
    marginBottom: 32,
  },
  permissionButton: {
    backgroundColor: colors.primary,
    paddingHorizontal: 32,
    paddingVertical: 16,
    borderRadius: 12,
    marginBottom: 16,
  },
  permissionButtonText: {
    fontSize: 16,
    fontWeight: "600",
    color: colors.background,
  },
  backButton: {
    padding: 16,
  },
  backButtonText: {
    fontSize: 16,
    color: colors.primary,
  },
  topBar: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
    paddingTop: Platform.OS === "ios" ? 60 : 40,
    paddingHorizontal: 20,
  },
  topButton: {
    width: 44,
    height: 44,
    borderRadius: 22,
    backgroundColor: "rgba(5, 12, 28, 0.65)",
    alignItems: "center",
    justifyContent: "center",
  },
  modeToggle: {
    backgroundColor: "rgba(5, 12, 28, 0.65)",
    paddingHorizontal: 16,
    paddingVertical: 8,
    borderRadius: 20,
  },
  modeDisabled: {
    opacity: 0.5,
  },
  modeText: {
    fontSize: 16,
    fontWeight: "600",
    color: colors.textPrimary,
  },
  facingIndicator: {
    position: "absolute",
    top: Platform.OS === "ios" ? 110 : 90,
    alignSelf: "center",
  },
  facingText: {
    fontSize: 12,
    color: colors.textSecondary,
    backgroundColor: "rgba(5, 12, 28, 0.65)",
    paddingHorizontal: 10,
    paddingVertical: 4,
    borderRadius: 10,
  },
  statusContainer: {
    position: "absolute",
    top: Platform.OS === "ios" ? 140 : 120,
    left: 0,
    right: 0,
    alignItems: "center",
  },
  statusText: {
    fontSize: 16,
    color: colors.textPrimary,
    backgroundColor: "rgba(5, 12, 28, 0.8)",
    paddingHorizontal: 16,
    paddingVertical: 8,
    borderRadius: 20,
    overflow: "hidden",
  },
  recordingStatus: {
    backgroundColor: "rgba(248, 113, 113, 0.8)",
  },
  bottomBar: {
    position: "absolute",
    bottom: 0,
    left: 0,
    right: 0,
    paddingBottom: Platform.OS === "ios" ? 50 : 30,
    alignItems: "center",
  },
  captureButton: {
    width: 80,
    height: 80,
    borderRadius: 40,
    backgroundColor: colors.primary,
    alignItems: "center",
    justifyContent: "center",
    borderWidth: 4,
    borderColor: colors.textPrimary,
  },
  photoButtonInner: {
    width: 60,
    height: 60,
    borderRadius: 30,
    backgroundColor: colors.primary,
    alignItems: "center",
    justifyContent: "center",
  },
  recordButton: {
    width: 80,
    height: 80,
    borderRadius: 40,
    backgroundColor: colors.danger,
    alignItems: "center",
    justifyContent: "center",
    borderWidth: 4,
    borderColor: colors.textPrimary,
  },
  recordingButton: {
    borderColor: colors.danger,
  },
  recordButtonInner: {
    width: 60,
    height: 60,
    borderRadius: 30,
    backgroundColor: colors.danger,
    alignItems: "center",
    justifyContent: "center",
  },
  stopButtonInner: {
    backgroundColor: colors.danger,
  },
  stopIcon: {
    width: 24,
    height: 24,
    backgroundColor: colors.textPrimary,
    borderRadius: 4,
  },
  buttonDisabled: {
    opacity: 0.5,
  },
  tipText: {
    fontSize: 14,
    color: colors.textSecondary,
    marginTop: 16,
  },
  preview: {
    flex: 1,
    width: "100%",
    backgroundColor: colors.background,
  },
  previewButtons: {
    position: "absolute",
    bottom: 0,
    left: 0,
    right: 0,
    flexDirection: "row",
    justifyContent: "space-around",
    paddingVertical: 30,
    paddingHorizontal: 40,
    backgroundColor: "rgba(5, 12, 28, 0.85)",
  },
  retakeButton: {
    flexDirection: "row",
    alignItems: "center",
    backgroundColor: colors.danger,
    paddingHorizontal: 24,
    paddingVertical: 14,
    borderRadius: 30,
    gap: 8,
  },
  confirmButton: {
    flexDirection: "row",
    alignItems: "center",
    backgroundColor: colors.success,
    paddingHorizontal: 24,
    paddingVertical: 14,
    borderRadius: 30,
    gap: 8,
  },
  buttonText: {
    fontSize: 16,
    fontWeight: "600",
    color: colors.background,
  },
});
