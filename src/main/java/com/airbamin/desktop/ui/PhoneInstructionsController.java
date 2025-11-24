package com.airbamin.desktop.ui;

import com.airbamin.desktop.network.NetworkUtils;
import com.airbamin.desktop.transfer.LocalTransferServer;
import com.airbamin.desktop.transfer.TransferService;
import com.google.zxing.BarcodeFormat;
import com.google.zxing.WriterException;
import com.google.zxing.client.j2se.MatrixToImageWriter;
import com.google.zxing.qrcode.QRCodeWriter;
import javafx.fxml.FXML;
import javafx.scene.control.Label;
import javafx.scene.control.TextField;
import javafx.scene.image.Image;
import javafx.scene.image.ImageView;
import javafx.scene.input.Clipboard;
import javafx.scene.input.ClipboardContent;

import java.io.ByteArrayInputStream;
import java.io.ByteArrayOutputStream;
import java.io.IOException;

public class PhoneInstructionsController {

    @FXML private TextField linkField;
    @FXML private Label ipLabel;
    @FXML private ImageView qrImage;

    private final TransferService transferService = new TransferService();

    @FXML
    public void initialize() {
        onRefresh();
    }

    @FXML
    public void onCopyLink() {
        ClipboardContent content = new ClipboardContent();
        content.putString(linkField.getText());
        Clipboard.getSystemClipboard().setContent(content);
    }

    @FXML
    public void onRefresh() {
        refreshLink();
    }

    @FXML
    public void onBack() {
        loadScene("/Home.fxml");
    }

    private void refreshLink() {
        int port = LocalTransferServer.getInstance().getActivePort();
        String url = transferService.buildPhoneUrl(NetworkUtils.NetworkMode.AUTO, "", port);
        linkField.setText(url + "/");
        ipLabel.setText("Current IP: " + url + " — tap Refresh after changing Wi‑Fi/hotspot.");
        generateQr(url + "/");
    }

    private void generateQr(String text) {
        try {
            QRCodeWriter writer = new QRCodeWriter();
            var matrix = writer.encode(text, BarcodeFormat.QR_CODE, 220, 220);
            ByteArrayOutputStream out = new ByteArrayOutputStream();
            MatrixToImageWriter.writeToStream(matrix, "PNG", out);
            Image image = new Image(new ByteArrayInputStream(out.toByteArray()));
            qrImage.setImage(image);
        } catch (WriterException | IOException e) {
            ipLabel.setText("QR error: " + e.getMessage());
        }
    }

    private void loadScene(String resource) {
        try {
            Navigation.navigate(linkField, resource);
        } catch (Exception e) {
            // ignore
        }
    }
}
