// This component draws a simple analytics bar chart.
// Convert numeric values into simple bar heights without a chart library.
export default function SimpleBarChart({ title, description, data, valueSuffix = '' }) {
  const maximum = Math.max(1, ...data.map((item) => Number(item.value || 0)));

  return <section className="panel simple-chart" aria-label={title}>
    <div className="simple-chart-heading"><div><p className="eyebrow">Analytics</p><h2>{title}</h2><p>{description}</p></div></div>
    <div className="simple-chart-bars">{data.map((item) => {
      const value = Number(item.value || 0);
      const height = value > 0 ? Math.max(10, Math.round((value / maximum) * 100)) : 0;
      return <div className="simple-chart-item" key={item.label}>
        <strong>{value}{valueSuffix}</strong>
        <div className="simple-chart-track" title={`${item.label}: ${value}${valueSuffix}`}><span style={{ height: `${height}%` }} /></div>
        <small>{item.label}</small>
      </div>;
    })}</div>
  </section>;
}
