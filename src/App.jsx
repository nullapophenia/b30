import { useState, useEffect } from 'react'
import './App.css'
import SongList from './components/SongList'
import Controls from './components/Controls'
import Results, { setPlayerNameCookie, getPlayerNameCookie } from './components/Results'
import Analytics from './components/Analytics'

// Cookie utilities
const setCookie = (name, value, days = 365) => {
  const expires = new Date()
  expires.setTime(expires.getTime() + (days * 24 * 60 * 60 * 1000))
  document.cookie = `${name}=${encodeURIComponent(JSON.stringify(value))};expires=${expires.toUTCString()};path=/`
}

const getCookie = (name) => {
  const nameEQ = name + "="
  const ca = document.cookie.split(';')
  for (let i = 0; i < ca.length; i++) {
    let c = ca[i]
    while (c.charAt(0) === ' ') c = c.substring(1, c.length)
    if (c.indexOf(nameEQ) === 0) {
      try {
        return JSON.parse(decodeURIComponent(c.substring(nameEQ.length, c.length)))
      } catch (e) {
        return null
      }
    }
  }
  return null
}

const deleteCookie = (name) => {
  document.cookie = `${name}=; expires=Thu, 01 Jan 1970 00:00:00 UTC; path=/;`
}

function App() {  const [allSongs, setAllSongs] = useState([])
  const [userScores, setUserScores] = useState({})
  const [sortBy, setSortBy] = useState('cc-desc')
  const [isLoading, setIsLoading] = useState(true)
  const [error, setError] = useState(null)
  const [b30Data, setB30Data] = useState([])
    // Pack system state
  const [packData, setPackData] = useState(null)
  const [packOwnership, setPackOwnership] = useState({})
  const [memoryArchiveOwnership, setMemoryArchiveOwnership] = useState({})
  const [showOwnershipModal, setShowOwnershipModal] = useState(false)
  const [showExportImportModal, setShowExportImportModal] = useState(false)
  const [currentFilter, setCurrentFilter] = useState('all_packs')
  const [searchTerm, setSearchTerm] = useState('')
  const [playerName, setPlayerName] = useState(() => getPlayerNameCookie() || 'Player')
  useEffect(() => {
    setRandomBackground()
    loadInitialData()
    loadSavedScores()
    loadSavedOwnership()
  }, [])
  // Save scores to cookies whenever userScores changes
  useEffect(() => {
    if (Object.keys(userScores).length > 0) {
      setCookie('arcaea_scores', userScores, 36500) // Save for 100 years (practically forever)
      
      // Auto-calculate B30 whenever scores change
      calculateB30Auto()
    }
  }, [userScores])
  
  // Save pack ownership to cookies whenever it changes
  useEffect(() => {
    setCookie('arcaea_pack_ownership', packOwnership, 36500)
  }, [packOwnership])

  // Save memory archive ownership to cookies whenever it changes
  useEffect(() => {
    setCookie('arcaea_memory_ownership', memoryArchiveOwnership, 36500)
  }, [memoryArchiveOwnership])

  useEffect(() => {
    setPlayerNameCookie(playerName)
  }, [playerName])

  const setRandomBackground = () => {
    const bgCount = 8
    const randomBgIndex = Math.floor(Math.random() * bgCount) + 1
    document.body.className = ''
    document.body.classList.add(`background-${randomBgIndex}`)
  }
  const loadInitialData = async () => {
    try {
      // Load songs data
      const response = await fetch('/scores.csv')
      if (!response.ok) {
        throw new Error(`Network response was not ok: ${response.statusText}`)
      }
      const data = await response.text()
      const lines = data.split('\n')
      const headerLine = lines.shift().trim()
      const header = headerLine.split(',')

      const songs = lines.map(line => {
        const values = line.trim().split(',')
        if (values.length === header.length && line) {
          const song = {}
          header.forEach((h, i) => {
            song[h.trim()] = values[i] ? values[i].trim() : ''
          })
          return song
        }
        return null
      }).filter(Boolean)

      if (songs.length === 0) {
        throw new Error("No songs parsed. The CSV might be empty or malformed.")
      }

      setAllSongs(songs)
      
      // Load pack data
      try {
        const packResponse = await fetch('/song_packs.json')
        if (packResponse.ok) {
          const packData = await packResponse.json()
          setPackData(packData)
        }
      } catch (packError) {
        console.error('Error loading pack data:', packError)
        // Continue without pack data
      }
      
      setIsLoading(false)    } catch (error) {
      console.error('Error loading or parsing song data:', error)
      setError(error.message)
      setIsLoading(false)
    }
  }
  
  const loadSavedScores = () => {
    const savedScores = getCookie('arcaea_scores')
    if (savedScores) {
      setUserScores(savedScores)
      // Manually trigger B30 calculation with the loaded scores
      calculateB30WithScores(savedScores)
    }
  }

  const calculateB30Auto = () => {
    calculateB30WithScores(userScores)
  }

  const calculateB30WithScores = (scores) => {
    // Only calculate if we have scores
    if (Object.keys(scores).length === 0) return
    
    const getPlayRating = (score) => {
      score = parseInt(score.replace(/['']/g, ''))
      if (score >= 10000000) {
        return 2.0
      } else if (score > 9800000) {
        return 1 + (score - 9800000) / 200000
      } else {
        return (score - 9500000) / 300000
      }
    }
    
    const getPlayPotential = (cc, score) => {
      const playRating = getPlayRating(score)
      return Math.max(parseFloat(cc) + playRating, 0)
    }

    const scoresToCalculate = Object.values(scores).filter(s => s.Score)
    
    for (const score of scoresToCalculate) {
      score['Play Potential'] = getPlayPotential(score['Chart Constant'], score['Score'])
    }
    scoresToCalculate.sort((a, b) => b['Play Potential'] - a['Play Potential'])
    const top30 = scoresToCalculate.slice(0, 30)
    
    // Update B30 state for Analytics
    setB30Data(top30)
    // (No event dispatch needed)
  }

  const loadSavedOwnership = () => {
    const savedPackOwnership = getCookie('arcaea_pack_ownership')
    if (savedPackOwnership) {
      setPackOwnership(savedPackOwnership)
    } else {
      // Default ownership - user only owns free content by default
      setPackOwnership({
        main: true,
        world_extend_3: false,
        extend_archive_1: false,
        extend_archive_2: false,
        memory_archive: false,
      })
    }

    const savedMemoryOwnership = getCookie('arcaea_memory_ownership')
    if (savedMemoryOwnership) {
      setMemoryArchiveOwnership(savedMemoryOwnership)
    }
  }
  const showExportModal = () => {
    setShowExportImportModal(true)
  }

  const exportData = (type) => {
    let data, filename
    const dateStr = new Date().toISOString().split('T')[0]
    
    switch (type) {
      case 'scores':
        data = userScores
        filename = `arcaea_scores_${dateStr}.json`
        break
      case 'ownership':
        data = {
          packOwnership,
          memoryArchiveOwnership
        }
        filename = `arcaea_ownership_${dateStr}.json`
        break
      case 'all':
        data = {
          scores: userScores,
          packOwnership,
          memoryArchiveOwnership
        }
        filename = `arcaea_data_${dateStr}.json`
        break
      default:
        return
    }
    
    const dataStr = JSON.stringify(data, null, 2)
    const dataUri = 'data:application/json;charset=utf-8,' + encodeURIComponent(dataStr)
    
    const linkElement = document.createElement('a')
    linkElement.setAttribute('href', dataUri)
    linkElement.setAttribute('download', filename)
    linkElement.click()
    
    setShowExportImportModal(false)
  }
  const importData = (event) => {
    const file = event.target.files[0]
    if (file) {
      const reader = new FileReader()
      reader.onload = (e) => {
        try {
          const importedData = JSON.parse(e.target.result)
          
          // Check if it's the new format with separate data types
          if (importedData.scores || importedData.packOwnership) {
            // New format with separate sections
            if (importedData.scores) {
              setUserScores(importedData.scores)
            }
            if (importedData.packOwnership) {
              setPackOwnership(importedData.packOwnership)
            }
            if (importedData.memoryArchiveOwnership) {
              setMemoryArchiveOwnership(importedData.memoryArchiveOwnership)
            }
            if (importedData.playerName) setPlayerName(importedData.playerName)
            alert('Data imported successfully!')
          } else if (importedData.packOwnership && importedData.memoryArchiveOwnership) {
            // Ownership-only file
            setPackOwnership(importedData.packOwnership)
            setMemoryArchiveOwnership(importedData.memoryArchiveOwnership)
            alert('Ownership settings imported successfully!')
          } else {
            // Assume it's old format (scores only)
            setUserScores(importedData)
            alert('Scores imported successfully!')
          }
          
          setShowExportImportModal(false)
        } catch (error) {
          alert('Error importing data. Please check the file format.')
        }
      }
      reader.readAsText(file)
    }
    // Reset the input
    event.target.value = ''
  }

  const clearAllScores = () => {
    if (window.confirm('Are you sure you want to clear all your saved scores? This cannot be undone.')) {
      setUserScores({})
      deleteCookie('arcaea_scores')
      alert('All scores cleared!')
    }
  }

  const updateUserScore = (title, difficulty, score, songData) => {
    const key = `${title}-${difficulty}`
    if (score) {
      setUserScores(prev => ({
        ...prev,
        [key]: {
          ...songData,
          'Score': score
        }
      }))
    } else {
      setUserScores(prev => {
        const newScores = { ...prev }
        delete newScores[key]
        return newScores
      })
    }  }

  // Pack filtering and search utilities
  const getSongPack = (songTitle) => {
    if (!packData) return null
    
    for (const [packId, pack] of Object.entries(packData)) {
      if (pack.songs.includes(songTitle)) {
        return { id: packId, ...pack }
      }
    }
    return null
  }

  const isSongAvailable = (songTitle) => {
    const pack = getSongPack(songTitle)
    if (!pack) return false // If no pack data, do NOT show the song
    
    if (pack.type === 'free') return true
    if (pack.type === 'memory_archive') {
      return memoryArchiveOwnership[songTitle] || false
    }
    return packOwnership[pack.id] || false
  }

  const getFilteredSongs = () => {
    if (!allSongs) return []
    
    let filteredSongs = allSongs.filter(song => {
      // Apply search filter
      if (searchTerm && !song.Title.toLowerCase().includes(searchTerm.toLowerCase())) {
        return false
      }
      // Apply pack filter
      const pack = getSongPack(song.Title)
      if (currentFilter === 'all_packs') {
        return true
      } else if (currentFilter === 'custom') {
        return isSongAvailable(song.Title)
      } else if (currentFilter === 'free') {
        return pack && pack.type === 'free'
      } else if (currentFilter === 'world_extend') {
        return pack && (pack.type === 'free' || pack.id === 'world_extend_3')
      } else if (currentFilter === 'all_extend') {
        return pack && (pack.type === 'free' || pack.id === 'world_extend_3' || pack.id === 'extend_archive_1' || pack.id === 'extend_archive_2')
      } else if (currentFilter === 'all_except_memory') {
        return pack && pack.type !== 'memory_archive'
      } else if (currentFilter === 'story_packs_only') {
        return pack && pack.type === 'story'
      } else if (currentFilter === 'collaboration_packs_only') {
        return pack && pack.type === 'collaboration'
      } else {
        return true
      }
    })
    
    return filteredSongs
  }

  if (isLoading) {
    return <div className="loading">Loading songs...</div>
  }

  if (error) {
    return (
      <div className="error">
        <strong>Error:</strong> Could not load song data.
        <br />1. Make sure 'scores.csv' is in the project root.
        <br />2. If running locally, use a live server extension to avoid file access errors.
        <br />3. Check the browser's developer console (F12) for more details.
        <br />Details: {error}
      </div>
    )
  }

  return (
    <div className="app">
      <header>
        <h1>Arcaea Score Calculator</h1>
        <p>Enter your scores below and calculate your Best 30.</p>        <div className="data-management">
          <button onClick={showExportModal} className="data-btn export-btn">
            Export
          </button>
          <label className="data-btn import-btn">
            Import
            <input
              type="file"
              accept=".json"
              onChange={importData}
              style={{ display: 'none' }}
            />
          </label>
          <button onClick={clearAllScores} className="data-btn clear-btn">
            Clear All
          </button>
          <div className="score-count">
            {Object.keys(userScores).length} scores saved
          </div>
        </div>
      </header>
      
      <main>        <Controls 
          sortBy={sortBy} 
          setSortBy={setSortBy} 
          userScores={userScores}
          packData={packData}
          packOwnership={packOwnership}
          setPackOwnership={setPackOwnership}
          memoryArchiveOwnership={memoryArchiveOwnership}
          setMemoryArchiveOwnership={setMemoryArchiveOwnership}
          showOwnershipModal={showOwnershipModal}
          setShowOwnershipModal={setShowOwnershipModal}
          currentFilter={currentFilter}
          setCurrentFilter={setCurrentFilter}
          searchTerm={searchTerm}
          setSearchTerm={setSearchTerm}
        />
          <SongList 
          allSongs={getFilteredSongs()}
          sortBy={sortBy}
          updateUserScore={updateUserScore}
          savedScores={userScores}
          searchQuery={searchTerm}
        />
          <Results b30Data={b30Data} playerName={playerName} setPlayerName={setPlayerName} />
            {/* Analytics Section */}
          <Analytics 
            userScores={userScores}
            allSongs={allSongs}
            b30Data={b30Data}
            packData={packData}
          />
      </main>
      
      {/* Export/Import Modal */}
      {showExportImportModal && (
        <div className="modal-overlay" onClick={() => setShowExportImportModal(false)}>
          <div className="modal-content" onClick={(e) => e.stopPropagation()}>
            <div className="modal-header">
              <h3>Export/Import Data</h3>
              <button 
                className="modal-close" 
                onClick={() => setShowExportImportModal(false)}
              >
                ×
              </button>
            </div>
            <div className="modal-body">
              <div className="export-section">
                <h4>Export</h4>
                <div className="export-options">
                  <button 
                    onClick={() => exportData('scores')} 
                    className="modal-btn export-btn"
                  >
                    Export Scores Only
                  </button>
                  <button 
                    onClick={() => exportData('ownership')} 
                    className="modal-btn export-btn"
                  >
                    Export Ownership Only
                  </button>
                  <button 
                    onClick={() => exportData('all')} 
                    className="modal-btn export-btn primary"
                  >
                    Export Everything
                  </button>
                </div>
              </div>
              <div className="import-section">
                <h4>Import</h4>
                <p className="import-note">
                  Import any previously exported file. The app will automatically detect the format.
                </p>
                <label className="modal-btn import-btn">
                  Choose File to Import
                  <input
                    type="file"
                    accept=".json"
                    onChange={importData}
                    style={{ display: 'none' }}
                  />
                </label>
              </div>
            </div>
          </div>
        </div>
      )}
        <footer>
        <p className="cookie-notice">
          your scores are automatically saved forever and b30 updates in real-time!
        </p>
      </footer>
    </div>
  )
}

export default App
