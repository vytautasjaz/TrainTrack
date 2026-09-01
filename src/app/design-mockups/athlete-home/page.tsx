import { MockAppChrome } from '../_components/mock-app-chrome'
import { AthleteHomeContent } from '../_components/athlete-home-content'

export default function AthleteHomeMockPage() {
  return (
    <MockAppChrome title="Athlete Home · Desktop" status="Review" role="athlete" activeNav="">
      <AthleteHomeContent />
    </MockAppChrome>
  )
}
