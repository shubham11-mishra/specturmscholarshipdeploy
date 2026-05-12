import { ELEMENT_JOURNEY, BAND_CUTOFFS, bandForScore, type BandKey } from "@/lib/readiness";

interface Props {
  score: number;
}

const ElementJourney = ({ score }: Props) => {
  const current = bandForScore(score);
  return (
    <div className="rounded-3xl bg-card border border-border/60 p-5 md:p-6 shadow-sm">
      <div className="flex items-center justify-between mb-4">
        <div>
          <div className="text-[11px] font-bold tracking-[0.14em] uppercase text-muted-foreground">
            Five-Element Journey
          </div>
          <div className="font-display font-bold text-foreground text-lg mt-0.5">
            Readiness score · <span style={{ color: current.color }}>{score}/100</span>
          </div>
        </div>
        <div
          className="text-[11px] font-bold uppercase tracking-wider px-3 py-1.5 rounded-full text-white"
          style={{ background: current.color }}
        >
          You are here
        </div>
      </div>
      <div className="grid grid-cols-5 gap-2">
        {ELEMENT_JOURNEY.map((el) => {
          const isCurrent = el.key === current.key;
          const band = BAND_CUTOFFS[el.key as BandKey];
          return (
            <div
              key={el.key}
              className="rounded-2xl p-3 text-center transition border"
              style={{
                background: isCurrent ? band.color : "transparent",
                borderColor: isCurrent ? band.color : "hsl(var(--border))",
                color: isCurrent ? "white" : "hsl(var(--foreground))",
              }}
            >
              <div className="text-2xl mb-1">{band.emoji}</div>
              <div className="font-display font-bold text-sm">{band.label}</div>
              <div
                className={`text-[10px] uppercase tracking-wider mt-0.5 ${
                  isCurrent ? "text-white/85" : "text-muted-foreground"
                }`}
              >
                {el.action}
              </div>
              <div className={`text-[10px] mt-1 ${isCurrent ? "text-white/85" : "text-muted-foreground"}`}>
                {band.min}–{band.max}
              </div>
            </div>
          );
        })}
      </div>
    </div>
  );
};

export default ElementJourney;
