import React, { useEffect, useRef, useState } from "react";
import { PermissionsAndroid, Platform, StyleSheet, Text, View } from "react-native";
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

interface BroadcasterProps {
    cameraId: string;
}

export default function Broadcaster({ cameraId }: BroadcasterProps) {
    const [localStream, setLocalStream] = useState<MediaStream | null>(null);

    // Use a Ref to hold the socket instance
    const socketRef = useRef<Socket | null>(null);

    // Store multiple PeerConnections (key: socketId, value: RTCPeerConnection)
    const peerConnections = useRef<Record<string, RTCPeerConnection>>({});

    useEffect(() => {
        if (!cameraId) return;

        socketRef.current = io(SIGNALING_URL);
        socketRef.current.emit("broadcaster", cameraId);

        let isMounted = true;

        const requestPermissions = async () => {
            if (Platform.OS === "android") {
                try {
                    const granted = await PermissionsAndroid.requestMultiple([
                        PermissionsAndroid.PERMISSIONS.CAMERA,
                        PermissionsAndroid.PERMISSIONS.RECORD_AUDIO,
                    ]);

                    if (
                        granted["android.permission.CAMERA"] === PermissionsAndroid.RESULTS.GRANTED &&
                        granted["android.permission.RECORD_AUDIO"] === PermissionsAndroid.RESULTS.GRANTED
                    ) {
                        console.log("You can use the camera and mic");
                        return true;
                    } else {
                        console.log("Camera permission denied");
                        return false;
                    }
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
                // Reuse existing stream if possible, or stop old one if needed
                // For simplicity, we create a new one each time the component mounts/remounts with new ID
                const stream = (await mediaDevices.getUserMedia({
                    audio: true,
                    video: true,
                })) as MediaStream;

                if (isMounted) {
                    setLocalStream(stream);
                }
            } catch (err) {
                console.error("Error accessing media", err);
            }
        };

        startStream();

        // --- Socket Events ---

        socketRef.current.on("watcher", async (id: string) => {
            // We only reach here if the server routed a watcher for this cameraId to us
            if (!localStream) return;

            const peerConnection = new RTCPeerConnection(peerConstraints);
            peerConnections.current[id] = peerConnection;

            // Add local tracks to the peer connection
            localStream.getTracks().forEach((track) => {
                peerConnection.addTrack(track, localStream);
            });

            // ICE Candidates
            (peerConnection as any).onicecandidate = (event: RTCPeerConnectionIceEvent) => {
                if (event.candidate && socketRef.current) {
                    socketRef.current.emit("candidate", id, event.candidate);
                }
            };

            // Create Offer
            try {
                const offer = await peerConnection.createOffer({});
                await peerConnection.setLocalDescription(offer);
                socketRef.current?.emit("offer", id, peerConnection.localDescription);
            } catch (e) {
                console.error("Error creating offer:", e);
            }
        });

        socketRef.current.on("answer", (id: string, description: RTCSessionDescription) => {
            peerConnections.current[id]?.setRemoteDescription(description);
        });

        socketRef.current.on("candidate", (id: string, candidate: RTCIceCandidate) => {
            peerConnections.current[id]?.addIceCandidate(new RTCIceCandidate(candidate));
        });

        socketRef.current.on("disconnectPeer", (id: string) => {
            const pc = peerConnections.current[id];
            if (pc) {
                pc.close();
                delete peerConnections.current[id];
            }
        });

        // Cleanup
        return () => {
            isMounted = false;
            if (localStream) {
                localStream.getTracks().forEach((t) => t.stop());
                localStream.release();
            }

            // Close all peer connections
            Object.values(peerConnections.current).forEach((pc) => pc.close());

            socketRef.current?.disconnect();
        };
    }, [cameraId, localStream]); // Re-run if cameraId changes (reset webrtc) or localStream changes

    return (
        <View style={styles.container}>
            <Text style={styles.text}>Recording Mode</Text>
            {localStream && <RTCView streamURL={localStream.toURL()} style={styles.video} mirror={true} objectFit="cover" />}
        </View>
    );
}

const styles = StyleSheet.create({
    container: { flex: 1, backgroundColor: "#222" },
    text: { color: "white", textAlign: "center", padding: 10 },
    video: { flex: 1 },
});
