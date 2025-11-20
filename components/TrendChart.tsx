import React from 'react';

interface TrendChartProps {
  data: number[];
  color?: string;
  height?: number;
}

const TrendChart: React.FC<TrendChartProps> = ({ data, color = "#34d399", height = 40 }) => {
  if (!data || data.length < 2) return null;

  const min = Math.min(...data);
  const max = Math.max(...data);
  const range = max - min || 1;
  
  const points = data.map((val, i) => {
      const x = (i / (data.length - 1)) * 100;
      const y = height - ((val - min) / range) * height;
      return `${x},${y}`;
  }).join(' ');

  return (
    <div className="w-full relative opacity-80 -ml-1" style={{ height: `${height}px` }}>
        <svg viewBox={`0 0 100 ${height}`} className="w-full h-full overflow-visible preserve-3d">
            <defs>
                <linearGradient id={`chartGradient-${color}`} x1="0" y1="0" x2="0" y2="1">
                    <stop offset="0%" stopColor={color} stopOpacity="0.5"/>
                    <stop offset="100%" stopColor={color} stopOpacity="0"/>
                </linearGradient>
            </defs>
            <path 
              d={`M0,${height} L${points.split(' ')[0].split(',')[0]},${height} ${points.split(' ').map(p => 'L'+p).join(' ')} L100,${height} Z`} 
              fill={`url(#chartGradient-${color})`} 
            />
            <polyline 
              points={points} 
              fill="none" 
              stroke={color} 
              strokeWidth="2" 
              strokeLinecap="round" 
              strokeLinejoin="round" 
              vectorEffect="non-scaling-stroke"
            />
        </svg>
    </div>
  );
};

export default TrendChart;