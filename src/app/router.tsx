import { createBrowserRouter } from 'react-router-dom';
import { AppLayout } from '../components/layout/AppLayout';
import { ExercisesPage } from '../features/exercises/ExercisesPage';
import { GraphsPage } from '../features/graphs/GraphsPage';
import { HistoryPage } from '../features/history/HistoryPage';
import { MenusPage } from '../features/menus/MenusPage';
import { SettingsPage } from '../features/settings/SettingsPage';
import { WorkoutPage } from '../features/workout/WorkoutPage';

export const router = createBrowserRouter([
  {
    path: '/',
    element: <AppLayout />,
    children: [
      { index: true, element: <WorkoutPage /> },
      { path: 'graphs', element: <GraphsPage /> },
      { path: 'history', element: <HistoryPage /> },
      { path: 'exercises', element: <ExercisesPage /> },
      { path: 'menus', element: <MenusPage /> },
      { path: 'settings', element: <SettingsPage /> }
    ]
  }
]);
