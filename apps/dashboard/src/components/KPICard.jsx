
export default function KPICard({ title, value, icon: Icon, colour, description, isLoading }) {
  return (
    <div style={styles.card}>
      {/* Top Row: Icon + Title */}
      <div style={styles.header}>
        <div style={{ ...styles.iconWrapper, color: colour }}>
          {Icon && <Icon size={20} />}
        </div>
        <span style={styles.title}>{title}</span>
      </div>

      {/* Middle Count Value */}
      <div style={styles.valueContainer}>
        {isLoading ? (
          <div style={styles.pulseBar}></div>
        ) : (
          <span style={{ ...styles.value, color: colour }}>{value}</span>
        )}
      </div>

      {/* Bottom Description */}
      <div style={styles.description}>{description}</div>
    </div>
  );
}

const styles = {
  card: {
    background: 'var(--color-white)',
    borderRadius: '12px',
    padding: '20px 24px',
    boxShadow: '0 2px 12px rgba(0, 0, 0, 0.08)',
    border: '1px solid #F0F0F0',
    display: 'flex',
    flexDirection: 'column',
    justifyContent: 'space-between',
    minHeight: '140px',
  },
  header: {
    display: 'flex',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: '14px',
  },
  iconWrapper: {
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'center',
  },
  title: {
    fontSize: '12px',
    fontWeight: '600',
    color: 'var(--color-text-secondary)',
    textTransform: 'uppercase',
    letterSpacing: '0.5px',
  },
  valueContainer: {
    marginBottom: '10px',
    display: 'flex',
    alignItems: 'center',
  },
  value: {
    fontSize: '28px',
    fontWeight: '700',
    lineHeight: '1',
  },
  pulseBar: {
    width: '60px',
    height: '24px',
    backgroundColor: '#EAEAEA',
    borderRadius: '4px',
    animation: 'pulse 1.5s infinite ease-in-out',
  },
  description: {
    fontSize: '12px',
    color: 'var(--color-text-secondary)',
    lineHeight: '1.4',
  },
};

// Add CSS keyframes for pulsing loading bar
const styleSheet = document.styleSheets[0];
if (styleSheet) {
  try {
    styleSheet.insertRule(`
      @keyframes pulse {
        0% { opacity: 0.6; }
        50% { opacity: 0.3; }
        100% { opacity: 0.6; }
      }
    `, styleSheet.cssRules.length);
  } catch {
    // Fail silently in testing environments without window/document
  }
}
