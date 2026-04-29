interface CompassMarkProps {
  size?: number;
  /** Unique id suffix per instance to avoid SVG defs collisions */
  id?: string;
  className?: string;
}

/** Spectrum compass mark — silver metallic 8-point compass with purple grad cap + teal tassel.
 *  Source: Spectrum Brand Kit (v2). */
const CompassMark = ({ size = 48, id = "c", className }: CompassMarkProps) => {
  const g = `cm_${id}`;
  return (
    <svg
      width={size}
      height={size}
      viewBox="0 0 200 200"
      fill="none"
      xmlns="http://www.w3.org/2000/svg"
      className={className}
      aria-hidden="true"
    >
      <defs>
        <linearGradient id={`${g}s`} x1="10%" y1="0%" x2="90%" y2="100%">
          <stop offset="0%" stopColor="#6e6e6e" />
          <stop offset="12.5%" stopColor="#b2b2b2" />
          <stop offset="25%" stopColor="#d6d6d6" />
          <stop offset="37.5%" stopColor="#eeeeee" />
          <stop offset="50%" stopColor="#ffffff" />
          <stop offset="62.5%" stopColor="#e6e6e6" />
          <stop offset="75%" stopColor="#cccccc" />
          <stop offset="87.5%" stopColor="#adadad" />
          <stop offset="100%" stopColor="#7a7a7a" />
        </linearGradient>
        <linearGradient id={`${g}n`} x1="50%" y1="0%" x2="50%" y2="100%">
          <stop offset="0%" stopColor="#fff" />
          <stop offset="100%" stopColor="#d8d8d8" />
        </linearGradient>
        <radialGradient id={`${g}h`} cx="38%" cy="32%" r="68%">
          <stop offset="0%" stopColor="#fff" />
          <stop offset="55%" stopColor="#ccc" />
          <stop offset="100%" stopColor="#808080" />
        </radialGradient>
        <linearGradient id={`${g}sh`} x1="0%" y1="0%" x2="60%" y2="100%">
          <stop offset="0%" stopColor="rgba(255,255,255,0.28)" />
          <stop offset="100%" stopColor="rgba(0,0,0,0.10)" />
        </linearGradient>
        <filter id={`${g}f`} x="-20%" y="-20%" width="140%" height="140%">
          <feDropShadow dx="0" dy="1.5" stdDeviation="2.5" floodColor="rgba(0,0,0,0.35)" />
        </filter>
      </defs>
      {/* cardinal points */}
      <polygon points="100,182 108.5,153 100,124 91.5,153" fill={`url(#${g}s)`} filter={`url(#${g}f)`} />
      <polygon points="182,100 153,108.5 124,100 153,91.5" fill={`url(#${g}s)`} filter={`url(#${g}f)`} />
      <polygon points="18,100 47,108.5 76,100 47,91.5" fill={`url(#${g}s)`} filter={`url(#${g}f)`} />
      {/* diagonal points */}
      <polygon points="139,61 124.5,68 117,83 131.5,75.5" fill={`url(#${g}s)`} />
      <polygon points="139,139 131.5,124.5 117,117 124.5,131.5" fill={`url(#${g}s)`} />
      <polygon points="61,139 75.5,131.5 83,117 68,124.5" fill={`url(#${g}s)`} />
      <polygon points="61,61 68,75.5 83,83 75.5,68.5" fill={`url(#${g}s)`} />
      {/* north star */}
      <polygon points="100,18 108.5,47 100,76 91.5,47" fill={`url(#${g}n)`} filter={`url(#${g}f)`} />
      {/* highlights */}
      <polygon points="100,182 108.5,153 100,124 91.5,153" fill={`url(#${g}sh)`} />
      <polygon points="182,100 153,108.5 124,100 153,91.5" fill={`url(#${g}sh)`} />
      <polygon points="18,100 47,108.5 76,100 47,91.5" fill={`url(#${g}sh)`} />
      {/* hub */}
      <circle cx="100" cy="100" r="23" fill={`url(#${g}h)`} />
      <circle cx="100" cy="100" r="23" fill="none" stroke="rgba(255,255,255,0.55)" strokeWidth="0.7" />
      <circle cx="100" cy="100" r="23" fill={`url(#${g}sh)`} />
      {/* purple grad cap */}
      <rect x="90" y="90" width="20" height="20" rx="1.5" transform="rotate(45 100 100)" fill="#7B2D8E" />
      <rect x="94" y="99.5" width="12" height="7.5" rx="2" fill="#7B2D8E" />
      {/* teal tassel */}
      <circle cx="107" cy="93" r="2.2" fill="#2EC4B6" />
      <path d="M107,95 Q105.5,102 103.5,108.5" stroke="#2EC4B6" strokeWidth="1.7" strokeLinecap="round" fill="none" />
      <rect x="101" y="107" width="5" height="3.5" rx="1" fill="#2EC4B6" />
      {/* glint */}
      <ellipse cx="96" cy="95" rx="5" ry="3.5" fill="rgba(255,255,255,0.30)" transform="rotate(-30 96 95)" />
    </svg>
  );
};

export default CompassMark;
