declare module 'react-native-static-server' {
    export default class StaticServer {
        constructor(port: number, root?: string, localOnly?: boolean, keepAlive?: boolean);
        constructor(port: number, root?: string, opts?: { localOnly?: boolean; keepAlive?: boolean });
        start(): Promise<string>;
        stop(): Promise<void>;
        isRunning(): Promise<boolean>;
    }
}
