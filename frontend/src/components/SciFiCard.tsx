import React from 'react';

const sciFiStyles = {
  card: {
    background: 'linear-gradient(135deg, rgba(0, 212, 255, 0.1) 0%, rgba(124, 58, 237, 0.1) 100%)',
    border: '1px solid rgba(0, 212, 255, 0.3)',
    borderRadius: '12px',
    padding: '20px',
    marginBottom: '16px',
    boxShadow: '0 0 20px rgba(0, 212, 255, 0.1), inset 0 0 20px rgba(0, 212, 255, 0.05)',
    transition: 'all 0.3s ease',
  } as React.CSSProperties,
  title: {
    color: '#00d4ff',
    fontSize: '16px',
    fontWeight: 'bold' as const,
    marginBottom: '16px',
    textShadow: '0 0 10px rgba(0, 212, 255, 0.5)',
  } as React.CSSProperties,
  label: {
    color: '#888',
    fontSize: '12px',
    marginBottom: '4px',
    display: 'block',
  } as React.CSSProperties,
};

interface SciFiCardProps {
  title: string;
  icon: string;
  children: React.ReactNode;
}

export function SciFiCard({ title, icon, children }: SciFiCardProps) {
  return (
    <div style={sciFiStyles.card} className="scifi-card">
      <div style={sciFiStyles.title}>
        {icon} {title}
      </div>
      {children}
    </div>
  );
}
