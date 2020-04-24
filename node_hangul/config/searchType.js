const threeWordsSearchGroup = [
    {key: 'threeWordsSearch', weight: 1},			
]

const normalSearchGroup = [
    {key: 'artistNsong', weight: 1},
    {key: 'songNartist', weight: 2},
    {key: 'artist', weight: 3},
    {key: 'artistJAMO', weight: 4},
    {key: 'song', weight: 5},
    {key: 'songJAMO', weight: 6},
]

module.exports = {
    threeWordsSearchGroup,
    normalSearchGroup,
}