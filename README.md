# node_chosung_search
# 한글 자동완성 및 초성검색 구현

## 0. 구현환경 개요
### 데이터 소스
- Text file을 읽어서 application 메모리에 json object로 load 
- sample text file은 input 폴더 아래에 있는 justice.txt => "정의란 무엇인가"의 내용 발췌 (총 4700자)
- 소스 데이터에 대해 그냥 공백기준으로 split => 실환경에서는 형태소 분석이 추가되면 좋을듯 합니다

### 서버 프로그램
- node.js express template 사용
- /routers/init.js : 데이터 소스 loading
- /routers/getUser.js : /searchJAMOCHO/:pattern 입력 => 초성 및 자동완성 데이터 return
- /util/extractCHO.js : 한글 string을 받아서 초성 string return ("홍길동" => "ㅎㄱㄷ")
- /util/extractJAMO.js : 한글 string을 받아서 자모 분리한 string return ("홍길동" =>"ㅎㅗㅇㄱㅣㄹㄷㅗㅇ")

### 클라이언트 javascript
- /public/js/index.js
  * init 부분 : /init/JAMO 호출
  * autocomplete 부분 : jquery autocomplete widget으로 입력(keyup)할때 마다 event발생해서 /searchJAMOCHO/:pattern으로 post요청

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
	 'url':'/getUser/searchJAMOCHO/'+encodeURIComponent(request.term),
		'type':'GET',
		'success':function(result){
			response(
				$.map(result.slice(0,20),function(item){
	    			return{
						label : item.USER_NM +' - '+ item.CO_NM + ' - ' + item.DEPT_NM,
							value: item.USER_NM
						};							
					})
			);			
		}
    });
			...
		
```

## 4. 서버구현 참고
- 최초 init 수행 시, Text file로 부터 word를 읽고, 초성값 및 자모분리된 값을 저장한다.
```js
[{USER_NM:'홍길동',USER_CHO:'ㅎ,ㄱ,ㄷ',USER_JAMO:'ㅎㅗㅇㄱㅣㄹㄷㅗㅇ'}{..}]
```
- 전달받은 한글string을 자모분리, 초성분리한다.
- 분리한 데이터와 최초 init을 통해 만들어진 서버데이터를 비교 ( 서버의 데이터 생성방법은 아래 참고 )
```js
// /routes/getUser.js 참조
router.get('/searchJAMOCHO/:pattern', function(req, res, next) {
	
	global.logger.trace('%s',req.params.pattern);
	var pattern = req.params.pattern
	// 자모 분리
	var jamo = extractJAMO(req.params.pattern);
	// 초성 분리
	var cho = extractCHO(req.params.pattern);

  // 전달받은 한글자체 비교
	var userObj = _.filter(global.usermapWithJAMOCHO, function(obj){
		return obj.USER_NM.includes(req.params.pattern); 
	});
	
	// 자모 분리한값 비교
	var userObjJAMO = _.filter(global.usermapWithJAMOCHO, function(obj){
		return obj.USER_NM_JAMO.startsWith(jamo) ;
	});	
	
	var processed = 0;
	var userObjCHO = [];

  // 초성비교
	for ( var i = 0 ; i < pattern.length ; i++ ) {
			if(Hangul.isHangul(pattern[i])){
				global.logger.trace('이건 초성검색이 아닙니다');
				break;
			}else{
				processed ++;
			}			
			
			if(processed === pattern.length){
				userObjCHO = _.filter(global.usermapWithJAMOCHO, function(obj){
					return obj.USER_CHO.startsWith(cho) ;
				});
			}
	}	
```
  
## 5. 사용 모듈
- 자모분리, 초성값 추출 등 한글관련 연산은 hangul-js를 사용 [https://github.com/e-/Hangul.js]
- 클라이언트 자동완성은 jquery UI의 autocomplete widget 사용 [http://api.jqueryui.com/autocomplete]
- json 배열검색 및 결과 union은 lodash function 사용 [https://lodash.com]

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
