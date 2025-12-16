/**
 * 시간표 관련 라우트
 */

import express from 'express'
import { body, query, validationResult } from 'express-validator'
import { getTimetableModel } from '../models/timetableModel.js'
import { authenticate } from '../middleware/auth.js'
import { log } from '../utils/logger.js'
import { getFirestore } from '../config/firebase.js'

const router = express.Router()

/**
 * @swagger
 * /api/timetables:
 *   get:
 *     summary: 시간표 조회
 *     tags: [Timetables]
 *     security:
 *       - bearerAuth: []
 *     parameters:
 *       - in: query
 *         name: year
 *         schema:
 *           type: integer
 *           enum: [1, 2, 3, 4]
 *         description: 학년 (선택사항, 특정 학기 조회 시)
 *       - in: query
 *         name: semester
 *         schema:
 *           type: integer
 *           enum: [1, 2]
 *         description: 학기 (선택사항, 특정 학기 조회 시)
 *     responses:
 *       200:
 *         description: 시간표 조회 성공
 *       401:
 *         description: 인증 실패
 */
router.get('/', authenticate, async (req, res) => {
  try {
    const { year, semester } = req.query
    const studentId = req.studentId
    const timetableModel = getTimetableModel()

    // 특정 학기 조회
    if (year && semester) {
      const timetable = await timetableModel.findByStudentAndSemester(
        studentId,
        parseInt(year),
        parseInt(semester)
      )

      if (!timetable) {
        return res.json({
          success: true,
          data: {
            year: parseInt(year),
            semester: parseInt(semester),
            courses: []
          }
        })
      }

      return res.json({
        success: true,
        data: timetable.toJSON()
      })
    }

    // 전체 조회
    const timetables = await timetableModel.findAllByStudentId(studentId)

    res.json({
      success: true,
      data: timetables.map(t => t.toJSON())
    })
  } catch (error) {
    log.error('시간표 조회 오류:', {
      error: error.message,
      stack: error.stack,
      studentId: req.studentId
    })
    res.status(500).json({
      success: false,
      message: '시간표 조회 중 오류가 발생했습니다',
      error: process.env.NODE_ENV === 'development' ? error.message : undefined
    })
  }
})

/**
 * @swagger
 * /api/timetables:
 *   post:
 *     summary: 시간표 저장/수정
 *     tags: [Timetables]
 *     security:
 *       - bearerAuth: []
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             required:
 *               - year
 *               - semester
 *               - courses
 *             properties:
 *               year:
 *                 type: integer
 *                 enum: [1, 2, 3, 4]
 *                 example: 1
 *               semester:
 *                 type: integer
 *                 enum: [1, 2]
 *                 example: 1
 *               courses:
 *                 type: array
 *                 items:
 *                   type: object
 *                   properties:
 *                     course_code:
 *                       type: string
 *                       example: "CS204"
 *                     course_name:
 *                       type: string
 *                       example: "자료구조"
 *                     credit:
 *                       type: integer
 *                       example: 3
 *                     grade:
 *                       type: string
 *                       enum: [A+, A, B+, B, C+, C, D+, D, F]
 *                       example: "A+"
 *                     category:
 *                       type: string
 *                       example: "전필"
 *     responses:
 *       200:
 *         description: 시간표 저장 성공
 *       400:
 *         description: 잘못된 요청
 */
router.post('/', authenticate, [
  body('year')
    .notEmpty().withMessage('학년은 필수입니다')
    .isInt({ min: 1, max: 4 }).withMessage('학년은 1-4 사이여야 합니다'),
  body('semester')
    .notEmpty().withMessage('학기는 필수입니다')
    .isInt({ min: 1, max: 2 }).withMessage('학기는 1 또는 2여야 합니다'),
  body('courses')
    .isArray().withMessage('courses는 배열이어야 합니다')
    .optional()
], async (req, res) => {
  try {
    const errors = validationResult(req)
    if (!errors.isEmpty()) {
      return res.status(400).json({
        success: false,
        message: '입력값 검증에 실패했습니다',
        errors: errors.array()
      })
    }

    const { year, semester, courses = [] } = req.body
    const studentId = req.studentId
    const timetableModel = getTimetableModel()

    // 과목 정보 보강 (course_code로 courses_master에서 정보 가져오기)
    const enrichedCourses = await Promise.all(
      courses.map(async (course) => {
        if (course.course_code) {
          try {
            const db = getFirestore()
            const masterDoc = await db.collection('courses_master')
              .doc(course.course_code)
              .get()

            if (masterDoc.exists) {
              const masterData = masterDoc.data()
              return {
                course_code: course.course_code,
                course_name: course.course_name || masterData.course_name || '',
                credit: course.credit || masterData.credit || 0,
                grade: course.grade || null,
                category: course.category || masterData.category || '',
                type: course.type || masterData.type || '',
                stage: course.stage || masterData.stage || 'BASIC'
              }
            }
          } catch (error) {
            log.warn('과목 정보 조회 실패:', { course_code: course.course_code, error: error.message })
          }
        }

        // 마스터 데이터가 없으면 입력된 정보 그대로 사용
        return {
          course_code: course.course_code || '',
          course_name: course.course_name || '',
          credit: course.credit || 0,
          grade: course.grade || null,
          category: course.category || '',
          type: course.type || '',
          stage: course.stage || 'BASIC'
        }
      })
    )

    const timetable = await timetableModel.save({
      studentId,
      year: parseInt(year),
      semester: parseInt(semester),
      courses: enrichedCourses
    })

    log.info('시간표 저장 완료:', { studentId, year, semester, courseCount: enrichedCourses.length })

    res.json({
      success: true,
      message: '시간표가 저장되었습니다',
      data: timetable.toJSON()
    })
  } catch (error) {
    log.error('시간표 저장 오류:', {
      error: error.message,
      stack: error.stack,
      studentId: req.studentId
    })
    res.status(500).json({
      success: false,
      message: '시간표 저장 중 오류가 발생했습니다',
      error: process.env.NODE_ENV === 'development' ? error.message : undefined
    })
  }
})

/**
 * @swagger
 * /api/timetables/courses:
 *   post:
 *     summary: 시간표에 과목 추가
 *     tags: [Timetables]
 *     security:
 *       - bearerAuth: []
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             required:
 *               - year
 *               - semester
 *               - course_code
 *             properties:
 *               year:
 *                 type: integer
 *                 enum: [1, 2, 3, 4]
 *               semester:
 *                 type: integer
 *                 enum: [1, 2]
 *               course_code:
 *                 type: string
 *                 example: "CS204"
 *               grade:
 *                 type: string
 *                 enum: [A+, A, B+, B, C+, C, D+, D, F]
 *     responses:
 *       200:
 *         description: 과목 추가 성공
 *       400:
 *         description: 잘못된 요청
 *       409:
 *         description: 이미 추가된 과목
 */
router.post('/courses', authenticate, [
  body('year')
    .notEmpty().withMessage('학년은 필수입니다')
    .isInt({ min: 1, max: 4 }).withMessage('학년은 1-4 사이여야 합니다'),
  body('semester')
    .notEmpty().withMessage('학기는 필수입니다')
    .isInt({ min: 1, max: 2 }).withMessage('학기는 1 또는 2여야 합니다'),
  body('course_code')
    .notEmpty().withMessage('과목 코드는 필수입니다')
    .trim()
], async (req, res) => {
  try {
    const errors = validationResult(req)
    if (!errors.isEmpty()) {
      return res.status(400).json({
        success: false,
        message: '입력값 검증에 실패했습니다',
        errors: errors.array()
      })
    }

    const { year, semester, course_code, grade } = req.body
    const studentId = req.studentId
    const timetableModel = getTimetableModel()

    // courses_master에서 과목 정보 가져오기
    const db = getFirestore()
    const masterDoc = await db.collection('courses_master')
      .doc(course_code)
      .get()

    if (!masterDoc.exists) {
      return res.status(404).json({
        success: false,
        message: '과목을 찾을 수 없습니다'
      })
    }

    const masterData = masterDoc.data()
    const course = {
      course_code,
      course_name: masterData.course_name || '',
      credit: masterData.credit || 0,
      grade: grade || null,
      category: masterData.category || '',
      type: masterData.type || '',
      stage: masterData.stage || 'BASIC'
    }

    const timetable = await timetableModel.addCourse(
      studentId,
      parseInt(year),
      parseInt(semester),
      course
    )

    log.info('과목 추가 완료:', { studentId, year, semester, course_code })

    res.json({
      success: true,
      message: '과목이 추가되었습니다',
      data: timetable.toJSON()
    })
  } catch (error) {
    if (error.message === '이미 추가된 과목입니다') {
      return res.status(409).json({
        success: false,
        message: error.message
      })
    }

    log.error('과목 추가 오류:', {
      error: error.message,
      stack: error.stack,
      studentId: req.studentId
    })
    res.status(500).json({
      success: false,
      message: '과목 추가 중 오류가 발생했습니다',
      error: process.env.NODE_ENV === 'development' ? error.message : undefined
    })
  }
})

/**
 * @swagger
 * /api/timetables/courses:
 *   delete:
 *     summary: 시간표에서 과목 삭제
 *     tags: [Timetables]
 *     security:
 *       - bearerAuth: []
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             required:
 *               - year
 *               - semester
 *               - course_code
 *             properties:
 *               year:
 *                 type: integer
 *                 enum: [1, 2, 3, 4]
 *               semester:
 *                 type: integer
 *                 enum: [1, 2]
 *               course_code:
 *                 type: string
 *                 example: "CS204"
 *     responses:
 *       200:
 *         description: 과목 삭제 성공
 *       400:
 *         description: 잘못된 요청
 *       404:
 *         description: 시간표 또는 과목을 찾을 수 없음
 */
router.delete('/courses', authenticate, [
  body('year')
    .notEmpty().withMessage('학년은 필수입니다')
    .isInt({ min: 1, max: 4 }).withMessage('학년은 1-4 사이여야 합니다'),
  body('semester')
    .notEmpty().withMessage('학기는 필수입니다')
    .isInt({ min: 1, max: 2 }).withMessage('학기는 1 또는 2여야 합니다'),
  body('course_code')
    .notEmpty().withMessage('과목 코드는 필수입니다')
    .trim()
], async (req, res) => {
  try {
    const errors = validationResult(req)
    if (!errors.isEmpty()) {
      return res.status(400).json({
        success: false,
        message: '입력값 검증에 실패했습니다',
        errors: errors.array()
      })
    }

    const { year, semester, course_code } = req.body
    const studentId = req.studentId
    const timetableModel = getTimetableModel()

    const timetable = await timetableModel.removeCourse(
      studentId,
      parseInt(year),
      parseInt(semester),
      course_code
    )

    log.info('과목 삭제 완료:', { studentId, year, semester, course_code })

    res.json({
      success: true,
      message: '과목이 삭제되었습니다',
      data: timetable.toJSON()
    })
  } catch (error) {
    if (error.message === '시간표를 찾을 수 없습니다' || error.message === '과목을 찾을 수 없습니다') {
      return res.status(404).json({
        success: false,
        message: error.message
      })
    }

    log.error('과목 삭제 오류:', {
      error: error.message,
      stack: error.stack,
      studentId: req.studentId
    })
    res.status(500).json({
      success: false,
      message: '과목 삭제 중 오류가 발생했습니다',
      error: process.env.NODE_ENV === 'development' ? error.message : undefined
    })
  }
})

/**
 * @swagger
 * /api/timetables/courses:
 *   put:
 *     summary: 시간표에서 과목 정보 수정 (성적 등)
 *     tags: [Timetables]
 *     security:
 *       - bearerAuth: []
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             required:
 *               - year
 *               - semester
 *               - course_code
 *             properties:
 *               year:
 *                 type: integer
 *                 enum: [1, 2, 3, 4]
 *               semester:
 *                 type: integer
 *                 enum: [1, 2]
 *               course_code:
 *                 type: string
 *                 example: "CS204"
 *               grade:
 *                 type: string
 *                 enum: [A+, A, B+, B, C+, C, D+, D, F]
 *     responses:
 *       200:
 *         description: 과목 수정 성공
 *       400:
 *         description: 잘못된 요청
 *       404:
 *         description: 시간표 또는 과목을 찾을 수 없음
 */
router.put('/courses', authenticate, [
  body('year')
    .notEmpty().withMessage('학년은 필수입니다')
    .isInt({ min: 1, max: 4 }).withMessage('학년은 1-4 사이여야 합니다'),
  body('semester')
    .notEmpty().withMessage('학기는 필수입니다')
    .isInt({ min: 1, max: 2 }).withMessage('학기는 1 또는 2여야 합니다'),
  body('course_code')
    .notEmpty().withMessage('과목 코드는 필수입니다')
    .trim()
], async (req, res) => {
  try {
    const errors = validationResult(req)
    if (!errors.isEmpty()) {
      return res.status(400).json({
        success: false,
        message: '입력값 검증에 실패했습니다',
        errors: errors.array()
      })
    }

    const { year, semester, course_code, ...updateData } = req.body
    const studentId = req.studentId
    const timetableModel = getTimetableModel()

    const timetable = await timetableModel.updateCourse(
      studentId,
      parseInt(year),
      parseInt(semester),
      course_code,
      updateData
    )

    log.info('과목 수정 완료:', { studentId, year, semester, course_code })

    res.json({
      success: true,
      message: '과목 정보가 수정되었습니다',
      data: timetable.toJSON()
    })
  } catch (error) {
    if (error.message === '시간표를 찾을 수 없습니다' || error.message === '과목을 찾을 수 없습니다') {
      return res.status(404).json({
        success: false,
        message: error.message
      })
    }

    log.error('과목 수정 오류:', {
      error: error.message,
      stack: error.stack,
      studentId: req.studentId
    })
    res.status(500).json({
      success: false,
      message: '과목 수정 중 오류가 발생했습니다',
      error: process.env.NODE_ENV === 'development' ? error.message : undefined
    })
  }
})

export default router

