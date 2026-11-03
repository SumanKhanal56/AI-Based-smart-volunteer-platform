// This component draws a simple analytics pie chart.
// Convert totals into colored percentage slices for the pie chart.
export default function SimplePieChart({ title, description, data }) {
  const items = data.map((item) => ({
    ...item,
    value: Math.max(0, Number(item.value || 0))
  }));
  const total = items.reduce((sum, item) => sum + item.value, 0);
  let progress = 0;
  const segments = items.filter((item) => item.value > 0).map((item) => {
    const start = progress;
    progress += (item.value / total) * 100;
    return `${item.color} ${start}% ${progress}%`;
  });
  const background = segments.length ? `conic-gradient(${segments.join(', ')})` : '#e5e7eb';

  return <section className="panel simple-pie-chart" aria-label={title}>
    <div className="simple-chart-heading"><div><p className="eyebrow">Analytics</p><h2>{title}</h2><p>{description}</p></div></div>
    <div className="simple-pie-content">
      <div className="simple-pie-visual" style={{ background }} role="img" aria-label={`${title}. ${total} total accounts.`}>
        <div><strong>{total}</strong><span>Total accounts</span></div>
      </div>
      <div className="simple-pie-legend">
        {items.map((item) => {
          const percentage = total ? Math.round((item.value / total) * 100) : 0;
          return <div className="simple-pie-legend-item" key={item.label}>
            <span style={{ backgroundColor: item.color }} />
            <div><strong>{item.label}</strong><small>{item.value} accounts</small></div>
            <b>{percentage}%</b>
          </div>;
        })}
      </div>
    </div>
  </section>;
}
