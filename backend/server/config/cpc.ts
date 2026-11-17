// Campus constants that define what belongs on EventHub. Both the server and
// the seed script use these lists so every event is clearly a CPC event.

export const CPC_COURSES = [
  'BS Information Technology',
  'BS Computer Science',
  'BS Education',
  'BS Business Administration',
  'BS Accountancy',
  'BS Hospitality Management',
  'BS Criminology',
  'BS Industrial Technology',
] as const;

export const CPC_YEAR_LEVELS = [1, 2, 3, 4] as const;

export const CPC_EVENT_CATEGORIES = [
  'Academic',
  'Sports',
  'Cultural',
  'Student Government',
  'Organization',
  'Seminar',
  'Community Outreach',
  'Orientation',
  'Foundation Day',
] as const;

export const CPC_ORGANIZATIONS = [
  'CPC Student Council',
  'College of Computer Studies',
  'College of Education',
  'College of Business',
  'College of Criminal Justice',
  'College of Hospitality Management',
  'CPC Cultural Affairs Office',
  'CPC Sports and Wellness Office',
  'CPC Research Office',
  'CPC Community Extension Office',
] as const;

export function isCpcCategory(value: string): boolean {
  return (CPC_EVENT_CATEGORIES as readonly string[]).includes(value);
}

export function isCpcOrganization(value: string): boolean {
  return (CPC_ORGANIZATIONS as readonly string[]).includes(value);
}

export function isCpcCourse(value: string): boolean {
  return (CPC_COURSES as readonly string[]).includes(value);
}
