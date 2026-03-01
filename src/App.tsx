import { BrowserRouter, Routes, Route, Navigate } from 'react-router-dom';
import Layout from './components/Layout';
import Airlock from './pages/Airlock';
import Void from './pages/Void';
import Archive from './pages/Archive';
import Terminal from './pages/Terminal';
import Studio from './pages/Studio';
import Welcome from './pages/Welcome';
import AdminPanel from './pages/AdminPanel';
import { UserProvider, useUser } from './contexts/UserContext';

function AppContent() {
  const { currentUser, isLoading } = useUser();

  if (isLoading) {
    return (
      <div className="h-screen w-screen bg-background-dark flex items-center justify-center font-mono text-primary animate-pulse">
        SYNCHRONIZING_NERVES...
      </div>
    );
  }

  return (
    <BrowserRouter>
      <Routes>
        <Route path="/welcome" element={<Welcome />} />

        <Route path="/" element={currentUser ? <Layout /> : <Navigate to="/welcome" />}>
          <Route index element={<Airlock />} />
          <Route path="void" element={<Void />} />
          <Route path="archive" element={<Archive />} />
          <Route path="terminal" element={<Terminal />} />
          <Route path="studio" element={<Studio />} />
          <Route path="admin" element={<AdminPanel />} />
        </Route>

        <Route path="*" element={<Navigate to={currentUser ? "/" : "/welcome"} />} />
      </Routes>
    </BrowserRouter>
  );
}

export default function App() {
  return (
    <UserProvider>
      <AppContent />
    </UserProvider>
  );
}
