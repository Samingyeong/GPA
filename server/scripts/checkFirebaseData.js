/**
 * Firebase에 저장된 데이터 개수 확인 스크립트
 * 
 * 사용법:
 *   node scripts/checkFirebaseData.js
 */

import { initializeFirebase } from '../src/config/firebase.js'
import { log } from '../src/utils/logger.js'
import dotenv from 'dotenv'

dotenv.config()

async function checkFirebaseData() {
  try {
    log.info('🔍 Firebase 데이터 확인 시작...')

    // Firebase 초기화
    const db = initializeFirebase()

    // 1. courses_master 컬렉션 개수 확인
    const masterSnapshot = await db.collection('courses_master').get()
    log.info(`📚 courses_master: ${masterSnapshot.size}개 문서`)

    // 2. course_offerings 컬렉션 개수 확인
    const offeringsSnapshot = await db.collection('course_offerings').get()
    log.info(`🔍 course_offerings: ${offeringsSnapshot.size}개 문서`)

    // 3. course_offerings 샘플 데이터 확인
    if (offeringsSnapshot.size > 0) {
      log.info('\n📋 course_offerings 샘플 데이터 (처음 5개):')
      const sampleDocs = offeringsSnapshot.docs.slice(0, 5)
      sampleDocs.forEach((doc, index) => {
        const data = doc.data()
        log.info(`  ${index + 1}. [문서ID: ${doc.id}] ${data.course_code} - ${data.course_name} (강좌번호: ${data.course_number}, 분반: ${data.section})`)
      })
    }

    // 4. 분반별 개수 확인
    const sectionMap = new Map()
    offeringsSnapshot.docs.forEach(doc => {
      const section = doc.data().section || '00'
      sectionMap.set(section, (sectionMap.get(section) || 0) + 1)
    })
    log.info(`\n📊 분반별 개수:`)
    const sortedSections = Array.from(sectionMap.entries())
      .sort((a, b) => a[0].localeCompare(b[0]))
    sortedSections.forEach(([section, count]) => {
      log.info(`  분반 ${section}: ${count}개`)
    })
    
    // 5. course_code별 그룹화 확인
    const courseCodeMap = new Map()
    offeringsSnapshot.docs.forEach(doc => {
      const courseCode = doc.data().course_code
      if (courseCode) {
        courseCodeMap.set(courseCode, (courseCodeMap.get(courseCode) || 0) + 1)
      }
    })
    log.info(`\n📊 고유한 course_code 개수: ${courseCodeMap.size}개`)
    
    // 중복이 많은 course_code 확인
    const duplicates = Array.from(courseCodeMap.entries())
      .filter(([_, count]) => count > 1)
      .sort((a, b) => b[1] - a[1])
      .slice(0, 10)
    
    if (duplicates.length > 0) {
      log.info('\n📊 중복된 course_code (상위 10개):')
      duplicates.forEach(([code, count]) => {
        log.info(`  ${code}: ${count}개`)
      })
    }
    
    // 6. 분반 02 샘플 확인
    const section02Docs = offeringsSnapshot.docs.filter(doc => doc.data().section === '02')
    if (section02Docs.length > 0) {
      log.info(`\n📋 분반 02 샘플 데이터 (처음 5개):`)
      section02Docs.slice(0, 5).forEach((doc, index) => {
        const data = doc.data()
        log.info(`  ${index + 1}. [문서ID: ${doc.id}] ${data.course_code} - ${data.course_name} (강좌번호: ${data.course_number}, 분반: ${data.section})`)
      })
    }

    // 5. users 컬렉션 개수 확인
    const usersSnapshot = await db.collection('users').get()
    log.info(`👤 users: ${usersSnapshot.size}개 문서`)

    log.info('\n✅ Firebase 데이터 확인 완료!')
    process.exit(0)
  } catch (error) {
    log.error('❌ 데이터 확인 실패:', {
      error: error.message,
      stack: error.stack
    })
    process.exit(1)
  }
}

// 스크립트 직접 실행 시
checkFirebaseData().catch(error => {
  console.error('데이터 확인 실패:', error)
  process.exit(1)
})
