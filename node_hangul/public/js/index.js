$(document).ready(function(){     

	// event handler for init button         
	$(".button-primary").click(function(event){
		event.preventDefault();
		timer.start();
		const bookNum = event.target.value;
		$.ajax({
			'url':`/load/${bookNum}`,
			'type':'GET',
			'success':function(result){
				const elapsed = timer.end();
				$('#result').text(`Init Success : ${result.count} words, ${elapsed} sec`);
			}
		})
	});
	

	$( '#chosung' ).autocomplete({
		source: function(request,response){
			timer.start();
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
				'url':'/search/searchJAMOCHO/'+encodeURIComponent(request.term),
				'type':'GET',
				'success':function(res){
					const {result,count} = res;
					const elapsed = timer.end();
					$('#result').text(`Search Success : ${count} words, ${elapsed} sec`);
					console.log(result)
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

	const timer = {
		startTime : null,
		endTime : null,
		runnig : false,
		start(){
			if(this.running) {
				console.error('timer already started');
				return false;
			}
			const time = new Date();
			this.startTime = time.getTime();
			this.running = true;
		},
		getDuration(){
			return ((this.endTime - this.startTime ) / 1000).toFixed(5);
		},
		end(){
			if(!this.running) {
				console.error('start timer first!');
				return false;
			}
			const time = new Date();
			this.endTime = time.getTime();
			this.running = false;
			return this.getDuration();
		},
	}

});

