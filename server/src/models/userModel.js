/**
 * 사용자 모델 (Firebase Firestore 기반)
 */

import { getFirestore } from '../config/firebase.js'
import admin from '../config/firebase.js'
import { log } from '../utils/logger.js'

/**
 * 사용자 데이터 클래스
 */
export class User {
  constructor(data) {
    this.studentId = data.studentId || ''
    this.passwordHash = data.passwordHash || ''
    this.name = data.name || ''
    this.admissionDate = data.admissionDate || ''
    this.currentYear = data.currentYear || 1
    this.status = data.status || '재학중' // 재학중/휴학중
    this.department = data.department || ''
    this.majors = data.majors || {
      primary: '',
      double: [],
      minor: [],
      fusion: [],
      advanced: []
    }
    this.curriculumYear = data.curriculumYear || '2019'
    this.studentType = data.studentType || '재학생'
    this.createdAt = data.createdAt || new Date().toISOString()
    this.updatedAt = data.updatedAt || new Date().toISOString()
  }

  /**
   * JSON 저장용 형태로 변환
   */
  toJSON() {
    return {
      studentId: this.studentId,
      passwordHash: this.passwordHash,
      name: this.name,
      admissionDate: this.admissionDate,
      currentYear: this.currentYear,
      status: this.status,
      department: this.department,
      majors: this.majors,
      curriculumYear: this.curriculumYear,
      studentType: this.studentType,
      createdAt: this.createdAt,
      updatedAt: this.updatedAt
    }
  }

  /**
   * 공개 정보만 반환 (비밀번호 제외)
   */
  toPublic() {
    return {
      studentId: this.studentId,
      name: this.name,
      admissionDate: this.admissionDate,
      currentYear: this.currentYear,
      status: this.status,
      department: this.department,
      majors: this.majors,
      curriculumYear: this.curriculumYear,
      studentType: this.studentType
    }
  }

  static fromJSON(data) {
    return new User(data)
  }

  /**
   * Firestore 문서 데이터로 변환
   */
  toFirestore() {
    return {
      studentId: this.studentId,
      passwordHash: this.passwordHash,
      name: this.name,
      admissionDate: this.admissionDate,
      currentYear: this.currentYear,
      status: this.status,
      department: this.department,
      majors: this.majors,
      curriculumYear: this.curriculumYear,
      studentType: this.studentType,
      createdAt: this.createdAt ? admin.firestore.Timestamp.fromDate(new Date(this.createdAt)) : admin.firestore.FieldValue.serverTimestamp(),
      updatedAt: admin.firestore.FieldValue.serverTimestamp()
    }
  }

  /**
   * Firestore 문서에서 User 객체 생성
   */
  static fromFirestore(doc) {
    const data = doc.data()
    return new User({
      ...data,
      createdAt: data.createdAt?.toDate?.()?.toISOString() || data.createdAt,
      updatedAt: data.updatedAt?.toDate?.()?.toISOString() || data.updatedAt
    })
  }
}

/**
 * 사용자 모델 (Firebase Firestore)
 */
export class UserModel {
  constructor() {
    try {
      this.db = getFirestore()
      this.collection = 'users'
      log.info('UserModel 초기화 완료 (Firebase Firestore 사용)')
    } catch (error) {
      log.error('UserModel 초기화 실패:', { error: error.message })
      throw new Error('Firebase가 초기화되지 않았습니다. serviceAccount.json 파일을 확인하세요.')
    }
  }

  /**
   * 학번으로 사용자 조회
   */
  async findByStudentId(studentId) {
    try {
      const docRef = this.db.collection(this.collection).doc(studentId)
      const doc = await docRef.get()

      if (!doc.exists) {
        return null
      }

      return User.fromFirestore(doc)
    } catch (error) {
      log.error('사용자 조회 오류:', { studentId, error: error.message })
      throw error
    }
  }

  /**
   * 사용자 생성
   */
  async create(userData) {
    try {
      const existing = await this.findByStudentId(userData.studentId)
      if (existing) {
        throw new Error('이미 존재하는 학번입니다')
      }

      const user = new User(userData)
      const docRef = this.db.collection(this.collection).doc(user.studentId)
      
      await docRef.set(user.toFirestore())

      log.info('사용자 생성 완료 (Firebase):', { studentId: user.studentId })
      return user.toPublic()
    } catch (error) {
      log.error('사용자 생성 오류:', { studentId: userData.studentId, error: error.message })
      throw error
    }
  }

  /**
   * 사용자 정보 업데이트
   */
  async update(studentId, updateData) {
    try {
      const docRef = this.db.collection(this.collection).doc(studentId)
      const doc = await docRef.get()

      if (!doc.exists) {
        throw new Error('사용자를 찾을 수 없습니다')
      }

      const existing = User.fromFirestore(doc)
      const updated = new User({
        ...existing.toJSON(),
        ...updateData,
        updatedAt: new Date().toISOString()
      })

      await docRef.update({
        ...updateData,
        updatedAt: admin.firestore.FieldValue.serverTimestamp()
      })

      log.info('사용자 정보 업데이트 완료 (Firebase):', { studentId })
      return updated.toPublic()
    } catch (error) {
      log.error('사용자 업데이트 오류:', { studentId, error: error.message })
      throw error
    }
  }

  /**
   * 학번 중복 체크
   */
  async isStudentIdExists(studentId) {
    try {
      const user = await this.findByStudentId(studentId)
      return user !== null
    } catch (error) {
      log.error('학번 중복 체크 오류:', { studentId, error: error.message })
      throw error
    }
  }
}

/**
 * UserModel 싱글톤 인스턴스
 */
let userModelInstance = null

export function getUserModel() {
  if (!userModelInstance) {
    userModelInstance = new UserModel()
  }
  return userModelInstance
}

