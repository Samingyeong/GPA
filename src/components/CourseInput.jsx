import { useState, useRef, useEffect } from 'react'
import './CourseInput.css'

// API 호출 함수
async function searchCoursesAPI(query, filters = {}) {
  if (!query || query.trim() === '') {
    return []
  }
  
  try {
    // 쿼리 파라미터 구성
    const params = new URLSearchParams()
    params.append('q', query.trim())
    
    // 필터 파라미터 추가 (값이 있고 "--"가 아닐 때만)
    if (filters.department && filters.department !== '--') {
      params.append('department', filters.department)
    }
    if (filters.professor && filters.professor !== '--') {
      params.append('professor', filters.professor)
    }
    if (filters.year && filters.year !== '--' && filters.year !== '') {
      params.append('year', filters.year)
    }
    if (filters.type && filters.type !== '--') {
      params.append('type', filters.type)
    }
    if (filters.category && filters.category !== '--') {
      params.append('category', filters.category)
    }
    if (filters.stage && filters.stage !== '--') {
      params.append('stage', filters.stage)
    }
    if (filters.classroom && filters.classroom !== '--') {
      params.append('classroom', filters.classroom)
    }
    if (filters.lectureType && filters.lectureType !== '--') {
      params.append('lectureType', filters.lectureType)
    }
    
    const url = `/api/courses/search?${params.toString()}`
    const response = await fetch(url, {
      method: 'GET',
      headers: {
        'Content-Type': 'application/json',
      },
      // CORS 및 네트워크 오류 처리
      mode: 'cors',
      credentials: 'same-origin'
    })
    
    if (!response.ok) {
      const errorText = await response.text()
      console.error('API 응답 오류:', {
        status: response.status,
        statusText: response.statusText,
        body: errorText
      })
      return []
    }
    
    const result = await response.json()
    
    if (!result || !result.success) {
      console.warn('API 응답 형식 오류:', result)
      return []
    }
    
    if (!Array.isArray(result.data)) {
      console.warn('API 응답 데이터가 배열이 아님:', result.data)
      return []
    }
    
    // API 응답을 로컬 형식으로 변환
    return result.data.map(course => ({
      name: course.course_name || course.name || '',
      courseCode: course.course_code || course.courseCode || '',
      credit: course.credit || 0,
      category: course.category || '',
      department: course.department || '',
      professor: course.professor || '',
      year: course.year || null,
      lectureTime: course.lecture_time || course.lectureTime || '',
      classroom: course.classroom || ''
    }))
  } catch (error) {
    // 네트워크 오류 또는 파싱 오류
    console.error('과목 검색 오류:', {
      error: error.message,
      name: error.name,
      stack: error.stack
    })
    return []
  }
}

function CourseInput({ course, onUpdate }) {
  const [suggestions, setSuggestions] = useState([])
  const [showSuggestions, setShowSuggestions] = useState(false)
  const [selectedIndex, setSelectedIndex] = useState(-1)
  const [isSearching, setIsSearching] = useState(false)
  const inputRef = useRef(null)
  const suggestionsRef = useRef(null)
  const searchTimeoutRef = useRef(null)

  useEffect(() => {
    const handleClickOutside = (event) => {
      if (suggestionsRef.current && !suggestionsRef.current.contains(event.target) &&
          inputRef.current && !inputRef.current.contains(event.target)) {
        setShowSuggestions(false)
      }
    }

    document.addEventListener('mousedown', handleClickOutside)
    return () => {
      document.removeEventListener('mousedown', handleClickOutside)
    }
  }, [])

  const handleInputChange = async (value) => {
    onUpdate('name', value)
    
    // 이전 타이머 취소
    if (searchTimeoutRef.current) {
      clearTimeout(searchTimeoutRef.current)
    }
    
    if (value.trim() === '') {
      setSuggestions([])
      setShowSuggestions(false)
      setIsSearching(false)
      return
    }

    // 디바운싱: 300ms 후 검색
    setIsSearching(true)
    searchTimeoutRef.current = setTimeout(async () => {
      try {
        const results = await searchCoursesAPI(value)
        setSuggestions(results)
        setShowSuggestions(results.length > 0)
        setSelectedIndex(-1)
      } catch (error) {
        console.error('검색 중 오류:', error)
        setSuggestions([])
        setShowSuggestions(false)
      } finally {
        setIsSearching(false)
      }
    }, 300)
  }

  const handleSelectSuggestion = (suggestion) => {
    onUpdate('name', suggestion.name)
    if (suggestion.courseCode) {
      onUpdate('courseCode', suggestion.courseCode)
    }
    if (suggestion.credit) {
      onUpdate('credit', suggestion.credit)
    }
    if (suggestion.category) {
      onUpdate('category', suggestion.category)
    }
    setShowSuggestions(false)
    setSuggestions([])
    inputRef.current?.blur()
  }
  
  // 컴포넌트 언마운트 시 타이머 정리
  useEffect(() => {
    return () => {
      if (searchTimeoutRef.current) {
        clearTimeout(searchTimeoutRef.current)
      }
    }
  }, [])

  const handleKeyDown = (e) => {
    if (!showSuggestions || suggestions.length === 0) return

    if (e.key === 'ArrowDown') {
      e.preventDefault()
      setSelectedIndex(prev => 
        prev < suggestions.length - 1 ? prev + 1 : prev
      )
    } else if (e.key === 'ArrowUp') {
      e.preventDefault()
      setSelectedIndex(prev => prev > 0 ? prev - 1 : -1)
    } else if (e.key === 'Enter' && selectedIndex >= 0) {
      e.preventDefault()
      handleSelectSuggestion(suggestions[selectedIndex])
    } else if (e.key === 'Escape') {
      setShowSuggestions(false)
    }
  }

  return (
    <div className="course-input-wrapper">
      <div className="course-name-wrapper">
        <input
          ref={inputRef}
          type="text"
          className="course-name"
          placeholder="과목명 입력 또는 검색"
          value={course.name}
          onChange={(e) => handleInputChange(e.target.value)}
          onFocus={async () => {
            if (course.name) {
              try {
                setIsSearching(true)
                const results = await searchCoursesAPI(course.name)
                setSuggestions(results)
                setShowSuggestions(results.length > 0)
              } catch (error) {
                console.error('포커스 시 검색 오류:', error)
                setSuggestions([])
                setShowSuggestions(false)
              } finally {
                setIsSearching(false)
              }
            }
          }}
          onKeyDown={handleKeyDown}
        />
        {isSearching && (
          <div ref={suggestionsRef} className="suggestions-dropdown">
            <div className="suggestion-item">
              <span className="suggestion-name">검색 중...</span>
            </div>
          </div>
        )}
        {showSuggestions && !isSearching && suggestions.length > 0 && (
          <div ref={suggestionsRef} className="suggestions-dropdown">
            {suggestions.map((suggestion, index) => (
              <div
                key={`${suggestion.courseCode || suggestion.name}-${index}`}
                className={`suggestion-item ${index === selectedIndex ? 'selected' : ''}`}
                onClick={() => handleSelectSuggestion(suggestion)}
                onMouseEnter={() => setSelectedIndex(index)}
              >
                <div className="suggestion-main">
                  <span className="suggestion-name">{suggestion.name}</span>
                  {suggestion.department && (
                    <span className="suggestion-department">{suggestion.department}</span>
                  )}
                </div>
                <span className="suggestion-info">
                  {suggestion.credit ? `${suggestion.credit}학점` : '학점 미지정'} · {suggestion.category || '기타'}
                  {suggestion.professor && ` · ${suggestion.professor}`}
                  {suggestion.year && ` · ${suggestion.year}학년`}
                </span>
              </div>
            ))}
          </div>
        )}
        {showSuggestions && !isSearching && suggestions.length === 0 && course.name.trim() !== '' && (
          <div ref={suggestionsRef} className="suggestions-dropdown">
            <div className="suggestion-item">
              <span className="suggestion-name">검색 결과가 없습니다</span>
            </div>
          </div>
        )}
      </div>
    </div>
  )
}

export default CourseInput

