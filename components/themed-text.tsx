import { Text, type TextProps } from "react-native";

import { useThemeColor } from "@/hooks/use-theme-color";
import React from "react";
import { twMerge } from "tailwind-merge";

export type ThemedTextProps = TextProps & {
    type?: "default" | "title" | "defaultSemiBold" | "subtitle" | "link";
};

export function ThemedText({ style, type = "default", className, ...rest }: ThemedTextProps) {
    const color = useThemeColor("text", "color");

    const typeClasses = {
        default: "text-base leading-6",
        defaultSemiBold: "text-base leading-6 font-semibold",
        title: "text-[32px] font-bold leading-8",
        subtitle: "text-xl font-bold",
        link: "text-base leading-[30px] text-[#0a7ea4]",
    };

    return <Text style={[color, style]} className={twMerge(typeClasses[type], className)} {...rest} />;
}
