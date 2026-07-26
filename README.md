# BloodPing
A modern, real-time blood donation network connecting donors and recipients instantly.

## Routing Structure
The application follows this main routing flow:
- `/` - **Landing Page**: Public access. Introduces the application with a hero section and calls-to-action. Redirects authenticated users to `/feed`.
- `/login`, `/signup` - **Auth Pages**: Public access for logging in and signing up. Redirects authenticated users to `/feed`.
- `/feed` - **Main Feed**: Protected route for authenticated users to view requests and donor status. Redirects unauthenticated users to `/login`.
- `/leaderboard` - **Leaderboard**: Protected route showing gamified community metrics.
- `/history` - **History / Requests**: Protected route for users to manage their activity.
- `/profile` - **Profile Details**: Protected route for personal data and statistics.
- `/vitals` - **Vitals**: Protected route tracking donor health requirements.
