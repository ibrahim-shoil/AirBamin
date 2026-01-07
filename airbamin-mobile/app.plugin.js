const { withMainApplication, withAndroidManifest, AndroidConfig, withXcodeProject, IOSConfig, withDangerousMod } = require('@expo/config-plugins');
const fs = require('fs');
const path = require('path');
const { addBuildSourceFileToGroup } = require('@expo/config-plugins/build/ios/utils/Xcodeproj');

const withScreenCaptureManifest = (config) => {
    return withAndroidManifest(config, async (config) => {
        const mainApplication = AndroidConfig.Manifest.getMainApplicationOrThrow(config.modResults);

        const serviceName = 'com.airbamin.ScreenCaptureService';
        const mediaProjectionPermission = 'android.permission.FOREGROUND_SERVICE_MEDIA_PROJECTION';

        // Allow HTTP cleartext (local network) traffic
        mainApplication.$['android:usesCleartextTraffic'] = 'true';

        // Ensure foreground service permission for Android 14+
        const usesPermissions = config.modResults.manifest['uses-permission'] || [];
        const hasPermission = usesPermissions.some(
            (item) => item.$['android:name'] === mediaProjectionPermission
        );

        if (!hasPermission) {
            usesPermissions.push({
                $: { 'android:name': mediaProjectionPermission },
            });
            config.modResults.manifest['uses-permission'] = usesPermissions;
        }

        // Check if service already exists
        const service = mainApplication.service?.find(s => s.$['android:name'] === serviceName);

        if (!service) {
            mainApplication.service = mainApplication.service || [];
            mainApplication.service.push({
                $: {
                    'android:name': serviceName,
                    'android:enabled': 'true',
                    'android:exported': 'false',
                    'android:foregroundServiceType': 'mediaProjection',
                },
            });
        }

        return config;
    });
};

const withScreenCaptureMainApplication = (config) => {
    return withMainApplication(config, (config) => {
        const { modResults } = config;
        const { contents } = modResults;

        // Add import for ScreenCapturePackage
        if (!contents.includes('com.airbamin.ScreenCapturePackage')) {
            const importStatement = 'import com.airbamin.ScreenCapturePackage';

            // Find the last import statement
            const lastImportIndex = contents.lastIndexOf('import ');
            const endOfLastImport = contents.indexOf('\n', lastImportIndex);

            // Insert our import after the last import
            modResults.contents =
                contents.slice(0, endOfLastImport + 1) +
                importStatement + '\n' +
                contents.slice(endOfLastImport + 1);
        }

        // Add package to getPackages() method
        if (!contents.includes('ScreenCapturePackage()')) {
            const packagesMethod = 'override fun getPackages(): List<ReactPackage> =';
            const packagesIndex = modResults.contents.indexOf(packagesMethod);

            if (packagesIndex !== -1) {
                // Find the packageList.add or return statement
                const addPackagePattern = /PackageList\(this\)\.packages/;
                const match = modResults.contents.match(addPackagePattern);

                if (match) {
                    const insertPoint = modResults.contents.indexOf(match[0]) + match[0].length;
                    modResults.contents =
                        modResults.contents.slice(0, insertPoint) +
                        '.also { it.add(ScreenCapturePackage()) }' +
                        modResults.contents.slice(insertPoint);
                }
            }
        }

        return config;
    });
};

const withScreenCaptureAndroidSources = (config) => {
    return withDangerousMod(config, [
        'android',
        async (config) => {
            const sourceDir = path.join(config.modRequest.projectRoot, 'native-modules', 'android');
            const destDir = path.join(
                config.modRequest.platformProjectRoot,
                'app',
                'src',
                'main',
                'java',
                'com',
                'airbamin'
            );

            if (!fs.existsSync(sourceDir)) {
                console.warn(`[ScreenCapture] Android source dir not found: ${sourceDir}`);
                return config;
            }

            fs.mkdirSync(destDir, { recursive: true });

            ['ScreenCaptureModule.java', 'ScreenCapturePackage.java', 'ScreenCaptureService.java'].forEach(file => {
                const from = path.join(sourceDir, file);
                const to = path.join(destDir, file);

                if (fs.existsSync(from)) {
                    console.log(`[ScreenCapture] Copying ${from} -> ${to}`);
                    fs.copyFileSync(from, to);
                } else {
                    console.warn(`[ScreenCapture] Source file missing: ${from}`);
                }
            });

            return config;
        }
    ]);
};

const withScreenCaptureIos = (config) => {
    return withXcodeProject(config, (config) => {
        const xcodeProject = config.modResults;
        // Fallback for projectName if undefined
        const projectName = config.modRequest.projectName || config.name || 'airbamin-mobile';
        const projectRoot = config.modRequest.projectRoot;

        console.log(`[ScreenCapture] Project Name: ${projectName}`);
        console.log(`[ScreenCapture] Project Root: ${projectRoot}`);

        // Source files
        const sourceFiles = [
            'ScreenCaptureModule.swift',
            'ScreenCaptureModule.m'
        ];

        const sourceDir = path.join(projectRoot, 'native-modules', 'ios');
        const destDir = path.join(config.modRequest.platformProjectRoot, projectName);

        console.log(`[ScreenCapture] Source Dir: ${sourceDir}`);
        console.log(`[ScreenCapture] Dest Dir: ${destDir}`);

        // Ensure destination directory exists (it should)
        if (!fs.existsSync(destDir)) {
            console.log(`[ScreenCapture] Creating destination directory: ${destDir}`);
            fs.mkdirSync(destDir, { recursive: true });
        }

        // Copy files and add to Xcode project
        sourceFiles.forEach(file => {
            const sourceFile = path.join(sourceDir, file);
            const destFile = path.join(destDir, file);

            if (fs.existsSync(sourceFile)) {
                console.log(`[ScreenCapture] Copying ${sourceFile} to ${destFile}`);
                fs.copyFileSync(sourceFile, destFile);

                // Add file to Xcode project using helper
                // The 'file' argument for addBuildSourceFileToGroup should be relative to the project root
                // Since we copied it to the project name folder, the path is projectName/file
                const relativePath = path.join(projectName, file);
                console.log(`[ScreenCapture] Adding to Xcode project: ${relativePath}`);

                try {
                    addBuildSourceFileToGroup({
                        project: xcodeProject,
                        isRoot: true,
                        file: relativePath, // Pass the relative path including the group/folder
                        groupName: projectName,
                    });
                } catch (error) {
                    console.error(`[ScreenCapture] Error adding ${file} to Xcode project:`, error);
                }

            } else {
                console.warn(`[ScreenCapture] Source file not found: ${sourceFile}`);
            }
        });

        return config;
    });
};

const withPodfileFix = (config) => {
    return withDangerousMod(config, [
        'ios',
        async (config) => {
            const podfilePath = path.join(config.modRequest.platformProjectRoot, 'Podfile');
            if (fs.existsSync(podfilePath)) {
                let podfileContent = fs.readFileSync(podfilePath, 'utf8');

                const fixCode = `
    installer.pods_project.targets.each do |target|
      target.build_configurations.each do |config|
        config.build_settings['CLANG_ALLOW_NON_MODULAR_INCLUDES_IN_FRAMEWORK_MODULES'] = 'YES'
      end
    end
`;

                if (podfileContent.includes('post_install do |installer|')) {
                    console.log('[ScreenCapture] Injecting Podfile fix into existing post_install');
                    podfileContent = podfileContent.replace(
                        'post_install do |installer|',
                        'post_install do |installer|' + fixCode
                    );
                    fs.writeFileSync(podfilePath, podfileContent);
                } else {
                    console.log('[ScreenCapture] Appending Podfile fix with new post_install');
                    podfileContent += `
post_install do |installer|
${fixCode}
end
`;
                    fs.writeFileSync(podfilePath, podfileContent);
                }
            } else {
                console.warn('[ScreenCapture] Podfile not found at ' + podfilePath);
            }
            return config;
        }
    ]);
};

// TEMPORARILY DISABLED - Screen mirroring feature coming in future release
// Uncomment when ready to enable screen mirroring
// module.exports = function withScreenCaptureModule(config) {
//     config = withScreenCaptureManifest(config);
//     config = withScreenCaptureMainApplication(config);
//     config = withScreenCaptureAndroidSources(config);
//     config = withScreenCaptureIos(config);
//     config = withPodfileFix(config);
//     return config;
// };

// Export empty plugin that does nothing (required for module to be valid)
module.exports = function withScreenCaptureModule(config) {
    // Plugin disabled - screen mirroring coming soon
    return config;
};
