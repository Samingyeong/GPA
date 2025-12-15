/**
 * course_offerings.csv 스키마
 * 
 * 시간표/교수 검색용 데이터 (학기별)
 * 
 * 컬럼:
 * - course_code: 과목 코드 (마스터 데이터와 연결)
 * - course_name: 과목명
 * - professor: 담당교수
 * - department: 개설학과
 * - semester: 학기 (2023-1, 2023-2 등)
 * - year: 학년 (1, 2, 3, 4)
 * - lecture_time: 강의시간
 * - classroom: 강의실
 * - lecture_type: 강의구분
 * - section: 분반
 * - course_number: 강좌번호
 * - credit: 학점
 */

export class CourseOffering {
  constructor(data) {
    this.courseCode = (data.course_code || data.courseCode || '').toString().trim()
    this.courseName = (data.course_name || data.name || data.courseName || '').toString().trim()
    this.professor = (data.professor || '').toString().trim()
    this.department = (data.department || '').toString().trim()
    this.semester = (data.semester || '').toString().trim()
    this.year = data.year ? (typeof data.year === 'number' ? data.year : parseInt(data.year.toString().replace(/[^0-9]/g, '')) || null) : null
    this.lectureTime = (data.lecture_time || data.lectureTime || '').toString().trim()
    this.classroom = (data.classroom || '').toString().trim()
    this.lectureType = (data.lecture_type || data.lectureType || '').toString().trim()
    this.section = (data.section || '').toString().trim()
    this.courseNumber = (data.course_number || data.courseNumber || '').toString().trim()
    this.credit = Number(data.credit) || 0
  }
}

/**
 * 개설 과목 DB (검색용)
 */
export class OfferingDatabase {
  constructor() {
    this.offerings = [] // 모든 개설 정보 (중복 허용)
  }

  /**
   * CSV 데이터로부터 개설 정보 로드
   */
  loadFromCSV(csvData) {
    this.offerings = csvData
      .map(row => {
        try {
          return new CourseOffering(row)
        } catch (error) {
          console.error('CourseOffering 생성 오류:', { row, error: error.message })
          return null
        }
      })
      .filter(offering => offering !== null && offering.courseCode) // 유효한 데이터만
    
    // 로드 결과 로깅
    if (this.offerings.length === 0 && csvData.length > 0) {
      console.warn('⚠️ 개설 정보가 로드되지 않았습니다. CSV 데이터 샘플:', csvData.slice(0, 2))
    }
    
    return this
  }

  /**
   * 검색 (과목명, 코드, 학과, 교수명)
   */
  search(query, filters = {}) {
    const lowerQuery = (query || '').toLowerCase().trim()
    let results = [...this.offerings]
    
    // 텍스트 검색
    if (lowerQuery) {
      results = results.filter(offering => {
        // 교수명 검색: 쉼표로 구분된 여러 교수명도 검색 가능
        let professorMatch = false
        if (offering.professor) {
          const professors = offering.professor.split(',').map(p => p.trim().toLowerCase())
          professorMatch = professors.some(p => p.includes(lowerQuery))
        }
        
        // 모든 필드에서 검색
        const courseNameMatch = offering.courseName ? offering.courseName.toLowerCase().includes(lowerQuery) : false
        const courseCodeMatch = offering.courseCode ? offering.courseCode.toLowerCase().includes(lowerQuery) : false
        const departmentMatch = offering.department ? offering.department.toLowerCase().includes(lowerQuery) : false
        const classroomMatch = offering.classroom ? offering.classroom.toLowerCase().includes(lowerQuery) : false
        const lectureTimeMatch = offering.lectureTime ? offering.lectureTime.toLowerCase().includes(lowerQuery) : false
        const courseNumberMatch = offering.courseNumber ? offering.courseNumber.toLowerCase().includes(lowerQuery) : false
        
        return courseNameMatch || courseCodeMatch || departmentMatch || professorMatch || 
               classroomMatch || lectureTimeMatch || courseNumberMatch
      })
    }
    
    // 필터 적용
    if (filters.department && filters.department.trim()) {
      const deptFilter = filters.department.trim().toLowerCase()
      results = results.filter(o => {
        if (!o.department) return false
        return o.department.toLowerCase().includes(deptFilter) || deptFilter.includes(o.department.toLowerCase())
      })
    }
    if (filters.year !== undefined && filters.year !== null) {
      const yearFilter = typeof filters.year === 'number' ? filters.year : parseInt(filters.year)
      results = results.filter(o => o.year === yearFilter)
    }
    if (filters.professor && filters.professor.trim()) {
      const professorFilter = filters.professor.trim().toLowerCase()
      results = results.filter(o => {
        if (!o.professor) return false
        const professors = o.professor.split(',').map(p => p.trim().toLowerCase())
        return professors.some(p => p.includes(professorFilter))
      })
    }
    if (filters.classroom && filters.classroom.trim()) {
      const classroomFilter = filters.classroom.trim().toLowerCase()
      results = results.filter(o => {
        if (!o.classroom) return false
        return o.classroom.toLowerCase().includes(classroomFilter)
      })
    }
    if (filters.lectureType && filters.lectureType.trim()) {
      results = results.filter(o => o.lectureType === filters.lectureType.trim())
    }
    if (filters.semester && filters.semester.trim()) {
      results = results.filter(o => o.semester === filters.semester.trim())
    }
    
    return results.slice(0, 50) // 최대 50개
  }

  /**
   * 검색 결과를 API 응답 형식으로 변환
   */
  searchForAPI(query, filters = {}) {
    return this.search(query, filters).map(offering => ({
      course_code: offering.courseCode,
      course_name: offering.courseName,
      department: offering.department,
      professor: offering.professor,
      credit: offering.credit,
      year: offering.year,
      lecture_time: offering.lectureTime,
      classroom: offering.classroom,
      lecture_type: offering.lectureType,
      section: offering.section,
      course_number: offering.courseNumber,
      semester: offering.semester
    }))
  }
}

// 싱글톤 인스턴스
let offeringDB = null

/**
 * 개설 정보 DB 인스턴스 가져오기
 */
export function getOfferingDB() {
  if (!offeringDB) {
    offeringDB = new OfferingDatabase()
  }
  return offeringDB
}

/**
 * 개설 정보 DB 초기화
 */
export function initializeOfferingDB(csvData) {
  offeringDB = new OfferingDatabase()
  offeringDB.loadFromCSV(csvData)
  return offeringDB
}

