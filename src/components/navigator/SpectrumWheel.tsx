import { Radar, RadarChart, PolarGrid, PolarAngleAxis, PolarRadiusAxis, ResponsiveContainer, Legend } from "recharts";
import { WHEEL_DIMENSIONS, type WheelScores } from "@/lib/navigator";

interface Props {
  selfScores: WheelScores;
  verifiedScores?: Partial<WheelScores>;
}

const SpectrumWheel = ({ selfScores, verifiedScores }: Props) => {
  const data = WHEEL_DIMENSIONS.map((d) => ({
    dim: `${d.emoji} ${d.label}`,
    self: selfScores[d.key] ?? 0,
    verified: verifiedScores?.[d.key] ?? 0,
  }));

  const hasVerified = Object.values(verifiedScores ?? {}).some((v) => (v ?? 0) > 0);

  return (
    <div className="w-full h-[360px] md:h-[440px]">
      <ResponsiveContainer width="100%" height="100%">
        <RadarChart data={data} outerRadius="78%">
          <PolarGrid stroke="hsl(var(--border))" />
          <PolarAngleAxis dataKey="dim" tick={{ fill: "hsl(var(--foreground))", fontSize: 12 }} />
          <PolarRadiusAxis angle={90} domain={[0, 10]} tick={{ fill: "hsl(var(--muted-foreground))", fontSize: 10 }} />
          <Radar
            name="Self-rated"
            dataKey="self"
            stroke="hsl(var(--primary))"
            fill="hsl(var(--primary))"
            fillOpacity={0.35}
          />
          {hasVerified && (
            <Radar
              name="Verified"
              dataKey="verified"
              stroke="hsl(var(--accent))"
              fill="hsl(var(--accent))"
              fillOpacity={0}
              strokeWidth={2}
              strokeDasharray="4 3"
            />
          )}
          <Legend wrapperStyle={{ fontSize: 12 }} />
        </RadarChart>
      </ResponsiveContainer>
    </div>
  );
};

export default SpectrumWheel;
