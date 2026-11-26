# MotionKit

GSAP 기반의 바닐라 JS 모션 번들입니다. HTML 요소에 `ani-*` 클래스만 붙이면 스크롤 진입, 호버, 클릭 모션이 기본값으로 재생됩니다. 빌드나 별도 초기화 스크립트 없이 파일만 연결해서 사용하며, 버전은 v1.0.0입니다.

- 사용 가이드(전체 클래스·옵션 표, 예시): [`index.html`](index.html)
- 전체 모션 확인용 데모: [`demo.html`](demo.html)
- ZIP 다운로드: [GitHub 저장소 ZIP](https://github.com/seongjongju/motion-kit/archive/refs/heads/main.zip) — 저장소 페이지의 **Code → Download ZIP**과 같습니다. 별도 첨부 파일은 없습니다.

의존성은 세 가지뿐입니다.

| 의존성 | 필요 시점 | 비고 |
|---|---|---|
| `gsap` | 항상 | `vendor/gsap.min.js` (필수) |
| `ScrollTrigger` | `data-ani-repeat="reverse"` / `"replay"` | `vendor/ScrollTrigger.min.js` (선택) |
| `mo.js` | `ani-burst` | CDN으로 로드 (선택) |

선택 의존성이 없으면 해당 기능만 건너뛰고 콘솔 경고가 출력됩니다. 나머지 모션은 정상 동작합니다.

## 파일 구성

| 파일 | 역할 |
|---|---|
| `motion-kit.js` | 메인 로직 (IIFE, 전역 `window.MotionKit`) |
| `motion-kit.css` | 모션 시작 전 초기 숨김 처리 (`html.ani-ready` 스코프) |
| `vendor/gsap.min.js` | 필수 GSAP |
| `vendor/ScrollTrigger.min.js` | 선택적 GSAP 플러그인 (`reverse` / `replay`) |
| `index.html` | 클래스·옵션 사용 가이드 문서 |
| `demo.html` | 전체 모션 확인용 데모 |

## 빠른 시작

`<head>`에 CSS와 깜빡임 방지 스니펫을 넣습니다. 스니펫은 선택 사항이지만 권장합니다.

```html
<link rel="stylesheet" href="motion-kit.css">
<script>document.documentElement.classList.add('ani-ready');setTimeout(function(){if(!window.MotionKit)document.documentElement.classList.add('ani-fail');},2000);</script>
```

`</body>` 직전(공통 inc footer)에 아래 순서로 연결합니다.

```html
<script src="vendor/gsap.min.js"></script>
<script src="vendor/ScrollTrigger.min.js"></script>
<script src="https://cdn.jsdelivr.net/npm/@mojs/core@1.7.1"></script>
<script src="motion-kit.js"></script>
```

그 다음 요소에 클래스를 붙이면 끝입니다.

```html
<div class="ani-fade-up">아래에서 위로 올라오며 나타납니다</div>
```

## 모션 한눈에 보기

| 종류 | 클래스 |
|---|---|
| 입장(스크롤 진입 시 자동 실행) | `ani-fade`, `ani-fade-up`, `ani-fade-down`, `ani-fade-left`, `ani-fade-right`, `ani-zoom-in`, `ani-zoom-out`, `ani-blur`, `ani-rotate`, `ani-flip` |
| 텍스트 | `ani-split-chars`, `ani-split-words` |
| 묶음 | `ani-group`, `ani-stagger` |
| 숫자 | `ani-count` |
| 호버 | `ani-hover-lift`, `ani-hover-scale`, `ani-hover-rotate` |
| 클릭 | `ani-click-pulse`, `ani-click-shake`, `ani-burst` |

자세한 설명, 기본값, 전체 옵션 표는 [`index.html`](index.html)을 참고하세요.

## 자주 쓰는 옵션

```html
<div class="ani-fade-up"
     data-ani-delay="0.3"
     data-ani-duration="1.2"
     data-ani-distance="60">옵션 예시</div>
```

- 공통: `data-ani-duration`, `delay`, `ease`, `distance`, `stagger`, `threshold`, `margin`, `trigger="load"`, `repeat`, `mobile`, `tablet`
- 묶음: `data-ani-child`, `data-ani-target`
- 숫자: `data-ani-to`, `from`, `decimals`, `prefix`, `suffix`
- 버스트: `data-ani-burst-count`, `radius`, `colors`, `shape`

`data-ani-repeat`은 `once`(기본) / `reverse` / `replay`를 지원합니다. `reverse`는 화면 아래로 벗어날 때 되감고, `replay`는 진입할 때마다 처음부터 재생합니다. 두 모드에는 ScrollTrigger가 필요하며, 없으면 `once`로 동작하고 콘솔 경고가 출력됩니다. `ani-count`는 repeat 대상이 아닙니다.

## 반응형

기본 구간은 `≤767px` / `768~1023px` / `≥1024px`입니다. 값을 바꾸려면 `DOMContentLoaded` 전에 설정합니다.

```js
MotionKit.config.breakpoints = { mobile: 767, tablet: 1023 };
MotionKit.config.mobileScale = 0.6;
```

`data-ani-mobile="off"`는 해당 구간에서 모션을 끄고 바로 표시하고, `data-ani-mobile="fade-up"`처럼 프리셋 이름을 쓰면 그 구간에서만 모션을 교체합니다. `data-ani-tablet`도 같습니다. `mobileScale`은 모바일 구간의 이동 거리와 `ani-burst` 반경·개수에 곱해집니다.

구간은 `gsap.matchMedia()`로 만들어지며, 구간이 바뀌면 이전 트윈·트리거·observer·리스너를 정리한 뒤 다시 바인딩합니다. 호버 모션은 `(hover: hover) and (pointer: fine)`에서만 동작합니다. `ani-burst` 버튼에는 `touch-action: manipulation`을 권장합니다.

## JS API

```js
MotionKit.version;    // "1.0.0"
MotionKit.config;     // 기본값 객체
MotionKit.presets;    // 입장 프리셋 객체
MotionKit.init(요소);  // 동적으로 추가한 DOM 바인딩 (refresh도 같은 함수)
```

## 숨김 처리와 실패 대응

- `motion-kit.css`의 초기 숨김은 `@media (scripting: enabled)`와 `html.ani-ready`가 함께일 때만 적용됩니다.
- `motion-kit.js`는 로드되자마자 `ani-ready`를 붙입니다. gsap이 없으면 즉시 `ani-fail`을 붙여 모든 요소를 다시 표시합니다.
- 위 head 스니펫은 `ani-ready`를 먼저 붙여 깜빡임을 막고, 2초 뒤에도 `window.MotionKit`이 없으면 `ani-fail`로 복구합니다. 느린 네트워크では 타임아웃(`2000`)을 늘리세요.
- 스니펫을 넣지 않으면 JS 실행 시점까지 요소가 잠깐 보일 수 있지만, JS 로드에 실패해도 숨김이 남지는 않습니다.
- ScrollTrigger가 있으면 등록 후 `ignoreMobileResize: true`를 적용하고, `window load` 직후와 이미지·웹폰트 로딩 완료 후 `refresh()`를 호출합니다. `resize` / `orientationchange`는 150ms 디바운스로 갱신합니다.
- `prefers-reduced-motion: reduce`이면 스크롤 위치와 무관하게 모션 없이 바로 표시됩니다.
- IE 등 구형 브라우저는 지원하지 않습니다(문법은 ES5 스타일을 유지합니다).
