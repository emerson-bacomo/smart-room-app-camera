import { useAuth } from "@/hooks/use-auth";
import api from "@/utilities/api";
import * as Application from "expo-application";
import * as Device from "expo-device";
import React, { createContext, useContext, useEffect, useState } from "react";

interface Camera {
    id: string;
    name: string;
    roomId?: string;
    deviceId?: string;
    deviceName?: string;
}

interface CameraContextType {
    cameras: Camera[];
    linkedCamera: Camera | undefined;
    deviceId: string | null;
    deviceName: string | null;
    isLoading: boolean;
    refreshCameras: () => Promise<void>;
}

const CameraContext = createContext<CameraContextType | undefined>(undefined);

export function CameraProvider({ children }: { children: React.ReactNode }) {
    const { user } = useAuth();
    const [cameras, setCameras] = useState<Camera[]>([]);
    const [deviceId, setDeviceId] = useState<string | null>(null);
    const [deviceName, setDeviceName] = useState<string | null>(null);
    const [isLoading, setIsLoading] = useState(true);

    useEffect(() => {
        initDevice();
    }, []);

    useEffect(() => {
        if (user && deviceId) {
            fetchCameras();
        } else if (!user) {
            setCameras([]);
        }
    }, [user, deviceId]);

    const initDevice = async () => {
        let id = Application.getAndroidId();
        if (!id) {
            // Fallback or handle null? AndroidId should be there on Android.
            // For web/simulators it might be null.
            id = "simulated-device-id";
        }
        const name = Device.deviceName || "Unknown Device";
        setDeviceId(id);
        setDeviceName(name);
    };

    const fetchCameras = async () => {
        setIsLoading(true);
        try {
            const res = await api.get("/cameras");
            setCameras(res.data);
        } catch (error) {
            console.error("Failed to fetch cameras", error);
        } finally {
            setIsLoading(false);
        }
    };

    const linkedCamera = cameras.find((c) => c.deviceId === deviceId);

    return (
        <CameraContext.Provider
            value={{
                cameras,
                linkedCamera,
                deviceId,
                deviceName,
                isLoading,
                refreshCameras: fetchCameras,
            }}
        >
            {children}
        </CameraContext.Provider>
    );
}

export function useCamera() {
    const context = useContext(CameraContext);
    if (!context) {
        throw new Error("useCamera must be used within a CameraProvider");
    }
    return context;
}
