import { Routes, Route, Navigate } from 'react-router-dom';
import { AuthGuard, GuestGuard } from '../features/auth/AuthGuard';
import { AppLayout } from '../components/layout/AppLayout';
import { LoginPage } from '../features/auth/LoginPage';
import { RegisterPage } from '../features/auth/RegisterPage';
import { DashboardPage } from '../features/dashboard/DashboardPage';
import { LearningPage } from '../features/learning/LearningPage';
import { TutorPage } from '../features/learning/TutorPage';
import { DiagnosticPage } from '../features/learning/DiagnosticPage';
import { ContestListPage } from '../features/contest/ContestListPage';
import { CreateContestPage } from '../features/contest/CreateContestPage';
import { ContestLobbyPage } from '../features/contest/ContestLobbyPage';
import { ContestArenaPage } from '../features/contest/ContestArenaPage';
import { ContestResultsPage } from '../features/contest/ContestResultsPage';
import { ProfilePage } from '../features/profile/ProfilePage';
import { LeaderboardPage } from '../features/profile/LeaderboardPage';

export function AppRouter() {
  return (
    <Routes>
      {/* Guest routes */}
      <Route element={<GuestGuard />}>
        <Route path="/login" element={<LoginPage />} />
        <Route path="/register" element={<RegisterPage />} />
      </Route>

      {/* Protected routes */}
      <Route element={<AuthGuard />}>
        {/* Contest arena — full screen, no sidebar */}
        <Route path="/contests/:code/arena" element={<ContestArenaPage />} />

        {/* Routes with sidebar */}
        <Route element={<AppLayout />}>
          <Route path="/dashboard" element={<DashboardPage />} />
          <Route path="/learn" element={<LearningPage />} />
          <Route path="/tutor" element={<TutorPage />} />
          <Route path="/diagnostic" element={<DiagnosticPage />} />
          <Route path="/contests" element={<ContestListPage />} />
          <Route path="/contests/new" element={<CreateContestPage />} />
          <Route path="/contests/:code/lobby" element={<ContestLobbyPage />} />
          <Route path="/contests/:id/results" element={<ContestResultsPage />} />
          <Route path="/profile" element={<ProfilePage />} />
          <Route path="/leaderboard" element={<LeaderboardPage />} />
        </Route>
      </Route>

      {/* Redirects */}
      <Route path="/" element={<Navigate to="/dashboard" replace />} />
      <Route path="*" element={<Navigate to="/dashboard" replace />} />
    </Routes>
  );
}
