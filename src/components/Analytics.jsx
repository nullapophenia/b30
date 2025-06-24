import { useState, useEffect } from 'react'

const Analytics = ({ userScores, allSongs, b30Data, packData }) => {
  const [analytics, setAnalytics] = useState(null)

  useEffect(() => {
    if (Object.keys(userScores).length > 0 && allSongs.length > 0 && b30Data?.length > 0) {
      calculateAnalytics()
    }
  }, [userScores, allSongs, b30Data, packData])

  const calculateAnalytics = () => {
    const scores = Object.values(userScores).filter(s => s.Score)
    if (scores.length === 0) return

    // Calculate current PTT
    const avgB30 = b30Data.reduce((sum, song) => sum + song['Play Potential'], 0) / 30
    const currentPTT = parseFloat(avgB30.toFixed(2))

    // PTT milestones
    const milestones = [9.00, 10.00, 11.00, 12.00, 12.50, 13.00, 13.50, 14.00, 14.50, 15.00]
    const nextMilestone = milestones.find(m => m > currentPTT) || null
    const pttToNext = nextMilestone ? (nextMilestone - currentPTT).toFixed(2) : 'MAX'

    // 31st best score analysis
    const allPotentials = scores.map(s => s['Play Potential']).sort((a, b) => b - a)
    const score31st = allPotentials[30] ? allPotentials[30].toFixed(2) : 'N/A'
    const lowestB30 = Math.min(...b30Data.map(s => s['Play Potential']))

    // Improvement suggestions - songs in B30 that can be improved
    const improvementSuggestions = b30Data
      .filter(song => {
        const score = parseInt(song.Score.replace(/['']/g, ''))
        const cc = parseFloat(song['Chart Constant'])
        // Focus on songs where there's room for improvement (not PMs and realistic improvement)
        return score < 10000000 && cc >= 10.0 && song['Play Potential'] < cc + 1.9
      })
      .sort((a, b) => a['Play Potential'] - b['Play Potential'])
      .slice(0, 5)
      .map(song => {
        const score = parseInt(song.Score.replace(/['']/g, ''))
        const cc = parseFloat(song['Chart Constant'])
        // Calculate potential gain if they get a better score
        const targetScore = Math.min(score + 200000, 10000000) // Realistic improvement
        const targetPlayRating = targetScore >= 10000000 ? 2.0 : 
          targetScore > 9800000 ? 1 + (targetScore - 9800000) / 200000 : 
          (targetScore - 9500000) / 300000
        const targetPotential = cc + targetPlayRating
        const potentialGain = targetPotential - song['Play Potential']
        return { 
          ...song, 
          potentialGain: potentialGain.toFixed(3),
          targetScore: targetScore.toLocaleString()
        }
      })

    // Low-hanging fruit - songs just outside B30
    const nonB30Songs = scores.filter(song => 
      !b30Data.some(b30Song => 
        b30Song.Title === song.Title && 
        b30Song.Difficulty === song.Difficulty
      )
    )
    
    const lowHangingFruit = nonB30Songs
      .filter(song => {
        const score = parseInt(song.Score.replace(/['']/g, ''))
        const cc = parseFloat(song['Chart Constant'])
        const potential = song['Play Potential']
        // Songs that are close to B30 level and can realistically be improved
        return potential > lowestB30 - 0.5 && score < 9950000 && cc >= 10.0
      })
      .sort((a, b) => b['Play Potential'] - a['Play Potential'])
      .slice(0, 10)
      .map(song => {
        const score = parseInt(song.Score.replace(/['']/g, ''))
        const cc = parseFloat(song['Chart Constant'])
        // Calculate if PM would make it into B30
        const pmPotential = cc + 2.0
        const wouldMakeB30 = pmPotential > lowestB30
        return { ...song, wouldMakeB30, pmPotential: pmPotential.toFixed(2) }
      })

    // Score distribution
    const scoreRanges = {
      'PM (10,000,000+)': scores.filter(s => parseInt(s.Score.replace(/['']/g, '')) >= 10000000).length,
      'EX+ (9,900,000+)': scores.filter(s => {
        const score = parseInt(s.Score.replace(/['']/g, ''))
        return score >= 9900000 && score < 10000000
      }).length,
      'EX (9,800,000+)': scores.filter(s => {
        const score = parseInt(s.Score.replace(/['']/g, ''))
        return score >= 9800000 && score < 9900000
      }).length,
      'AA (9,500,000+)': scores.filter(s => {
        const score = parseInt(s.Score.replace(/['']/g, ''))
        return score >= 9500000 && score < 9800000
      }).length,
      'A (8,000,000+)': scores.filter(s => {
        const score = parseInt(s.Score.replace(/['']/g, ''))
        return score >= 8000000 && score < 9500000
      }).length,
    }

    // Difficulty preferences - performance by CC range
    const difficultyStats = {}
    scores.forEach(song => {
      const cc = parseFloat(song['Chart Constant'])
      const score = parseInt(song.Score.replace(/['']/g, ''))
      const ccRange = Math.floor(cc)
      
      if (!difficultyStats[ccRange]) {
        difficultyStats[ccRange] = { 
          count: 0, 
          avgScore: 0, 
          totalScore: 0, 
          avgPotential: 0, 
          totalPotential: 0,
          pmCount: 0 
        }
      }
      
      difficultyStats[ccRange].count++
      difficultyStats[ccRange].totalScore += score
      difficultyStats[ccRange].totalPotential += song['Play Potential']
      if (score >= 10000000) difficultyStats[ccRange].pmCount++
    })

    Object.keys(difficultyStats).forEach(cc => {
      const stats = difficultyStats[cc]
      stats.avgScore = Math.round(stats.totalScore / stats.count)
      stats.avgPotential = (stats.totalPotential / stats.count).toFixed(2)
      stats.pmRate = ((stats.pmCount / stats.count) * 100).toFixed(1)
    })

    // Pack performance analysis
    const packPerformance = {}
    if (packData) {
      Object.entries(packData).forEach(([packId, pack]) => {
        const packScores = scores.filter(score => 
          pack.songs && pack.songs.some(song => 
            song.title === score.Title && song.difficulty === score.Difficulty
          )
        )
        
        if (packScores.length > 0) {
          const avgPotential = packScores.reduce((sum, s) => sum + s['Play Potential'], 0) / packScores.length
          const pmCount = packScores.filter(s => parseInt(s.Score.replace(/['']/g, '')) >= 10000000).length
          const totalSongs = pack.songs ? pack.songs.length : 0
          const completionRate = totalSongs > 0 ? (packScores.length / totalSongs * 100).toFixed(1) : '0.0'
          
          packPerformance[packId] = {
            name: pack.name,
            avgPotential: avgPotential.toFixed(2),
            scoreCount: packScores.length,
            pmCount,
            totalSongs,
            completionRate
          }
        }
      })
    }

    // Consistency analysis
    const potentials = b30Data.map(s => s['Play Potential'])
    const mean = potentials.reduce((sum, p) => sum + p, 0) / potentials.length
    const variance = potentials.reduce((sum, p) => sum + Math.pow(p - mean, 2), 0) / potentials.length
    const stdDev = Math.sqrt(variance)

    // Skill gaps - CCs where they have few scores
    const ccGaps = []
    for (let cc = 8; cc <= 13; cc++) {
      const ccScores = scores.filter(s => Math.floor(parseFloat(s['Chart Constant'])) === cc)
      if (ccScores.length < 3) {
        ccGaps.push({ cc, count: ccScores.length })
      }
    }

    // Outlier detection - unusually high/low scores
    const outliers = []
    scores.forEach(song => {
      const cc = parseFloat(song['Chart Constant'])
      const potential = song['Play Potential']
      const expectedRange = [cc + 0.5, cc + 1.8] // Typical range for most players
      
      if (potential > expectedRange[1] + 0.3) {
        outliers.push({ ...song, type: 'high', deviation: (potential - expectedRange[1]).toFixed(2) })
      } else if (potential < expectedRange[0] - 0.3) {
        outliers.push({ ...song, type: 'low', deviation: (expectedRange[0] - potential).toFixed(2) })
      }
    })

    // Milestone progress
    const pmCount = scoreRanges['PM (10,000,000+)']
    const highCCClears = scores.filter(s => parseFloat(s['Chart Constant']) >= 11.0).length
    const veryHighCCClears = scores.filter(s => parseFloat(s['Chart Constant']) >= 12.0).length
    
    const milestoneProgress = {
      pm100: { current: pmCount, target: 100, progress: Math.min(pmCount / 100 * 100, 100).toFixed(1) },
      cc11Plus: { current: highCCClears, target: 50, progress: Math.min(highCCClears / 50 * 100, 100).toFixed(1) },
      cc12Plus: { current: veryHighCCClears, target: 30, progress: Math.min(veryHighCCClears / 30 * 100, 100).toFixed(1) }
    }

    setAnalytics({
      currentPTT,
      nextMilestone,
      pttToNext,
      score31st,
      lowestB30,
      improvementSuggestions,
      scoreRanges,
      difficultyStats,
      stdDev,
      lowHangingFruit,
      totalScores: scores.length,
      packPerformance: Object.entries(packPerformance)
        .sort(([,a], [,b]) => parseFloat(b.avgPotential) - parseFloat(a.avgPotential))
        .slice(0, 6),
      ccGaps,
      outliers: outliers.slice(0, 5),
      milestoneProgress    })
  }

  if (!analytics) return null

  return (    <div className="analytics-section">
      <h2>performance analytics</h2>
      
      <div className="analytics-grid">
        {/* PTT Progress */}
        <div className="analytics-card">
          <h3>progress</h3>          <div className="analytics-content">
            <div className="ptt-current">
              <span className="label">current ptt:</span>
              <span className="value">{analytics.currentPTT}</span>
            </div>
            {analytics.nextMilestone && analytics.pttToNext !== 'MAX' ? (
              <div className="ptt-next">
                <span className="label">to {analytics.nextMilestone}:</span>
                <span className="value">+{analytics.pttToNext}</span>
              </div>
            ) : (
              <div className="ptt-next">
                <span className="label">status:</span>
                <span className="value max-ptt">max ptt!</span>
              </div>
            )}
            <div className="ptt-details">
              <div>lowest b30: {analytics.lowestB30.toFixed(2)}</div>
              <div>31st best: {analytics.score31st}</div>
            </div>
          </div>
        </div>        {/* Improvement Suggestions */}
        <div className="analytics-card">
          <h3>improvements</h3>
          <div className="analytics-content">
            {analytics.score31st !== 'N/A' && (
              <div className="improvement-header">
                your 31st best score is {analytics.score31st}. improve these songs to raise your b30:
              </div>
            )}
            {analytics.improvementSuggestions.length > 0 ? (
              <div className="improvement-list">
                {analytics.improvementSuggestions.map((song, idx) => (
                  <div key={idx} className="improvement-item">
                    <div className="song-info">
                      <div className="song-title">{song.Title}</div>
                      <div className="song-details">
                        {song['Chart Constant']} | current: {song['Play Potential'].toFixed(2)} → target: {song.targetScore}
                      </div>
                    </div>
                    <div className="potential-gain">+{song.potentialGain}</div>
                  </div>
                ))}
              </div>
            ) : (
              <div className="no-improvements">your b30 is very strong!</div>
            )}
          </div>
        </div>

        {/* Low Hanging Fruit */}
        <div className="analytics-card">
          <h3>easy wins</h3>
          <div className="analytics-content">
            <div className="fruit-header">songs just outside b30 that could make it in:</div>
            {analytics.lowHangingFruit.length > 0 ? (
              <div className="fruit-list">
                {analytics.lowHangingFruit.slice(0, 5).map((song, idx) => (
                  <div key={idx} className="fruit-item">
                    <div className="song-title">{song.Title}</div>                    <div className="song-potential">
                      {parseFloat(song['Chart Constant']).toFixed(1)} | {Number(song['Play Potential']).toFixed(2)}
                      {song.wouldMakeB30 && <span className="would-make-b30"> → b30!</span>}
                    </div>
                    {song.wouldMakeB30 && (
                      <div className="pm-potential">pm = {song.pmPotential}</div>
                    )}
                  </div>
                ))}
              </div>
            ) : (
              <div className="no-fruit">no obvious improvements found</div>
            )}
          </div>
        </div>

        {/* Score Distribution */}
        <div className="analytics-card">
          <h3>score distribution</h3>
          <div className="analytics-content">
            <div className="score-distribution">
              {Object.entries(analytics.scoreRanges).map(([range, count]) => (
                <div key={range} className="score-range">
                  <span className="range-label">{range.toLowerCase()}</span>
                  <span className="range-count">{count}</span>
                </div>
              ))}
            </div>
            <div className="total-scores">total scores: {analytics.totalScores}</div>
          </div>
        </div>

        {/* Consistency */}
        <div className="analytics-card">
          <h3>standard deviation</h3>
          <div className="analytics-content">
            <div className="consistency-metric">
              <span className="label">standard deviation:</span>
              <span className="value">{analytics.stdDev.toFixed(3)}</span>
            </div>
            <div className="consistency-desc">
              {analytics.stdDev < 0.3 ? "extremely consistent!" : 
               analytics.stdDev < 0.5 ? "very consistent!" : 
               analytics.stdDev < 1.0 ? "good consistency" : 
               "room for consistency improvement"}
            </div>
          </div>
        </div>

        {/* Difficulty Analysis */}
        <div className="analytics-card">
          <h3>difficulty analysis</h3>
          <div className="analytics-content">
            <div className="difficulty-stats">
              {Object.entries(analytics.difficultyStats)
                .sort(([a], [b]) => parseInt(b) - parseInt(a))
                .slice(0, 6)
                .map(([cc, stats]) => (
                <div key={cc} className="difficulty-item">
                  <div className="cc-info">
                    <span className="cc-label">{cc}+</span>
                    <span className="cc-count">{stats.count} songs</span>
                  </div>                  <div className="cc-performance">
                    <div className="cc-avg">{(stats.avgScore / 1000000).toFixed(2)}m avg</div>
                    <div className="cc-potential">{stats.avgPotential} ptt</div>
                    <div className="cc-pm-rate">{stats.pmRate}% pm</div>
                  </div>
                </div>
              ))}
            </div>
          </div>
        </div>

        {/* Pack Performance */}
        {analytics.packPerformance.length > 0 && (
          <div className="analytics-card">
            <h3>pack performance</h3>
            <div className="analytics-content">
              <div className="pack-stats">
                {analytics.packPerformance.map(([packId, pack]) => (
                  <div key={packId} className="pack-item">
                    <div className="pack-name">{pack.name}</div>
                    <div className="pack-details">
                      <span>avg: {pack.avgPotential}</span>
                      <span>{pack.scoreCount}/{pack.totalSongs} ({pack.completionRate}%)</span>
                      <span>{pack.pmCount} pms</span>
                    </div>
                  </div>
                ))}
              </div>
            </div>
          </div>
        )}

        {/* Skill Gaps */}
        {analytics.ccGaps.length > 0 && (
          <div className="analytics-card">
            <h3>skill gaps</h3>
            <div className="analytics-content">
              <div className="gap-header">chart constants where you have few scores:</div>
              <div className="gap-list">
                {analytics.ccGaps.map((gap, idx) => (
                  <div key={idx} className="gap-item">
                    <span className="gap-cc">{gap.cc}+</span>
                    <span className="gap-count">{gap.count} songs</span>
                  </div>
                ))}
              </div>
            </div>
          </div>
        )}        {/* Outliers */}
        {analytics.outliers.length > 0 && (
          <div className="analytics-card">
            <h3>outliers</h3>
            <div className="analytics-content">
              <div className="outlier-list">
                {analytics.outliers.map((outlier, idx) => (
                  <div key={idx} className={`outlier-item ${outlier.type}`}>
                    <div className="song-title">{outlier.Title}</div>
                    <div className="outlier-details">
                      {parseFloat(outlier['Chart Constant']).toFixed(1)} | {Number(outlier['Play Potential']).toFixed(2)}
                      <span className={`outlier-badge ${outlier.type}`}>
                        {outlier.type === 'high' ? 'high' : 'low'} {outlier.deviation}
                      </span>
                    </div>
                  </div>
                ))}
              </div>
            </div>
          </div>
        )}

        {/* Milestone Progress */}
        <div className="analytics-card">
          <h3>clear goals</h3>
          <div className="analytics-content">
            <div className="milestone-list">
              <div className="milestone-item">
                <div className="milestone-label">100 pms</div>
                <div className="milestone-progress">
                  <div className="progress-bar">
                    <div 
                      className="progress-fill" 
                      style={{ width: `${analytics.milestoneProgress.pm100.progress}%` }}
                    ></div>
                  </div>
                  <span className="milestone-text">
                    {analytics.milestoneProgress.pm100.current}/100 ({analytics.milestoneProgress.pm100.progress}%)
                  </span>
                </div>
              </div>
              
              <div className="milestone-item">
                <div className="milestone-label">50 cc11+ clears</div>
                <div className="milestone-progress">
                  <div className="progress-bar">
                    <div 
                      className="progress-fill" 
                      style={{ width: `${analytics.milestoneProgress.cc11Plus.progress}%` }}
                    ></div>
                  </div>
                  <span className="milestone-text">
                    {analytics.milestoneProgress.cc11Plus.current}/50 ({analytics.milestoneProgress.cc11Plus.progress}%)
                  </span>
                </div>
              </div>
              
              <div className="milestone-item">
                <div className="milestone-label">30 cc12+ clears</div>
                <div className="milestone-progress">
                  <div className="progress-bar">
                    <div 
                      className="progress-fill" 
                      style={{ width: `${analytics.milestoneProgress.cc12Plus.progress}%` }}
                    ></div>
                  </div>
                  <span className="milestone-text">
                    {analytics.milestoneProgress.cc12Plus.current}/30 ({analytics.milestoneProgress.cc12Plus.progress}%)
                  </span>
                </div>
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  )
}

export default Analytics
