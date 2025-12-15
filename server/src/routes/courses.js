import express from 'express'
import { getFirebaseOfferingModel } from '../models/firebaseOfferingModel.js'
import { getOfferingDB } from '../models/offeringSchema.js'
import { log } from '../utils/logger.js'
import admin from '../config/firebase.js'
import fs from 'fs'
import path from 'path'
import { fileURLToPath } from 'url'

const router = express.Router()

/**
 * @swagger
 * /api/courses/search:
 *   get:
 *     summary: 과목 검색 (에타 시간표 스타일)
 *     tags: [Courses]
 *     description: |
 *       사용자 친화적 검색 API
 *       - 과목명, 학과, 교수명으로 검색
 *       - 필터링 지원
 *       - 검색 결과는 course_code 포함하여 반환
 *     parameters:
 *       - in: query
 *         name: q
 *         schema:
 *           type: string
 *         description: 검색어 (과목명, 학과, 교수명)
 *         example: "자료구조"
 *       - in: query
 *         name: department
 *         schema:
 *           type: string
 *           enum: ["--", "건설환경공학과", "건축학과(5년제)", "기계소재융합시스템공학과", "도시공학과", "모바일융합공학과", "반도체시스템공학과", "산업경영공학과", "산업디자인학과", "소프트웨어융합교육원", "신소재공학과", "스마트시스템경영공학과", "융합기술학과", "인공지능소프트웨어학과", "전기공학과", "전자공학과", "정보통신공학과", "지능미디어공학과", "창의융합학과", "컴퓨터공학과", "통합물관리학과", "화학생명공학과"]
 *           default: "--"
 *         description: 학과 필터 (-- 선택 시 전체 학과 표시, /api/courses/departments에서 전체 목록 조회 가능)
 *         example: "--"
 *       - in: query
 *         name: type
 *         schema:
 *           type: string
 *           enum: [MAJOR, LIBERAL]
 *         description: 이수구분 필터 (전공/교양)
 *       - in: query
 *         name: category
 *         schema:
 *           type: string
 *           enum: [교필, 교선, 전필, 전선, 일선, 특필, 특선, 심필, 심선, 융필, 융선, 연선, 산선, 교직]
 *         description: 세부 카테고리 필터
 *       - in: query
 *         name: stage
 *         schema:
 *           type: string
 *           enum: [BASIC, ADVANCED]
 *         description: 전공 단계 필터
 *       - in: query
 *         name: year
 *         schema:
 *           type: string
 *           enum: ["--", "1", "2", "3", "4"]
 *           default: "--"
 *         description: 학년 필터 (-- 선택 시 전체 학년 표시)
 *         example: "--"
 *       - in: query
 *         name: professor
 *         schema:
 *           type: string
 *         description: 교수명 필터
 *       - in: query
 *         name: classroom
 *         schema:
 *           type: string
 *         description: 강의실 필터
 *       - in: query
 *         name: lectureType
 *         schema:
 *           type: string
 *         description: 강의구분 필터
 *     responses:
 *       200:
 *         description: 검색 결과
 *         content:
 *           application/json:
 *             schema:
 *               type: object
 *               properties:
 *                 success:
 *                   type: boolean
 *                   example: true
 *                 data:
 *                   type: array
 *                   items:
 *                     type: object
 *                     properties:
 *                       course_code:
 *                         type: string
 *                         example: "CS204"
 *                         description: 과목 코드 (Rule Engine에 전달할 값)
 *                       course_name:
 *                         type: string
 *                         example: "자료구조"
 *                       department:
 *                         type: string
 *                         example: "컴퓨터공학과"
 *                       professor:
 *                         type: string
 *                         example: "홍길동"
 *                       credit:
 *                         type: number
 *                         example: 3
 *                       type:
 *                         type: string
 *                         example: "MAJOR"
 *                       category:
 *                         type: string
 *                         example: "전필"
 *                       stage:
 *                         type: string
 *                         example: "BASIC"
 *                       year:
 *                         type: integer
 *                         example: 1
 *                         description: 학년 (1, 2, 3, 4)
 *                       lecture_time:
 *                         type: string
 *                         example: "월11,12,13"
 *                         description: 강의시간
 *                       classroom:
 *                         type: string
 *                         example: "창의혁신관(306)"
 *                         description: 강의실
 *                       lecture_type:
 *                         type: string
 *                         example: "실습"
 *                         description: 강의구분
 *                       section:
 *                         type: string
 *                         example: "01"
 *                         description: 분반
 *                       course_number:
 *                         type: string
 *                         example: "2026100433"
 *                         description: 강좌번호
 *                       area:
 *                         type: string
 *                         example: ""
 *                 count:
 *                   type: number
 *                   example: 5
 */
router.get('/search', async (req, res) => {
  try {
    // Express는 기본적으로 쿼리 파라미터를 자동으로 디코딩합니다
    // 하지만 이중 인코딩된 경우를 대비해 안전하게 처리
    const { q, department, type, category, stage, year, professor, classroom, lectureType } = req.query
    
    // 안전한 디코딩 함수: 이미 디코딩된 경우와 인코딩된 경우 모두 처리
    const safeDecode = (param) => {
      if (!param) return param
      // 한글이 이미 있는지 확인
      if (/[가-힣]/.test(param)) {
        return param // 이미 디코딩됨
      }
      // URL 인코딩된 경우 디코딩 시도
      try {
        const decoded = decodeURIComponent(param)
        // 디코딩 후 한글이 나타나면 성공
        if (/[가-힣]/.test(decoded)) {
          return decoded
        }
        return param // 디코딩해도 한글이 없으면 원본 반환
      } catch (e) {
        return param // 디코딩 실패 시 원본 반환
      }
    }
    
    // 파라미터 처리 (Express가 이미 디코딩했을 가능성이 높음)
    const decodedQ = q ? safeDecode(q) : q
    const decodedDepartment = department ? safeDecode(department) : department
    const decodedProfessor = professor ? safeDecode(professor) : professor
    const decodedClassroom = classroom ? safeDecode(classroom) : classroom
    const decodedLectureType = lectureType ? safeDecode(lectureType) : lectureType
    
    // Firebase 또는 로컬 DB 사용 (Firebase가 없으면 로컬 DB 사용)
    let db
    let useFirebase = false
    try {
      db = getFirebaseOfferingModel()
      const totalCount = await db.getCount()
      if (totalCount > 0) {
        useFirebase = true
        log.debug('Firebase DB 사용:', { totalOfferings: totalCount })
      } else {
        log.warn('Firebase DB가 비어있습니다. 로컬 DB를 사용합니다.')
        db = getOfferingDB()
      }
    } catch (error) {
      log.warn('Firebase 초기화 실패, 로컬 DB 사용:', { error: error.message })
      db = getOfferingDB()
    }
    
    // 로컬 DB인 경우 상태 확인
    if (!useFirebase) {
      const localCount = db.offerings ? db.offerings.length : 0
      if (localCount === 0) {
        log.warn('로컬 개설 정보 DB가 비어있습니다')
        return res.json({
          success: true,
          data: [],
          count: 0,
          message: '개설 정보가 로드되지 않았습니다. CSV 파일을 확인하세요.'
        })
      }
      log.info('📊 로컬 DB 사용:', { 
        totalOfferings: localCount,
        sampleOfferings: db.offerings.slice(0, 3).map(o => ({
          course_name: o.courseName,
          professor: o.professor,
          department: o.department,
          year: o.year
        }))
      })
    }
    
    const filters = {}
    if (decodedDepartment && decodedDepartment.trim() && decodedDepartment.trim() !== '--') {
      filters.department = decodedDepartment.trim()
    }
    if (type && type.trim() && type.trim() !== '--') {
      filters.type = type.trim()
    }
    if (category && category.trim() && category.trim() !== '--') {
      filters.category = category.trim()
    }
    if (stage && stage.trim() && stage.trim() !== '--') {
      filters.stage = stage.trim()
    }
    // year 필터: "--" 또는 빈 값이면 필터 적용 안 함
    if (year && year !== '--' && year !== '' && !isNaN(parseInt(year))) {
      filters.year = parseInt(year)
    }
    if (decodedProfessor && decodedProfessor.trim() && decodedProfessor.trim() !== '--') {
      filters.professor = decodedProfessor.trim()
    }
    if (decodedClassroom && decodedClassroom.trim() && decodedClassroom.trim() !== '--') {
      filters.classroom = decodedClassroom.trim()
    }
    if (decodedLectureType && decodedLectureType.trim() && decodedLectureType.trim() !== '--') {
      filters.lectureType = decodedLectureType.trim()
    }
    
    // 디버깅용 로그 (실제 받은 값 확인)
    log.info('검색 요청:', { 
      originalQuery: q,
      decodedQuery: decodedQ,
      originalDepartment: department,
      decodedDepartment: decodedDepartment,
      originalYear: year,
      filters: filters,
      filterCount: Object.keys(filters).length,
      useFirebase: useFirebase
    })
    
    // Firebase인 경우 async search, 로컬인 경우 sync searchForAPI
    let results
    let resultsWithoutFilters = []
    
    if (useFirebase) {
      results = await db.searchForAPI(decodedQ, filters)
      // 필터 없이 검색 결과 확인 (예외처리용)
      if (results.length === 0 && Object.keys(filters).length > 0) {
        resultsWithoutFilters = await db.searchForAPI(decodedQ, {})
      }
    } else {
      // 필터 없이 검색 결과 확인 (예외처리용)
      resultsWithoutFilters = db.searchForAPI(decodedQ, {})
      log.info('🔍 필터 없이 검색 결과:', { 
        count: resultsWithoutFilters.length,
        query: decodedQ,
        sampleResults: resultsWithoutFilters.slice(0, 5).map(r => ({
          course_name: r.course_name,
          professor: r.professor,
          department: r.department,
          year: r.year
        }))
      })
      
      // 필터 적용 전후 비교
      log.info('🔍 필터 적용:', filters)
      results = db.searchForAPI(decodedQ, filters)
    }
    
    // 검색 결과가 없을 때 예외처리
    if (results.length === 0) {
      const filterKeys = Object.keys(filters)
      
      // 검색어만으로 결과가 있는지 확인
      const hasResultsWithoutFilters = resultsWithoutFilters.length > 0
      
      if (hasResultsWithoutFilters && filterKeys.length > 0) {
        // 필터 조합이 일치하지 않는 경우
        const problematicFilters = []
        const suggestions = {}
        
        // 각 필터를 하나씩 제거하면서 문제가 되는 필터 찾기
        for (const filterKey of filterKeys) {
          const testFilters = { ...filters }
          delete testFilters[filterKey]
          
          let testResults
          if (useFirebase) {
            testResults = await db.searchForAPI(decodedQ, testFilters)
          } else {
            testResults = db.searchForAPI(decodedQ, testFilters)
          }
          
          if (testResults.length > 0) {
            problematicFilters.push(filterKey)
            
            // 제안할 수 있는 값들 추출
            const uniqueValues = [...new Set(testResults.map(r => {
              if (filterKey === 'department') return r.department
              if (filterKey === 'professor') return r.professor
              if (filterKey === 'year') return r.year
              if (filterKey === 'category') return r.category
              if (filterKey === 'stage') return r.stage
              if (filterKey === 'lectureType') return r.lecture_type
              return null
            }).filter(v => v !== null && v !== undefined))].slice(0, 5)
            
            if (uniqueValues.length > 0) {
              suggestions[filterKey] = uniqueValues
            }
          }
        }
        
        // 필터별 한국어 이름 매핑
        const filterNames = {
          department: '학과',
          professor: '교수명',
          year: '학년',
          category: '세부 카테고리',
          stage: '전공 단계',
          type: '이수구분',
          classroom: '강의실',
          lectureType: '강의구분'
        }
        
        let message = '검색 결과가 없습니다. '
        if (problematicFilters.length > 0) {
          const filterNameList = problematicFilters.map(f => filterNames[f] || f).join(', ')
          message += `입력하신 ${filterNameList} 필터와 일치하는 과목이 없습니다.`
          
          if (Object.keys(suggestions).length > 0) {
            message += ' 다음 값들을 확인해보세요: '
            const suggestionList = Object.entries(suggestions).map(([key, values]) => {
              return `${filterNames[key]}: ${values.join(', ')}`
            }).join(' | ')
            message += suggestionList
          }
        } else {
          message += '필터 조합을 확인해주세요.'
        }
        
        log.warn('⚠️ 검색 결과 없음:', {
          query: decodedQ,
          filters: filters,
          problematicFilters: problematicFilters,
          suggestions: suggestions,
          resultsWithoutFilters: resultsWithoutFilters.length
        })
        
        return res.status(404).json({
          success: false,
          message: message,
          data: [],
          count: 0,
          query: decodedQ || '',
          problematicFilters: problematicFilters.map(f => filterNames[f] || f),
          suggestions: suggestions
        })
      } else if (!hasResultsWithoutFilters && decodedQ) {
        // 검색어 자체가 일치하지 않는 경우
        log.warn('⚠️ 검색어 일치 없음:', { query: decodedQ })
        return res.status(404).json({
          success: false,
          message: `"${decodedQ}"에 해당하는 과목을 찾을 수 없습니다. 검색어를 확인해주세요.`,
          data: [],
          count: 0,
          query: decodedQ
        })
      } else if (filterKeys.length === 0 && !decodedQ) {
        // 검색어도 필터도 없는 경우
        return res.status(400).json({
          success: false,
          message: '검색어 또는 필터를 입력해주세요.',
          data: [],
          count: 0
        })
      } else {
        // 기타 경우
        log.warn('⚠️ 검색 결과 없음:', { query: decodedQ, filters: filters })
        return res.status(404).json({
          success: false,
          message: '검색 결과가 없습니다. 검색어나 필터를 변경해보세요.',
          data: [],
          count: 0,
          query: decodedQ || ''
        })
      }
    }
    
    log.info('최종 검색 결과:', { 
      count: results.length,
      query: decodedQ,
      filters: filters,
      sampleResults: results.slice(0, 3).map(r => ({
        course_name: r.course_name,
        professor: r.professor
      }))
    })
    
    res.json({
      success: true,
      data: results,
      count: results.length,
      query: decodedQ || ''
    })
  } catch (error) {
    log.error('과목 검색 오류:', {
      error: error.message,
      stack: error.stack,
      query: req.query
    })
    res.status(500).json({
      success: false,
      message: '과목 검색 중 오류가 발생했습니다',
      error: error.message
    })
  }
})

/**
 * @swagger
 * /api/courses/departments:
 *   get:
 *     summary: 학과 목록 조회
 *     tags: [Courses]
 *     description: 검색 필터용 학과 목록 (드롭다운용)
 *     responses:
 *       200:
 *         description: 학과 목록
 *         content:
 *           application/json:
 *             schema:
 *               type: object
 *               properties:
 *                 success:
 *                   type: boolean
 *                 data:
 *                   type: array
 *                   items:
 *                     type: string
 *                   example: ["건설환경공학과", "건축학과(5년제)", "기계소재융합시스템공학과", "도시공학과", "모바일융합공학과", "반도체시스템공학과", "산업경영공학과", "산업디자인학과", "소프트웨어융합교육원", "신소재공학과", "스마트시스템경영공학과", "융합기술학과", "인공지능소프트웨어학과", "전기공학과", "전자공학과", "정보통신공학과", "지능미디어공학과", "창의융합학과", "컴퓨터공학과", "통합물관리학과", "화학생명공학과"]
 */
router.get('/departments', async (req, res) => {
  try {
    let departments = []
    
    // Firebase 또는 로컬 DB 사용
    let useFirebase = false
    try {
      const firebaseModel = getFirebaseOfferingModel()
      const totalCount = await firebaseModel.getCount()
      if (totalCount > 0) {
        useFirebase = true
        departments = await firebaseModel.getDepartments()
        log.debug('Firebase에서 학과 목록 조회:', { count: departments.length })
      } else {
        const db = getOfferingDB()
        // 중복 제거 및 빈 값 필터링 강화
        departments = [...new Set(
          db.offerings
            .map(o => o.department)
            .filter(d => d && typeof d === 'string' && d.trim() !== '' && d.trim() !== '--')
            .map(d => d.trim())
        )].sort()
        log.debug('로컬 DB에서 학과 목록 조회:', { count: departments.length })
      }
    } catch (error) {
      log.warn('Firebase 초기화 실패, 로컬 DB 사용:', { error: error.message })
      const db = getOfferingDB()
      // 중복 제거 및 빈 값 필터링 강화
      departments = [...new Set(
        db.offerings
          .map(o => o.department)
          .filter(d => d && typeof d === 'string' && d.trim() !== '' && d.trim() !== '--')
          .map(d => d.trim())
      )].sort()
    }
    
    res.json({
      success: true,
      data: departments
    })
  } catch (error) {
    log.error('학과 목록 조회 오류:', {
      error: error.message,
      stack: error.stack
    })
    res.status(500).json({
      success: false,
      message: '학과 목록 조회 중 오류가 발생했습니다'
    })
  }
})

/**
 * @swagger
 * /api/courses/years:
 *   get:
 *     summary: 학년 목록 조회
 *     tags: [Courses]
 *     description: 검색 필터용 학년 목록 (드롭다운용)
 *     responses:
 *       200:
 *         description: 학년 목록
 *         content:
 *           application/json:
 *             schema:
 *               type: object
 *               properties:
 *                 success:
 *                   type: boolean
 *                 data:
 *                   type: array
 *                   items:
 *                     type: string
 *                   example: ["1", "2", "3", "4"]
 */
router.get('/years', async (req, res) => {
  try {
    let years = []
    
    // Firebase 또는 로컬 DB 사용
    let useFirebase = false
    try {
      const firebaseModel = getFirebaseOfferingModel()
      const totalCount = await firebaseModel.getCount()
      if (totalCount > 0) {
        useFirebase = true
        years = await firebaseModel.getYears()
        log.debug('Firebase에서 학년 목록 조회:', { count: years.length })
      } else {
        const db = getOfferingDB()
        // 중복 제거 및 유효한 학년만 필터링 (1, 2, 3, 4만)
        years = [...new Set(
          db.offerings
            .map(o => o.year)
            .filter(y => y !== null && y !== undefined && !isNaN(y) && y >= 1 && y <= 4)
            .map(y => String(y))
        )].sort((a, b) => parseInt(a) - parseInt(b))
        log.debug('로컬 DB에서 학년 목록 조회:', { count: years.length, years })
      }
    } catch (error) {
      log.warn('Firebase 초기화 실패, 로컬 DB 사용:', { error: error.message })
      const db = getOfferingDB()
      // 중복 제거 및 유효한 학년만 필터링 (1, 2, 3, 4만)
      years = [...new Set(
        db.offerings
          .map(o => o.year)
          .filter(y => y !== null && y !== undefined && !isNaN(y) && y >= 1 && y <= 4)
          .map(y => String(y))
      )].sort((a, b) => parseInt(a) - parseInt(b))
    }
    
    res.json({
      success: true,
      data: years
    })
  } catch (error) {
    log.error('학년 목록 조회 오류:', {
      error: error.message,
      stack: error.stack
    })
    res.status(500).json({
      success: false,
      message: '학년 목록 조회 중 오류가 발생했습니다'
    })
  }
})

/**
 * @swagger
 * /api/courses/{courseCode}:
 *   get:
 *     summary: 과목 상세 정보 조회
 *     tags: [Courses]
 *     parameters:
 *       - in: path
 *         name: courseCode
 *         required: true
 *         schema:
 *           type: string
 *         description: 과목 코드
 *     responses:
 *       200:
 *         description: 과목 상세 정보
 */
router.get('/:courseCode', (req, res) => {
  try {
    const { courseCode } = req.params
    const db = getOfferingDB()
    // 개설 정보에서 첫 번째 매칭 항목 찾기
    const offering = db.offerings.find(o => o.courseCode === courseCode)
    
    if (!offering) {
      log.warn('과목을 찾을 수 없음:', { courseCode })
      return res.status(404).json({
        success: false,
        message: '과목을 찾을 수 없습니다'
      })
    }
    
    res.json({
      success: true,
      data: {
        course_code: offering.courseCode,
        course_name: offering.courseName,
        department: offering.department,
        professor: offering.professor,
        credit: offering.credit,
        semester: offering.semester,
        year: offering.year,
        lecture_time: offering.lectureTime,
        classroom: offering.classroom,
        lecture_type: offering.lectureType,
        section: offering.section,
        course_number: offering.courseNumber
      }
    })
  } catch (error) {
    log.error('과목 조회 오류:', {
      error: error.message,
      stack: error.stack,
      courseCode: req.params.courseCode
    })
    res.status(500).json({
      success: false,
      message: '과목 조회 중 오류가 발생했습니다'
    })
  }
})

/**
 * @swagger
 * /api/courses/firebase-status:
 *   get:
 *     summary: Firebase 설정 상태 확인
 *     tags: [Courses]
 *     description: Firebase가 설정되어 있는지 확인
 *     responses:
 *       200:
 *         description: Firebase 설정 상태
 */
router.get('/firebase-status', async (req, res) => {
  try {
    const __filename = fileURLToPath(import.meta.url)
    const __dirname = path.dirname(__filename)
    
    // 1. serviceAccount.json 파일 확인
    const serviceAccountPath = process.env.FIREBASE_SERVICE_ACCOUNT_PATH
      ? path.resolve(process.env.FIREBASE_SERVICE_ACCOUNT_PATH)
      : path.join(__dirname, '../../serviceAccount.json')
    
    const hasServiceAccountFile = fs.existsSync(serviceAccountPath)
    
    // 2. 환경 변수 확인
    const hasEnvVars = !!(process.env.FIREBASE_PROJECT_ID && process.env.FIREBASE_PRIVATE_KEY)
    
    // 3. Firebase 초기화 상태 확인
    let isInitialized = false
    let firebaseError = null
    let firestoreCount = null
    
    try {
      if (admin.apps.length > 0) {
        isInitialized = true
        // Firestore 연결 테스트
        const db = admin.firestore()
        const testCollection = db.collection('course_offerings')
        const snapshot = await testCollection.limit(1).get()
        firestoreCount = snapshot.size
      } else {
        // 초기화 시도
        const { initializeFirebase } = await import('../config/firebase.js')
        const db = initializeFirebase()
        isInitialized = true
        const testCollection = db.collection('course_offerings')
        const snapshot = await testCollection.limit(1).get()
        firestoreCount = snapshot.size
      }
    } catch (error) {
      firebaseError = error.message
      isInitialized = false
    }
    
    res.json({
      success: true,
      data: {
        hasServiceAccountFile,
        serviceAccountPath,
        hasEnvVars,
        isInitialized,
        firebaseError,
        firestoreCount,
        status: isInitialized ? 'connected' : (hasServiceAccountFile || hasEnvVars ? 'not_initialized' : 'not_configured'),
        message: isInitialized 
          ? 'Firebase가 정상적으로 연결되어 있습니다' 
          : (hasServiceAccountFile || hasEnvVars 
            ? 'Firebase 설정 파일은 있지만 초기화에 실패했습니다' 
            : 'Firebase 설정 파일이 없습니다. 로컬 CSV 파일을 사용합니다.')
      }
    })
  } catch (error) {
    log.error('Firebase 상태 확인 오류:', {
      error: error.message,
      stack: error.stack
    })
    res.status(500).json({
      success: false,
      message: 'Firebase 상태 확인 중 오류가 발생했습니다',
      error: error.message
    })
  }
})

export default router

