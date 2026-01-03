package com.airbamin.desktop.mirror;

import javafx.application.Platform;
import javafx.scene.image.ImageView;
import org.bytedeco.javacv.FFmpegFrameGrabber;
import org.bytedeco.javacv.Frame;
import org.bytedeco.ffmpeg.global.avcodec;
import org.bytedeco.javacv.JavaFXFrameConverter;

import java.io.IOException;
import java.io.PipedInputStream;
import java.io.PipedOutputStream;

public class VideoDecoder {

    private FFmpegFrameGrabber grabber;
    private final PipedInputStream inputStream;
    private final PipedOutputStream outputStream;
    private final ImageView targetView;
    private volatile boolean running = false;
    private Thread decodeThread;

    private final JavaFXFrameConverter converter = new JavaFXFrameConverter();

    public VideoDecoder(ImageView targetView) {
        this.targetView = targetView;
        this.inputStream = new PipedInputStream(1024 * 1024); // 1MB buffer
        try {
            this.outputStream = new PipedOutputStream(this.inputStream);
        } catch (IOException e) {
            throw new RuntimeException("Failed to create piped stream", e);
        }
    }

    public void start() {
        if (running)
            return;
        running = true;

        decodeThread = new Thread(() -> {
            try {
                // Initialize grabber with input stream
                grabber = new FFmpegFrameGrabber(inputStream);
                grabber.setFormat("h264");
                grabber.setVideoCodec(avcodec.AV_CODEC_ID_H264);
                // Allow more probe data so SPS/PPS can be parsed
                grabber.setOption("probesize", "2000000"); // ~2MB
                grabber.setOption("analyzeduration", "2000000");
                // Low latency settings
                grabber.setOption("fflags", "nobuffer");
                grabber.setOption("flags", "low_delay");

                grabber.start();

                int frameCount = 0;
                while (running) {
                    Frame frame = grabber.grabImage();
                    if (frame != null) {
                        frameCount++;
                        if (frameCount <= 3) {
                            System.out.println("Decoded frame " + frameCount + " size: "
                                    + frame.imageWidth + "x" + frame.imageHeight);
                        }
                        updateImage(frame);
                    }
                }
            } catch (Exception e) {
                e.printStackTrace();
            } finally {
                try {
                    if (grabber != null)
                        grabber.stop();
                } catch (Exception e) {
                    e.printStackTrace();
                }
            }
        }, "VideoDecoder");

        decodeThread.start();
    }

    public void stop() {
        running = false;
        try {
            outputStream.close();
        } catch (IOException e) {
            e.printStackTrace();
        }
    }

    public void decode(byte[] data) {
        try {
            outputStream.write(data);
            outputStream.flush();
        } catch (IOException e) {
            e.printStackTrace();
        }
    }

    private void updateImage(Frame frame) {
        if (frame == null || frame.imageWidth <= 0 || frame.imageHeight <= 0)
            return;

        // Convert to JavaFX Image
        javafx.scene.image.Image image = converter.convert(frame);

        if (image != null) {
            Platform.runLater(() -> {
                targetView.setImage(image);
            });
        }
    }
}
