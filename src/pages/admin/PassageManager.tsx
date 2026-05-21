import { useEffect, useState } from "react";
import { Card } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Skeleton } from "@/components/ui/skeleton";
import { supabase } from "@/integrations/supabase/client";
import { toast } from "sonner";
import ConfirmDialog from "@/components/ConfirmDialog";
import { Plus, Trash2, Save } from "lucide-react";

type Passage = {
  id: string;
  title: string;
  passage_text: string;
  subject: string | null;
  year_band: string | null;
};

export default function PassageManager() {
  const [items, setItems] = useState<Passage[]>([]);
  const [loading, setLoading] = useState(true);
  const [editing, setEditing] = useState<Passage | null>(null);

  const load = async () => {
    setLoading(true);
    const { data } = await supabase.from("assessment_passages").select("*").order("updated_at", { ascending: false });
    setItems((data ?? []) as Passage[]);
    setLoading(false);
  };
  useEffect(() => { load(); }, []);

  const newPassage = () => setEditing({ id: "", title: "", passage_text: "", subject: "english", year_band: "6-8" });

  const save = async () => {
    if (!editing) return;
    if (!editing.title.trim() || !editing.passage_text.trim()) {
      toast.error("Title and text are required");
      return;
    }
    const payload = { title: editing.title, passage_text: editing.passage_text, subject: editing.subject, year_band: editing.year_band };
    const res = editing.id
      ? await supabase.from("assessment_passages").update(payload).eq("id", editing.id)
      : await supabase.from("assessment_passages").insert(payload);
    if (res.error) { toast.error(res.error.message); return; }
    toast.success(editing.id ? "Passage updated" : "Passage created");
    setEditing(null);
    load();
  };

  const remove = async (id: string) => {
    const { error } = await supabase.from("assessment_passages").delete().eq("id", id);
    if (error) { toast.error(error.message); return; }
    toast.success("Passage deleted");
    load();
  };

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between">
        <div>
          <h2 className="text-lg font-bold">Reading Passages</h2>
          <p className="text-xs text-muted-foreground">Reusable text linked to one or more questions.</p>
        </div>
        <Button onClick={newPassage}><Plus className="w-4 h-4 mr-1" /> New passage</Button>
      </div>

      {editing && (
        <Card className="p-4 space-y-3 border-primary">
          <Input placeholder="Title" value={editing.title} onChange={e => setEditing({ ...editing, title: e.target.value })} />
          <div className="grid grid-cols-2 gap-3">
            <select className="h-10 rounded-md border bg-background px-3 text-sm" value={editing.subject ?? ""} onChange={e => setEditing({ ...editing, subject: e.target.value })}>
              <option value="english">English</option>
              <option value="maths">Maths</option>
            </select>
            <Input placeholder="Year band (e.g. 6-8)" value={editing.year_band ?? ""} onChange={e => setEditing({ ...editing, year_band: e.target.value })} />
          </div>
          <Textarea rows={8} placeholder="Passage text…" value={editing.passage_text} onChange={e => setEditing({ ...editing, passage_text: e.target.value })} />
          <div className="flex gap-2">
            <Button onClick={save}><Save className="w-4 h-4 mr-1" /> Save</Button>
            <Button variant="outline" onClick={() => setEditing(null)}>Cancel</Button>
          </div>
        </Card>
      )}

      <Card className="divide-y">
        {loading ? Array.from({ length: 3 }).map((_, i) => <div key={i} className="p-4"><Skeleton className="h-16" /></div>) : (
          items.length === 0 ? (
            <div className="p-10 text-center text-sm text-muted-foreground">No passages yet. Create one to get started.</div>
          ) : items.map(p => (
            <div key={p.id} className="p-4 flex items-start gap-3">
              <div className="flex-1 min-w-0">
                <div className="flex items-center gap-2">
                  <h3 className="font-semibold">{p.title}</h3>
                  {p.subject && <Badge variant="outline" className="text-[10px]">{p.subject}</Badge>}
                  {p.year_band && <Badge variant="outline" className="text-[10px]">{p.year_band}</Badge>}
                </div>
                <p className="text-xs text-muted-foreground mt-1 line-clamp-2">{p.passage_text}</p>
              </div>
              <Button variant="ghost" size="sm" onClick={() => setEditing(p)}>Edit</Button>
              <ConfirmDialog
                trigger={<Button variant="ghost" size="sm" className="text-destructive"><Trash2 className="w-4 h-4" /></Button>}
                title="Delete passage?"
                description="Questions linked to this passage will lose their reading context."
                confirmLabel="Delete"
                variant="destructive"
                onConfirm={() => remove(p.id)}
              />
            </div>
          ))
        )}
      </Card>
    </div>
  );
}
