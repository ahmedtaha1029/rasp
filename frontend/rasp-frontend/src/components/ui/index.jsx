import { useEffect } from "react"
 
// ---------------------------------------------------------------------------
// Spinner
// ---------------------------------------------------------------------------
export function Spinner({ size = "md", className = "" }) {
  const sizes = { sm: "w-4 h-4", md: "w-6 h-6", lg: "w-10 h-10" }
  return (
    <div className={`${sizes[size]} border-2 border-primary border-t-transparent rounded-full animate-spin ${className}`} />
  )
}
 
// ---------------------------------------------------------------------------
// Button
// ---------------------------------------------------------------------------
export function Button({ variant = "primary", size = "md", loading, children, className = "", ...props }) {
  const base = "inline-flex items-center gap-2 font-semibold rounded-lg transition-all duration-200 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-offset-surface disabled:opacity-40 disabled:cursor-not-allowed"
  const variants = {
    primary:   "bg-primary text-surface hover:bg-primary-hover focus:ring-primary",
    secondary: "bg-surface-3 text-text-primary border border-border hover:border-border-light focus:ring-border",
    danger:    "bg-danger/10 text-danger border border-danger/20 hover:bg-danger/20 focus:ring-danger",
    ghost:     "text-text-secondary hover:text-text-primary hover:bg-surface-3 focus:ring-border",
    accent:    "bg-accent/10 text-accent border border-accent/20 hover:bg-accent/20 focus:ring-accent",
  }
  const sizes = { sm: "px-3 py-1.5 text-sm", md: "px-4 py-2 text-sm", lg: "px-5 py-2.5 text-base" }
  return (
    <button
      className={`${base} ${variants[variant]} ${sizes[size]} ${className}`}
      disabled={loading || props.disabled}
      {...props}
    >
      {loading && <Spinner size="sm" />}
      {children}
    </button>
  )
}
 
// ---------------------------------------------------------------------------
// Input
// ---------------------------------------------------------------------------
export function Input({ label, error, className = "", ...props }) {
  return (
    <div className="space-y-1.5">
      {label && <label className="label">{label}</label>}
      <input
        className={`input ${error ? "border-danger focus:border-danger focus:ring-danger" : ""} ${className}`}
        {...props}
      />
      {error && <p className="text-xs text-danger mt-1">{error}</p>}
    </div>
  )
}

// ---------------------------------------------------------------------------
// Select
// ---------------------------------------------------------------------------
export function Select({ label, error, children, className = "", ...props }) {
  return (
    <div className="space-y-1.5">
      {label && <label className="label">{label}</label>}
      <select className={`input ${error ? "border-danger" : ""} ${className}`} {...props}>
        {children}
      </select>
      {error && <p className="text-xs text-danger mt-1">{error}</p>}
    </div>
  )
}
 
// ---------------------------------------------------------------------------
// Card
// ---------------------------------------------------------------------------
export function Card({ children, className = "", elevated = false }) {
  return (
    <div className={`${elevated ? "card-elevated" : "card"} p-5 ${className}`}>
      {children}
    </div>
  )
}
 
// ---------------------------------------------------------------------------
// Badge
// ---------------------------------------------------------------------------
export function Badge({ variant = "muted", children }) {
  return <span className={`badge-${variant}`}>{children}</span>
}
 
// ---------------------------------------------------------------------------
// Modal
// ---------------------------------------------------------------------------
export function Modal({ open, onClose, title, children, size = "md" }) {
  const sizes = { sm: "max-w-sm", md: "max-w-lg", lg: "max-w-2xl", xl: "max-w-4xl" }
 
  useEffect(() => {
    const handler = (e) => { if (e.key === "Escape") onClose?.() }
    if (open) document.addEventListener("keydown", handler)
    return () => document.removeEventListener("keydown", handler)
  }, [open, onClose])
 
  if (!open) return null
 
  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 animate-fade-in">
      <div className="absolute inset-0 bg-surface/80 backdrop-blur-sm" onClick={onClose} />
      <div className={`relative w-full ${sizes[size]} card p-6 animate-slide-up`}>
        {title && (
          <div className="flex items-center justify-between mb-5">
            <h2 className="text-base font-semibold text-text-primary">{title}</h2>
            <button onClick={onClose} className="text-text-muted hover:text-text-primary transition-colors">
              <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
              </svg>
            </button>
          </div>
        )}
        {children}
      </div>
    </div>
  )
}
 
// ---------------------------------------------------------------------------
// Alert
// ---------------------------------------------------------------------------
export function Alert({ variant = "info", title, children }) {
  const styles = {
    info:    "bg-accent/10 border-accent/20 text-accent",
    success: "bg-success/10 border-success/20 text-success",
    warning: "bg-warning/10 border-warning/20 text-warning",
    danger:  "bg-danger/10 border-danger/20 text-danger",
  }
  return (
    <div className={`rounded-lg border p-4 ${styles[variant]}`}>
      {title && <p className="font-semibold text-sm mb-1">{title}</p>}
      <p className="text-sm opacity-90">{children}</p>
    </div>
  )
}
 
// ---------------------------------------------------------------------------
// StatCard
// ---------------------------------------------------------------------------
export function StatCard({ label, value, sub, accent = false }) {
  return (
    <div className="card p-5">
      <p className="section-title">{label}</p>
      <p className={`text-3xl font-bold font-mono mt-1 ${accent ? "text-primary" : "text-text-primary"}`}>
        {value}
      </p>
      {sub && <p className="text-xs text-text-muted mt-1">{sub}</p>}
    </div>
  )
}
 
// ---------------------------------------------------------------------------
// EmptyState
// ---------------------------------------------------------------------------
export function EmptyState({ icon, title, description, action }) {
  return (
    <div className="flex flex-col items-center justify-center py-16 text-center">
      {icon && <div className="text-text-muted mb-4 opacity-40">{icon}</div>}
      <p className="text-text-primary font-semibold text-base">{title}</p>
      {description && <p className="text-text-secondary text-sm mt-1 max-w-xs">{description}</p>}
      {action && <div className="mt-4">{action}</div>}
    </div>
  )
}
 
// ---------------------------------------------------------------------------
// Table
// ---------------------------------------------------------------------------
export function Table({ columns, data, loading, emptyMessage = "No data found." }) {
  if (loading) {
    return (
      <div className="flex justify-center py-12">
        <Spinner size="lg" />
      </div>
    )
  }
  if (!data?.length) {
    return <p className="text-center text-text-secondary py-12 text-sm">{emptyMessage}</p>
  }
  return (
    <div className="overflow-x-auto">
      <table className="w-full text-sm">
        <thead>
          <tr className="border-b border-border">
            {columns.map((col) => (
              <th key={col.key} className="text-left py-3 px-4 text-xs font-mono uppercase tracking-wider text-text-muted">
                {col.label}
              </th>
            ))}
          </tr>
        </thead>
        <tbody>
          {data.map((row, i) => (
            <tr key={i} className="border-b border-border/50 hover:bg-surface-2 transition-colors">
              {columns.map((col) => (
                <td key={col.key} className="py-3 px-4 text-text-secondary">
                  {col.render ? col.render(row) : row[col.key]}
                </td>
              ))}
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  )
}
 
// ---------------------------------------------------------------------------
// Toast
// ---------------------------------------------------------------------------
export function Toast({ message, type = "success", onClose }) {
  useEffect(() => {
    const t = setTimeout(onClose, 3500)
    return () => clearTimeout(t)
  }, [onClose])
 
  const styles = {
    success: "bg-success/10 border-success/30 text-success",
    error:   "bg-danger/10 border-danger/30 text-danger",
    info:    "bg-accent/10 border-accent/30 text-accent",
  }
  return (
    <div className={`fixed bottom-6 right-6 z-50 flex items-center gap-3 px-4 py-3 rounded-lg border shadow-card animate-slide-up ${styles[type]}`}>
      <span className="text-sm font-medium">{message}</span>
      <button onClick={onClose} className="opacity-60 hover:opacity-100">✕</button>
    </div>
  )
}
