import { AppModal, AppModalRef } from "@/components/app-modal";
import Broadcaster, { Viewer } from "@/components/broadcaster";
import { ThemedText } from "@/components/themed-text";
import { ThemedView } from "@/components/themed-view";
import { IconSymbol } from "@/components/ui/icon-symbol";
import { useCamera } from "@/context/camera-context";
import { useTheme } from "@/context/theme-context";
import { useAuth } from "@/hooks/use-auth";
import { Link, Redirect } from "expo-router";
import React, { useRef, useState } from "react";
import { ActivityIndicator, Image, RefreshControl, ScrollView, Text, TouchableOpacity, View } from "react-native";

export default function CameraScreen() {
    const { user, loading: authLoading } = useAuth();
    const { linkedCamera, refreshCameras, isLoading } = useCamera();
    const { colorScheme } = useTheme();

    const [viewers, setViewers] = useState<Viewer[]>([]);
    const viewerModalRef = useRef<AppModalRef>(null);

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

                <TouchableOpacity className="flex-row items-center gap-1.5" onPress={() => viewerModalRef.current?.open()}>
                    <IconSymbol name="people" size={24} color={colorScheme === "dark" ? "#fff" : "#000"} />
                    <ThemedText className="text-base font-bold">{viewers.length}</ThemedText>
                </TouchableOpacity>
            </ThemedView>

            <View className="flex-1 min-h-[400px]">
                {linkedCamera ? (
                    <Broadcaster key={linkedCamera.id} cameraId={linkedCamera.id} onViewersChange={setViewers} />
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

            <AppModal ref={viewerModalRef} title="Viewers" footerType="CLOSE">
                <View className="max-h-[300px]">
                    <ScrollView>
                        {viewers.length > 0 ? (
                            viewers.map((viewer) => (
                                <View key={viewer.id} className="flex-row items-center gap-3 mb-3">
                                    {viewer.avatar ? (
                                        <Image source={{ uri: viewer.avatar }} className="w-10 h-10 rounded-full bg-gray-200" />
                                    ) : (
                                        <View className="w-10 h-10 rounded-full bg-gray-300 items-center justify-center">
                                            <IconSymbol name="person" size={24} color="#fff" />
                                        </View>
                                    )}
                                    <ThemedText className="font-medium text-base">{viewer.name || "Anonymous User"}</ThemedText>
                                </View>
                            ))
                        ) : (
                            <ThemedText className="text-center text-gray-400 py-4">No active viewers.</ThemedText>
                        )}
                    </ScrollView>
                </View>
            </AppModal>
        </ScrollView>
    );
}
