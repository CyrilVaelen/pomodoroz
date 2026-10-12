import {
  createClient,
  SupabaseClient,
  User,
  Session,
} from "@supabase/supabase-js";

// 仅使用公开客户端环境配置，严禁使用任何特权私钥
const DEFAULT_SUPABASE_URL = "https://cddsqggbojahuknauook.supabase.co";
const DEFAULT_SUPABASE_KEY =
  "sb_publishable_qxAy5Ojjm_u80qTenImKtQ_m1g7B3T4";

export function normalizeSupabaseUrl(rawUrl: string): string {
  let url = (rawUrl || "").trim().replace(/\/+$/, "");
  if (!url) return "";

  // 若仅传入了项目标识 ID（例如 cddsqggbojahuknauook）
  if (/^[a-z0-9_-]+$/i.test(url)) {
    return `https://${url}.supabase.co`;
  }

  // 若传入了未带协议的 supabase 域名（例如 cddsqggbojahuknauook.supabase.co）
  if (/^[a-z0-9_.-]+\.supabase\.co$/i.test(url)) {
    return `https://${url}`;
  }

  // 若缺少协议但包含域名
  if (!/^https?:\/\//i.test(url) && url.includes(".")) {
    return `https://${url}`;
  }

  return url;
}

export function isValidHttpUrl(urlString: string): boolean {
  try {
    const url = new URL(urlString);
    return url.protocol === "http:" || url.protocol === "https:";
  } catch {
    return false;
  }
}

const rawUrl = (
  import.meta.env.VITE_SUPABASE_URL ||
  import.meta.env.NEXT_PUBLIC_SUPABASE_URL ||
  DEFAULT_SUPABASE_URL
).trim();

const rawKey = (
  import.meta.env.VITE_SUPABASE_ANON_KEY ||
  import.meta.env.VITE_SUPABASE_PUBLISHABLE_KEY ||
  import.meta.env.NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY ||
  import.meta.env.NEXT_PUBLIC_SUPABASE_ANON_KEY ||
  DEFAULT_SUPABASE_KEY
).trim();

const SUPABASE_URL = normalizeSupabaseUrl(rawUrl);
const SUPABASE_ANON_KEY = rawKey;

let clientInstance: SupabaseClient | null = null;

export const isSupabaseConfigured = (): boolean => {
  return Boolean(
    SUPABASE_URL && isValidHttpUrl(SUPABASE_URL) && SUPABASE_ANON_KEY
  );
};

export const getSupabaseClient = (): SupabaseClient | null => {
  if (!isSupabaseConfigured()) {
    return null;
  }

  if (!clientInstance) {
    try {
      clientInstance = createClient(SUPABASE_URL, SUPABASE_ANON_KEY, {
        auth: {
          persistSession: true,
          autoRefreshToken: true,
          detectSessionInUrl: true,
        },
      });
    } catch (err) {
      console.warn("Failed to initialize Supabase client:", err);
      clientInstance = null;
      return null;
    }
  }

  return clientInstance;
};

export const signUpWithEmail = async (
  email: string,
  password: string
) => {
  const client = getSupabaseClient();
  if (!client) {
    throw new Error(
      "Supabase is not configured or failed to initialize"
    );
  }
  return client.auth.signUp({ email, password });
};

export const signInWithEmail = async (
  email: string,
  password: string
) => {
  const client = getSupabaseClient();
  if (!client) {
    throw new Error(
      "Supabase is not configured or failed to initialize"
    );
  }
  return client.auth.signInWithPassword({ email, password });
};

export const signOut = async () => {
  const client = getSupabaseClient();
  if (!client) {
    return;
  }
  return client.auth.signOut();
};

export const getCurrentUser = async (): Promise<User | null> => {
  try {
    const client = getSupabaseClient();
    if (!client) {
      return null;
    }
    const { data, error } = await client.auth.getUser();
    if (error) {
      console.debug("getCurrentUser error:", error.message);
      return null;
    }
    return data?.user || null;
  } catch (err) {
    console.debug("getCurrentUser caught exception:", err);
    return null;
  }
};

export const getCurrentSession = async (): Promise<Session | null> => {
  try {
    const client = getSupabaseClient();
    if (!client) {
      return null;
    }
    const { data, error } = await client.auth.getSession();
    if (error) {
      console.debug("getCurrentSession error:", error.message);
      return null;
    }
    return data?.session || null;
  } catch (err) {
    console.debug("getCurrentSession caught exception:", err);
    return null;
  }
};

export const onAuthStateChange = (
  callback: (event: string, session: Session | null) => void
) => {
  try {
    const client = getSupabaseClient();
    if (!client) {
      return { data: { subscription: { unsubscribe: () => {} } } };
    }
    return client.auth.onAuthStateChange(callback);
  } catch (err) {
    console.debug("onAuthStateChange caught exception:", err);
    return { data: { subscription: { unsubscribe: () => {} } } };
  }
};
