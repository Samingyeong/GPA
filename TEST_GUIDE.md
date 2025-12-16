# 🚀 실행 및 테스트 가이드

## 빠른 시작

### 1단계: 백엔드 서버 실행

```bash
# server 디렉토리로 이동
cd server

# 개발 서버 실행
npm run dev
```

**성공 시 출력**:
```
📚 과목 DB 초기화 완료
🚀 Server running on http://localhost:3001
📚 API Documentation: http://localhost:3001/api-docs
```

### 2단계: 프론트엔드 실행 (새 터미널)

```bash
# 루트 디렉토리로 이동
cd ..

# 개발 서버 실행
npm run dev
```

**성공 시 출력**:
```
  VITE v5.0.8  ready in xxx ms

  ➜  Local:   http://localhost:3000/
  ➜  Network: use --host to expose
```

## 📋 테스트 체크리스트

### ✅ 백엔드 테스트

#### 1. Health Check
```bash
curl http://localhost:3001/health
```

**예상 응답**:
```json
{
  "status": "ok",
  "timestamp": "2024-..."
}
```

#### 2. 과목 검색 API
```bash
curl "http://localhost:3001/api/courses/search?q=자료구조"
```

**예상 응답**:
```json
{
  "success": true,
  "data": [
    {
      "course_code": "...",
      "course_name": "자료구조",
      "department": "...",
      "credit": 3,
      ...
    }
  ],
  "count": 1
}
```

#### 3. 졸업 요건 체크 API
```bash
curl -X POST http://localhost:3001/api/graduation/check \
  -H "Content-Type: application/json" \
  -d "{\"courseCodes\":[\"SWCE100003\"],\"grades\":{\"SWCE100003\":\"A+\"}}"
```

**예상 응답**:
```json
{
  "success": true,
  "data": {
    "passed": false,
    "tree": { ... },
    "missingItems": [ ... ]
  }
}
```

#### 4. Swagger 문서 확인
브라우저에서 열기:
- http://localhost:3001/api-docs

### ✅ 프론트엔드 테스트

1. 브라우저에서 http://localhost:3000 접속
2. 과목 추가 버튼 클릭
3. 과목명 입력하여 검색
4. 과목 선택
5. 성적 입력
6. "학점 계산하기" 클릭
7. 결과 확인

## 🔧 문제 해결

### 백엔드 서버가 시작되지 않는 경우

1. **포트 충돌**:
   ```bash
   # .env 파일 생성 (server/.env)
   PORT=3001
   ```

2. **과목 데이터 없음**:
   ```bash
   # Excel 데이터 파싱
   npm run parse-excel
   ```

3. **의존성 오류**:
   ```bash
   cd server
   rm -rf node_modules package-lock.json
   npm install
   ```

### 프론트엔드가 API를 호출하지 못하는 경우

1. **CORS 오류**: 백엔드 서버가 실행 중인지 확인
2. **API URL 확인**: 프론트엔드에서 `http://localhost:3001`로 요청하는지 확인

## 📝 테스트 시나리오

### 시나리오 1: 기본 검색 및 체크

1. 과목 검색: "프로그래밍"
2. 여러 과목 선택
3. 성적 입력
4. 졸업 요건 체크

### 시나리오 2: 부족 항목 확인

1. 적은 수의 과목만 입력
2. 졸업 요건 체크
3. 부족 항목 리스트 확인

### 시나리오 3: 필수 과목 체크

1. 필수 과목 미포함 상태로 체크
2. 필수 과목 포함 후 재체크
3. 결과 비교

## 🎯 다음 단계

테스트 완료 후:
1. 프론트엔드와 백엔드 연동
2. 검색 UI 구현
3. 결과 표시 UI 개선



