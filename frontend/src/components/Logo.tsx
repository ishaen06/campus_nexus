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
      viewBox="58 70 84 62" 
      style={{ width: size, height: size }}
      className="flex-shrink-0 object-contain animate-fade-in"
    >
      <defs>
        <linearGradient id="logo-cap-gradient" x1="0%" y1="0%" x2="100%" y2="100%">
          <stop offset="0%" stopColor="#4f46e5" />
          <stop offset="100%" stopColor="#3b82f6" />
        </linearGradient>
      </defs>
      
      {/* Tassel stroke and fringe */}
      <path 
        d="M 129,91.5 L 129,112 C 129,114 126.5,115.5 126.5,118" 
        fill="none" 
        stroke="url(#logo-cap-gradient)" 
        strokeWidth="2.5" 
        strokeLinecap="round" 
      />
      <polygon 
        points="124.5,118 128.5,118 130,127 123,127" 
        fill="url(#logo-cap-gradient)" 
      />

      {/* Main skull cap skull-band */}
      <path 
        d="M 74,96 L 74,110 C 74,118 100,123 100,123 C 100,123 126,118 126,110 L 126,96" 
        fill="url(#logo-cap-gradient)" 
      />

      {/* Top diamond shape board */}
      <polygon 
        points="100,75 136,90 100,105 64,90" 
        fill="url(#logo-cap-gradient)" 
      />
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
