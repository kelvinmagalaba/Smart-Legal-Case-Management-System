/* ==========================================================================
   SLCMS - Business Intelligence Reports & Analytics
   ========================================================================== */

const ReportsView = {
  render() {
    return `
      <div class="animate-fade">
        <div class="view-header">
          <div>
            <h1 class="page-title">Executive Reports & Practice Analytics</h1>
            <p style="color: var(--color-text-secondary); font-size: 0.88rem;">
              Firm-wide operational KPIs, litigation success rates, revenue realization and associate utilization
            </p>
          </div>
          <div class="flex items-center gap-3">
            <button class="btn btn-secondary" onclick="App.showToast('Generating signed PDF audit report...', 'info')">
              <span>Export PDF Report</span>
            </button>
            <button class="btn btn-gold" onclick="App.showToast('Exporting dataset to Excel...', 'success')">
              <span>Export Excel (XLSX)</span>
            </button>
          </div>
        </div>

        <!-- Filter Bar -->
        <div class="filter-bar">
          <div class="filter-group">
            <label class="form-label" style="margin-bottom:0;">Date Range:</label>
            <select class="form-control" style="width: 170px;">
              <option>Current Fiscal Year (2026)</option>
              <option>Last 12 Months</option>
              <option>Q3 2026 (Current)</option>
              <option>All Historical Records</option>
            </select>
          </div>
          <div class="filter-group">
            <label class="form-label" style="margin-bottom:0;">Practice Area:</label>
            <select class="form-control" style="width: 180px;">
              <option>All Practice Groups</option>
              <option>Commercial Litigation</option>
              <option>Intellectual Property</option>
              <option>Employment Law</option>
              <option>Corporate & Tax</option>
            </select>
          </div>
        </div>

        <!-- Charts Grid -->
        <div class="grid grid-cols-2 gap-6" style="margin-bottom: 1.5rem;">
          <div class="card">
            <div class="card-header">
              <h3 class="card-title">Case Realization & Practice Breakdown</h3>
              <span class="badge badge-active">Active Portfolio</span>
            </div>
            <div class="chart-card-body">
              <canvas id="reportPracticeChart"></canvas>
            </div>
          </div>

          <div class="card">
            <div class="card-header">
              <h3 class="card-title">Monthly Revenue Realization & Collections ($)</h3>
              <span class="badge badge-gold">2026 Fiscal Trend</span>
            </div>
            <div class="chart-card-body">
              <canvas id="reportRevenueChart"></canvas>
            </div>
          </div>
        </div>

        <!-- Summary Performance Table -->
        <div class="card">
          <div class="card-header">
            <h3 class="card-title">Practice Group Key Performance Indicators</h3>
          </div>
          <div class="table-container">
            <table class="data-table">
              <thead>
                <tr>
                  <th>Practice Group</th>
                  <th>Active Matters</th>
                  <th>Avg. Days to Resolution</th>
                  <th>Success / Settlement Rate</th>
                  <th>Total Billed (YTD)</th>
                  <th>Realization Rate</th>
                </tr>
              </thead>
              <tbody>
                <tr>
                  <td><strong>Commercial Litigation</strong></td>
                  <td>2</td>
                  <td>210 days</td>
                  <td><strong style="color: var(--color-success);">88.5%</strong></td>
                  <td>$142,500</td>
                  <td>94.2%</td>
                </tr>
                <tr>
                  <td><strong>Intellectual Property</strong></td>
                  <td>1</td>
                  <td>340 days</td>
                  <td><strong style="color: var(--color-success);">91.0%</strong></td>
                  <td>$195,000</td>
                  <td>98.0%</td>
                </tr>
                <tr>
                  <td><strong>Employment Law</strong></td>
                  <td>1</td>
                  <td>120 days</td>
                  <td><strong style="color: var(--color-success);">85.0%</strong></td>
                  <td>$24,500</td>
                  <td>89.4%</td>
                </tr>
                <tr>
                  <td><strong>Corporate & Tax</strong></td>
                  <td>1</td>
                  <td>180 days</td>
                  <td><strong style="color: var(--color-success);">100.0%</strong></td>
                  <td>$88,200</td>
                  <td>100.0%</td>
                </tr>
              </tbody>
            </table>
          </div>
        </div>
      </div>
    `;
  },

  initCharts() {
    const ctxPractice = document.getElementById('reportPracticeChart');
    if (ctxPractice) {
      new Chart(ctxPractice, {
        type: 'polarArea',
        data: {
          labels: ['Litigation', 'IP Patents', 'Real Estate', 'Employment', 'Tax & Corporate'],
          datasets: [{
            data: [4, 3, 2, 2, 1],
            backgroundColor: ['#102A43', '#C89B3C', '#2563EB', '#16A34A', '#7C3AED']
          }]
        },
        options: {
          responsive: true,
          maintainAspectRatio: false,
          plugins: { legend: { position: 'right' } }
        }
      });
    }

    const ctxRev = document.getElementById('reportRevenueChart');
    if (ctxRev) {
      new Chart(ctxRev, {
        type: 'line',
        data: {
          labels: ['Mar', 'Apr', 'May', 'Jun', 'Jul', 'Aug'],
          datasets: [
            {
              label: 'Billed Fees ($)',
              data: [45000, 58000, 62000, 78000, 89000, 94000],
              borderColor: '#102A43',
              backgroundColor: 'rgba(16, 42, 67, 0.1)',
              fill: true,
              tension: 0.3
            },
            {
              label: 'Collected ($)',
              data: [42000, 51000, 59000, 71000, 82000, 88000],
              borderColor: '#C89B3C',
              backgroundColor: 'transparent',
              borderDash: [5, 5],
              tension: 0.3
            }
          ]
        },
        options: {
          responsive: true,
          maintainAspectRatio: false,
          scales: { y: { beginAtZero: true } }
        }
      });
    }
  }
};
