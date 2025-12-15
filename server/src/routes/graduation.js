import express from 'express'
import { evaluateGraduation, formatResult } from '../services/ruleEngine.js'
import { log } from '../utils/logger.js'

const router = express.Router()

/**
 * @swagger
 * /api/graduation/check:
 *   post:
 *     summary: 졸업 요건 체크
 *     tags: [Graduation]
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             required:
 *               - courseCodes
 *             properties:
 *               courseCodes:
 *                 type: array
 *                 description: |
 *                   사용자가 선택한 과목 코드 목록
 *                   - 검색 UX에서 선택된 course_code만 전달
 *                   - Rule Engine은 이 코드만으로 판정
 *                 items:
 *                   type: string
 *                   example: "CS204"
 *               grades:
 *                 type: object
 *                 description: "과목별 성적 맵 (courseCode: grade 형태)"
 *                 additionalProperties:
 *                   type: string
 *                   enum: [A+, A, B+, B, C+, C, D+, D, F]
 *                 example:
 *                   CS204: "A+"
 *                   CS301: "B"
 *               curriculumYear:
 *                 type: string
 *                 enum: [2018, 2019]
 *                 default: "2019"
 *                 description: 교육과정 연도
 *               studentType:
 *                 type: string
 *                 enum: [신입생, 편입생]
 *                 default: "신입생"
 *                 description: 입학 구분
 *               extraCurricularUnits:
 *                 type: number
 *                 default: 0
 *                 description: 비교과과정 유닛 수
 *     responses:
 *       200:
 *         description: 졸업 요건 체크 결과
 *         content:
 *           application/json:
 *             schema:
 *               type: object
 *               properties:
 *                 success:
 *                   type: boolean
 *                   example: true
 *                 data:
 *                   type: object
 *                   properties:
 *                     passed:
 *                       type: boolean
 *                       description: 모든 요건 충족 여부
 *                       example: false
 *                     results:
 *                       type: array
 *                       description: 각 규칙별 검증 결과
 *                       items:
 *                         type: object
 *                         properties:
 *                           rule:
 *                             type: string
 *                             example: "총 학점"
 *                           type:
 *                             type: string
 *                             example: "TOTAL_CREDITS"
 *                           passed:
 *                             type: boolean
 *                             example: true
 *                           required:
 *                             type: number
 *                             example: 130
 *                           current:
 *                             type: number
 *                             example: 125
 *                           remaining:
 *                             type: number
 *                             example: 5
 *                           message:
 *                             type: string
 *                             example: "총 학점 부족 (125/130, 부족: 5학점)"
 *                     missingItems:
 *                       type: array
 *                       description: 부족한 항목 리스트
 *                       items:
 *                         type: object
 *                         properties:
 *                           type:
 *                             type: string
 *                           rule:
 *                             type: string
 *                           message:
 *                             type: string
 *                           required:
 *                             type: number
 *                           current:
 *                             type: number
 *                           remaining:
 *                             type: number
 *       400:
 *         description: 잘못된 요청
 *         content:
 *           application/json:
 *             schema:
 *               type: object
 *               properties:
 *                 success:
 *                   type: boolean
 *                   example: false
 *                 message:
 *                   type: string
 *                   example: "courses 필드는 필수입니다"
 */
router.post('/check', async (req, res) => {
  try {
    const { courseCodes, grades = {}, curriculumYear = '2019', studentType = '신입생', extraCurricularUnits = 0 } = req.body

    if (!courseCodes || !Array.isArray(courseCodes)) {
      return res.status(400).json({
        success: false,
        message: 'courseCodes 필드는 필수이며 배열이어야 합니다'
      })
    }

    // context 구성: course_code만 받고, 나머지는 CSV에서 가져옴
    const context = {
      courseCodes, // 사용자 입력: 과목 코드 목록
      grades,      // 사용자 입력: { courseCode: grade } 맵
      curriculumYear,
      studentType,
      extraCurricularUnits
    }

    const result = evaluateGraduation(context)

    res.json({
      success: true,
      data: {
        passed: result.passed,
        tree: result.tree,
        missingItems: result.missingItems,
        formatted: formatResult(result.tree) // 디버깅용
      }
    })
  } catch (error) {
    log.error('졸업 요건 체크 오류:', {
      error: error.message,
      stack: error.stack,
      requestBody: req.body
    })
    res.status(500).json({
      success: false,
      message: '졸업 요건 체크 중 오류가 발생했습니다',
      error: error.message
    })
  }
})

export default router

