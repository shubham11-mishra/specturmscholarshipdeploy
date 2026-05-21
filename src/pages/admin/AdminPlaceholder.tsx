import { Card } from "@/components/ui/card";

const AdminPlaceholder = ({ title, description }: { title: string; description: string }) => (
  <Card className="p-8 text-center">
    <h2 className="text-xl font-bold mb-2">{title}</h2>
    <p className="text-muted-foreground text-sm max-w-md mx-auto">{description}</p>
    <p className="text-xs text-muted-foreground mt-4">Coming soon.</p>
  </Card>
);

export default AdminPlaceholder;
