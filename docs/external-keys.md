# External Keys Provisioning Guide

> 외부 API 키 발급 가이드. 스크린샷 없음 — NCP 콘솔 UI가 변경되어도 유효하도록 텍스트 체크리스트로만 작성.

## CLOVA OCR (사업자등록증 번호 추출)

**환경 변수:** `CLOVA_OCR_SECRET`, `CLOVA_OCR_API_URL`
**소요 시간:** 약 5분
**참고:** https://guide.ncloud-docs.com/docs/en/clovaocr-overview

### 발급 절차

- [ ] 1. NCP 콘솔(https://console.ncloud.com) 가입 또는 로그인
- [ ] 2. AI Services → CLOVA OCR → 도메인 목록 → 도메인 생성
      - 도메인 유형: **General** (특화 모델 불필요)
      - 이름: 임의 (예: `gignow-biz-reg`)
- [ ] 3. 생성된 도메인 클릭 → **API Gateway 연동** 탭 → Invoke URL 복사
      → `.env.local`에 `CLOVA_OCR_API_URL=<복사한 Invoke URL>` 입력
- [ ] 4. 동일 탭에서 **X-OCR-SECRET** 값 복사
      → `.env.local`에 `CLOVA_OCR_SECRET=<복사한 Secret>` 입력
- [ ] 5. Next.js 개발 서버 재시작 (`npm run dev`)
- [ ] 6. `/biz/verify` 에서 사업자등록증 이미지 업로드 → 콘솔 로그에서
      `CLOVA OCR` 응답 확인 (에러 없이 regNumber 추출되면 성공)

> 키 없이 실행하면 `src/lib/ocr/clova.ts` 가 graceful fail(skip)을 반환하고
> `regNumberOcrMismatched` 는 기본값 `false` 유지. OCR 없이도 이미지 저장은 정상 동작.
