/**
 * Shared academic utility functions for Campus Nexus.
 * RVCE Academic Rules:
 * - 2025 batch (email containing '25', USN containing '25', or joining_year 2025):
 *   Academic Year: 2nd Year (Year 2)
 *   Current Semester: 3rd Sem (Semester 3)
 * - 2026 batch (joining_year 2026 / '26'):
 *   Academic Year: 1st Year (Year 1)
 *   Current Semester: 1st Sem (Semester 1)
 * - 2024 batch (joining_year 2024 / '24'):
 *   Academic Year: 3rd Year (Year 3)
 *   Current Semester: 5th Sem (Semester 5)
 * - 2023 batch (joining_year 2023 / '23'):
 *   Academic Year: 4th Year (Year 4)
 *   Current Semester: 7th Sem (Semester 7)
 */

export function getStudentSemester(user: any): string {
  if (!user) return '3rd Sem';

  const emailStr = (user.email || '').toLowerCase();
  const usnStr = (user.usn || '').toLowerCase();
  const checkStr = `${emailStr} ${usnStr}`;

  // Direct rule: Any email or USN with 25 is 3rd Sem (2nd Year)
  if (checkStr.includes('25') || Number(user.joining_year) === 2025 || Number(user.joiningYear) === 2025) {
    return '3rd Sem';
  }
  // Any email or USN with 26 is 1st Sem (1st Year)
  if (checkStr.includes('26') || Number(user.joining_year) === 2026 || Number(user.joiningYear) === 2026) {
    return '1st Sem';
  }
  // Any email or USN with 24 is 5th Sem (3rd Year)
  if (checkStr.includes('24') || Number(user.joining_year) === 2024 || Number(user.joiningYear) === 2024) {
    return '5th Sem';
  }
  // Any email or USN with 23 is 7th Sem (4th Year)
  if (checkStr.includes('23') || Number(user.joining_year) === 2023 || Number(user.joiningYear) === 2023) {
    return '7th Sem';
  }

  // Fallback based on year_of_study
  const yr = Number(user.year_of_study);
  if (yr === 2) return '3rd Sem';
  if (yr === 1) return '1st Sem';
  if (yr === 3) return '5th Sem';
  if (yr === 4) return '7th Sem';

  return '3rd Sem';
}

export function getStudentYearOfStudy(user: any): number {
  if (!user) return 2;

  const emailStr = (user.email || '').toLowerCase();
  const usnStr = (user.usn || '').toLowerCase();
  const checkStr = `${emailStr} ${usnStr}`;

  if (checkStr.includes('25') || Number(user.joining_year) === 2025 || Number(user.joiningYear) === 2025) {
    return 2;
  }
  if (checkStr.includes('26') || Number(user.joining_year) === 2026 || Number(user.joiningYear) === 2026) {
    return 1;
  }
  if (checkStr.includes('24') || Number(user.joining_year) === 2024 || Number(user.joiningYear) === 2024) {
    return 3;
  }
  if (checkStr.includes('23') || Number(user.joining_year) === 2023 || Number(user.joiningYear) === 2023) {
    return 4;
  }

  const yr = Number(user.year_of_study);
  if (yr >= 1 && yr <= 4) return yr;

  return 2;
}

export function getStudentYearDisplay(user: any): string {
  const yr = getStudentYearOfStudy(user);
  switch (yr) {
    case 1:
      return '1st Year';
    case 2:
      return '2nd Year';
    case 3:
      return '3rd Year';
    case 4:
      return '4th Year';
    default:
      return `${yr}th Year`;
  }
}
