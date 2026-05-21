import { useState } from "react";
import { HelpCircle } from "lucide-react";
import OnboardingTour from "./OnboardingTour";
import { Tooltip, TooltipContent, TooltipTrigger } from "@/components/ui/tooltip";

const HelpButton = () => {
  const [open, setOpen] = useState(false);
  return (
    <>
      <Tooltip>
        <TooltipTrigger asChild>
          <button
            onClick={() => setOpen(true)}
            aria-label="Replay site tour"
            className="text-muted-foreground hover:text-foreground transition"
          >
            <HelpCircle className="w-5 h-5" />
          </button>
        </TooltipTrigger>
        <TooltipContent>Take the site tour</TooltipContent>
      </Tooltip>
      {open && <OnboardingTour forceOpen onClose={() => setOpen(false)} />}
    </>
  );
};

export default HelpButton;
