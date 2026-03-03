import { Button, ButtonProps } from "@/components/button";
import { ThemedSafeAreaView } from "@/components/themed-safe-area-view";
import { ThemedText } from "@/components/themed-text";
import { ThemedView } from "@/components/themed-view";
import { useTheme } from "@/context/theme-context";
import { useAuth } from "@/hooks/use-auth";
import api from "@/utilities/api";
import { MaterialCommunityIcons } from "@expo/vector-icons";
import { GoogleSignin as GoogleNative, GoogleSigninButton } from "@react-native-google-signin/google-signin";
import * as GoogleBrowser from "expo-auth-session/providers/google";
import * as SecureStore from "expo-secure-store";
import * as WebBrowser from "expo-web-browser";
import React, { useEffect } from "react";
import { Platform } from "react-native";

const AUTH_MODE: "auto" | "native" | "browser" = "auto" as "auto" | "native" | "browser";

const USE_NATIVE = AUTH_MODE === "native" || (AUTH_MODE === "auto" && Platform.OS !== "web");

const WEB_CLIENT_ID = "733891402411-vlej6d4iq0kncfqf2is1fh48jmael78q.apps.googleusercontent.com";
const ANDROID_CLIENT_ID = "733891402411-7qchghrgv3dodu7ll1b0ikpb5scosing.apps.googleusercontent.com";

export default function Login() {
    WebBrowser.maybeCompleteAuthSession();

    // 1. Browser Flow Setup
    const [request, response, promptAsync] = GoogleBrowser.useAuthRequest({
        androidClientId: ANDROID_CLIENT_ID,
        webClientId: WEB_CLIENT_ID,
        extraParams: {
            prompt: "select_account", // Force account selection on browser
        },
    });

    // 2. Native Flow Setup (Android/iOS only)
    useEffect(() => {
        if (Platform.OS !== "web") {
            GoogleNative.configure({
                webClientId: WEB_CLIENT_ID, // Use WEB ID here for backend compatibility
                offlineAccess: true,
            });
        }
    }, []);

    // Handle Browser Response
    useEffect(() => {
        if (response?.type === "success") {
            const idToken = response.authentication?.idToken;
            if (idToken) loginWithBackend(idToken);
        }
    }, [response]);

    const handleLoginPress: ButtonProps["onclick"] = async (setBtnLoading) => {
        if (!setBtnLoading) return;
        if (USE_NATIVE && Platform.OS !== "web") {
            // --- NATIVE METHOD ---
            setBtnLoading(true);
            try {
                await GoogleNative.hasPlayServices();
                const userInfo = await GoogleNative.signIn();
                const idToken = userInfo.data?.idToken;
                if (idToken) {
                    await loginWithBackend(idToken);
                }
            } catch (error) {
                console.error("Native Sign-In Error:", error);
            } finally {
                setBtnLoading(false);
            }
        } else {
            // --- BROWSER METHOD ---
            promptAsync();
        }
    };

    const { setUser } = useAuth();

    const loginWithBackend = async (idToken: string) => {
        try {
            const res = await api.post("/auth/google", { idToken });
            const { accessToken, refreshToken, user } = res.data;

            if (Platform.OS !== "web") {
                await SecureStore.setItemAsync("accessToken", accessToken);
                await SecureStore.setItemAsync("refreshToken", refreshToken);
            }

            setUser(user);
        } catch (error) {
            console.error("Backend Error:", error);
            // toast.error("Login Failed. Could not verify with server.");
        }
    };

    const { colorScheme } = useTheme();

    return (
        <ThemedSafeAreaView className="flex-1 items-center justify-center">
            <ThemedView className="w-full px-8 items-center gap-12">
                <ThemedView className="items-center gap-4">
                    <ThemedView className="w-24 h-24 rounded-3xl bg-primary/10 items-center justify-center">
                        <MaterialCommunityIcons
                            name="home-automation"
                            size={48}
                            color={colorScheme === "dark" ? "#60a5fa" : "#2563eb"}
                        />
                    </ThemedView>
                    <ThemedView className="items-center gap-1">
                        <ThemedText type="title" className="text-3xl font-bold">
                            Smart Room
                        </ThemedText>
                        <ThemedText className="opacity-60 text-center">
                            Control your environment with ease and intelligence.
                        </ThemedText>
                    </ThemedView>
                </ThemedView>

                <ThemedView className="w-full gap-4">
                    {USE_NATIVE && Platform.OS !== "web" ? (
                        <GoogleSigninButton
                            size={GoogleSigninButton.Size.Wide}
                            color={colorScheme === "dark" ? GoogleSigninButton.Color.Dark : GoogleSigninButton.Color.Light}
                            onPress={() => handleLoginPress(() => {})}
                            style={{ width: "100%", height: 48 }}
                        />
                    ) : (
                        <Button
                            className="w-full h-12 flex-row items-center justify-center gap-3 bg-white border border-gray-200"
                            onclick={handleLoginPress}
                        >
                            <MaterialCommunityIcons name="google" size={20} color="#EA4335" />
                            <ThemedText style={{ color: "#000", fontWeight: "600" }}>Sign in with Google</ThemedText>
                        </Button>
                    )}

                    <ThemedText className="text-center opacity-40 text-xs mt-4">
                        By continuing, you agree to our Terms of Service and Privacy Policy.
                    </ThemedText>
                </ThemedView>
            </ThemedView>
        </ThemedSafeAreaView>
    );
}
