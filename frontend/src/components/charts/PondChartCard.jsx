import React from 'react'
import {
  Chart as ChartJS,
  ArcElement,
  BarElement,
  CategoryScale,
  LinearScale,
  Tooltip,
  Legend,
} from 'chart.js'
import { Doughnut, Bar } from 'react-chartjs-2'

ChartJS.register(ArcElement, BarElement, CategoryScale, LinearScale, Tooltip, Legend)
ChartJS.defaults.font.family = 'inherit'

const buildChartData = (items) => {
  const labels = items.map((item) => item.label)
  const values = items.map((item) => Number(item.value) || 0)
  const colors = items.map((item) => item.color || '#0ea5e9')
  return { labels, values, colors }
}

const PondChartCard = ({
  prefix,
  title,
  type = 'doughnut',
  data = [],
  total = 0,
  legend = true,
  barOptions = {},
}) => {
  const { labels, values, colors } = buildChartData(data)
  const baseClass = `${prefix}_chart-card`

  if (type === 'bar') {
    const chartData = {
      labels,
      datasets: [
        {
          data: values,
          backgroundColor: colors,
          borderRadius: 10,
          borderSkipped: false,
        },
      ],
    }

    const options = {
      responsive: true,
      maintainAspectRatio: false,
      animation: { duration: 350 },
      plugins: {
        legend: { display: false },
        tooltip: {
          callbacks: {
            label: (context) => `${context.label}: ${context.formattedValue}`,
          },
        },
      },
      scales: {
        x: {
          ticks: { color: '#64748b', font: { family: 'inherit' } },
          grid: { display: false },
        },
        y: {
          beginAtZero: true,
          ticks: { color: '#64748b', font: { family: 'inherit' }, precision: 0 },
          grid: { color: '#e2e8f0' },
        },
      },
      ...barOptions,
    }

    return (
      <article className={`${baseClass} ${prefix}_chart-card--chartjs`}>
        <h4>{title}</h4>
        <div className={`${prefix}_chart-body ${prefix}_chart-body--bar`}>
          <div className={`${prefix}_chart-canvas ${prefix}_chart-canvas--bar`}>
            <Bar data={chartData} options={options} />
          </div>
        </div>
      </article>
    )
  }

  const chartData = {
    labels,
    datasets: [
      {
        data: values,
        backgroundColor: colors,
        borderWidth: 0,
        hoverOffset: 6,
      },
    ],
  }

  const options = {
    responsive: true,
    maintainAspectRatio: false,
    cutout: '68%',
    animation: { duration: 350 },
    plugins: {
      legend: { display: false },
      tooltip: {
        callbacks: {
          label: (context) => `${context.label}: ${context.formattedValue}`,
        },
      },
    },
  }

  return (
    <article className={`${baseClass} ${prefix}_chart-card--chartjs`}>
      <h4>{title}</h4>
      <div className={`${prefix}_chart-body ${prefix}_chart-body--doughnut`}>
        <div className={`${prefix}_donut-wrap`}>
          <div className={`${prefix}_chart-donut`}>
            <div className={`${prefix}_chart-canvas ${prefix}_chart-canvas--doughnut`}>
              <Doughnut data={chartData} options={options} />
            </div>
            <div className={`${prefix}_donut-inner`}>{total}</div>
          </div>

          {legend && (
            <div className={`${prefix}_legend`}>
              {data.map((item) => (
                <div key={item.label} className={`${prefix}_legend-item`}>
                  <span className={`${prefix}_legend-dot`} style={{ backgroundColor: item.color }} />
                  <span>{item.label}</span>
                  <strong>{item.value}</strong>
                </div>
              ))}
            </div>
          )}
        </div>
      </div>
    </article>
  )
}

export default PondChartCard