export default function Card({ children, className = '', ...props }) {
  return (
    <div className={`bg-white rounded-lg border border-slate-200 shadow-sm ${className}`} {...props}>
      {children}
    </div>
  )
}

export function CardHeader({ children, className = '' }) {
  return <div className={`px-6 py-4 border-b border-slate-200 ${className}`}>{children}</div>
}

export function CardContent({ children, className = '' }) {
  return <div className={`px-6 py-4 ${className}`}>{children}</div>
}

export function CardTitle({ children, className = '' }) {
  return <h3 className={`text-lg font-semibold text-slate-900 ${className}`}>{children}</h3>
}
