import { BrowserRouter, Route, Routes } from "react-router-dom"
import { AuthProvider } from "@/auth/AuthContext"
import ProtectedRoute from "@/auth/ProtectedRoute"
import { StoreProvider } from "@/store/StoreContext"
import { BrowserRouter, Routes, Route } from "react-router-dom"

import Landing from "@/pages/Landing"
import Login from "@/pages/Login"
import Signup from "@/pages/Signup"
import ForgotPassword from "@/pages/ForgotPassword"
import Legal from "@/pages/Legal"
import Dashboard from "@/pages/Dashboard"
import StoreSelection from "@/pages/StoreSelection"
import Onboarding from "@/pages/Onboarding"
import ResetPassword from "@/pages/ResetPassword"
import Forbidden from "@/pages/Forbidden"
import NotFound from "@/pages/NotFound"
import NetworkError from "@/pages/NetworkError"

export default function App() {
  return (
    <BrowserRouter>
      <AuthProvider>
        <StoreProvider>
          <Routes>
            <Route path="/" element={<Landing />} />
            <Route path="/login" element={<Login />} />
            <Route path="/cadastro" element={<Signup />} />
            <Route path="/recuperar-senha" element={<ForgotPassword />} />
            <Route path="/redefinir-senha" element={<ResetPassword />} />
            <Route path="/termos" element={<Legal type="terms" />} />
            <Route path="/privacidade" element={<Legal type="privacy" />} />

            <Route element={<ProtectedRoute />}>
              <Route path="/lojas" element={<StoreSelection />} />
              <Route path="/onboarding" element={<Onboarding />} />
              <Route path="/painel" element={<Dashboard />} />
              <Route path="/403" element={<Forbidden />} />
              <Route path="/erro-rede" element={<NetworkError />} />
            </Route>

            <Route path="*" element={<NotFound />} />
          </Routes>
        </StoreProvider>
      </AuthProvider>
      <Routes>
        <Route path="/" element={<Landing />} />
        <Route path="/login" element={<Login />} />
        <Route path="/cadastro" element={<Signup />} />
        <Route path="/recuperar-senha" element={<ForgotPassword />} />
        <Route path="/termos" element={<Legal type="terms" />} />
        <Route path="/privacidade" element={<Legal type="privacy" />} />
      </Routes>
    </BrowserRouter>
  )
}
