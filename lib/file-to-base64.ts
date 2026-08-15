import { File } from "expo-file-system";
import { Platform } from "react-native";

/** Reads a user-selected local URI without persisting its contents in application state. */
export async function readUriAsBase64(uri: string): Promise<string> {
  if (Platform.OS !== "web") return new File(uri).base64();
  const response = await fetch(uri);
  if (!response.ok) throw new Error("Seçilen dosya okunamadı");
  const bytes = new Uint8Array(await response.arrayBuffer());
  let binary = "";
  const chunkSize = 0x8000;
  for (let offset = 0; offset < bytes.length; offset += chunkSize) {
    binary += String.fromCharCode(...bytes.subarray(offset, offset + chunkSize));
  }
  return globalThis.btoa(binary);
}
