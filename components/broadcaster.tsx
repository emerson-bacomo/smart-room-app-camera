import notifee, { AndroidColor, AndroidForegroundServiceType, AndroidImportance } from "@notifee/react-native";
import React, { useEffect, useRef, useState } from "react";
import { AppState, PermissionsAndroid, Platform, View } from "react-native";
import {
    mediaDevices,
    MediaStream,
    RTCIceCandidate,
    RTCPeerConnection,
    RTCSessionDescription,
    RTCView,
} from "react-native-webrtc";
import { io, Socket } from "socket.io-client";
import { peerConstraints, SIGNALING_URL } from "../web-rtc.config";

export interface Viewer {
    id: string; // Socket ID
    name?: string;
    avatar?: string;
}

interface BroadcasterProps {
    cameraId: string;
    onViewersChange?: (viewers: Viewer[]) => void;
}

export default function Broadcaster({ cameraId, onViewersChange }: BroadcasterProps) {
    const [localStream, setLocalStream] = useState<MediaStream | null>(null);

    // Use a Ref to hold the socket instance
    const socketRef = useRef<Socket | null>(null);

    const awaitingWatchers = useRef<string[]>([]);
    const localStreamRef = useRef<MediaStream | null>(null);
    const peerConnections = useRef<Record<string, RTCPeerConnection>>({});
    const viewersRef = useRef<Viewer[]>([]);

    const startForegroundService = async () => {
        if (Platform.OS !== "android") return;

        try {
            // Create a channel (required for Android)
            const channelId = await notifee.createChannel({
                id: "broadcaster-service",
                name: "Camera Broadcaster Service",
                lights: false,
                vibration: false,
                importance: AndroidImportance.DEFAULT,
            });

            // Display a notification
            await notifee.displayNotification({
                title: "Broadcasting Active",
                body: "Camera is streaming in the background",
                android: {
                    channelId,
                    color: AndroidColor.RED,
                    ongoing: true,
                    asForegroundService: true,
                    foregroundServiceTypes: [AndroidForegroundServiceType.FOREGROUND_SERVICE_TYPE_CAMERA],
                    pressAction: {
                        id: "default",
                    },
                },
            });
            console.log("[Broadcaster] Foreground service started");
        } catch (err) {
            console.error("[Broadcaster] Failed to start foreground service:", err);
        }
    };

    const stopForegroundService = async () => {
        if (Platform.OS !== "android") return;
        await notifee.stopForegroundService();
        console.log("[Broadcaster] Foreground service stopped");
    };

    // 1. Initialize Camera Stream
    useEffect(() => {
        let isMounted = true;

        const requestPermissions = async () => {
            if (Platform.OS === "android") {
                try {
                    const granted = await PermissionsAndroid.requestMultiple([
                        PermissionsAndroid.PERMISSIONS.CAMERA,
                        PermissionsAndroid.PERMISSIONS.RECORD_AUDIO,
                        PermissionsAndroid.PERMISSIONS.POST_NOTIFICATIONS,
                    ]);
                    return (
                        granted["android.permission.CAMERA"] === PermissionsAndroid.RESULTS.GRANTED &&
                        granted["android.permission.RECORD_AUDIO"] === PermissionsAndroid.RESULTS.GRANTED
                    );
                } catch (err) {
                    console.warn(err);
                    return false;
                }
            }
            return true;
        };

        const startStream = async () => {
            const hasPermissions = await requestPermissions();
            if (!hasPermissions) {
                console.error("Permissions not granted");
                return;
            }

            try {
                const stream = (await mediaDevices.getUserMedia({
                    audio: true,
                    video: {
                        facingMode: "environment",
                        width: 1280,
                        height: 720,
                        frameRate: 30,
                    },
                })) as MediaStream;

                if (isMounted) {
                    localStreamRef.current = stream;
                    setLocalStream(stream);
                    // Process any awaiting watchers
                    awaitingWatchers.current.forEach((id) => createPeerConnection(id, stream));
                    awaitingWatchers.current = [];

                    // Start background service
                    startForegroundService();
                } else {
                    stream.getTracks().forEach((t) => t.stop());
                }
            } catch (err) {
                console.error("Error accessing media", err);
            }
        };

        startStream();

        const subscription = AppState.addEventListener("change", (nextAppState) => {
            console.log(`[Broadcaster] AppState changed to: ${nextAppState}`);
        });

        return () => {
            isMounted = false;
            subscription.remove();
            stopForegroundService();
            if (localStreamRef.current) {
                localStreamRef.current.getTracks().forEach((t) => t.stop());
                localStreamRef.current = null;
            }
        };
    }, []); // Run once on mount

    const createPeerConnection = async (watcherId: string, stream: MediaStream) => {
        console.log(`[Broadcaster] Creating PC for watcher: ${watcherId}`);
        const pc = new RTCPeerConnection(peerConstraints);
        peerConnections.current[watcherId] = pc;

        // Logging
        (pc as any).oniceconnectionstatechange = () => {
            console.log(`[Broadcaster] PC for ${watcherId} ICE State: ${pc.iceConnectionState}`);
        };

        stream.getTracks().forEach((track) => {
            console.log(`[Broadcaster] Adding track to PC for ${watcherId}: ${track.kind}`);
            pc.addTrack(track, stream);
        });

        (pc as any).onicecandidate = (event: any) => {
            if (event.candidate && socketRef.current) {
                socketRef.current.emit("candidate", watcherId, event.candidate);
            }
        };

        try {
            const offer = await pc.createOffer({});
            await pc.setLocalDescription(offer);
            console.log(`[Broadcaster] Sending offer to ${watcherId}`);
            socketRef.current?.emit("offer", watcherId, pc.localDescription);
        } catch (e) {
            console.error(`[Broadcaster] Error creating offer for ${watcherId}:`, e);
        }
    };

    // 2. Signaling and Peer Connections
    useEffect(() => {
        if (!cameraId) return;

        console.log(`[Broadcaster] Initializing signaling for camera: ${cameraId}`);
        socketRef.current = io(SIGNALING_URL);
        socketRef.current.emit("broadcaster", cameraId);

        socketRef.current.on("watcher", (id: string, user?: { id: string; name?: string; avatar?: string }) => {
            console.log(`[Broadcaster] Watcher joining: ${id}`, user);

            if (!viewersRef.current.some((v) => v.id === id)) {
                const viewer: Viewer = {
                    id,
                    name: user?.name,
                    avatar: user?.avatar,
                };
                viewersRef.current.push(viewer);
                onViewersChange?.([...viewersRef.current]);
            }

            if (localStreamRef.current) {
                createPeerConnection(id, localStreamRef.current);
            } else {
                console.log("[Broadcaster] Stream not ready, queuing watcher");
                awaitingWatchers.current.push(id);
            }
        });

        socketRef.current.on("answer", (id: string, description: RTCSessionDescription) => {
            console.log(`[Broadcaster] Received answer from ${id}`);
            peerConnections.current[id]?.setRemoteDescription(new RTCSessionDescription(description));
        });

        socketRef.current.on("candidate", (id: string, candidate: RTCIceCandidate) => {
            console.log(`[Broadcaster] Received candidate from ${id}`);
            peerConnections.current[id]?.addIceCandidate(new RTCIceCandidate(candidate));
        });

        socketRef.current.on("disconnectPeer", (id: string) => {
            console.log(`[Broadcaster] Peer disconnected: ${id}`);
            viewersRef.current = viewersRef.current.filter((v) => v.id !== id);
            onViewersChange?.([...viewersRef.current]);

            const pc = peerConnections.current[id];
            if (pc) {
                pc.close();
                delete peerConnections.current[id];
            }
        });

        return () => {
            console.log("[Broadcaster] Cleaning up signaling...");
            viewersRef.current = [];
            onViewersChange?.([]);
            Object.values(peerConnections.current).forEach((pc) => pc.close());
            peerConnections.current = {};
            socketRef.current?.disconnect();
            socketRef.current = null;
        };
    }, [cameraId]); // Only restart if cameraId changes

    return (
        <View className="flex-1 bg-[#222]">
            {localStream && <RTCView streamURL={localStream.toURL()} style={{ flex: 1 }} mirror={false} objectFit="cover" />}
        </View>
    );
}
