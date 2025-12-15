import { useState } from 'react'
import './GPACalculator.css'
import { calculateGPA, gradePoints, gradeLabels } from '../utils/gpaCalculator'
import { checkGraduationRequirements } from '../utils/graduationChecker'
import CourseInput from './CourseInput'

function GPACalculator() {
  const [courses, setCourses] = useState([
    { id: 1, name: '', credit: 3, grade: 'A+', category: '전선' }
  ])
  const [gpa, setGpa] = useState(null)
  const [totalCredits, setTotalCredits] = useState(0)
  const [curriculumYear, setCurriculumYear] = useState('2019')
  const [studentType, setStudentType] = useState('신입생')
  const [graduationCheck, setGraduationCheck] = useState(null)

  const addCourse = () => {
    setCourses([...courses, {
      id: Date.now(),
      name: '',
      credit: 3,
      grade: 'A+',
      category: '전선'
    }])
  }

  const removeCourse = (id) => {
    if (courses.length > 1) {
      setCourses(courses.filter(course => course.id !== id))
      calculate()
    }
  }

  const updateCourse = (id, field, value) => {
    setCourses(courses.map(course => {
      if (course.id === id) {
        return { ...course, [field]: field === 'credit' ? Number(value) : value }
      }
      return course
    }))
  }

  const calculate = () => {
    const result = calculateGPA(courses)
    setGpa(result.gpa)
    setTotalCredits(result.totalCredits)
    
    // 졸업 요건 체크
    const gradCheck = checkGraduationRequirements(courses, curriculumYear, studentType)
    setGraduationCheck(gradCheck)
  }

  const reset = () => {
    setCourses([{ id: 1, name: '', credit: 3, grade: 'A+', category: '전선' }])
    setGpa(null)
    setTotalCredits(0)
    setGraduationCheck(null)
  }

  return (
    <div className="gpa-calculator">
      <div className="header">
        <h1>🎓 한밭대학교 GPA 계산기</h1>
        <p>과목 정보를 입력하고 학점을 계산해보세요</p>
        <div className="settings-bar">
          <div className="setting-item">
            <label>교육과정:</label>
            <select 
              value={curriculumYear} 
              onChange={(e) => {
                setCurriculumYear(e.target.value)
                calculate()
              }}
            >
              <option value="2018">2018학년도</option>
              <option value="2019">2019학년도 이후</option>
            </select>
          </div>
          <div className="setting-item">
            <label>입학구분:</label>
            <select 
              value={studentType} 
              onChange={(e) => {
                setStudentType(e.target.value)
                calculate()
              }}
            >
              <option value="신입생">신입생</option>
              <option value="편입생">편입생</option>
            </select>
          </div>
        </div>
      </div>

      <div className="calculator-container">
        <div className="courses-section">
          <div className="section-header">
            <h2>과목 목록</h2>
            <button className="btn-add" onClick={addCourse}>
              + 과목 추가
            </button>
          </div>

          <div className="courses-list">
            {courses.map((course, index) => (
              <div key={course.id} className="course-item">
                <div className="course-number">{index + 1}</div>
                <CourseInput
                  course={course}
                  onUpdate={(field, value) => {
                    updateCourse(course.id, field, value)
                    if (field === 'credit') {
                      calculate()
                    }
                  }}
                />
                <input
                  type="number"
                  className="course-credit"
                  placeholder="학점"
                  min="1"
                  max="10"
                  value={course.credit}
                  onChange={(e) => {
                    updateCourse(course.id, 'credit', e.target.value)
                    calculate()
                  }}
                />
                <select
                  className="course-category"
                  value={course.category || '전선'}
                  onChange={(e) => {
                    updateCourse(course.id, 'category', e.target.value)
                    calculate()
                  }}
                >
                  <option value="교필">교필 (교양필수)</option>
                  <option value="교선">교선 (교양선택)</option>
                  <option value="전필">전필 (전공필수)</option>
                  <option value="전선">전선 (전공선택)</option>
                  <option value="일선">일선 (일반선택)</option>
                  <option value="특필">특필 (특성화필수)</option>
                  <option value="특선">특선 (특성화선택)</option>
                  <option value="심필">심필 (심화필수)</option>
                  <option value="심선">심선 (심화선택)</option>
                  <option value="융필">융필 (융합필수)</option>
                  <option value="융선">융선 (융합선택)</option>
                  <option value="연선">연선 (연계선택)</option>
                  <option value="산선">산선 (산학선택)</option>
                  <option value="교직">교직</option>
                </select>
                <select
                  className="course-grade"
                  value={course.grade}
                  onChange={(e) => {
                    updateCourse(course.id, 'grade', e.target.value)
                    calculate()
                  }}
                >
                  {Object.keys(gradePoints).map(grade => (
                    <option key={grade} value={grade}>
                      {grade} ({gradeLabels[grade]})
                    </option>
                  ))}
                </select>
                <button
                  className="btn-remove"
                  onClick={() => removeCourse(course.id)}
                  disabled={courses.length === 1}
                >
                  삭제
                </button>
              </div>
            ))}
          </div>

          <div className="action-buttons">
            <button className="btn-calculate" onClick={calculate}>
              학점 계산하기
            </button>
            <button className="btn-reset" onClick={reset}>
              초기화
            </button>
          </div>
        </div>

        <div className="result-section">
          <div className="result-card">
            <h2>계산 결과</h2>
            {gpa !== null ? (
              <>
                <div className="gpa-display">
                  <div className="gpa-value">{gpa.toFixed(2)}</div>
                  <div className="gpa-label">평균 학점</div>
                </div>
                <div className="gpa-details">
                  <div className="detail-item">
                    <span className="detail-label">총 학점:</span>
                    <span className="detail-value">{totalCredits}학점</span>
                  </div>
                  <div className="detail-item">
                    <span className="detail-label">과목 수:</span>
                    <span className="detail-value">{courses.length}개</span>
                  </div>
                </div>
                {graduationCheck && (
                  <div className="graduation-check">
                    <h3>졸업 요건 체크</h3>
                    <div className={`check-item ${graduationCheck.totalCredits.satisfied ? 'satisfied' : 'not-satisfied'}`}>
                      <div className="check-header">
                        <span className="check-label">총 학점</span>
                        <span className="check-status">
                          {graduationCheck.totalCredits.satisfied ? '✅' : '❌'}
                        </span>
                      </div>
                      <div className="check-detail">
                        {graduationCheck.totalCredits.current} / {graduationCheck.totalCredits.required}학점
                        {graduationCheck.totalCredits.remaining > 0 && (
                          <span className="remaining"> (부족: {graduationCheck.totalCredits.remaining}학점)</span>
                        )}
                      </div>
                    </div>
                    <div className={`check-item ${graduationCheck.generalEducation.satisfied ? 'satisfied' : 'not-satisfied'}`}>
                      <div className="check-header">
                        <span className="check-label">교양 학점</span>
                        <span className="check-status">
                          {graduationCheck.generalEducation.satisfied ? '✅' : '❌'}
                        </span>
                      </div>
                      <div className="check-detail">
                        {graduationCheck.generalEducation.current} / {graduationCheck.generalEducation.required}학점
                        {graduationCheck.generalEducation.remaining > 0 && (
                          <span className="remaining"> (부족: {graduationCheck.generalEducation.remaining}학점)</span>
                        )}
                      </div>
                    </div>
                    <div className={`check-item ${graduationCheck.majorEducation.satisfied ? 'satisfied' : 'not-satisfied'}`}>
                      <div className="check-header">
                        <span className="check-label">전공 학점</span>
                        <span className="check-status">
                          {graduationCheck.majorEducation.satisfied ? '✅' : '❌'}
                        </span>
                      </div>
                      <div className="check-detail">
                        {graduationCheck.majorEducation.current} / {graduationCheck.majorEducation.required}학점
                        {graduationCheck.majorEducation.remaining > 0 && (
                          <span className="remaining"> (부족: {graduationCheck.majorEducation.remaining}학점)</span>
                        )}
                      </div>
                    </div>
                    {graduationCheck.allSatisfied && (
                      <div className="graduation-success">
                        🎉 모든 졸업 요건을 충족했습니다!
                      </div>
                    )}
                  </div>
                )}
                <div className="grade-scale-info">
                  <h3>학점 체계</h3>
                  <div className="grade-scale">
                    {Object.entries(gradePoints).map(([grade, points]) => (
                      <div key={grade} className="grade-item">
                        <span className="grade-letter">{grade}</span>
                        <span className="grade-point">{points.toFixed(1)}점</span>
                      </div>
                    ))}
                  </div>
                </div>
              </>
            ) : (
              <div className="no-result">
                <p>과목 정보를 입력하고<br />계산 버튼을 눌러주세요</p>
              </div>
            )}
          </div>
        </div>
      </div>
    </div>
  )
}

export default GPACalculator

