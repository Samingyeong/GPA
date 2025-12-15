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
import { initializeFirebase } from '../src/config/firebase.js'
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
    const masterPath = path.join(dataDir, 'courses_master.csv')
    const offeringsPath = path.join(dataDir, 'course_offerings.csv')

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
      const masterBatch = db.batch()
      let masterCount = 0

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

        // Firestore 배치 제한 (500개)에 도달하면 커밋
        if (masterCount % 500 === 0) {
          await masterBatch.commit()
          log.info(`✅ 마스터 데이터 ${masterCount}개 업로드 완료`)
        }
      }

      // 남은 데이터 커밋
      if (masterCount % 500 !== 0) {
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

      const offeringsCollection = db.collection('course_offerings')
      const offeringsBatch = db.batch()
      let offeringsCount = 0

      for (const row of offeringsData) {
        // 문서 ID는 고유하게 생성 (course_code + semester + section 조합)
        const docId = `${row.course_code}_${row.semester || ''}_${row.section || ''}_${row.course_number || ''}`
        const docRef = offeringsCollection.doc(docId)
        
        offeringsBatch.set(docRef, {
          course_code: row.course_code || '',
          course_name: row.course_name || '',
          professor: row.professor || '',
          department: row.department || '',
          semester: row.semester || '',
          year: row.year ? parseInt(row.year) : null,
          lecture_time: row.lecture_time || '',
          classroom: row.classroom || '',
          lecture_type: row.lecture_type || '',
          section: row.section || '',
          course_number: row.course_number || '',
          credit: parseInt(row.credit) || 0,
          createdAt: admin.firestore.FieldValue.serverTimestamp(),
          updatedAt: admin.firestore.FieldValue.serverTimestamp()
        })
        offeringsCount++

        // Firestore 배치 제한 (500개)에 도달하면 커밋
        if (offeringsCount % 500 === 0) {
          await offeringsBatch.commit()
          log.info(`✅ 개설 정보 ${offeringsCount}개 업로드 완료`)
        }
      }

      // 남은 데이터 커밋
      if (offeringsCount % 500 !== 0) {
        await offeringsBatch.commit()
      }

      log.info(`✅ course_offerings 컬렉션 마이그레이션 완료: ${offeringsCount}개 문서`)
    } else {
      log.warn('⚠️  course_offerings.csv를 찾을 수 없습니다.')
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
if (import.meta.url === `file://${process.argv[1]}`) {
  migrateToFirestore()
}

