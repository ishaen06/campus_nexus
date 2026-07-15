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
      viewBox="0 0 200 200" 
      style={{ width: size, height: size }}
      className="flex-shrink-0 object-contain"
    >
      {/* Square border lines */}
      <rect 
        x="25" 
        y="25" 
        width="150" 
        height="150" 
        fill="none" 
        className="stroke-[#7f8ca8] dark:stroke-slate-700" 
        strokeWidth="6" 
        strokeLinejoin="round"
      />

      {/* Diagonal lines from corners to center */}
      <line 
        x1="25" 
        y1="25" 
        x2="175" 
        y2="175" 
        className="stroke-[#7f8ca8] dark:stroke-slate-700" 
        strokeWidth="6" 
        strokeLinecap="round"
      />
      <line 
        x1="175" 
        y1="25" 
        x2="25" 
        y2="175" 
        className="stroke-[#7f8ca8] dark:stroke-slate-700" 
        strokeWidth="6" 
        strokeLinecap="round"
      />

      {/* Center Circle Mask Layer */}
      <circle 
        cx="100" 
        cy="100" 
        r="54" 
        className="fill-white dark:fill-slate-950" 
      /> 

      {/* Inner filled circle */}
      <circle 
        cx="100" 
        cy="100" 
        r="50" 
        className="fill-[#1e295d] dark:fill-indigo-500" 
      /> 

      {/* White Graduation Cap in the center */}
      <polygon points="100,75 136,90 100,105 64,90" fill="#ffffff" />
      <path d="M 74,96 L 74,110 C 74,118 100,123 100,123 C 100,123 126,118 126,110 L 126,96" fill="#ffffff" />
      <path d="M 129,91.5 L 129,112 C 129,114 126.5,115.5 126.5,118" fill="none" stroke="#ffffff" strokeWidth="2.5" stroke-linecap="round" />
      <polygon points="124.5,118 128.5,118 130,127 123,127" fill="#ffffff" />

      {/* Corner nodes */}
      <circle cx="25" cy="25" r="14" className="fill-[#1e295d] dark:fill-indigo-500" />
      <circle cx="175" cy="25" r="14" className="fill-[#1e295d] dark:fill-indigo-500" />
      <circle cx="25" cy="175" r="14" className="fill-[#1e295d] dark:fill-indigo-500" />
      <circle cx="175" cy="175" r="14" className="fill-[#1e295d] dark:fill-indigo-500" />
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
