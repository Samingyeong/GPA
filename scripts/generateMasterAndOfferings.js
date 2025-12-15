/**
 * Excel 데이터를 두 개의 CSV로 분리
 * 
 * 1. courses_master.csv - 졸업요건 기준 (불변)
 * 2. course_offerings.csv - 시간표/교수 검색용 (학기별)
 */

import fs from 'fs'
import path from 'path'
import { fileURLToPath } from 'url'

const __filename = fileURLToPath(import.meta.url)
const __dirname = path.dirname(__filename)

// hanbatCourses.json 파일 읽기
const jsonPath = path.join(__dirname, '../src/data/hanbatCourses.json')
const allCourses = JSON.parse(fs.readFileSync(jsonPath, 'utf-8'))

console.log(`\n${'='.repeat(60)}`)
console.log('데이터 분리 시작')
console.log(`${'='.repeat(60)}`)
console.log(`총 ${allCourses.length}개 과목 처리 중...\n`)

// 1. courses_master.csv 생성 (졸업요건 기준, 불변)
// course_code 기준으로 중복 제거하여 마스터 데이터 생성
const masterMap = new Map()

allCourses.forEach(course => {
  const code = course.courseCode
  if (!code) return
  
  // 이미 존재하는 경우, 더 완전한 정보로 업데이트
  if (!masterMap.has(code)) {
    masterMap.set(code, {
      course_code: code,
      course_name: course.name || '',
      credit: course.credit || 0,
      type: determineType(course.category),
      category: course.category || '',
      stage: determineStage(course.category),
      is_required: false, // TODO: 필수 과목 정보 추가 필요
      area: course.area || ''
    })
  } else {
    // 기존 항목 업데이트 (빈 값이 있으면 채우기)
    const existing = masterMap.get(code)
    if (!existing.course_name && course.name) existing.course_name = course.name
    if (!existing.credit && course.credit) existing.credit = course.credit
    if (!existing.category && course.category) existing.category = course.category
    if (!existing.type) existing.type = determineType(course.category)
    if (!existing.stage) existing.stage = determineStage(course.category)
    if (!existing.area && course.area) existing.area = course.area
  }
})

const masterCourses = Array.from(masterMap.values())

// CSV 이스케이프 함수: 모든 필드를 안전하게 처리
const escapeCsvField = (field) => {
  if (field === null || field === undefined) return '""'
  const str = String(field)
  // 모든 필드를 따옴표로 감싸고, 내부 따옴표는 두 개로 이스케이프
  // 이렇게 하면 쉼표가 포함된 필드도 안전하게 처리됨
  return `"${str.replace(/"/g, '""')}"`
}

// CSV 헤더
const masterHeader = 'course_code,course_name,credit,type,category,stage,is_required,area'
const masterCsv = [
  masterHeader,
  ...masterCourses.map(c => [
    escapeCsvField(c.course_code),
    escapeCsvField(c.course_name),
    escapeCsvField(c.credit),
    escapeCsvField(c.type),
    escapeCsvField(c.category),
    escapeCsvField(c.stage),
    escapeCsvField(c.is_required ? 'true' : 'false'),
    escapeCsvField(c.area)
  ].join(','))
].join('\n')

// 2. course_offerings.csv 생성 (시간표/교수 검색용, 학기별)
const offeringsHeader = 'course_code,course_name,professor,department,semester,year,lecture_time,classroom,lecture_type,section,course_number,credit'
const offeringsCsv = [
  offeringsHeader,
  ...allCourses.map(c => {
    // semester 필드 정리: 쉼표로 구분된 여러 학기 중 첫 번째만 사용
    let semester = c.semester || ''
    if (semester.includes(',')) {
      semester = semester.split(',')[0].trim()
    }
    
    // year 필드 정리: 숫자만 추출
    let year = c.year
    if (year && typeof year !== 'number') {
      const yearMatch = String(year).match(/\d+/)
      year = yearMatch ? parseInt(yearMatch[0]) : null
    }
    
    return [
      escapeCsvField(c.courseCode),
      escapeCsvField(c.name),
      escapeCsvField(c.professor),
      escapeCsvField(c.department),
      escapeCsvField(semester),
      escapeCsvField(year),
      escapeCsvField(c.lectureTime),
      escapeCsvField(c.classroom),
      escapeCsvField(c.lectureType),
      escapeCsvField(c.section),
      escapeCsvField(c.courseNumber),
      escapeCsvField(c.credit)
    ].join(',')
  })
].join('\n')

// 파일 저장
const outputDir = path.join(__dirname, '../server/data')
if (!fs.existsSync(outputDir)) {
  fs.mkdirSync(outputDir, { recursive: true })
}

const masterPath = path.join(outputDir, 'courses_master.csv')
const offeringsPath = path.join(outputDir, 'course_offerings.csv')

fs.writeFileSync(masterPath, masterCsv, 'utf-8')
fs.writeFileSync(offeringsPath, offeringsCsv, 'utf-8')

console.log(`✅ courses_master.csv 생성 완료: ${masterCourses.length}개 과목`)
console.log(`   위치: ${masterPath}`)
console.log(`\n✅ course_offerings.csv 생성 완료: ${allCourses.length}개 개설 정보`)
console.log(`   위치: ${offeringsPath}`)
console.log(`\n${'='.repeat(60)}`)
console.log('데이터 분리 완료!')
console.log(`${'='.repeat(60)}\n`)

// Helper functions
function determineType(category) {
  if (!category) return ''
  if (['교필', '교선'].includes(category)) return 'LIBERAL'
  if (['전필', '전선', '일선', '특필', '특선', '심필', '심선', '융필', '융선', '연선', '산선'].includes(category)) {
    return 'MAJOR'
  }
  return ''
}

function determineStage(category) {
  if (!category) return 'BASIC'
  if (['심필', '심선'].includes(category)) return 'ADVANCED'
  return 'BASIC'
}

