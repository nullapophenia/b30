import React, { useRef, useEffect, useState } from 'react'
import html2canvas from 'html2canvas'

// Cookie helpers for player name
export const setPlayerNameCookie = (name) => {
  const expires = new Date()
  expires.setTime(expires.getTime() + (365 * 24 * 60 * 60 * 1000))
  document.cookie = `arcaea_player_name=${encodeURIComponent(name)};expires=${expires.toUTCString()};path=/`
}
export const getPlayerNameCookie = () => {
  const nameEQ = 'arcaea_player_name='
  const ca = document.cookie.split(';')
  for (let i = 0; i < ca.length; i++) {
    let c = ca[i]
    while (c.charAt(0) === ' ') c = c.substring(1, c.length)
    if (c.indexOf(nameEQ) === 0) {
      return decodeURIComponent(c.substring(nameEQ.length, c.length))
    }
  }
  return null
}

const Results = ({ b30Data }) => {
  const [playerName, setPlayerName] = useState('Player')
  const [editingName, setEditingName] = useState(false)
  const exportRef = useRef(null)

  // Load player name from cookie on mount
  useEffect(() => {
    const saved = getPlayerNameCookie()
    if (saved) setPlayerName(saved)
  }, [])
  // Save player name to cookie on change
  useEffect(() => {
    setPlayerNameCookie(playerName)
  }, [playerName])

  let summary = null
  if (b30Data && b30Data.length > 0) {
    const potentials = b30Data.map(s => s['Play Potential'])
    const average = potentials.reduce((a, b) => a + b, 0) / potentials.length
    const b30Potential = (potentials.reduce((a, b) => a + b, 0) + potentials.slice(0, 10).reduce((a, b) => a + b, 0)) / 40
    summary = {
      average: average.toFixed(4),
      b30Potential: b30Potential.toFixed(4),
      count: b30Data.length
    }
  }

  // Copy the body's background class to the export area
  useEffect(() => {
    if (exportRef.current) {
      const bodyClass = document.body.className
      exportRef.current.className = `b30-export-container glassy ${bodyClass}`
    }
  }, [])

  const exportB30AsImage = async () => {
    const element = document.getElementById('b30-export')
    if (!element) return
    // Copy the body's background style to the export area
    const bodyStyle = window.getComputedStyle(document.body)
    element.style.background = bodyStyle.background
    element.style.backgroundImage = bodyStyle.backgroundImage
    element.style.backgroundSize = bodyStyle.backgroundSize
    element.style.backgroundPosition = bodyStyle.backgroundPosition
    element.style.backgroundAttachment = bodyStyle.backgroundAttachment
    // Use a higher scale for better quality
    const canvas = await html2canvas(element, { backgroundColor: null, scale: window.devicePixelRatio })
    const link = document.createElement('a')
    link.download = 'b30.png'
    link.href = canvas.toDataURL('image/png')
    link.click()
    // Optionally, reset the export area's background after export
    element.style.background = ''
    element.style.backgroundImage = ''
    element.style.backgroundSize = ''
    element.style.backgroundPosition = ''
    element.style.backgroundAttachment = ''
  }

  const getGrade = (score) => {
    const scoreNum = parseInt(score.replace(/['']/g, ''))
    if (scoreNum >= 10000000) return 'PM'
    if (scoreNum >= 9900000) return 'EX+'
    if (scoreNum >= 9800000) return 'EX'
    if (scoreNum >= 9500000) return 'AA'
    if (scoreNum >= 9200000) return 'A'
    if (scoreNum >= 8900000) return 'B'
    if (scoreNum >= 8600000) return 'C'
    return 'D'
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

  const getSongJacket = (title, difficulty) => {
    // Handle special cases that don't follow normal pattern
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
    }

    return `./arcaea_song_files/${songName}.jpg`
  }

  const handleNameChange = (e) => {
    setPlayerName(e.target.value)
  }

  return (
    <section id="results">
      {summary && (
        <div className="b30-header">
          <div className="b30-title">            <h2>best {summary.count}</h2>
            <div className="generated-date">generated on {new Date().toLocaleDateString()}</div>
          </div>          <div className="b30-potential">
            <div className="potential-value">{summary.b30Potential}</div>
            <div className="potential-label">play potential</div>
          </div>
        </div>
      )}
      
      {b30Data && b30Data.length > 0 && (
        <>
          <button onClick={exportB30AsImage} style={{marginBottom: '16px', padding: '10px 18px', borderRadius: '20px', background: '#222', color: '#fff', border: 'none', cursor: 'pointer', fontWeight: 600}}>Export B30 as Image</button>
          <div id="b30-export" ref={exportRef}>
            {/* Glassy header */}
            <div className="b30-glassy-header">
              <div className="b30-header-left">
                <div className="b30-char-frame"></div>
              </div>
              <div className="b30-header-center">
                {editingName ? (
                  <input
                    className="b30-name-input"
                    value={playerName}
                    onChange={handleNameChange}
                    onBlur={() => setEditingName(false)}
                    autoFocus
                  />
                ) : (
                  <span className="b30-player-name" onClick={() => setEditingName(true)}>{playerName}</span>
                )}
                <div className="b30-ptt-badge">
                  <span className="b30-ptt-label">PTT</span>
                  <span className="b30-ptt-value">{summary.b30Potential}</span>
                </div>
              </div>
              <div className="b30-header-right">
                <span className="b30-date">{new Date().toLocaleDateString()}</span>
              </div>
            </div>
            {/* B30 grid */}
            <div className="b30-grid-cards b30-5x6">
              {b30Data.map((score, index) => (
                <div key={`${score.Title}-${score.Difficulty}`} className="b30-card-v2">
                  <div className="diamond-badge">#{index + 1}</div>
                  <div className="song-jacket-container-v2">
                    <img 
                      src={getSongJacket(score.Title, score.Difficulty)}
                      alt={score.Title}
                      className="song-jacket-v2"
                      onError={(e) => {
                        e.target.style.display = 'none'
                      }}
                    />
                    <div className="difficulty-overlay-v2">
                      <span 
                        className="difficulty-badge-small"
                        style={{ backgroundColor: getDifficultyColor(score.Difficulty) }}
                      >
                        {score.Difficulty}
                      </span>
                    </div>
                  </div>
                  <div className="score-display-v2">
                    <div className="score-value-v2">{parseInt(score.Score).toLocaleString()}</div>
                    <div className="grade-badge-v2">{getGrade(score.Score)}</div>
                  </div>
                  <div className="potential-display-v2">
                    {score['Play Potential'].toFixed(2)}
                  </div>
                  <div className="song-title-small-v2">{score.Title}</div>
                </div>
              ))}
            </div>
          </div>
        </>
      )}
    </section>
  )
}

export default Results
