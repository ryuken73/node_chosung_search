function artistNameStartsFirst(patternOriginal){
	return (a, b) => {
		const pattern = patternOriginal.replace(/\s+$/,'');
		const AB = -1;
		const BA = 1;
		// one of two records' artistName start with exact pattern, move forward
		if(a.artistName.startsWith(pattern) && !b.artistName.startsWith(pattern)) return AB;
		if(b.artistName.startsWith(pattern) && !a.artistName.startsWith(pattern)) return BA;
		return 0;
	}
}

function artistNameStartsFirstWithFirstPattern(patternOriginal){
	return (a, b) => {
		const pattern = patternOriginal.replace(/\s+$/,'').split(' ')[0]
		const AB = -1;
		const BA = 1;
		// one of two records' artistName start with exact pattern, move forward
		if(a.artistName.startsWith(pattern) && !b.artistName.startsWith(pattern)) return AB;
		if(b.artistName.startsWith(pattern) && !a.artistName.startsWith(pattern)) return BA;
		return 0;
	}
}

function artistNameIncludesFirst(patternOriginal){
	return (a, b) => {
		const pattern = patternOriginal.replace(/\s+$/,'');
		const AB = -1;
		const BA = 1;
		// one of two records' artistName start with exact pattern, move forward
		if(a.artistName.includes(pattern) && !b.artistName.includes(pattern)) return AB;
		if(b.artistName.includes(pattern) && !a.artistName.includes(pattern)) return BA;
		return 0;
	}
}

function orderyByKey(patternOriginal){
	return (a, b) => { 
		const sortByKey = sortBy(a,b);
		const sortByArtistName = sortByKey('artistName');
		const sortBysongName = sortByKey('songName');
		return sortByArtistName || sortBysongName || 0;
	}
}

function sortBy(a,b) {
	return key => {
		// if key value is empty, push back
		if(a[key] === '') return 1;
		if(b[key] === '') return -1;
		// normal order
		if(a[key] > b[key]) return 1;
		if(a[key] < b[key]) return -1;
		return false
	}
}

const orderDefault = (searchResults, pattern) => {
	return [...searchResults]
	.sort(orderyByKey(pattern)) 
	.sort(artistNameIncludesFirst(pattern))
	.sort(artistNameStartsFirstWithFirstPattern(pattern))
	.sort(artistNameStartsFirst(pattern)) 
}

module.exports = {
	artistNameStartsFirst,
	artistNameStartsFirstWithFirstPattern,
    artistNameIncludesFirst,
	orderyByKey,
	orderDefault
}