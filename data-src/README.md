# data-src

- `raw/` — `pnpm data:fetch`가 내려받는 원본(HYG, OpenNGC, d3-celestial…). **.gitignore 대상.** 네트워크가 막히면 사용자가 직접 받아 여기에 둔다(파일 목록은 `docs/DATA-LICENSES.md`).
- `curated/` — 큐레이션 표(csv, 커밋): 한글 이름, 콜드웰, 유성우, 콘텐츠 대상.
- `content-raw/` — GPT Pro G3 원본과 `catalog-values.v1.csv`(커밋).
