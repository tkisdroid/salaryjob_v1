# External Keys Provisioning Guide

> 외부 API 키 발급 가이드. 스크린샷 없음 — UI가 변경되어도 유효하도록 텍스트 체크리스트로만 작성.

## Google Gemini API (사업자등록증 OCR)

**환경 변수:** `GOOGLE_GEMINI_API_KEY`
**소요 시간:** 약 3분
**참고:** https://ai.google.dev/docs

### 발급 절차

- [ ] 1. Google AI Studio (https://aistudio.google.com/) 접속 및 로그인
- [ ] 2. "Get API key" 클릭
- [ ] 3. "Create API key in new project" 선택하여 새 키 발급
- [ ] 4. 발급된 키를 복사하여 `.env.local` 파일에 다음과 같이 추가:
      `GOOGLE_GEMINI_API_KEY=AIzaSy...`

> 키 없이 실행하면 `src/lib/ocr/gemini.ts` 가 graceful fail(skip)을 반환하고
> `regNumberOcrMismatched` 는 기본값 `false` 유지. OCR 없이도 이미지 저장은 정상 동작합니다.

## 공공데이터포털 - 국세청 사업자등록정보 상태조회 API

**환경 변수:** `DATA_GO_KR_API_KEY`
**소요 시간:** 약 5분
**참고:** https://www.data.go.kr/data/15081808/openapi.do

### 발급 절차

- [ ] 1. 공공데이터포털(https://www.data.go.kr/) 회원가입 및 로그인
- [ ] 2. "국세청_사업자등록정보 진위확인 및 상태조회 서비스" 검색
- [ ] 3. "활용신청" 버튼 클릭 (신청 즉시 승인됨)
- [ ] 4. 마이페이지 -> 신청한 활용 데이터 상세 페이지로 이동
- [ ] 5. "일반 인증키(Encoding)" 또는 "일반 인증키(Decoding)" 발급 확인
- [ ] 6. 발급된 키를 복사하여 `.env.local` 파일에 다음과 같이 추가:
      `DATA_GO_KR_API_KEY=원하는인증키값입력`
      (보통 URL 인코딩 이슈가 있으므로 Decoding 키를 넣는 것을 추천합니다)

### 전체 테스트 절차
- [ ] 1. `.env.local` 파일에 2가지 키 모두 설정
- [ ] 2. Next.js 개발 서버 재시작 (`npm run dev`)
- [ ] 3. `/biz/verify` 에서 사업자등록증 이미지 업로드 
- [ ] 4. Gemini OCR이 번호를 추출하고, 해당 번호를 공공데이터 API에 전달하여
      '운영중(01)' 상태인 경우 자동 인증완료(`verified=true`) 처리됨을 확인
