1) HOCATION 폴더 바로 밑에 "api"라는 폴더가 있으면 (app 폴더 안 말고, app과 같은 레벨) 통째로 삭제하세요.
   지난번에 잘못 생긴 폴더입니다.

2) 이 압축을 푼 폴더 안의 내용을 HOCATION 폴더 위에 그대로 끌어다 놓고
   "병합(Merge)" -> "모두 대체(Replace)"를 선택하세요.
   (package.json, package-lock.json, next.config.js는 HOCATION 바로 밑에 원래 있던 파일이라
    자동으로 그 자리에서 교체됩니다.)

3) 터미널에서:
   git add -A
   git commit -m "서버 압축 다운로드 + 길찾기"
   git push

4) 이미 Netlify에 KAKAO_REST_API_KEY 환경변수를 추가했다면 그대로 두면 됩니다.
   아직이라면: 카카오 디벨로퍼스 > 내 앱 > 앱 키 > REST API 키를 복사해서
   Netlify > Project configuration > Environment variables 에 KAKAO_REST_API_KEY로 추가하세요.
