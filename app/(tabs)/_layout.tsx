import { Tabs } from "expo-router";
import React from "react";

import { IconSymbol } from "@/components/ui/icon-symbol";
import { Colors } from "@/constants/theme";
import { useAuth } from "@/hooks/use-auth";
import { useColorScheme } from "@/hooks/use-color-scheme";
import FontAwesome6 from "@expo/vector-icons/FontAwesome6";
import MaterialIcons from "@expo/vector-icons/MaterialIcons";
import { Image } from "react-native";

export default function TabLayout() {
    const colorScheme = useColorScheme();
    const { user } = useAuth();

    return (
        <Tabs
            screenOptions={{
                tabBarActiveTintColor: Colors[colorScheme ?? "light"].tint,
                headerShown: false,
                tabBarStyle: {
                    height: 80,
                    paddingTop: 10,
                },
                tabBarLabelStyle: {
                    fontSize: 12,
                },
            }}
        >
            <Tabs.Screen
                name="index"
                options={{
                    title: "Camera",
                    tabBarIcon: ({ color }) => <IconSymbol size={24} name="video" library={FontAwesome6} color={color} />,
                }}
            />
            <Tabs.Screen
                name="setup"
                options={{
                    title: "Setup",
                    tabBarIcon: ({ color }) => <IconSymbol size={22} name="gear" library={FontAwesome6} color={color} />,
                }}
            />
            <Tabs.Screen
                name="profile"
                options={{
                    title: "You",
                    tabBarIcon: ({ color }) =>
                        user?.avatar ? (
                            <Image source={{ uri: user.avatar }} style={{ width: 28, height: 28, borderRadius: 14 }} />
                        ) : (
                            <IconSymbol library={MaterialIcons} size={24} name="person" color={color} />
                        ),
                }}
            />
        </Tabs>
    );
}
