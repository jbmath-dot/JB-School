# JB School — 학교 업무 자동화 프로젝트

> **현재 버전: 0.1.0 (로컬 데모). 실사용을 위한 공동 인증·보안 서버가 없는 개발 초기 단계입니다.**

학교의 반복 행정 업무를 줄이기 위한 별도 프로젝트입니다. 기존 `jbmath-dot/jb-webapps` 및 `jbmath-dot/math-class-webtools`와 독립적이며, 기존 저장소는 변경하지 않았습니다.

## 구현 상태

| 모듈 | 현재 상태 | 목표 실행 형태 |
|---|---|---|
| 교직원 회신·취합 | **로컬 시연 가능**: 요청 작성, 가상 응답, 미회신 집계, CSV, 완료 보관 | 서버 인증형 |
| 회의·협의회 | 메뉴·범위 안내 | 서버 인증형 |
| 교직원 연수·참석 | 메뉴·범위 안내 | 서버 인증형 |
| 수행평가 채점·피드백 | 메뉴·범위 안내 | 로컬 오프라인형 |
| 학기말 기록 검토 | 메뉴·범위 안내 | 로컬 오프라인형 |
| 공문·제출서류 점검 | 메뉴·범위 안내 | 로컬 오프라인형 |
| 업무 인수인계 | 메뉴·범위 안내 | 서버 인증형 |

**중요:** 현재 가상 회신 데이터는 한 대의 브라우저 `localStorage`에만 저장됩니다. 교직원이 각자 접속해 응답할 수 없으며, 인증·서버 권한 검사·공동 데이터베이스가 없습니다. 학교 승인 전까지 실제 실명·연락처·학생자료·학업성적·비공개 문서를 입력하지 마세요.

## 바로 실행하기

1. 이 프로젝트 폴더 전체를 PC에 저장합니다.
2. `index.html`을 Chrome 또는 Edge로 엽니다.
3. 왼쪽 **교직원 회신·취합** → 샘플 요청 **상세 보기**에서 '40명 중 3명 회신, 37명 미회신'을 확인합니다.
4. '연습 응답 입력'에서 가상 대상을 선택해 답변을 등록하거나 CSV 파일을 내려받습니다.
5. **새 회신 요청**으로 4단계 생성 흐름을 테스트합니다.

`index.html` 파일을 직접 열어도 기본 기능은 인터넷 없이 작동합니다. PWA 서비스 워커 설치는 `file://`이 아닌 로컬 서버(또는 HTTPS)에서만 가능합니다.

### 로컬 서버로 실행 (PWA 테스트)

```bash
cd JB-School
python -m http.server 8000
```

브라우저에서 `http://localhost:8000`을 여세요. 최초 접속 이후 앱 파일이 캐시되면 지원 브라우저에서 오프라인 실행이 가능합니다. 별도 npm 패키지나 외부 CDN은 필요하지 않습니다. `http://localhost`는 로컬 컴퓨터에서의 접속이며 학교 내 다른 PC의 공동 서비스가 아닙니다.

### 테스트

```bash
node --test tests/*.test.cjs
```

브라우저 화면 구성과 사용자 이벤트 시나리오도 정적 HTML, CSS, JS를 주입한 Chromium에서 확인했습니다. 보안 정책 때문에 테스트 컨테이너에서 직접 `http://localhost`와 `file://`로 접근하는 end-to-end 테스트는 제한되어 있었으며, 실제 Windows PC의 직접 실행·설치 검증은 남아 있습니다.

## 프로젝트 구조

```
JB-School/
├─ index.html                   # 앱 진입점
├─ manifest.webmanifest         # 설치 메타데이터
├─ sw.js                        # 정적 자산 오프라인 캐시
├─ src/
│  ├─ app.js                    # 공통 메뉴 및 로컬 회신 MVP
│  ├─ core.js                   # 회신 도메인 로직 / CSV / 검증
│  └─ styles.css                # PC 우선 반응형 디자인
├─ assets/icon.svg
├─ tests/core.test.cjs
├─ docs/
│  ├─ ARCHITECTURE.md           # 서비스 전환 아키텍처
│  ├─ SECURITY.md               # 보안/개인정보·운영 원칙
│  ├─ ROADMAP.md                # 개발 백로그·인수 기준
│  └─ GITHUB_SETUP.md           # 새 GitHub 저장소 등록 지침
└─ design/                      # 이전 7개 앱 상세 설계 패키지
```

## 추천 GitHub 저장소

현재 저장소: [`jbmath-dot/JB-School`](https://github.com/jbmath-dot/JB-School) (공개 저장소). 샘플 자료만 업로드하고, 실제 개인정보와 비공개 문서는 입력하거나 커밋하지 마세요.

## 배포

GitHub Pages 배포 workflow를 포함했습니다. Settings → Pages → Build and deployment → Source에서 `GitHub Actions`를 선택하고 Actions 실행 결과를 확인하세요. 배포가 확인된 후에만 `https://jbmath-dot.github.io/JB-School/`을 이용하세요.

## 사용권한

독립 개발용 사설 프로젝트 초안. 외부 배포용 라이선스는 아직 정하지 않았습니다. 샘플 데이터는 모두 가상입니다.
