import { createContext, useContext, useEffect, useState } from "react";
import { supabase } from "../lib/supabaseClient";

const AuthContext = createContext();

export function AuthProvider({ children }) {
  const [user, setUser] = useState(null);
  const [profile, setProfile] = useState(null);
  const [loading, setLoading] = useState(true);

  const fetchProfile = async (userId) => {
    try {
      const { data, error } = await supabase
        .from("profiles")
        .select("*")
        .eq("id", userId)
        .maybeSingle();

      if (error) {
        console.error("Profile fetch error:", error.message);
        setProfile(null);
        return;
      }

      // 🔥 DO NOT LOG OUT — just set null
      setProfile(data || null);
    } catch (err) {
      console.error("Unexpected profile error:", err);
      setProfile(null);
    }
  };

  useEffect(() => {
    let mounted = true;

    const init = async () => {
      try {
        const {
          data: { session },
        } = await supabase.auth.getSession();

        if (!mounted) return;

        const currentUser = session?.user ?? null;

        setUser(currentUser);

        // 🔥 DO NOT AWAIT THIS
        if (currentUser) {
          fetchProfile(currentUser.id); // fire and forget
        }
      } catch (err) {
        console.error("Init error:", err);
      } finally {
        if (mounted) setLoading(false); // 🔥 ALWAYS RELEASE UI
      }
    };

    init();

    const { data: listener } = supabase.auth.onAuthStateChange(
      (_event, session) => {
        const currentUser = session?.user ?? null;

        setUser(currentUser);

        if (currentUser) {
          fetchProfile(currentUser.id); // also not awaited
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
    await supabase.auth.signOut();
    setUser(null);
    setProfile(null);
  };

  return (
    <AuthContext.Provider value={{ user, profile, loading, logout }}>
      {children}
    </AuthContext.Provider>
  );
}

export function useAuth() {
  return useContext(AuthContext);
}
