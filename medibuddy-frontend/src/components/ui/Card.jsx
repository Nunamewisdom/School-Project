export default function Card({ children, onClick }) {
  return (
    <div
      onClick={onClick}
      style={{
        background: "white",
        padding: "20px",
        borderRadius: "12px",
        boxShadow: "0 4px 12px rgba(0,0,0,0.06)",
        cursor: onClick ? "pointer" : "default"
      }}
    >
      {children}
    </div>
  );
}