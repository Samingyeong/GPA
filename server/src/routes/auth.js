/**
 * 인증 관련 라우트
 * - 회원가입
 * - 로그인
 * - 토큰 검증
 */

import express from 'express'
import { body, validationResult } from 'express-validator'
import { getUserModel } from '../models/userModel.js'
import { hashPassword, comparePassword, generateToken, validatePasswordStrength } from '../utils/auth.js'
import { authenticate } from '../middleware/auth.js'
import { log } from '../utils/logger.js'

const router = express.Router()

/**
 * @swagger
 * /api/auth/register:
 *   post:
 *     summary: 회원가입
 *     tags: [Auth]
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             required:
 *               - studentId
 *               - password
 *               - name
 *               - admissionDate
 *               - currentYear
 *               - status
 *               - department
 *             properties:
 *               studentId:
 *                 type: string
 *                 example: "2020123456"
 *               password:
 *                 type: string
 *                 example: "password123"
 *               name:
 *                 type: string
 *                 example: "홍길동"
 *               admissionDate:
 *                 type: string
 *                 format: date
 *                 example: "2020-03-01"
 *               currentYear:
 *                 type: integer
 *                 enum: [1, 2, 3, 4]
 *                 example: 3
 *               status:
 *                 type: string
 *                 enum: [재학중, 휴학중]
 *                 example: "재학중"
 *               department:
 *                 type: string
 *                 example: "컴퓨터공학과"
 *               majors:
 *                 type: object
 *                 properties:
 *                   primary:
 *                     type: string
 *                     example: "컴퓨터공학과"
 *                   double:
 *                     type: array
 *                     items:
 *                       type: string
 *                     example: ["경영학과"]
 *                   minor:
 *                     type: array
 *                     items:
 *                       type: string
 *                   fusion:
 *                     type: array
 *                     items:
 *                       type: string
 *                   advanced:
 *                     type: array
 *                     items:
 *                       type: string
 *               curriculumYear:
 *                 type: string
 *                 enum: [2018, 2019]
 *                 default: "2019"
 *               studentType:
 *                 type: string
 *                 enum: [재학생, 신입생, 편입생, 휴학생]
 *                 default: "재학생"
 *     responses:
 *       201:
 *         description: 회원가입 성공
 *       400:
 *         description: 잘못된 요청
 *       409:
 *         description: 학번 중복
 */
router.post('/register', [
  body('studentId')
    .notEmpty().withMessage('학번은 필수입니다')
    .isLength({ min: 8, max: 20 }).withMessage('학번은 8-20자여야 합니다')
    .matches(/^[0-9]+$/).withMessage('학번은 숫자만 입력 가능합니다'),
  body('password')
    .notEmpty().withMessage('비밀번호는 필수입니다'),
  body('name')
    .notEmpty().withMessage('이름은 필수입니다')
    .trim(),
  body('admissionDate')
    .notEmpty().withMessage('입학날짜는 필수입니다')
    .isISO8601().withMessage('입학날짜 형식이 올바르지 않습니다'),
  body('currentYear')
    .notEmpty().withMessage('현재 학년은 필수입니다')
    .isInt({ min: 1, max: 4 }).withMessage('학년은 1-4 사이여야 합니다'),
  body('status')
    .notEmpty().withMessage('재학 상태는 필수입니다')
    .isIn(['재학중', '휴학중']).withMessage('재학 상태는 재학중 또는 휴학중이어야 합니다'),
  body('department')
    .notEmpty().withMessage('학과는 필수입니다')
    .trim(),
  body('curriculumYear')
    .optional()
    .isIn(['2018', '2019']).withMessage('교육과정 연도는 2018 또는 2019여야 합니다'),
  body('studentType')
    .optional()
    .isIn(['재학생', '신입생', '편입생', '휴학생']).withMessage('입학 구분은 재학생, 신입생, 편입생 또는 휴학생이어야 합니다')
], async (req, res) => {
  try {
    // 검증 오류 확인
    const errors = validationResult(req)
    if (!errors.isEmpty()) {
      return res.status(400).json({
        success: false,
        message: '입력값 검증에 실패했습니다',
        errors: errors.array()
      })
    }

    const {
      studentId,
      password,
      name,
      admissionDate,
      currentYear,
      status,
      department,
      majors = {},
      curriculumYear = '2019',
      studentType = '신입생'
    } = req.body

    // 비밀번호 강도 검증
    const passwordValidation = validatePasswordStrength(password)
    if (!passwordValidation.valid) {
      return res.status(400).json({
        success: false,
        message: passwordValidation.message
      })
    }

    const userModel = getUserModel()

    // 학번 중복 체크
    const exists = await userModel.isStudentIdExists(studentId)
    if (exists) {
      return res.status(409).json({
        success: false,
        message: '이미 등록된 학번입니다'
      })
    }

    // 비밀번호 해시화
    const passwordHash = await hashPassword(password)

    // 사용자 생성
    const userData = {
      studentId,
      passwordHash,
      name,
      admissionDate,
      currentYear,
      status,
      department,
      majors: {
        primary: majors.primary || department,
        double: majors.double || [],
        minor: majors.minor || [],
        fusion: majors.fusion || [],
        advanced: majors.advanced || []
      },
      curriculumYear,
      studentType
    }

    const user = await userModel.create(userData)

    log.info('회원가입 완료:', { studentId })

    res.status(201).json({
      success: true,
      message: '회원가입이 완료되었습니다',
      data: user
    })
  } catch (error) {
    log.error('회원가입 오류:', {
      error: error.message,
      stack: error.stack
    })

    // 이미 존재하는 학번 등 사용자 입력 관련 오류는 409 또는 400으로 반환
    if (error.message && error.message.includes('이미 존재하는 학번')) {
      return res.status(409).json({
        success: false,
        message: '이미 등록된 학번입니다'
      })
    }

    // 그 외는 서버 내부 오류
    return res.status(500).json({
      success: false,
      message: '회원가입 중 오류가 발생했습니다',
      error: process.env.NODE_ENV === 'development' ? error.message : undefined
    })
  }
})

/**
 * @swagger
 * /api/auth/login:
 *   post:
 *     summary: 로그인
 *     tags: [Auth]
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             required:
 *               - studentId
 *               - password
 *             properties:
 *               studentId:
 *                 type: string
 *                 example: "2020123456"
 *               password:
 *                 type: string
 *                 example: "password123"
 *     responses:
 *       200:
 *         description: 로그인 성공
 *       401:
 *         description: 인증 실패
 */
router.post('/login', [
  body('studentId')
    .notEmpty().withMessage('학번은 필수입니다'),
  body('password')
    .notEmpty().withMessage('비밀번호는 필수입니다')
], async (req, res) => {
  try {
    // 검증 오류 확인
    const errors = validationResult(req)
    if (!errors.isEmpty()) {
      return res.status(400).json({
        success: false,
        message: '입력값 검증에 실패했습니다',
        errors: errors.array()
      })
    }

    const { studentId, password } = req.body

    const userModel = getUserModel()

    // 사용자 조회
    const user = await userModel.findByStudentId(studentId)
    if (!user) {
      return res.status(401).json({
        success: false,
        message: '학번 또는 비밀번호가 올바르지 않습니다'
      })
    }

    // 비밀번호 검증
    const isPasswordValid = await comparePassword(password, user.passwordHash)
    if (!isPasswordValid) {
      return res.status(401).json({
        success: false,
        message: '학번 또는 비밀번호가 올바르지 않습니다'
      })
    }

    // JWT 토큰 생성
    const token = generateToken({
      studentId: user.studentId,
      name: user.name
    })

    log.info('로그인 성공:', { studentId })

    res.json({
      success: true,
      data: {
        token,
        user: user.toPublic()
      }
    })
  } catch (error) {
    log.error('로그인 오류:', {
      error: error.message,
      stack: error.stack
    })
    res.status(500).json({
      success: false,
      message: '로그인 중 오류가 발생했습니다',
      error: process.env.NODE_ENV === 'development' ? error.message : undefined
    })
  }
})

/**
 * @swagger
 * /api/auth/verify:
 *   get:
 *     summary: 토큰 검증
 *     tags: [Auth]
 *     security:
 *       - bearerAuth: []
 *     responses:
 *       200:
 *         description: 토큰이 유효합니다
 *       401:
 *         description: 토큰이 유효하지 않습니다
 */
router.get('/verify', authenticate, async (req, res) => {
  try {
    const userModel = getUserModel()
    const user = await userModel.findByStudentId(req.studentId)

    if (!user) {
      return res.status(404).json({
        success: false,
        message: '사용자를 찾을 수 없습니다'
      })
    }

    res.json({
      success: true,
      data: user.toPublic()
    })
  } catch (error) {
    log.error('토큰 검증 오류:', {
      error: error.message,
      stack: error.stack
    })
    res.status(500).json({
      success: false,
      message: '토큰 검증 중 오류가 발생했습니다',
      error: process.env.NODE_ENV === 'development' ? error.message : undefined
    })
  }
})

/**
 * @swagger
 * /api/auth/logout:
 *   post:
 *     summary: 로그아웃
 *     tags: [Auth]
 *     security:
 *       - bearerAuth: []
 *     description: |
 *       사용자를 로그아웃합니다. 
 *       JWT 토큰 기반 인증이므로 서버 측에서는 토큰 검증만 수행하고,
 *       실제 토큰 삭제는 클라이언트에서 처리합니다.
 *     responses:
 *       200:
 *         description: 로그아웃 성공
 *         content:
 *           application/json:
 *             schema:
 *               type: object
 *               properties:
 *                 success:
 *                   type: boolean
 *                   example: true
 *                 message:
 *                   type: string
 *                   example: "로그아웃되었습니다"
 *       401:
 *         description: 인증 실패
 */
router.post('/logout', authenticate, async (req, res) => {
  try {
    log.info('로그아웃:', { studentId: req.studentId })

    // JWT 토큰은 stateless이므로 서버 측에서 별도로 무효화할 필요 없음
    // 클라이언트에서 토큰을 삭제하면 됨
    // 향후 토큰 블랙리스트 기능이 필요하면 Redis 등을 사용하여 구현 가능

    res.json({
      success: true,
      message: '로그아웃되었습니다'
    })
  } catch (error) {
    log.error('로그아웃 오류:', {
      error: error.message,
      stack: error.stack
    })
    res.status(500).json({
      success: false,
      message: '로그아웃 중 오류가 발생했습니다',
      error: process.env.NODE_ENV === 'development' ? error.message : undefined
    })
  }
})

export default router


