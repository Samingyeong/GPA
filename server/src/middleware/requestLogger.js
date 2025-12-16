/**
 * HTTP 요청 로깅 미들웨어
 * Morgan을 사용한 HTTP 요청 로깅
 */

import morgan from 'morgan'
import logger from '../utils/logger.js'

// Morgan 스트림을 Winston으로 연결
const stream = {
  write: (message) => {
    logger.info(message.trim())
  }
}

// Morgan 포맷 설정
const morganFormat = process.env.NODE_ENV === 'production' 
  ? 'combined'  // 프로덕션: Apache combined 로그 포맷
  : 'dev'       // 개발: 간단한 포맷

// 요청 로깅 미들웨어 생성
const requestLogger = morgan(morganFormat, {
  stream,
  skip: (req, res) => {
    // Health check는 로그에서 제외 (선택사항)
    return req.url === '/health'
  }
})

export default requestLogger


