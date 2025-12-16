/**
 * 인증 유틸리티
 * - JWT 토큰 생성/검증
 * - 비밀번호 해시/검증
 */

import jwt from 'jsonwebtoken'
import bcrypt from 'bcrypt'
import { log } from './logger.js'

const JWT_SECRET = process.env.JWT_SECRET || 'hanbat-gpa-secret-key-change-in-production'
const JWT_EXPIRES_IN = process.env.JWT_EXPIRES_IN || '7d'
const BCRYPT_SALT_ROUNDS = 10

/**
 * JWT 토큰 생성
 * @param {Object} payload - 토큰에 포함할 데이터
 * @returns {string} JWT 토큰
 */
export function generateToken(payload) {
  try {
    return jwt.sign(payload, JWT_SECRET, {
      expiresIn: JWT_EXPIRES_IN
    })
  } catch (error) {
    log.error('JWT 토큰 생성 오류:', { error: error.message })
    throw new Error('토큰 생성에 실패했습니다')
  }
}

/**
 * JWT 토큰 검증
 * @param {string} token - 검증할 토큰
 * @returns {Object} 디코딩된 페이로드
 */
export function verifyToken(token) {
  try {
    return jwt.verify(token, JWT_SECRET)
  } catch (error) {
    if (error.name === 'TokenExpiredError') {
      throw new Error('토큰이 만료되었습니다')
    } else if (error.name === 'JsonWebTokenError') {
      throw new Error('유효하지 않은 토큰입니다')
    }
    log.error('JWT 토큰 검증 오류:', { error: error.message })
    throw new Error('토큰 검증에 실패했습니다')
  }
}

/**
 * 비밀번호 해시화
 * @param {string} password - 평문 비밀번호
 * @returns {Promise<string>} 해시된 비밀번호
 */
export async function hashPassword(password) {
  try {
    return await bcrypt.hash(password, BCRYPT_SALT_ROUNDS)
  } catch (error) {
    log.error('비밀번호 해시 오류:', { error: error.message })
    throw new Error('비밀번호 처리에 실패했습니다')
  }
}

/**
 * 비밀번호 검증
 * @param {string} password - 평문 비밀번호
 * @param {string} hash - 해시된 비밀번호
 * @returns {Promise<boolean>} 일치 여부
 */
export async function comparePassword(password, hash) {
  try {
    return await bcrypt.compare(password, hash)
  } catch (error) {
    log.error('비밀번호 검증 오류:', { error: error.message })
    throw new Error('비밀번호 검증에 실패했습니다')
  }
}

/**
 * 비밀번호 강도 검증
 * @param {string} password - 검증할 비밀번호
 * @returns {Object} { valid: boolean, message: string }
 */
export function validatePasswordStrength(password) {
  if (!password || password.length < 8) {
    return {
      valid: false,
      message: '비밀번호는 8자 이상이어야 합니다'
    }
  }

  if (password.length > 50) {
    return {
      valid: false,
      message: '비밀번호는 50자 이하여야 합니다'
    }
  }

  // 영문, 숫자, 특수문자 중 2가지 이상 포함
  const hasLetter = /[a-zA-Z]/.test(password)
  const hasNumber = /[0-9]/.test(password)
  const hasSpecial = /[!@#$%^&*(),.?":{}|<>]/.test(password)

  const typeCount = [hasLetter, hasNumber, hasSpecial].filter(Boolean).length

  if (typeCount < 2) {
    return {
      valid: false,
      message: '비밀번호는 영문, 숫자, 특수문자 중 2가지 이상을 포함해야 합니다'
    }
  }

  return {
    valid: true,
    message: '비밀번호가 유효합니다'
  }
}


