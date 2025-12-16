/**
 * CSV 데이터를 Firestore로 마이그레이션하는 스크립트
 * 
 * 사용법:
 *   node scripts/migrateToFirebase.js
 */

import fs from 'fs'
import path from 'path'
import { fileURLToPath } from 'url'
import { parse } from 'csv-parse/sync'
import admin, { initializeFirebase } from '../src/config/firebase.js'
import { log } from '../src/utils/logger.js'
import dotenv from 'dotenv'

dotenv.config()

const __filename = fileURLToPath(import.meta.url)
const __dirname = path.dirname(__filename)

/**
 * CSV 파일을 Firestore로 마이그레이션
 */
async function migrateToFirestore() {
  try {
    log.info('🚀 Firebase 마이그레이션 시작...')

    // Firebase 초기화
    const db = initializeFirebase()

    const dataDir = path.join(__dirname, '../data')
    const srcDataDir = path.join(__dirname, '../src/data')
    const masterPath = path.join(dataDir, 'courses_master.csv')
    const offeringsPath = path.join(dataDir, 'course_offerings.csv')
    const usersPath = path.join(srcDataDir, 'users.json')

    // 1. courses_master 컬렉션 마이그레이션
    if (fs.existsSync(masterPath)) {
      log.info('📚 courses_master.csv 로드 중...')
      const masterContent = fs.readFileSync(masterPath, 'utf-8')
      const masterData = parse(masterContent, {
        columns: true,
        skip_empty_lines: true,
        trim: true
      })

      log.info(`📊 ${masterData.length}개 마스터 데이터 파싱 완료`)

      const masterCollection = db.collection('courses_master')
      let masterBatch = db.batch()
      let masterCount = 0
      let batchSize = 0

      for (const row of masterData) {
        const docRef = masterCollection.doc(row.course_code)
        masterBatch.set(docRef, {
          course_code: row.course_code,
          course_name: row.course_name || '',
          credit: parseInt(row.credit) || 0,
          type: row.type || '',
          category: row.category || '',
          stage: row.stage || 'BASIC',
          is_required: row.is_required === 'true' || row.is_required === true,
          area: row.area || '',
          createdAt: admin.firestore.FieldValue.serverTimestamp(),
          updatedAt: admin.firestore.FieldValue.serverTimestamp()
        })
        masterCount++
        batchSize++

        // Firestore 배치 제한 (500개)에 도달하면 커밋하고 새 배치 생성
        if (batchSize >= 500) {
          await masterBatch.commit()
          log.info(`✅ 마스터 데이터 ${masterCount}개 업로드 완료`)
          masterBatch = db.batch() // 새 배치 생성
          batchSize = 0
        }
      }

      // 남은 데이터 커밋
      if (batchSize > 0) {
        await masterBatch.commit()
      }

      log.info(`✅ courses_master 컬렉션 마이그레이션 완료: ${masterCount}개 문서`)
    } else {
      log.warn('⚠️  courses_master.csv를 찾을 수 없습니다.')
    }

    // 2. course_offerings 컬렉션 마이그레이션
    if (fs.existsSync(offeringsPath)) {
      log.info('🔍 course_offerings.csv 로드 중...')
      const offeringsContent = fs.readFileSync(offeringsPath, 'utf-8')
      const offeringsData = parse(offeringsContent, {
        columns: true,
        skip_empty_lines: true,
        trim: true,
        relax_column_count: true,
        relax_quotes: true,
        escape: '"'
      })

      log.info(`📊 ${offeringsData.length}개 개설 정보 파싱 완료`)
      
      // 빈 행이나 유효하지 않은 데이터 필터링
      const validOfferings = offeringsData.filter(row => {
        return row.course_code && row.course_code.trim() !== ''
      })
      
      log.info(`📊 유효한 개설 정보: ${validOfferings.length}개 (전체: ${offeringsData.length}개)`)

      const offeringsCollection = db.collection('course_offerings')
      
      // 기존 데이터 삭제 (모든 데이터 삭제)
      log.info('🗑️  기존 course_offerings 컬렉션 데이터 삭제 중...')
      let deletedCount = 0
      let deleteBatch = db.batch()
      let deleteBatchSize = 0
      
      const existingDocs = await offeringsCollection.get()
      log.info(`📊 기존 문서 개수: ${existingDocs.size}개`)
      
      for (const doc of existingDocs.docs) {
        deleteBatch.delete(doc.ref)
        deletedCount++
        deleteBatchSize++
        
        // Firestore 배치 제한 (500개)에 도달하면 커밋하고 새 배치 생성
        if (deleteBatchSize >= 500) {
          await deleteBatch.commit()
          log.info(`🗑️  ${deletedCount}개 문서 삭제 완료`)
          deleteBatch = db.batch()
          deleteBatchSize = 0
        }
      }
      
      // 남은 삭제 배치 커밋
      if (deleteBatchSize > 0) {
        await deleteBatch.commit()
      }
      
      log.info(`✅ 기존 데이터 삭제 완료: ${deletedCount}개 문서`)
      
      let offeringsBatch = db.batch()
      let offeringsCount = 0
      let batchSize = 0
      let skippedCount = 0

      for (let index = 0; index < validOfferings.length; index++) {
        const row = validOfferings[index]
        
        // 필수 필드 검증
        if (!row.course_code || row.course_code.trim() === '') {
          skippedCount++
          log.warn(`⚠️  ${index + 1}번째 행 스킵: course_code가 없습니다`)
          continue
        }
        
        // 문서 ID를 과목코드_분반_강좌번호 형식으로 생성 (쉽게 알아볼 수 있도록)
        const courseCode = (row.course_code || '').toString().trim()
        const section = (row.section || '').toString().trim() || '00'
        const courseNumber = (row.course_number || '').toString().trim() || ''
        
        // 문서 ID 생성: 과목코드_분반_강좌번호 (강좌번호가 없으면 과목코드_분반)
        let docId = `${courseCode}_${section}`
        if (courseNumber) {
          docId = `${courseCode}_${section}_${courseNumber}`
        }
        
        // Firestore 문서 ID는 특수문자를 사용할 수 없으므로 안전한 문자로 변환
        docId = docId.replace(/[\/\s]/g, '_').replace(/[^a-zA-Z0-9_-]/g, '')
        
        const docRef = offeringsCollection.doc(docId)
        
        try {
          offeringsBatch.set(docRef, {
            course_code: (row.course_code || '').toString().trim(),
            course_name: (row.course_name || '').toString().trim(),
            professor: (row.professor || '').toString().trim(),
            department: (row.department || '').toString().trim(),
            semester: (row.semester || '').toString().trim(),
            year: row.year ? (typeof row.year === 'number' ? row.year : parseInt(row.year.toString().replace(/[^0-9]/g, '')) || null) : null,
            lecture_time: (row.lecture_time || '').toString().trim(),
            classroom: (row.classroom || '').toString().trim(),
            lecture_type: (row.lecture_type || '').toString().trim(),
            section: (row.section || '').toString().trim(),
            course_number: (row.course_number || '').toString().trim(),
            credit: row.credit ? (typeof row.credit === 'number' ? row.credit : parseInt(row.credit.toString().replace(/[^0-9]/g, '')) || 0) : 0,
            createdAt: admin.firestore.FieldValue.serverTimestamp(),
            updatedAt: admin.firestore.FieldValue.serverTimestamp()
          })
          offeringsCount++
          batchSize++

          // Firestore 배치 제한 (500개)에 도달하면 커밋하고 새 배치 생성
          if (batchSize >= 500) {
            await offeringsBatch.commit()
            log.info(`✅ 개설 정보 ${offeringsCount}개 업로드 완료 (스킵: ${skippedCount}개)`)
            offeringsBatch = db.batch() // 새 배치 생성
            batchSize = 0
          }
        } catch (error) {
          skippedCount++
          log.error(`❌ ${index + 1}번째 행 저장 실패:`, { 
            course_code: row.course_code, 
            error: error.message 
          })
        }
      }

      // 남은 데이터 커밋
      if (batchSize > 0) {
        await offeringsBatch.commit()
        log.info(`✅ 마지막 배치 커밋 완료: ${batchSize}개`)
      }

      log.info(`✅ course_offerings 컬렉션 마이그레이션 완료: ${offeringsCount}개 문서 저장, ${skippedCount}개 스킵`)
    } else {
      log.warn('⚠️  course_offerings.csv를 찾을 수 없습니다.')
    }

    // 3. users 컬렉션 마이그레이션 (로컬 JSON → Firestore)
    if (fs.existsSync(usersPath)) {
      log.info('👤 users.json 로드 중...')
      const usersContent = fs.readFileSync(usersPath, 'utf-8')
      let usersData = []
      
      if (usersContent.trim()) {
        try {
          usersData = JSON.parse(usersContent)
          if (!Array.isArray(usersData)) {
            log.warn('⚠️  users.json이 배열 형식이 아닙니다.')
            usersData = []
          }
        } catch (error) {
          log.error('⚠️  users.json 파싱 오류:', { error: error.message })
          usersData = []
        }
      }

      if (usersData.length > 0) {
        log.info(`📊 ${usersData.length}개 사용자 데이터 파싱 완료`)

        const usersCollection = db.collection('users')
        let usersBatch = db.batch()
        let usersCount = 0
        let batchSize = 0

        for (const userData of usersData) {
          // 학번을 문서 ID로 사용
          const docRef = usersCollection.doc(userData.studentId)
          
          usersBatch.set(docRef, {
            studentId: userData.studentId || '',
            passwordHash: userData.passwordHash || '',
            name: userData.name || '',
            admissionDate: userData.admissionDate || '',
            currentYear: userData.currentYear || 1,
            status: userData.status || '재학중',
            department: userData.department || '',
            majors: userData.majors || {
              primary: '',
              double: [],
              minor: [],
              fusion: [],
              advanced: []
            },
            curriculumYear: userData.curriculumYear || '2019',
            studentType: userData.studentType || '재학생',
            createdAt: userData.createdAt 
              ? admin.firestore.Timestamp.fromDate(new Date(userData.createdAt))
              : admin.firestore.FieldValue.serverTimestamp(),
            updatedAt: userData.updatedAt
              ? admin.firestore.Timestamp.fromDate(new Date(userData.updatedAt))
              : admin.firestore.FieldValue.serverTimestamp()
          })
          usersCount++
          batchSize++

          // Firestore 배치 제한 (500개)에 도달하면 커밋하고 새 배치 생성
          if (batchSize >= 500) {
            await usersBatch.commit()
            log.info(`✅ 사용자 데이터 ${usersCount}개 업로드 완료`)
            usersBatch = db.batch() // 새 배치 생성
            batchSize = 0
          }
        }

        // 남은 데이터 커밋
        if (batchSize > 0) {
          await usersBatch.commit()
        }

        log.info(`✅ users 컬렉션 마이그레이션 완료: ${usersCount}개 문서`)
      } else {
        log.info('ℹ️  마이그레이션할 사용자 데이터가 없습니다.')
      }
    } else {
      log.warn('⚠️  users.json을 찾을 수 없습니다.')
    }

    log.info('🎉 Firebase 마이그레이션 완료!')
    process.exit(0)
  } catch (error) {
    log.error('❌ 마이그레이션 실패:', {
      error: error.message,
      stack: error.stack
    })
    process.exit(1)
  }
}

// 스크립트 직접 실행 시
migrateToFirestore().catch(error => {
  console.error('마이그레이션 실패:', error)
  process.exit(1)
})

