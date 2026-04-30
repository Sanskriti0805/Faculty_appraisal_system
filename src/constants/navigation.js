export const FORM_SEQUENCE = [
  { name: 'Faculty Information', path: '/faculty-information' },
  // Teaching-Learning
  { name: 'Courses Taught', path: '/courses-taught' },
  { name: 'New Courses', path: '/new-courses' },
  { name: 'Courseware', path: '/courseware' },
  { name: 'Teaching Innovation', path: '/teaching-innovation' },
  // Research & Development
  { name: 'Research Publications', path: '/research-publications' },
  { name: 'Research Grants', path: '/research-grants' },
  { name: 'Patents', path: '/patents' },
  { name: 'Technology Transfer', path: '/technology-transfer' },
  { name: 'Paper Review', path: '/paper-review' },
  { name: 'Talks and Conferences', path: '/talks-and-conferences' },
  { name: 'Keynotes Talks', path: '/keynotes-talks' },
  { name: 'Conferences Outside', path: '/conferences-outside' },
  { name: 'Other Activities', path: '/other-activities' },
  { name: 'Awards/Honours', path: '/awards-honours' },
  { name: 'Consultancy', path: '/consultancy' },
  { name: 'Continuing Education', path: '/continuing-education' },
  // Other Institutional Activities
  { name: 'Institutional Contributions', path: '/institutional-contributions' },
  { name: 'Any other Important Activity', path: '/other-important-activities' },
  { name: 'Research Plan', path: '/research-plan' },
  { name: 'Teaching Plan', path: '/teaching-plan' },
  { name: 'Part B', path: '/part-b' }
];

export const getNextPath = (currentPath) => {
  const currentIndex = FORM_SEQUENCE.findIndex(item => item.path === currentPath);
  if (currentIndex !== -1 && currentIndex < FORM_SEQUENCE.length - 1) {
    return FORM_SEQUENCE[currentIndex + 1].path;
  }
  return null;
};

export const getPreviousPath = (currentPath) => {
  const currentIndex = FORM_SEQUENCE.findIndex(item => item.path === currentPath);
  if (currentIndex > 0) {
    return FORM_SEQUENCE[currentIndex - 1].path;
  }
  return null;
};
