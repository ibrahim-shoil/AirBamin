const { app, BrowserWindow, ipcMain, Tray, Menu } = require('electron');
const express = require('express');
const QRCode = require('qrcode');
const path = require('path');
const os = require('os');
const multer = require('multer');
const fs = require('fs');

// Configuration
const PORT = 8080;
const UPLOAD_FOLDER = path.join(app.getPath('documents'), 'AirBamin_Uploads');

let mainWindow;
let serverApp;
let serverInstance;
let tray;

// Create upload folder
if (!fs.existsSync(UPLOAD_FOLDER)) {
    fs.mkdirSync(UPLOAD_FOLDER, { recursive: true });
}

// Get local IP address
function getLocalIP() {
    const interfaces = os.networkInterfaces();
    for (const name of Object.keys(interfaces)) {
        for (const iface of interfaces[name]) {
            if (iface.family === 'IPv4' && !iface.internal) {
                return iface.address;
            }
        }
    }
    return '127.0.0.1';
}

// Create Express server
function createServer() {
    serverApp = express();
    
    const storage = multer.diskStorage({
        destination: (req, file, cb) => {
            cb(null, UPLOAD_FOLDER);
        },
        filename: (req, file, cb) => {
            const timestamp = new Date().toISOString().replace(/[:.]/g, '-');
            const ext = path.extname(file.originalname);
            const name = path.basename(file.originalname, ext);
            cb(null, `${name}_${timestamp}${ext}`);
        }
    });
    
    const upload = multer({ storage });
    
    // Serve upload page
    serverApp.get('/', (req, res) => {
        res.send(`,
<!DOCTYPE html>
<html>
<head>
    <meta charset="UTF-8">
    <meta name="viewport" content="width=device-width, initial-scale=1.0, maximum-scale=1.0, user-scalable=no">
    <meta name="apple-mobile-web-app-capable" content="yes">
    <title>AirBamin - Upload</title>
    <style>
        * { margin: 0; padding: 0; box-sizing: border-box; }
        body {
            font-family: -apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, sans-serif;
            background: linear-gradient(135deg, #667eea 0%, #764ba2 100%);
            min-height: 100vh;
            padding: 20px;
            display: flex;
            align-items: center;
            justify-content: center;
        }
        .container {
            background: white;
            padding: 30px;
            border-radius: 20px;
            box-shadow: 0 20px 60px rgba(0,0,0,0.3);
            max-width: 500px;
            width: 100%;
        }
        h1 {
            text-align: center;
            color: #333;
            margin-bottom: 10px;
            font-size: 28px;
        }
        .logo {
            text-align: center;
            font-size: 64px;
            margin-bottom: 20px;
        }
        .upload-area {
            border: 3px dashed #667eea;
            border-radius: 15px;
            padding: 40px 20px;
            text-align: center;
            background: #f8f9ff;
            margin: 25px 0;
            cursor: pointer;
            transition: all 0.3s;
        }
        .upload-area:hover { border-color: #764ba2; background: #f0f1ff; }
        .upload-area.dragover { border-color: #10b981; background: #d1fae5; }
        input[type="file"] { display: none; }
        .file-label {
            display: inline-block;
            padding: 15px 30px;
            background: linear-gradient(135deg, #667eea 0%, #764ba2 100%);
            color: white;
            border-radius: 12px;
            cursor: pointer;
            font-size: 16px;
            font-weight: 700;
            transition: all 0.3s;
        }
        .file-label:hover {
            transform: translateY(-2px);
            box-shadow: 0 10px 30px rgba(102, 126, 234, 0.5);
        }
        .upload-btn {
            width: 100%;
            padding: 18px;
            background: linear-gradient(135deg, #10b981 0%, #059669 100%);
            color: white;
            border: none;
            border-radius: 12px;
            font-size: 18px;
            font-weight: 800;
            cursor: pointer;
            margin-top: 20px;
            text-transform: uppercase;
            transition: all 0.3s;
        }
        .upload-btn:hover:not(:disabled) {
            transform: translateY(-2px);
            box-shadow: 0 10px 30px rgba(16, 185, 129, 0.5);
        }
        .upload-btn:disabled { background: #ccc; cursor: not-allowed; }
        .file-info {
            margin: 15px 0;
            padding: 15px;
            background: linear-gradient(135deg, #e0e7ff 0%, #ddd6fe 100%);
            border-radius: 12px;
            display: none;
            font-weight: 600;
        }
        .progress-container { margin: 20px 0; display: none; }
        .progress-wrapper {
            width: 100%;
            height: 40px;
            background: #e5e7eb;
            border-radius: 20px;
            overflow: hidden;
            position: relative;
        }
        .progress-bar {
            height: 100%;
            background: linear-gradient(90deg, #667eea 0%, #764ba2 100%);
            width: 0%;
            transition: width 0.2s linear;
            border-radius: 20px;
        }
        .progress-text {
            position: absolute;
            top: 50%;
            left: 50%;
            transform: translate(-50%, -50%);
            font-weight: 800;
            font-size: 16px;
            color: #333;
        }
        .status {
            text-align: center;
            margin-top: 20px;
            font-weight: 700;
            font-size: 16px;
            padding: 15px;
            border-radius: 12px;
            display: none;
        }
        .success { background: #d1fae5; color: #065f46; }
        .error { background: #fee2e2; color: #991b1b; }
    </style>
</head>
<body>
    <div class="container">
        <div class="logo">✈️</div>
        <h1>AirBamin</h1>
        <p style="text-align: center; color: #666; margin-bottom: 20px;">Ultra-Fast File Transfer</p>
        
        <form id="uploadForm" enctype="multipart/form-data">
            <div class="upload-area" id="uploadArea">
                <div style="font-size: 48px; margin-bottom: 10px;">📁</div>
                <label for="fileInput" class="file-label">
                    Select Files
                </label>
                <input type="file" id="fileInput" multiple>
            </div>
            
            <div class="file-info" id="fileInfo"></div>
            
            <div class="progress-container" id="progressContainer">
                <div class="progress-wrapper">
                    <div class="progress-bar" id="progressBar"></div>
                    <div class="progress-text" id="progressText">0%</div>
                </div>
            </div>
            
            <button type="submit" class="upload-btn" id="uploadBtn" disabled>
                Start Upload
            </button>
            
            <div class="status" id="status"></div>
        </form>
    </div>

    <script>
        const fileInput = document.getElementById('fileInput');
        const uploadArea = document.getElementById('uploadArea');
        const uploadBtn = document.getElementById('uploadBtn');
        const fileInfo = document.getElementById('fileInfo');
        const progressContainer = document.getElementById('progressContainer');
        const progressBar = document.getElementById('progressBar');
        const progressText = document.getElementById('progressText');
        const status = document.getElementById('status');

        uploadArea.addEventListener('dragover', (e) => {
            e.preventDefault();
            uploadArea.classList.add('dragover');
        });

        uploadArea.addEventListener('dragleave', () => {
            uploadArea.classList.remove('dragover');
        });

        uploadArea.addEventListener('drop', (e) => {
            e.preventDefault();
            uploadArea.classList.remove('dragover');
            fileInput.files = e.dataTransfer.files;
            handleFiles();
        });

        fileInput.addEventListener('change', handleFiles);

        function handleFiles() {
            const files = fileInput.files;
            if (files.length > 0) {
                let totalSize = 0;
                for (let i = 0; i < files.length; i++) {
                    totalSize += files[i].size;
                }
                
                const sizeMB = (totalSize / (1024*1024)).toFixed(2);
                fileInfo.innerHTML = `<strong>${files.length}</strong> file(s) | <strong>${sizeMB} MB</strong>`;
                fileInfo.style.display = 'block';
                uploadBtn.disabled = false;
            }
        }

        document.getElementById('uploadForm').addEventListener('submit', async function(e) {
            e.preventDefault();
            
            const files = fileInput.files;
            if (!files.length) return;
            
            uploadBtn.disabled = true;
            progressContainer.style.display = 'block';
            status.style.display = 'block';
            status.className = 'status';
            status.innerHTML = '⚡ Uploading...';
            
            let totalSize = 0;
            for (let i = 0; i < files.length; i++) totalSize += files[i].size;
            
            let uploaded = 0;
            
            for (let i = 0; i < files.length; i++) {
                const formData = new FormData();
                formData.append('file', files[i]);
                
                const xhr = new XMLHttpRequest();
                
                xhr.upload.addEventListener('progress', (e) => {
                    if (e.lengthComputable) {
                        const current = uploaded + e.loaded;
                        const percent = Math.round((current / totalSize) * 100);
                        progressBar.style.width = percent + '%';
                        progressText.textContent = percent + '%';
                    }
                });
                
                await new Promise((resolve) => {
                    xhr.onload = () => { 
                        uploaded += files[i].size; 
                        resolve(); 
                    };
                    xhr.onerror = () => resolve();
                    xhr.open('POST', '/upload');
                    xhr.send(formData);
                });
            }
            
            status.className = 'status success';
            status.innerHTML = '✅ Upload Complete!';
            
            setTimeout(() => {
                location.reload();
            }, 3000);
        });
    </script>
</body>
</html>
        `);
    });
    
    // Handle file upload
    serverApp.post('/upload', upload.single('file'), (req, res) => {
        console.log('File uploaded:', req.file.filename);
        res.json({ status: 'success', filename: req.file.filename });
    });
    
    serverInstance = serverApp.listen(PORT, '0.0.0.0', () => {
        console.log(`AirBamin server running on port ${PORT}`);
    });
}

// Create main window
function createWindow() {
    mainWindow = new BrowserWindow({
        width: 500,
        height: 700,
        resizable: false,
        webPreferences: {
            nodeIntegration: true,
            contextIsolation: false
        },
        icon: path.join(__dirname, 'icon.png')
    });

    const localIP = getLocalIP();
    const url = `http://${localIP}:${PORT}`;
    
    // Generate QR code
    QRCode.toDataURL(url, { width: 300 }, (err, qrDataUrl) => {
        const html = `
<!DOCTYPE html>
<html>
<head>
    <style>
        body {
            font-family: -apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, sans-serif;
            background: linear-gradient(135deg, #667eea 0%, #764ba2 100%);
            color: white;
            text-align: center;
            padding: 30px;
            margin: 0;
        }
        .logo { font-size: 72px; margin-bottom: 10px; }
        h1 { margin: 10px 0; font-size: 32px; }
        .qr-container {
            background: white;
            padding: 25px;
            border-radius: 20px;
            display: inline-block;
            margin: 20px 0;
            box-shadow: 0 10px 40px rgba(0,0,0,0.3);
        }
        .qr-code { width: 300px; height: 300px; }
        .info {
            background: rgba(255,255,255,0.2);
            padding: 20px;
            border-radius: 15px;
            margin-top: 20px;
            backdrop-filter: blur(10px);
        }
        .url { 
            font-size: 18px; 
            font-weight: 700; 
            margin: 10px 0;
            background: rgba(255,255,255,0.3);
            padding: 10px;
            border-radius: 8px;
        }
        .instruction {
            font-size: 14px;
            margin-top: 15px;
            line-height: 1.6;
        }
    </style>
</head>
<body>
    <div class="logo">✈️</div>
    <h1>AirBamin</h1>
    <p style="font-size: 16px; opacity: 0.9;">Scan with your iPhone</p>
    
    <div class="qr-container">
        <img src="${qrDataUrl}" class="qr-code" alt="QR Code">
    </div>
    
    <div class="info">
        <div class="url">${url}</div>
        <div class="instruction">
            📱 Open Camera app on iPhone<br>
            📷 Point at QR code<br>
            🌐 Tap notification to open<br>
            📤 Upload your files
        </div>
    </div>
    
    <div style="margin-top: 20px; font-size: 12px; opacity: 0.7;">
        Files will be saved to: Documents/AirBamin_Uploads
    </div>
</body>
</html>
        `;
        
        mainWindow.loadURL('data:text/html;charset=utf-8,' + encodeURIComponent(html));
    });

    mainWindow.on('closed', () => {
        mainWindow = null;
    });
}

// Create system tray
function createTray() {
    tray = new Tray(path.join(__dirname, 'icon.png'));
    const contextMenu = Menu.buildFromTemplate([
        { label: 'Show QR Code', click: () => { if (mainWindow) mainWindow.show(); } },
        { label: 'Open Upload Folder', click: () => { require('electron').shell.openPath(UPLOAD_FOLDER); } },
        { type: 'separator' },
        { label: 'Quit', click: () => { app.quit(); } }
    ]);
    tray.setContextMenu(contextMenu);
    tray.setToolTip('AirBamin - File Transfer');
}

// App ready
app.whenReady().then(() => {
    createServer();
    createWindow();
    createTray();
});

app.on('window-all-closed', () => {
    if (process.platform !== 'darwin') {
        // Keep running in background
    }
});

app.on('activate', () => {
    if (BrowserWindow.getAllWindows().length === 0) {
        createWindow();
    }
});

app.on('before-quit', () => {
    if (serverInstance) {
        serverInstance.close();
    }
});

