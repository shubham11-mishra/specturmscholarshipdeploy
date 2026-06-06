import { createContext, useContext, useEffect, useState, ReactNode } from "react";
import { supabase } from "@/integrations/supabase/client";
import type { User, Session } from "@supabase/supabase-js";
import { toast } from "sonner";
import { ensureWheelScoresForUser } from "@/lib/wheelScores";
import { ensureOwnProfile } from "@/lib/userProfile";

interface UserLocation {
  state: string | null;
  postcode: string | null;
  suburb: string | null;
}

interface SignupProfile {
  gender: string | null;
  preferredSectors: string[];
  scholarshipCategories: string[];
  applyingYearLevel: number | null;
}

interface AuthContextType {
  user: User | null;
  session: Session | null;
  loading: boolean;
  interests: string[];
  location: UserLocation;
  yearLevel: string | null;
  fullName: string | null;
  profile: SignupProfile;
  signOut: () => Promise<void>;
  refreshInterests: () => Promise<void>;
}

const EMPTY_PROFILE: SignupProfile = {
  gender: null,
  preferredSectors: [],
  scholarshipCategories: [],
  applyingYearLevel: null,
};

const AuthContext = createContext<AuthContextType>({
  user: null,
  session: null,
  loading: true,
  interests: [],
  location: { state: null, postcode: null, suburb: null },
  yearLevel: null,
  fullName: null,
  profile: EMPTY_PROFILE,
  signOut: async () => {},
  refreshInterests: async () => {},
});

export const useAuth = () => useContext(AuthContext);

export const AuthProvider = ({ children }: { children: ReactNode }) => {
  const [user, setUser] = useState<User | null>(null);
  const [session, setSession] = useState<Session | null>(null);
  const [loading, setLoading] = useState(true);
  const [interests, setInterests] = useState<string[]>([]);
  const [location, setLocation] = useState<UserLocation>({ state: null, postcode: null, suburb: null });
  const [yearLevel, setYearLevel] = useState<string | null>(null);
  const [fullName, setFullName] = useState<string | null>(null);
  const [profile, setProfile] = useState<SignupProfile>(EMPTY_PROFILE);

  const fetchLocation = async (userId: string, sessionUser?: User) => {
    const { data, error } = await supabase
      .from("profiles")
      .select("state, postcode, suburb, year_level, full_name, gender, preferred_sectors, scholarship_categories, applying_year_level")
      .eq("id", userId)
      .maybeSingle();
    if (error) {
      console.error("Error loading user profile location:", error);
      return;
    }
    const meta = sessionUser?.user_metadata ?? {};
    const pick = (dbVal: any, ...metaKeys: string[]) => {
      if (typeof dbVal === "string" && dbVal.trim()) return dbVal;
      for (const k of metaKeys) {
        const v = (meta as any)[k];
        if (typeof v === "string" && v.trim()) return v;
      }
      return null;
    };
    const metaState = typeof meta.state === "string" ? meta.state.trim() : "";
    const metaPostcode = typeof meta.postcode === "string" ? meta.postcode.trim() : "";
    // Prefer metadata when DB row still holds default placeholders.
    const stateVal = (!data?.state || (data.state === "NSW" && metaState && metaState !== "NSW")) && metaState
      ? metaState
      : (data?.state || metaState || null);
    const postcodeVal = (!data?.postcode || data.postcode === "0000") && metaPostcode && metaPostcode !== "0000"
      ? metaPostcode
      : (data?.postcode || metaPostcode || null);
    setLocation({
      state: stateVal,
      postcode: postcodeVal,
      suburb: pick(data?.suburb, "suburb"),
    });
    setYearLevel(pick(data?.year_level, "year_level"));
    setFullName(pick(data?.full_name, "full_name", "name"));
    setProfile({
      gender: pick(data?.gender, "gender"),
      preferredSectors: Array.isArray(data?.preferred_sectors) ? (data!.preferred_sectors as string[]) : [],
      scholarshipCategories: Array.isArray(data?.scholarship_categories) ? (data!.scholarship_categories as string[]) : [],
      applyingYearLevel: typeof data?.applying_year_level === "number" ? data!.applying_year_level : null,
    });
  };

  const fetchInterests = async (userId: string) => {
    const { data, error } = await supabase
      .from("user_interests")
      .select("category")
      .eq("user_id", userId);

    if (error) {
      console.error("Error loading user interests:", error);
      setInterests([]);
      return [];
    }

    const categories = data?.map((d) => d.category) || [];
    setInterests(categories);
    return categories;
  };

  const syncInterestsFromMetadata = async (sessionUser: User) => {
    const existingInterests = await fetchInterests(sessionUser.id);
    if (existingInterests.length > 0) return;

    const metadataCategories = Array.isArray(sessionUser.user_metadata?.scholarship_categories)
      ? sessionUser.user_metadata.scholarship_categories
      : sessionUser.user_metadata?.interests;
    const metadataInterests = Array.isArray(metadataCategories)
      ? [...new Set(metadataCategories.filter((value): value is string => typeof value === "string" && value.trim().length > 0))]
      : [];

    if (metadataInterests.length === 0) return;

    const { error } = await supabase.from("user_interests").insert(
      metadataInterests.map((category) => ({ user_id: sessionUser.id, category }))
    );

    if (error) {
      console.error("Error syncing user interests:", error);
      return;
    }

    setInterests(metadataInterests);
  };

  const refreshInterests = async () => {
    if (user) await fetchInterests(user.id);
  };

  const ensureUserSetup = (sessionUser: User) => {
    setTimeout(async () => {
      await ensureOwnProfile(sessionUser);
      await fetchLocation(sessionUser.id, sessionUser);
      await syncInterestsFromMetadata(sessionUser);
    }, 0);
    setTimeout(() => ensureWheelScoresForUser(sessionUser.id, sessionUser.user_metadata), 0);
  };

  useEffect(() => {
    const { data: { subscription } } = supabase.auth.onAuthStateChange(
      async (_event, session) => {
        setSession(session);
        setUser(session?.user ?? null);
        if (session?.user) {
          ensureUserSetup(session.user);
        } else {
          setInterests([]);
          setLocation({ state: null, postcode: null, suburb: null });
          setYearLevel(null);
          setFullName(null);
          setProfile(EMPTY_PROFILE);
        }
        setLoading(false);
      }
    );

    supabase.auth.getSession().then(({ data: { session } }) => {
      setSession(session);
      setUser(session?.user ?? null);
      if (session?.user) {
        ensureUserSetup(session.user);
      }
      setLoading(false);
    });

    return () => subscription.unsubscribe();
  }, []);

  const signOut = async () => {
    await supabase.auth.signOut();
    setInterests([]);
    setLocation({ state: null, postcode: null, suburb: null });
    setYearLevel(null);
    setFullName(null);
    setProfile(EMPTY_PROFILE);
    toast.success("Signed out successfully");
  };

  return (
    <AuthContext.Provider value={{ user, session, loading, interests, location, yearLevel, fullName, profile, signOut, refreshInterests }}>
      {children}
    </AuthContext.Provider>
  );
};
