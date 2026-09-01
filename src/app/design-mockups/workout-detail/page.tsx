'use client'

import { MockAppChrome } from '../_components/mock-app-chrome'
import { WorkoutDetailGallery } from '../_components/workout-detail-content'

export default function WorkoutDetailMockPage() {
  return (
    <MockAppChrome
      title="Workout Cards & Modals · Spec"
      status="Review"
      role="athlete"
      activeNav="Training"
    >
      <WorkoutDetailGallery />
    </MockAppChrome>
  )
}
