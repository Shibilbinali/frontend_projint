export default function Spinner({ size = 24, text = '' }) {
  return (
    <div className="loading-page">
      <div className="spinner" style={{ width: size, height: size }} />
      {text && <p>{text}</p>}
    </div>
  );
}
