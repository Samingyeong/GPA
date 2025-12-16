import { useState, useEffect } from 'react'
import { useNavigate } from 'react-router-dom'
import './Timetable.css'

// 과목 검색 API 호출
async function searchCoursesAPI(query, filters = {}) {
  if (!query || query.trim() === '') {
    return []
  }
  
  try {
    const params = new URLSearchParams()
    params.append('q', query.trim())
    
    if (filters.department && filters.department !== '--') {
      params.append('department', filters.department)
    }
    if (filters.year && filters.year !== '--' && filters.year !== '') {
      params.append('year', filters.year)
    }
    
    const url = `/api/courses/search?${params.toString()}`
    const response = await fetch(url)
    
    if (!response.ok) return []
    
    const result = await response.json()
    return result.success ? result.data : []
  } catch (error) {
    console.error('과목 검색 오류:', error)
    return []
  }
}

// 시간표 API 호출
async function fetchTimetable(year, semester) {
  const token = localStorage.getItem('token')
  try {
    const response = await fetch(`/api/timetables?year=${year}&semester=${semester}`, {
      headers: {
        'Authorization': `Bearer ${token}`,
        'Content-Type': 'application/json'
      }
    })
    const result = await response.json()
    return result.success ? result.data : { year, semester, courses: [] }
  } catch (error) {
    console.error('시간표 조회 오류:', error)
    return { year, semester, courses: [] }
  }
}

// 과목 추가 API
async function addCourseToTimetable(year, semester, courseCode) {
  const token = localStorage.getItem('token')
  try {
    const response = await fetch('/api/timetables/courses', {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${token}`,
        'Content-Type': 'application/json'
      },
      body: JSON.stringify({ year, semester, course_code: courseCode })
    })
    const result = await response.json()
    return result.success ? result.data : null
  } catch (error) {
    console.error('과목 추가 오류:', error)
    throw error
  }
}

// 과목 삭제 API
async function removeCourseFromTimetable(year, semester, courseCode) {
  const token = localStorage.getItem('token')
  try {
    const response = await fetch('/api/timetables/courses', {
      method: 'DELETE',
      headers: {
        'Authorization': `Bearer ${token}`,
        'Content-Type': 'application/json'
      },
      body: JSON.stringify({ year, semester, course_code: courseCode })
    })
    const result = await response.json()
    return result.success
  } catch (error) {
    console.error('과목 삭제 오류:', error)
    throw error
  }
}

// 성적 수정 API
async function updateCourseGrade(year, semester, courseCode, grade) {
  const token = localStorage.getItem('token')
  try {
    const response = await fetch('/api/timetables/courses', {
      method: 'PUT',
      headers: {
        'Authorization': `Bearer ${token}`,
        'Content-Type': 'application/json'
      },
      body: JSON.stringify({ year, semester, course_code: courseCode, grade })
    })
    const result = await response.json()
    return result.success ? result.data : null
  } catch (error) {
    console.error('성적 수정 오류:', error)
    throw error
  }
}

function Timetable() {
  const navigate = useNavigate()
  const [user, setUser] = useState(null)
  const [currentYear, setCurrentYear] = useState(1)
  const [currentSemester, setCurrentSemester] = useState(1)
  const [timetable, setTimetable] = useState({ courses: [] })
  const [isLoading, setIsLoading] = useState(false)
  
  // 과목 검색 관련
  const [searchQuery, setSearchQuery] = useState('')
  const [searchResults, setSearchResults] = useState([])
  const [isSearching, setIsSearching] = useState(false)
  const [showSearchResults, setShowSearchResults] = useState(false)
  
  // 성적 입력 관련
  const [showGradeInput, setShowGradeInput] = useState(false)
  const [selectedCourseForGrade, setSelectedCourseForGrade] = useState(null)
  const [gradeInput, setGradeInput] = useState('')

  const grades = ['A+', 'A', 'B+', 'B', 'C+', 'C', 'D+', 'D', 'F']

  useEffect(() => {
    const userData = localStorage.getItem('user')
    if (userData) {
      try {
        const parsed = JSON.parse(userData)
        setUser(parsed)
        // 사용자의 현재 학년을 기본값으로 설정
        if (parsed.currentYear) {
          setCurrentYear(parsed.currentYear)
        }
      } catch (error) {
        console.error('사용자 정보 파싱 오류:', error)
      }
    }
  }, [])

  useEffect(() => {
    loadTimetable()
  }, [currentYear, currentSemester])

  const loadTimetable = async () => {
    setIsLoading(true)
    try {
      const data = await fetchTimetable(currentYear, currentSemester)
      setTimetable(data)
    } catch (error) {
      console.error('시간표 로드 오류:', error)
    } finally {
      setIsLoading(false)
    }
  }

  const handleSearch = async (query) => {
    setSearchQuery(query)
    
    if (!query || query.trim() === '') {
      setSearchResults([])
      setShowSearchResults(false)
      return
    }

    setIsSearching(true)
    try {
      const results = await searchCoursesAPI(query)
      setSearchResults(results)
      setShowSearchResults(true)
    } catch (error) {
      console.error('검색 오류:', error)
      setSearchResults([])
    } finally {
      setIsSearching(false)
    }
  }

  const handleAddCourse = async (course) => {
    try {
      await addCourseToTimetable(currentYear, currentSemester, course.course_code)
      setSearchQuery('')
      setSearchResults([])
      setShowSearchResults(false)
      await loadTimetable()
      alert('과목이 추가되었습니다')
    } catch (error) {
      if (error.message && error.message.includes('이미 추가된 과목')) {
        alert('이미 추가된 과목입니다')
      } else {
        alert('과목 추가 중 오류가 발생했습니다')
      }
    }
  }

  const handleRemoveCourse = async (courseCode) => {
    if (!window.confirm('과목을 삭제하시겠습니까?')) {
      return
    }

    try {
      await removeCourseFromTimetable(currentYear, currentSemester, courseCode)
      await loadTimetable()
      alert('과목이 삭제되었습니다')
    } catch (error) {
      alert('과목 삭제 중 오류가 발생했습니다')
    }
  }

  const handleOpenGradeInput = (course) => {
    setSelectedCourseForGrade(course)
    setGradeInput(course.grade || '')
    setShowGradeInput(true)
  }

  const handleSaveGrade = async () => {
    if (!selectedCourseForGrade) return

    try {
      await updateCourseGrade(
        currentYear,
        currentSemester,
        selectedCourseForGrade.course_code,
        gradeInput
      )
      setShowGradeInput(false)
      setSelectedCourseForGrade(null)
      setGradeInput('')
      await loadTimetable()
      alert('성적이 저장되었습니다')
    } catch (error) {
      alert('성적 저장 중 오류가 발생했습니다')
    }
  }

  const handleLogout = async () => {
    if (!window.confirm('로그아웃 하시겠습니까?')) return

    try {
      const token = localStorage.getItem('token')
      if (token) {
        await fetch('/api/auth/logout', {
          method: 'POST',
          headers: {
            'Authorization': `Bearer ${token}`,
            'Content-Type': 'application/json'
          }
        }).catch(() => {})
      }
      localStorage.removeItem('token')
      localStorage.removeItem('user')
      navigate('/login')
    } catch (error) {
      localStorage.removeItem('token')
      localStorage.removeItem('user')
      navigate('/login')
    }
  }

  return (
    <div className="timetable-page">
      <div className="timetable-header">
        <div className="header-top">
          <div className="header-title">
            <h1>📅 시간표 관리</h1>
            {user && (
              <div className="user-info">
                <span className="user-name">{user.name}님</span>
                <span className="user-id">({user.studentId})</span>
              </div>
            )}
          </div>
          <div className="header-actions">
            <button className="btn-secondary" onClick={() => navigate('/dashboard')}>
              GPA 계산기
            </button>
            <button className="btn-logout" onClick={handleLogout}>
              로그아웃
            </button>
          </div>
        </div>
      </div>

      <div className="timetable-container">
        {/* 학기 선택 */}
        <div className="semester-selector">
          <div className="selector-group">
            <label>학년:</label>
            <select 
              value={currentYear} 
              onChange={(e) => setCurrentYear(parseInt(e.target.value))}
            >
              {[1, 2, 3, 4].map(year => (
                <option key={year} value={year}>{year}학년</option>
              ))}
            </select>
          </div>
          <div className="selector-group">
            <label>학기:</label>
            <select 
              value={currentSemester} 
              onChange={(e) => setCurrentSemester(parseInt(e.target.value))}
            >
              <option value={1}>1학기</option>
              <option value={2}>2학기</option>
            </select>
          </div>
        </div>

        {/* 과목 검색 및 추가 */}
        <div className="course-search-section">
          <h2>과목 검색 및 추가</h2>
          <div className="search-wrapper">
            <input
              type="text"
              className="search-input"
              placeholder="과목명을 입력하세요..."
              value={searchQuery}
              onChange={(e) => handleSearch(e.target.value)}
              onFocus={() => {
                if (searchResults.length > 0) {
                  setShowSearchResults(true)
                }
              }}
            />
            {isSearching && (
              <div className="search-loading">검색 중...</div>
            )}
            {showSearchResults && searchResults.length > 0 && (
              <div className="search-results">
                {searchResults.map((course, index) => (
                  <div
                    key={`${course.course_code}-${index}`}
                    className="search-result-item"
                    onClick={() => handleAddCourse(course)}
                  >
                    <div className="result-main">
                      <span className="result-name">{course.course_name || course.name}</span>
                      <span className="result-code">{course.course_code}</span>
                    </div>
                    <div className="result-info">
                      {course.credit}학점 · {course.category || '기타'}
                      {course.department && ` · ${course.department}`}
                      {course.professor && ` · ${course.professor}`}
                    </div>
                  </div>
                ))}
              </div>
            )}
          </div>
        </div>

        {/* 시간표 목록 */}
        <div className="timetable-list-section">
          <h2>{currentYear}학년 {currentSemester}학기 시간표</h2>
          {isLoading ? (
            <div className="loading">로딩 중...</div>
          ) : timetable.courses && timetable.courses.length > 0 ? (
            <div className="course-list">
              {timetable.courses.map((course, index) => (
                <div key={`${course.course_code}-${index}`} className="course-item">
                  <div className="course-info">
                    <div className="course-main">
                      <span className="course-name">{course.course_name || course.name}</span>
                      <span className="course-code">{course.course_code}</span>
                    </div>
                    <div className="course-details">
                      {course.credit}학점 · {course.category || '기타'}
                      {course.grade && (
                        <span className="course-grade"> · 성적: {course.grade}</span>
                      )}
                    </div>
                  </div>
                  <div className="course-actions">
                    <button
                      className="btn-grade"
                      onClick={() => handleOpenGradeInput(course)}
                    >
                      {course.grade ? '성적 수정' : '성적 입력'}
                    </button>
                    <button
                      className="btn-remove"
                      onClick={() => handleRemoveCourse(course.course_code)}
                    >
                      삭제
                    </button>
                  </div>
                </div>
              ))}
            </div>
          ) : (
            <div className="empty-timetable">
              <p>등록된 과목이 없습니다.</p>
              <p>위에서 과목을 검색하여 추가해주세요.</p>
            </div>
          )}
        </div>
      </div>

      {/* 성적 입력 모달 */}
      {showGradeInput && selectedCourseForGrade && (
        <div className="modal-overlay" onClick={() => setShowGradeInput(false)}>
          <div className="modal-content" onClick={(e) => e.stopPropagation()}>
            <h3>성적 입력</h3>
            <div className="modal-body">
              <div className="grade-course-info">
                <p><strong>과목:</strong> {selectedCourseForGrade.course_name || selectedCourseForGrade.name}</p>
                <p><strong>과목 코드:</strong> {selectedCourseForGrade.course_code}</p>
              </div>
              <div className="grade-selector">
                <label>성적 선택:</label>
                <select
                  value={gradeInput}
                  onChange={(e) => setGradeInput(e.target.value)}
                >
                  <option value="">선택하세요</option>
                  {grades.map(grade => (
                    <option key={grade} value={grade}>{grade}</option>
                  ))}
                </select>
              </div>
            </div>
            <div className="modal-actions">
              <button className="btn-cancel" onClick={() => setShowGradeInput(false)}>
                취소
              </button>
              <button 
                className="btn-save" 
                onClick={handleSaveGrade}
                disabled={!gradeInput}
              >
                저장
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  )
}

export default Timetable

