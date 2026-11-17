import { Route, Routes } from 'react-router-dom';
import { AppShell, RequireAdmin, RequireAuth } from './components/layout';
import { Home } from './pages/Home';
import { Login } from './pages/Login';
import { Register } from './pages/Register';
import { Dashboard } from './pages/Dashboard';
import { Events } from './pages/Events';
import { EventDetail } from './pages/EventDetail';
import { MyRegistrations } from './pages/MyRegistrations';
import { AdminEvents } from './pages/AdminEvents';
import { AdminStudents } from './pages/AdminStudents';
import { AdminRegistrations } from './pages/AdminRegistrations';
import { Profile } from './pages/Profile';
import { SecurityCenter } from './pages/SecurityCenter';
import { NotFound } from './pages/NotFound';

export default function App() {
  return (
    <Routes>
      <Route path="/" element={<Login />} />
      <Route path="/login" element={<Login />} />
      <Route path="/register" element={<Register />} />

      <Route element={<RequireAuth />}>
        <Route element={<AppShell />}>
          <Route path="/home" element={<Home />} />
          <Route path="/dashboard" element={<Dashboard />} />
          <Route path="/events" element={<Events />} />
          <Route path="/events/:id" element={<EventDetail />} />
          <Route path="/my-events" element={<MyRegistrations />} />
          <Route path="/security" element={<SecurityCenter />} />
          <Route path="/profile" element={<Profile />} />

          <Route element={<RequireAdmin />}>
            <Route path="/admin/events" element={<AdminEvents />} />
            <Route path="/admin/students" element={<AdminStudents />} />
            <Route path="/admin/registrations" element={<AdminRegistrations />} />
          </Route>
        </Route>
      </Route>

      <Route path="*" element={<NotFound />} />
    </Routes>
  );
}
