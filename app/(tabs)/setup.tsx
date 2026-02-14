import { Button } from "@/components/button";
import { ThemedSafeAreaView } from "@/components/themed-safe-area-view";
import { ThemedScrollView } from "@/components/themed-scroll-view";
import { ThemedText } from "@/components/themed-text";
import { ThemedTextInput } from "@/components/themed-text-input";
import { ThemedView } from "@/components/themed-view";
import { IconSymbol } from "@/components/ui/icon-symbol";
import { useCamera } from "@/context/camera-context";
import api from "@/utilities/api";
import React, { useEffect, useState } from "react";
import { ActivityIndicator, Alert, RefreshControl, TouchableOpacity, View } from "react-native";

type CameraFormProps = {
    name: string;
    setName: (text: string) => void;
    password: string;
    setPassword: (text: string) => void;
    roomId: string;
    setRoomId: (text: string) => void;
    rooms: any[];
    handleSave: () => void;
    saving: boolean;
    isEditing: boolean;
};

const CameraForm = ({
    name,
    setName,
    password,
    setPassword,
    roomId,
    setRoomId,
    rooms,
    handleSave,
    saving,
    isEditing,
}: CameraFormProps) => {
    return (
        <View className="gap-4">
            <View>
                <ThemedText type="defaultSemiBold" className="mb-2">
                    Camera Name
                </ThemedText>
                <ThemedTextInput value={name} onChangeText={setName} placeholder="e.g. Living Room" />
            </View>

            <View>
                <ThemedText type="defaultSemiBold" className="mb-2">
                    Camera Password
                </ThemedText>
                <ThemedTextInput
                    value={password}
                    onChangeText={setPassword}
                    secureTextEntry
                    placeholder={isEditing ? "Leave blank to keep current" : "Required"}
                />
            </View>

            <View>
                <ThemedText type="defaultSemiBold" className="mb-2">
                    Assign to Room
                </ThemedText>
                <View className="flex-row flex-wrap gap-2">
                    {rooms.map((room) => (
                        <TouchableOpacity
                            key={room.id}
                            className={`rounded-xl border px-3 py-2 ${roomId === room.id ? "border-blue-500 bg-blue-500" : "border-gray-200 bg-white dark:border-gray-700 dark:bg-gray-800"}`}
                            onPress={() => setRoomId(room.id)}
                        >
                            <ThemedText
                                className={roomId === room.id ? "font-bold text-white" : "text-gray-800 dark:text-gray-200"}
                            >
                                {room.name}
                            </ThemedText>
                        </TouchableOpacity>
                    ))}
                </View>
            </View>

            <Button
                label={saving ? "Saving..." : isEditing ? "Update Camera" : "Create Camera"}
                onclick={handleSave}
                disabled={saving}
            />
        </View>
    );
};

export default function SetupScreen() {
    const { cameras, linkedCamera, deviceId, deviceName, refreshCameras, isLoading } = useCamera();
    const [isAddCameraMode, setIsAddCameraMode] = useState(false);
    const [expandedId, setExpandedId] = useState<string | null>(null);

    // Form State
    const [name, setName] = useState("");
    const [password, setPassword] = useState("");
    const [roomId, setRoomId] = useState("");
    const [rooms, setRooms] = useState<any[]>([]);

    const [saving, setSaving] = useState(false);

    useEffect(() => {
        fetchRooms();
    }, []);

    // Handle entering Add Mode
    useEffect(() => {
        if (isAddCameraMode) {
            setExpandedId(null);
            setName("");
            setPassword("");
            setRoomId("");
        }
    }, [isAddCameraMode]);

    // Handle expanding a camera (Edit Mode)
    useEffect(() => {
        if (expandedId) {
            setIsAddCameraMode(false);
            const cam = cameras.find((c) => c.id === expandedId);
            if (cam) {
                setName(cam.name);
                setPassword(""); // Leave blank unless changing
                setRoomId(cam.roomId || "");
            }
        }
    }, [expandedId, cameras]);

    const fetchRooms = async () => {
        try {
            const res = await api.get("/rooms");
            setRooms(res.data);
        } catch (error) {
            console.error("Failed to fetch rooms", error);
        }
    };

    const handleAdd = async () => {
        if (!name || (!password && isAddCameraMode)) {
            Alert.alert("Error", "Please fill in all required fields");
            return;
        }

        setSaving(true);
        try {
            const payload: any = { name, roomId: roomId || null };
            if (password) payload.password = password;

            // Creating new
            const shouldLink = !linkedCamera;
            const createPayload = {
                ...payload,
                deviceId: shouldLink ? deviceId : null,
                deviceName: shouldLink ? deviceName : null,
            };

            await api.post("/cameras", createPayload);
            Alert.alert("Success", "Camera created successfully");
            setIsAddCameraMode(false);
            await refreshCameras();
        } catch (error: any) {
            if (error.response?.status === 409 && error.response?.data?.code === "DEVICE_LINKED") {
                // Handle Device Collision on Create
                Alert.alert(
                    "Device Already Linked",
                    `This device is already linked to "${error.response.data.existingCameraName}". Do you want to overwrite it and link to this new camera?`,
                    [
                        { text: "Cancel", style: "cancel" },
                        {
                            text: "Overwrite",
                            onPress: async () => {
                                try {
                                    const shouldLink = !linkedCamera;
                                    const retryPayload = {
                                        name,
                                        roomId: roomId || null,
                                        password,
                                        deviceId: shouldLink ? deviceId : null,
                                        deviceName: shouldLink ? deviceName : null,
                                        overwrite: true,
                                    };

                                    await api.post("/cameras", retryPayload);
                                    Alert.alert("Success", "Camera created and device linked");
                                    setIsAddCameraMode(false);
                                    await refreshCameras();
                                } catch (retryError: any) {
                                    Alert.alert("Error", retryError.response?.data?.error || "Failed to create camera");
                                }
                            },
                        },
                    ],
                );
            } else {
                Alert.alert("Error", error.response?.data?.error || "Failed to create camera");
                console.error("Create camera error:", error);
            }
        } finally {
            setSaving(false);
        }
    };

    const handleUpdate = async () => {
        if (!expandedId) return;

        setSaving(true);
        try {
            const payload: any = { name, roomId };
            if (password) payload.password = password;

            await api.put(`/cameras/${expandedId}`, payload);
            Alert.alert("Success", "Camera settings updated");
            setExpandedId(null);
            await refreshCameras();
        } catch (error: any) {
            Alert.alert("Error", error.response?.data?.error || "Failed to update camera");
            console.error("Update camera error:", error);
        } finally {
            setSaving(false);
        }
    };

    const handleLink = async (cam: any) => {
        try {
            await api.post("/cameras/link-device", {
                cameraId: cam.id,
                deviceId,
                deviceName,
            });
            Alert.alert("Success", "Device linked to camera");
            await refreshCameras();
        } catch (error: any) {
            if (error.response?.status === 409 && error.response?.data?.code === "DEVICE_LINKED") {
                Alert.alert(
                    "Device Already Linked",
                    `This device is already linked to "${error.response.data.existingCameraName}". Do you want to overwrite it?`,
                    [
                        { text: "Cancel", style: "cancel" },
                        {
                            text: "Overwrite",
                            onPress: async () => {
                                try {
                                    await api.post("/cameras/link-device", {
                                        cameraId: cam.id,
                                        deviceId,
                                        deviceName,
                                        overwrite: true,
                                    });
                                    Alert.alert("Success", "Device linked to new camera");
                                    await refreshCameras();
                                } catch (retryError: any) {
                                    Alert.alert("Error", retryError.response?.data?.error || "Failed to link");
                                }
                            },
                        },
                    ],
                );
            } else {
                Alert.alert("Error", error.response?.data?.error || "Failed to link");
            }
        }
    };

    const handleUnlink = async (cam: any) => {
        try {
            await api.post("/cameras/unlink-device", { cameraId: cam.id });
            Alert.alert("Success", "Device unlinked");
            await refreshCameras();
        } catch (error: any) {
            Alert.alert("Error", error.response?.data?.error || "Failed to unlink");
        }
    };

    const handleDelete = async (cam: any) => {
        Alert.alert("Delete Camera", "Are you sure?", [
            { text: "Cancel", style: "cancel" },
            {
                text: "Delete",
                style: "destructive",
                onPress: async () => {
                    try {
                        await api.delete(`/cameras/${cam.id}`);
                        await refreshCameras();
                    } catch (error) {
                        Alert.alert("Error", "Failed to delete");
                    }
                },
            },
        ]);
    };

    if (isLoading) {
        return (
            <ThemedView className="flex-1 items-center justify-center">
                <ActivityIndicator size="large" color="#007AFF" />
            </ThemedView>
        );
    }

    return (
        <ThemedSafeAreaView className="flex-1">
            <ThemedScrollView
                contentContainerStyle={{ flexGrow: 1, padding: 20 }}
                refreshControl={<RefreshControl refreshing={isLoading} onRefresh={refreshCameras} />}
            >
                <View className="mb-5 flex-row items-center justify-between">
                    <ThemedText type="title">Camera Manager</ThemedText>
                    <TouchableOpacity
                        onPress={() => setIsAddCameraMode(!isAddCameraMode)}
                        className={`rounded-full p-2 ${isAddCameraMode ? "bg-red-100" : "bg-blue-100"}`}
                    >
                        <IconSymbol
                            name={isAddCameraMode ? "close" : "add"}
                            size={24}
                            color={isAddCameraMode ? "red" : "#007AFF"}
                        />
                    </TouchableOpacity>
                </View>

                {/* --- ADD CAMERA SECTION --- */}
                {isAddCameraMode && (
                    <View className="mb-8 rounded-xl bg-gray-50 p-5 dark:bg-gray-900 border border-gray-200 dark:border-gray-800">
                        <ThemedText type="subtitle" className="mb-4">
                            Add New Camera
                        </ThemedText>
                        <CameraForm
                            name={name}
                            setName={setName}
                            password={password}
                            setPassword={setPassword}
                            roomId={roomId}
                            setRoomId={setRoomId}
                            rooms={rooms}
                            handleSave={handleAdd}
                            saving={saving}
                            isEditing={false}
                        />
                    </View>
                )}

                {/* --- CAMERA LIST --- */}
                <View className="gap-3">
                    {cameras.map((cam) => {
                        const isLinked = cam.deviceId === deviceId;
                        const isExpanded = expandedId === cam.id;

                        return (
                            <View
                                key={cam.id}
                                className={`overflow-hidden rounded-xl border ${isLinked ? "border-blue-500 bg-blue-50/50 dark:border-blue-400 dark:bg-blue-900/10" : "border-gray-200 bg-white dark:border-gray-800 dark:bg-gray-900"}`}
                            >
                                <TouchableOpacity
                                    onPress={() => setExpandedId(isExpanded ? null : cam.id)}
                                    className="flex-row items-center justify-between p-4"
                                >
                                    <View className="flex-row items-center gap-3">
                                        <View
                                            className={`h-2 w-2 rounded-full ${cam.isOnline ? "bg-green-500" : "bg-gray-300"}`}
                                        />
                                        <View>
                                            <ThemedText
                                                type="defaultSemiBold"
                                                className={isLinked ? "text-blue-700 dark:text-blue-300" : ""}
                                            >
                                                {cam.name}
                                            </ThemedText>
                                            <ThemedText className="text-xs text-gray-500">
                                                {isLinked ? "This Device" : cam.deviceName || "No Device Linked"}
                                            </ThemedText>
                                        </View>
                                    </View>
                                    <IconSymbol name={isExpanded ? "expand-less" : "expand-more"} size={20} color="#999" />
                                </TouchableOpacity>

                                {isExpanded && (
                                    <View className="border-t border-gray-100 bg-gray-50 p-4 dark:border-gray-800 dark:bg-black/20">
                                        {/* Actions Bar */}
                                        <View className="flex-row justify-end gap-2 mb-4">
                                            {!isLinked ? (
                                                <TouchableOpacity
                                                    onPress={() => handleLink(cam)}
                                                    className="flex-row items-center gap-2 rounded-lg bg-blue-500 px-3 py-2"
                                                >
                                                    <IconSymbol name="link" size={16} color="white" />
                                                    <ThemedText className="text-white font-medium text-xs">
                                                        Link to this device
                                                    </ThemedText>
                                                </TouchableOpacity>
                                            ) : (
                                                <TouchableOpacity
                                                    onPress={() => handleUnlink(cam)}
                                                    className="flex-row items-center gap-2 rounded-lg bg-orange-100 px-3 py-2"
                                                >
                                                    <IconSymbol name="link-off" size={16} color="orange" />
                                                    <ThemedText className="text-orange-700 font-medium text-xs">
                                                        Unlink
                                                    </ThemedText>
                                                </TouchableOpacity>
                                            )}

                                            <TouchableOpacity
                                                onPress={() => handleDelete(cam)}
                                                className="rounded-lg light:bg-red-100 dark:bg-red-900 px-3 py-2"
                                            >
                                                <IconSymbol name="delete" size={16} color="red" />
                                            </TouchableOpacity>
                                        </View>

                                        <ThemedText type="defaultSemiBold" className="mb-4 text-gray-500">
                                            Edit Settings
                                        </ThemedText>
                                        <CameraForm
                                            name={name}
                                            setName={setName}
                                            password={password}
                                            setPassword={setPassword}
                                            roomId={roomId}
                                            setRoomId={setRoomId}
                                            rooms={rooms}
                                            handleSave={handleUpdate}
                                            saving={saving}
                                            isEditing={true}
                                        />
                                    </View>
                                )}
                            </View>
                        );
                    })}
                </View>
            </ThemedScrollView>
        </ThemedSafeAreaView>
    );
}
