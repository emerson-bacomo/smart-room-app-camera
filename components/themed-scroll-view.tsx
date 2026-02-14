import { useThemeColor } from "@/hooks/use-theme-color";
import React from "react";
import { ScrollView, type ScrollViewProps } from "react-native";

export type ThemedScrollViewProps = ScrollViewProps;

export function ThemedScrollView({ style, contentContainerStyle, ...otherProps }: ThemedScrollViewProps) {
    const backgroundColor = useThemeColor("background", "backgroundColor");

    return <ScrollView style={[backgroundColor, style]} contentContainerStyle={contentContainerStyle} {...otherProps} />;
}
