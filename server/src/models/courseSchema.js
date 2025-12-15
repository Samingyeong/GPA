/**
 * CSV 과목 데이터 스키마 정의
 * 
 * CSV 컬럼 구조:
 * 
 * 🔍 검색용 컬럼 (UX):
 * - course_code: 과목 코드 (고유 식별자)
 * - course_name: 과목명
 * - department: 개설학과
 * - professor: 담당교수
 * - credit: 학점
 * - year: 학년 (1, 2, 3, 4)
 * - lecture_time: 강의시간
 * - classroom: 강의실
 * - lecture_type: 강의구분
 * - section: 분반
 * - course_number: 강좌번호
 * 
 * ⚙️ Rule Engine용 컬럼 (내부 기준):
 * - type: 이수구분 (MAJOR, LIBERAL)
 * - category: 세부 카테고리 (전필, 전선, 교필, 교선 등)
 * - stage: 전공 단계 (BASIC, ADVANCED)
 * - is_required: 필수 과목 여부 (true/false)
 * - area: 핵심교양 영역
 * - semester: 학기 (1학기, 2학기)
 * 
 * 📌 핵심 원칙:
 * - 검색 컬럼과 판정 컬럼은 역할이 다르다
 * - 사용자는 검색으로 선택, 내부는 course_code로 동작
 */

/**
 * 과목 데이터 클래스
 */
export class Course {
  constructor(data) {
    // 검색용 컬럼 (UX)
    this.courseCode = data.course_code || data.courseCode
    this.courseName = data.course_name || data.name || data.courseName
    this.department = data.department || ''
    this.professor = data.professor || ''
    this.credit = Number(data.credit) || 0
    this.year = data.year ? (typeof data.year === 'number' ? data.year : (parseInt(data.year.toString().replace(/[^0-9]/g, '')) || null)) : null
    this.lectureTime = data.lecture_time || data.lectureTime || ''
    this.classroom = data.classroom || ''
    this.lectureType = data.lecture_type || data.lectureType || ''
    this.section = data.section || ''
    this.courseNumber = data.course_number || data.courseNumber || ''
    
    // Rule Engine용 컬럼 (내부 기준)
    this.type = data.type || '' // MAJOR, LIBERAL
    this.category = data.category || '' // 전필, 전선, 교필, 교선 등
    this.stage = data.stage || 'BASIC' // BASIC, ADVANCED
    this.isRequired = data.is_required === true || data.is_required === 'true' || data.isRequired === true
    this.area = data.area || '' // 핵심교양 영역
    this.semester = data.semester || ''
    
    // 하위 호환성
    this.name = this.courseName
  }

  /**
   * 전공 과목인지 확인
   */
  isMajor() {
    return this.type === 'MAJOR' || 
           ['전필', '전선', '일선', '특필', '특선', '심필', '심선', '융필', '융선', '연선', '산선'].includes(this.category)
  }

  /**
   * 교양 과목인지 확인
   */
  isLiberal() {
    return this.type === 'LIBERAL' || 
           ['교필', '교선'].includes(this.category)
  }

  /**
   * 기본전공인지 확인
   */
  isBasicMajor() {
    return this.isMajor() && this.stage === 'BASIC'
  }

  /**
   * 심화전공인지 확인
   */
  isAdvancedMajor() {
    return this.isMajor() && this.stage === 'ADVANCED'
  }
}

/**
 * 과목 DB (메모리 캐시)
 */
export class CourseDatabase {
  constructor() {
    this.courses = new Map() // course_code -> Course
    this.requiredCourses = new Set() // 필수 과목 코드들
  }

  /**
   * CSV 데이터로부터 과목 DB 로드
   */
  loadFromCSV(csvData) {
    this.courses.clear()
    this.requiredCourses.clear()

    csvData.forEach(row => {
      const course = new Course(row)
      if (course.courseCode) {
        this.courses.set(course.courseCode, course)
        
        if (course.isRequired) {
          this.requiredCourses.add(course.courseCode)
        }
      }
    })

    return this
  }

  /**
   * course_code로 과목 조회
   */
  getCourse(courseCode) {
    return this.courses.get(courseCode) || null
  }

  /**
   * 여러 course_code로 과목 목록 조회
   */
  getCourses(courseCodes) {
    return courseCodes
      .map(code => this.getCourse(code))
      .filter(course => course !== null)
  }

  /**
   * 필수 과목 목록 조회
   */
  getRequiredCourses() {
    return Array.from(this.requiredCourses)
      .map(code => this.getCourse(code))
      .filter(course => course !== null)
  }

  /**
   * 검색 (과목명, 코드, 학과, 교수명)
   * 🔍 UX용 검색 API
   */
  search(query, filters = {}) {
    const lowerQuery = (query || '').toLowerCase()
    let results = Array.from(this.courses.values())
    
    const initialCount = results.length
    
    // 텍스트 검색 (모든 검색 가능한 필드)
    if (lowerQuery) {
      results = results.filter(course => {
        // 교수명 검색: 쉼표로 구분된 여러 교수명도 검색 가능
        const professorMatch = course.professor ? 
          course.professor.split(',').some(p => p.trim().toLowerCase().includes(lowerQuery)) : false
        
        return course.courseName.toLowerCase().includes(lowerQuery) ||
               course.courseCode.toLowerCase().includes(lowerQuery) ||
               course.department.toLowerCase().includes(lowerQuery) ||
               professorMatch ||
               course.classroom.toLowerCase().includes(lowerQuery) ||
               course.lectureTime.toLowerCase().includes(lowerQuery) ||
               (course.courseNumber && course.courseNumber.toLowerCase().includes(lowerQuery))
      })
    }
    
    const afterQueryCount = results.length
    
    // 필터 적용
    if (filters.department && filters.department.trim()) {
      const deptFilter = filters.department.trim().toLowerCase()
      results = results.filter(c => {
        if (!c.department) return false
        return c.department.toLowerCase().includes(deptFilter) || deptFilter.includes(c.department.toLowerCase())
      })
    }
    if (filters.type && filters.type.trim()) {
      results = results.filter(c => c.type === filters.type.trim())
    }
    if (filters.category && filters.category.trim()) {
      results = results.filter(c => c.category === filters.category.trim())
    }
    if (filters.stage && filters.stage.trim()) {
      results = results.filter(c => c.stage === filters.stage.trim())
    }
    if (filters.year !== undefined && filters.year !== null) {
      // 학년 필터 (숫자 또는 문자열로 올 수 있음)
      const yearFilter = typeof filters.year === 'number' ? filters.year : parseInt(filters.year)
      results = results.filter(c => c.year === yearFilter)
    }
    if (filters.professor && filters.professor.trim()) {
      // 교수명 필터: 여러 교수가 있을 경우(쉼표로 구분) 각각 확인
      const professorFilter = filters.professor.trim().toLowerCase()
      results = results.filter(c => {
        if (!c.professor) return false
        // 쉼표로 구분된 교수명 목록에서 검색 (대소문자 무시)
        const professors = c.professor.split(',').map(p => p.trim().toLowerCase())
        return professors.some(p => p.includes(professorFilter))
      })
    }
    if (filters.classroom && filters.classroom.trim()) {
      const classroomFilter = filters.classroom.trim().toLowerCase()
      results = results.filter(c => {
        if (!c.classroom) return false
        return c.classroom.toLowerCase().includes(classroomFilter)
      })
    }
    if (filters.lectureType && filters.lectureType.trim()) {
      results = results.filter(c => c.lectureType === filters.lectureType.trim())
    }
    
    const afterFilterCount = results.length
    
    // 디버깅: 검색 단계별 결과 수 (개발 환경에서만)
    if (process.env.NODE_ENV === 'development' && (lowerQuery || Object.keys(filters).length > 0)) {
      console.log(`[검색 디버그] 전체: ${initialCount} → 쿼리 검색 후: ${afterQueryCount} → 필터 적용 후: ${afterFilterCount}`, {
        query: lowerQuery,
        filters: Object.keys(filters).length > 0 ? filters : '없음'
      })
    }
    
    return results.slice(0, 50) // 최대 50개
  }
  
  /**
   * 검색 결과를 API 응답 형식으로 변환
   */
  searchForAPI(query, filters = {}) {
    return this.search(query, filters).map(course => ({
      course_code: course.courseCode,
      course_name: course.courseName,
      department: course.department,
      professor: course.professor,
      credit: course.credit,
      year: course.year,
      lecture_time: course.lectureTime,
      classroom: course.classroom,
      lecture_type: course.lectureType,
      section: course.section,
      course_number: course.courseNumber,
      type: course.type,
      category: course.category,
      stage: course.stage,
      area: course.area
    }))
  }
}

// 싱글톤 인스턴스
let courseDB = null

/**
 * 과목 DB 인스턴스 가져오기
 */
export function getCourseDB() {
  if (!courseDB) {
    courseDB = new CourseDatabase()
  }
  return courseDB
}

/**
 * 과목 DB 초기화
 */
export function initializeCourseDB(csvData) {
  courseDB = new CourseDatabase()
  courseDB.loadFromCSV(csvData)
  return courseDB
}

