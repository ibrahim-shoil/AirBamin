package com.airbamin.desktop.ui;

import com.airbamin.desktop.transfer.TransferService;
import com.airbamin.desktop.transfer.TransferService.FileRecord;
import com.airbamin.desktop.utils.AuthManager;
import javafx.beans.property.ReadOnlyObjectWrapper;
import javafx.beans.property.ReadOnlyStringWrapper;
import javafx.collections.FXCollections;
import javafx.collections.ObservableList;
import javafx.fxml.FXML;
import javafx.scene.control.Label;
import javafx.scene.control.TableColumn;
import javafx.scene.control.TableView;

import java.awt.Desktop;
import java.io.IOException;
import java.time.LocalDateTime;
import java.time.ZoneId;
import java.util.List;
import java.util.stream.Collectors;

public class UploadsController {

    @FXML
    private TableView<FileRecord> filesTable;
    @FXML
    private TableColumn<FileRecord, String> nameColumn;
    @FXML
    private TableColumn<FileRecord, Long> sizeColumn;
    @FXML
    private TableColumn<FileRecord, String> dateColumn;
    @FXML
    private Label statusLabel;

    private final TransferService transferService = new TransferService();
    private final ObservableList<FileRecord> tableData = FXCollections.observableArrayList();

    @FXML
    public void initialize() {
        if (!AuthManager.ensureAuthenticated(filesTable)) {
            return;
        }
        nameColumn.setCellValueFactory(cell -> new ReadOnlyStringWrapper(cell.getValue().name()));
        sizeColumn.setCellValueFactory(cell -> new ReadOnlyObjectWrapper<>(cell.getValue().sizeKb()));
        dateColumn.setCellValueFactory(cell -> new ReadOnlyStringWrapper(cell.getValue().formattedDate()));
        filesTable.setItems(tableData);
        filesTable.setColumnResizePolicy(javafx.scene.control.TableView.CONSTRAINED_RESIZE_POLICY);
        loadFiles();
    }

    @FXML
    public void onRefresh() {
        loadFiles();
    }

    @FXML
    public void onOpenFolder() {
        try {
            Desktop.getDesktop().open(transferService.getUploadDir().toFile());
        } catch (IOException e) {
            statusLabel.setText("Cannot open folder");
        }
    }

    @FXML
    public void onBack() {
        loadScene("/Home.fxml");
    }

    @FXML
    public void onOpenFullList() {
        loadScene("/UploadsAll.fxml");
    }

    private void loadFiles() {
        try {
            List<FileRecord> records = transferService.listFiles();
            LocalDateTime cutoff = LocalDateTime.now(ZoneId.systemDefault()).minusDays(1);
            List<FileRecord> latest = records.stream()
                    .filter(record -> record.lastModified().isAfter(cutoff))
                    .collect(Collectors.toList());
            tableData.setAll(latest);
            statusLabel.setText("Showing last 24h: " + latest.size());
        } catch (IOException e) {
            statusLabel.setText("Failed to list files");
        }
    }

    private void loadScene(String resource) {
        try {
            Navigation.navigate(filesTable, resource);
        } catch (Exception e) {
            statusLabel.setText("Cannot open view");
        }
    }
}
