import axios from "axios";
import AsyncStorage from "@react-native-async-storage/async-storage";

// Point this at your machine's LAN IP when testing on a physical device
// (localhost won't resolve from a phone). e.g. "http://192.168.1.20:4000"
export const API_BASE_URL = "http://192.168.1.73:4000";

export const api = axios.create({ baseURL: API_BASE_URL, timeout: 10000 });

const TOKEN_KEY = "flatsplit_token";

api.interceptors.request.use(async (config) => {
  const token = await AsyncStorage.getItem(TOKEN_KEY);
  if (token) {
    config.headers = config.headers ?? {};
    config.headers.Authorization = `Bearer ${token}`;
  }
  return config;
});

export async function saveToken(token: string) {
  await AsyncStorage.setItem(TOKEN_KEY, token);
}

export async function getToken() {
  return AsyncStorage.getItem(TOKEN_KEY);
}

export async function clearToken() {
  await AsyncStorage.removeItem(TOKEN_KEY);
}

export function apiErrorMessage(err: unknown): string {
  if (axios.isAxiosError(err)) {
    const data = err.response?.data as { error?: unknown } | undefined;
    if (typeof data?.error === "string") return data.error;
    if (data?.error) return JSON.stringify(data.error);
    return err.message;
  }
  return String(err);
}
