import { useEffect } from 'react';
import { useLocation } from 'react-router-dom';

export const PAGE_TITLES: Record<string, string> = {
  '/': 'BloodPing | A Blood Donation Social Network',
  '/feed': 'BloodPing | Feed',
  '/leaderboard': 'BloodPing | Leaderboard',
  '/profile': 'BloodPing | Profile',
  '/history': 'BloodPing | Donation History',
  '/login': 'BloodPing | Login',
  '/signup': 'BloodPing | Sign Up',
  '/become-donor': 'BloodPing | Become a Donor',
  '/setup-profile': 'BloodPing | Setup Profile',
  '/vitals': 'BloodPing | VitalCore',
  '/suspended': 'BloodPing | Account Suspended',
  '/admin/login': 'BloodPing | Admin Login',
  '/admin/dashboard': 'BloodPing | Admin Dashboard',
  '/admin': 'BloodPing | Admin Dashboard',
  '/notifications': 'BloodPing | Notifications',
};

/**
 * Derives the appropriate page title based on the pathname.
 */
export function getPageTitle(pathname: string): string {
  if (PAGE_TITLES[pathname]) {
    return PAGE_TITLES[pathname];
  }
  if (pathname.startsWith('/admin')) {
    return 'BloodPing | Admin';
  }
  const segment = pathname.split('/').filter(Boolean)[0];
  if (segment) {
    const formatted = segment
      .split('-')
      .map(word => word.charAt(0).toUpperCase() + word.slice(1))
      .join(' ');
    return `BloodPing | ${formatted}`;
  }
  return 'BloodPing';
}

/**
 * Hook to automatically synchronize the document title with the current route,
 * with optional support for custom override titles.
 */
export function useDocumentTitle(overrideTitle?: string) {
  const location = useLocation();

  useEffect(() => {
    if (overrideTitle) {
      document.title = overrideTitle.startsWith('BloodPing')
        ? overrideTitle
        : `BloodPing | ${overrideTitle}`;
    } else {
      document.title = getPageTitle(location.pathname);
    }
  }, [location.pathname, overrideTitle]);
}
