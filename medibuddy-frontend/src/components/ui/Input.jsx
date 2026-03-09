export default function Input({ value, onChange, placeholder, type = "text" }) {
  return (
    <input
      type={type}
      value={value}
      onChange={onChange}
      placeholder={placeholder}
      style={{
        padding: "8px 12px",
        borderRadius: "8px",
        border: "1px solid #e5e7eb",
        marginRight: "10px"
      }}
    />
  );
}