export default function Badge({ children, type = 'muted', dot = false }) {
  return (
    <span className={`badge badge-${type}`}>
      {dot && (
        <span style={{
          width: 6, height: 6, borderRadius: '50%',
          background: 'currentColor', display: 'inline-block'
        }} />
      )}
      {children}
    </span>
  );
}
