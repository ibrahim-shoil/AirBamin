import Foundation
import ReplayKit
import VideoToolbox
import Network

@objc(ScreenCaptureModule)
class ScreenCaptureModule: NSObject {
    
    private let recorder = RPScreenRecorder.shared()
    private var connection: NWConnection?
    private var isRecording = false
    private var compressionSession: VTCompressionSession?
    private var startTime: CMTime = .zero
    
    @objc
    func startCapture(_ ip: String, port: Int, quality: String, resolver resolve: @escaping RCTPromiseResolveBlock, rejecter reject: @escaping RCTPromiseRejectBlock) {
        guard !isRecording else {
            reject("ERR_ALREADY_RECORDING", "Recording is already in progress", nil)
            return
        }
        
        // Setup UDP Connection
        let host = NWEndpoint.Host(ip)
        let port = NWEndpoint.Port(integerLiteral: UInt16(port))
        connection = NWConnection(host: host, port: port, using: .udp)
        connection?.start(queue: .global(qos: .userInteractive))
        
        // Setup Video Encoder
        let width = 1920
        let height = 1080
        let bitrate = quality == "high" ? 8_000_000 : 4_000_000 // 8Mbps or 4Mbps
        
        setupCompressionSession(width: Int32(width), height: Int32(height), bitrate: Int32(bitrate))
        
        // Start Capture
        recorder.startCapture(handler: { (sampleBuffer, type, error) in
            if let error = error {
                print("Capture error: \(error)")
                return
            }
            
            if type == .video {
                self.processVideoSampleBuffer(sampleBuffer)
            }
        }) { (error) in
            if let error = error {
                reject("ERR_START_FAILED", "Failed to start capture: \(error.localizedDescription)", error)
            } else {
                self.isRecording = true
                resolve(true)
            }
        }
    }
    
    @objc
    func stopCapture(_ resolve: @escaping RCTPromiseResolveBlock, rejecter reject: @escaping RCTPromiseRejectBlock) {
        guard isRecording else {
            resolve(false)
            return
        }
        
        recorder.stopCapture { (error) in
            self.isRecording = false
            self.connection?.cancel()
            self.connection = nil
            
            if let session = self.compressionSession {
                VTCompressionSessionInvalidate(session)
                self.compressionSession = nil
            }
            
            if let error = error {
                reject("ERR_STOP_FAILED", "Failed to stop capture", error)
            } else {
                resolve(true)
            }
        }
    }
    
    private func setupCompressionSession(width: Int32, height: Int32, bitrate: Int32) {
        let status = VTCompressionSessionCreate(
            allocator: kCFAllocatorDefault,
            width: width,
            height: height,
            codecType: kCMVideoCodecType_H264,
            encoderSpecification: nil,
            imageBufferAttributes: nil,
            compressedDataAllocator: nil,
            outputCallback: { (outputCallbackRefCon, sourceFrameRefCon, status, infoFlags, sampleBuffer) in
                guard status == noErr, let sampleBuffer = sampleBuffer else { return }
                // Handle encoded frame
                let module = Unmanaged<ScreenCaptureModule>.fromOpaque(outputCallbackRefCon!).takeUnretainedValue()
                module.handleEncodedFrame(sampleBuffer)
            },
            refcon: UnsafeMutableRawPointer(Unmanaged.passUnretained(self).toOpaque()),
            compressionSessionOut: &compressionSession
        )
        
        if status != noErr {
            print("Failed to create compression session: \(status)")
            return
        }
        
        guard let session = compressionSession else { return }
        
        VTSessionSetProperty(session, key: kVTCompressionPropertyKey_RealTime, value: kCFBooleanTrue)
        VTSessionSetProperty(session, key: kVTCompressionPropertyKey_ProfileLevel, value: kVTProfileLevel_H264_High_AutoLevel)
        VTSessionSetProperty(session, key: kVTCompressionPropertyKey_AverageBitRate, value: bitrate as CFNumber)
        VTSessionSetProperty(session, key: kVTCompressionPropertyKey_ExpectedFrameRate, value: 60 as CFNumber)
        VTSessionSetProperty(session, key: kVTCompressionPropertyKey_MaxKeyFrameInterval, value: 120 as CFNumber) // Keyframe every 2s
        
        VTCompressionSessionPrepareToEncodeFrames(session)
    }
    
    private func processVideoSampleBuffer(_ sampleBuffer: CMSampleBuffer) {
        guard let session = compressionSession,
              let imageBuffer = CMSampleBufferGetImageBuffer(sampleBuffer) else { return }
        
        let timestamp = CMSampleBufferGetPresentationTimeStamp(sampleBuffer)
        let duration = CMSampleBufferGetDuration(sampleBuffer)
        
        VTCompressionSessionEncodeFrame(
            session,
            imageBuffer: imageBuffer,
            presentationTimeStamp: timestamp,
            duration: duration,
            frameProperties: nil,
            sourceFrameRefCon: nil,
            infoFlagsOut: nil
        )
    }
    
    private func handleEncodedFrame(_ sampleBuffer: CMSampleBuffer) {
        guard let dataBuffer = CMSampleBufferGetDataBuffer(sampleBuffer) else { return }
        
        var length: Int = 0
        var dataPointer: UnsafeMutablePointer<Int8>?
        
        CMBlockBufferGetDataPointer(dataBuffer, atOffset: 0, lengthAtOffsetOut: nil, totalLengthOut: &length, dataPointerOut: &dataPointer)
        
        if let pointer = dataPointer {
            let data = Data(bytes: pointer, count: length)
            sendData(data)
        }
    }
    
    private func sendData(_ data: Data) {
        guard let connection = connection else { return }
        
        // Split into chunks if necessary (UDP MTU is ~65KB but safer to stay lower, e.g. 1400 bytes)
        // For simplicity in this prototype, we assume the receiver handles reassembly or we send larger packets if local network allows.
        // However, iOS NWConnection handles fragmentation for us usually if we just send the blob.
        // But for raw UDP, we should be careful.
        // Let's send the raw NAL units.
        
        connection.send(content: data, completion: .contentProcessed({ error in
            if let error = error {
                print("Send error: \(error)")
            }
        }))
    }
}
