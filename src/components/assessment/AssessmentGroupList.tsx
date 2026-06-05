import { useEffect, useState } from "react";
import { Card, CardContent } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Skeleton } from "@/components/ui/skeleton";
import { BookOpen, Calculator } from "lucide-react";
import {
  getAssessmentGroups, type AssessmentGroup, type AssessmentSubjectBlock,
} from "@/lib/assessmentGroups";
import { SUBJECT_THEME, type Subject } from "@/lib/assessment";

interface Props {
  /** Student view: hide bands that have no published questions. Admin view: pass false. */
  publishedOnly?: boolean;
  /** Admin view: always render every band even if it has 0 questions. */
  includeEmpty?: boolean;
  /** What happens when a group card is clicked. */
  onSelect: (group: AssessmentGroup) => void;
  /** Optional: show counts (admin verification). */
  showCounts?: boolean;
}

const SUBJECT_ICON: Record<Subject, any> = { english: BookOpen, maths: Calculator };

export default function AssessmentGroupList({ publishedOnly, includeEmpty, onSelect, showCounts }: Props) {
  const [blocks, setBlocks] = useState<AssessmentSubjectBlock[] | null>(null);

  useEffect(() => {
    getAssessmentGroups({ publishedOnly, includeEmpty }).then(setBlocks);
  }, [publishedOnly, includeEmpty]);

  if (!blocks) {
    return (
      <div className="space-y-8">
        {[0, 1].map(i => (
          <div key={i} className="space-y-3">
            <Skeleton className="h-7 w-48" />
            <div className="grid sm:grid-cols-2 lg:grid-cols-3 gap-3">
              {Array.from({ length: 6 }).map((_, j) => <Skeleton key={j} className="h-24" />)}
            </div>
          </div>
        ))}
      </div>
    );
  }

  return (
    <div className="space-y-10">
      {blocks.map(block => {
        const theme = SUBJECT_THEME[block.subject];
        const Icon = SUBJECT_ICON[block.subject];
        return (
          <section key={block.subject} className="space-y-4">
            <div className="flex items-center gap-3">
              <div
                className="w-10 h-10 rounded-xl flex items-center justify-center"
                style={{ background: `${theme.color}15` }}
              >
                <Icon className="w-5 h-5" style={{ color: theme.color }} />
              </div>
              <h2 className="text-xl font-display font-bold" style={{ color: theme.color }}>
                {block.title}
              </h2>
              {showCounts && (
                <Badge variant="outline" className="ml-auto text-xs">
                  {block.groups.length} group{block.groups.length === 1 ? "" : "s"}
                </Badge>
              )}
            </div>

            {block.groups.length === 0 ? (
              <p className="text-sm text-muted-foreground italic">
                No assessments available yet.
              </p>
            ) : (
              <div className="grid sm:grid-cols-2 lg:grid-cols-3 gap-3">
                {block.groups.map(g => (
                  <Card
                    key={`${g.subject}-${g.year_band}`}
                    onClick={() => onSelect(g)}
                    className="card-shine cursor-pointer border-2 hover:shadow-lg transition-all"
                    style={{ borderColor: `${theme.color}22` }}
                  >
                    <CardContent className="p-4 space-y-2">
                      <div className="font-semibold leading-tight">{g.label}</div>
                      {showCounts ? (
                        <div className="flex flex-wrap gap-1.5 text-[11px]">
                          <Badge variant="outline">{g.sectionCount} section{g.sectionCount === 1 ? "" : "s"}</Badge>
                          <Badge variant="outline">{g.questionCount} question{g.questionCount === 1 ? "" : "s"}</Badge>
                          <Badge
                            className={g.publishedCount === g.questionCount && g.questionCount > 0
                              ? "bg-emerald-100 text-emerald-900 hover:bg-emerald-100"
                              : "bg-amber-100 text-amber-900 hover:bg-amber-100"}
                          >
                            {g.publishedCount} published
                          </Badge>
                        </div>
                      ) : (
                        <div className="text-xs text-muted-foreground">
                          {g.publishedCount} question{g.publishedCount === 1 ? "" : "s"}
                        </div>
                      )}
                    </CardContent>
                  </Card>
                ))}
              </div>
            )}
          </section>
        );
      })}
    </div>
  );
}
