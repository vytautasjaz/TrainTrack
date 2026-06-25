type PageHeaderProps = {
  title: string
  description?: string
  action?: React.ReactNode
}

export function PageHeader({ title, description, action }: PageHeaderProps) {
  return (
    <div className="flex flex-wrap items-end justify-between gap-3 landscape:max-lg:gap-1.5">
      <div className="min-w-0">
        <h1 className="text-2xl font-bold tracking-tight landscape:max-lg:text-lg">{title}</h1>
        {description && (
          <p className="mt-1 text-sm text-muted-foreground landscape:max-lg:mt-0 landscape:max-lg:text-xs">
            {description}
          </p>
        )}
      </div>
      {action && (
        <div className="flex max-w-full flex-wrap items-center justify-end gap-1 landscape:max-lg:gap-0.5">
          {action}
        </div>
      )}
    </div>
  )
}
