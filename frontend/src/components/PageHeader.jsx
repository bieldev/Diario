export function PageHeader({ emoji, title, subtitle }) {
  return (
    <div className="pt-5 pb-4">
      <h1 className="text-2xl font-extrabold text-gray-900 dark:text-white">
        {emoji} {title}
      </h1>
      {subtitle && <p className="text-sm text-gray-500 dark:text-slate-400 mt-0.5">{subtitle}</p>}
    </div>
  )
}
