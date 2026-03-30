export function Card({ children, className = '' }) {
  return (
    <div className={`bg-white dark:bg-[#1e1640] rounded-2xl shadow-sm transition-colors duration-400 ${className}`}>
      {children}
    </div>
  )
}
