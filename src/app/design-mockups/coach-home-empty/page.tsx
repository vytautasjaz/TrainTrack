import { MockAppChrome } from '../_components/mock-app-chrome'
import {
  CoachHomeEmptyMockContent,
  CoachHomeEmptyMockVariantLinks,
} from '../_components/coach-home-empty-mock-content'

export default async function CoachHomeEmptyMockPage({
  searchParams,
}: {
  searchParams: Promise<{ requests?: string }>
}) {
  const params = await searchParams
  const showRequests = params.requests === '1'

  return (
    <MockAppChrome
      title="Coach Home · Empty (no athletes)"
      status="Review"
      role="coach"
      activeNav=""
    >
      <CoachHomeEmptyMockVariantLinks showRequests={showRequests} />
      <CoachHomeEmptyMockContent showRequests={showRequests} />
    </MockAppChrome>
  )
}
