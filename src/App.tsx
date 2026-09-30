import { Navigate, Route, Routes } from 'react-router-dom';
import { Layout } from './components/Layout';
import { Library } from './pages/Library';
import { Practice } from './pages/Practice';
import { Progress } from './pages/Progress';
import { Review } from './pages/Review';
import { Settings } from './pages/Settings';
import { Today } from './pages/Today';
import { TrackPage } from './pages/Track';

export function App() {
  return (
    <Routes>
      <Route element={<Layout />}>
        <Route index element={<Today />} />
        <Route path="library" element={<Library />} />
        <Route path="track/:topic/:level" element={<TrackPage />} />
        <Route path="review" element={<Review />} />
        <Route path="progress" element={<Progress />} />
        <Route path="settings" element={<Settings />} />
      </Route>
      <Route path="practice/:topic/:level/:grammar/:type" element={<Practice />} />
      <Route path="*" element={<Navigate to="/" replace />} />
    </Routes>
  );
}
