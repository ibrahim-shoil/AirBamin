package com.airbamin.desktop.mirror;

import java.io.IOException;
import java.nio.ByteBuffer;
import java.util.concurrent.atomic.AtomicBoolean;

public class MirrorReceiver implements Runnable {

    private static final int PORT = 9091;
    private static final int BUFFER_SIZE = 1024 * 1024 * 2; // 2MB buffer

    private java.net.ServerSocket serverSocket;
    private java.net.Socket clientSocket;
    private final AtomicBoolean running = new AtomicBoolean(false);
    private Thread receiverThread;
    private VideoDecoder decoder;

    public MirrorReceiver() {
    }

    public void start(VideoDecoder decoder) throws IOException {
        this.decoder = decoder;
        if (running.get())
            return;

        serverSocket = new java.net.ServerSocket();
        serverSocket.setReuseAddress(true);
        serverSocket.bind(new java.net.InetSocketAddress(PORT));
        running.set(true);

        receiverThread = new Thread(this, "MirrorReceiver");
        receiverThread.start();

        System.out.println("MirrorReceiver (TCP) started on port " + PORT);
    }

    public void stop() {
        running.set(false);
        try {
            if (clientSocket != null && !clientSocket.isClosed()) {
                clientSocket.close();
            }
            if (serverSocket != null && !serverSocket.isClosed()) {
                serverSocket.close();
            }
        } catch (IOException e) {
            e.printStackTrace();
        }

        if (receiverThread != null) {
            try {
                receiverThread.join(1000);
            } catch (InterruptedException e) {
                Thread.currentThread().interrupt();
            }
        }
    }

    @Override
    public void run() {
        while (running.get()) {
            try {
                System.out.println("Waiting for connection...");
                clientSocket = serverSocket.accept();
                System.out.println("Client connected: " + clientSocket.getInetAddress());

                java.io.DataInputStream in = new java.io.DataInputStream(clientSocket.getInputStream());

                while (running.get() && !clientSocket.isClosed()) {
                    try {
                        // Read length (4 bytes)
                        int length = in.readInt();

                        if (length > BUFFER_SIZE || length < 0) {
                            System.err.println("Invalid frame length: " + length);
                            break;
                        }

                        byte[] data = new byte[length];
                        in.readFully(data);

                        if (decoder != null) {
                            decoder.decode(data);
                        }
                    } catch (IOException e) {
                        System.out.println("Client disconnected or error: " + e.getMessage());
                        break;
                    }
                }
            } catch (IOException e) {
                if (running.get()) {
                    e.printStackTrace();
                }
            }
        }
    }
}
