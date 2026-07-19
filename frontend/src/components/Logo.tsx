interface LogoProps {
  className?: string;
  size?: number;
  showText?: boolean;
}

export default function Logo({ 
  className = "", 
  size = 48, 
  showText = false 
}: LogoProps) {
  
  const graphic = (
    <svg 
      xmlns="http://www.w3.org/2000/svg" 
      viewBox="40 40 120 120" 
      style={{ width: size, height: size }}
      className="flex-shrink-0 object-contain animate-fade-in"
    >
      <defs>
        {/* Cap Body Gradient */}
        <linearGradient id="logo-cap-gradient" x1="0%" y1="0%" x2="100%" y2="100%">
          <stop offset="0%" stopColor="#4f46e5" />
          <stop offset="100%" stopColor="#3b82f6" />
        </linearGradient>
        {/* Cap Left Highlight Gradient */}
        <linearGradient id="logo-cap-light" x1="0%" y1="0%" x2="0%" y2="100%">
          <stop offset="0%" stopColor="#6366f1" />
          <stop offset="100%" stopColor="#4f46e5" />
        </linearGradient>
        {/* Tassel Gold Gradient */}
        <linearGradient id="tassel-gold-gradient" x1="0%" y1="0%" x2="100%" y2="100%">
          <stop offset="0%" stopColor="#fbbf24" />
          <stop offset="100%" stopColor="#d97706" />
        </linearGradient>
        {/* Soft Drop Shadow */}
        <filter id="soft-shadow" x="-10%" y="-10%" width="120%" height="120%">
          <feDropShadow dx="0" dy="3" stdDeviation="2.5" floodColor="#0f172a" floodOpacity="0.22" />
        </filter>
      </defs>
      
      {/* Outer Tech Ring */}
      <circle 
        cx="100" 
        cy="100" 
        r="54" 
        fill="none" 
        stroke="url(#logo-cap-gradient)" 
        strokeWidth="1.25" 
        strokeDasharray="4 3" 
        opacity="0.3" 
      />

      {/* Inner Accent Ring */}
      <circle 
        cx="100" 
        cy="100" 
        r="48" 
        fill="none" 
        stroke="url(#logo-cap-gradient)" 
        strokeWidth="0.75" 
        opacity="0.12" 
      />

      {/* Main Cap Group with Shadow */}
      <g filter="url(#soft-shadow)">
        {/* Skull Cap Base */}
        <path 
          d="M 74,96 L 74,110 C 74,118 100,123 100,123 C 100,123 126,118 126,110 L 126,96 Z" 
          fill="url(#logo-cap-gradient)" 
        />
        
        {/* Under-cap shadow line */}
        <path 
          d="M 74,96 C 74,96 100,101 126,96" 
          fill="none" 
          stroke="#000000" 
          strokeWidth="1.25" 
          opacity="0.12" 
        />

        {/* Top Diamond Board - Left Side (Light Highlight) */}
        <polygon 
          points="100,75 100,105 64,90" 
          fill="url(#logo-cap-light)" 
        />

        {/* Top Diamond Board - Right Side (Darker Shadow) */}
        <polygon 
          points="100,75 136,90 100,105" 
          fill="url(#logo-cap-gradient)" 
        />

        {/* Center Button Pivot */}
        <circle 
          cx="100" 
          cy="90" 
          r="3.5" 
          fill="url(#logo-cap-gradient)" 
          stroke="#ffffff" 
          strokeWidth="0.75" 
        />

        {/* Tassel Gold String */}
        <path 
          d="M 100,90 L 129,91.5 L 129,112" 
          fill="none" 
          stroke="url(#tassel-gold-gradient)" 
          strokeWidth="1.75" 
          strokeLinecap="round" 
        />
        <polygon 
          points="125.5,112 132.5,112 134,120.5 124,120.5" 
          fill="url(#tassel-gold-gradient)" 
        />
      </g>
    </svg>
  );

  if (showText) {
    return (
      <div className={`flex flex-col items-center justify-center select-none text-center ${className}`}>
        {graphic}
        {/* Text Lockup */}
        <div className="flex flex-col items-center mt-4">
          <div className="flex items-center gap-2.5">
            <span className="text-3xl font-extrabold tracking-wide leading-none text-[#1e3a8a]">
              Campus
            </span>
            <span className="text-3xl font-black tracking-normal leading-none text-slate-900 dark:text-white">
              Nexus
            </span>
          </div>
          <div className="h-[2px] bg-[#1e3a8a]/30 w-44 my-2.5" />
          <span className="text-[10px] font-black tracking-[0.2em] text-slate-500 dark:text-slate-400 uppercase">
            CONNECT &middot; LEARN &middot; GROW
          </span>
        </div>
      </div>
    );
  }

  return (
    <div className={`flex items-center justify-center select-none ${className}`}>
      {graphic}
    </div>
  );
}
