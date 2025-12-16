// 한밭대학교 학점 체계 (4.5 만점 기준)
export const gradePoints = {
  'A+': 4.5,
  'A': 4.0,
  'B+': 3.5,
  'B': 3.0,
  'C+': 2.5,
  'C': 2.0,
  'D+': 1.5,
  'D': 1.0,
  'F': 0.0
}

export const gradeLabels = {
  'A+': '최우수',
  'A': '우수',
  'B+': '양호',
  'B': '보통',
  'C+': '미흡',
  'C': '미흡',
  'D+': '낙제',
  'D': '낙제',
  'F': '낙제'
}

/**
 * GPA 계산 함수
 * @param {Array} courses - 과목 배열 [{name, credit, grade}, ...]
 * @returns {Object} {gpa: number, totalCredits: number}
 */
export function calculateGPA(courses) {
  if (!courses || courses.length === 0) {
    return { gpa: 0, totalCredits: 0 }
  }

  let totalPoints = 0
  let totalCredits = 0

  courses.forEach(course => {
    const credit = Number(course.credit) || 0
    const grade = course.grade || 'F'
    const points = gradePoints[grade] || 0

    if (credit > 0) {
      totalPoints += points * credit
      totalCredits += credit
    }
  })

  const gpa = totalCredits > 0 ? totalPoints / totalCredits : 0

  return {
    gpa: gpa,
    totalCredits: totalCredits
  }
}

/**
 * 학점 등급 변환 함수
 * @param {number} gpa - GPA 점수
 * @returns {string} 등급
 */
export function getGradeFromGPA(gpa) {
  if (gpa >= 4.5) return 'A+'
  if (gpa >= 4.0) return 'A'
  if (gpa >= 3.5) return 'B+'
  if (gpa >= 3.0) return 'B'
  if (gpa >= 2.5) return 'C+'
  if (gpa >= 2.0) return 'C'
  if (gpa >= 1.5) return 'D+'
  if (gpa >= 1.0) return 'D'
  return 'F'
}


