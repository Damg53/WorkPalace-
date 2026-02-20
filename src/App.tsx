import { useState } from 'react'
import reactLogo from './assets/react.svg'
import viteLogo from '/vite.svg'
import './App.css'

import Login from './components/Login'

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
    // render login form when there is no authenticated user
    return <Login onLogin={handleLogin} />
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
