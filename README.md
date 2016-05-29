# node_chosung_search
#한글 자동완성 및 초성검색

##1.클라이언트
- jquery UI autocomplete widget 사용
- 키 입력에 따라 "ㅎ","호","홍","홍ㄱ","홍기" 이런 값들이 서버에 ajax로 전달된다.

##2. 서버
- 전달받은 한글을 서버가 가진 데이터와 비교 ( 서버의 데이터 생성방법은 아래 참고 )
- 서버 데이터 형식 : DB에서 가져온 이름에서 초성값 그리고 자모 분리한 값을 추출함
```js
[{USER_NM:'홍길동',USER_CHO:'ㅎ,ㄱ,ㄷ',USER_JAMO:'ㅎㅗㅇㄱㅣㄹㄷㅗㅇ'}{}]
```
- 전달받은 한글도 초성값, 자모 분리한 값으로 나눠서 각각 서버 데이터와 비교해서
  일치하는 값을 찾아낸다.
  
##3. 사용한 모듈
- 자모분리, 초성값 추출 등 한글관련 Operation은 hangul-js를 사용 [https://github.com/e-/Hangul.js]
- 클라이언트 자동완성은 jquery UI의 autocomplete widget 사용 [http://api.jqueryui.com/autocomplete]

##4. 몇가지 시행착오
1) 브라우져 text input box에 "ㄺ""ㅄ" 이렇게 붙어서 입력이 되어 초성검색이 안된다.
- keyup event로 catch해서 초성이 될 수 없는 input 이 들어오면 나누도록 코딩
- 하지만 파이어폭스에서 2bytes 문자(한글)에 대해서 keyup이 발생하지 않는 문제 발생
- 곰곰히 생각해보니 keyup event를 listen할 필요가 없었음 -> autocomplete안에서 이벤트 감지됨

2) IE에서 한글을 입력하면 서버에서 오류발생 ( express의 param encoding하는 부분)
- 자세히 보니 서버로 ajax 전송할 때 http get을 썼는데, euc-kr로 바로 전달되었기 때문
- 브라우져 옵션의 국제 -> UTF-8로 경로 전송하기를 하면 정상화 되지만, 이렇게 쓸 수는 없는 노릇
- http get request 보낼 때 한글 부분을 encodeURIComponent로 감싸서 해결됨

3) input box에 "홍길동"이라는 완성된 한글을 입력했는데, "하국동"이라는 초성검색결과도 같이 리턴됨
- 한글자라도 완성된 한글이 전달되는 경우, 초성부분 비교 로직은  bypass하도록 함
