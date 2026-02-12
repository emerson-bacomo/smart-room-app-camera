import Broadcaster from "@/components/broadcaster";
import { IconSymbol } from "@/components/ui/icon-symbol";
import { useAuth } from "@/hooks/use-auth";
import api from "@/utilities/api";
import { Picker } from "@react-native-picker/picker";
import * as Clipboard from "expo-clipboard";
import { Redirect } from "expo-router";
import React, { useEffect, useState } from "react";
import { ActivityIndicator, Alert, Modal, StyleSheet, Text, TouchableOpacity, View } from "react-native";
import QRCode from "react-native-qrcode-svg";

export default function CameraScreen() {
    const { user, loading: authLoading } = useAuth();
    const [shareModalVisible, setShareModalVisible] = useState(false);
    const [cameras, setCameras] = useState<any[]>([]);
    const [selectedCameraId, setSelectedCameraId] = useState<string>("");
    const [loading, setLoading] = useState(true);
    const [claimUrl, setClaimUrl] = useState("");
    const [broadcasterKey, setBroadcasterKey] = useState(0); // Used to force-remount Broadcaster

    useEffect(() => {
        if (user) {
            fetchCameras();
        }
    }, [user]);

    const fetchCameras = async () => {
        try {
            const res = await api.get("/cameras");
            setCameras(res.data);
            if (res.data.length > 0) {
                setSelectedCameraId(res.data[0].id);
            }
        } catch (error) {
            console.error("Failed to fetch cameras", error);
        } finally {
            setLoading(false);
        }
    };

    const handleCameraChange = (cameraId: string) => {
        if (cameraId === selectedCameraId) return;

        Alert.alert(
            "Change Camera",
            "Broadcasting will restart for the new camera. Remember to update the viewed camera in the main app.",
            [
                { text: "Cancel", style: "cancel" },
                {
                    text: "Confirm",
                    onPress: () => {
                        setSelectedCameraId(cameraId);
                        setBroadcasterKey((prev) => prev + 1); // Reset WebRTC by remounting
                    },
                },
            ],
        );
    };

    const handleShare = async () => {
        if (!selectedCameraId) {
            Alert.alert("Error", "Please setup your camera first in the Setup tab.");
            return;
        }

        try {
            const res = await api.get(`/cameras/share/${selectedCameraId}`);
            setClaimUrl(res.data.claimUrl);
            setShareModalVisible(true);
        } catch (error) {
            Alert.alert("Error", "Failed to generate share link");
        }
    };

    const copyToClipboard = async () => {
        await Clipboard.setStringAsync(claimUrl);
        Alert.alert("Success", "Link copied to clipboard");
    };

    const selectedCamera = cameras.find((c) => c.id === selectedCameraId);

    if (authLoading)
        return (
            <View style={styles.center}>
                <ActivityIndicator />
            </View>
        );
    if (!user) return <Redirect href="/(auth)/login" />;

    return (
        <View style={styles.container}>
            <View style={styles.header}>
                <View style={styles.headerLeft}>
                    <Text style={styles.headerTitle}>Broadcasting</Text>
                    {cameras.length > 1 && (
                        <View style={styles.pickerContainer}>
                            <Picker
                                selectedValue={selectedCameraId}
                                onValueChange={(itemValue) => handleCameraChange(itemValue)}
                                style={styles.picker}
                                mode="dropdown"
                            >
                                {cameras.map((cam) => (
                                    <Picker.Item key={cam.id} label={cam.name} value={cam.id} />
                                ))}
                            </Picker>
                        </View>
                    )}
                </View>
                <TouchableOpacity onPress={handleShare} style={styles.shareButton}>
                    <IconSymbol name="square.and.arrow.up" size={24} color="#007AFF" />
                </TouchableOpacity>
            </View>

            <View style={styles.feedContainer}>
                {selectedCameraId ? (
                    <Broadcaster key={broadcasterKey} cameraId={selectedCameraId} />
                ) : (
                    <View style={styles.center}>
                        <Text style={styles.noCameraText}>No camera registered.</Text>
                        <Text style={styles.noCameraSubtext}>Go to Setup to register this camera.</Text>
                    </View>
                )}
            </View>

            <Modal
                animationType="slide"
                transparent={true}
                visible={shareModalVisible}
                onRequestClose={() => setShareModalVisible(false)}
            >
                <View style={styles.modalOverlay}>
                    <View style={styles.modalContent}>
                        <Text style={styles.modalTitle}>Share Camera</Text>

                        <View style={styles.qrContainer}>
                            {claimUrl ? <QRCode value={claimUrl} size={200} /> : <ActivityIndicator />}
                        </View>

                        <Text style={styles.claimUrlText} numberOfLines={1}>
                            {claimUrl}
                        </Text>

                        <TouchableOpacity style={styles.copyButton} onPress={copyToClipboard}>
                            <IconSymbol name="doc.on.doc" size={20} color="#fff" />
                            <Text style={styles.copyButtonText}>Copy Claim Link</Text>
                        </TouchableOpacity>

                        <TouchableOpacity style={styles.closeButton} onPress={() => setShareModalVisible(false)}>
                            <Text style={styles.closeButtonText}>Close</Text>
                        </TouchableOpacity>
                    </View>
                </View>
            </Modal>
        </View>
    );
}

const styles = StyleSheet.create({
    container: { flex: 1, backgroundColor: "#000" },
    center: { flex: 1, justifyContent: "center", alignItems: "center" },
    header: {
        flexDirection: "row",
        justifyContent: "space-between",
        alignItems: "center",
        paddingHorizontal: 20,
        paddingTop: 60,
        paddingBottom: 20,
        backgroundColor: "#fff",
    },
    headerLeft: { flex: 1, flexDirection: "row", alignItems: "center", gap: 10 },
    headerTitle: { fontSize: 18, fontWeight: "bold" },
    pickerContainer: {
        backgroundColor: "#f0f0f0",
        borderRadius: 8,
        height: 40,
        width: 150,
        justifyContent: "center",
    },
    picker: {
        height: 40,
        width: "150%",
        marginLeft: -10, // Adjust for picker padding
    },
    shareButton: { padding: 5 },
    feedContainer: { flex: 1 },
    noCameraText: { color: "#fff", fontSize: 18, fontWeight: "bold" },
    noCameraSubtext: { color: "#aaa", marginTop: 10 },
    modalOverlay: {
        flex: 1,
        justifyContent: "center",
        alignItems: "center",
        backgroundColor: "rgba(0,0,0,0.5)",
    },
    modalContent: {
        width: "85%",
        backgroundColor: "#fff",
        borderRadius: 20,
        padding: 30,
        alignItems: "center",
        elevation: 5,
    },
    modalTitle: { fontSize: 22, fontWeight: "bold", marginBottom: 20 },
    qrContainer: { marginBottom: 20, padding: 10, backgroundColor: "#fff" },
    claimUrlText: { color: "#666", fontSize: 12, marginBottom: 20 },
    copyButton: {
        flexDirection: "row",
        backgroundColor: "#007AFF",
        paddingVertical: 12,
        paddingHorizontal: 20,
        borderRadius: 10,
        alignItems: "center",
        gap: 10,
        marginBottom: 10,
        width: "100%",
        justifyContent: "center",
    },
    copyButtonText: { color: "#fff", fontWeight: "bold" },
    closeButton: { padding: 10, marginTop: 10 },
    closeButtonText: { color: "#666", fontWeight: "600" },
});
