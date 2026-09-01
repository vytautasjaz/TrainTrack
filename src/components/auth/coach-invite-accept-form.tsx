import { Button } from '@/components/ui/button'

type CoachInviteAcceptFormProps = {
  coachingCode: string
  coachName: string
  acceptAction: (formData: FormData) => Promise<void>
  declineAction: () => Promise<void>
}

export function CoachInviteAcceptForm({
  coachingCode,
  coachName,
  acceptAction,
  declineAction,
}: CoachInviteAcceptFormProps) {
  return (
    <div className="space-y-3">
      <form action={acceptAction}>
        <input type="hidden" name="coachingCode" value={coachingCode} />
        <Button type="submit" className="w-full">
          Accept — train with {coachName}
        </Button>
      </form>
      <form action={declineAction}>
        <Button type="submit" variant="outline" className="w-full">
          Not now
        </Button>
      </form>
    </div>
  )
}
