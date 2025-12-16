// 컴퓨터공학과 졸업사정 심사기준 (2023.10.20 기준)

/**
 * 교육과정별 졸업 요건
 */
export const graduationRequirements = {
  // 2018학년도 교육과정 적용자 (컴퓨터공학과)
  '2018': {
    totalCredits: 130,
    generalEducation: {
      minCredits: 33, // 25%
      required: ['기초교양', '인성함양 3개 이상', '역량강화 2개 이상']
    },
    majorEducation: {
      minCredits: 78, // 60%
      required: ['진로설계1', '진로설계2']
    },
    extraCurricular: {
      minUnits: 70, // 신입생
      minUnitsTransfer: 35 // 편입생
    }
  },
  // 2019학년도 이후 교육과정 적용자
  '2019': {
    totalCredits: 130,
    generalEducation: {
      minCredits: 33, // 25%
      required: ['기초교양', '인성함양 3개 이상', '역량강화 2개 이상']
    },
    majorEducation: {
      minCredits: 78, // 60%
      required: ['진로설계1', '진로설계2']
    },
    extraCurricular: {
      minUnits: 70, // 신입생
      minUnitsTransfer: 35 // 편입생
    }
  }
}

/**
 * 이수구분별 카테고리 매핑
 */
export const categoryMapping = {
  // 교양
  '교필': 'general',
  '교선': 'general',
  '기타': 'general',
  
  // 전공
  '전필': 'major',
  '전선': 'major',
  '일선': 'major',
  '특필': 'major',
  '특선': 'major',
  '심필': 'major',
  '심선': 'major',
  '융필': 'major',
  '융선': 'major',
  '연선': 'major',
  '산선': 'major',
  
  // 기타
  '교직': 'other'
}

/**
 * 졸업 요건 체크 함수
 * @param {Array} courses - 과목 배열 [{name, credit, grade, category}, ...]
 * @param {string} curriculumYear - 교육과정 연도 ('2018', '2019')
 * @param {string} studentType - 학생 유형 ('신입생', '편입생')
 * @returns {Object} 졸업 요건 체크 결과
 */
export function checkGraduationRequirements(courses, curriculumYear = '2019', studentType = '신입생') {
  const requirements = graduationRequirements[curriculumYear] || graduationRequirements['2019']
  
  // 총 학점 계산
  const totalCredits = courses.reduce((sum, course) => {
    const credit = Number(course.credit) || 0
    const grade = course.grade || 'F'
    // F는 학점에 포함하지 않음
    if (grade !== 'F' && credit > 0) {
      return sum + credit
    }
    return sum
  }, 0)
  
  // 교양/전공 학점 분류
  let generalCredits = 0
  let majorCredits = 0
  let otherCredits = 0
  
  const generalCourses = []
  const majorCourses = []
  
  courses.forEach(course => {
    const credit = Number(course.credit) || 0
    const grade = course.grade || 'F'
    const category = course.category || '기타'
    
    if (grade === 'F' || credit <= 0) return
    
    const mappedCategory = categoryMapping[category] || 'other'
    
    if (mappedCategory === 'general') {
      generalCredits += credit
      generalCourses.push(course)
    } else if (mappedCategory === 'major') {
      majorCredits += credit
      majorCourses.push(course)
    } else {
      otherCredits += credit
    }
  })
  
  // 졸업 요건 체크
  const checks = {
    totalCredits: {
      required: requirements.totalCredits,
      current: totalCredits,
      satisfied: totalCredits >= requirements.totalCredits,
      remaining: Math.max(0, requirements.totalCredits - totalCredits)
    },
    generalEducation: {
      required: requirements.generalEducation.minCredits,
      current: generalCredits,
      satisfied: generalCredits >= requirements.generalEducation.minCredits,
      remaining: Math.max(0, requirements.generalEducation.minCredits - generalCredits)
    },
    majorEducation: {
      required: requirements.majorEducation.minCredits,
      current: majorCredits,
      satisfied: majorCredits >= requirements.majorEducation.minCredits,
      remaining: Math.max(0, requirements.majorEducation.minCredits - majorCredits)
    }
  }
  
  // 전체 만족 여부
  const allSatisfied = checks.totalCredits.satisfied && 
                       checks.generalEducation.satisfied && 
                       checks.majorEducation.satisfied
  
  return {
    ...checks,
    allSatisfied,
    generalCourses,
    majorCourses,
    totalCourses: courses.length,
    summary: {
      totalCredits,
      generalCredits,
      majorCredits,
      otherCredits
    }
  }
}

/**
 * 이수구분별 학점 집계
 * @param {Array} courses - 과목 배열
 * @returns {Object} 이수구분별 학점 통계
 */
export function getCreditsByCategory(courses) {
  const stats = {}
  
  courses.forEach(course => {
    const credit = Number(course.credit) || 0
    const grade = course.grade || 'F'
    const category = course.category || '기타'
    
    if (grade === 'F' || credit <= 0) return
    
    if (!stats[category]) {
      stats[category] = {
        credits: 0,
        courses: []
      }
    }
    
    stats[category].credits += credit
    stats[category].courses.push(course)
  })
  
  return stats
}



