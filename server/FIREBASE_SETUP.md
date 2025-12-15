# Firebase 설정 가이드

## 1. Firebase 프로젝트 생성

1. [Firebase Console](https://console.firebase.google.com/)에 접속
2. "프로젝트 추가" 클릭
3. 프로젝트 이름 입력 (예: `hanbat-gpa-calculator`)
4. Google Analytics 설정 (선택사항)

## 2. Firestore 데이터베이스 생성

1. Firebase Console에서 "Firestore Database" 메뉴 선택
2. "데이터베이스 만들기" 클릭
3. **프로덕션 모드** 선택 (보안 규칙은 나중에 설정)
4. 위치 선택 (예: `asia-northeast3` - 서울)

## 3. Service Account 키 생성

1. Firebase Console → 프로젝트 설정 (톱니바퀴 아이콘)
2. "서비스 계정" 탭 선택
3. "새 비공개 키 생성" 클릭
4. JSON 파일 다운로드
5. 다운로드한 파일을 `server/serviceAccount.json`으로 저장

⚠️ **중요**: `serviceAccount.json`은 절대 Git에 커밋하지 마세요!

## 4. 환경 변수 설정 (선택사항)

`serviceAccount.json` 파일 대신 환경 변수를 사용할 수도 있습니다:

```bash
# server/.env 파일 생성
FIREBASE_SERVICE_ACCOUNT_PATH=./serviceAccount.json
# 또는
FIREBASE_PROJECT_ID=your-project-id
FIREBASE_PRIVATE_KEY="-----BEGIN PRIVATE KEY-----\n...\n-----END PRIVATE KEY-----\n"
FIREBASE_CLIENT_EMAIL=firebase-adminsdk-xxxxx@your-project-id.iam.gserviceaccount.com
# ... 기타 필수 필드
```

## 5. 데이터 마이그레이션

CSV 데이터를 Firestore로 마이그레이션:

```bash
cd server
npm run migrate:firebase
```

이 명령은 다음 작업을 수행합니다:
- `data/courses_master.csv` → `courses_master` 컬렉션
- `data/course_offerings.csv` → `course_offerings` 컬렉션

## 6. Firestore 보안 규칙 설정

Firebase Console → Firestore Database → 규칙 탭:

```javascript
rules_version = '2';
service cloud.firestore {
  match /databases/{database}/documents {
    // 마스터 데이터는 읽기 전용
    match /courses_master/{document} {
      allow read: if true;
      allow write: if false; // 서버에서만 쓰기
    }
    
    // 개설 정보는 읽기 전용
    match /course_offerings/{document} {
      allow read: if true;
      allow write: if false; // 서버에서만 쓰기
    }
  }
}
```

## 7. 인덱스 생성 (선택사항)

검색 성능 향상을 위해 인덱스를 생성할 수 있습니다:

1. Firebase Console → Firestore Database → 인덱스 탭
2. 다음 인덱스 생성:
   - 컬렉션: `course_offerings`
   - 필드: `year` (오름차순), `semester` (오름차순)

## 8. 서버 실행

```bash
cd server
npm run dev
```

## 문제 해결

### "Firebase 설정을 찾을 수 없습니다" 오류

- `server/serviceAccount.json` 파일이 존재하는지 확인
- 파일 경로가 올바른지 확인
- 환경 변수가 올바르게 설정되었는지 확인

### "Permission denied" 오류

- Service Account에 Firestore 읽기/쓰기 권한이 있는지 확인
- Firestore 보안 규칙이 올바르게 설정되었는지 확인

### 데이터가 로드되지 않음

- `npm run migrate:firebase` 명령이 성공적으로 완료되었는지 확인
- Firebase Console에서 컬렉션이 생성되었는지 확인
- 서버 로그에서 Firebase 초기화 메시지 확인

