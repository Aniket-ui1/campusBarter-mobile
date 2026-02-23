export const CATEGORIES = [
    { key: 'all', label: 'All', icon: '✨' },
    { key: 'coding', label: 'Coding', icon: '💻' },
    { key: 'design', label: 'Design', icon: '🎨' },
    { key: 'math', label: 'Math', icon: '📐' },
    { key: 'writing', label: 'Writing', icon: '✍️' },
    { key: 'music', label: 'Music', icon: '🎵' },
    { key: 'languages', label: 'Languages', icon: '🗣️' },
    { key: 'science', label: 'Science', icon: '🔬' },
    { key: 'business', label: 'Business', icon: '📊' },
    { key: 'fitness', label: 'Fitness', icon: '💪' },
    { key: 'photography', label: 'Photo', icon: '📷' },
    { key: 'other', label: 'Other', icon: '🔧' },
] as const;

export const PROGRAMS = [
    'Software Development',
    'Business Administration',
    'Graphic Design',
    'Nursing',
    'Engineering',
    'Hospitality',
    'Journalism',
    'Other',
] as const;

export const SEMESTERS = [1, 2, 3, 4, 5, 6, 7, 8] as const;

export const AVAILABILITY_OPTIONS = [
    { key: 'available', label: 'Available', color: '#22C55E' },
    { key: 'busy', label: 'Busy', color: '#FACC15' },
    { key: 'offline', label: 'Offline', color: '#EF4444' },
] as const;

export const LOCATION_OPTIONS = [
    { key: 'online', label: 'Online' },
    { key: 'campus', label: 'On Campus' },
    { key: 'both', label: 'Both' },
] as const;
