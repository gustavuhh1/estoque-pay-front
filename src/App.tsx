import { BrowserRouter, Routes, Route } from "react-router-dom"

import Landing from "@/pages/Landing"
import Login from "@/pages/Login"
import Signup from "@/pages/Signup"
import ForgotPassword from "@/pages/ForgotPassword"
import Legal from "@/pages/Legal"

export default function App() {
  return (
    <BrowserRouter>
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
