import XLSX from 'xlsx'
import fs from 'fs'
import path from 'path'
import { fileURLToPath } from 'url'

const __filename = fileURLToPath(import.meta.url)
const __dirname = path.dirname(__filename)

// Excel 파일 읽기
const excelDir = path.join(__dirname, '../book_csv')
const files = fs.readdirSync(excelDir).filter(file => file.endsWith('.xls') || file.endsWith('.xlsx'))

console.log('찾은 Excel 파일:', files)

// 파일별 통계를 위한 객체
const fileStats = {}

let allCourses = []

files.forEach(file => {
  const filePath = path.join(excelDir, file)
  
  // 파일명에서 학기 정보 추출
  let semester = '기타'
  if (file.includes('Book1.xls') && !file.includes('(1)')) {
    semester = '1학기'
  } else if (file.includes('Book2.xls')) {
    semester = '2학기'
  }
  
  console.log(`\n${'='.repeat(60)}`)
  console.log(`파일 읽는 중: ${file} (${semester})`)
  console.log(`${'='.repeat(60)}`)
  
  let fileCourseCount = 0
  
  try {
    const workbook = XLSX.readFile(filePath)
    const sheetNames = workbook.SheetNames
    
    console.log('시트 목록:', sheetNames)
    
    let totalRowsInFile = 0
    
    sheetNames.forEach(sheetName => {
      const worksheet = workbook.Sheets[sheetName]
      const data = XLSX.utils.sheet_to_json(worksheet, { defval: null })
      
      totalRowsInFile += data.length
      
      console.log(`\n시트 "${sheetName}" 데이터 (${data.length}행):`)
      if (data.length > 0 && files.indexOf(file) === 0) {
        // 첫 번째 파일만 상세 정보 출력 - 모든 컬럼 확인
        console.log('첫 번째 행의 모든 컬럼:', Object.keys(data[0]))
        console.log('첫 번째 행 샘플 (주요 컬럼):', {
          '개설과목': data[0]['개설과목'],
          '과목코드': data[0]['과목코드'],
          '학점': data[0]['학점'],
          '이수구분': data[0]['이수구분'],
          '개설학과': data[0]['개설학과'],
          '학년': data[0]['학년'],
          '담당교수명': data[0]['담당교수명'],
          '강의시간': data[0]['강의시간'],
          '강의실': data[0]['강의실'],
          '시수': data[0]['시수']
        })
      }
      
      // 데이터 구조 파악 및 변환
      data.forEach((row, index) => {
        // Excel 파일의 모든 컬럼 추출
        const courseName = row['개설과목'] || row['과목명'] || row['과목'] || row['교과목명'] || row['subject'] || row['name'] || row['Name']
        const creditStr = row['학점'] || row['학점수'] || row['credit'] || row['Credit'] || row['credits']
        const category = row['이수구분'] || row['구분'] || row['카테고리'] || row['분류'] || row['category'] || row['Category'] || row['type'] || '기타'
        const department = row['개설학과'] || row['학과'] || row['department'] || ''
        const courseCode = row['과목코드'] || row['코드'] || row['courseCode'] || ''
        const year = row['학년'] || row['year'] || row['grade'] || null
        const professor = row['담당교수명'] || row['교수명'] || row['professor'] || ''
        const lectureTime = row['강의시간'] || row['수업시간'] || row['lectureTime'] || ''
        const classroom = row['강의실'] || row['교실'] || row['classroom'] || ''
        const lectureType = row['강의구분'] || row['수업구분'] || row['lectureType'] || ''
        const hours = row['시수'] || row['hours'] || null
        const capacity = row['정원'] || row['capacity'] || null
        const year1Capacity = row['1학년정원'] || row['year1Capacity'] || null
        const year2Capacity = row['2학년정원'] || row['year2Capacity'] || null
        const year3Capacity = row['3학년정원'] || row['year3Capacity'] || null
        const year4Capacity = row['4학년정원'] || row['year4Capacity'] || null
        const section = row['분반'] || row['section'] || ''
        const courseNumber = row['강좌번호'] || row['courseNumber'] || ''
        const area = row['(교양)대영역'] || row['(교양)소영역'] || row['area'] || ''
        const remarks = row['비고'] || row['remarks'] || ''
        
        if (courseName && courseName.toString().trim() !== '') {
          // 학점 변환 (문자열 "3.0" -> 숫자 3)
          let credit = null
          if (creditStr) {
            if (typeof creditStr === 'number') {
              credit = creditStr
            } else {
              const parsed = parseFloat(creditStr.toString().replace(/[^0-9.]/g, ''))
              credit = isNaN(parsed) ? null : parsed
            }
          }
          
          const course = {
            // 기본 정보
            name: courseName.toString().trim(),
            courseCode: courseCode ? courseCode.toString().trim() : '',
            credit: credit,
            category: category ? category.toString().trim() : '기타',
            department: department ? department.toString().trim() : '',
            semester: semester,
            
            // 검색용 정보 (UX)
            professor: professor ? professor.toString().trim() : '',
            year: year ? (typeof year === 'number' ? year : parseInt(year.toString().replace(/[^0-9]/g, '')) || null) : null,
            lectureTime: lectureTime ? lectureTime.toString().trim() : '',
            classroom: classroom ? classroom.toString().trim() : '',
            lectureType: lectureType ? lectureType.toString().trim() : '',
            section: section ? section.toString().trim() : '',
            courseNumber: courseNumber ? courseNumber.toString().trim() : '',
            
            // Rule Engine용 정보
            area: area ? area.toString().trim() : '',
            hours: hours ? (typeof hours === 'number' ? hours : parseFloat(hours.toString().replace(/[^0-9.]/g, '')) || null) : null,
            
            // 추가 정보
            capacity: capacity ? (typeof capacity === 'number' ? capacity : parseInt(capacity.toString().replace(/[^0-9]/g, '')) || null) : null,
            year1Capacity: year1Capacity ? (typeof year1Capacity === 'number' ? year1Capacity : parseInt(year1Capacity.toString().replace(/[^0-9]/g, '')) || null) : null,
            year2Capacity: year2Capacity ? (typeof year2Capacity === 'number' ? year2Capacity : parseInt(year2Capacity.toString().replace(/[^0-9]/g, '')) || null) : null,
            year3Capacity: year3Capacity ? (typeof year3Capacity === 'number' ? year3Capacity : parseInt(year3Capacity.toString().replace(/[^0-9]/g, '')) || null) : null,
            year4Capacity: year4Capacity ? (typeof year4Capacity === 'number' ? year4Capacity : parseInt(year4Capacity.toString().replace(/[^0-9]/g, '')) || null) : null,
            remarks: remarks ? remarks.toString().trim() : ''
          }
          
          // 중복 제거하지 않고 모든 행을 그대로 저장 (강좌번호와 분반이 다를 수 있으므로)
          // 같은 과목코드여도 강좌번호나 분반이 다르면 다른 개설로 저장
          allCourses.push(course)
          fileCourseCount++
        }
      })
    })
    
    fileStats[file] = {
      semester: semester,
      coursesFound: fileCourseCount,
      totalRows: totalRowsInFile
    }
    
    console.log(`\n✅ ${file} (${semester}) 처리 완료: ${fileCourseCount}개의 새 과목 추가`)
    
  } catch (error) {
    console.error(`❌ 파일 ${file} 읽기 오류:`, error.message)
    fileStats[file] = {
      semester: semester,
      error: error.message
    }
  }
})

console.log(`\n\n${'='.repeat(60)}`)
console.log('📊 처리 결과 요약')
console.log(`${'='.repeat(60)}`)

// 파일별 통계 출력
Object.entries(fileStats).forEach(([file, stats]) => {
  if (stats.error) {
    console.log(`❌ ${file} (${stats.semester}): 오류 - ${stats.error}`)
  } else {
    console.log(`✅ ${file} (${stats.semester}): ${stats.coursesFound}개 과목 발견 (총 ${stats.totalRows}행)`)
  }
})

console.log(`\n📚 총 ${allCourses.length}개의 고유 과목을 찾았습니다.`)

// JSON 파일로 저장
const outputPath = path.join(__dirname, '../src/data/hanbatCourses.json')
fs.writeFileSync(outputPath, JSON.stringify(allCourses, null, 2), 'utf-8')
console.log(`\n데이터가 ${outputPath}에 저장되었습니다.`)

// JavaScript 파일로도 저장 (기존 형식 유지)
const jsContent = `// 한밭대학교 실제 과목 데이터 (Excel에서 추출)
// 자동 생성됨 - 수동 수정하지 마세요

export const hanbatCourses = ${JSON.stringify(allCourses, null, 2)}

/**
 * 과목명으로 검색
 * @param {string} query - 검색어
 * @returns {Array} 검색된 과목 목록
 */
export function searchCourses(query) {
  if (!query || query.trim() === '') {
    return []
  }
  
  const lowerQuery = query.toLowerCase()
  return hanbatCourses.filter(course => 
    course.name && course.name.toLowerCase().includes(lowerQuery)
  ).slice(0, 10) // 최대 10개만 반환
}

/**
 * 과목명으로 과목 정보 가져오기
 * @param {string} courseName - 과목명
 * @returns {Object|null} 과목 정보
 */
export function getCourseByName(courseName) {
  return hanbatCourses.find(course => 
    course.name === courseName
  ) || null
}
`

const jsOutputPath = path.join(__dirname, '../src/data/hanbatCourses.js')
fs.writeFileSync(jsOutputPath, jsContent, 'utf-8')
console.log(`JavaScript 파일이 ${jsOutputPath}에 저장되었습니다.`)

// 통계 출력
const withCredit = allCourses.filter(c => c.credit !== null && c.credit !== undefined).length
const categories = [...new Set(allCourses.map(c => c.category).filter(Boolean))]
console.log(`\n통계:`)
console.log(`- 학점 정보가 있는 과목: ${withCredit}개`)
console.log(`- 카테고리 종류: ${categories.length}개`)
console.log(`- 카테고리 목록:`, categories)

