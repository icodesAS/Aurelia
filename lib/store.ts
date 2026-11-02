import {
  doc,
  getDoc,
  setDoc,
  collection,
  addDoc,
  updateDoc,
  onSnapshot,
  query,
  where,
} from "firebase/firestore";
import { auth, db, handleFirestoreError, OperationType } from "./firebase";
import { Profile, Listing, Household } from "./types";
import { stripUndefined } from "./format";

const LS_PROFILE_KEY = "aurelia_guest_profile_v1";
const LS_LISTINGS_KEY = "aurelia_user_listings_v1";
const LS_HOUSEHOLD_KEY = "aurelia_household_v1";

function isRealFirebaseUser(): boolean {
  return Boolean(auth.currentUser && auth.currentUser.uid !== "guest-demo-user");
}

function withFirestoreTimeout<T>(promise: Promise<T>, ms = 3500): Promise<T> {
  return new Promise((resolve, reject) => {
    const timer = setTimeout(() => reject(new Error("Firestore operation timeout")), ms);
    promise.then(
      (val) => {
        clearTimeout(timer);
        resolve(val);
      },
      (err) => {
        clearTimeout(timer);
        reject(err);
      }
    );
  });
}

export function getLocalProfile(): Profile | null {
  if (typeof window === "undefined") return null;
  try {
    const raw = localStorage.getItem(LS_PROFILE_KEY);
    return raw ? (JSON.parse(raw) as Profile) : null;
  } catch {
    return null;
  }
}

export function setLocalProfile(profile: Profile | null): void {
  if (typeof window === "undefined") return;
  try {
    if (!profile) localStorage.removeItem(LS_PROFILE_KEY);
    else localStorage.setItem(LS_PROFILE_KEY, JSON.stringify(profile));
  } catch {
    // ignore storage quota errors
  }
}

export async function fetchUserProfile(uid: string): Promise<Profile | null> {
  if (uid === "guest-demo-user" || !isRealFirebaseUser()) {
    return getLocalProfile();
  }
  const path = `users/${uid}`;
  try {
    const snap = await withFirestoreTimeout(getDoc(doc(db, "users", uid)));
    if (snap.exists()) {
      const data = snap.data() as Profile;
      setLocalProfile(data);
      return data;
    }
    return getLocalProfile();
  } catch (error) {
    try {
      handleFirestoreError(error, OperationType.GET, path);
    } catch {
      // fall back to local profile if offline
    }
    return getLocalProfile();
  }
}

export async function saveUserProfile(profile: Profile): Promise<void> {
  const cleaned = stripUndefined(profile);
  setLocalProfile(cleaned);
  if (isRealFirebaseUser() && auth.currentUser?.uid === cleaned.uid) {
    const path = `users/${cleaned.uid}`;
    try {
      await withFirestoreTimeout(setDoc(doc(db, "users", cleaned.uid), cleaned));
    } catch (error) {
      try {
        handleFirestoreError(error, OperationType.WRITE, path);
      } catch {
        // already persisted in localStorage
      }
    }
  }
}

// ---------- Listings ----------
export function getLocalUserListings(): Listing[] {
  if (typeof window === "undefined") return [];
  try {
    const raw = localStorage.getItem(LS_LISTINGS_KEY);
    return raw ? (JSON.parse(raw) as Listing[]) : [];
  } catch {
    return [];
  }
}

function saveLocalUserListing(listing: Listing): void {
  if (typeof window === "undefined") return;
  try {
    const existing = getLocalUserListings().filter((l) => l.id !== listing.id);
    localStorage.setItem(LS_LISTINGS_KEY, JSON.stringify([listing, ...existing]));
    window.dispatchEvent(new Event("aurelia-listings-updated"));
  } catch {
    // ignore
  }
}

export async function publishUserListing(
  listingData: Omit<Listing, "id">
): Promise<Listing> {
  const cleaned = stripUndefined(listingData);
  const fallbackId = `ul_${Date.now()}`;

  if (isRealFirebaseUser()) {
    const path = "listings";
    try {
      const docRef = await withFirestoreTimeout(
        addDoc(collection(db, "listings"), cleaned)
      );
      const saved: Listing = { ...cleaned, id: docRef.id };
      saveLocalUserListing(saved);
      return saved;
    } catch (error) {
      try {
        handleFirestoreError(error, OperationType.CREATE, path);
      } catch {
        // fallback to local
      }
    }
  }

  const localListing: Listing = { ...cleaned, id: fallbackId };
  saveLocalUserListing(localListing);
  return localListing;
}

export function subscribeUserListings(
  onUpdate: (listings: Listing[]) => void
): () => void {
  const emitMerged = (remote: Listing[]) => {
    const local = getLocalUserListings();
    const map = new Map<string, Listing>();
    for (const item of local) map.set(item.id, item);
    for (const item of remote) map.set(item.id, item);
    onUpdate(Array.from(map.values()).sort((a, b) => b.createdAt - a.createdAt));
  };

  emitMerged([]);

  const handleLocalEvent = () => emitMerged([]);
  if (typeof window !== "undefined") {
    window.addEventListener("aurelia-listings-updated", handleLocalEvent);
  }

  let unsubFirestore: (() => void) | null = null;
  // Only attach onSnapshot if user is authenticated with Firebase Auth
  if (isRealFirebaseUser()) {
    try {
      const q = query(collection(db, "listings"), where("source", "==", "user"));
      unsubFirestore = onSnapshot(
        q,
        (snapshot) => {
          const remote: Listing[] = snapshot.docs.map((d) => ({
            ...(d.data() as Omit<Listing, "id">),
            id: d.id,
          }));
          emitMerged(remote);
        },
        (error) => {
          try {
            handleFirestoreError(error, OperationType.LIST, "listings");
          } catch {
            emitMerged([]);
          }
        }
      );
    } catch {
      // ignore if offline
    }
  }

  return () => {
    if (typeof window !== "undefined") {
      window.removeEventListener("aurelia-listings-updated", handleLocalEvent);
    }
    if (unsubFirestore) unsubFirestore();
  };
}

// ---------- Households ----------
export function getLocalHousehold(): Household | null {
  if (typeof window === "undefined") return null;
  try {
    const raw = localStorage.getItem(LS_HOUSEHOLD_KEY);
    return raw ? (JSON.parse(raw) as Household) : null;
  } catch {
    return null;
  }
}

export function saveLocalHousehold(household: Household): void {
  if (typeof window === "undefined") return;
  try {
    localStorage.setItem(LS_HOUSEHOLD_KEY, JSON.stringify(household));
    window.dispatchEvent(new Event("aurelia-household-updated"));
  } catch {
    // ignore
  }
}

export async function createHouseholdDoc(
  data: Omit<Household, "id">
): Promise<Household> {
  const cleaned = stripUndefined(data);
  const fallbackId = `hh_${Date.now()}`;

  if (isRealFirebaseUser() && auth.currentUser) {
    const path = "households";
    try {
      const payload = { ...cleaned, ownerUid: auth.currentUser.uid };
      const ref = await withFirestoreTimeout(
        addDoc(collection(db, "households"), payload)
      );
      const created: Household = { ...payload, id: ref.id };
      saveLocalHousehold(created);
      return created;
    } catch (error) {
      try {
        handleFirestoreError(error, OperationType.CREATE, path);
      } catch {
        // fallback to local
      }
    }
  }

  const localCreated: Household = { ...cleaned, id: fallbackId };
  saveLocalHousehold(localCreated);
  return localCreated;
}

export async function updateHouseholdDoc(household: Household): Promise<void> {
  const cleaned = stripUndefined(household);
  saveLocalHousehold(cleaned);

  if (isRealFirebaseUser() && !cleaned.id.startsWith("hh_")) {
    const path = `households/${cleaned.id}`;
    try {
      await withFirestoreTimeout(
        updateDoc(doc(db, "households", cleaned.id), {
          expenses: cleaned.expenses,
          chores: cleaned.chores,
          totalRent: cleaned.totalRent,
          members: cleaned.members,
          name: cleaned.name,
        })
      );
    } catch (error) {
      try {
        handleFirestoreError(error, OperationType.UPDATE, path);
      } catch {
        // already updated in localStorage
      }
    }
  }
}

export function subscribeLatestHousehold(
  uid: string,
  onUpdate: (household: Household | null) => void
): () => void {
  const emitLocal = () => {
    onUpdate(getLocalHousehold());
  };

  emitLocal();

  if (typeof window !== "undefined") {
    window.addEventListener("aurelia-household-updated", emitLocal);
  }

  let unsubFirestore: (() => void) | null = null;
  if (isRealFirebaseUser() && auth.currentUser?.uid === uid) {
    try {
      const q = query(collection(db, "households"), where("ownerUid", "==", uid));
      unsubFirestore = onSnapshot(
        q,
        (snapshot) => {
          if (snapshot.empty) {
            emitLocal();
            return;
          }
          const docs: Household[] = snapshot.docs.map((d) => ({
            ...(d.data() as Omit<Household, "id">),
            id: d.id,
          }));
          docs.sort((a, b) => b.createdAt - a.createdAt);
          const newest = docs[0];
          saveLocalHousehold(newest);
          onUpdate(newest);
        },
        (error) => {
          try {
            handleFirestoreError(error, OperationType.LIST, "households");
          } catch {
            emitLocal();
          }
        }
      );
    } catch {
      // fallback to local
    }
  }

  return () => {
    if (typeof window !== "undefined") {
      window.removeEventListener("aurelia-household-updated", emitLocal);
    }
    if (unsubFirestore) unsubFirestore();
  };
}
