#import <React/RCTBridgeModule.h>

@interface RCT_EXTERN_MODULE(ScreenCaptureModule, NSObject)

RCT_EXTERN_METHOD(startCapture:(NSString *)ip port:(NSInteger)port quality:(NSString *)quality resolver:(RCTPromiseResolveBlock)resolve rejecter:(RCTPromiseRejectBlock)reject)
RCT_EXTERN_METHOD(stopCapture:(RCTPromiseResolveBlock)resolve rejecter:(RCTPromiseRejectBlock)reject)

@end
