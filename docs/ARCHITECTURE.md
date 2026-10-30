# JB School 기술 아키텍처 · 0.1.0

## 1. 전략

- **공통 Shell**: PC 중심 좌측 탐색, 홈 대시보드, 마감 확인, 완료 보관, 명시적 저장 상태.
- **온라인 협업형**: 회신·취합, 회의, 연수, 업무 인수인계. 별도의 기관 승인 인증과 권한 검사, 서버 데이터베이스가 필수.
- **오프라인 격리형**: 수행평가 채점, 학기말 기록, 공문·서류 점검. 개인정보·성적·초안은 중앙 서버에 보내지 않는 것이 기본.
- **기존 웹앱과 분리**: JB WebApps에는 추후 링크만 연결할 수 있게 설계. 기존 앱 기능·저장소는 변경하지 않음.

## 2. 현재 실행 구조

```
브라우저 (Chrome/Edge)
    │
    ├─ index.html + style.css + app.js (공통 UI)
    ├─ core.js (검증, 중복 회신 수정, 집계, CSV)
    ├─ localStorage (가상 시연 데이터 전용 / 비암호화)
    └─ service worker (정적 앱 파일만 오프라인 캐시)
```

현재 브라우저별 데이터는 서로 동기화되지 않습니다. `로컬 연습 응답`은 실제 회신 기록이 아닙니다. URL만 공유해도 동일 집계 화면은 보이지 않습니다.

## 3. 운영형 전환 (설계, 미구현)

```
사내 승인 로그인 / 기관 SSO (확인 필요)
    ↓
서버 측 세션 + CSRF 보호 + tenant ID
    ↓
API / 인가 계층 (업무 소유자·응답자·열람자 분리)
    ↓
PostgreSQL / 감사 기록 (보관 정책)
    ↓
승인된 이메일·메신저 커넥터 (발송 상태 확인)
```

기관의 계정 정책과 운영 허가가 확인되기 전 Firebase나 Apps Script 등을 실운영 데이터 저장소로 결정하지 않습니다. 기술 선택 시 고려할 점:

- `campaigns` (id, org_id, owner_id, title, status, opens_at, due_at, revision)
- `questions` (id, campaign_id, kind, required, options_json, sort_order)
- `targets` (id, campaign_id, user_id, delivery_status)
- `submissions` (id, campaign_id, respondent_id, submitted_at, revision)
- `answers` (id, submission_id, question_id, value_json)
- `reminders` (id, target_id, channel, delivery_result, attempted_at)
- `audit_events` (actor, action, target, timestamp, outcome, safe_summary)
- 모든 조회·쓰기 시 `org_id`, `owner_id`, `respondent_id`를 서버에서 검사. 화면 필터만으로 권한 제어 금지.
- 개인별 제출은 `(campaign_id, respondent_id)` 유효 고유 제약과 버전/수정 이력 적용.
- 별도 익명 투표는 본문과 응답자 추적을 분리하되 재식별 위험을 검토. 실명 미회신 추적과 완전 익명 설문을 동시에 제공하지 않음.

## 4. 공통 UI/데이터 계약

- UI 상태: `draft | open | closed | archived`.
- 실제 전송/확인 상태는 별도 필드: `not_sent | sent | failed | unknown`. **복사 버튼은 전송 성공이 아니다.**
- 조사가 완료되면 기본 목록에서 숨기고 **완료 보관함**에서 복원.
- 오류는 `확인 필요`, `확인 불가`, `실패`, `완료`로 구분.
- CSV 내보내기는 BOM 포함 UTF-8, 수식 시작 문자는 Excel 안전 문자로 취급.
- 모든 화면에서 Enter/Tab 및 키보드 포커스를 사용할 수 있어야 하며 최소 입력 글자 16px.
- 실제 학생 성적과 학생부 초안은 온라인 공유 스키마에 두지 않음.

## 5. 상호 모듈 의존성

1. 회신 엔진 → 회의 참석 응답/안건 수합 재사용.
2. 회신 엔진 → 연수 신청/희망 조사/만족도 조사 재사용.
3. 회의 후속 조치 → 통합 업무 목록과 연결.
4. 인수인계 → 미완료 업무 목록과 연간 일정 연결.
5. 공문 점검 → 품의꾸러미와 **파일 내보내기 기반** 연계; 사용자 승인 없는 자동 제출 금지.
6. 채점·기록 도구 → 오프라인 앱으로 분리 유지. 데이터가 통합 홈의 온라인 저장소에 유출되지 않도록 함.

## 6. 배포

- 현재 배포 없음, 프로젝트 ZIP에서 직접 실행 가능.
- 보안 검증 전에는 기관 외부에 실제 업무 설문을 배포하지 않음.
- 정적 시연 버전을 GitHub Pages에 공개하더라도 실제 데이터를 입력하도록 안내하지 말 것.
