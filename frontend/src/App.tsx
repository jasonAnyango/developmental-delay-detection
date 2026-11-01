import { Route, Routes } from 'react-router-dom'
import Layout from './components/Layout.tsx'
import { GuestRoute, ProtectedRoute } from './components/RouteGuards.tsx'
import Assess from './pages/Assess.tsx'
import Home from './pages/Home.tsx'
import Login from './pages/Login.tsx'
import NotFound from './pages/NotFound.tsx'
import Register from './pages/Register.tsx'

export default function App() {
  return (
    <Routes>
      <Route element={<ProtectedRoute />}>
        <Route element={<Layout />}>
          <Route path="/" element={<Home />} />
          <Route path="/assess" element={<Assess />} />
        </Route>
      </Route>
      <Route element={<GuestRoute />}>
        <Route path="/login" element={<Login />} />
        <Route path="/register" element={<Register />} />
      </Route>
      <Route path="*" element={<NotFound />} />
    </Routes>
  )
}