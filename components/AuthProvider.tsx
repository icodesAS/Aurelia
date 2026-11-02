"use client";

import React, { createContext, useContext, useEffect, useState, useCallback } from "react";
import {
  GoogleAuthProvider,
  signInWithPopup,
  onAuthStateChanged,
  signOut,
  User,
} from "firebase/auth";
import { MotionConfig } from "motion/react";
import { auth } from "@/lib/firebase";
import { Profile } from "@/lib/types";
import { createDefaultGuestProfile } from "@/lib/seed";
import {
  fetchUserProfile,
  saveUserProfile,
  getLocalProfile,
  setLocalProfile,
} from "@/lib/store";

export interface AuthUser {
  uid: string;
  displayName: string | null;
  email: string | null;
  isAnonymous: boolean;
}

interface AuthContextValue {
  user: AuthUser | null;
  profile: Profile | null;
  loading: boolean;
  signInGoogle: () => Promise<Profile | null>;
  signInGuest: (withDefaultProfile?: boolean) => Promise<Profile | null>;
  logout: () => Promise<void>;
  saveProfile: (p: Profile) => Promise<void>;
  refreshProfile: () => Promise<void>;
}

const AuthContext = createContext<AuthContextValue | undefined>(undefined);

const LS_GUEST_AUTH_KEY = "aurelia_guest_session_active_v1";

export function AuthProvider({ children }: { children: React.ReactNode }) {
  const [user, setUser] = useState<AuthUser | null>(null);
  const [profile, setProfile] = useState<Profile | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const unsub = onAuthStateChanged(auth, async (fbUser: User | null) => {
      if (fbUser) {
        const mappedUser: AuthUser = {
          uid: fbUser.uid,
          displayName: fbUser.displayName,
          email: fbUser.email,
          isAnonymous: fbUser.isAnonymous,
        };
        setUser(mappedUser);
        const existingProfile = await fetchUserProfile(fbUser.uid);
        setProfile(existingProfile);
        setLoading(false);
        return;
      }

      const localProfile = getLocalProfile();
      const guestActive =
        typeof window !== "undefined" &&
        localStorage.getItem(LS_GUEST_AUTH_KEY) === "true";

      if (guestActive || localProfile) {
        const activeProfile = localProfile ?? createDefaultGuestProfile();
        if (!localProfile) {
          setLocalProfile(activeProfile);
        }
        setUser({
          uid: activeProfile.uid,
          displayName: activeProfile.displayName,
          email: null,
          isAnonymous: true,
        });
        setProfile(activeProfile);
      } else {
        setUser(null);
        setProfile(null);
      }
      setLoading(false);
    });

    return () => unsub();
  }, []);

  const signInGoogle = useCallback(async (): Promise<Profile | null> => {
    const provider = new GoogleAuthProvider();
    const cred = await signInWithPopup(auth, provider);
    const fbUser = cred.user;
    const mappedUser: AuthUser = {
      uid: fbUser.uid,
      displayName: fbUser.displayName,
      email: fbUser.email,
      isAnonymous: false,
    };
    setUser(mappedUser);
    const existing = await fetchUserProfile(fbUser.uid);
    setProfile(existing);
    return existing;
  }, []);

  const signInGuest = useCallback(
    async (withDefaultProfile = false): Promise<Profile | null> => {
      if (typeof window !== "undefined") {
        localStorage.setItem(LS_GUEST_AUTH_KEY, "true");
      }

      const uid = "guest-demo-user";
      const existing = getLocalProfile();
      const nextProfile =
        existing ?? (withDefaultProfile ? createDefaultGuestProfile(uid) : null);

      if (nextProfile) {
        await saveUserProfile(nextProfile);
      }

      setUser({
        uid,
        displayName: nextProfile?.displayName ?? "Guest",
        email: null,
        isAnonymous: true,
      });
      setProfile(nextProfile);
      return nextProfile;
    },
    []
  );

  const logout = useCallback(async () => {
    if (typeof window !== "undefined") {
      localStorage.removeItem(LS_GUEST_AUTH_KEY);
    }
    setLocalProfile(null);
    try {
      await signOut(auth);
    } catch {
      // ignore
    }
    setUser(null);
    setProfile(null);
  }, []);

  const saveProfile = useCallback(async (p: Profile) => {
    await saveUserProfile(p);
    setProfile(p);
    setUser((prev) =>
      prev
        ? { ...prev, displayName: p.displayName }
        : {
            uid: p.uid,
            displayName: p.displayName,
            email: null,
            isAnonymous: true,
          }
    );
  }, []);

  const refreshProfile = useCallback(async () => {
    if (!user) return;
    const latest = await fetchUserProfile(user.uid);
    setProfile(latest);
  }, [user]);

  return (
    <MotionConfig reducedMotion="user">
      <AuthContext.Provider
        value={{
          user,
          profile,
          loading,
          signInGoogle,
          signInGuest,
          logout,
          saveProfile,
          refreshProfile,
        }}
      >
        {children}
      </AuthContext.Provider>
    </MotionConfig>
  );
}

export function useAuth() {
  const ctx = useContext(AuthContext);
  if (!ctx) {
    throw new Error("useAuth must be used within AuthProvider");
  }
  return ctx;
}
