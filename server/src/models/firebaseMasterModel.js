/**
 * Firestore 기반 마스터 과목 모델 (Rule Engine용)
 */

import { getFirestore } from '../config/firebase.js'
import { log } from '../utils/logger.js'

/**
 * Firestore에서 마스터 과목 조회
 */
export class FirebaseMasterModel {
  constructor() {
    this.db = getFirestore()
    this.collection = 'courses_master'
  }

  /**
   * course_code로 과목 정보 가져오기
   */
  async getByCourseCode(courseCode) {
    try {
      const doc = await this.db.collection(this.collection).doc(courseCode).get()
      if (!doc.exists) {
        return null
      }
      const data = doc.data()
      return {
        courseCode: doc.id,
        courseName: data.course_name || '',
        credit: data.credit || 0,
        type: data.type || '', // MAJOR, LIBERAL
        category: data.category || '', // 전필, 전선, 교필, 교선 등
        stage: data.stage || 'BASIC', // BASIC, ADVANCED
        isRequired: data.is_required === true || data.is_required === 'true',
        area: data.area || '',
        // Helper methods를 위한 속성
        isMajor: () => data.type === 'MAJOR',
        isLiberal: () => data.type === 'LIBERAL',
        isBasicMajor: () => data.type === 'MAJOR' && data.stage === 'BASIC',
        isAdvancedMajor: () => data.type === 'MAJOR' && data.stage === 'ADVANCED'
      }
    } catch (error) {
      log.error('과목 조회 오류:', {
        error: error.message,
        courseCode
      })
      return null
    }
  }

  /**
   * 여러 course_code로 과목 정보 가져오기
   */
  async getByCourseCodes(courseCodes) {
    try {
      if (!Array.isArray(courseCodes) || courseCodes.length === 0) {
        return []
      }

      // Firestore의 in 쿼리는 최대 10개까지만 가능하므로 배치로 처리
      const results = []
      const batchSize = 10

      for (let i = 0; i < courseCodes.length; i += batchSize) {
        const batch = courseCodes.slice(i, i + batchSize)
        
        // Firestore의 in 쿼리 대신 개별 조회 (더 안정적)
        const batchPromises = batch.map(code => 
          this.db.collection(this.collection).doc(code).get()
        )
        const batchDocs = await Promise.all(batchPromises)
        
        batchDocs.forEach(doc => {
          if (doc.exists) {
            const data = doc.data()
            results.push({
              courseCode: doc.id,
              courseName: data.course_name || '',
              credit: data.credit || 0,
              type: data.type || '',
              category: data.category || '',
              stage: data.stage || 'BASIC',
              isRequired: data.is_required === true || data.is_required === 'true',
              area: data.area || '',
              // Helper methods
              isMajor: () => data.type === 'MAJOR',
              isLiberal: () => data.type === 'LIBERAL',
              isBasicMajor: () => data.type === 'MAJOR' && data.stage === 'BASIC',
              isAdvancedMajor: () => data.type === 'MAJOR' && data.stage === 'ADVANCED'
            })
          }
        })
      }

      return results
    } catch (error) {
      log.error('과목 목록 조회 오류:', {
        error: error.message,
        courseCodes
      })
      return []
    }
  }

  /**
   * 필수 과목 목록 가져오기
   */
  async getRequiredCourses() {
    try {
      const snapshot = await this.db.collection(this.collection)
        .where('is_required', '==', true)
        .get()

      return snapshot.docs.map(doc => {
        const data = doc.data()
        return {
          courseCode: doc.id,
          courseName: data.course_name || '',
          credit: data.credit || 0,
          type: data.type || '',
          category: data.category || '',
          stage: data.stage || 'BASIC',
          isRequired: true,
          area: data.area || ''
        }
      })
    } catch (error) {
      log.error('필수 과목 조회 오류:', { error: error.message })
      return []
    }
  }
}

// 싱글톤 인스턴스
let firebaseMasterModel = null

/**
 * Firestore 마스터 과목 모델 인스턴스 가져오기
 */
export function getFirebaseMasterModel() {
  if (!firebaseMasterModel) {
    firebaseMasterModel = new FirebaseMasterModel()
  }
  return firebaseMasterModel
}
