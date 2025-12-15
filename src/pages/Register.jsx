import { useState, useEffect } from 'react'
import { useNavigate } from 'react-router-dom'
import './Auth.css'

function Register() {
  const [formData, setFormData] = useState({
    studentId: '',
    password: '',
    passwordConfirm: '',
    name: '',
    admissionDate: '',
    currentYear: 1,
    status: '재학중',
    department: '',
    majors: {
      primary: '',
      double: [],
      minor: [],
      fusion: [],
      advanced: []
    },
    curriculumYear: '2019',
    studentType: '신입생'
  })

  const [departments, setDepartments] = useState([])
  const [errors, setErrors] = useState({})
  const [isLoading, setIsLoading] = useState(false)
  const navigate = useNavigate()

  // 학과 목록 불러오기
  useEffect(() => {
    fetch('/api/courses/departments')
      .then(res => res.json())
      .then(result => {
        if (result.success) {
          setDepartments(result.data)
        }
      })
      .catch(error => {
        console.error('학과 목록 조회 오류:', error)
      })
  }, [])

  const handleChange = (e) => {
    const { name, value, type, checked } = e.target

    if (name.startsWith('major.')) {
      const majorType = name.split('.')[1]
      setFormData(prev => ({
        ...prev,
        majors: {
          ...prev.majors,
          [majorType]: type === 'checkbox'
            ? (checked
                ? [...prev.majors[majorType], value]
                : prev.majors[majorType].filter(v => v !== value))
            : value
        }
      }))
    } else {
      setFormData(prev => ({
        ...prev,
        [name]: type === 'number' ? parseInt(value) : value
      }))
    }
  }

  const validateForm = () => {
    const newErrors = {}

    if (formData.password.length < 8) {
      newErrors.password = '비밀번호는 8자 이상이어야 합니다'
    }

    if (formData.password !== formData.passwordConfirm) {
      newErrors.passwordConfirm = '비밀번호가 일치하지 않습니다'
    }

    if (!formData.department) {
      newErrors.department = '학과를 선택해주세요'
    }

    setErrors(newErrors)
    return Object.keys(newErrors).length === 0
  }

  const handleSubmit = async (e) => {
    e.preventDefault()

    if (!validateForm()) {
      return
    }

    setIsLoading(true)

    try {
      const response = await fetch('/api/auth/register', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json'
        },
        body: JSON.stringify({
          ...formData,
          majors: {
            ...formData.majors,
            primary: formData.majors.primary || formData.department
          }
        })
      })

      const result = await response.json()

      if (!result.success) {
        if (result.errors) {
          const newErrors = {}
          result.errors.forEach(err => {
            newErrors[err.param] = err.msg
          })
          setErrors(newErrors)
        } else {
          setErrors({ submit: result.message || '회원가입에 실패했습니다' })
        }
        return
      }

      // 회원가입 성공 시 로그인 페이지로 이동
      alert('회원가입이 완료되었습니다. 로그인해주세요.')
      navigate('/login')
    } catch (error) {
      console.error('회원가입 오류:', error)
      setErrors({ submit: '회원가입 중 오류가 발생했습니다' })
    } finally {
      setIsLoading(false)
    }
  }

  return (
    <div className="auth-container">
      <div className="auth-card register-card">
        <h1>🎓 한밭대학교 GPA 계산기</h1>
        <h2>회원가입</h2>

        {errors.submit && <div className="error-message">{errors.submit}</div>}

        <form onSubmit={handleSubmit}>
          <div className="form-row">
            <div className="form-group">
              <label htmlFor="studentId">학번 *</label>
              <input
                id="studentId"
                name="studentId"
                type="text"
                value={formData.studentId}
                onChange={handleChange}
                placeholder="학번을 입력하세요"
                required
                disabled={isLoading}
              />
              {errors.studentId && <span className="error-text">{errors.studentId}</span>}
            </div>

            <div className="form-group">
              <label htmlFor="name">이름 *</label>
              <input
                id="name"
                name="name"
                type="text"
                value={formData.name}
                onChange={handleChange}
                placeholder="이름을 입력하세요"
                required
                disabled={isLoading}
              />
              {errors.name && <span className="error-text">{errors.name}</span>}
            </div>
          </div>

          <div className="form-row">
            <div className="form-group">
              <label htmlFor="password">비밀번호 *</label>
              <input
                id="password"
                name="password"
                type="password"
                value={formData.password}
                onChange={handleChange}
                placeholder="8자 이상, 영문/숫자/특수문자 중 2가지 이상"
                required
                disabled={isLoading}
              />
              {errors.password && <span className="error-text">{errors.password}</span>}
            </div>

            <div className="form-group">
              <label htmlFor="passwordConfirm">비밀번호 확인 *</label>
              <input
                id="passwordConfirm"
                name="passwordConfirm"
                type="password"
                value={formData.passwordConfirm}
                onChange={handleChange}
                placeholder="비밀번호를 다시 입력하세요"
                required
                disabled={isLoading}
              />
              {errors.passwordConfirm && <span className="error-text">{errors.passwordConfirm}</span>}
            </div>
          </div>

          <div className="form-row">
            <div className="form-group">
              <label htmlFor="admissionDate">입학날짜 *</label>
              <input
                id="admissionDate"
                name="admissionDate"
                type="date"
                value={formData.admissionDate}
                onChange={handleChange}
                required
                disabled={isLoading}
              />
              {errors.admissionDate && <span className="error-text">{errors.admissionDate}</span>}
            </div>

            <div className="form-group">
              <label htmlFor="currentYear">현재 학년 *</label>
              <select
                id="currentYear"
                name="currentYear"
                value={formData.currentYear}
                onChange={handleChange}
                required
                disabled={isLoading}
              >
                <option value={1}>1학년</option>
                <option value={2}>2학년</option>
                <option value={3}>3학년</option>
                <option value={4}>4학년</option>
              </select>
            </div>
          </div>

          <div className="form-row">
            <div className="form-group">
              <label htmlFor="status">재학 상태 *</label>
              <select
                id="status"
                name="status"
                value={formData.status}
                onChange={handleChange}
                required
                disabled={isLoading}
              >
                <option value="재학중">재학중</option>
                <option value="휴학중">휴학중</option>
              </select>
            </div>

            <div className="form-group">
              <label htmlFor="department">학과 *</label>
              <select
                id="department"
                name="department"
                value={formData.department}
                onChange={handleChange}
                required
                disabled={isLoading}
              >
                <option value="">학과를 선택하세요</option>
                {departments.map(dept => (
                  <option key={dept} value={dept}>{dept}</option>
                ))}
              </select>
              {errors.department && <span className="error-text">{errors.department}</span>}
            </div>
          </div>

          <div className="form-row">
            <div className="form-group">
              <label htmlFor="curriculumYear">교육과정 연도</label>
              <select
                id="curriculumYear"
                name="curriculumYear"
                value={formData.curriculumYear}
                onChange={handleChange}
                disabled={isLoading}
              >
                <option value="2018">2018학년도</option>
                <option value="2019">2019학년도 이후</option>
              </select>
            </div>

            <div className="form-group">
              <label htmlFor="studentType">입학 구분</label>
              <select
                id="studentType"
                name="studentType"
                value={formData.studentType}
                onChange={handleChange}
                disabled={isLoading}
              >
                <option value="신입생">신입생</option>
                <option value="편입생">편입생</option>
              </select>
            </div>
          </div>

          <div className="form-group">
            <label>전공 정보 (복수 선택 가능)</label>
            <div className="checkbox-group">
              <label className="checkbox-label">
                <input
                  type="checkbox"
                  name="major.double"
                  value="복수전공"
                  checked={formData.majors.double.includes('복수전공')}
                  onChange={handleChange}
                  disabled={isLoading}
                />
                복수전공
              </label>
              <label className="checkbox-label">
                <input
                  type="checkbox"
                  name="major.minor"
                  value="부전공"
                  checked={formData.majors.minor.includes('부전공')}
                  onChange={handleChange}
                  disabled={isLoading}
                />
                부전공
              </label>
              <label className="checkbox-label">
                <input
                  type="checkbox"
                  name="major.fusion"
                  value="융합전공"
                  checked={formData.majors.fusion.includes('융합전공')}
                  onChange={handleChange}
                  disabled={isLoading}
                />
                융합전공
              </label>
              <label className="checkbox-label">
                <input
                  type="checkbox"
                  name="major.advanced"
                  value="심화전공"
                  checked={formData.majors.advanced.includes('심화전공')}
                  onChange={handleChange}
                  disabled={isLoading}
                />
                심화전공
              </label>
            </div>
          </div>

          <button type="submit" className="btn-primary" disabled={isLoading}>
            {isLoading ? '가입 중...' : '회원가입'}
          </button>
        </form>

        <div className="auth-link">
          이미 계정이 있으신가요?{' '}
          <a href="/login" onClick={(e) => {
            e.preventDefault()
            navigate('/login')
          }}>
            로그인
          </a>
        </div>
      </div>
    </div>
  )
}

export default Register
