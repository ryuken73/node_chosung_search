
$(document).ready(function(){     

	// event handler for init button         
	$(".button-primary").click(function(event){
		event.preventDefault();
		$.ajax({
			'url':'/init/JAMO',
			'type':'GET',
			'success':function(result){
				$('#result').text("Init Success");
			}
		})
	});
	
	// 아래는 FF에서 2bytes(한글)에 대해 keyup event가 발생하지 않아서...
	// 모든 브라우져에서 계속 감시하는 것으로..
	/*
	
	$('#chosung').focus(function(event){
		this.intervalID = setInterval(function(){
			$(this)._watch();
		},200);
	});
	
	$('#chosung').blur(function(event){
		if(this.intervalID){
			clearInterval(this.intervalID);
		}
	});
	
	$.fn._watch = function(){
		//console.log($('#chosung').val());
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
	}
	// 여기까지가...
	*/
	
	$( '#chosung' ).autocomplete({
		source: function(request,response){
			
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
		},
		focus: function(event, ui){
			event.preventDefault();
		},
		select: function(event,ui){ // 값 선택할 때 input box에 값 채워지고 submit 되도록
			var promise = new Promise(function(resolve,reject){
				$('this').text = ui.item.value;
				resolve()
			})
			promise.then(function(result){
				console.log($('#chosung').val());
				// submit code 넣으면 된다..검색이라든가..뭐
			});
		}		
	});	

}); 
