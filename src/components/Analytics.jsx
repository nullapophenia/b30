import { useState, useEffect } from 'react'
import { Bar } from 'react-chartjs-2';
import { Chart, CategoryScale, LinearScale, BarElement, Title, Tooltip, Legend } from 'chart.js';
Chart.register(CategoryScale, LinearScale, BarElement, Title, Tooltip, Legend);

function getCCGroup(cc) {
  const num = Math.floor(cc);
  const dec = cc - num;
  if (num < 7) return null;
  if (dec >= 0.7 && num <= 11) return `${num}+`;
  return `${num}`;
}

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
    const difficulties = ['PST', 'PRS', 'FTR', 'ETR', 'BYD'];
    const ccGroups = ['7', '7+', '8', '8+', '9', '9+', '10', '10+', '11', '11+', '12'];

    const grouped = {};
    difficulties.forEach(diff => {
      grouped[diff] = {};
      ccGroups.forEach(ccg => {
        grouped[diff][ccg] = [];
      });
    });

    (scores || []).forEach(song => {
      const diff = song.Difficulty;
      const cc = parseFloat(song['Chart Constant']);
      const ccg = getCCGroup(cc);
      if (difficulties.includes(diff) && ccGroups.includes(ccg)) {
        grouped[diff][ccg].push(song);
      }
    });

    const summaryRows = [];
    difficulties.forEach(diff => {
      ccGroups.forEach(ccg => {
        const arr = grouped[diff][ccg];
        if (arr.length === 0) return;
        const avgPlayRating = arr.reduce((a, b) => a + b['Play Potential'], 0) / arr.length;
        const avgDelta = arr.reduce((a, b) => a + (b['Play Potential'] - parseFloat(b['Chart Constant'])), 0) / arr.length;
        const avgScore = arr.reduce((a, b) => a + parseInt(b.Score.replace(/['']/g, '')), 0) / arr.length;
        const best = Math.max(...arr.map(s => s['Play Potential']));
        const worst = Math.min(...arr.map(s => s['Play Potential']));
        summaryRows.push({
          diff,
          ccg,
          avgPlayRating: avgPlayRating.toFixed(2),
          avgDelta: avgDelta.toFixed(2),
          avgScore: Math.round(avgScore).toLocaleString(),
          count: arr.length,
          best: best.toFixed(2),
          worst: worst.toFixed(2)
        });
      });
    });

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
      summaryRows,
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

  return (
    <div className="analytics-section">
      <h2>Performance Analytics</h2>
      <div className="analytics-card glassy-purple">
        <h3>Difficulty Performance Profile</h3>
        <p>
          A comprehensive breakdown of your average performance across distinct difficulty levels. 
          This helps identify skill plateaus and strong suits by difficulty.
        </p>
        <div style={{ maxWidth: '700px', margin: '0 auto' }}>
          {/* Grouped Bar Chart */}
          <Bar data={{ labels: ['FTR 9', 'FTR 10', 'FTR 11'], datasets: [
            { label: 'Avg Play Rating', data: [10.2, 10.8, 11.3], backgroundColor: 'rgba(162,89,230,0.7)' },
            { label: 'Avg Delta', data: [0.3, 0.1, -0.2], backgroundColor: 'rgba(162,89,230,0.3)' }
          ] }} options={{ responsive: true, plugins: { legend: { position: 'top' }, title: { display: false } }, scales: { x: { grid: { color: 'rgba(255,255,255,0.1)' } }, y: { grid: { color: 'rgba(255,255,255,0.1)' } } } }} />
        </div>
        <div className="difficulty-summary">
          {/* Summary table as shown previously */}
          <table style={{ width: '100%', marginTop: '1em', background: 'rgba(255,255,255,0.05)', borderRadius: '10px' }}>
            <thead><tr><th>Difficulty</th><th>Avg Play Rating</th><th>Avg Delta</th><th>Avg Score</th><th>Count</th><th>Best</th><th>Worst</th></tr></thead>
            <tbody>
              {analytics.summaryRows.map(row => (
                <tr key={row.diff + row.ccg}>
                  <td>{row.diff} {row.ccg}</td>
                  <td>{row.avgPlayRating}</td>
                  <td>{row.avgDelta}</td>
                  <td>{row.avgScore}</td>
                  <td>{row.count}</td>
                  <td>{row.best}</td>
                  <td>{row.worst}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  )
}

export default Analytics
