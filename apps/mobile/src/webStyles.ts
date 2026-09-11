import { Platform } from "react-native";

/** RN-web can collapse spaces in Text; keep words intact in the browser. */
export function preserveSpaces<T extends object>(style: T): T {
  if (Platform.OS !== "web") return style;
  return { ...style, whiteSpace: "pre-wrap" } as T;
}
