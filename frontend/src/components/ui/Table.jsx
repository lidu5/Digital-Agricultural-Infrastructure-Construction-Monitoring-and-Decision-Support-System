export default function Table({ children, className = '' }) {
  return (
    <div className="overflow-x-auto">
      <table className={`min-w-full divide-y divide-slate-200 ${className}`}>
        {children}
      </table>
    </div>
  )
}

export function TableHeader({ children }) {
  return <thead className="bg-slate-50">{children}</thead>
}

export function TableBody({ children }) {
  return <tbody className="bg-white divide-y divide-slate-200">{children}</tbody>
}

export function TableRow({ children, className = '', ...props }) {
  return <tr className={`hover:bg-slate-50 ${className}`} {...props}>{children}</tr>
}

export function TableHead({ children, className = '' }) {
  return (
    <th className={`px-6 py-3 text-left text-xs font-medium text-slate-500 uppercase tracking-wider ${className}`}>
      {children}
    </th>
  )
}

export function TableCell({ children, className = '' }) {
  return <td className={`px-6 py-4 text-sm text-slate-900 ${className}`}>{children}</td>
}
