package com.airbamin.desktop.ui;

import com.airbamin.desktop.storage.LocalStorage;
import com.airbamin.desktop.utils.AuthManager;
import com.airbamin.desktop.utils.YouTubeDownloadService;
import com.airbamin.desktop.utils.YouTubeDownloadService.*;
import javafx.animation.Animation;
import javafx.animation.KeyFrame;
import javafx.animation.Timeline;
import javafx.application.Platform;
import javafx.collections.FXCollections;
import javafx.fxml.FXML;
import javafx.scene.control.*;
import javafx.scene.image.Image;
import javafx.scene.image.ImageView;
import javafx.scene.layout.BorderPane;
import javafx.scene.layout.HBox;
import javafx.scene.layout.VBox;
import javafx.util.Duration;

import java.awt.Desktop;
import java.io.IOException;
import java.nio.file.Path;
import java.text.MessageFormat;
import java.util.*;

/**
 * Controller for the YouTube Downloader screen.
 */
public class YouTubeDownloaderController {

    @FXML
    private BorderPane rootPane;

    // URL Input Section
    @FXML
    private TextField urlField;
    @FXML
    private Button fetchButton;

    // Video Info Section
    @FXML
    private VBox videoInfoBox;
    @FXML
    private ImageView thumbnailImage;
    @FXML
    private Label videoTitleLabel;
    @FXML
    private Label videoChannelLabel;
    @FXML
    private Label videoDurationLabel;

    // Download Options
    @FXML
    private ChoiceBox<String> downloadTypeChoice;
    @FXML
    private ChoiceBox<String> qualityChoice;
    @FXML
    private ChoiceBox<String> audioFormatChoice;
    @FXML
    private HBox qualityBox;
    @FXML
    private HBox audioFormatBox;
    @FXML
    private CheckBox subtitlesCheck;
    @FXML
    private CheckBox thumbnailCheck;
    @FXML
    private VBox subtitleLanguagesBox;
    @FXML
    private ListView<CheckBox> subtitleLanguagesList;

    // Progress Section
    @FXML
    private VBox progressBox;
    @FXML
    private ProgressBar progressBar;
    @FXML
    private Label statusLabel;
    @FXML
    private Label speedLabel;
    @FXML
    private Label etaLabel;

    // Fetching Progress (visible during initial fetch)
    @FXML
    private VBox fetchingBox;
    @FXML
    private Label fetchingStatusLabel;
    @FXML
    private ProgressBar fetchingProgressBar;

    // Action Buttons
    @FXML
    private Button downloadButton;
    @FXML
    private Button cancelButton;
    @FXML
    private Button openFolderButton;

    // Output Folder
    @FXML
    private Label outputFolderLabel;

    private final YouTubeDownloadService downloadService = YouTubeDownloadService.getInstance();
    private VideoInfo currentVideoInfo;
    private ResourceBundle bundle;
    private boolean isDownloading = false;
    private Timeline fetchingAnimation;
    private int dotCount = 0;

    @FXML
    public void initialize() {
        Platform.runLater(() -> {
            if (!AuthManager.ensureAuthenticated(rootPane)) {
                return;
            }

            // Load ResourceBundle
            String lang = LocalStorage.loadLanguage();
            if (lang == null || lang.isBlank())
                lang = "en";
            Locale locale = lang.equals("ar") ? new Locale("ar") : Locale.ENGLISH;
            bundle = ResourceBundle.getBundle("com.airbamin.desktop.messages_" + lang, locale);

            // Initialize service
            initializeService();

            // Setup UI
            setupChoiceBoxes();
            setupListeners();
            updateUIState(false);

            // Show output folder
            outputFolderLabel.setText(downloadService.getDownloadsDir().toString());
        });
    }

    private void initializeService() {
        statusLabel.setText(bundle.getString("downloader.status.initializing"));

        downloadService.initialize().thenAccept(ready -> {
            Platform.runLater(() -> {
                if (ready) {
                    statusLabel.setText(bundle.getString("downloader.status.ready"));
                    fetchButton.setDisable(false);
                } else {
                    statusLabel.setText(bundle.getString("downloader.status.error_init"));
                }
            });
        });
    }

    private void setupChoiceBoxes() {
        // Download Type
        downloadTypeChoice.setItems(FXCollections.observableArrayList(
                bundle.getString("downloader.type.video"),
                bundle.getString("downloader.type.audio"),
                bundle.getString("downloader.type.video_subs"),
                bundle.getString("downloader.type.subtitles_only")));
        downloadTypeChoice.setValue(bundle.getString("downloader.type.video"));

        // Quality options (will be populated after video info fetch)
        qualityChoice.setItems(FXCollections.observableArrayList(
                "2160p (4K)", "1440p (2K)", "1080p (Full HD)", "720p (HD)", "480p", "360p"));
        qualityChoice.setValue("1080p (Full HD)");

        // Audio Format
        audioFormatChoice.setItems(FXCollections.observableArrayList(
                "MP3", "M4A", "WAV", "FLAC"));
        audioFormatChoice.setValue("MP3");

        // Initially hide audio format (only show when Audio Only selected)
        audioFormatBox.setVisible(false);
        audioFormatBox.setManaged(false);
    }

    private void setupListeners() {
        // Toggle quality/audio format visibility based on download type
        downloadTypeChoice.getSelectionModel().selectedItemProperty().addListener((obs, oldVal, newVal) -> {
            boolean isAudioOnly = newVal != null && newVal.equals(bundle.getString("downloader.type.audio"));
            boolean isSubtitlesOnly = newVal != null
                    && newVal.equals(bundle.getString("downloader.type.subtitles_only"));

            qualityBox.setVisible(!isAudioOnly && !isSubtitlesOnly);
            qualityBox.setManaged(!isAudioOnly && !isSubtitlesOnly);
            audioFormatBox.setVisible(isAudioOnly);
            audioFormatBox.setManaged(isAudioOnly);

            // For subtitle-only mode: hide checkbox but show language selector
            if (isSubtitlesOnly) {
                subtitlesCheck.setVisible(false);
                subtitlesCheck.setManaged(false);
                subtitleLanguagesBox.setVisible(true);
                subtitleLanguagesBox.setManaged(true);
            } else {
                subtitlesCheck.setVisible(true);
                subtitlesCheck.setManaged(true);
                // Keep language selector state based on checkbox
                subtitleLanguagesBox.setVisible(subtitlesCheck.isSelected());
                subtitleLanguagesBox.setManaged(subtitlesCheck.isSelected());
            }
        });

        // URL field - enable fetch button when URL entered
        urlField.textProperty().addListener((obs, oldVal, newVal) -> {
            fetchButton.setDisable(newVal == null || newVal.trim().isEmpty() || !downloadService.isReady());
        });

        // Subtitle checkbox - show/hide subtitle language selector
        subtitlesCheck.selectedProperty().addListener((obs, oldVal, newVal) -> {
            subtitleLanguagesBox.setVisible(newVal);
            subtitleLanguagesBox.setManaged(newVal);
        });

        // Enter key to fetch
        urlField.setOnAction(e -> onFetchInfo());
    }

    private void updateUIState(boolean hasVideoInfo) {
        videoInfoBox.setVisible(hasVideoInfo);
        videoInfoBox.setManaged(hasVideoInfo);
        downloadButton.setDisable(!hasVideoInfo || isDownloading);
        cancelButton.setVisible(isDownloading);
        cancelButton.setManaged(isDownloading);
    }

    @FXML
    private void onFetchInfo() {
        String url = urlField.getText().trim();
        if (url.isEmpty())
            return;

        // Validate URL
        if (!isValidYouTubeUrl(url)) {
            showError(bundle.getString("downloader.error.invalid_url"));
            return;
        }

        fetchButton.setDisable(true);
        progressBar.setProgress(-1); // Indeterminate

        // Start animated "Fetching..." text
        startFetchingAnimation();

        downloadService.fetchVideoInfo(url)
                .thenAccept(info -> Platform.runLater(() -> {
                    stopFetchingAnimation();
                    currentVideoInfo = info;
                    displayVideoInfo(info);
                    updateUIState(true);
                    statusLabel.setText(bundle.getString("downloader.status.ready_download"));
                    progressBar.setProgress(0);
                    fetchButton.setDisable(false);
                }))
                .exceptionally(ex -> {
                    Platform.runLater(() -> {
                        stopFetchingAnimation();
                        showError(
                                bundle.getString("downloader.error.fetch_failed") + ": " + ex.getCause().getMessage());
                        progressBar.setProgress(0);
                        fetchButton.setDisable(false);
                    });
                    return null;
                });
    }

    private void startFetchingAnimation() {
        // Show the fetching box
        fetchingBox.setVisible(true);
        fetchingBox.setManaged(true);

        dotCount = 0;
        String baseText = bundle.getString("downloader.status.fetching");
        // Remove trailing dots if any for clean base
        String cleanBase = baseText.replaceAll("\\.+$", "");

        fetchingAnimation = new Timeline(new KeyFrame(Duration.millis(400), e -> {
            dotCount = (dotCount % 3) + 1;
            String dots = ".".repeat(dotCount);
            fetchingStatusLabel.setText(cleanBase + dots);
        }));
        fetchingAnimation.setCycleCount(Animation.INDEFINITE);
        fetchingAnimation.play();
        fetchingStatusLabel.setText(cleanBase + ".");
    }

    private void stopFetchingAnimation() {
        if (fetchingAnimation != null) {
            fetchingAnimation.stop();
            fetchingAnimation = null;
        }
        // Hide the fetching box
        fetchingBox.setVisible(false);
        fetchingBox.setManaged(false);
    }

    private void displayVideoInfo(VideoInfo info) {
        videoTitleLabel.setText(info.title);
        videoChannelLabel.setText(info.channel);
        videoDurationLabel.setText(info.getDurationString());

        // Load thumbnail using standard JPG URL (more reliable for JavaFX than WebP)
        if (info.id != null) {
            String thumbUrl = "https://img.youtube.com/vi/" + info.id + "/mqdefault.jpg";
            System.out.println("Loading thumbnail: " + thumbUrl);
            try {
                Image thumb = new Image(thumbUrl, true);
                thumb.exceptionProperty().addListener((obs, old, ex) -> {
                    if (ex != null) {
                        System.err.println("Error loading thumbnail: " + ex.getMessage());
                    }
                });
                thumbnailImage.setImage(thumb);
            } catch (Exception e) {
                System.err.println("Exception loading thumbnail: " + e.getMessage());
            }
        }

        // Update quality options based on available formats
        if (!info.formats.isEmpty()) {
            List<String> qualities = new ArrayList<>();
            for (Format f : info.formats) {
                if (f.height >= 2160)
                    qualities.add("2160p (4K)");
                else if (f.height >= 1440)
                    qualities.add("1440p (2K)");
                else if (f.height >= 1080)
                    qualities.add("1080p (Full HD)");
                else if (f.height >= 720)
                    qualities.add("720p (HD)");
                else if (f.height >= 480)
                    qualities.add("480p");
                else if (f.height >= 360)
                    qualities.add("360p");
            }
            // Remove duplicates while preserving order
            LinkedHashSet<String> uniqueQualities = new LinkedHashSet<>(qualities);
            qualityChoice.setItems(FXCollections.observableArrayList(uniqueQualities));
            if (!uniqueQualities.isEmpty()) {
                // Select best quality that's 1080p or lower by default
                String defaultQuality = uniqueQualities.stream()
                        .filter(q -> q.startsWith("1080") || q.startsWith("720"))
                        .findFirst()
                        .orElse(uniqueQualities.iterator().next());
                qualityChoice.setValue(defaultQuality);
            }
        }

        // Populate subtitle languages
        subtitleLanguagesList.getItems().clear();
        if (!info.subtitles.isEmpty()) {
            for (SubtitleTrack track : info.subtitles) {
                CheckBox cb = new CheckBox(track.name);
                cb.setUserData(track.code); // Store language code
                // Auto-select English by default
                if (track.code.startsWith("en")) {
                    cb.setSelected(true);
                }
                subtitleLanguagesList.getItems().add(cb);
            }
        }
    }

    @FXML
    private void onDownload() {
        if (currentVideoInfo == null)
            return;

        String url = urlField.getText().trim();
        if (url.isEmpty())
            return;

        isDownloading = true;
        downloadButton.setDisable(true);
        cancelButton.setVisible(true);
        cancelButton.setManaged(true);
        fetchButton.setDisable(true);

        // Build download options
        DownloadOptions options = new DownloadOptions();

        String downloadType = downloadTypeChoice.getValue();
        options.audioOnly = downloadType.equals(bundle.getString("downloader.type.audio"));
        options.subtitlesOnly = downloadType.equals(bundle.getString("downloader.type.subtitles_only"));

        if (options.subtitlesOnly) {
            // Subtitle-only mode: always enable subtitle download
            options.downloadSubtitles = true;
            // Collect selected language codes
            List<String> selectedLangs = new ArrayList<>();
            for (CheckBox cb : subtitleLanguagesList.getItems()) {
                if (cb.isSelected()) {
                    selectedLangs.add((String) cb.getUserData());
                }
            }
            // Fallback to English if nothing selected
            options.subtitleLangs = selectedLangs.isEmpty() ? Arrays.asList("en") : selectedLangs;
        } else if (options.audioOnly) {
            String audioFormat = audioFormatChoice.getValue();
            options.audioFormat = audioFormat != null ? audioFormat.toLowerCase() : "mp3";
        } else {
            String quality = qualityChoice.getValue();
            if (quality != null) {
                // Extract height from quality string like "1080p (Full HD)"
                options.quality = quality.split("p")[0] + "p";
            }
            options.outputFormat = "mp4";
        }

        // Subtitles - collect selected languages from list
        if (subtitlesCheck.isSelected()) {
            options.downloadSubtitles = true;
            // Collect selected language codes
            List<String> selectedLangs = new ArrayList<>();
            for (CheckBox cb : subtitleLanguagesList.getItems()) {
                if (cb.isSelected()) {
                    selectedLangs.add((String) cb.getUserData());
                }
            }
            // Fallback to English if nothing selected
            options.subtitleLangs = selectedLangs.isEmpty() ? Arrays.asList("en") : selectedLangs;
        }

        // Thumbnail
        if (thumbnailCheck.isSelected()) {
            options.downloadThumbnail = true;
        }

        statusLabel.setText(bundle.getString("downloader.status.downloading"));
        progressBar.setProgress(0);

        downloadService.downloadVideo(url, options, new ProgressCallback() {
            @Override
            public void onProgress(double percent, String status, String size, String speed, String eta) {
                Platform.runLater(() -> {
                    progressBar.setProgress(percent / 100.0);

                    // Format status string
                    String statusText = MessageFormat.format(bundle.getString("downloader.status.progress"), percent);
                    String sizeText = MessageFormat.format(bundle.getString("downloader.status.size"), size);
                    String speedText = MessageFormat.format(bundle.getString("downloader.status.speed"), speed);
                    String etaText = MessageFormat.format(bundle.getString("downloader.status.eta"), eta);

                    statusLabel.setText(String.format("%s • %s • %s • %s", statusText, sizeText, speedText, etaText));
                });
            }

            @Override
            public void onComplete(Path outputFile) {
                Platform.runLater(() -> {
                    isDownloading = false;
                    progressBar.setProgress(1.0);
                    statusLabel.setText(bundle.getString("downloader.status.complete"));
                    downloadButton.setDisable(false);
                    cancelButton.setVisible(false);
                    cancelButton.setManaged(false);
                    fetchButton.setDisable(false);

                    // Show success message
                    showInfo(MessageFormat.format(bundle.getString("downloader.success"), outputFile.getFileName()));
                });
            }

            @Override
            public void onError(String error) {
                Platform.runLater(() -> {
                    isDownloading = false;
                    progressBar.setProgress(0);
                    statusLabel.setText(bundle.getString("downloader.status.error"));
                    downloadButton.setDisable(false);
                    cancelButton.setVisible(false);
                    cancelButton.setManaged(false);
                    fetchButton.setDisable(false);

                    showError(error);
                });
            }
        });
    }

    @FXML
    private void onCancel() {
        downloadService.cancel();
        isDownloading = false;
        statusLabel.setText(bundle.getString("downloader.status.cancelled"));
        progressBar.setProgress(0);
        downloadButton.setDisable(false);
        cancelButton.setVisible(false);
        cancelButton.setManaged(false);
        fetchButton.setDisable(false);
    }

    @FXML
    private void onOpenFolder() {
        try {
            Desktop.getDesktop().open(downloadService.getDownloadsDir().toFile());
        } catch (IOException e) {
            showError("Cannot open folder: " + e.getMessage());
        }
    }

    @FXML
    private void onPasteUrl() {
        try {
            java.awt.datatransfer.Clipboard clipboard = java.awt.Toolkit.getDefaultToolkit().getSystemClipboard();
            String data = (String) clipboard.getData(java.awt.datatransfer.DataFlavor.stringFlavor);
            if (data != null && !data.isEmpty()) {
                urlField.setText(data.trim());
            }
        } catch (Exception e) {
            // Ignore clipboard errors
        }
    }

    private boolean isValidYouTubeUrl(String url) {
        if (url == null || url.isEmpty())
            return false;
        url = url.toLowerCase();
        return url.contains("youtube.com") || url.contains("youtu.be");
    }

    private void showError(String message) {
        Alert alert = new Alert(Alert.AlertType.ERROR);
        alert.setTitle(bundle.getString("app.error"));
        alert.setHeaderText(null);
        alert.setContentText(message);
        ThemeManager.applyToDialog(alert, LocalStorage.loadThemeMode());
        alert.showAndWait();
    }

    private void showInfo(String message) {
        Alert alert = new Alert(Alert.AlertType.INFORMATION);
        alert.setTitle(bundle.getString("app.success"));
        alert.setHeaderText(null);
        alert.setContentText(message);
        ThemeManager.applyToDialog(alert, LocalStorage.loadThemeMode());
        alert.showAndWait();
    }
}
