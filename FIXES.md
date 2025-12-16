# 🔧 수정 사항

## 해결된 문제

### 1. Swagger YAML 파싱 오류
**문제**: `description: 과목별 성적 맵 { courseCode: grade }`에서 중괄호가 YAML 파서 오류 발생

**해결**: 따옴표로 감싸서 수정
```yaml
description: "과목별 성적 맵 (courseCode: grade 형태)"
```

### 2. 포트 충돌 (EADDRINUSE)
**문제**: 포트 3001이 이미 사용 중

**해결**: 
- 기존 프로세스 종료: `taskkill /F /PID [PID]`
- 서버 재시작

**대안**: 다른 포트 사용
```env
# server/.env
PORT=3002
```

## 실행 확인

서버가 정상 실행되면:
- ✅ http://localhost:3001/health 접속 가능
- ✅ http://localhost:3001/api-docs 접속 가능

## 다음 단계

1. 백엔드 서버 확인: http://localhost:3001/health
2. Swagger 문서 확인: http://localhost:3001/api-docs
3. 프론트엔드 실행: `npm run dev` (새 터미널)



