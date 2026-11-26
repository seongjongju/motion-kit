# MotionKit

GSAP와 mo.js를 **클래스만 붙여서** 쓰게 해주는 바닐라 JS 모션 번들입니다. 빌드나 별도 초기화 없이 파일을 연결하면 스크롤 진입, 호버, 클릭 모션이 기본값으로 재생됩니다. v1.0.0.

- 사용 가이드(클래스·옵션 전체 표, 예시): [`index.html`](index.html)
- 모션 확인용 데모: [`demo.html`](demo.html)
- 바로 받아 쓰는 압축본: [`motion-kit.zip`](motion-kit.zip)

## 파일 구성

| 파일 | 역할 |
|---|---|
| `motion-kit.js` | 메인 로직 (IIFE, 전역 `window.MotionKit`) |
| `motion-kit.css` | 모션 시작 전 초기 숨김 처리 (깜빡임 방지) |
| `vendor/gsap.min.js` | 필수 GSAP |
| `vendor/ScrollTrigger.min.js` | 선택적 GSAP 플러그인 (`reverse` / `replay`에 필요) |
| `index.html` | 사용 가이드 문서 |
| `demo.html` | 전체 모션 데모 |

mo.js는 `ani-burst`에서만 사용하며 CDN으로 불러옵니다.

## 빠른 시작

`<head>`에 CSS와 깜빡임 방지 스니펫을 넣습니다.

```html
<link rel="stylesheet" href="motion-kit.css">
<script>document.documentElement.classList.add('ani-ready');setTimeout(function(){if(!window.MotionKit)document.documentElement.classList.add('ani-fail');},2000);</script>
```

`</body>` 직전(공통 inc footer)에 순서대로 연결합니다.

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
| 입장 | `ani-fade`, `ani-fade-up`, `ani-fade-down`, `ani-fade-left`, `ani-fade-right`, `ani-zoom-in`, `ani-zoom-out`, `ani-blur`, `ani-rotate`, `ani-flip` |
| 텍스트 | `ani-split-chars`, `ani-split-words` |
| 묶음 | `ani-group`, `ani-stagger` |
| 숫자 | `ani-count` |
| 호버 | `ani-hover-lift`, `ani-hover-scale`, `ani-hover-rotate` |
| 클릭 | `ani-click-pulse`, `ani-click-shake`, `ani-burst` |

자세한 설명과 전체 옵션 표는 [`index.html`](index.html)을 참고하세요.

## 자주 쓰는 옵션

```html
<div class="ani-fade-up"
     data-ani-delay="0.3"
     data-ani-duration="1.2"
     data-ani-distance="60">옵션 예시</div>
```

- 공통: `data-ani-duration`, `delay`, `ease`, `distance`, `stagger`, `threshold`, `margin`, `repeat`
- 묶음: `data-ani-child`, `data-ani-target`
- 숫자: `data-ani-to`, `from`, `decimals`, `prefix`, `suffix`
- 반응형: `data-ani-mobile`, `data-ani-tablet`

`data-ani-repeat`은 `once`(기본) / `reverse` / `replay`를 지원하며, `reverse`와 `replay`는 ScrollTrigger가 필요합니다.

## 반응형

기본 구간은 `≤767px` / `768~1023px` / `≥1024px`입니다. 바꾸려면 `DOMContentLoaded` 전에 설정합니다.

```js
MotionKit.config.breakpoints = { mobile: 767, tablet: 1023 };
MotionKit.config.mobileScale = 0.6;
```

`data-ani-mobile="off"`처럼 쓰면 해당 구간에서 모션을 끄고 바로 표시하고, `data-ani-mobile="fade-up"`처럼 프리셋 이름을 쓰면 그 구간에서만 모션을 교체합니다.

## JS API

```js
MotionKit.version;   // "1.0.0"
MotionKit.config;    // 기본값 객체
MotionKit.presets;   // 입장 프리셋 객체
MotionKit.init(요소); // 동적으로 추가한 DOM 바인딩 (refresh도 같은 함수)
```

`prefers-reduced-motion: reduce`이면 모션 없이 바로 표시됩니다. gsap 로드 실패 시 `ani-fail`이 붙어 콘텐츠가 숨겨진 채 남지 않습니다.
