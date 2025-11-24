
import { StatusBar } from 'expo-status-bar';
import { StyleSheet, Text, View, TouchableOpacity, SafeAreaView, ScrollView, Alert, Modal, TextInput, I18nManager } from 'react-native';
import { useState, useEffect } from 'react';
import QRScanner from './components/QRScanner';
import FilePickerScreen from './screens/FilePickerScreen';
import ReceiveScreen from './screens/ReceiveScreen';
import SettingsScreen from './screens/SettingsScreen';
import MirrorModeScreen from './screens/MirrorModeScreen';
import ModeSelectionScreen from './screens/ModeSelectionScreen';
import HostModeScreen from './screens/HostModeScreen';
import JoinModeScreen from './screens/JoinModeScreen';
import { ThemeProvider, useTheme } from './contexts/ThemeContext';
import { ThemeColors } from './constants/Colors';
import networkService from './services/networkService';
import fileService, { SelectedFile } from './services/fileService';
import i18n from './services/i18n';
import axios from 'axios';
import { Feather } from '@expo/vector-icons';
import { LinearGradient } from 'expo-linear-gradient';

type Screen = 'mode' | 'home' | 'files' | 'settings' | 'receive' | 'host' | 'join' | 'mirror';

function AppContent() {
  const { colors, theme, language, setTheme, setLanguage, isDark } = useTheme();

  // Connection state
  const [isConnected, setIsConnected] = useState(false);
  const [desktopIP, setDesktopIP] = useState('');

  // UI state
  const [showQRScanner, setShowQRScanner] = useState(false);
  const [showIPDialog, setShowIPDialog] = useState(false);
  const [isConnecting, setIsConnecting] = useState(false);
  const [manualIP, setManualIP] = useState('');
  const [currentScreen, setCurrentScreen] = useState<Screen>('mode');

  // File upload state
  const [selectedFiles, setSelectedFiles] = useState<SelectedFile[]>([]);
  const [isUploading, setIsUploading] = useState(false);
  const [uploadProgress, setUploadProgress] = useState(0);

  // Handle QR code scan
  const handleQRScan = async (data: string) => {
    if (isConnecting) return; // Prevent multiple scans
    setIsConnecting(true);
    setShowQRScanner(false); // Close scanner immediately
    console.log('QR Scanned:', data);

    // Extract URL from QR code
    let url = data;
    if (!url.startsWith('http')) {
      url = `http://${data}`;
    }
    if (url.endsWith('/')) {
      url = url.slice(0, -1);
    }

    // Test connection
    const connected = await testConnection(url);

    // Delay alert to allow scanner to close visually
    setTimeout(() => {
      if (!connected) {
        Alert.alert(i18n.t('connection_failed'), i18n.t('connection_msg'));
      }
      setIsConnecting(false);
    }, 500);
  };

  // Test connection to desktop
  const testConnection = async (ip: string): Promise<boolean> => {
    try {
      const connected = await networkService.testConnection(ip);
      setIsConnected(connected);
      if (connected) {
        setDesktopIP(ip);
      }
      return connected;
    } catch (error) {
      console.error('Connection error:', error);
      return false;
    }
  };

  // Handle manual IP entry
  const handleManualConnect = async () => {
    if (!manualIP.trim()) {
      Alert.alert(i18n.t('error'), i18n.t('enter_ip_msg'));
      return;
    }

    setShowIPDialog(false);

    let url = manualIP.trim();
    if (!url.includes(':')) {
      url = `${url}:9090`;
    }
    if (!url.startsWith('http')) {
      url = `http://${url}`;
    }
    if (url.endsWith('/')) {
      url = url.slice(0, -1);
    }

    const connected = await testConnection(url);
    if (connected) {
      setManualIP('');
    } else {
      Alert.alert(i18n.t('connection_failed'), i18n.t('connection_msg'));
    }
  };

  // Handle file selection
  const handleDisconnect = async () => {
    try {
      await axios.post(`${desktopIP}/disconnect`);
    } catch (e) {
      // Ignore error if PC is already gone
    }
    setIsConnected(false);
    setDesktopIP('');
  };

  const handleAddFiles = async () => {
    // Request permissions first
    const hasPermission = await fileService.requestPermissions();
    if (!hasPermission) {
      Alert.alert(i18n.t('permission_denied'), i18n.t('permission_msg'));
      return;
    }

    // Show file type selection
    Alert.alert(
      i18n.t('select_type'),
      undefined,
      [
        {
          text: i18n.t('photos'),
          onPress: async () => {
            const files = await fileService.pickImages();
            setSelectedFiles((prev) => [...prev, ...files]);
            setCurrentScreen('files');
          },
        },
        {
          text: i18n.t('videos'),
          onPress: async () => {
            const files = await fileService.pickVideos();
            setSelectedFiles((prev) => [...prev, ...files]);
            setCurrentScreen('files');
          },
        },
        {
          text: i18n.t('documents'),
          onPress: async () => {
            const files = await fileService.pickDocuments();
            setSelectedFiles((prev) => [...prev, ...files]);
            setCurrentScreen('files');
          },
        },
        {
          text: i18n.t('all_files'),
          onPress: async () => {
            const files = await fileService.pickAllFiles();
            setSelectedFiles((prev) => [...prev, ...files]);
            setCurrentScreen('files');
          },
        },
        {
          text: i18n.t('cancel'),
          style: 'cancel',
        },
      ]
    );
  };

  // Handle file upload
  const handleUpload = async () => {
    if (selectedFiles.length === 0) return;

    setIsUploading(true);
    setUploadProgress(0);

    try {
      const { success, failed } = await networkService.uploadFiles(
        selectedFiles,
        (current, total, progress) => {
          // Calculate overall progress
          const totalProgress = ((current - 1) / total) * 100 + (progress / total);
          setUploadProgress(totalProgress);
        }
      );

      setIsUploading(false);
      setUploadProgress(0);

      if (failed === 0) {
        Alert.alert(i18n.t('success'), i18n.t('upload_complete'));
        setSelectedFiles([]); // Clear files on success
        setCurrentScreen('home');
      } else {
        Alert.alert(
          i18n.t('upload_failed'),
          `${success} uploaded, ${failed} failed`
        );
      }
    } catch (error) {
      console.error('Upload error:', error);
      setIsUploading(false);
      Alert.alert(i18n.t('error'), 'Upload process failed');
    }
  };

  const styles = getStyles(colors, isDark, language);

  if (showQRScanner) {
    return (
      <QRScanner
        onScanComplete={handleQRScan}
        onClose={() => setShowQRScanner(false)}
      />
    );
  }

  if (currentScreen === 'mode') {
    return (
      <ModeSelectionScreen
        onSelectPC={() => setCurrentScreen('home')}
        onSelectPhone={(mode) => setCurrentScreen(mode)}
        onSelectMirror={() => setCurrentScreen('mirror')}
        onSettings={() => setCurrentScreen('settings')}
      />
    );
  }

  if (currentScreen === 'mirror') {
    return (
      <MirrorModeScreen
        onBack={() => setCurrentScreen('mode')}
        desktopIP={desktopIP}
        onRequestConnect={() => setShowQRScanner(true)}
      />
    );
  }

  if (currentScreen === 'host') {
    return (
      <HostModeScreen onBack={() => setCurrentScreen('mode')} />
    );
  }

  if (currentScreen === 'join') {
    return (
      <JoinModeScreen
        onBack={() => setCurrentScreen('mode')}
        onJoinSuccess={(code, hostIP) => {
          console.log('Joined with code:', code, 'Host IP:', hostIP);
          // TODO: Navigate to receive screen for phone-to-phone with hostIP
          Alert.alert(i18n.t('success'), `${i18n.t('connected_to_host')}\n${hostIP}`);
        }}
      />
    );
  }

  if (currentScreen === 'files') {
    return (
      <FilePickerScreen
        files={selectedFiles}
        onAddFiles={handleAddFiles}
        onRemoveFile={(index) => {
          setSelectedFiles((prev) => prev.filter((_, i) => i !== index));
        }}
        onUpload={handleUpload}
        isUploading={isUploading}
        progress={uploadProgress}
        onBack={() => setCurrentScreen('home')}
      />
    );
  }

  if (currentScreen === 'receive') {
    return (
      <ReceiveScreen onBack={() => setCurrentScreen('home')} />
    );
  }

  if (currentScreen === 'settings') {
    return (
      <SettingsScreen onBack={() => setCurrentScreen('home')} />
    );
  }

  // Gradient colors based on theme
  const gradientColors = isDark
    ? ['#1A1D21', '#0f2027'] // Dark: Void Black to Deep Blue
    : ['#F5F7FA', '#c3cfe2']; // Light: Cloud White to Soft Blue

  return (
    <View style={styles.container}>
      <LinearGradient
        colors={gradientColors}
        style={StyleSheet.absoluteFill}
        start={{ x: 0, y: 0 }}
        end={{ x: 1, y: 1 }}
      />
      <SafeAreaView style={styles.container}>
        <StatusBar style={isDark ? 'light' : 'dark'} />

        <ScrollView contentContainerStyle={styles.scrollContent}>
          {/* Header */}
          <View style={styles.header}>
            <View style={{ flexDirection: 'row', alignItems: 'center', gap: 12 }}>
              <TouchableOpacity onPress={() => setCurrentScreen('mode')} style={styles.backButton}>
                <Feather name={language === 'ar' ? "arrow-right" : "arrow-left"} size={24} color={colors.text} />
              </TouchableOpacity>
              <View>
                <Text style={styles.logo}>{i18n.t('app_name')}</Text>
                <Text style={styles.subtitle}>{i18n.t('subtitle')}</Text>
              </View>
            </View>
          </View>

          {/* Connection Status & Actions */}
          <View style={styles.card}>
            <View style={styles.statusRow}>
              <View style={[styles.statusDot, isConnected ? styles.statusConnected : styles.statusDisconnected]} />
              <Text style={styles.statusText}>
                {isConnected ? i18n.t('connected') : i18n.t('not_connected')}
              </Text>
            </View>
            {isConnected && (
              <Text style={styles.ipText}>{desktopIP}</Text>
            )}
          </View>

          {/* Main Action Area */}
          <View style={styles.actionContainer}>
            {!isConnected ? (
              // Not Connected: Show Connect Options
              <>
                <TouchableOpacity
                  style={styles.primaryButton}
                  onPress={() => setShowQRScanner(true)}
                >
                  <Feather name="camera" size={32} color="#fff" style={{ marginBottom: 8 }} />
                  <Text style={styles.primaryButtonText}>{i18n.t('scan_qr')}</Text>
                </TouchableOpacity>

                <TouchableOpacity
                  style={styles.secondaryButton}
                  onPress={() => setShowIPDialog(true)}
                >
                  <Text style={styles.secondaryButtonText}>{i18n.t('enter_ip')}</Text>
                </TouchableOpacity>
              </>
            ) : (
              // Connected: Show Send/Receive Options
              <View style={styles.connectedActions}>
                <TouchableOpacity
                  style={[styles.actionCard, { backgroundColor: colors.primary }]}
                  onPress={handleAddFiles}
                >
                  <Feather name="upload-cloud" size={40} color="#fff" style={{ marginBottom: 12 }} />
                  <Text style={styles.actionTitle}>{i18n.t('upload_files')}</Text>
                  <Text style={styles.actionSubtitle}>{i18n.t('phone_to_pc')}</Text>
                </TouchableOpacity>

                <TouchableOpacity
                  style={[styles.actionCard, { backgroundColor: colors.secondary }]}
                  onPress={() => setCurrentScreen('receive')}
                >
                  <Feather name="download-cloud" size={40} color="#fff" style={{ marginBottom: 12 }} />
                  <Text style={styles.actionTitle}>{i18n.t('receive_files')}</Text>
                  <Text style={styles.actionSubtitle}>{i18n.t('pc_to_phone')}</Text>
                </TouchableOpacity>

                <TouchableOpacity
                  style={[styles.actionCard, { backgroundColor: '#ef4444', marginTop: 12 }]}
                  onPress={handleDisconnect}
                >
                  <Feather name="log-out" size={40} color="#fff" style={{ marginBottom: 12 }} />
                  <Text style={styles.actionTitle}>{i18n.t('disconnect')}</Text>
                </TouchableOpacity>
              </View>
            )}
          </View>

          {/* Info Section */}
          <View style={styles.infoCard}>
            <Text style={styles.infoTitle}>{i18n.t('how_it_works')}</Text>
            <View style={styles.stepContainer}>
              <Text style={styles.stepText}>{i18n.t('step_1')}</Text>
              <Text style={styles.stepText}>{i18n.t('step_2')}</Text>
              <Text style={styles.stepText}>{i18n.t('step_3')}</Text>
              <Text style={styles.stepText}>{i18n.t('step_4')}</Text>
            </View>
          </View>
        </ScrollView>

        {/* IP Input Dialog */}
        <Modal
          visible={showIPDialog}
          transparent
          animationType="fade"
          onRequestClose={() => setShowIPDialog(false)}
        >
          <View style={styles.modalOverlay}>
            <View style={styles.modalContent}>
              <Text style={styles.modalTitle}>{i18n.t('enter_ip_title')}</Text>
              <Text style={styles.modalSubtitle}>{i18n.t('enter_ip_msg')}</Text>

              <TextInput
                style={styles.input}
                placeholder="192.168.1.x"
                placeholderTextColor={colors.textSecondary}
                value={manualIP}
                onChangeText={setManualIP}
                keyboardType="numeric"
              />

              <View style={styles.modalButtons}>
                <TouchableOpacity
                  style={[styles.modalButton, styles.cancelButton]}
                  onPress={() => setShowIPDialog(false)}
                >
                  <Text style={styles.cancelButtonText}>{i18n.t('cancel')}</Text>
                </TouchableOpacity>

                <TouchableOpacity
                  style={[styles.modalButton, styles.connectButton]}
                  onPress={handleManualConnect}
                >
                  <Text style={styles.connectButtonText}>{i18n.t('connect')}</Text>
                </TouchableOpacity>
              </View>
            </View>
          </View>
        </Modal>
      </SafeAreaView>
    </View>
  );
}

export default function App() {
  return (
    <ThemeProvider>
      <AppContent />
    </ThemeProvider>
  );
}

const getStyles = (colors: ThemeColors, isDark: boolean, language: string) => StyleSheet.create({
  container: {
    flex: 1,
    // backgroundColor: colors.background, // Removed for gradient
  },
  scrollContent: {
    padding: 24,
    paddingTop: 60,
  },
  header: {
    marginBottom: 40,
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'flex-start',
    direction: language === 'ar' ? 'rtl' : 'ltr',
  },
  backButton: {
    padding: 8,
  },
  logo: {
    fontSize: 32,
    fontWeight: '800',
    color: colors.text,
    marginBottom: 8,
    textAlign: language === 'ar' ? 'right' : 'left',
  },
  subtitle: {
    fontSize: 16,
    color: colors.textSecondary,
    fontWeight: '500',
    textAlign: language === 'ar' ? 'right' : 'left',
  },
  settingsButton: {
    padding: 8,
  },
  settingsIcon: {
    fontSize: 24,
  },
  card: {
    backgroundColor: colors.card,
    borderRadius: 20,
    padding: 20,
    marginBottom: 24,
    borderWidth: 1,
    borderColor: colors.border,
  },
  statusRow: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 8,
    direction: language === 'ar' ? 'rtl' : 'ltr',
  },
  statusDot: {
    width: 8,
    height: 8,
    borderRadius: 4,
    marginRight: language === 'ar' ? 0 : 12,
    marginLeft: language === 'ar' ? 12 : 0,
  },
  statusConnected: {
    backgroundColor: colors.success,
    shadowColor: colors.success,
    shadowOffset: { width: 0, height: 0 },
    shadowOpacity: 0.5,
    shadowRadius: 8,
  },
  statusDisconnected: {
    backgroundColor: colors.error,
    shadowColor: colors.error,
    shadowOffset: { width: 0, height: 0 },
    shadowOpacity: 0.5,
    shadowRadius: 8,
  },
  statusText: {
    color: colors.text,
    fontSize: 16,
    fontWeight: '600',
    textAlign: language === 'ar' ? 'right' : 'left',
  },
  ipText: {
    color: colors.textSecondary,
    fontSize: 14,
    marginTop: 4,
    marginLeft: language === 'ar' ? 0 : 20,
    marginRight: language === 'ar' ? 20 : 0,
    fontFamily: 'monospace',
    textAlign: language === 'ar' ? 'right' : 'left',
  },
  actionContainer: {
    gap: 16,
    marginBottom: 40,
  },
  primaryButton: {
    backgroundColor: colors.primary,
    paddingVertical: 24,
    borderRadius: 20,
    alignItems: 'center',
    shadowColor: colors.primary,
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.3,
    shadowRadius: 12,
    elevation: 8,
  },
  primaryButtonIcon: {
    fontSize: 32,
    marginBottom: 8,
  },
  primaryButtonText: {
    color: '#fff',
    fontSize: 20,
    fontWeight: '700',
  },
  secondaryButton: {
    backgroundColor: 'transparent',
    paddingVertical: 18,
    borderRadius: 16,
    alignItems: 'center',
    borderWidth: 2,
    borderColor: colors.card,
  },
  secondaryButtonText: {
    color: colors.text,
    fontSize: 16,
    fontWeight: '600',
  },
  connectedActions: {
    gap: 16,
  },
  actionCard: {
    padding: 24,
    borderRadius: 24,
    alignItems: 'center',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.3,
    shadowRadius: 12,
    elevation: 8,
  },
  actionIcon: {
    fontSize: 40,
    marginBottom: 12,
  },
  actionTitle: {
    color: '#fff',
    fontSize: 22,
    fontWeight: '800',
    marginBottom: 4,
  },
  actionSubtitle: {
    color: 'rgba(255,255,255,0.8)',
    fontSize: 14,
    fontWeight: '600',
  },
  infoCard: {
    backgroundColor: colors.card,
    borderRadius: 20,
    padding: 24,
    borderWidth: 1,
    borderColor: colors.border,
  },
  infoTitle: {
    color: colors.text,
    fontSize: 18,
    fontWeight: '700',
    marginBottom: 16,
    textAlign: language === 'ar' ? 'right' : 'left',
  },
  stepContainer: {
    gap: 12,
  },
  stepText: {
    color: colors.textSecondary,
    fontSize: 15,
    lineHeight: 22,
    textAlign: language === 'ar' ? 'right' : 'left',
  },
  version: {
    textAlign: 'center',
    color: colors.textSecondary,
    fontSize: 12,
    marginTop: 40,
    opacity: 0.5,
  },
  modalOverlay: {
    flex: 1,
    backgroundColor: colors.overlay,
    justifyContent: 'center',
    padding: 24,
  },
  modalContent: {
    backgroundColor: colors.background,
    borderRadius: 24,
    padding: 24,
    borderWidth: 1,
    borderColor: colors.border,
  },
  modalTitle: {
    fontSize: 20,
    fontWeight: '700',
    color: colors.text,
    marginBottom: 8,
    textAlign: 'center',
  },
  modalSubtitle: {
    fontSize: 14,
    color: colors.textSecondary,
    marginBottom: 24,
    textAlign: 'center',
  },
  input: {
    backgroundColor: colors.inputBg,
    borderRadius: 12,
    padding: 16,
    color: colors.text,
    fontSize: 16,
    marginBottom: 24,
    borderWidth: 1,
    borderColor: colors.border,
    textAlign: language === 'ar' ? 'right' : 'left',
  },
  modalButtons: {
    flexDirection: 'row',
    gap: 12,
  },
  modalButton: {
    flex: 1,
    paddingVertical: 14,
    borderRadius: 12,
    alignItems: 'center',
  },
  cancelButton: {
    backgroundColor: colors.inputBg,
  },
  connectButton: {
    backgroundColor: colors.primary,
  },
  cancelButtonText: {
    color: colors.text,
    fontWeight: '600',
    fontSize: 16,
  },
  connectButtonText: {
    color: '#fff',
    fontWeight: '600',
    fontSize: 16,
  },
});

