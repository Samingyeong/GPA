# ⚡ 빠른 시작 가이드

## 🚀 실행 방법 (2단계)

### 1️⃣ 백엔드 서버 실행

**터미널 1** (PowerShell 또는 CMD):
```powershell
cd E:\GPA\server
npm run dev
```

**성공 시 출력**:
```
📚 과목 DB 초기화 완료
🚀 Server running on http://localhost:3001
📚 API Documentation: http://localhost:3001/api-docs
```

### 2️⃣ 프론트엔드 실행

**터미널 2** (새 터미널):
```powershell
cd E:\GPA
npm run dev
```

**성공 시 출력**:
```
  VITE v5.0.8  ready in xxx ms

  ➜  Local:   http://localhost:3000/
```

브라우저가 자동으로 열립니다!

## 🧪 테스트 방법

### 방법 1: 브라우저에서 직접 테스트

1. **Swagger API 문서** (백엔드):
   - http://localhost:3001/api-docs
   - 여기서 API를 직접 테스트할 수 있습니다

2. **프론트엔드** (UI):
   - http://localhost:3000
   - 과목 추가 → 검색 → 선택 → 계산

### 방법 2: curl로 테스트 (PowerShell)

```powershell
# Health Check
curl http://localhost:3001/health

# 과목 검색
curl "http://localhost:3001/api/courses/search?q=자료구조"

# 졸업 요건 체크
curl -X POST http://localhost:3001/api/graduation/check `
  -H "Content-Type: application/json" `
  -d '{\"courseCodes\":[\"SWCE100003\"],\"grades\":{\"SWCE100003\":\"A+\"}}'
```

### 방법 3: VS Code REST Client 사용

1. VS Code에서 `server/test-api.http` 파일 열기
2. REST Client 확장 프로그램 설치 (없는 경우)
3. 각 요청 위의 "Send Request" 클릭

## 📋 체크리스트

### ✅ 백엔드 확인
- [ ] 서버가 http://localhost:3001 에서 실행 중
- [ ] Swagger 문서 접속 가능
- [ ] Health check 응답 확인
- [ ] 과목 검색 API 동작 확인

### ✅ 프론트엔드 확인
- [ ] 서버가 http://localhost:3000 에서 실행 중
- [ ] 브라우저에서 UI 표시 확인
- [ ] 과목 추가 기능 동작 확인

## 🔧 문제 해결

### 포트가 이미 사용 중인 경우

**백엔드 포트 변경**:
```powershell
# server/.env 파일 생성
PORT=3002
```

**프론트엔드 포트 변경**:
```javascript
// vite.config.js
server: {
  port: 3001  // 원하는 포트로 변경
}
```

### 과목 데이터가 없는 경우

```powershell
# 루트 디렉토리에서
npm run parse-excel
```

### 의존성 오류

```powershell
# 백엔드
cd server
rm -r node_modules
npm install

# 프론트엔드
cd ..
rm -r node_modules
npm install
```

## 🎯 다음 단계

1. ✅ 서버 실행 확인
2. ✅ API 테스트
3. 🔄 프론트엔드와 백엔드 연동
4. 🔄 검색 UI 구현
5. 🔄 결과 표시 개선


