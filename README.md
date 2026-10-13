# 나일롱뽕

화투로 하는 러미 놀이 **나일롱뽕**을 웹에서 하는 게임이에요. 판이 끝날 때 손에 남은 패 숫자(월)의 합이 가장 낮은 사람이 이겨요.

**바로 하기 → https://2juwon.github.io/nylon-ppong/**

![나일롱뽕](og.png)

## 할 수 있는 것

- **사람들과**: 빠른 참가로 모르는 사람과 자동으로 만나거나, 방을 만들어 번호·링크로 친구를 초대
  - 빈자리는 컴퓨터가 채움, 차례마다 제한 시간(25초, 뽕 결정 10초) — 넘기면 컴퓨터가 대신 둠
  - 연결이 끊기거나 새로고침해도 같은 자리로 돌아와 이어서 하기
  - 서버가 판을 진행하고 각자에게 자기 패만 보내서, 남의 패는 개발자 도구로도 볼 수 없음
- **컴퓨터와**: 컴퓨터 1~3명(삼촌·할머니·이모)과 3·5·10판
- 뽕·박·자연바가지, 스톱, 6장 족보(또이또이·스트레이트·10 부족·60 이상·총통)
- 지역 규칙 설정: 스톱 5·10 이하, 스톱 실패 +30·+50, 바가지 +20·+30, 총통 4장 모두·4-2만, 자연뽕 점수
- 휴대폰 화면에 맞춤

## 규칙

[나무위키 '나이롱뽕'](https://namu.wiki/w/%EB%82%98%EC%9D%B4%EB%A1%B1%EB%BD%95) 문서를 따랐어요. 문서에 없어서 정한 부분은 아래와 같아요.

- 처음 뒤집은 패로는 뽕할 수 없음
- 뽕한 뒤 차례는 뽕한 사람의 오른쪽(반시계 방향)
- 60 이상·총통 점수는 10 부족과 같은 −100
- 다음 판 선은 그 판 점수가 가장 낮은 사람

## 파일

| 파일 | 내용 |
| --- | --- |
| `index.html` | GitHub Pages가 보여 주는 완성본 (`src`를 합친 것) |
| `src/engine.js` | 규칙 엔진. 상태는 JSON이고 `apply(state, action)`으로만 바뀜. `viewFor(state, p)`는 p가 볼 수 있는 정보만 돌려줌 |
| `src/ai.js` | 컴퓨터 플레이어. `viewFor`로 받은 정보만 사용 |
| `src/ui.html` | 화면, 화투 그림(직접 그린 SVG), 효과음, 온라인 방 화면 |
| `server/` | 온라인 서버 (Cloudflare Workers + Durable Objects). 방마다 같은 엔진으로 판을 진행 |
| `config.json` | 게임이 접속할 서버 주소 (`https://nylon-ppong.<서브도메인>.workers.dev`) |
| `build.js` | `src`를 합쳐 `index.html`을 만듦 |
| `test/rules.test.js` | 규칙 단위 테스트 + 컴퓨터끼리 대국 시뮬레이션 |
| `server/test/online.test.mjs` | 로컬 서버에 봇 여러 명을 붙여 방·재접속·시간 초과·정보 노출 확인 |
| `og.png` | 링크 공유 미리보기 이미지 |

## 서버 배포

`server/`나 엔진이 바뀌어 `main`에 올라가면 GitHub Actions(서버 배포)가 Cloudflare에 자동으로 올려요. 저장소 Settings → Secrets and variables → Actions에 아래 두 값이 있어야 해요.

- `CLOUDFLARE_API_TOKEN` — 'Edit Cloudflare Workers' 템플릿으로 만든 토큰
- `CLOUDFLARE_ACCOUNT_ID`

배포가 끝나면 실행 결과 요약에 서버 주소가 나와요. 그 주소를 `config.json`에 넣고 `node build.js`로 `index.html`을 다시 만들면 '사람들과' 메뉴가 켜져요. 무료 플랜 한도(하루 요청 10만 건 등)를 넘으면 그날만 막히고 요금은 나가지 않아요.

## 고친 뒤

```sh
node test/rules.test.js          # 규칙 테스트 + 시뮬레이션 (Node 18 이상)
node build.js                    # index.html 다시 만들기

# 온라인 서버를 내 컴퓨터에서 확인할 때
cd server && npm install
npx wrangler dev --var FAST_TEST:1        # 다른 창에서: node test/online.test.mjs
node build.js --server=http://127.0.0.1:8787 --out=dist/local.html
```

`node build.js --artifact`는 claude.ai 아티팩트용 파일(`dist/artifact.html`, 혼자 하기만)을 만들어요.
