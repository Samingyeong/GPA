import { useState } from 'react'
import { useNavigate } from 'react-router-dom'
import './Auth.css'

function Login() {
  const [studentId, setStudentId] = useState('')
  const [password, setPassword] = useState('')
  const [error, setError] = useState('')
  const [isLoading, setIsLoading] = useState(false)
  const navigate = useNavigate()

  const handleSubmit = async (e) => {
    e.preventDefault()
    setError('')
    setIsLoading(true)

    try {
      const response = await fetch('/api/auth/login', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json'
        },
        body: JSON.stringify({
          studentId,
          password
        })
      })

      const result = await response.json()

      if (!result.success) {
        setError(result.message || '로그인에 실패했습니다')
        return
      }

      // 토큰 저장
      localStorage.setItem('token', result.data.token)
      localStorage.setItem('user', JSON.stringify(result.data.user))

      // 토큰 검증 확인
      try {
        const verifyResponse = await fetch('/api/auth/verify', {
          method: 'GET',
          headers: {
            'Authorization': `Bearer ${result.data.token}`,
            'Content-Type': 'application/json'
          }
        })

        const verifyResult = await verifyResponse.json()
        
        if (verifyResult.success) {
          console.log('✅ 토큰 검증 성공:', verifyResult.data)
          // 대시보드로 이동
          navigate('/dashboard')
        } else {
          setError('토큰 검증에 실패했습니다. 다시 로그인해주세요.')
          localStorage.removeItem('token')
          localStorage.removeItem('user')
        }
      } catch (verifyError) {
        console.error('토큰 검증 오류:', verifyError)
        setError('토큰 검증 중 오류가 발생했습니다.')
        localStorage.removeItem('token')
        localStorage.removeItem('user')
      }
    } catch (error) {
      console.error('로그인 오류:', error)
      setError('로그인 중 오류가 발생했습니다')
    } finally {
      setIsLoading(false)
    }
  }

  return (
    <div className="auth-container">
      <div className="auth-card">
        <h1>🎓 한밭대학교 GPA 계산기</h1>
        <h2>로그인</h2>

        {error && <div className="error-message">{error}</div>}

        <form onSubmit={handleSubmit}>
          <div className="form-group">
            <label htmlFor="studentId">학번</label>
            <input
              id="studentId"
              type="text"
              value={studentId}
              onChange={(e) => setStudentId(e.target.value)}
              placeholder="학번을 입력하세요"
              required
              disabled={isLoading}
            />
          </div>

          <div className="form-group">
            <label htmlFor="password">비밀번호</label>
            <input
              id="password"
              type="password"
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              placeholder="비밀번호를 입력하세요"
              required
              disabled={isLoading}
            />
          </div>

          <button type="submit" className="btn-primary" disabled={isLoading}>
            {isLoading ? '로그인 중...' : '로그인'}
          </button>
        </form>

        <div className="auth-link">
          계정이 없으신가요?{' '}
          <a href="/register" onClick={(e) => {
            e.preventDefault()
            navigate('/register')
          }}>
            회원가입
          </a>
        </div>
      </div>
    </div>
  )
}

export default Login

