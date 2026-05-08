import SpectrumLayout from "@/components/SpectrumLayout";
import { Card } from "@/components/ui/card";
import { LucideIcon } from "lucide-react";
import { ReactNode } from "react";

export const ComingSoonPage = ({
  title, description, icon: Icon, phase, children,
}: { title: string; description: string; icon: LucideIcon; phase: string; children?: ReactNode }) => (
  <SpectrumLayout>
    <div className="max-w-3xl mx-auto">
      <div className="flex items-center gap-3 mb-2">
        <div className="w-12 h-12 rounded-lg bg-gradient-to-br from-primary to-accent flex items-center justify-center text-primary-foreground">
          <Icon className="w-6 h-6" />
        </div>
        <div>
          <h1 className="font-display text-3xl font-bold">{title}</h1>
          <p className="text-muted-foreground">{description}</p>
        </div>
      </div>
      <Card className="p-8 mt-6 bg-gradient-to-br from-primary/5 to-accent/5 border-dashed">
        <div className="text-xs uppercase tracking-widest text-primary font-semibold mb-2">{phase}</div>
        <h2 className="font-display text-2xl font-semibold mb-2">Coming next</h2>
        {children}
      </Card>
    </div>
  </SpectrumLayout>
);
