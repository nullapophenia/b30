import { useState, useEffect } from 'react'

// Helper: Map for special symbols and tricky cases
const ALIAS_MAP = {
  '†': 't', // cross
  '♥': 'love',
  'Ⅱ': 'ii',
  'Ⅰ': 'i',
  'Ⅲ': 'iii',
  'Δ': 'delta',
  'κ': 'k',
  'έ': 'e',
  'ν': 'n',
  'ο': 'o',
  'σ': 's',
  'μ': 'm',
  'Ω': 'omega',
  'Ο': 'o',
  'Δ': 'd',
  'τ': 't',
  'ς': 's',
  'υ': 'u',
  'π': 'p',
  'α': 'a',
  'β': 'b',
  'γ': 'g',
  'λ': 'l',
  'ρ': 'r',
  'χ': 'x'
}

function normalize(str) {
  if (!str) return ''
  // Replace special symbols and Greek letters
  let norm = str.normalize('NFD').replace(/[\u0300-\u036f]/g, '')
  norm = norm.split('').map(c => ALIAS_MAP[c] || c).join('')
  // Remove all non-alphanumeric (keep spaces for word separation)
  norm = norm.replace(/[^a-zA-Z0-9 ]/g, '')
  // Lowercase
  norm = norm.toLowerCase()
  // Collapse multiple spaces
  norm = norm.replace(/\s+/g, ' ').trim()
  return norm
}

// Helper: Simple fuzzy match score (lower is better)
function fuzzyScore(query, target) {
  if (!query) return 0
  if (target === query) return 0
  if (target.startsWith(query)) return 1
  if (target.includes(query)) return 2
  // Levenshtein distance (max 2 for fuzzy)
  let m = query.length, n = target.length
  let dp = Array(m + 1).fill().map(() => Array(n + 1).fill(0))
  for (let i = 0; i <= m; i++) dp[i][0] = i
  for (let j = 0; j <= n; j++) dp[0][j] = j
  for (let i = 1; i <= m; i++) {
    for (let j = 1; j <= n; j++) {
      if (query[i - 1] === target[j - 1]) {
        dp[i][j] = dp[i - 1][j - 1]
      } else {
        dp[i][j] = 1 + Math.min(dp[i - 1][j], dp[i][j - 1], dp[i - 1][j - 1])
      }
    }
  }
  return dp[m][n]
}

const SongList = ({ allSongs, sortBy, updateUserScore, savedScores, searchQuery }) => {
  const [sortedSongs, setSortedSongs] = useState([])

  useEffect(() => {
    const sorted = [...allSongs].sort((a, b) => {
      switch (sortBy) {
        case 'cc-desc':
          return parseFloat(b['Chart Constant']) - parseFloat(a['Chart Constant'])
        case 'cc-asc':
          return parseFloat(a['Chart Constant']) - parseFloat(b['Chart Constant'])
        case 'title-asc':
          return a.Title.localeCompare(b.Title)
        case 'title-desc':
          return b.Title.localeCompare(a.Title)
        default:
          return 0
      }
    })
    setSortedSongs(sorted)
  }, [allSongs, sortBy])

  // Improved fuzzy search with normalization and aliasing
  const filteredSongs = (() => {
    if (!searchQuery) return sortedSongs
    const normQuery = normalize(searchQuery)
    const scored = sortedSongs.map(song => {
      const normTitle = normalize(song.Title)
      const score = fuzzyScore(normQuery, normTitle)
      return { song, score }
    })
    const matches = scored.filter(({ score }) => score <= 2)
    matches.sort((a, b) => a.score - b.score)
    return matches.map(({ song }) => song)
  })()

  const getSavedScore = (title, difficulty) => {
    const key = `${title}-${difficulty}`
    return savedScores[key]?.Score || ''
  }

  const formatScoreDisplay = (score) => {
    if (!score) return ''
    // Remove any existing commas and format with commas
    const numericScore = score.toString().replace(/,/g, '')
    return parseInt(numericScore).toLocaleString()
  }

  const handleScoreInput = (e, title, difficulty, song) => {
    let value = e.target.value
    
    // Remove all non-digit characters
    value = value.replace(/\D/g, '')
    
    // Apply limit of 10,003,000 (Arcaea's max possible score)
    if (value && parseInt(value) > 10003000) {
      value = '10003000'
    }
    
    // Update the score (store without commas)
    updateUserScore(title, difficulty, value, song)
  }

  const getSongJacket = (title, difficulty) => {    // Handle special cases that don't follow normal pattern
    const specialCases = {
      'ω4': 'w4',
      '͟͝͞Ⅱ́̕': 'ii',
      'Vulcānus': 'vulcanus',
      'Misdeed -la bonté de Dieu et l\'origine du mal-': 'misdeed_-la_bonte_de_dieu_et_l\'origine_du_mal',
      'γuarδina': 'guardina',
      '〇、': 'o',
      '1F√': '1fr',
      'Anökumene': 'anokumene',
      'Ävril -Flicka i krans-': 'avril_-flicka_i_krans-',
      'CROSS†OVER': 'cross_over',
      'CROSS†SOUL': 'cross_soul',
      'Dynitikós': 'dynitikos',
      'LIVHT MY WΔY': 'livht_my_way',
      'Löschen': 'loschen',
      'nέo κósmo': 'neo_kosmo',
      'Ouvertüre': 'ouverture',
      'Placebo♥Battler': 'placebo_battler',
      'syūten': 'syuten',
      'VECTOЯ': 'vector',
      'αterlβus': 'aterlbus',
      'µ': 'u',
      'ΟΔΥΣΣΕΙΑ': 'odysseia',
      'τ (tau)': 'tau'
    }
    
    let songName
    if (specialCases[title]) {
      songName = specialCases[title]
    } else {
      // Convert song name to match the actual filename pattern
      // Based on the files, they preserve most special chars but remove some
      songName = title.toLowerCase()
        .replace(/ /g, '_')
        .replace(/é/g, 'e')
        .replace(/è/g, 'e') 
        .replace(/à/g, 'a')
        .replace(/ù/g, 'u')
        .replace(/ô/g, 'o')
        .replace(/ç/g, 'c')
        .replace(/"/g, '')
        .replace(/\?/g, '')
        .replace(/:/g, '')
        .replace(/\|/g, '')
        .replace(/\*/g, '')
        .replace(/#/g, '')
        .replace(/\[/g, '')
        .replace(/\]/g, '')
        .replace(/!/g, '')
        .replace(/,/g, '')
        // Keep these characters: ' & ( ) - ~ . _
    }

    // Try difficulty-specific jacket first, then general jacket
    const difficultyJacket = `./arcaea_song_files/${songName}_${difficulty.toLowerCase()}.jpg`
    const generalJacket = `./arcaea_song_files/${songName}.jpg`
    
    return difficultyJacket // We'll handle fallback in the img onError
  }

  const getDifficultyColor = (difficulty) => {
    switch (difficulty) {
      case 'BYD': return '#b35757'
      case 'ETR': return '#7b60d1'
      case 'FTR': return '#a653ad'
      case 'PRS': return '#d8d391'
      case 'PST': return '#49b1d7'
      default: return '#999'
    }
  }

  return (
    <section id="song-list-container">
      <div id="song-list">
        {filteredSongs.map((song, index) => (
          <div key={`${song.Title}-${song.Difficulty}`} className="song-entry">
            <div className="song-info">
              <img 
                src={getSongJacket(song.Title, song.Difficulty)}
                alt={song.Title}
                className="song-jacket"
                onError={(e) => {
                  // Fallback to general jacket
                  const currentSrc = e.target.src
                  const generalJacket = getSongJacket(song.Title, song.Difficulty).replace(`_${song.Difficulty.toLowerCase()}`, '')
                  if (!currentSrc.includes('_' + song.Difficulty.toLowerCase())) {
                    // If both fail, hide the image
                    e.target.style.display = 'none'
                  } else {
                    e.target.src = generalJacket
                  }
                }}
              />
              <div className="song-details">
                <p className="song-title">{song.Title}</p>
                <div className="song-meta">
                  <span 
                    className="difficulty-badge"
                    style={{ backgroundColor: getDifficultyColor(song.Difficulty) }}
                  >
                    {song.Difficulty} {song.Level}
                  </span>
                  <span className="chart-constant">CC: {song['Chart Constant']}</span>
                </div>
              </div>
            </div>
            <input
              type="text"
              placeholder=""
              value={formatScoreDisplay(getSavedScore(song.Title, song.Difficulty))}
              onChange={(e) => handleScoreInput(e, song.Title, song.Difficulty, song)}
              className={`score-input ${getSavedScore(song.Title, song.Difficulty) ? 'has-score' : ''}`}
              maxLength="11"
            />
          </div>
        ))}
      </div>
    </section>
  )
}

export default SongList
