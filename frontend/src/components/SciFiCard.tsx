import React from 'react';

const sciFiStyles = {
  card: {
    background: 'linear-gradient(135deg, rgba(0, 212, 255, 0.08) 0%, rgba(124, 58, 237, 0.08) 100%)',
    border: '1px solid rgba(0, 212, 255, 0.3)',
    borderRadius: '12px',
    padding: '20px',
    marginBottom: '16px',
    boxShadow: '0 0 20px rgba(0, 212, 255, 0.1), inset 0 0 30px rgba(0, 212, 255, 0.03)',
    transition: 'all 0.3s ease',
    position: 'relative' as const,
    overflow: 'hidden',
  },
  cardHover: {
    transform: 'translateY(-2px)',
    boxShadow: '0 0 30px rgba(0, 212, 255, 0.25), 0 0 60px rgba(124, 58, 237, 0.15), inset 0 0 30px rgba(0, 212, 255, 0.05)',
    border: '1px solid rgba(0, 212, 255, 0.5)',
  },
  title: {
    color: '#00d4ff',
    fontSize: '16px',
    fontWeight: 'bold' as const,
    marginBottom: '16px',
    textShadow: '0 0 10px rgba(0, 212, 255, 0.5)',
    display: 'flex',
    alignItems: 'center',
    gap: 8,
  },
  label: {
    color: '#888',
    fontSize: '12px',
    marginBottom: '4px',
    display: 'block',
  },
  glowLine: {
    position: 'absolute' as const,
    top: 0,
    left: 0,
    right: 0,
    height: '2px',
    background: 'linear-gradient(90deg, transparent, #00d4ff, #7c3aed, #00ff88, transparent)',
    opacity: 0.8,
  },
};

interface SciFiCardProps {
  title: string;
  icon: string;
  children: React.ReactNode;
}

export function SciFiCard({ title, icon, children }: SciFiCardProps) {
  const [isHovered, setIsHovered] = React.useState(false);
  
  return (
    <div 
      style={{ ...sciFiStyles.card, ...(isHovered ? sciFiStyles.cardHover : {}) }}
      className="scifi-card"
      onMouseEnter={() => setIsHovered(true)}
      onMouseLeave={() => setIsHovered(false)}
    >
      <div style={sciFiStyles.glowLine} className="scifi-glow-line" />
      <div style={sciFiStyles.title}>
        {icon} {title}
      </div>
      {children}
    </div>
  );
}
