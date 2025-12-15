# 한밭대학교 GPA 계산기 API 서버

## 개요

졸업 요건 체크 및 GPA 계산을 위한 백엔드 API 서버입니다.

## 핵심 설계 원칙

### 🔍 검색 UX vs ⚙️ Rule Engine

**분리된 구조**:
- **검색 UX**: 사용자 친화적 (과목명, 학과, 교수명으로 검색)
- **Rule Engine**: 기계 친화적 (course_code만 사용)

```
[CSV: 과목 기준 데이터]
        ↓
   (DB / 메모리 로드)
        ↓
[과목 검색 API] 🔍
        ↓
[사용자 검색 & 선택 UI]
        ↓
[선택된 과목 코드만 Rule Engine 전달] ⚙️
```

### 📌 핵심 원칙

1. **사용자는 검색으로 선택** (에타 시간표 스타일)
2. **내부는 course_code로 동작**
3. **Rule Engine은 끝까지 course_code만 본다**

## 주요 기능

- **과목 검색 API** (에타 시간표 스타일)
- **Rule Engine 기반 졸업 요건 검증**
- **부족 항목 리스트 자동 생성**
- **Swagger API 문서화**

## 시스템 흐름

```
CSV (전체 과목 기준)
   ↓
DB seed / 메모리 로드
   ↓
사용자가 이수 과목 선택 (course_code)
   ↓
Rule Engine (course_code 기준 매칭)
   ↓
졸업 판정
```

## 설치 및 실행

```bash
# 의존성 설치
npm install

# 개발 서버 실행
npm run dev

# 프로덕션 실행
npm start
```

## API 엔드포인트

### 🔍 과목 검색 (UX)

```bash
GET /api/courses/search?q=자료구조&department=컴퓨터공학과
```

**응답 예시**:
```json
{
  "success": true,
  "data": [
    {
      "course_code": "CS204",
      "course_name": "자료구조",
      "department": "컴퓨터공학과",
      "professor": "홍길동",
      "credit": 3,
      "type": "MAJOR",
      "category": "전필",
      "stage": "BASIC"
    }
  ],
  "count": 1
}
```

### ⚙️ 졸업 요건 체크

```bash
POST /api/graduation/check
Content-Type: application/json

{
  "courseCodes": ["CS204", "CS301", "GUID1001"],
  "grades": {
    "CS204": "A+",
    "CS301": "B",
    "GUID1001": "A"
  },
  "curriculumYear": "2019",
  "studentType": "신입생",
  "extraCurricularUnits": 70
}
```

**응답 예시**:
```json
{
  "success": true,
  "data": {
    "passed": false,
    "tree": { ... },
    "missingItems": [
      {
        "id": "MAJOR_ADV_21",
        "type": "MAJOR_ADVANCED_CREDIT",
        "message": "심화전공 부족 (15/21, 부족: 6학점)"
      }
    ]
  }
}
```

### API 문서

서버 실행 후 다음 URL에서 Swagger 문서 확인:
- http://localhost:3001/api-docs

## CSV 스키마

### 🔍 검색용 컬럼 (UX)
- `course_code`: 과목 코드
- `course_name`: 과목명
- `department`: 개설학과
- `professor`: 담당교수
- `credit`: 학점

### ⚙️ Rule Engine용 컬럼 (내부 기준)
- `type`: 이수구분 (MAJOR, LIBERAL)
- `category`: 세부 카테고리 (전필, 전선, 교필, 교선 등)
- `stage`: 전공 단계 (BASIC, ADVANCED)
- `is_required`: 필수 과목 여부
- `area`: 핵심교양 영역

## Rule Engine 구조

### 트리 구조

```
ROOT (AND)
├── 총 학점 (130)
├── 교양 (AND)
│   ├── 교양 총 학점 (33)
│   └── 필수 기초교양
├── 전공 (AND)
│   ├── 기본전공 (51)
│   └── 심화전공 (21)
├── 필수 과목 (AND) - CSV의 is_required에서 자동 생성
└── 비교과과정 (70)
```

### Rule별 CSV 컬럼 사용

| Rule | 사용하는 CSV 컬럼 |
|------|------------------|
| 총 학점 ≥ 130 | `credit` |
| 전공 BASIC ≥ 51 | `type` + `stage` + `credit` |
| 전공 ADV ≥ 21 | `type` + `stage` + `credit` |
| 교양 ≥ 33 | `type` + `credit` |
| 필수 과목 | `course_code` + `is_required` |
| 핵심교양 영역 | `area` |

## 프로젝트 구조

```
server/
├── src/
│   ├── server.js              # Express 서버
│   ├── routes/
│   │   ├── graduation.js     # 졸업 요건 API
│   │   └── courses.js        # 과목 검색 API
│   ├── services/
│   │   └── ruleEngine.js     # Rule Engine
│   ├── models/
│   │   └── courseSchema.js   # 과목 데이터 모델
│   ├── database/
│   │   └── seed.js          # CSV 로드
│   └── swagger/
│       └── swagger.yaml      # API 명세서
├── package.json
└── README.md
```

## 환경 변수

`.env` 파일 생성:

```env
PORT=3001
NODE_ENV=development
LOG_LEVEL=info
DATABASE_URL=
CORS_ORIGIN=http://localhost:3000
```

## 📝 로깅 시스템

Winston과 Morgan을 사용한 구조화된 로깅 시스템이 구현되어 있습니다.

### 로그 파일 위치
- `server/logs/error.log`: 에러 로그만 저장
- `server/logs/combined.log`: 모든 로그 저장
- `server/logs/exceptions.log`: 처리되지 않은 예외
- `server/logs/rejections.log`: 처리되지 않은 Promise 거부

### 로그 레벨
환경 변수 `LOG_LEVEL`로 설정 가능 (기본값: `info`)
- `error`: 에러만
- `warn`: 경고 이상
- `info`: 정보 이상 (기본값)
- `debug`: 디버그 이상
- `verbose`: 모든 로그

### 사용 예시
```javascript
import { log } from './utils/logger.js'

log.info('정보 메시지')
log.error('에러 메시지', { error: error.message, stack: error.stack })
log.warn('경고 메시지')
log.debug('디버그 메시지')
```

### HTTP 요청 로깅
모든 HTTP 요청은 자동으로 로깅됩니다 (Morgan 사용).
- 개발 환경: 간단한 포맷
- 프로덕션 환경: Apache combined 포맷

## MVP 구현 범위

### ✅ MVP
- 과목명 검색
- 학과 필터
- 과목 추가 / 제거
- 선택한 과목 리스트

### 🔮 Phase 2
- 교수명 필터
- 학점 필터
- 시간표 충돌 체크
- 학기별 이수 관리
