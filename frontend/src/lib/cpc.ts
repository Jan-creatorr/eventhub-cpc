// Campus identity and rules shown across the EventHub interface. These mirror
// the server configuration so the UI can give helpful, immediate feedback.

export const SYSTEM_NAME = 'EventHub';
export const COLLEGE_NAME = 'Cordova Public College';
export const COLLEGE_SHORT_NAME = 'CPC';

export const CPC_COURSES = [
  'BS Information Technology',
  'BS Computer Science',
  'BS Education',
  'BS Business Administration',
  'BS Accountancy',
  'BS Hospitality Management',
  'BS Criminology',
  'BS Industrial Technology',
];

export const CPC_YEAR_LEVELS = [1, 2, 3, 4];

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
];

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
];

export function yearLevelLabel(year: number): string {
  const names = ['1st Year', '2nd Year', '3rd Year', '4th Year'];
  return names[year - 1] ?? `Year ${year}`;
}
