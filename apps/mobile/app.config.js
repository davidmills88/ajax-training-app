/**
 * Reads Expo public env so local `.env` and EAS secrets both land on the client.
 * Never put service_role or real production keys in git — placeholders only.
 */
module.exports = ({ config }) => ({
  ...config,
  extra: {
    ...(config.extra ?? {}),
    apiUrl: process.env.EXPO_PUBLIC_API_URL ?? "http://localhost:8787",
    supabaseUrl: process.env.EXPO_PUBLIC_SUPABASE_URL ?? "",
    supabaseAnonKey: process.env.EXPO_PUBLIC_SUPABASE_ANON_KEY ?? "",
    useMock: process.env.EXPO_PUBLIC_USE_MOCK ?? "1",
  },
});
