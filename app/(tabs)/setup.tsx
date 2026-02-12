import { useAuth } from "@/hooks/use-auth";
import api from "@/utilities/api";
import React, { useEffect, useState } from "react";
import { ActivityIndicator, Alert, ScrollView, StyleSheet, Text, TextInput, TouchableOpacity, View } from "react-native";

export default function SetupScreen() {
    const [name, setName] = useState("");
    const [password, setPassword] = useState("");
    const [roomId, setRoomId] = useState("");
    const [rooms, setRooms] = useState<any[]>([]);
    const [camera, setCamera] = useState<any>(null);
    const [loading, setLoading] = useState(true);
    const [saving, setSaving] = useState(false);
    const { user } = useAuth();

    useEffect(() => {
        fetchInitialData();
    }, []);

    const fetchInitialData = async () => {
        setLoading(true);
        try {
            // Fetch user's rooms
            const roomsRes = await api.get("/rooms");
            setRooms(roomsRes.data);

            // Fetch linked cameras to see if this one is already registered
            // For simplicity, we assume one camera per app instance for now
            const camerasRes = await api.get("/cameras");
            if (camerasRes.data.length > 0) {
                const cam = camerasRes.data[0];
                setCamera(cam);
                setName(cam.name);
                setRoomId(cam.roomId);
            }
        } catch (error) {
            console.error(error);
        } finally {
            setLoading(false);
        }
    };

    const handleSave = async () => {
        if (!name || !password || !roomId) {
            Alert.alert("Error", "Please fill in all fields");
            return;
        }

        setSaving(true);
        try {
            const payload = { name, password, roomId };
            if (camera) {
                // Update existing
                await api.patch(`/cameras/${camera.id}`, payload);
                Alert.alert("Success", "Camera settings updated");
            } else {
                // Create new
                const res = await api.post("/cameras", payload);
                setCamera(res.data);
                Alert.alert("Success", "Camera registered successfully");
            }
        } catch (error: any) {
            console.error(error);
            Alert.alert("Error", error.response?.data?.error || "Failed to save settings");
        } finally {
            setSaving(false);
        }
    };

    if (loading) {
        return (
            <View style={styles.center}>
                <ActivityIndicator size="large" color="#007AFF" />
            </View>
        );
    }

    return (
        <ScrollView contentContainerStyle={styles.container}>
            <Text style={styles.title}>Camera Setup</Text>

            {camera && (
                <View style={styles.infoBox}>
                    <Text style={styles.infoLabel}>Camera UUID:</Text>
                    <Text style={styles.infoValue}>{camera.id}</Text>
                </View>
            )}

            <Text style={styles.label}>Camera Name</Text>
            <TextInput
                style={styles.input}
                value={name}
                onChangeText={setName}
                placeholder="Living Room Cam"
                placeholderTextColor="#666"
            />

            <Text style={styles.label}>Camera Password</Text>
            <TextInput
                style={styles.input}
                value={password}
                onChangeText={setPassword}
                secureTextEntry
                placeholder="Enter password"
                placeholderTextColor="#666"
            />

            <Text style={styles.label}>Assign to Room</Text>
            <View style={styles.roomList}>
                {rooms.map((room) => (
                    <TouchableOpacity
                        key={room.id}
                        style={[styles.roomItem, roomId === room.id && styles.roomItemActive]}
                        onPress={() => setRoomId(room.id)}
                    >
                        <Text style={[styles.roomText, roomId === room.id && styles.roomTextActive]}>{room.name}</Text>
                    </TouchableOpacity>
                ))}
            </View>

            <TouchableOpacity style={styles.button} onPress={handleSave} disabled={saving}>
                {saving ? <ActivityIndicator color="#fff" /> : <Text style={styles.buttonText}>Save Settings</Text>}
            </TouchableOpacity>
        </ScrollView>
    );
}

const styles = StyleSheet.create({
    container: { padding: 20, backgroundColor: "#fff", flexGrow: 1 },
    center: { flex: 1, justifyContent: "center", alignItems: "center" },
    title: { fontSize: 24, fontWeight: "bold", marginBottom: 20 },
    label: { fontSize: 16, fontWeight: "600", marginBottom: 8, marginTop: 15 },
    input: {
        borderWidth: 1,
        borderColor: "#ddd",
        padding: 12,
        borderRadius: 8,
        fontSize: 16,
    },
    infoBox: {
        backgroundColor: "#f0f0f0",
        padding: 15,
        borderRadius: 8,
        marginBottom: 10,
    },
    infoLabel: { fontSize: 14, color: "#666" },
    infoValue: { fontSize: 16, fontWeight: "bold", color: "#333" },
    roomList: { flexDirection: "row", flexWrap: "wrap", gap: 10, marginBottom: 20 },
    roomItem: {
        paddingHorizontal: 15,
        paddingVertical: 10,
        borderRadius: 20,
        backgroundColor: "#f0f0f0",
        borderWidth: 1,
        borderColor: "#ddd",
    },
    roomItemActive: { backgroundColor: "#007AFF", borderColor: "#007AFF" },
    roomText: { color: "#333" },
    roomTextActive: { color: "#fff", fontWeight: "bold" },
    button: {
        backgroundColor: "#007AFF",
        padding: 15,
        borderRadius: 8,
        alignItems: "center",
        marginTop: 20,
    },
    buttonText: { color: "#fff", fontWeight: "bold", fontSize: 16 },
});
