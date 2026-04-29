import logoMark from "@/assets/logo-mark.svg";

interface CompassMarkProps {
  size?: number;
  /** kept for backwards-compat; no longer used (real SVG asset is self-contained) */
  id?: string;
  className?: string;
}

const CompassMark = ({ size = 48, className }: CompassMarkProps) => (
  <img
    src={logoMark}
    alt=""
    width={size}
    height={size}
    className={className}
    style={{ display: "block" }}
    draggable={false}
  />
);

export default CompassMark;
