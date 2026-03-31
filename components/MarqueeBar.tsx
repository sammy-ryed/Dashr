export default function MarqueeBar() {
  const items = [
    'SRM IST Campus Delivery',
    'Dashers on demand',
    'On Campus · Shiv Temple · Potheri · Aborde',
    'Earn commission on your schedule',
    'No shop involvement — just students',
    'Live order tracking',
  ];

  return (
    <div className="marquee-bar">
      <div className="marquee-track">
        {[...items, ...items].map((item, i) => (
          <div className="marquee-item" key={i}>
            {item} <span className="marquee-sep">◆</span>
          </div>
        ))}
      </div>
    </div>
  );
}
