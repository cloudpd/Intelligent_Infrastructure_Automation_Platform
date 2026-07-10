
import React from 'react'
import Navbar from '../../Navbar/Navbar.jsx'
import { Outlet, useLocation } from 'react-router-dom'
import Footer from '../../Footer/Footer'

export default function Mainlayout() {
  const location = useLocation();
  const authShellPaths = ['/', '/login', '/register', '/account-recovery'];
  const showShell = !authShellPaths.includes(location.pathname);

  return (
    <>
      {showShell && <Navbar />}
      <Outlet />
      {showShell && <Footer />}
    </>
  )
}
