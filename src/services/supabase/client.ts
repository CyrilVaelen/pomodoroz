import {
  createClient,
  SupabaseClient,
  User,
  Session,
} from "@supabase/supabase-js";

// 仅使用公开客户端环境配置，严禁使用任何服务端特权管理私钥
const SUPABASE_URL = (import.meta.env.VITE_SUPABASE_URL || "").trim();
const SUPABASE_ANON_KEY = (
  import.meta.env.VITE_SUPABASE_ANON_KEY ||
  import.meta.env.VITE_SUPABASE_PUBLISHABLE_KEY ||
  ""
).trim();

let clientInstance: SupabaseClient | null = null;

export const isSupabaseConfigured = (): boolean => {
  return Boolean(SUPABASE_URL && SUPABASE_ANON_KEY);
};

export const getSupabaseClient = (): SupabaseClient | null => {
  if (!isSupabaseConfigured()) {
    return null;
  }

  if (!clientInstance) {
    clientInstance = createClient(SUPABASE_URL, SUPABASE_ANON_KEY, {
      auth: {
        persistSession: true,
        autoRefreshToken: true,
        detectSessionInUrl: true,
      },
    });
  }

  return clientInstance;
};

export const signUpWithEmail = async (
  email: string,
  password: string
) => {
  const client = getSupabaseClient();
  if (!client) {
    throw new Error("Supabase is not configured");
  }
  return client.auth.signUp({ email, password });
};

export const signInWithEmail = async (
  email: string,
  password: string
) => {
  const client = getSupabaseClient();
  if (!client) {
    throw new Error("Supabase is not configured");
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
  const client = getSupabaseClient();
  if (!client) {
    return null;
  }
  const { data } = await client.auth.getUser();
  return data?.user || null;
};

export const getCurrentSession = async (): Promise<Session | null> => {
  const client = getSupabaseClient();
  if (!client) {
    return null;
  }
  const { data } = await client.auth.getSession();
  return data?.session || null;
};

export const onAuthStateChange = (
  callback: (event: string, session: Session | null) => void
) => {
  const client = getSupabaseClient();
  if (!client) {
    return { data: { subscription: { unsubscribe: () => {} } } };
  }
  return client.auth.onAuthStateChange(callback);
};
