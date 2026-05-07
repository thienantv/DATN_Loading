import React, { useEffect, useState } from 'react'
import { Link } from 'react-router-dom'
import pondService from '../../services/api'
import seasonService from '../../services/api'
import expenseService from '../../services/api'

const ManagerDashboard = () => {
  const [ponds, setPonds] = useState([])
  const [seasons, setSeasons] = useState([])
  const [expenseStats, setExpenseStats] = useState(null)

  useEffect(() => {
    async function load() {
      try {
        const pondsRes = await pondService.getPonds()
        setPonds(pondsRes.data || [])
      } catch (e) {
        setPonds([])
      }
      try {
        const seasonsRes = await seasonService.getSeasons()
        setSeasons(seasonsRes.data || [])
      } catch (e) {
        setSeasons([])
      }
      try {
        const statsRes = await expenseService.getExpenseStats()
        setExpenseStats(statsRes.data || null)
      } catch (e) {
        setExpenseStats(null)
      }
    }
    load()
  }, [])

  return (
    <div className="container">
      <h2>Manager Dashboard</h2>
      <div style={{ display: 'flex', gap: 16, marginBottom: 16 }}>
        <div className="card">
          <h3>Ponds</h3>
          <p>{ponds.length}</p>
          <Link to="/manager/ponds">Manage ponds</Link>
        </div>
        <div className="card">
          <h3>Seasons</h3>
          <p>{seasons.length}</p>
          <Link to="/seasons">View seasons</Link>
        </div>
        <div className="card">
          <h3>Total Expenses</h3>
          <p>{expenseStats ? expenseStats.total_expense : '—'}</p>
          <Link to="/manager/ponds">Expenses</Link>
        </div>
      </div>

      <section>
        <h4>Recent ponds</h4>
        <ul>
          {ponds.slice(0, 5).map((p) => (
            <li key={p.id}>{p.name || p.pond_name || p.pond_code || `Pond ${p.pond_id}`}</li>
          ))}
        </ul>
      </section>
    </div>
  )
}

export default ManagerDashboard
