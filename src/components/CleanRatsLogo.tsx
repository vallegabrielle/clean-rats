import { View } from 'react-native';
import Svg, { Circle, Ellipse, Path, Line, G, Defs, ClipPath } from 'react-native-svg';

interface Props {
  size?: number;
}

export default function CleanRatsLogo({ size = 140 }: Props) {
  const h = Math.round(size * 1.35);

  return (
    <View style={{ width: size, height: h }}>
      <Svg width={size} height={h} viewBox="0 0 160 216">
        <Defs>
          <ClipPath id="cr-body">
            <Ellipse cx="76" cy="150" rx="43" ry="52" />
          </ClipPath>
          <ClipPath id="cr-head">
            <Circle cx="72" cy="88" r="34" />
          </ClipPath>
        </Defs>

        {/* Ground shadow */}
        <Ellipse cx="76" cy="208" rx="34" ry="5" fill="rgba(0,0,0,0.18)" />

        {/* ── MOP HANDLE ── */}
        <Line x1="118" y1="90" x2="148" y2="18" stroke="#7a5c0a" strokeWidth="5.5" strokeLinecap="round" />
        <Line x1="118" y1="90" x2="148" y2="18" stroke="#d4a030" strokeWidth="3" strokeLinecap="round" />

        {/* ── MOP HEAD (red fringe) ── */}
        <Line x1="104" y1="16" x2="160" y2="12" stroke="#8B1a0a" strokeWidth="3.5" strokeLinecap="round" />
        {[106, 113, 120, 127, 134, 141, 148, 155].map((x, i) => (
          <Line
            key={`mf${i}`}
            x1={x} y1="14"
            x2={x + (i % 3) - 1} y2="40"
            stroke={i % 2 === 0 ? '#c0392b' : '#e74c3c'}
            strokeWidth="4"
            strokeLinecap="round"
          />
        ))}

        {/* ── TAIL ── */}
        <Path
          d="M 108 163 Q 136 172 142 153 Q 148 134 132 124"
          stroke="#1a1a1a" strokeWidth="4.5" fill="none" strokeLinecap="round"
        />
        <Path
          d="M 108 163 Q 136 172 142 153 Q 148 134 132 124"
          stroke="#c8957a" strokeWidth="2.5" fill="none" strokeLinecap="round"
        />

        {/* ── BODY ── */}
        <Ellipse cx="76" cy="150" rx="43" ry="52" fill="#f0ebe0" stroke="#1a1a1a" strokeWidth="3.5" />

        {/* Body hatching */}
        <G clipPath="url(#cr-body)">
          {[38, 50, 62, 74, 86, 98, 110].map((x, i) => (
            <Line key={`bh${i}`} x1={x} y1="98" x2={x - 12} y2="200" stroke="#1a1a1a" strokeWidth="1" opacity="0.2" />
          ))}
          {/* Short cross strokes for texture */}
          {[[55,135],[65,128],[78,130],[88,138],[72,148],[60,155],[82,155]].map(([cx, cy], i) => (
            <Line key={`bs${i}`} x1={cx - 4} y1={cy} x2={cx + 4} y2={cy} stroke="#1a1a1a" strokeWidth="1.2" opacity="0.25" strokeLinecap="round" />
          ))}
        </G>

        {/* ── APRON ── */}
        <Path
          d="M 52 120 Q 50 158 53 178 Q 68 186 90 182 Q 104 175 102 158 Q 100 136 97 120 Q 76 128 52 120 Z"
          fill="rgba(210,235,255,0.55)"
          stroke="#3a80c0"
          strokeWidth="1.8"
        />
        <Path
          d="M 52 120 Q 64 112 76 114 Q 88 112 97 120"
          stroke="#3a80c0" strokeWidth="1.8" fill="none" strokeLinecap="round"
        />

        {/* ── LEFT ARM (relaxed) ── */}
        <Path d="M 38 140 Q 22 152 20 168" stroke="#f0ebe0" strokeWidth="16" fill="none" strokeLinecap="round" />
        <Path d="M 38 140 Q 22 152 20 168" stroke="#1a1a1a" strokeWidth="3" fill="none" strokeLinecap="round" />
        {/* Left paw */}
        <Ellipse cx="19" cy="171" rx="8" ry="6" fill="#f0ebe0" stroke="#1a1a1a" strokeWidth="2.5" />
        {[13, 18, 24].map((x, i) => (
          <Line key={`lc${i}`} x1={x} y1="170" x2={x - 1} y2="177" stroke="#1a1a1a" strokeWidth="1.5" strokeLinecap="round" />
        ))}

        {/* ── RIGHT ARM (raised, holding mop) ── */}
        <Path d="M 112 132 Q 124 106 118 88" stroke="#f0ebe0" strokeWidth="16" fill="none" strokeLinecap="round" />
        <Path d="M 112 132 Q 124 106 118 88" stroke="#1a1a1a" strokeWidth="3" fill="none" strokeLinecap="round" />
        {/* Right paw */}
        <Ellipse cx="119" cy="86" rx="8" ry="6.5" fill="#f0ebe0" stroke="#1a1a1a" strokeWidth="2.5" />
        {[113, 118, 124].map((x, i) => (
          <Line key={`rc${i}`} x1={x} y1="84" x2={x} y2="79" stroke="#1a1a1a" strokeWidth="1.5" strokeLinecap="round" />
        ))}

        {/* ── FEET ── */}
        <Ellipse cx="57" cy="197" rx="19" ry="8" fill="#f0ebe0" stroke="#1a1a1a" strokeWidth="2.5" />
        {[41, 49, 57, 65, 73].map((x, i) => (
          <Line key={`lf${i}`} x1={x} y1="197" x2={x - 1} y2="205" stroke="#1a1a1a" strokeWidth="1.5" strokeLinecap="round" />
        ))}
        <Ellipse cx="93" cy="197" rx="17" ry="8" fill="#f0ebe0" stroke="#1a1a1a" strokeWidth="2.5" />
        {[79, 86, 93, 100, 107].map((x, i) => (
          <Line key={`rf${i}`} x1={x} y1="197" x2={x - 1} y2="205" stroke="#1a1a1a" strokeWidth="1.5" strokeLinecap="round" />
        ))}

        {/* ── HEAD ── */}
        <Circle cx="72" cy="88" r="34" fill="#f0ebe0" stroke="#1a1a1a" strokeWidth="3.5" />

        {/* Head hatching */}
        <G clipPath="url(#cr-head)">
          {[50, 62, 74, 86].map((x, i) => (
            <Line key={`hh${i}`} x1={x} y1="55" x2={x - 6} y2="121" stroke="#1a1a1a" strokeWidth="0.9" opacity="0.18" />
          ))}
        </G>

        {/* ── EARS ── */}
        <Circle cx="49" cy="63" r="15" fill="#f0ebe0" stroke="#1a1a1a" strokeWidth="2.8" />
        <Circle cx="49" cy="63" r="9" fill="#dfa8a8" stroke="#1a1a1a" strokeWidth="1.5" />
        <Circle cx="89" cy="57" r="13" fill="#f0ebe0" stroke="#1a1a1a" strokeWidth="2.8" />
        <Circle cx="89" cy="57" r="8" fill="#dfa8a8" stroke="#1a1a1a" strokeWidth="1.5" />

        {/* ── FACE ── */}
        {/* Eye */}
        <Circle cx="65" cy="84" r="6.5" fill="#1a1a1a" />
        <Circle cx="63" cy="82" r="2.2" fill="#fff" />

        {/* Nose */}
        <Ellipse cx="54" cy="97" rx="5" ry="4" fill="#b86868" stroke="#1a1a1a" strokeWidth="1.5" />

        {/* Whiskers */}
        {[[25,91,52,94],[24,97,52,96],[26,103,52,99]].map(([x1,y1,x2,y2], i) => (
          <Line key={`wl${i}`} x1={x1} y1={y1} x2={x2} y2={y2} stroke="#1a1a1a" strokeWidth="1.5" strokeLinecap="round" />
        ))}
        {[[59,94,84,91],[59,96,84,96],[59,99,84,102]].map(([x1,y1,x2,y2], i) => (
          <Line key={`wr${i}`} x1={x1} y1={y1} x2={x2} y2={y2} stroke="#1a1a1a" strokeWidth="1.5" strokeLinecap="round" />
        ))}

        {/* Mouth */}
        <Path d="M 51 103 Q 55 108 59 103" stroke="#1a1a1a" strokeWidth="2" fill="none" strokeLinecap="round" />

        {/* ── WATER DROPLETS ── */}
        <Path d="M 18 70 Q 16 74 18 78 Q 20 74 18 70 Z" fill="#4fc3f7" opacity="0.85" />
        <Path d="M 12 84 Q 10 87 12 90 Q 14 87 12 84 Z" fill="#4fc3f7" opacity="0.65" />
        <Path d="M 22 56 Q 20 60 22 64 Q 24 60 22 56 Z" fill="#4fc3f7" opacity="0.75" />

        {/* ── SPARKLES near mop ── */}
        <Path d="M 92 8 L 94 14 L 100 16 L 94 18 L 92 24 L 90 18 L 84 16 L 90 14 Z" fill="#fff" opacity="0.95" />
        <Path d="M 80 2 L 81 6 L 85 7 L 81 8 L 80 12 L 79 8 L 75 7 L 79 6 Z" fill="#fff" opacity="0.7" />
      </Svg>
    </View>
  );
}