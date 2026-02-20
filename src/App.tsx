import { useState } from 'react'
import reactLogo from './assets/react.svg'
import viteLogo from '/vite.svg'
import './App.css'

import { BrowserRouter, Routes, Route, Navigate } from 'react-router-dom'
import Login from './components/Login.tsx'
import Signup from './components/Signup.tsx'

function App() {
  const [count, setCount] = useState(0)
  const [user, setUser] = useState<string | null>(null)

  function handleLogin(username: string) {
    setUser(username)
  }

  function handleLogout() {
    setUser(null)
  }

  if (!user) {
    // unauthenticated: expose routes for login/signup
    return (
      <BrowserRouter>
        <Routes>
          <Route path="/login" element={<Login onLogin={handleLogin} />} />
          <Route path="/signup" element={<Signup />} />
          <Route path="/" element={<Navigate to="/login" replace />} />
          <Route path="*" element={<Navigate to="/login" replace />} />
        </Routes>
      </BrowserRouter>
    )
  }

  return (
    <>
      <header>
        <p>Bienvenido, {user}!</p>
        <button onClick={handleLogout}>Cerrar sesión</button>
      </header>
      <div>
        <a href="https://vite.dev" target="_blank">
          <img src={viteLogo} className="logo" alt="Vite logo" />
        </a>
        <a href="https://react.dev" target="_blank">
          <img src={reactLogo} className="logo react" alt="React logo" />
        </a>
      </div>
      <h1>Vite + React</h1>
      <div className="card">
        <button onClick={() => setCount((count) => count + 1)}>
          count is {count}
        </button>
        <p>
          Edit <code>src/App.tsx</code> and save to test HMR
        </p>
      </div>
      <p className="read-the-docs">
        Click on the Vite and React logos to learn more
      </p>
    </>
  )
}

export default App
