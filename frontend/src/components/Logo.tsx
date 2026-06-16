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
      viewBox="0 0 100 100" 
      width={size} 
      height={size} 
      className="flex-shrink-0"
    >
      {/* Connection lines */}
      <line x1="15" y1="15" x2="85" y2="15" stroke="#1e3a8a" strokeWidth="2.5" strokeOpacity={0.25} />
      <line x1="15" y1="85" x2="85" y2="85" stroke="#1e3a8a" strokeWidth="2.5" strokeOpacity={0.25} />
      <line x1="15" y1="15" x2="15" y2="85" stroke="#1e3a8a" strokeWidth="2.5" strokeOpacity={0.25} />
      <line x1="85" y1="15" x2="85" y2="85" stroke="#1e3a8a" strokeWidth="2.5" strokeOpacity={0.25} />
      <line x1="15" y1="15" x2="85" y2="85" stroke="#1e3a8a" strokeWidth="2" strokeOpacity={0.25} />
      <line x1="15" y1="85" x2="85" y2="15" stroke="#1e3a8a" strokeWidth="2" strokeOpacity={0.25} />

      {/* Corner nodes */}
      <circle cx="15" cy="15" r="9" fill="#1e3a8a" fillOpacity={0.7} />
      <circle cx="85" cy="15" r="9" fill="#1e3a8a" fillOpacity={0.7} />
      <circle cx="15" cy="85" r="9" fill="#1e3a8a" fillOpacity={0.7} />
      <circle cx="85" cy="85" r="9" fill="#1e3a8a" fillOpacity={0.7} />

      {/* Central circle badge */}
      <circle cx="50" cy="50" r="23" fill="#1e3a8a" />

      {/* Graduation Cap / Mortarboard */}
      <polygon points="50,38 68,45 50,52 32,45" fill="white" />
      <path d="M38,48.5 V54 C38,57.5 43,60 50,60 C57,60 62,57.5 62,54 V48.5 Q50,52 38,48.5 Z" fill="white" />
      <path d="M50,45 L64,49 V56" stroke="white" strokeWidth="1.5" fill="none" strokeLinecap="round" strokeLinejoin="round" />
      <circle cx="64" cy="57.5" r="1.5" fill="white" />
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
