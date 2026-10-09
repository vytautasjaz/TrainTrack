import { WorkoutType } from '@prisma/client'
import {
  ADAPTATION_KEYS,
  type AdaptationScores,
  type DemandProfileId,
  type RaceDemandProfile,
} from '@/lib/coach-engine/types'
import { resolveSportArchitecture } from '@/lib/coach-engine/sport-architecture'

function scores(partial: Partial<AdaptationScores>): AdaptationScores {
  const out = {} as AdaptationScores
  for (const key of ADAPTATION_KEYS) {
    out[key] = partial[key] ?? 0.4
  }
  return out
}

export const RACE_DEMAND_PROFILES: Record<DemandProfileId, RaceDemandProfile> = {
  MARATHON_V1: {
    id: 'MARATHON_V1',
    label: 'Marathon',
    sportFocus: WorkoutType.RUN,
    architecture: resolveSportArchitecture({ demandId: 'MARATHON_V1' }),
    demands: scores({
      aerobic_capacity: 0.9,
      threshold: 0.85,
      aerobic_durability: 0.95,
      running_economy: 0.8,
      long_run_tolerance: 0.95,
      speed: 0.4,
      max_strength: 0.3,
    }),
    importance: scores({
      aerobic_capacity: 0.85,
      threshold: 0.8,
      aerobic_durability: 1,
      running_economy: 0.7,
      long_run_tolerance: 1,
      speed: 0.35,
      max_strength: 0.4,
    }),
    extended: {
      fuel_utilization: 0.9,
      msk_durability: 0.85,
      race_specific_endurance: 0.9,
    },
  },
  HALF_V1: {
    id: 'HALF_V1',
    label: 'Half marathon',
    sportFocus: WorkoutType.RUN,
    architecture: resolveSportArchitecture({ demandId: 'HALF_V1' }),
    demands: scores({
      aerobic_capacity: 0.85,
      threshold: 0.88,
      aerobic_durability: 0.82,
      running_economy: 0.78,
      long_run_tolerance: 0.8,
      speed: 0.55,
      max_strength: 0.35,
    }),
    importance: scores({
      aerobic_capacity: 0.8,
      threshold: 0.95,
      aerobic_durability: 0.85,
      running_economy: 0.7,
      long_run_tolerance: 0.8,
      speed: 0.5,
      max_strength: 0.4,
    }),
    extended: {
      fuel_utilization: 0.7,
      msk_durability: 0.7,
      race_specific_endurance: 0.8,
    },
  },
  '5K_V1': {
    id: '5K_V1',
    label: '5K',
    sportFocus: WorkoutType.RUN,
    architecture: resolveSportArchitecture({ demandId: '5K_V1' }),
    demands: scores({
      aerobic_capacity: 0.88,
      threshold: 0.8,
      aerobic_durability: 0.55,
      running_economy: 0.82,
      long_run_tolerance: 0.45,
      speed: 0.9,
      max_strength: 0.45,
    }),
    importance: scores({
      aerobic_capacity: 0.9,
      threshold: 0.75,
      aerobic_durability: 0.45,
      running_economy: 0.8,
      long_run_tolerance: 0.35,
      speed: 1,
      max_strength: 0.5,
    }),
    extended: {
      race_specific_endurance: 0.75,
      msk_durability: 0.55,
    },
  },
  HYROX_V1: {
    id: 'HYROX_V1',
    label: 'HYROX',
    sportFocus: WorkoutType.HYROX,
    architecture: resolveSportArchitecture({ demandId: 'HYROX_V1' }),
    demands: scores({
      aerobic_capacity: 0.8,
      threshold: 0.75,
      aerobic_durability: 0.7,
      running_economy: 0.65,
      long_run_tolerance: 0.5,
      speed: 0.7,
      max_strength: 0.9,
    }),
    importance: scores({
      aerobic_capacity: 0.75,
      threshold: 0.7,
      aerobic_durability: 0.65,
      running_economy: 0.55,
      long_run_tolerance: 0.4,
      speed: 0.65,
      max_strength: 1,
    }),
    extended: {
      compromised_running: 0.95,
      strength_endurance: 0.95,
      race_specific_endurance: 0.85,
      msk_durability: 0.8,
    },
  },
  MULTI_BASE_V1: {
    id: 'MULTI_BASE_V1',
    label: 'Multi-sport base',
    sportFocus: WorkoutType.TRIATHLON,
    architecture: resolveSportArchitecture({ demandId: 'MULTI_BASE_V1' }),
    demands: scores({
      aerobic_capacity: 0.85,
      threshold: 0.7,
      aerobic_durability: 0.8,
      running_economy: 0.6,
      long_run_tolerance: 0.65,
      speed: 0.45,
      max_strength: 0.55,
    }),
    importance: scores({
      aerobic_capacity: 0.9,
      threshold: 0.65,
      aerobic_durability: 0.85,
      running_economy: 0.5,
      long_run_tolerance: 0.6,
      speed: 0.4,
      max_strength: 0.55,
    }),
    extended: {
      fuel_utilization: 0.75,
      msk_durability: 0.7,
    },
  },
}

export function getDemandProfile(id: DemandProfileId): RaceDemandProfile {
  return RACE_DEMAND_PROFILES[id]
}

export function demandIdForSkillSlug(skillSlug: string): DemandProfileId {
  switch (skillSlug) {
    case 'run-marathon':
      return 'MARATHON_V1'
    case 'run-half-marathon':
      return 'HALF_V1'
    case 'run-5k-build':
      return '5K_V1'
    case 'hyrox-general':
      return 'HYROX_V1'
    case 'multi-sport-base':
      return 'MULTI_BASE_V1'
    default:
      return 'HALF_V1'
  }
}
