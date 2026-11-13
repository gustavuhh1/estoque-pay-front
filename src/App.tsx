import { BrowserRouter, Route, Routes } from "react-router-dom"
import { AuthProvider } from "@/auth/AuthContext"
import ProtectedRoute from "@/auth/ProtectedRoute"
import { StoreProvider } from "@/store/StoreContext"
import { InventoryProvider } from "@/inventory/InventoryContext"
import DashboardLayout from "@/components/layout/DashboardLayout"
import { StoreTransitionProvider } from "@/components/layout/StoreTransition"

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
import Pdv from "@/pages/Pdv"
import Sales from "@/pages/Sales"
import Stock from "@/pages/Stock"
import Customers from "@/pages/Customers"
import Coupons from "@/pages/Coupons"
import SettingsPage from "@/pages/Settings"
import Profile from "@/pages/Profile"

export default function App() {
  return (
    <BrowserRouter>
      <AuthProvider>
        <StoreProvider>
          <InventoryProvider>
            <StoreTransitionProvider>
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
                  <Route element={<DashboardLayout />}>
                    <Route path="/painel" element={<Dashboard />} />
                    <Route path="/pdv" element={<Pdv />} />
                    <Route path="/vendas" element={<Sales />} />
                    <Route path="/estoque" element={<Stock />} />
                    <Route path="/clientes" element={<Customers />} />
                    <Route path="/cupons" element={<Coupons />} />
                    <Route path="/ajustes" element={<SettingsPage />} />
                    <Route path="/perfil" element={<Profile />} />
                  </Route>
                  <Route path="/403" element={<Forbidden />} />
                  <Route path="/erro-rede" element={<NetworkError />} />
                </Route>

                <Route path="*" element={<NotFound />} />
              </Routes>
            </StoreTransitionProvider>
          </InventoryProvider>
        </StoreProvider>
      </AuthProvider>
    </BrowserRouter>
  )
}
