# 필름 카메라

둘이 쓰는 필름 카메라 PWA. 전략과 로드맵은 [docs/STRATEGY.md](docs/STRATEGY.md)에 있습니다.

```bash
npm install
npm run dev
```

- `src/engine/`: WebGL2 필름 현상 엔진 (프로파일은 `src/engine/profiles/`)
- `src/camera/`: 촬영 화면 (첫 화면)
- `src/lab/`: 현상실. 사진을 올려 필름별로 비교하고 조정하는 페이지 (`#/lab`)
