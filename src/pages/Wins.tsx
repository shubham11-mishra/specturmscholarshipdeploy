import { useEffect, useState } from "react";
import { Link, useNavigate } from "react-router-dom";
import { Loader2, Trophy, Sparkles, ExternalLink } from "lucide-react";
import { toast } from "sonner";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/hooks/useAuth";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { Textarea } from "@/components/ui/textarea";

type WinRow = {
  id: string;
  scholarship_id: string;
  outcome_at: string | null;
  testimonial: string | null;
  testimonial_visible_to_spectrum: boolean;
  scholarship?: {
    program_name: string | null;
    school_name: string;
    value_aud: string | null;
    scholarship_url: string | null;
  } | null;
};

const Wins = () => {
  const { user, loading: authLoading, fullName } = useAuth();
  const navigate = useNavigate();
  const [wins, setWins] = useState<WinRow[]>([]);
  const [loading, setLoading] = useState(true);
  const [editing, setEditing] = useState<Record<string, { text: string; share: boolean }>>({});

  useEffect(() => {
    if (!authLoading && !user) navigate("/sign-in");
  }, [authLoading, user, navigate]);

  useEffect(() => {
    if (!user) return;
    (async () => {
      setLoading(true);
      const { data } = await supabase
        .from("applications")
        .select("id, scholarship_id, outcome_at, testimonial, testimonial_visible_to_spectrum")
        .eq("user_id", user.id)
        .eq("outcome", "won")
        .order("outcome_at", { ascending: false });
      const rows = (data ?? []) as WinRow[];
      const ids = [...new Set(rows.map((r) => r.scholarship_id))];
      if (ids.length) {
        const { data: schs } = await supabase
          .from("scholarships")
          .select("id, program_name, school_name, value_aud, scholarship_url")
          .in("id", ids);
        const map = new Map((schs ?? []).map((s: any) => [s.id, s]));
        rows.forEach((r) => (r.scholarship = map.get(r.scholarship_id) ?? null));
      }
      setWins(rows);
      setLoading(false);
    })();
  }, [user]);

  const saveTestimonial = async (id: string) => {
    const draft = editing[id];
    if (!draft) return;
    const { error } = await supabase
      .from("applications")
      .update({ testimonial: draft.text, testimonial_visible_to_spectrum: draft.share })
      .eq("id", id);
    if (error) {
      toast.error("Could not save");
      return;
    }
    setWins((cur) =>
      cur.map((w) =>
        w.id === id
          ? { ...w, testimonial: draft.text, testimonial_visible_to_spectrum: draft.share }
          : w,
      ),
    );
    setEditing((cur) => {
      const { [id]: _, ...rest } = cur;
      return rest;
    });
    toast.success("Testimonial saved");
  };

  const totalValue = wins.reduce((sum, w) => {
    const v = parseFloat((w.scholarship?.value_aud || "").replace(/[^0-9.]/g, ""));
    return sum + (isNaN(v) ? 0 : v);
  }, 0);

  if (authLoading || loading) {
    return (
      <div className="min-h-screen bg-background">

        <div className="pt-2 flex items-center justify-center text-muted-foreground">
          <Loader2 className="w-5 h-5 animate-spin mr-2" /> Loading wins…
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-background">

      <main className="pt-2 pb-20 max-w-6xl mx-auto px-4 md:px-8">
        <div className="text-center mb-10">
          <Trophy className="w-14 h-14 mx-auto text-amber-500 mb-3" />
          <h1 className="font-serif text-4xl md:text-5xl font-bold">Trophy Room</h1>
          <p className="text-muted-foreground mt-2">
            {fullName ? `${fullName}'s` : "Your"} opportunity wins.
          </p>
        </div>

        {wins.length > 0 && (
          <div className="grid grid-cols-3 gap-4 mb-8 max-w-2xl mx-auto">
            <Card className="p-4 text-center">
              <div className="text-3xl font-bold text-primary">{wins.length}</div>
              <div className="text-xs text-muted-foreground uppercase tracking-wider mt-1">Wins</div>
            </Card>
            <Card className="p-4 text-center">
              <div className="text-3xl font-bold text-primary">
                ${totalValue.toLocaleString()}
              </div>
              <div className="text-xs text-muted-foreground uppercase tracking-wider mt-1">Estimated value</div>
            </Card>
            <Card className="p-4 text-center">
              <div className="text-3xl font-bold text-primary">
                {wins.filter((w) => w.testimonial).length}
              </div>
              <div className="text-xs text-muted-foreground uppercase tracking-wider mt-1">Stories shared</div>
            </Card>
          </div>
        )}

        {wins.length === 0 ? (
          <Card className="p-10 text-center">
            <Sparkles className="w-10 h-10 mx-auto text-primary mb-3" />
            <h3 className="font-serif text-2xl font-bold mb-1">Your first trophy is waiting</h3>
            <p className="text-muted-foreground mb-4">
              Mark an application as <strong>Won</strong> in the Applications Hub and it'll show up here.
            </p>
            <Button asChild className="gradient-brand text-primary-foreground">
              <Link to="/applications">Open Applications Hub</Link>
            </Button>
          </Card>
        ) : (
          <div className="space-y-4">
            {wins.map((w) => {
              const draft = editing[w.id];
              const isEditing = !!draft;
              return (
                <Card key={w.id} className="p-6">
                  <div className="flex items-start gap-4">
                    <div className="w-14 h-14 rounded-full bg-amber-100 flex items-center justify-center shrink-0">
                      <Trophy className="w-7 h-7 text-amber-500" />
                    </div>
                    <div className="flex-1 min-w-0">
                      <div className="flex items-start justify-between gap-3 flex-wrap">
                        <div>
                          <h2 className="font-serif text-xl font-bold">
                            {w.scholarship?.program_name || w.scholarship?.school_name || "Opportunity"}
                          </h2>
                          {w.scholarship?.program_name && (
                            <div className="text-sm text-muted-foreground">{w.scholarship.school_name}</div>
                          )}
                        </div>
                        <div className="text-right">
                          {w.scholarship?.value_aud && (
                            <div className="font-bold text-primary">${w.scholarship.value_aud}</div>
                          )}
                          {w.outcome_at && (
                            <div className="text-xs text-muted-foreground">
                              Won {new Date(w.outcome_at).toLocaleDateString()}
                            </div>
                          )}
                        </div>
                      </div>

                      <div className="mt-4">
                        {isEditing ? (
                          <div className="space-y-2">
                            <Textarea
                              value={draft.text}
                              onChange={(e) =>
                                setEditing((c) => ({ ...c, [w.id]: { ...draft, text: e.target.value } }))
                              }
                              placeholder="What helped you win? Share advice for other students…"
                              rows={4}
                            />
                            <label className="flex items-center gap-2 text-xs text-muted-foreground">
                              <input
                                type="checkbox"
                                checked={draft.share}
                                onChange={(e) =>
                                  setEditing((c) => ({ ...c, [w.id]: { ...draft, share: e.target.checked } }))
                                }
                              />
                              Allow Spectrum to feature this anonymously
                            </label>
                            <div className="flex gap-2">
                              <Button size="sm" onClick={() => saveTestimonial(w.id)} className="gradient-brand text-primary-foreground">
                                Save
                              </Button>
                              <Button size="sm" variant="ghost" onClick={() => setEditing((c) => { const { [w.id]: _, ...rest } = c; return rest; })}>
                                Cancel
                              </Button>
                            </div>
                          </div>
                        ) : w.testimonial ? (
                          <div>
                            <blockquote className="text-sm italic text-foreground/90 border-l-2 border-primary pl-3">
                              "{w.testimonial}"
                            </blockquote>
                            <div className="flex items-center gap-3 mt-2 text-xs text-muted-foreground">
                              {w.testimonial_visible_to_spectrum && <span>✓ Shared with Spectrum</span>}
                              <button
                                onClick={() =>
                                  setEditing((c) => ({
                                    ...c,
                                    [w.id]: { text: w.testimonial || "", share: w.testimonial_visible_to_spectrum },
                                  }))
                                }
                                className="text-primary hover:underline"
                              >
                                Edit
                              </button>
                            </div>
                          </div>
                        ) : (
                          <Button
                            size="sm"
                            variant="outline"
                            onClick={() => setEditing((c) => ({ ...c, [w.id]: { text: "", share: false } }))}
                          >
                            + Add your story
                          </Button>
                        )}
                      </div>

                      {w.scholarship?.scholarship_url && (
                        <a
                          href={w.scholarship.scholarship_url}
                          target="_blank"
                          rel="noopener"
                          className="inline-flex items-center gap-1 text-xs text-primary mt-3 hover:underline"
                        >
                          <ExternalLink className="w-3 h-3" /> Source page
                        </a>
                      )}
                    </div>
                  </div>
                </Card>
              );
            })}
          </div>
        )}
      </main>
    </div>
  );
};

export default Wins;
