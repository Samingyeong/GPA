import express from 'express'
import cors from 'cors'
import dotenv from 'dotenv'
import swaggerUi from 'swagger-ui-express'
import swaggerJsdoc from 'swagger-jsdoc'
import graduationRoutes from './routes/graduation.js'
import courseRoutes from './routes/courses.js'
import requestLogger from './middleware/requestLogger.js'
import logger, { log } from './utils/logger.js'
import { initializeFirebase } from './config/firebase.js'
import path from 'path'
import { fileURLToPath } from 'url'
import fs from 'fs'
import { parse } from 'csv-parse/sync'
import { loadCoursesFromCSV, seedMasterDatabase, seedOfferingDatabase } from './database/seed.js'

const __filename = fileURLToPath(import.meta.url)
const __dirname = path.dirname(__filename)

dotenv.config()

// 로거 초기화 로그
log.info('🚀 서버 시작 중...')

// 과목 DB 초기화 (분리된 CSV 구조)
try {
  const dataDir = path.join(__dirname, '../data')
  const masterPath = path.join(dataDir, 'courses_master.csv')
  const offeringsPath = path.join(dataDir, 'course_offerings.csv')
  
  // 1. 마스터 데이터 로드 (졸업요건 기준)
  if (fs.existsSync(masterPath)) {
    const masterData = loadCoursesFromCSV(masterPath)
    seedMasterDatabase(masterData)
    log.info('📚 마스터 DB 초기화 완료')
  } else {
    log.warn('⚠️  courses_master.csv를 찾을 수 없습니다. 빈 DB로 시작합니다.')
    log.info('💡 npm run generate-csv 명령으로 CSV 파일을 생성하세요.')
  }
  
  // 2. 개설 정보 로드 (검색용)
  if (fs.existsSync(offeringsPath)) {
    try {
      const offeringsContent = fs.readFileSync(offeringsPath, 'utf-8')
      const offeringsData = parse(offeringsContent, {
        columns: true,
        skip_empty_lines: true,
        trim: true,
        relax_column_count: true, // 컬럼 수가 일치하지 않아도 허용
        relax_quotes: true, // 따옴표 처리 완화
        escape: '"' // 이스케이프 문자 지정
      })
      
      log.info(`📊 CSV 파싱 완료: ${offeringsData.length}개 행`)
      
      if (offeringsData.length > 0) {
        log.info('첫 번째 행 샘플:', {
          course_code: offeringsData[0].course_code,
          course_name: offeringsData[0].course_name,
          professor: offeringsData[0].professor,
          department: offeringsData[0].department,
          year: offeringsData[0].year
        })
        
        // 통계 정보 출력
        const uniqueDepartments = [...new Set(offeringsData.map(o => o.department).filter(d => d && d.trim() !== ''))].length
        const uniqueYears = [...new Set(offeringsData.map(o => o.year).filter(y => y !== null && y !== undefined && y !== ''))].length
        log.info('📈 개설 정보 통계:', {
          총_개설정보: offeringsData.length,
          고유_학과수: uniqueDepartments,
          고유_학년수: uniqueYears,
          샘플_학과: [...new Set(offeringsData.map(o => o.department).filter(d => d && d.trim() !== ''))].slice(0, 5)
        })
      }
      
      seedOfferingDatabase(offeringsData)
      log.info('🔍 개설 정보 DB 초기화 완료')
      
      // DB 로드 확인
      const { getOfferingDB } = await import('./models/offeringSchema.js')
      const db = getOfferingDB()
      log.info('✅ DB 로드 확인:', {
        로드된_개설정보수: db.offerings ? db.offerings.length : 0,
        샘플_학과: db.offerings && db.offerings.length > 0 
          ? [...new Set(db.offerings.slice(0, 10).map(o => o.department).filter(d => d && d.trim() !== ''))].slice(0, 3)
          : []
      })
    } catch (error) {
      log.error('개설 정보 CSV 로드 실패:', {
        error: error.message,
        stack: error.stack,
        path: offeringsPath
      })
    }
  } else {
    log.warn('⚠️  course_offerings.csv를 찾을 수 없습니다. 검색 기능이 제한됩니다.')
    log.info(`💡 파일 경로: ${offeringsPath}`)
    log.info('💡 npm run generate-csv 명령으로 CSV 파일을 생성하세요.')
  }
} catch (error) {
  log.error('❌ DB 초기화 실패:', { error: error.message, stack: error.stack })
}

const app = express()
const PORT = process.env.PORT || 3001

// Middleware
app.use(cors())
app.use(express.json())
// 한국어 지원을 위한 URL 인코딩 설정
app.use(express.urlencoded({ extended: true, parameterLimit: 10000 }))

// HTTP 요청 로깅 미들웨어
app.use(requestLogger)

// Swagger 설정
const swaggerOptions = {
  definition: {
    openapi: '3.0.0',
    info: {
      title: '한밭대학교 GPA 계산기 API',
      version: '1.0.0',
      description: '졸업 요건 체크 및 GPA 계산 API',
      contact: {
        name: 'API Support',
        email: 'support@hanbat-gpa.com'
      }
    },
    servers: [
      {
        url: `http://localhost:${PORT}`,
        description: 'Development server'
      }
    ]
  },
  apis: ['./src/routes/*.js', './src/swagger/*.yaml']
}

const swaggerSpec = swaggerJsdoc(swaggerOptions)
app.use('/api-docs', swaggerUi.serve, swaggerUi.setup(swaggerSpec))

// Routes
app.use('/api/graduation', graduationRoutes)
app.use('/api/courses', courseRoutes)

// Health check
app.get('/health', (req, res) => {
  res.json({ status: 'ok', timestamp: new Date().toISOString() })
})

// Error handling middleware
app.use((err, req, res, next) => {
  log.error('서버 에러 발생:', {
    error: err.message,
    stack: err.stack,
    url: req.url,
    method: req.method,
    ip: req.ip,
    userAgent: req.get('user-agent')
  })
  
  res.status(500).json({
    success: false,
    message: 'Internal server error',
    error: process.env.NODE_ENV === 'development' ? err.message : undefined
  })
})

app.listen(PORT, () => {
  log.info(`🚀 Server running on http://localhost:${PORT}`)
  log.info(`📚 API Documentation: http://localhost:${PORT}/api-docs`)
  log.info(`📝 로그 파일 위치: ${path.join(__dirname, '../logs')}`)
})

export default app

