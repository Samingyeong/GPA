/**
 * 간단한 API 테스트 스크립트
 * 
 * 사용법: npm run test:api
 */

const BASE_URL = 'http://localhost:3001'

async function testAPI() {
  console.log('🧪 API 테스트 시작...\n')

  try {
    // 1. Health Check
    console.log('1️⃣ Health Check...')
    const healthRes = await fetch(`${BASE_URL}/health`)
    const health = await healthRes.json()
    console.log('✅', health)
    console.log()

    // 2. 과목 검색
    console.log('2️⃣ 과목 검색 (자료구조)...')
    const searchRes = await fetch(`${BASE_URL}/api/courses/search?q=자료구조`)
    const search = await searchRes.json()
    console.log(`✅ 검색 결과: ${search.count}개`)
    if (search.data.length > 0) {
      console.log('   첫 번째 결과:', search.data[0].course_name)
    }
    console.log()

    // 3. 졸업 요건 체크
    console.log('3️⃣ 졸업 요건 체크...')
    const checkRes = await fetch(`${BASE_URL}/api/graduation/check`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json'
      },
      body: JSON.stringify({
        courseCodes: search.data.length > 0 ? [search.data[0].course_code] : ['SWCE100003'],
        grades: {
          [search.data.length > 0 ? search.data[0].course_code : 'SWCE100003']: 'A+'
        },
        curriculumYear: '2019',
        studentType: '신입생',
        extraCurricularUnits: 70
      })
    })
    const check = await checkRes.json()
    console.log(`✅ 졸업 요건 충족: ${check.data.passed ? '✅' : '❌'}`)
    console.log(`   부족 항목: ${check.data.missingItems.length}개`)
    if (check.data.missingItems.length > 0) {
      check.data.missingItems.slice(0, 3).forEach(item => {
        console.log(`   - ${item.message}`)
      })
    }
    console.log()

    console.log('🎉 모든 테스트 완료!')
    console.log(`📚 Swagger 문서: ${BASE_URL}/api-docs`)

  } catch (error) {
    console.error('❌ 테스트 실패:', error.message)
    console.log('\n💡 백엔드 서버가 실행 중인지 확인하세요:')
    console.log('   cd server && npm run dev')
    process.exit(1)
  }
}

testAPI()

