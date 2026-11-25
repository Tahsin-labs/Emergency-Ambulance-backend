import { AmbulanceType, Priority } from '@prisma/client';

export const EmergencyTypeEnum = [
  'CARDIAC',
  'ACCIDENT',
  'STROKE',
  'BREATHING',
  'PREGNANCY',
  'BLEEDING',
  'BURN',
  'FRACTURE',
  'FEVER',
  'SEIZURE',
  'UNCONSCIOUS',
  'OTHER',
] as const;

export type EmergencyType = (typeof EmergencyTypeEnum)[number];

export interface IPriorityResult {
  priority: Priority;
  requiredType: AmbulanceType;
}

export const priorityRank = (priority: Priority): number => {
  switch (priority) {
    case Priority.CRITICAL:
      return 1;
    case Priority.HIGH:
      return 2;
    case Priority.MEDIUM:
      return 3;
    case Priority.LOW:
      return 4;
    default:
      return 5;
  }
};

/**
 * Evaluates the emergencyType and description keywords to determine Priority and required AmbulanceType.
 */
export const evaluatePriority = (
  emergencyType: EmergencyType,
  description?: string | null,
): IPriorityResult => {
  const desc = (description || '').toLowerCase();

  // If emergencyType is specified directly:
  switch (emergencyType) {
    case 'CARDIAC':
    case 'STROKE':
    case 'BREATHING':
    case 'UNCONSCIOUS':
      return { priority: Priority.CRITICAL, requiredType: AmbulanceType.ICU };

    case 'ACCIDENT':
      // Check if it's severe or minor
      if (
        desc.includes('severe') ||
        desc.includes('unconscious') ||
        desc.includes('head') ||
        desc.includes('bleeding heavily')
      ) {
        return { priority: Priority.CRITICAL, requiredType: AmbulanceType.ICU };
      }
      return { priority: Priority.HIGH, requiredType: AmbulanceType.ADVANCED };

    case 'PREGNANCY':
    case 'BURN':
    case 'SEIZURE':
      return { priority: Priority.HIGH, requiredType: AmbulanceType.ADVANCED };

    case 'BLEEDING':
      if (desc.includes('severe') || desc.includes('massive') || desc.includes('head')) {
        return { priority: Priority.CRITICAL, requiredType: AmbulanceType.ICU };
      }
      return { priority: Priority.HIGH, requiredType: AmbulanceType.ADVANCED };

    case 'FRACTURE':
    case 'FEVER':
      return { priority: Priority.MEDIUM, requiredType: AmbulanceType.BASIC };

    case 'OTHER':
    default: {
      // Keyword scanning on description
      const criticalKeywords = [
        'cardiac arrest',
        'heart attack',
        'unconscious',
        'severe bleeding',
        'breathing',
        'stroke',
        'choking',
        'chest pain',
        'collapsed',
      ];

      for (const kw of criticalKeywords) {
        if (desc.includes(kw)) {
          return { priority: Priority.CRITICAL, requiredType: AmbulanceType.ICU };
        }
      }

      const highKeywords = ['major accident', 'labor', 'pregnancy', 'burns', 'burn', 'seizure', 'convulsion'];
      for (const kw of highKeywords) {
        if (desc.includes(kw)) {
          return { priority: Priority.HIGH, requiredType: AmbulanceType.ADVANCED };
        }
      }

      const lowKeywords = ['non-urgent', 'routine transport', 'checkup', 'discharge'];
      for (const kw of lowKeywords) {
        if (desc.includes(kw)) {
          return { priority: Priority.LOW, requiredType: AmbulanceType.BASIC };
        }
      }

      return { priority: Priority.MEDIUM, requiredType: AmbulanceType.BASIC };
    }
  }
};
