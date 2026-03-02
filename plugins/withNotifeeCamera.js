const { withAndroidManifest } = require("@expo/config-plugins");

/**
 * Expo config plugin to add the Notifee foreground service declaration
 * to AndroidManifest.xml for background camera access.
 */
const withNotifeeCamera = (config) => {
    return withAndroidManifest(config, (config) => {
        const androidManifest = config.modResults.manifest;
        const mainApplication = androidManifest.application[0];

        // Ensure we have a service array
        if (!mainApplication.service) {
            mainApplication.service = [];
        }

        // Check if our service is already there
        const hasService = mainApplication.service.some((s) => s.$["android:name"] === "app.notifee.core.ForegroundService");

        if (!hasService) {
            mainApplication.service.push({
                $: {
                    "android:name": "app.notifee.core.ForegroundService",
                    "android:foregroundServiceType": "camera",
                    "android:exported": "false",
                },
            });
            console.log("[withNotifeeCamera] Added Notifee foreground service to AndroidManifest.xml");
        } else {
            // Update existing service type if it's already there
            const service = mainApplication.service.find((s) => s.$["android:name"] === "app.notifee.core.ForegroundService");
            service.$["android:foregroundServiceType"] = "camera";
            console.log("[withNotifeeCamera] Updated Notifee foreground service type in AndroidManifest.xml");
        }

        return config;
    });
};

module.exports = withNotifeeCamera;
