import { Link } from "react-router-dom";
import { Card } from "@/components/ui/card";
import { FileQuestion, BookOpen, Users, Trophy, Wrench } from "lucide-react";

const tiles = [
  { label: "Assessment Editor", path: "/admin/assessments", icon: Wrench, desc: "Create, edit, import and preview assessment questions." },
  { label: "Question Bank", path: "/admin/questions", icon: FileQuestion, desc: "Browse and search every published and draft question." },
  { label: "Passage Manager", path: "/admin/passages", icon: BookOpen, desc: "Reusable reading passages linked to multiple questions." },
  { label: "User Management", path: "/admin/users", icon: Users, desc: "Manage roles and platform access." },
  { label: "Gamification Settings", path: "/admin/gamification", icon: Trophy, desc: "Tune points, badges and Readiness rewards." },
];

const AdminDashboard = () => {
  return (
    <div className="space-y-6">
      <div>
        <h2 className="text-2xl font-bold">Welcome, admin</h2>
        <p className="text-muted-foreground text-sm">Manage the Spectrum platform from one place.</p>
      </div>
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
        {tiles.map((t) => (
          <Link key={t.path} to={t.path} className="no-underline">
            <Card className="p-5 h-full hover:shadow-md transition-shadow">
              <div className="flex items-start gap-3">
                <div className="w-10 h-10 rounded-lg bg-primary/10 flex items-center justify-center text-primary">
                  <t.icon className="w-5 h-5" />
                </div>
                <div>
                  <h3 className="font-semibold text-foreground">{t.label}</h3>
                  <p className="text-xs text-muted-foreground mt-1">{t.desc}</p>
                </div>
              </div>
            </Card>
          </Link>
        ))}
      </div>
    </div>
  );
};

export default AdminDashboard;
