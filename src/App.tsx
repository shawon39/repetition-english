import { MotionConfig } from 'motion/react';
import { Navigate, Route, Routes } from 'react-router-dom';
import { Layout } from './components/Layout';
import { Home } from './pages/Home';
import { Practice } from './pages/Practice';
import { Progress } from './pages/Progress';
import { Review } from './pages/Review';
import { Settings } from './pages/Settings';
import { Topic } from './pages/Topic';
import { Topics } from './pages/Topics';

export function App() {
  return (
    <MotionConfig reducedMotion="user">
      <Routes>
        <Route element={<Layout />}>
          <Route index element={<Home />} />
          <Route path="topics" element={<Topics />} />
          <Route path="topic/:topic/:level" element={<Topic />} />
          <Route path="review" element={<Review />} />
          <Route path="progress" element={<Progress />} />
          <Route path="settings" element={<Settings />} />
        </Route>
        <Route path="practice/:topic/:level/:grammar/:type" element={<Practice />} />
        <Route path="*" element={<Navigate to="/" replace />} />
      </Routes>
    </MotionConfig>
  );
}
