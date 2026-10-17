import {
  PageHeader,
  PageHeaderDescription,
  PageHeaderTitle,
} from '@/components/ui/page-header'

/** Analytics H1 — white on the charcoal `.app-gradient` fade, orange period. */
export function StatsPageHeader({
  title,
  description,
}: {
  title: string
  description?: string
}) {
  return (
    <PageHeader>
      <div className="min-w-0">
        <PageHeaderTitle className="tt-stats-page-title">
          {title}
        </PageHeaderTitle>
        {description ? (
          <PageHeaderDescription className="tt-stats-page-description">
            {description}
          </PageHeaderDescription>
        ) : null}
      </div>
    </PageHeader>
  )
}
