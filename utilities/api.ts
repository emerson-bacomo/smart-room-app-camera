import axios from "axios";
import Constants from "expo-constants";
import * as SecureStore from "expo-secure-store";
import { Platform } from "react-native";

const { API_BASE_URL } = Constants.expoConfig?.extra || {};

const api = axios.create({
    baseURL: API_BASE_URL,
    headers: { "Content-Type": "application/json" },
});

// Add interceptor to include token
api.interceptors.request.use(async (config) => {
    if (Platform.OS !== "web") {
        const token = await SecureStore.getItemAsync("accessToken");
        if (token) {
            config.headers.Authorization = `Bearer ${token}`;
        }
    }
    return config;
});

export default api;
