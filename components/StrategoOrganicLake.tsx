import React from "react";

export interface StrategoOrganicLakeProps {
  lakeId: "west" | "east";
  language?: string;
  isDarkTheme?: boolean;
  className?: string;
  style?: React.CSSProperties;
}

/**
 * StrategoOrganicLake
 * Renders an organic, irregular natural lake illustration to replace the standard grid squares.
 * Features realistic multi-depth water gradients, natural rocky/sandy shorelines,
 * organic inlets and coves, sunlight caustics, and subtle water ripples.
 */
export const StrategoOrganicLake: React.FC<StrategoOrganicLakeProps> = ({
  lakeId,
  language,
  isDarkTheme = false,
  className = "",
  style,
}) => {
  const isWest = lakeId === "west";
  const titleText =
    language === "it"
      ? isWest
        ? "Lago Ovest (Bacino naturale invalicabile)"
        : "Lago Est (Bacino naturale invalicabile)"
      : isWest
      ? "West Lake (Impassable natural water basin)"
      : "East Lake (Impassable natural water basin)";

  return (
    <div
      className={`relative w-full h-full select-none pointer-events-none group ${className}`}
      style={style}
      title={titleText}
    >
      <svg
        viewBox="0 0 200 200"
        className="w-full h-full overflow-visible drop-shadow-[0_4px_12px_rgba(0,0,0,0.85)]"
        shapeRendering="geometricPrecision"
        textRendering="geometricPrecision"
      >
        <defs>
          {/* Outer Sunken Terrain Basin Filter */}
          <filter id={`lakeDepthShadow_${lakeId}`} x="-20%" y="-20%" width="140%" height="140%">
            <feDropShadow dx="0" dy="3" stdDeviation="4" floodColor="#000000" floodOpacity="0.95" />
            <feDropShadow dx="0" dy="-1" stdDeviation="2" floodColor="#083344" floodOpacity="0.6" />
          </filter>

          {/* Shallow to Deep Water Radial Gradient */}
          <radialGradient
            id={`waterGradient_${lakeId}`}
            cx={isWest ? "52%" : "48%"}
            cy={isWest ? "48%" : "52%"}
            r="56%"
            fx={isWest ? "50%" : "46%"}
            fy={isWest ? "44%" : "48%"}
          >
            <stop offset="0%" stopColor="#0284c7" />
            <stop offset="28%" stopColor="#0369a1" />
            <stop offset="62%" stopColor="#0f172a" />
            <stop offset="85%" stopColor="#082f49" />
            <stop offset="100%" stopColor="#0e7490" />
          </radialGradient>

          {/* Shoreline Sandy / Rocky Shelf Gradient */}
          <linearGradient id={`shoreGradient_${lakeId}`} x1="0%" y1="0%" x2="100%" y2="100%">
            <stop offset="0%" stopColor={isDarkTheme ? "#334155" : "#44403c"} />
            <stop offset="45%" stopColor={isDarkTheme ? "#1e293b" : "#292524"} />
            <stop offset="80%" stopColor={isDarkTheme ? "#0f172a" : "#1c1917"} />
            <stop offset="100%" stopColor="#042f2e" />
          </linearGradient>

          {/* Abyss Center Depth Gradient */}
          <radialGradient id={`abyssCore_${lakeId}`} cx="50%" cy="50%" r="50%">
            <stop offset="0%" stopColor="#021329" stopOpacity="0.95" />
            <stop offset="60%" stopColor="#032247" stopOpacity="0.75" />
            <stop offset="100%" stopColor="#0284c7" stopOpacity="0" />
          </radialGradient>

          {/* Water Surface Caustic Shimmer Gradient */}
          <linearGradient id={`causticGrad_${lakeId}`} x1="0%" y1="0%" x2="100%" y2="50%">
            <stop offset="0%" stopColor="#67e8f9" stopOpacity="0.7" />
            <stop offset="50%" stopColor="#38bdf8" stopOpacity="0.4" />
            <stop offset="100%" stopColor="#a5f3fc" stopOpacity="0.8" />
          </linearGradient>
        </defs>

        {/* 1. SUNKEN TERRAIN BASIN (Recessed geological cavity into the board) */}
        {isWest ? (
          /* WEST LAKE (Organic meandering basin with northwest bay and southern scoop) */
          <g filter={`url(#lakeDepthShadow_${lakeId})`}>
            {/* Outer Earth / Rocky Rim */}
            <path
              d="M96,14 C132,12 165,24 177,52 C188,76 179,102 189,126 C198,146 182,176 154,186 C130,195 106,182 85,188 C59,195 28,179 18,150 C9,124 21,102 15,76 C9,48 32,22 66,16 C78,14 87,14 96,14 Z"
              fill={`url(#shoreGradient_${lakeId})`}
              stroke={isDarkTheme ? "#475569" : "#57534e"}
              strokeWidth="2.5"
              strokeLinejoin="round"
            />

            {/* Moist Sandy Beach / Silt Transition Shelf */}
            <path
              d="M96,18 C130,16 160,28 172,55 C182,78 174,102 184,124 C192,142 178,172 152,182 C130,190 108,178 88,184 C64,190 32,176 22,148 C14,124 24,104 18,80 C12,54 36,26 68,20 C78,18 86,18 96,18 Z"
              fill="#134e4a"
              stroke="#0d9488"
              strokeWidth="1.5"
              strokeOpacity="0.6"
            />

            {/* Shallow Turquoise Riparian Water Border */}
            <path
              d="M97,22 C128,20 155,32 166,57 C175,78 168,101 178,122 C185,138 172,166 148,175 C127,183 107,172 88,178 C66,184 36,171 28,144 C21,122 30,103 24,81 C19,57 41,31 71,25 C80,23 88,23 97,22 Z"
              fill="#06b6d4"
              opacity="0.9"
            />

            {/* Main Deep Water Lake Body */}
            <path
              d="M98,25 C126,23 151,35 161,59 C170,78 163,100 172,120 C179,135 167,161 144,170 C124,177 105,167 87,172 C66,178 39,166 32,141 C26,120 34,102 29,82 C24,59 44,35 73,29 C81,27 89,27 98,25 Z"
              fill={`url(#waterGradient_${lakeId})`}
              stroke="#38bdf8"
              strokeWidth="0.8"
              strokeOpacity="0.8"
            />

            {/* Deep Abyss Core (Deep Blue Trench) */}
            <path
              d="M102,48 C122,46 138,56 144,74 C150,88 142,106 148,120 C153,132 142,148 126,154 C112,160 98,152 86,156 C70,161 50,152 46,134 C41,118 48,104 45,90 C41,74 54,58 76,52 C83,50 95,49 102,48 Z"
              fill={`url(#abyssCore_${lakeId})`}
            />

            {/* Natural Rocky Islet & Boulders on Southern Shoal */}
            <g id="west_islet">
              <ellipse cx="64" cy="142" rx="7" ry="4.5" fill="#334155" stroke="#64748b" strokeWidth="1" />
              <ellipse cx="63" cy="141" rx="4.5" ry="2.5" fill="#475569" />
              {/* Mossy touch on rock */}
              <circle cx="62" cy="140.5" r="1.5" fill="#15803d" opacity="0.8" />
              {/* Small sibling stone */}
              <circle cx="73" cy="144" r="3" fill="#1e293b" stroke="#475569" strokeWidth="0.8" />
            </g>

            {/* Natural Shoreline Stones */}
            <g id="west_shore_stones" fill="#475569" stroke="#64748b" strokeWidth="0.6">
              <circle cx="160" cy="50" r="2.8" />
              <circle cx="164" cy="53" r="1.8" />
              <circle cx="34" cy="74" r="2.2" />
              <circle cx="140" cy="172" r="3" />
            </g>

            {/* Shimmering Surface Wave Ripples & Sunlight Caustics */}
            <g fill="none" stroke={`url(#causticGrad_${lakeId})`} strokeLinecap="round">
              <path d="M60,45 C78,40 102,48 124,43" strokeWidth="1.8" opacity="0.75" />
              <path d="M72,62 C94,56 122,66 146,59" strokeWidth="1.5" opacity="0.65" />
              <path d="M52,82 C72,76 98,85 120,79 C138,74 154,82 162,78" strokeWidth="1.6" opacity="0.7" />
              <path d="M58,102 C80,95 106,105 130,98 C146,93 158,100 166,97" strokeWidth="1.4" opacity="0.6" />
              <path d="M74,124 C92,118 116,128 138,121" strokeWidth="1.6" opacity="0.75" />
              <path d="M86,146 C102,141 122,149 138,144" strokeWidth="1.4" opacity="0.65" />
              <path d="M98,164 C112,160 126,166 136,162" strokeWidth="1.2" opacity="0.5" />
            </g>
          </g>
        ) : (
          /* EAST LAKE (Distinct organic double-lobed alpine basin with eastern fjord) */
          <g filter={`url(#lakeDepthShadow_${lakeId})`}>
            {/* Outer Earth / Rocky Rim */}
            <path
              d="M106,14 C144,12 172,30 182,58 C192,84 174,104 180,128 C186,152 168,178 142,184 C118,189 102,174 80,182 C54,190 28,168 22,138 C18,112 36,96 30,72 C24,46 50,22 82,18 C92,16 100,15 106,14 Z"
              fill={`url(#shoreGradient_${lakeId})`}
              stroke={isDarkTheme ? "#475569" : "#57534e"}
              strokeWidth="2.5"
              strokeLinejoin="round"
            />

            {/* Moist Sandy Beach / Silt Transition Shelf */}
            <path
              d="M105,18 C140,16 168,34 178,62 C188,88 170,106 176,130 C182,154 164,178 138,182 C114,187 98,173 76,181 C50,189 26,167 20,137 C16,111 34,95 28,71 C22,45 48,21 80,17 C90,15 98,16 105,18 Z"
              fill="#134e4a"
              stroke="#0d9488"
              strokeWidth="1.5"
              strokeOpacity="0.6"
            />

            {/* Shallow Turquoise Riparian Water Border */}
            <path
              d="M105,22 C137,20 162,38 172,64 C181,89 164,106 170,129 C175,151 158,172 134,176 C111,180 96,167 75,175 C51,182 28,161 23,133 C19,108 36,93 30,70 C25,46 49,24 79,21 C88,19 97,20 105,22 Z"
              fill="#06b6d4"
              opacity="0.9"
            />

            {/* Main Deep Water Lake Body */}
            <path
              d="M105,25 C134,23 158,41 167,66 C176,90 159,106 165,128 C170,149 153,168 130,172 C108,176 94,163 74,171 C52,177 30,157 26,130 C22,106 38,91 33,69 C28,47 51,26 79,23 C88,21 97,22 105,25 Z"
              fill={`url(#waterGradient_${lakeId})`}
              stroke="#38bdf8"
              strokeWidth="0.8"
              strokeOpacity="0.8"
            />

            {/* Deep Abyss Core (Deep Blue Trench) */}
            <path
              d="M106,48 C128,46 146,58 152,78 C158,96 144,110 148,126 C152,142 138,154 120,158 C102,162 90,150 74,156 C58,161 42,146 38,124 C35,104 46,92 42,76 C38,58 56,44 80,41 C89,39 98,40 106,48 Z"
              fill={`url(#abyssCore_${lakeId})`}
            />

            {/* Natural Rocky Islet & Moss Stone in North-Central Basin */}
            <g id="east_islet">
              <ellipse cx="128" cy="68" rx="8" ry="5" fill="#334155" stroke="#64748b" strokeWidth="1" />
              <ellipse cx="127" cy="67" rx="5" ry="3" fill="#475569" />
              {/* Moss patch */}
              <circle cx="126" cy="66" r="1.8" fill="#15803d" opacity="0.85" />
              {/* Companion pebble */}
              <circle cx="138" cy="72" r="2.6" fill="#1e293b" stroke="#475569" strokeWidth="0.8" />
            </g>

            {/* Natural Shoreline Stones */}
            <g id="east_shore_stones" fill="#475569" stroke="#64748b" strokeWidth="0.6">
              <circle cx="48" cy="46" r="2.8" />
              <circle cx="44" cy="50" r="1.8" />
              <circle cx="166" cy="138" r="3.2" />
              <circle cx="68" cy="176" r="2.4" />
            </g>

            {/* Shimmering Surface Wave Ripples & Sunlight Caustics */}
            <g fill="none" stroke={`url(#causticGrad_${lakeId})`} strokeLinecap="round">
              <path d="M70,42 C88,37 114,45 136,40" strokeWidth="1.8" opacity="0.75" />
              <path d="M54,60 C76,54 104,64 126,58" strokeWidth="1.5" opacity="0.65" />
              <path d="M46,80 C68,74 94,83 118,77 C138,72 154,80 164,76" strokeWidth="1.6" opacity="0.7" />
              <path d="M52,102 C74,96 100,105 124,99 C142,94 156,102 164,98" strokeWidth="1.4" opacity="0.6" />
              <path d="M62,124 C82,118 108,127 130,121 C144,117 156,123 162,120" strokeWidth="1.6" opacity="0.75" />
              <path d="M68,146 C86,141 110,149 130,144" strokeWidth="1.4" opacity="0.65" />
              <path d="M80,166 C96,162 114,168 126,164" strokeWidth="1.2" opacity="0.5" />
            </g>
          </g>
        )}

        {/* Subtle Elegant Water Ripple Animation Accent (Static clean vector style) */}
        <circle
          cx={isWest ? 112 : 94}
          cy={isWest ? 104 : 110}
          r="14"
          fill="none"
          stroke="#e0f2fe"
          strokeWidth="0.8"
          opacity="0.35"
        />
        <circle
          cx={isWest ? 112 : 94}
          cy={isWest ? 104 : 110}
          r="24"
          fill="none"
          stroke="#bae6fd"
          strokeWidth="0.6"
          opacity="0.2"
        />
      </svg>
    </div>
  );
};
