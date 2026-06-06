// ============================================================
// LOADING SKELETON — Placeholders de carga para mejor UX
// ============================================================

export function SkeletonCard({ lines = 3 }) {
  return (
    <div
      className="card"
      aria-hidden="true"
      style={{ display: 'flex', flexDirection: 'column', gap: '12px' }}
    >
      <div className="skeleton" style={{ height: '20px', width: '60%' }} />
      {Array.from({ length: lines }).map((_, i) => (
        <div
          key={i}
          className="skeleton"
          style={{ height: '14px', width: i === lines - 1 ? '40%' : '100%' }}
        />
      ))}
    </div>
  );
}

export function SkeletonList({ rows = 4 }) {
  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: '8px' }} aria-hidden="true">
      {Array.from({ length: rows }).map((_, i) => (
        <div
          key={i}
          className="skeleton"
          style={{ height: '64px', borderRadius: 'var(--radius-xl)' }}
        />
      ))}
    </div>
  );
}

export function SkeletonDashboard() {
  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: '16px' }} aria-hidden="true">
      <div className="skeleton" style={{ height: '120px', borderRadius: 'var(--radius-xl)' }} />
      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(200px, 1fr))', gap: '12px' }}>
        {[1, 2, 3, 4].map(i => (
          <div key={i} className="skeleton" style={{ height: '100px', borderRadius: 'var(--radius-xl)' }} />
        ))}
      </div>
      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(300px, 1fr))', gap: '12px' }}>
        {[1, 2, 3].map(i => (
          <div key={i} className="skeleton" style={{ height: '200px', borderRadius: 'var(--radius-xl)' }} />
        ))}
      </div>
    </div>
  );
}
