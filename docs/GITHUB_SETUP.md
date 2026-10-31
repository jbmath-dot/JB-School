# 별도 GitHub 저장소 생성 및 첫 push

**현재 원격 저장소 생성·업로드는 아직 진행되지 않았습니다.** 기존 `jbmath-dot/jb-webapps` 및 `jbmath-dot/math-class-webtools`는 변경하지 않았습니다.

## 1. 새 저장소 생성

1. GitHub에 로그인한 후 <https://github.com/new>에 접속합니다.
2. 소유자 `jbmath-dot`, 이름 `jb-school`을 선택합니다.
3. **Private**로 설정하는 것을 우선 권장합니다.
4. README·.gitignore·라이선스를 자동 생성하지 않고 빈 저장소로 생성합니다.

## 2. GitHub Desktop으로 업로드

1. 내려받은 `JB-School` ZIP 압축을 완전히 풉니다.
2. GitHub Desktop → `File` → `Add local repository`에서 이 폴더를 지정합니다. Git 저장소가 아니라는 안내가 나오면 `Create a repository`를 선택합니다.
3. 이름 `jb-school`, 로컬 경로가 이 프로젝트 폴더인지 확인합니다.
4. 변경 파일을 확인한 후 `Commit to main`으로 최초 커밋을 만들고 `Publish repository` 또는 `Repository` → `Repository settings`에서 새로 만든 원격 저장소에 연결합니다.
5. **Private** 여부, 업로드 파일에 실제 학교 데이터가 없는지 재확인한 후 게시합니다.

## 3. Git CLI를 이용하는 경우

```bash
cd JB-School
git init
git branch -M main
git add .
git commit -m "Initialize JB School isolated demo and 7-module roadmap"
git remote add origin https://github.com/jbmath-dot/jb-school.git
git push -u origin main
```

> 위 명령은 **새 빈 GitHub 저장소 생성 후** 실행합니다. 기존 저장소를 원격으로 설정하지 마세요. GitHub 인증은 별도 필요합니다.

## 4. 보안 / 향후 배포

- 실제 교직원·학생 데이터 파일을 커밋하지 마세요.
- 이 프로젝트는 운영용 공동 회신 시스템이 아닌 로컬 시연용입니다.
- GitHub Pages를 공개로 열더라도 로그인/서버 권한이 없는 현재 버전에서 교직원 회신 수집을 안내해서는 안 됩니다.
- 실제 서비스 구축 시 서버 인증/RBAC/감사 로그와 기관 승인을 받은 뒤 배포합니다.
