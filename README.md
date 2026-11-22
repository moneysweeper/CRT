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
- 3초 시세 갱신과 다음 봉 카운트다운

## 포함 소스와 저작권

dist/order-block.js는 fluxchart의 Volumized Order Blocks를 수정·변환한 코드이며
해당 파일에는 Mozilla Public License 2.0 고지를 유지했습니다.
https://mozilla.org/MPL/2.0/

배포 서비스의 Git 설정, 인증정보 및 사이트 식별 설정은 이 소스 묶음에 포함하지 않습니다.
