import { createContext, useContext, useEffect, useState } from "react";
import { supabase } from "../lib/supabaseClient";

const AuthContext = createContext();

export function AuthProvider({ children }) {
  const [user, setUser] = useState(null);
  const [profile, setProfile] = useState(null);
  const [loading, setLoading] = useState(true);

  // 🔥 HARD RESET (used when session is invalid)
  const forceLogout = async () => {
    await supabase.auth.signOut();
    setUser(null);
    setProfile(null);
  };

  const fetchProfile = async (userId) => {
    try {
      const { data, error } = await supabase
        .from("profiles")
        .select("*")
        .eq("id", userId)
        .maybeSingle(); // 🔥 CRITICAL FIX

      if (error) {
        console.error("Profile fetch error:", error.message);
        await forceLogout(); // 🔥 kill invalid session
        return;
      }

      // 🔥 PROFILE DOES NOT EXIST → INVALID USER STATE
      if (!data) {
        console.warn("Profile missing → forcing logout");
        await forceLogout();
        return;
      }

      setProfile(data);
    } catch (err) {
      console.error("Unexpected profile error:", err);
      await forceLogout();
    }
  };

  const updateProfile = async (updates) => {
    if (!user) throw new Error("No authenticated user");

    const { error } = await supabase
      .from("profiles")
      .update(updates)
      .eq("id", user.id);

    if (error) {
      console.error("Profile update error:", error.message);
      throw error;
    }

    await fetchProfile(user.id);
  };

  useEffect(() => {
    let mounted = true;

    const init = async () => {
      try {
        const { data, error } = await supabase.auth.getSession();

        if (error) {
          console.error("Session error:", error.message);
          if (mounted) setLoading(false);
          return;
        }

        const currentUser = data?.session?.user ?? null;

        if (!mounted) return;

        setUser(currentUser);

        if (currentUser) {
          await fetchProfile(currentUser.id);
        }
      } catch (err) {
        console.error("Init error:", err);
      } finally {
        if (mounted) setLoading(false);
      }
    };

    init();

    const { data: listener } = supabase.auth.onAuthStateChange(
      async (_event, session) => {
        const currentUser = session?.user ?? null;

        setUser(currentUser);

        if (currentUser) {
          await fetchProfile(currentUser.id);
        } else {
          setProfile(null);
        }
      },
    );

    return () => {
      mounted = false;
      listener.subscription.unsubscribe();
    };
  }, []);

  const logout = async () => {
    await forceLogout();
  };

  return (
    <AuthContext.Provider
      value={{ user, profile, loading, logout, updateProfile }}
    >
      {children}
    </AuthContext.Provider>
  );
}

export function useAuth() {
  return useContext(AuthContext);
}
