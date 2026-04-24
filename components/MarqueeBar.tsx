'use client';

import { useCollege } from '@/lib/college-context';

export default function MarqueeBar() {
  const { college } = useCollege();
  const items = college.campusSlang;

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

