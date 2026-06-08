import { createContext, useContext, useState, useCallback, useEffect, ReactNode } from "react";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/hooks/useAuth";
import { useToast } from "@/hooks/use-toast";

interface ShortlistContextType {
  shortlisted: Set<string>;
  toggle: (id: string) => void;
  isShortlisted: (id: string) => boolean;
  count: number;
  loading: boolean;
}

const ShortlistContext = createContext<ShortlistContextType>({
  shortlisted: new Set(),
  toggle: () => {},
  isShortlisted: () => false,
  count: 0,
  loading: true,
});

export const useShortlist = () => useContext(ShortlistContext);

export const ShortlistProvider = ({ children }: { children: ReactNode }) => {
  const { user } = useAuth();
  const { toast } = useToast();
  const [shortlisted, setShortlisted] = useState<Set<string>>(new Set());
  const [loading, setLoading] = useState(true);

  // Fetch shortlist from database when user changes
  useEffect(() => {
    if (!user) {
      setShortlisted(new Set());
      setLoading(false);
      return;
    }

    const fetchShortlist = async () => {
      setLoading(true);
      const { data, error } = await supabase
        .from("shortlisted_schools")
        .select("school_id")
        .eq("user_id", user.id);
      if (error) {
        console.error("shortlist load error", error);
        toast({
          title: "Could not load shortlist",
          description: "Please refresh and try again.",
          variant: "destructive",
        });
        setShortlisted(new Set());
        setLoading(false);
        return;
      }
      setShortlisted(new Set(data?.map((d) => d.school_id) || []));
      setLoading(false);
    };

    fetchShortlist();
  }, [user, toast]);

  const toggle = useCallback(
    async (id: string) => {
      if (!user) {
        toast({
          title: "Sign in required",
          description: "Please log in or sign up to shortlist scholarships.",
          variant: "destructive",
        });
        return;
      }

      const isCurrentlyShortlisted = shortlisted.has(id);
      const previous = shortlisted;

      // Optimistic update
      setShortlisted((prev) => {
        const next = new Set(prev);
        if (isCurrentlyShortlisted) next.delete(id);
        else next.add(id);
        return next;
      });

      const { error } = isCurrentlyShortlisted
        ? await supabase
          .from("shortlisted_schools")
          .delete()
          .eq("user_id", user.id)
          .eq("school_id", id)
        : await supabase
          .from("shortlisted_schools")
          .upsert({ user_id: user.id, school_id: id }, { onConflict: "user_id,school_id" });

      if (error) {
        console.error("shortlist save error", error);
        setShortlisted(previous);
        toast({
          title: "Could not update shortlist",
          description: error.message || "Please try again.",
          variant: "destructive",
        });
      }
    },
    [user, shortlisted, toast]
  );

  const isShortlisted = useCallback((id: string) => shortlisted.has(id), [shortlisted]);

  return (
    <ShortlistContext.Provider value={{ shortlisted, toggle, isShortlisted, count: shortlisted.size, loading }}>
      {children}
    </ShortlistContext.Provider>
  );
};
