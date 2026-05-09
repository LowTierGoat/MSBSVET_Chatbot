import {
  BarChart, Bar, LineChart, Line, AreaChart, Area,
  PieChart, Pie, Cell,
  XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer, Legend
} from 'recharts';
import { PBI_THEME } from '../theme';

/**
 * CUSTOM MULTILINE LABELER
 * Handles long names like "Chhatrapati Sambhajinagar" by splitting them into lines.
 */
// --- UPDATED MULTILINE LABELER ---
const renderMultilineLabel = ({
  cx,
  cy,
  midAngle,
  innerRadius,
  outerRadius,
  percent,
  name,
}) => {
  const RADIAN = Math.PI / 180;

  // Keep labels inside bounds
  const radius = outerRadius * 1.25;

  const targetX = cx + radius * Math.cos(-midAngle * RADIAN);
  const targetY = cy + radius * Math.sin(-midAngle * RADIAN);

  const isRightSide = targetX > cx;

  // Safer handling of name
  const safeName = name ? String(name) : "Unknown";
  const words = safeName.split(" ");

  // Theme colors with fallbacks
  const textColor = PBI_THEME?.text || "#1e293b";   // deep navy fallback
  const mutedColor = PBI_THEME?.muted || "#475569"; // softer gray

  return (
    <text
      x={targetX}
      y={targetY}
      fill={textColor}
      textAnchor={isRightSide ? "start" : "end"}
      dominantBaseline="central"
      style={{
        fontSize: "11px",
        fontWeight: 600,
        fontFamily: "var(--font-mono)",
      }}
    >
      {words.map((word, i) => (
        <tspan
          key={i}
          x={targetX}
          dy={i === 0 ? 0 : 14}
          fill={textColor}
        >
          {word}
        </tspan>
      ))}

      <tspan
        x={targetX}
        dy={14}
        fill={mutedColor}
        fontSize="10"
        fontWeight="400"
      >
        {`(${(percent * 100).toFixed(0)}%)`}
      </tspan>
    </text>
  );
};

export default function ChartRenderer({ data, config }) {
  const safeConfig = config || { type: 'bar' };
  let { type, x, y } = safeConfig;

  // Helper to ensure we don't crash if PBI_THEME hasn't loaded colors yet
  
  const keys = data && data.length > 0 ? Object.keys(data[0]) : [];
  if (!keys.includes(x)) {
    x = keys.find(k => typeof data[0][k] === 'string') || keys[0];
  }
  if (!keys.includes(y)) {
    y = keys.find(k => typeof data[0][k] === 'number') || keys[keys.length - 1];
  }

  const cleanData = data.map(item => {
    let rawVal = item[y];
    let cleanVal = rawVal;
    if (typeof rawVal === 'string') {
      const parsed = parseFloat(rawVal.replace(/,/g, ''));
      if (!isNaN(parsed)) cleanVal = parsed;
    }
    return { ...item, [y]: cleanVal, [x]: item[x] || 'Unknown' };
  });

  const themeColors =
    PBI_THEME?.colors?.length > 0
      ? PBI_THEME.colors
      : ['#f57c00', '#ff9800'];


  const renderInnerChart = () => {
    switch (type) {
      case 'pie': {
        // --- SMART GROUPING LOGIC ---
        const MAX_SLICES = 6;
        let processedData = [...data].sort((a, b) => b[y] - a[y]);

        if (processedData.length > MAX_SLICES) {
          const topSlices = processedData.slice(0, MAX_SLICES);
          const otherSlices = processedData.slice(MAX_SLICES);
          const otherSum = otherSlices.reduce(
            (sum, item) => sum + item[y],
            0
          );

          processedData = [
            ...topSlices,
            { [x]: 'Others', [y]: otherSum }
          ];
        }

        return (
          <PieChart>
            <Pie
              data={processedData}
              dataKey={y}
              nameKey={x}
              cx="50%"
              cy="40%" // Move chart up to make room for legend
              outerRadius={80}
              innerRadius={50}
              paddingAngle={3}
              // Only show multiline label if the slice is > 5%
              label={(props) =>
                props.percent > 0.05
                  ? renderMultilineLabel(props)
                  : null
              }
              labelLine={false} // Cleaner look for many slices
            >
              {processedData.map((entry, index) => (
                <Cell
                  key={`cell-${index}`}
                  fill={themeColors[index % themeColors.length]}
                  stroke="var(--bg-panel)"
                  strokeWidth={2}
                />
              ))}
            </Pie>

            <Tooltip
              contentStyle={{
                background: 'var(--bg-raised)',
                border: '1px solid var(--border)',
                borderRadius: '4px'
              }}
            />

            <Legend
              verticalAlign="bottom"
              align="center"
              layout="horizontal"
              iconType="circle"
              wrapperStyle={{
                paddingTop: '20px',
                fontSize: '10px',
                maxWidth: '100%',
                lineHeight: '20px'
              }}
            />
          </PieChart>
        );
      }

      case 'line':
        return (
          <LineChart data={data}>
            <CartesianGrid
              strokeDasharray="3 3"
              stroke="var(--border)"
              vertical={false}
            />
            <XAxis
              dataKey={x}
              stroke="var(--text-secondary)"
              fontSize={11}
              tickLine={false}
              axisLine={false}
              dy={10}
            />
            <YAxis
              stroke="var(--text-secondary)"
              fontSize={11}
              tickLine={false}
              axisLine={false}
            />
            <Tooltip
              contentStyle={{
                background: 'var(--bg-raised)',
                border: '1px solid var(--border)'
              }}
            />
            <Line
              type="monotone"
              dataKey={y}
              stroke={PBI_THEME.accent}
              strokeWidth={3}
              dot={{
                fill: PBI_THEME.accent,
                r: 4,
                strokeWidth: 2,
                stroke: 'var(--bg-panel)'
              }}
              activeDot={{ r: 6, strokeWidth: 0 }}
            />
          </LineChart>
        );

      case 'area':
        return (
          <AreaChart data={data}>
            <defs>
              <linearGradient id="colorArea" x1="0" y1="0" x2="0" y2="1">
                <stop
                  offset="5%"
                  stopColor={PBI_THEME.accent}
                  stopOpacity={0.3}
                />
                <stop
                  offset="95%"
                  stopColor={PBI_THEME.accent}
                  stopOpacity={0}
                />
              </linearGradient>
            </defs>

            <CartesianGrid
              strokeDasharray="3 3"
              stroke="var(--border)"
              vertical={false}
            />
            <XAxis
              dataKey={x}
              stroke="var(--text-secondary)"
              fontSize={11}
              axisLine={false}
              tickLine={false}
            />
            <YAxis
              stroke="var(--text-secondary)"
              fontSize={11}
              axisLine={false}
              tickLine={false}
            />
            <Tooltip />
            <Area
              type="monotone"
              dataKey={y}
              stroke={PBI_THEME.accent}
              fillOpacity={1}
              fill="url(#colorArea)"
            />
          </AreaChart>
        );
      
      // Add this case to the switch inside ChartRenderer.jsx
      case 'multi_pie':
        return (
          <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '20px' }}>
            {config.y.map((colName, idx) => (
              <div key={idx} style={{ height: '300px', textAlign: 'center' }}>
                <div style={{ fontSize: '10px', fontWeight: 'bold', color: '#1a4188' }}>{colName.replace('_', ' ').toUpperCase()}</div>
                <ResponsiveContainer>
                  <PieChart>
                    <Pie 
                      data={data.filter(d => d[colName] > 0)} 
                      dataKey={colName} 
                      nameKey={config.x} 
                      cx="50%" cy="50%" outerRadius={60} label 
                    >
                      {data.map((_, i) => <Cell key={i} fill={['#1a4188', '#ff9933', '#2e7d32'][i % 3]} />)}
                    </Pie>
                    <Tooltip />
                  </PieChart>
                </ResponsiveContainer>
              </div>
            ))}
          </div>
        );      

      default:
        return (
          <BarChart
            data={data}
            margin={{ top: 20, right: 30, left: 0, bottom: 0 }}
          >
            <CartesianGrid
              strokeDasharray="3 3"
              stroke="var(--border)"
              vertical={false}
            />
            <XAxis
              dataKey={x}
              stroke="var(--text-secondary)"
              fontSize={11}
              tickLine={false}
              axisLine={false}
              dy={10}
            />
            <YAxis
              stroke="var(--text-secondary)"
              fontSize={11}
              tickLine={false}
              axisLine={false}
            />
            <Tooltip
              cursor={{ fill: 'rgba(255,255,255,0.05)' }}
              contentStyle={{
                background: 'var(--bg-raised)',
                border: '1px solid var(--border)'
              }}
            />
            <Bar
              dataKey={y}
              fill={PBI_THEME.accent}
              radius={[4, 4, 0, 0]}
              barSize={32}
            />
          </BarChart>
        );
    }
  };

  if (type === 'grouped_pie') {
    // Find unique categories (e.g., "AUTO-CAD" and "LICENTIATE...")
    const groups = [...new Set(data.map(item => item[config.groupBy]))];
    
    return (
      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(300px, 1fr))', gap: '20px', width: '100%', padding: '20px', background: '#fcfcfc', borderRadius: '6px' }}>
        {groups.map((group, idx) => {
          const groupData = data.filter(d => d[config.groupBy] === group);
          return (
            <div key={idx} style={{ height: '350px', textAlign: 'center', display: 'flex', flexDirection: 'column' }}>
              <div style={{ fontSize: '11px', fontWeight: '700', color: '#1e40af', marginBottom: '15px', minHeight: '30px' }}>
                {String(group).toUpperCase()}
              </div>
              <div style={{ flex: 1 }}>
                <ResponsiveContainer width="100%" height="100%">
                  <PieChart>
                    <Pie data={groupData} dataKey={y} nameKey={x} cx="50%" cy="45%" outerRadius={70} innerRadius={45} paddingAngle={4} label={renderMultilineLabel}>
                      {groupData.map((_, i) => <Cell key={i} fill={['#1e40af', '#f59e0b', '#10b981', '#ef4444', '#8b5cf6'][i % 5]} stroke="#fff" strokeWidth={2} />)}
                    </Pie>
                    <Tooltip contentStyle={{ borderRadius: '8px', border: 'none', boxShadow: '0 4px 12px rgba(0,0,0,0.1)' }} />
                  </PieChart>
                </ResponsiveContainer>
              </div>
            </div>
          );
        })}
      </div>
    );
  }

  return (
    <div
      style={{
        height: '480px', // Extra height for the legend and labels
        width: '100%',
        marginTop: '24px',
        padding: '24px',
        background: 'rgba(255,255,255,0.01)',
        border: '1px solid var(--border)',
        borderRadius: 'var(--radius)',
        boxShadow: 'inset 0 0 20px rgba(0,0,0,0.2)'
      }}
    >
      <ResponsiveContainer width="100%" height="100%">
        {renderInnerChart()}
      </ResponsiveContainer>
    </div>
  );
}