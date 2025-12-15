import { BrowserRouter, Routes, Route, Navigate } from 'react-router-dom'
import { useState, useEffect } from 'react'
import './App.css'
import Login from './pages/Login'
import Register from './pages/Register'
import GPACalculator from './components/GPACalculator'

// 인증 보호 컴포넌트
function ProtectedRoute({ children }) {
  const [isAuthenticated, setIsAuthenticated] = useState(null)

  useEffect(() => {
    const token = localStorage.getItem('token')
    if (token) {
      // 토큰 검증
      fetch('/api/auth/verify', {
        headers: {
          'Authorization': `Bearer ${token}`
        }
      })
        .then(res => res.json())
        .then(result => {
          setIsAuthenticated(result.success)
        })
        .catch(() => {
          setIsAuthenticated(false)
          localStorage.removeItem('token')
          localStorage.removeItem('user')
        })
    } else {
      setIsAuthenticated(false)
    }
  }, [])

  if (isAuthenticated === null) {
    return <div className="loading">로딩 중...</div>
  }

  return isAuthenticated ? children : <Navigate to="/login" replace />
}

function App() {
  return (
    <BrowserRouter>
      <div className="App">
        <Routes>
          <Route path="/login" element={<Login />} />
          <Route path="/register" element={<Register />} />
          <Route 
            path="/dashboard" 
            element={
              <ProtectedRoute>
                <GPACalculator />
              </ProtectedRoute>
            } 
          />
          <Route path="/" element={<Navigate to="/dashboard" replace />} />
        </Routes>
      </div>
    </BrowserRouter>
  )
}

export default App

