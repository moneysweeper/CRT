# CRT Charts

암호화폐 두 시간봉을 나란히 비교하는 정적 웹페이지입니다.

## 실행

dist/index.html을 브라우저로 열거나 dist 폴더를 정적 웹 서버로 제공하세요.
Binance 공개 시세 API를 사용하므로 인터넷 연결이 필요합니다.
API 키나 별도 빌드 단계는 필요하지 않습니다.

## 기능

- BTC, ETH, SOL, ADA, NEAR의 USDT 현물 차트
- 시간봉 조합, 차트 비율, 왼쪽 봉 개수 설정
- SMA 10/20/50/200 및 브라우저 내 스타일 저장
- VWAP, MACD, RSI, CCI
- Order Block과 여러 시간봉의 Order Block 확장
- ICT Concept의 MSS/BOS, 유동성, FVG, VI, 몸통 기준 Order Block, NWOG
- 3초 시세 갱신과 다음 봉 카운트다운

## 포함 소스와 저작권

dist/order-block.js는 fluxchart의 Volumized Order Blocks를 수정·변환한 코드이며
해당 파일에는 Mozilla Public License 2.0 고지를 유지했습니다.
https://mozilla.org/MPL/2.0/

배포 서비스의 Git 설정, 인증정보 및 사이트 식별 설정은 이 소스 묶음에 포함하지 않습니다.

## ICT Concepts

dist/ict-concepts.js는 사용자가 제공한 LuxAlgo의 ICT Concepts Pine v5 소스를
JavaScript 및 Canvas로 변환한 파일입니다. 원저작자는 LuxAlgo이며,
변환 파일은 CC BY-NC-SA 4.0 조건으로 제공됩니다.
https://creativecommons.org/licenses/by-nc-sa/4.0/

기본 설정을 적용합니다. Present 모드, 구조 길이 5, Order Block 길이 10,
방향별 Order Block 1개, 방향별 유동성 2개, 방향별 FVG 2개, VI 2개,
NWOG 3개를 표시합니다. 최대 3,000봉의 차트 시간봉 데이터를 사용합니다.
소스 기본값에서 꺼진 BPR, IFVG, NDOG, Fibonacci, Killzones,
Displacement 마커 및 과거 극성 변경 라벨은 비활성 상태입니다.
TradingView의 Pine 실행 환경과 표시를 직접 대조한 결과는 포함하지 않습니다.

## Fibonacci Golden Wave

dist/fibonacci.js는 fluxchart의 사용자 제공 Pine v5 소스를 JavaScript 및 Canvas로 변환한 파일입니다.
© fluxchart. Mozilla Public License 2.0 고지를 유지합니다.
https://mozilla.org/MPL/2.0/

기본값은 Swing Range 20, Use Pivots false, Golden Zone 0.5~0.618이며,
현재 봉을 포함한 최근 20봉의 최고·최저가로 매 봉 계산합니다.

## RSI (Kernel Optimized)

dist/rsi-optimized.js는 Flux Charts의 사용자 제공 Pine v5 소스를 JavaScript 및 Canvas로 변환한 파일입니다.
© Flux Charts®. Creative Commons Attribution-NonCommercial-ShareAlike 4.0 International.
https://creativecommons.org/licenses/by-nc-sa/4.0/

기본 설정은 RSI 14 (종가), 고저 피벗 21, Gaussian KDE, bandwidth 2.71828,
100 bins, Medium 임계값 0.25, Sum 모드, 라벨 간격 8봉입니다.
최대 5,000봉을 사용해 각 차트 시간봉의 화살표·라벨·대시보드를 계산합니다.
피벗은 오른쪽 21봉으로 확정하며, 화살표는 마감된 봉에 표시됩니다.
확률 수치는 제공 소스의 KDE 누적 밀도 계산을 따릅니다.
TradingView 실시간 화면과의 일치 여부는 직접 비교하지 않았습니다.
