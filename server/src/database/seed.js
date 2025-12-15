/**
 * CSV 데이터를 메모리 DB에 로드하는 시드 스크립트
 * 
 * 사용법:
 * - CSV 파일을 읽어서 CourseDatabase에 로드
 * - 실제 CSV 파일 경로나 API에서 받은 데이터를 사용
 */

import { initializeCourseDB } from '../models/courseSchema.js'
import { initializeOfferingDB } from '../models/offeringSchema.js'
import { log } from '../utils/logger.js'
import fs from 'fs'
import path from 'path'
import { fileURLToPath } from 'url'
import { parse } from 'csv-parse/sync'

const __filename = fileURLToPath(import.meta.url)
const __dirname = path.dirname(__filename)

/**
 * CSV 파일에서 과목 데이터 로드
 */
export function loadCoursesFromCSV(filePath) {
  try {
    const csvContent = fs.readFileSync(filePath, 'utf-8')
    const records = parse(csvContent, {
      columns: true,
      skip_empty_lines: true,
      trim: true
    })
    
    return records.map(row => ({
      course_code: row.course_code || row.courseCode,
      name: row.name,
      credit: Number(row.credit) || 0,
      type: row.type || '', // MAJOR, LIBERAL
      category: row.category || '', // 전필, 전선, 교필, 교선 등
      stage: row.stage || 'BASIC', // BASIC, ADVANCED
      is_required: row.is_required === 'true' || row.is_required === true || row.isRequired === true,
      area: row.area || '', // 핵심교양 영역
      department: row.department || '',
      semester: row.semester || ''
    }))
  } catch (error) {
    log.error('CSV 로드 오류:', { error: error.message, stack: error.stack, filePath })
    throw error
  }
}

/**
 * Excel 파싱 결과를 CSV 형식으로 변환
 * 
 * 🔍 검색용 컬럼 + ⚙️ Rule Engine용 컬럼 모두 포함
 */
export function convertExcelToCourseData(excelData) {
  // scripts/parseExcel.js에서 생성된 데이터 형식 변환
  return excelData.map(row => ({
    // 🔍 검색용 컬럼 (UX) - Excel의 모든 컬럼 추출
    course_code: row.courseCode || row['과목코드'],
    course_name: row.name || row['개설과목'],
    department: row.department || row['개설학과'] || '',
    professor: row.professor || row['담당교수명'] || '',
    credit: Number(row.credit) || Number(row['학점']) || 0,
    year: row.year ? (typeof row.year === 'number' ? row.year : parseInt(row.year.toString().replace(/[^0-9]/g, '')) || null) : null,
    lecture_time: row.lectureTime || row['강의시간'] || '',
    classroom: row.classroom || row['강의실'] || '',
    lecture_type: row.lectureType || row['강의구분'] || '',
    section: row.section || row['분반'] || '',
    course_number: row.courseNumber || row['강좌번호'] || '',
    
    // ⚙️ Rule Engine용 컬럼 (내부 기준)
    type: determineType(row.category || row['이수구분']),
    category: row.category || row['이수구분'] || '',
    stage: determineStage(row.category || row['이수구분']),
    is_required: row.is_required === true || row.is_required === 'true' || false, // TODO: CSV에 is_required 컬럼 추가 필요
    area: row.area || row['(교양)대영역'] || row['(교양)소영역'] || '',
    semester: row.semester || ''
  }))
}

/**
 * 이수구분으로 type 결정
 */
function determineType(category) {
  if (['교필', '교선'].includes(category)) {
    return 'LIBERAL'
  }
  if (['전필', '전선', '일선', '특필', '특선', '심필', '심선', '융필', '융선', '연선', '산선'].includes(category)) {
    return 'MAJOR'
  }
  return ''
}

/**
 * 이수구분으로 stage 결정
 */
function determineStage(category) {
  if (['심필', '심선'].includes(category)) {
    return 'ADVANCED'
  }
  return 'BASIC'
}

/**
 * 시드 실행 (마스터 데이터)
 */
export function seedMasterDatabase(csvData) {
  const db = initializeCourseDB(csvData)
  log.info(`✅ 마스터 DB 로드 완료: ${db.courses.size}개 과목`)
  log.info(`✅ 필수 과목: ${db.requiredCourses.size}개`)
  return db
}

/**
 * 시드 실행 (개설 정보)
 */
export function seedOfferingDatabase(csvData) {
  const db = initializeOfferingDB(csvData)
  log.info(`✅ 개설 정보 DB 로드 완료: ${db.offerings.length}개 개설 정보`)
  return db
}

/**
 * 시드 실행 (하위 호환성 - 기존 코드용)
 */
export function seedDatabase(csvData) {
  return seedMasterDatabase(csvData)
}

// 직접 실행 시
if (import.meta.url === `file://${process.argv[1]}`) {
  // 예시: Excel 파싱 결과를 사용
  const excelDataPath = path.join(__dirname, '../../src/data/hanbatCourses.json')
  
  if (fs.existsSync(excelDataPath)) {
    const excelData = JSON.parse(fs.readFileSync(excelDataPath, 'utf-8'))
    const courseData = convertExcelToCourseData(excelData)
    seedDatabase(courseData)
  } else {
    log.warn('CSV/Excel 데이터 파일을 찾을 수 없습니다.')
    log.info('사용법: seedDatabase(courseData) 호출')
  }
}

