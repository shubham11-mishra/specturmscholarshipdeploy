import { Info } from "lucide-react";
import { Tooltip, TooltipContent, TooltipTrigger } from "@/components/ui/tooltip";

interface Props {
  content: React.ReactNode;
  className?: string;
}

/** Small (?) icon with a hover tooltip — for explaining complex feature labels inline. */
const InfoTip = ({ content, className }: Props) => (
  <Tooltip>
    <TooltipTrigger asChild>
      <button
        type="button"
        aria-label="More info"
        className={`inline-flex items-center text-muted-foreground hover:text-foreground transition align-middle ${className ?? ""}`}
      >
        <Info className="w-3.5 h-3.5" />
      </button>
    </TooltipTrigger>
    <TooltipContent className="max-w-xs text-xs leading-relaxed">{content}</TooltipContent>
  </Tooltip>
);

export default InfoTip;
