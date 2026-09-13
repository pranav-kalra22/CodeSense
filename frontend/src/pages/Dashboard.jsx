import React, { useState, useEffect, useCallback } from 'react';
import { useCountUp } from '../hooks/useCountUp';
import LiveFeed from '../components/LiveFeed';
import { useWebSocket } from '../hooks/useWebSocket'; 
import { LineChart, Line, BarChart, Bar, XAxis, YAxis, Tooltip, ResponsiveContainer } from 'recharts';
import API from '../config/api';

const StatCard = ({ title, value, delay, isAlert, suffix = "" }) => {
  const displayValue = useCountUp(value || 0);

  return (
    <div className="animate-in" style={{ animationDelay: `${delay}ms` }}>
      <div className="void-card gradient-border-card" style={{ padding: '1.25rem', height: '100%' }}>
        <h3 className="text-muted" style={{ marginBottom: '0.25rem', letterSpacing: '0.05em', textTransform: 'uppercase', fontSize: '0.7rem' }}>
          {title}
        </h3>
        <div className="text-large" style={{ color: isAlert ? 'var(--red)' : 'var(--white)' }}>
          {displayValue}{suffix}
        </div>
      </div>
    </div>
  );
};

export default function Dashboard() {
  const [stats, setStats] = useState({ total_reviews: 0, total_comments: 0, total_repos: 0, avg_comments_per_review: 0, acceptance_rate: 0 });
  const [barWidths, setBarWidths] = useState({ error: 0, warning: 0, info: 0 });
  const [trendData, setTrendData] = useState([]);
  const [topIssues, setTopIssues] = useState([]);

  const { messages } = useWebSocket(API.WS);
  const token = localStorage.getItem('void_token');

  const fetchDashboardData = useCallback(async () => {
    const headers = token 
      ? { 'Authorization': `Bearer ${token}`, 'Content-Type': 'application/json' }
      : { 'Content-Type': 'application/json' };

    try {
      const [dashRes, trendsRes, issuesRes] = await Promise.all([
        fetch(`${API.BASE}/api/v1/analytics/dashboard`, { headers }),
        fetch(`${API.BASE}/api/v1/analytics/trends`, { headers }),
        fetch(`${API.BASE}/api/v1/analytics/top-issues`, { headers })
      ]);

      if (dashRes.ok) {
        const data = await dashRes.json();
        if (data && data.stats) {
          const s = data.stats;
          setStats({
            total_reviews: s.TotalReviews ?? s.total_reviews ?? 0,
            total_comments: s.TotalComments ?? s.total_comments ?? 0,
            total_repos: s.TotalRepos ?? s.total_repos ?? 0,
            avg_comments_per_review: Number(Number(s.AvgCommentsPerReview ?? s.avg_comments_per_review ?? 0).toFixed(1)),
            acceptance_rate: Number(Number(s.AcceptanceRate ?? s.acceptance_rate ?? 0).toFixed(1)) 
          });

          const errs = s.error_count ?? s.ErrorCount ?? 0;
          const warns = s.warning_count ?? s.WarningCount ?? 0;
          const infos = s.info_count ?? s.InfoCount ?? 0;
          const totalSev = errs + warns + infos;

          setTimeout(() => {
            if (totalSev > 0) {
              setBarWidths({ error: (errs / totalSev) * 100, warning: (warns / totalSev) * 100, info: (infos / totalSev) * 100 });
            } else {
              setBarWidths({ error: 0, warning: 0, info: 0 });
            }
          }, 150);
        }
      }

      if (trendsRes.ok) {
        const tData = await trendsRes.json();
        const rawTrends = tData.reviews_by_day || tData.ReviewsByDay || [];
        
        if (rawTrends.length > 0) {
          setTrendData(rawTrends.map(t => ({ 
            date: t.date || t.Date || t.day || t.Day || 'Unknown', 
            // Map it to 'count' now instead of 'rate'
            count: t.count ?? t.Count ?? t.rate ?? t.Rate ?? 0 
          })));
        } else {
          // Updated mock data to look like realistic counts instead of percentages
          setTrendData([
            { date: 'Mon', count: 4 }, { date: 'Tue', count: 7 }, { date: 'Wed', count: 5 }, { date: 'Thu', count: 12 }, { date: 'Fri', count: 8 }
          ]);
        }
      }

      if (issuesRes.ok) {
        const rawIssues = await issuesRes.json();
        
        if (rawIssues && rawIssues.length > 0) {
          setTopIssues(rawIssues.map(i => ({ category: i.category || i.Category, count: i.count || i.Count })));
        } else {
          setTopIssues([
            { category: 'security', count: 42 }, { category: 'naming', count: 38 }, { category: 'logic', count: 25 }, { category: 'style', count: 19 }
          ]);
        }
      }
    } catch (err) {
      console.error("Dashboard fetch error:", err);
    }
  }, [token]);

  useEffect(() => {
    fetchDashboardData();
  }, [fetchDashboardData]);

  useEffect(() => {
    if (messages.length > 0) {
      const latestMessage = messages[messages.length - 1];
      if (latestMessage.type === 'review_completed' || latestMessage.status === 'completed') {
        fetchDashboardData();
      }
    }
  }, [messages, fetchDashboardData]);

  // --- DEBUG LOGS PLACED SAFELY BEFORE THE RETURN ---
  console.log('DEBUG trendData:', trendData);
  console.log('DEBUG topIssues:', topIssues);

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: '2rem' }}>
      
      <header className="animate-in" style={{ marginBottom: '1rem' }}>
        <h1 style={{ 
          fontFamily: 'var(--mono)', color: 'var(--white)', fontSize: '2.2rem', 
          fontWeight: 600, letterSpacing: '-0.03em', margin: 0 
        }}>
          Dashboard 
        </h1>
      </header>
      
      <section>
        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(5, 1fr)', gap: '1rem', marginBottom: '2rem' }}>
          <StatCard title="Total Reviews" value={stats.total_reviews} delay={0} />
          <StatCard title="AI Comments" value={stats.total_comments} delay={80} />
          <StatCard title="Acceptance Rate" value={stats.acceptance_rate} suffix="%" delay={160} />
          <StatCard title="Monitored Repos" value={stats.total_repos} delay={240} />
          <StatCard title="Avg Comments" value={stats.avg_comments_per_review} delay={320} />
        </div>

        <div className="animate-in" style={{ animationDelay: '400ms', marginBottom: '2rem' }}>
          <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: '0.75rem' }}>
            <span className="text-muted" style={{ fontSize: '0.85rem' }}>Severity Ratio</span> 
            <div style={{ display: 'flex', gap: '1rem' }}>
              <div style={{ display: 'flex', alignItems: 'center', gap: '0.4rem' }}><span className="dot dot-red" style={{ width: 6, height: 6 }}/> <span className="text-muted" style={{ fontSize: '0.8rem' }}>Error</span></div>
              <div style={{ display: 'flex', alignItems: 'center', gap: '0.4rem' }}><span className="dot dot-amber" style={{ width: 6, height: 6 }}/> <span className="text-muted" style={{ fontSize: '0.8rem' }}>Warn</span></div>
              <div style={{ display: 'flex', alignItems: 'center', gap: '0.4rem' }}><span className="dot dot-blue" style={{ width: 6, height: 6 }}/> <span className="text-muted" style={{ fontSize: '0.8rem' }}>Info</span></div>
            </div>
          </div>
          
          <div style={{ display: 'flex', height: '4px', borderRadius: '2px', overflow: 'hidden', background: 'rgba(255,255,255,0.05)' }}>
            <div style={{ width: `${barWidths.error}%`, background: 'var(--red)', transition: 'width 1s cubic-bezier(0.16, 1, 0.3, 1)' }} />
            <div style={{ width: `${barWidths.warning}%`, background: 'var(--amber)', transition: 'width 1s cubic-bezier(0.16, 1, 0.3, 1) 0.1s' }} />
            <div style={{ width: `${barWidths.info}%`, background: 'var(--blue)', transition: 'width 1s cubic-bezier(0.16, 1, 0.3, 1) 0.2s' }} />
          </div>
        </div>
      </section>

      <section className="animate-in" style={{ display: 'grid', gridTemplateColumns: '2fr 1fr', gap: '1.5rem', animationDelay: '440ms' }}>
        
        {/* --- LINE CHART --- */}
        {/* --- LINE CHART (System Throughput) --- */}
        <div className="void-card" style={{ padding: '1.5rem' }}>
          <div style={{ marginBottom: '1.5rem' }}>
            <h2 className="text-mono" style={{ fontSize: '1.1rem', color: 'var(--white)' }}>System Throughput</h2>
            <p className="text-muted" style={{ fontSize: '0.8rem', marginTop: '0.25rem' }}>Volume of PRs processed per day.</p>
          </div>
          <ResponsiveContainer width="100%" height={220}>
            <LineChart data={trendData}>
              <XAxis 
                dataKey="date" 
                stroke="rgba(255,255,255,0.1)" 
                tick={{ fill: '#737373', fontSize: 11, fontFamily: 'var(--font-mono)' }} 
                tickMargin={10} 
              />
              <YAxis 
                stroke="rgba(255,255,255,0.1)" 
                tick={{ fill: '#737373', fontSize: 11, fontFamily: 'var(--font-mono)' }} 
                tickMargin={10}
                allowDecimals={false} /* Ensures the axis only shows whole numbers */
              />
              <Tooltip 
                contentStyle={{ background: 'rgba(10, 10, 10, 0.9)', border: '1px solid rgba(255,255,255,0.08)', borderRadius: '4px', color: '#f0f0f0', fontFamily: 'var(--font-mono)' }} 
                itemStyle={{ color: 'var(--accent-1)' }} 
              />
              <Line 
                type="monotone" 
                dataKey="count" /* Map to the new 'count' key */
                name="Reviews" /* Makes the tooltip look professional */
                stroke="var(--accent-1)" 
                strokeWidth={3} 
                dot={{ fill: '#000', stroke: '#a855f7', strokeWidth: 2, r: 4 }} 
                activeDot={{ r: 6, fill: '#06b6d4' }} 
              />           
            </LineChart>
          </ResponsiveContainer>
        </div>

        {/* --- BAR CHART --- */}
        <div className="void-card" style={{ padding: '1.5rem' }}>
          <div style={{ marginBottom: '1.5rem' }}>
            <h2 className="text-mono" style={{ fontSize: '1.1rem', color: 'var(--white)' }}>Top Categories</h2>
            <p className="text-muted" style={{ fontSize: '0.8rem', marginTop: '0.25rem' }}>Most frequent violations.</p>
          </div>
          <ResponsiveContainer width="100%" height={220}>
            <BarChart layout="vertical" data={topIssues} margin={{ left: 10, right: 10 }}>
              <defs>
                <linearGradient id="neonBar" x1="0" y1="0" x2="1" y2="0">
                  <stop offset="0%" stopColor="var(--accent-1)" />
                  <stop offset="50%" stopColor="var(--accent-2)" />
                  <stop offset="100%" stopColor="var(--accent-3)" />
                </linearGradient>
              </defs>
              <XAxis type="number" hide />
              <YAxis type="category" dataKey="category" stroke="rgba(255,255,255,0.1)" tick={{ fill: '#a3a3a3', fontSize: 11, fontFamily: 'var(--font-mono)' }} width={70} axisLine={false} tickLine={false} />
              <Tooltip cursor={{ fill: 'rgba(255,255,255,0.02)' }} contentStyle={{ background: 'rgba(10, 10, 10, 0.9)', border: '1px solid rgba(255,255,255,0.08)', borderRadius: '4px', color: '#f0f0f0', fontFamily: 'var(--font-mono)' }} />
              <Bar dataKey="count" fill="url(#neonBar)" radius={[0, 4, 4, 0]} barSize={20} />
            </BarChart>
          </ResponsiveContainer>
        </div>

      </section>

      <section className="animate-in" style={{ animationDelay: '480ms' }}>
        <div style={{ marginBottom: '1rem' }}>
          <h2 className="text-mono" style={{ fontSize: '1.1rem', color: 'var(--white)' }}>Live Processing Queue</h2>
        </div>
        <LiveFeed />
      </section>
    </div>
  );
}