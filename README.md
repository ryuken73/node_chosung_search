# node_chosung_search
# 한글 자동완성 및 초성검색 구현

## 0. 구현환경 개요
### 동작 개요
- 하나의 input box에서 자동완성과 초성검색 모두 처리
- 서버 환경은 node.js의 express를 사용하고, 특히 hangul-js 적극 사용
- 클라이언트 환경은 jquery autocomplete widget 사용
- 동작방식은, 데이터 소스를 서버에 로드  
=> 공백기준으로 단어 split  
=> 각 단어별로 자모분리한 값(jamo)과 초성(cho)을 저장 {word:'하늘', cho:'ㅎㄴ', jamo: 'ㅎㅏ ㄴ ㅡ ㄹ''}  
=> 위 object들을 global.wordsWithJAMOCHO 배열에 저장  
=> request가 오면, 위 배열에서 matching되는 object들을 return

### 데이터 소스
- Sample Text File을 읽어서 Application 메모리에 paring해서 저장 
- Sample Text File "정의란 무엇인가", "어린왕자", "카프카-변신"중 선택해서 로드
- 소스 데이터에 대해 공백기준으로 split하여 서버 메모리에 load시킴 

### 서버 프로그램
- node.js express template 사용
- /routers/load.js : 데이터 소스 loading
- /routers/search.js : /search/searchJAMOCHO/:pattern 처리 => 초성 및 자동완성 데이터 return
- /util/extractCHO.js : 한글 string을 받아서 초성 string return ("홍길동" => "ㅎㄱㄷ")
- /util/extractJAMO.js : 한글 string을 받아서 자모 분리한 string return ("홍길동" =>"ㅎㅗㅇㄱㅣㄹㄷㅗㅇ")

### 클라이언트 프로그램
- /public/js/index.js
  * init 부분 : /load 호출
  * autocomplete 부분 : jquery autocomplete widget으로 입력(keyup)할때 마다 event발생해서 /search/searchJAMOCHO/:pattern으로 post요청

## 1. 사용법
- git clone https://github.com/ryuken73/node_chosung_search.git
- npm install
- npm start 


## 2. 실행예
 접속 : http://localhost:3000
- 초기데이터 로드
![Alt Text](https://github.com/ryuken73/node_chosung_search/raw/master/node_hangul/image/init.jpg)
- 초성검색
![Alt Text](https://github.com/ryuken73/node_chosung_search/raw/master/node_hangul/image/chosung_search.jpg)
- 자동완성
![Alt Text](https://github.com/ryuken73/node_chosung_search/raw/master/node_hangul/image/autocomplete.jpg)

## 3. 클라이언트구현 참고
- jquery UI autocomplete widget 사용
- 키 입력에 따라 "ㅎ","호","홍","홍ㄱ","홍기" 이 값들이 서버에 ajax로 전달된다.
- 서버에서는 ajax로 전달된 값에 대해, 초성 및 자모분리를 각각 수행하고 일치되는 string 배열을 return.

```js
// /public/js/index.js 참조
$( '#chosung' ).autocomplete({
 source: function(request,response){
 ... 중략		
  $.ajax({
	'url':'/search/searchJAMOCHO/'+encodeURIComponent(request.term),
	'type':'GET',
	'success':function(res){
		const {result,count} = res;
		const elapsed = timer.end();
		$('#result').text(`Search Success : ${count} words, ${elapsed} sec`);		
		response(
			$.map(result.slice(0,20),function(item){
				return{
				label : item.word +' : "'+ item.jamo + '" : "' + item.cho + '"',
				value: item.word
			};							
			})
		);				
   }
  });
 },
  ...
});	
	
```

## 4. 서버구현 참고
- 최초 load 수행 시, Text file로 부터 word를 읽고, 초성값 및 자모분리된 값을 저장한다.
```js
[{word:'홍길동',cho:'ㅎ,ㄱ,ㄷ',jamo:'ㅎㅗㅇㄱㅣㄹㄷㅗㅇ'}{..}]
```
- 사용자로부터 전달받은 한글string을 자모분리, 초성분리한다.
- 분리한 사용자 입력 데이터와 최초 init을 통해 만들어진 서버데이터를 비교 
```js
// /routes/search.js 참조
router.get('/searchJAMOCHO/:pattern', function(req, res, next) {

	global.logger.trace('%s',req.params.pattern);
	const {pattern} = req.params;
	const jamo = extractJAMO(pattern);
	const cho = extractCHO(pattern);
	global.logger.trace('%s',jamo);
  	// 1. 한글비교 (한글 like 검색)
	const wordObj = global.wordsWithJAMOCHO.filter(wordWithJAMOCHO =>
	 wordWithJAMOCHO.word.includes(pattern)); 	
	// 2. 자모분리비교 ()
	const wordObjJAMO = global.wordsWithJAMOCHO.filter(wordWithJAMOCHO => 
	wordWithJAMOCHO.jamo.startsWith(jamo)); 	
	
	let wordObjCHO = [];
	// 3. 초성비교
	const arrayFromPattern = Array.from(pattern);
	const checkHangul = arrayFromPattern.map(element => Hangul.isHangul(element));

	if(checkHangul.some(element => element)){
		global.logger.trace('이건 초성검색이 아닙니다');
		wordObjCHO = [] 
	} else {
		console.log(global.wordsWithJAMOCHO)
		wordObjCHO = global.wordsWithJAMOCHO.filter(wordWithJAMOCHO => {
			if(wordWithJAMOCHO.cho){
				return wordWithJAMOCHO.cho.startsWith(cho);
			} else {
				false;
			}
		})
	} 
	
	global.logger.trace('wordObjCHO:%j',wordObjCHO);
	//4. 한글비교 + 자모비교 + 초성비교
	Object.assign(wordObj, wordObjJAMO);
	Object.assign(wordObj, wordObjCHO);
	
	res.send({result:wordObj, count:wordObj.length});
	
}); 
	
}); 
```
  
## 5. 사용 모듈
- 자모분리, 초성값 추출 등 한글관련 연산은 hangul-js를 사용 [https://github.com/e-/Hangul.js]
- 클라이언트 자동완성은 jquery UI의 autocomplete widget 사용 [http://api.jqueryui.com/autocomplete]


## 6. 몇가지 시행착오
1) 브라우져 text input box에 "ㄺ""ㅄ" 이런식으로 자음이 붙어서 입력이 되어 초성검색이 안된다.
- keyup event를 catch해서 초성이 될 수 없는 input 이 들어오면 나누도록 코딩
- 하지만 파이어폭스에서 2bytes 문자(한글)에 대해서 keyup이 발생하지 않는 문제 발생
- 곰곰히 생각해보니 keyup event를 listen할 필요가 없었음 -> autocomplete안에서 이벤트 감지됨
```js
// /public/js/index.js 참조
	$( '#chosung' ).autocomplete({
	  source: function(request,response){
			
	  // 초성검색인 경우, 종성으로만 허락되는 겹문자를 홑문자로 잘라준다.
	  var data = $('#chosung').val(); 
	  for ( var i = 0 ; i < data.length ; i++ ) {
	    if(Hangul.isHangul(data[i])){
		  console.log('이건 초성검색이 아닙니다');
		  break;
		}
		  if(!Hangul.isHangul(data[i])){
		    //초성만 입력되거나 문자가 영문 또는 'ㅗㅒ' 이런글자들이다.
			if(Hangul.isConsonant(data[i]) && !Hangul.isCho(data[i])){
			  // 그리고 자음이면서, 초성으로 쓰일수 없는 글자라면... disassemble한다.
			  var result = Hangul.disassemble(data).join('');
			  console.log(result);	
			  $('#chosung').val(result);
			}
		  }
		}

```

2) IE에서 한글을 입력하면 서버에서 오류발생 ( express의 param encoding하는 부분 )
- 자세히 보니 서버로 ajax 전송할 때 http get을 썼는데, euc-kr로 서버에 전달되었기 때문
- 브라우져 옵션의 "국제 -> UTF-8로 경로 전송하기"를 하면 정상화 되지만, 이렇게 쓸 수는 없는 노릇
- http get request 보낼 때 한글 부분을 encodeURIComponent로 감싸서 해결

3) input box에 "홍길동"이라는 완성된 한글을 입력했는데, "하국동"이라는 초성검색결과도 같이 리턴됨
- 한글자라도 완성된 한글이 전달되는 경우, 서버 사이드 초성 비교 로직은  bypass하도록 함

## 7. 최신 변경사항
 1) [Server]ECMA6 적용
 2) [Server]Native Promise로 Q 라이브러리 의존성 제거
 3) [Server]Native JS Array Method로 lodash 의존성 제거
 4) [Client]loading time, 건수 추가
 5) [Client]여러 txt파일 load 추가
 6) [Client]검색 속도, 건수, 시간 표시추가