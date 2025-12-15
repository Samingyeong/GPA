/**
 * Rule Engine - 졸업 요건 검증 엔진 (트리 구조)
 * 
 * 흐름:
 * [CSV (전체 과목 기준)] 
 *   ↓
 * [DB seed / 메모리 로드]
 *   ↓
 * [사용자가 이수 과목 선택 (course_code)]
 *   ↓
 * [Rule Engine (course_code 기준 매칭)]
 *   ↓
 * [졸업 판정]
 * 
 * 📌 사용자 입력에는 course_code만 받는다
 * 👉 모든 기준은 CSV에서 온다 (과목명, 카테고리, 학점 등)
 */
import { getFirebaseMasterModel } from '../models/firebaseMasterModel.js'

// ==================== 타입 정의 ====================

export const RuleType = {
  TOTAL_CREDIT: 'TOTAL_CREDIT',
  MAJOR_BASIC_CREDIT: 'MAJOR_BASIC_CREDIT',
  MAJOR_ADVANCED_CREDIT: 'MAJOR_ADVANCED_CREDIT',
  LIBERAL_TOTAL_CREDIT: 'LIBERAL_TOTAL_CREDIT',
  REQUIRED_COURSE: 'REQUIRED_COURSE',
  EXTRA_CURRICULAR: 'EXTRA_CURRICULAR'
}

export const LogicType = {
  AND: 'AND',
  OR: 'OR'
}

// ==================== Rule (원자 규칙) ====================

/**
 * Rule 클래스
 * - 절대 다른 Rule을 모른다
 * - 오직 context만 본다
 */
export class Rule {
  constructor({ id, type, required, evaluator, message }) {
    this.id = id
    this.type = type
    this.required = required
    this.evaluator = evaluator
    this.message = message
  }

  evaluate(context) {
    const { passed, current } = this.evaluator(context, this.required)

    return {
      id: this.id,
      type: this.type,
      passed,
      required: this.required,
      current,
      remaining: passed ? 0 : Math.max(0, this.required - current),
      message: this.message({ passed, current, required: this.required })
    }
  }
}

// ==================== RuleGroup (논리 조합) ====================

/**
 * RuleGroup 클래스
 * - Rule/RuleGroup 둘 다 자식으로 가질 수 있음
 */
export class RuleGroup {
  constructor({ id, logic = LogicType.AND, children = [], description }) {
    this.id = id
    this.logic = logic
    this.children = children
    this.description = description
  }

  evaluate(context) {
    const results = this.children.map(child => child.evaluate(context))

    const passed =
      this.logic === LogicType.AND
        ? results.every(r => r.passed)
        : results.some(r => r.passed)

    return {
      id: this.id,
      passed,
      logic: this.logic,
      description: this.description,
      results
    }
  }
}

// ==================== 컴퓨터공학과 졸업요건 RuleGroup 트리 ====================

/**
 * 최상위 ROOT RuleGroup 생성
 */
export function createCSGraduationRuleTree() {
  // 필수 과목은 CSV에서 동적으로 가져옴
  const requiredGroup = createRequiredCourseGroup()
  
  return new RuleGroup({
    id: 'ROOT',
    logic: LogicType.AND,
    description: '컴퓨터공학과 졸업요건',
    children: [
      totalCreditRule(),
      liberalRuleGroup(),
      majorRuleGroup(),
      requiredGroup,
      extraCurricularRule()
    ]
  })
}

// ==================== 총 학점 Rule ====================

function totalCreditRule() {
  return new Rule({
    id: 'TOTAL_130',
    type: RuleType.TOTAL_CREDIT,
    required: 130,
    evaluator: (ctx, required) => {
      const db = getCourseDB()
      // course_code로 과목 조회 후 credit 사용
      const courses = db.getCourses(ctx.courseCodes || [])
      const current = courses
        .filter(c => ctx.grades?.[c.courseCode] !== 'F')
        .reduce((s, c) => s + c.credit, 0)
      return { passed: current >= required, current }
    },
    message: ({ passed, current, required }) =>
      passed
        ? `총 학점 충족 (${current}/${required})`
        : `총 학점 부족 (${current}/${required}, 부족: ${required - current}학점)`
  })
}

// ==================== 전공 RuleGroup ====================

/**
 * 전공 RuleGroup (기본전공 + 심화전공)
 */
function majorRuleGroup() {
  return new RuleGroup({
    id: 'MAJOR',
    logic: LogicType.AND,
    description: '전공 이수 요건',
    children: [
      majorBasicRule(),
      majorAdvancedRule()
    ]
  })
}

/**
 * 기본전공 학점 Rule
 */
function majorBasicRule() {
  return new Rule({
    id: 'MAJOR_BASIC_51',
    type: RuleType.MAJOR_BASIC_CREDIT,
    required: 51,
    evaluator: async (ctx, required) => {
      const masterModel = getFirebaseMasterModel()
      const courses = await masterModel.getByCourseCodes(ctx.courseCodes || [])
      const current = courses
        .filter(c => {
          return c.isBasicMajor() && 
                 ctx.grades?.[c.courseCode] !== 'F'
        })
        .reduce((s, c) => s + c.credit, 0)
      return { passed: current >= required, current }
    },
    message: ({ passed, current, required }) =>
      passed
        ? `기본전공 충족 (${current}/${required})`
        : `기본전공 부족 (${current}/${required}, 부족: ${required - current}학점)`
  })
}

/**
 * 심화전공 학점 Rule
 */
function majorAdvancedRule() {
  return new Rule({
    id: 'MAJOR_ADV_21',
    type: RuleType.MAJOR_ADVANCED_CREDIT,
    required: 21,
    evaluator: async (ctx, required) => {
      const masterModel = getFirebaseMasterModel()
      const courses = await masterModel.getByCourseCodes(ctx.courseCodes || [])
      const current = courses
        .filter(c => {
          return c.isAdvancedMajor() && 
                 ctx.grades?.[c.courseCode] !== 'F'
        })
        .reduce((s, c) => s + c.credit, 0)
      return { passed: current >= required, current }
    },
    message: ({ passed, current, required }) =>
      passed
        ? `심화전공 충족 (${current}/${required})`
        : `심화전공 부족 (${current}/${required}, 부족: ${required - current}학점)`
  })
}

// ==================== 교양 RuleGroup ====================

/**
 * 교양 RuleGroup
 */
function liberalRuleGroup() {
  return new RuleGroup({
    id: 'LIBERAL',
    logic: LogicType.AND,
    description: '교양 이수 요건',
    children: [
      liberalTotalRule(),
      requiredBasicLiberalGroup()
    ]
  })
}

/**
 * 교양 총 학점 Rule
 */
function liberalTotalRule() {
  return new Rule({
    id: 'LIBERAL_TOTAL_33',
    type: RuleType.LIBERAL_TOTAL_CREDIT,
    required: 33,
    evaluator: async (ctx, required) => {
      const masterModel = getFirebaseMasterModel()
      const courses = await masterModel.getByCourseCodes(ctx.courseCodes || [])
      const current = courses
        .filter(c => {
          return c.isLiberal() && 
                 ctx.grades?.[c.courseCode] !== 'F'
        })
        .reduce((s, c) => s + c.credit, 0)
      return { passed: current >= required, current }
    },
    message: ({ passed, current, required }) =>
      passed
        ? `교양 총 학점 충족 (${current}/${required})`
        : `교양 총 학점 부족 (${current}/${required}, 부족: ${required - current}학점)`
  })
}

/**
 * 필수 기초교양 RuleGroup (MVP 최소)
 */
function requiredBasicLiberalGroup() {
  return new RuleGroup({
    id: 'REQUIRED_BASIC_LIBERAL',
    logic: LogicType.AND,
    description: '필수 기초교양',
    children: [
      // TODO: 기초교양 필수 과목 추가
      // requiredCourseRule('BASIC_LIB_001', '기초교양1'),
    ]
  })
}

// ==================== 필수 과목 RuleGroup ====================

/**
 * 필수 과목 RuleGroup (과목 코드 기반)
 * CSV의 is_required 컬럼에서 자동으로 가져옴
 */
function requiredCourseGroup() {
  return new RuleGroup({
    id: 'REQUIRED_COURSES',
    logic: LogicType.AND,
    description: '필수 교과목',
    children: [] // 동적으로 생성됨
  })
}

/**
 * 필수 과목 RuleGroup 동적 생성
 */
export async function createRequiredCourseGroup() {
  const masterModel = getFirebaseMasterModel()
  const requiredCourses = await masterModel.getRequiredCourses()
  
  const children = requiredCourses.map(course => 
    requiredCourseRule(course.courseCode, course.courseName)
  )
  
  return new RuleGroup({
    id: 'REQUIRED_COURSES',
    logic: LogicType.AND,
    description: '필수 교과목',
    children
  })
}

/**
 * 필수 과목 Rule 생성 함수
 * @param {string} courseCode - 과목 코드
 * @param {string} name - 과목명 (표시용, CSV에서 가져옴)
 */
function requiredCourseRule(courseCode, name) {
  return new Rule({
    id: `REQ_${courseCode}`,
    type: RuleType.REQUIRED_COURSE,
    required: courseCode,
    evaluator: (ctx, code) => {
      // course_code 기준으로 체크 (course_code + is_required)
      const passed = (ctx.courseCodes || []).includes(code) && 
                     ctx.grades?.[code] !== 'F'
      return { passed, current: passed ? 1 : 0 }
    },
    message: async ({ passed }) => {
      const masterModel = getFirebaseMasterModel()
      const course = await masterModel.getByCourseCode(courseCode)
      const displayName = course?.courseName || name
      return passed ? `${displayName} 이수 완료` : `${displayName} 미이수`
    }
  })
}

// ==================== 비교과과정 Rule ====================

function extraCurricularRule() {
  return new Rule({
    id: 'EXTRA_CURRICULAR_70',
    type: RuleType.EXTRA_CURRICULAR,
    required: 70,
    evaluator: (ctx, required) => {
      // 편입생인 경우 35 유닛
      const actualRequired = ctx.studentType === '편입생' ? 35 : required
      const current = ctx.extraCurricularUnits || 0
      return { passed: current >= actualRequired, current }
    },
    message: ({ passed, current, required }) => {
      const actualRequired = required === 70 ? (current < 35 ? 35 : 70) : required
      return passed
        ? `비교과과정 충족 (${current}/${actualRequired} 유닛)`
        : `비교과과정 부족 (${current}/${actualRequired} 유닛, 부족: ${actualRequired - current} 유닛)`
    }
  })
}

// ==================== Engine 실행 ====================

/**
 * 졸업 요건 평가 실행
 * @param {Object} context - 검증 컨텍스트
 * @param {Array<string>} context.courseCodes - 사용자가 이수한 과목 코드 목록
 * @param {Object} context.grades - { courseCode: grade } 형태의 성적 맵
 * @param {string} context.curriculumYear - 교육과정 연도
 * @param {string} context.studentType - 입학 구분 (신입생/편입생)
 * @param {number} context.extraCurricularUnits - 비교과과정 유닛 수
 * @returns {Object} 평가 결과 (트리 구조)
 * 
 * 📌 사용자 입력은 course_code만 받는다
 * 👉 모든 기준(과목명, 카테고리, 학점)은 CSV에서 온다
 */
export async function evaluateGraduation(context) {
  // context 검증
  if (!context.courseCodes || !Array.isArray(context.courseCodes)) {
    throw new Error('courseCodes는 필수이며 배열이어야 합니다')
  }
  
  const root = createCSGraduationRuleTree()
  const result = root.evaluate(context)
  
  // 부족 항목 리스트 추출 (평탄화)
  const missingItems = extractMissingItems(result)
  
  return {
    passed: result.passed,
    tree: result,
    missingItems
  }
}

/**
 * 부족 항목 리스트 추출 (트리 구조를 평탄화)
 */
function extractMissingItems(result, items = []) {
  if (result.type) {
    // Rule인 경우
    if (!result.passed) {
      items.push({
        id: result.id,
        type: result.type,
        rule: result.id,
        message: result.message,
        required: result.required,
        current: result.current,
        remaining: result.remaining || 0
      })
    }
  } else {
    // RuleGroup인 경우
    if (result.results) {
      result.results.forEach(child => {
        extractMissingItems(child, items)
      })
    }
  }
  
  return items
}

/**
 * 결과를 평문으로 변환 (디버깅용)
 */
export function formatResult(result, indent = 0) {
  const prefix = '  '.repeat(indent)
  let output = ''
  
  if (result.type) {
    // Rule
    const status = result.passed ? '✅' : '❌'
    output += `${prefix}${status} [${result.type}] ${result.message}\n`
  } else {
    // RuleGroup
    const status = result.passed ? '✅' : '❌'
    output += `${prefix}${status} [GROUP: ${result.id}] ${result.description}\n`
    if (result.results) {
      result.results.forEach(child => {
        output += formatResult(child, indent + 1)
      })
    }
  }
  
  return output
}
