import { PageTitle, Caption } from '@/components/ui/typography'

type PageHeaderProps = {
  title: string
  description?: string
  action?: React.ReactNode
}

export function PageHeader({ title, description, action }: PageHeaderProps) {
  return (
    <div
      data-page-header
      className="flex flex-wrap items-center justify-between gap-2 pt-2 lg:items-end lg:gap-3 lg:pt-4 landscape:max-lg:gap-1.5"
    >
      <div className="min-w-0">
        <PageTitle>{title}</PageTitle>
        {description && (
          <Caption className="mt-1 landscape:max-lg:mt-0">{description}</Caption>
        )}
      </div>
      {action && (
        <div className="flex min-w-0 items-center justify-end">
          {action}
        </div>
      )}
    </div>
  )
}
