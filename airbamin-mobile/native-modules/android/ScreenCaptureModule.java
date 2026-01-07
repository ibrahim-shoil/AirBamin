package com.airbamin;

import android.app.Activity;
import android.content.Context;
import android.content.Intent;
import android.graphics.PixelFormat;
import android.hardware.display.DisplayManager;
import android.hardware.display.VirtualDisplay;
import android.media.MediaCodec;
import android.media.MediaCodecInfo;
import android.media.MediaFormat;
import android.media.projection.MediaProjection;
import android.media.projection.MediaProjectionManager;
import android.os.Build;
import android.os.Handler;
import android.os.HandlerThread;
import android.util.DisplayMetrics;
import android.util.Log;
import android.view.Surface;
import android.view.WindowManager;

import androidx.annotation.NonNull;

import com.facebook.react.bridge.ActivityEventListener;
import com.facebook.react.bridge.Promise;
import com.facebook.react.bridge.ReactApplicationContext;
import com.facebook.react.bridge.ReactContextBaseJavaModule;
import com.facebook.react.bridge.ReactMethod;

import java.io.DataOutputStream;
import java.io.IOException;
import java.net.InetAddress;
import java.net.Socket;
import java.nio.ByteBuffer;

public class ScreenCaptureModule extends ReactContextBaseJavaModule implements ActivityEventListener {

    private static final String TAG = "ScreenCaptureModule";
    private static final int REQUEST_CODE_SCREEN_CAPTURE = 1001;
    private static final String MIME_TYPE = "video/avc"; // H.264

    private final ReactApplicationContext reactContext;
    private MediaProjectionManager projectionManager;
    private MediaProjection mediaProjection;
    private VirtualDisplay virtualDisplay;
    private MediaCodec encoder;
    private Surface inputSurface;

    private Socket socket;
    private DataOutputStream outputStream;
    private String targetIp;
    private int targetPort = 9091;

    private Promise startPromise;
    private boolean isCapturing = false;

    private HandlerThread encoderThread;
    private Handler encoderHandler;

    private int screenWidth;
    private int screenHeight;
    private int screenDpi;
    private int bitRate;
    private int frameRate;

    public ScreenCaptureModule(ReactApplicationContext context) {
        super(context);
        this.reactContext = context;
        context.addActivityEventListener(this);

        projectionManager = (MediaProjectionManager) context.getSystemService(Context.MEDIA_PROJECTION_SERVICE);

        // Get screen metrics
        WindowManager wm = (WindowManager) context.getSystemService(Context.WINDOW_SERVICE);
        DisplayMetrics displayMetrics = new DisplayMetrics();
        wm.getDefaultDisplay().getRealMetrics(displayMetrics);
        screenWidth = displayMetrics.widthPixels;
        screenHeight = displayMetrics.heightPixels;
        screenDpi = displayMetrics.densityDpi;
    }

    @NonNull
    @Override
    public String getName() {
        return "ScreenCaptureModule";
    }

    @ReactMethod
    public void startCapture(String ip, int port, String quality, Promise promise) {
        Log.d(TAG, "startCapture called: " + ip + ":" + port + " quality=" + quality);

        if (isCapturing) {
            Log.w(TAG, "Capture already in progress, stopping previous session...");
            stopScreenCapture();
        }

        try {
            targetIp = ip;
            targetPort = port;
            startPromise = promise;

            // Set encoding parameters based on quality
            setEncodingParams(quality);

            // Request screen capture permission
            Activity activity = getCurrentActivity();
            if (activity == null) {
                promise.reject("NO_ACTIVITY", "Activity is null");
                return;
            }

            Intent captureIntent = projectionManager.createScreenCaptureIntent();
            activity.startActivityForResult(captureIntent, REQUEST_CODE_SCREEN_CAPTURE);

        } catch (Exception e) {
            Log.e(TAG, "Failed to start capture", e);
            promise.reject("START_FAILED", e.getMessage());
        }
    }

    @ReactMethod
    public void stopCapture(Promise promise) {
        Log.d(TAG, "stopCapture called");
        try {
            stopScreenCapture();
            promise.resolve(true);
        } catch (Exception e) {
            Log.e(TAG, "Failed to stop capture", e);
            promise.reject("STOP_FAILED", e.getMessage());
        }
    }

    @Override
    public void onActivityResult(Activity activity, int requestCode, int resultCode, Intent data) {
        if (requestCode == REQUEST_CODE_SCREEN_CAPTURE) {
            if (resultCode == Activity.RESULT_OK && data != null) {
                startScreenCapture(resultCode, data);
            } else {
                if (startPromise != null) {
                    startPromise.reject("PERMISSION_DENIED", "User denied screen capture permission");
                    startPromise = null;
                }
            }
        }
    }

    @Override
    public void onNewIntent(Intent intent) {
        // Not needed
    }

    private void setEncodingParams(String quality) {
        switch (quality.toLowerCase()) {
            case "low":
            case "720p":
                screenWidth = 1280;
                screenHeight = 720;
                bitRate = 2_000_000; // 2 Mbps
                frameRate = 30;
                break;
            case "high":
            case "1080p":
            default:
                screenWidth = 1920;
                screenHeight = 1080;
                break;
        }
    }

    private void startScreenCapture(int resultCode, Intent data) {
        // Run in background to allow waiting for service
        new Thread(() -> {
            try {
                // Start foreground service first (required for Android 14+)
                Intent serviceIntent = new Intent(reactContext, ScreenCaptureService.class);
                if (Build.VERSION.SDK_INT >= Build.VERSION_CODES.O) {
                    reactContext.startForegroundService(serviceIntent);
                } else {
                    reactContext.startService(serviceIntent);
                }

                // Wait for service to actually be running (Android 14 enforces this strictly)
                waitForServiceStart();

                // Create MediaProjection
                mediaProjection = projectionManager.getMediaProjection(resultCode, data);

                if (mediaProjection == null) {
                    throw new IOException("Failed to create MediaProjection");
                }

                // Setup encoder thread
                encoderThread = new HandlerThread("EncoderThread");
                encoderThread.start();
                encoderHandler = new Handler(encoderThread.getLooper());

                // Connect TCP socket
                try {
                    socket = new Socket(targetIp, targetPort);
                    outputStream = new DataOutputStream(socket.getOutputStream());

                    // Setup encoder and start encoding
                    encoderHandler.post(() -> {
                        try {
                            setupEncoder();
                            createVirtualDisplay();
                            startEncoding();
                            isCapturing = true;
                            Log.d(TAG, "Screen capture started successfully");

                            if (startPromise != null) {
                                startPromise.resolve(true);
                                startPromise = null;
                            }
                        } catch (IOException e) {
                            Log.e(TAG, "Failed to setup encoder", e);
                            if (startPromise != null) {
                                startPromise.reject("ENCODER_ERROR", e.getMessage());
                                startPromise = null;
                            }
                        }
                    });
                } catch (IOException e) {
                    Log.e(TAG, "Failed to connect to server", e);
                    if (startPromise != null) {
                        startPromise.reject("CONNECTION_ERROR", e.getMessage());
                        startPromise = null;
                    }
                }

            } catch (Exception e) {
                Log.e(TAG, "Failed to start screen capture", e);
                if (startPromise != null) {
                    startPromise.reject("CAPTURE_FAILED", e.getMessage());
                    startPromise = null;
                }
            }
        }).start();
    }

    private void waitForServiceStart() throws IOException {
        int attempts = 0;
        while (!ScreenCaptureService.isRunning() && attempts < 30) { // up to ~3s
            try {
                Thread.sleep(100);
            } catch (InterruptedException e) {
                Thread.currentThread().interrupt();
                break;
            }
            attempts++;
        }
        if (!ScreenCaptureService.isRunning()) {
            throw new IOException("ScreenCaptureService not running");
        }
    }

    private void setupEncoder() throws IOException {
        MediaFormat format = MediaFormat.createVideoFormat(MIME_TYPE, screenWidth, screenHeight);
        format.setInteger(MediaFormat.KEY_COLOR_FORMAT, MediaCodecInfo.CodecCapabilities.COLOR_FormatSurface);
        format.setInteger(MediaFormat.KEY_BIT_RATE, bitRate);
        format.setInteger(MediaFormat.KEY_FRAME_RATE, frameRate);
        format.setInteger(MediaFormat.KEY_I_FRAME_INTERVAL, 1); // I-frame every 1 second

        // Low latency settings
        if (Build.VERSION.SDK_INT >= Build.VERSION_CODES.M) {
            format.setInteger(MediaFormat.KEY_LATENCY, 0);
        }

        encoder = MediaCodec.createEncoderByType(MIME_TYPE);
        encoder.configure(format, null, null, MediaCodec.CONFIGURE_FLAG_ENCODE);
        inputSurface = encoder.createInputSurface();
        encoder.start();

        Log.d(TAG, "Encoder setup complete: " + screenWidth + "x" + screenHeight + " @ " + frameRate + "fps");
    }

    private void createVirtualDisplay() {
        virtualDisplay = mediaProjection.createVirtualDisplay(
                "ScreenCapture",
                screenWidth,
                screenHeight,
                screenDpi,
                DisplayManager.VIRTUAL_DISPLAY_FLAG_AUTO_MIRROR,
                inputSurface,
                null,
                encoderHandler);

        Log.d(TAG, "VirtualDisplay created");
    }

    private void startEncoding() {
        encoderHandler.post(new Runnable() {
            @Override
            public void run() {
                encodeLoop();
            }
        });
    }

    private void encodeLoop() {
        MediaCodec.BufferInfo bufferInfo = new MediaCodec.BufferInfo();

        while (isCapturing) {
            try {
                int outputBufferId = encoder.dequeueOutputBuffer(bufferInfo, 10000);

                if (outputBufferId >= 0) {
                    ByteBuffer outputBuffer = encoder.getOutputBuffer(outputBufferId);

                    if (outputBuffer != null && bufferInfo.size > 0) {
                        // Send encoded data via TCP
                        sendPacket(outputBuffer, bufferInfo.size);
                    }

                    encoder.releaseOutputBuffer(outputBufferId, false);
                } else if (outputBufferId == MediaCodec.INFO_OUTPUT_FORMAT_CHANGED) {
                    MediaFormat newFormat = encoder.getOutputFormat();
                    Log.d(TAG, "Output format changed: " + newFormat);
                }
            } catch (Exception e) {
                Log.e(TAG, "Error in encode loop", e);
                break;
            }
        }
    }

    private void sendPacket(ByteBuffer buffer, int size) {
        try {
            if (outputStream != null) {
                byte[] data = new byte[size];
                buffer.get(data);
                buffer.rewind();

                outputStream.writeInt(size);
                outputStream.write(data);
                outputStream.flush();
            }
        } catch (IOException e) {
            Log.e(TAG, "Failed to send packet", e);
            // If connection fails, stop capturing
            stopScreenCapture();
        }
    }

    private void stopScreenCapture() {
        isCapturing = false;

        if (virtualDisplay != null) {
            virtualDisplay.release();
            virtualDisplay = null;
        }

        if (encoder != null) {
            try {
                encoder.stop();
                encoder.release();
            } catch (Exception e) {
                Log.e(TAG, "Error stopping encoder", e);
            }
            encoder = null;
        }

        if (inputSurface != null) {
            inputSurface.release();
            inputSurface = null;
        }

        if (mediaProjection != null) {
            mediaProjection.stop();
            mediaProjection = null;
        }

        if (socket != null) {
            try {
                socket.close();
            } catch (IOException e) {
                e.printStackTrace();
            }
            socket = null;
        }

        outputStream = null;

        if (encoderThread != null) {
            encoderThread.quitSafely();
            try {
                encoderThread.join();
            } catch (InterruptedException e) {
                Log.e(TAG, "Error joining encoder thread", e);
            }
            encoderThread = null;
        }

        // Stop foreground service
        Intent serviceIntent = new Intent(reactContext, ScreenCaptureService.class);
        reactContext.stopService(serviceIntent);

        Log.d(TAG, "Screen capture stopped");
    }
}
