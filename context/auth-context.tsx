import api from "@/utilities/api";
import { GoogleSignin } from "@react-native-google-signin/google-signin";
import * as SecureStore from "expo-secure-store";
import React, { createContext, useContext, useEffect, useState } from "react";
import { Platform } from "react-native";

export interface User {
    id: string;
    email: string;
    name: string;
    avatar?: string;
}

interface AuthContextType {
    user: User | null;
    loading: boolean;
    setUser: (user: User | null) => void;
    logout: () => Promise<void>;
}

const AuthContext = createContext<AuthContextType | undefined>(undefined);

export function AuthProvider({ children }: { children: React.ReactNode }) {
    const [user, setUser] = useState<User | null>(null);
    const [loading, setLoading] = useState(true);

    const logout = async () => {
        try {
            if (Platform.OS !== "web") {
                // Ensure we follow the user's request to always show account list
                // revokeAccess() clears the permission and forced individual to pick account again
                await GoogleSignin.revokeAccess();
                await GoogleSignin.signOut();
            }
        } catch (error) {
            console.error("Google Sign-Out Error:", error);
        }

        await SecureStore.deleteItemAsync("accessToken");
        await SecureStore.deleteItemAsync("refreshToken");
        setUser(null);
    };

    useEffect(() => {
        const checkAuth = async () => {
            try {
                const token = await SecureStore.getItemAsync("accessToken");
                if (token) {
                    const res = await api.get("/auth/me");
                    setUser(res.data);
                }
            } catch (error) {
                console.error("Auth check failed:", error);
                await logout();
            } finally {
                setLoading(false);
            }
        };

        checkAuth();
    }, []);

    return <AuthContext.Provider value={{ user, loading, setUser, logout }}>{children}</AuthContext.Provider>;
}

export function useAuthContext() {
    const context = useContext(AuthContext);
    if (context === undefined) {
        throw new Error("useAuthContext must be used within an AuthProvider");
    }
    return context;
}
