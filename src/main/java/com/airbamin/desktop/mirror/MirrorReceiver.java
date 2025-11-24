package com.airbamin.desktop.mirror;

import java.io.IOException;
import java.net.DatagramPacket;
import java.net.DatagramSocket;
import java.net.SocketException;
import java.nio.ByteBuffer;
import java.util.concurrent.BlockingQueue;
import java.util.concurrent.LinkedBlockingQueue;
import java.util.concurrent.atomic.AtomicBoolean;

public class MirrorReceiver implements Runnable {

    private static final int PORT = 9091;
    private static final int PACKET_SIZE = 65535; // Max UDP packet size
    private static final int BUFFER_SIZE = 1024 * 1024 * 2; // 2MB buffer

    private DatagramSocket socket;
    private final AtomicBoolean running = new AtomicBoolean(false);
    private final BlockingQueue<byte[]> frameQueue = new LinkedBlockingQueue<>();
    private Thread receiverThread;
    private VideoDecoder decoder;

    public MirrorReceiver() {
    }

    public void start(VideoDecoder decoder) {
        this.decoder = decoder;
        if (running.get())
            return;

        try {
            socket = new DatagramSocket(PORT);
            socket.setReceiveBufferSize(BUFFER_SIZE);
            running.set(true);

            receiverThread = new Thread(this, "MirrorReceiver");
            receiverThread.start();

            System.out.println("MirrorReceiver started on port " + PORT);
        } catch (SocketException e) {
            e.printStackTrace();
        }
    }

    public void stop() {
        running.set(false);
        if (socket != null && !socket.isClosed()) {
            socket.close();
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
        byte[] buffer = new byte[PACKET_SIZE];
        DatagramPacket packet = new DatagramPacket(buffer, buffer.length);

        while (running.get()) {
            try {
                socket.receive(packet);

                // Copy data to new array to avoid overwriting before processing
                // In production, use a buffer pool to reduce GC
                byte[] data = new byte[packet.getLength()];
                System.arraycopy(packet.getData(), packet.getOffset(), data, 0, packet.getLength());

                // For now, assume each packet is a NAL unit or frame chunk
                // We pass it directly to decoder
                if (decoder != null) {
                    decoder.decode(data);
                }

            } catch (IOException e) {
                if (running.get()) {
                    e.printStackTrace();
                }
            }
        }
    }
}
