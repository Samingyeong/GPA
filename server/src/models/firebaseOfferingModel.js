/**
 * Firestore 기반 개설 과목 모델
 */

import { getFirestore } from '../config/firebase.js'
import { log } from '../utils/logger.js'

/**
 * Firestore에서 개설 과목 검색
 */
export class FirebaseOfferingModel {
  constructor() {
    this.db = getFirestore()
    this.collection = 'course_offerings'
  }

  /**
   * 검색 (과목명, 코드, 학과, 교수명 등)
   */
  async search(query, filters = {}) {
    try {
      let queryRef = this.db.collection(this.collection)

      // 필터 적용
      if (filters.department && filters.department.trim()) {
        // Firestore는 부분 일치 검색이 제한적이므로, 클라이언트 측에서 필터링
        // 또는 인덱스를 사용한 prefix 검색
      }
      if (filters.year !== undefined && filters.year !== null) {
        queryRef = queryRef.where('year', '==', parseInt(filters.year))
      }
      if (filters.professor && filters.professor.trim()) {
        // 교수명은 부분 일치가 필요하므로 클라이언트 측 필터링
      }
      if (filters.classroom && filters.classroom.trim()) {
        // 강의실도 부분 일치 필요
      }
      if (filters.lectureType && filters.lectureType.trim()) {
        queryRef = queryRef.where('lecture_type', '==', filters.lectureType.trim())
      }
      if (filters.semester && filters.semester.trim()) {
        queryRef = queryRef.where('semester', '==', filters.semester.trim())
      }

      // 쿼리 실행
      const snapshot = await queryRef.get()
      let results = snapshot.docs.map(doc => ({
        id: doc.id,
        ...doc.data()
      }))

      // 텍스트 검색 (클라이언트 측 필터링)
      const lowerQuery = (query || '').toLowerCase().trim()
      if (lowerQuery) {
        results = results.filter(offering => {
          // 교수명 검색: 쉼표로 구분된 여러 교수명도 검색 가능
          let professorMatch = false
          if (offering.professor) {
            const professors = offering.professor.split(',').map(p => p.trim().toLowerCase())
            professorMatch = professors.some(p => p.includes(lowerQuery))
          }

          // 모든 필드에서 검색
          const courseNameMatch = offering.course_name ? offering.course_name.toLowerCase().includes(lowerQuery) : false
          const courseCodeMatch = offering.course_code ? offering.course_code.toLowerCase().includes(lowerQuery) : false
          const departmentMatch = offering.department ? offering.department.toLowerCase().includes(lowerQuery) : false
          const classroomMatch = offering.classroom ? offering.classroom.toLowerCase().includes(lowerQuery) : false
          const lectureTimeMatch = offering.lecture_time ? offering.lecture_time.toLowerCase().includes(lowerQuery) : false
          const courseNumberMatch = offering.course_number ? offering.course_number.toLowerCase().includes(lowerQuery) : false

          return courseNameMatch || courseCodeMatch || departmentMatch || professorMatch ||
                 classroomMatch || lectureTimeMatch || courseNumberMatch
        })
      }

      // 추가 필터 (부분 일치)
      if (filters.department && filters.department.trim()) {
        const deptFilter = filters.department.trim().toLowerCase()
        results = results.filter(o => {
          if (!o.department) return false
          return o.department.toLowerCase().includes(deptFilter) || deptFilter.includes(o.department.toLowerCase())
        })
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

      // 최대 50개 제한
      return results.slice(0, 50)
    } catch (error) {
      log.error('Firestore 검색 오류:', {
        error: error.message,
        stack: error.stack,
        query,
        filters
      })
      throw error
    }
  }

  /**
   * 검색 결과를 API 응답 형식으로 변환
   */
  async searchForAPI(query, filters = {}) {
    const results = await this.search(query, filters)
    return results.map(offering => ({
      course_code: offering.course_code,
      course_name: offering.course_name,
      professor: offering.professor,
      department: offering.department,
      semester: offering.semester,
      year: offering.year,
      lecture_time: offering.lecture_time,
      classroom: offering.classroom,
      lecture_type: offering.lecture_type,
      section: offering.section,
      course_number: offering.course_number,
      credit: offering.credit
    }))
  }

  /**
   * 고유한 학과 목록 가져오기
   */
  async getDepartments() {
    try {
      const snapshot = await this.db.collection(this.collection).get()
      const departments = new Set()
      
      snapshot.docs.forEach(doc => {
        const data = doc.data()
        const dept = data.department
        // 빈 값 및 "--" 필터링
        if (dept && typeof dept === 'string' && dept.trim() !== '' && dept.trim() !== '--') {
          departments.add(dept.trim())
        }
      })

      return Array.from(departments).sort()
    } catch (error) {
      log.error('학과 목록 조회 오류:', { error: error.message })
      return []
    }
  }

  /**
   * 고유한 학년 목록 가져오기
   */
  async getYears() {
    try {
      const snapshot = await this.db.collection(this.collection).get()
      const years = new Set()
      
      snapshot.docs.forEach(doc => {
        const data = doc.data()
        const year = data.year
        // 유효한 학년만 필터링 (1, 2, 3, 4만)
        if (year !== null && year !== undefined && !isNaN(year) && year >= 1 && year <= 4) {
          years.add(String(year))
        }
      })

      return Array.from(years).sort((a, b) => parseInt(a) - parseInt(b))
    } catch (error) {
      log.error('학년 목록 조회 오류:', { error: error.message })
      return []
    }
  }

  /**
   * 총 개설 정보 수 가져오기
   */
  async getCount() {
    try {
      const snapshot = await this.db.collection(this.collection).get()
      return snapshot.size
    } catch (error) {
      log.error('개설 정보 수 조회 오류:', { error: error.message })
      return 0
    }
  }
}

// 싱글톤 인스턴스
let firebaseOfferingModel = null

/**
 * Firestore 개설 과목 모델 인스턴스 가져오기
 */
export function getFirebaseOfferingModel() {
  if (!firebaseOfferingModel) {
    firebaseOfferingModel = new FirebaseOfferingModel()
  }
  return firebaseOfferingModel
}

