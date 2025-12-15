/**
 * 시간표 모델 (Firebase Firestore 기반)
 */

import { getFirestore } from '../config/firebase.js'
import admin from '../config/firebase.js'
import { log } from '../utils/logger.js'

/**
 * 시간표 데이터 클래스
 */
export class Timetable {
  constructor(data) {
    this.id = data.id || null
    this.studentId = data.studentId || ''
    this.year = data.year || 1
    this.semester = data.semester || 1
    this.courses = data.courses || []
    this.createdAt = data.createdAt || new Date().toISOString()
    this.updatedAt = data.updatedAt || new Date().toISOString()
  }

  /**
   * JSON 형태로 변환
   */
  toJSON() {
    return {
      id: this.id,
      studentId: this.studentId,
      year: this.year,
      semester: this.semester,
      courses: this.courses,
      createdAt: this.createdAt,
      updatedAt: this.updatedAt
    }
  }

  /**
   * Firestore 문서 데이터로 변환
   */
  toFirestore() {
    return {
      studentId: this.studentId,
      year: this.year,
      semester: this.semester,
      courses: this.courses,
      createdAt: this.createdAt 
        ? admin.firestore.Timestamp.fromDate(new Date(this.createdAt))
        : admin.firestore.FieldValue.serverTimestamp(),
      updatedAt: admin.firestore.FieldValue.serverTimestamp()
    }
  }

  /**
   * Firestore 문서에서 Timetable 객체 생성
   */
  static fromFirestore(doc) {
    const data = doc.data()
    return new Timetable({
      id: doc.id,
      ...data,
      createdAt: data.createdAt?.toDate?.()?.toISOString() || data.createdAt,
      updatedAt: data.updatedAt?.toDate?.()?.toISOString() || data.updatedAt
    })
  }
}

/**
 * 시간표 모델 (Firebase Firestore)
 */
export class TimetableModel {
  constructor() {
    try {
      this.db = getFirestore()
      this.collection = 'timetables'
      log.info('TimetableModel 초기화 완료 (Firebase Firestore 사용)')
    } catch (error) {
      log.error('TimetableModel 초기화 실패:', { error: error.message })
      throw new Error('Firebase가 초기화되지 않았습니다. serviceAccount.json 파일을 확인하세요.')
    }
  }

  /**
   * 학번과 학기로 시간표 조회
   */
  async findByStudentAndSemester(studentId, year, semester) {
    try {
      const snapshot = await this.db.collection(this.collection)
        .where('studentId', '==', studentId)
        .where('year', '==', year)
        .where('semester', '==', semester)
        .limit(1)
        .get()

      if (snapshot.empty) {
        return null
      }

      return Timetable.fromFirestore(snapshot.docs[0])
    } catch (error) {
      log.error('시간표 조회 오류:', { studentId, year, semester, error: error.message })
      throw error
    }
  }

  /**
   * 학번으로 모든 시간표 조회
   */
  async findAllByStudentId(studentId) {
    try {
      const snapshot = await this.db.collection(this.collection)
        .where('studentId', '==', studentId)
        .orderBy('year', 'asc')
        .orderBy('semester', 'asc')
        .get()

      return snapshot.docs.map(doc => Timetable.fromFirestore(doc))
    } catch (error) {
      log.error('시간표 전체 조회 오류:', { studentId, error: error.message })
      throw error
    }
  }

  /**
   * 시간표 생성 또는 업데이트
   */
  async save(timetableData) {
    try {
      const { studentId, year, semester } = timetableData

      // 기존 시간표 확인
      const existing = await this.findByStudentAndSemester(studentId, year, semester)

      if (existing) {
        // 업데이트
        const docRef = this.db.collection(this.collection).doc(existing.id)
        await docRef.update({
          courses: timetableData.courses || [],
          updatedAt: admin.firestore.FieldValue.serverTimestamp()
        })

        log.info('시간표 업데이트 완료:', { studentId, year, semester })
        return Timetable.fromFirestore(await docRef.get())
      } else {
        // 생성
        const timetable = new Timetable(timetableData)
        const docRef = this.db.collection(this.collection).doc()
        
        await docRef.set({
          ...timetable.toFirestore(),
          id: docRef.id
        })

        log.info('시간표 생성 완료:', { studentId, year, semester })
        return Timetable.fromFirestore(await docRef.get())
      }
    } catch (error) {
      log.error('시간표 저장 오류:', { error: error.message })
      throw error
    }
  }

  /**
   * 시간표 삭제
   */
  async delete(studentId, year, semester) {
    try {
      const timetable = await this.findByStudentAndSemester(studentId, year, semester)
      
      if (!timetable) {
        throw new Error('시간표를 찾을 수 없습니다')
      }

      await this.db.collection(this.collection).doc(timetable.id).delete()
      
      log.info('시간표 삭제 완료:', { studentId, year, semester })
      return true
    } catch (error) {
      log.error('시간표 삭제 오류:', { studentId, year, semester, error: error.message })
      throw error
    }
  }

  /**
   * 시간표에 과목 추가
   */
  async addCourse(studentId, year, semester, course) {
    try {
      const timetable = await this.findByStudentAndSemester(studentId, year, semester)
      
      if (!timetable) {
        // 시간표가 없으면 생성
        const newTimetable = new Timetable({
          studentId,
          year,
          semester,
          courses: [course]
        })
        return await this.save(newTimetable.toJSON())
      }

      // 중복 체크 (course_code 기준)
      const existingCourse = timetable.courses.find(
        c => c.course_code === course.course_code
      )

      if (existingCourse) {
        throw new Error('이미 추가된 과목입니다')
      }

      // 과목 추가
      timetable.courses.push(course)
      return await this.save(timetable.toJSON())
    } catch (error) {
      log.error('과목 추가 오류:', { studentId, year, semester, error: error.message })
      throw error
    }
  }

  /**
   * 시간표에서 과목 삭제
   */
  async removeCourse(studentId, year, semester, courseCode) {
    try {
      const timetable = await this.findByStudentAndSemester(studentId, year, semester)
      
      if (!timetable) {
        throw new Error('시간표를 찾을 수 없습니다')
      }

      // 과목 제거
      timetable.courses = timetable.courses.filter(
        c => c.course_code !== courseCode
      )

      return await this.save(timetable.toJSON())
    } catch (error) {
      log.error('과목 삭제 오류:', { studentId, year, semester, courseCode, error: error.message })
      throw error
    }
  }

  /**
   * 시간표에서 과목 업데이트 (성적 등)
   */
  async updateCourse(studentId, year, semester, courseCode, updateData) {
    try {
      const timetable = await this.findByStudentAndSemester(studentId, year, semester)
      
      if (!timetable) {
        throw new Error('시간표를 찾을 수 없습니다')
      }

      // 과목 찾기 및 업데이트
      const courseIndex = timetable.courses.findIndex(
        c => c.course_code === courseCode
      )

      if (courseIndex === -1) {
        throw new Error('과목을 찾을 수 없습니다')
      }

      timetable.courses[courseIndex] = {
        ...timetable.courses[courseIndex],
        ...updateData
      }

      return await this.save(timetable.toJSON())
    } catch (error) {
      log.error('과목 업데이트 오류:', { studentId, year, semester, courseCode, error: error.message })
      throw error
    }
  }
}

/**
 * TimetableModel 싱글톤 인스턴스
 */
let timetableModelInstance = null

export function getTimetableModel() {
  if (!timetableModelInstance) {
    timetableModelInstance = new TimetableModel()
  }
  return timetableModelInstance
}
