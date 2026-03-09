export default function Button({ children, onClick, type = "primary" }) {
  const styles = {
    primary: {
      background: "#16a34a",
      color: "white",
    },
    secondary: {
      background: "#e5e7eb",
      color: "#111827",
    },
    danger: {
      background: "#dc2626",
      color: "white",
    }
  };

  return (
    <button
      onClick={onClick}
      style={{
        padding: "8px 14px",
        borderRadius: "8px",
        border: "none",
        cursor: "pointer",
        fontWeight: "500",
        ...styles[type]
      }}
    >
      {children}
    </button>
  );
}