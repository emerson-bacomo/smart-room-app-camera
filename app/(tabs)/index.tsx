import Broadcaster from "@/components/broadcaster";
import { ThemedText } from "@/components/themed-text";
import { ThemedView } from "@/components/themed-view";
import { useCamera } from "@/context/camera-context";
import { useAuth } from "@/hooks/use-auth";
import { Link, Redirect } from "expo-router";
import React from "react";
import { ActivityIndicator, RefreshControl, ScrollView, Text, TouchableOpacity, View } from "react-native";

export default function CameraScreen() {
    const { user, loading: authLoading } = useAuth();
    const { linkedCamera, refreshCameras, isLoading } = useCamera();

    if (authLoading)
        return (
            <View className="flex-1 justify-center items-center p-5">
                <ActivityIndicator />
            </View>
        );
    if (!user) return <Redirect href="/(auth)/login" />;

    return (
        <ScrollView
            className="flex-1 bg-black"
            contentContainerStyle={{ flexGrow: 1 }}
            refreshControl={<RefreshControl refreshing={isLoading} onRefresh={refreshCameras} />}
        >
            <ThemedView className="flex-row justify-between items-center px-5 pt-[60px] pb-5 bg-white">
                <ThemedView className="flex-1 flex-row items-center gap-2.5">
                    <ThemedText className="text-lg font-bold">Broadcasting</ThemedText>
                </ThemedView>
            </ThemedView>

            <View className="flex-1 min-h-[400px]">
                {linkedCamera ? (
                    <Broadcaster key={linkedCamera.id} cameraId={linkedCamera.id} />
                ) : (
                    <View className="flex-1 justify-center items-center p-5">
                        <Text className="text-white text-lg font-bold">Device not linked.</Text>
                        <Text className="text-[#aaa] mt-2.5 text-center">Go to Setup to register or link this device.</Text>
                        <Link href="/(tabs)/setup" asChild>
                            <TouchableOpacity className="mt-5 bg-[#007AFF] px-5 py-2.5 rounded-lg">
                                <Text className="text-white font-bold">Go to Setup</Text>
                            </TouchableOpacity>
                        </Link>
                    </View>
                )}
            </View>
        </ScrollView>
    );
}
