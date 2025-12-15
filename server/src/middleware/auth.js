/**
 * 인증 미들웨어
 */

import { verifyToken } from '../utils/auth.js'
import { log } from '../utils/logger.js'

/**
 * JWT 토큰 검증 미들웨어
 */
export function authenticate(req, res, next) {
  try {
    // Authorization 헤더에서 토큰 추출
    const authHeader = req.headers.authorization

    // 디버깅: 헤더 확인
    log.debug('인증 요청:', {
      path: req.path,
      hasAuthHeader: !!authHeader,
      authHeader: authHeader ? `${authHeader.substring(0, 20)}...` : '없음',
      allHeaders: Object.keys(req.headers)
    })

    if (!authHeader) {
      log.warn('인증 토큰 없음:', { path: req.path, headers: req.headers })
      return res.status(401).json({
        success: false,
        message: '인증 토큰이 필요합니다'
      })
    }

    // Bearer {token} 형식에서 토큰 추출
    const token = authHeader.startsWith('Bearer ')
      ? authHeader.slice(7)
      : authHeader

    if (!token) {
      return res.status(401).json({
        success: false,
        message: '인증 토큰이 필요합니다'
      })
    }

    // 토큰 검증
    const decoded = verifyToken(token)

    // 요청 객체에 사용자 정보 추가
    req.user = decoded
    req.studentId = decoded.studentId

    next()
  } catch (error) {
    log.warn('인증 실패:', { error: error.message, path: req.path })
    return res.status(401).json({
      success: false,
      message: error.message || '인증에 실패했습니다'
    })
  }
}

/**
 * 선택적 인증 미들웨어 (토큰이 있으면 검증, 없으면 통과)
 */
export function optionalAuthenticate(req, res, next) {
  try {
    const authHeader = req.headers.authorization

    if (authHeader) {
      const token = authHeader.startsWith('Bearer ')
        ? authHeader.slice(7)
        : authHeader

      if (token) {
        try {
          const decoded = verifyToken(token)
          req.user = decoded
          req.studentId = decoded.studentId
        } catch (error) {
          // 토큰이 유효하지 않아도 통과 (선택적 인증)
          log.debug('선택적 인증 실패 (무시):', { error: error.message })
        }
      }
    }

    next()
  } catch (error) {
    // 에러가 발생해도 통과
    next()
  }
}
