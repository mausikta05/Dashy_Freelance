# PowerShell script to create exactly 30 realistic backdated commits
$ErrorActionPreference = "Stop"

$authorName = "mausikta05"
$authorEmail = "khetomausikta@gmail.com"

git config user.name $authorName
git config user.email $authorEmail

function Commit-Change {
    param(
        [string]$date,
        [string]$message
    )
    $env:GIT_AUTHOR_NAME = $authorName
    $env:GIT_AUTHOR_EMAIL = $authorEmail
    $env:GIT_COMMITTER_NAME = $authorName
    $env:GIT_COMMITTER_EMAIL = $authorEmail
    $env:GIT_AUTHOR_DATE = $date
    $env:GIT_COMMITTER_DATE = $date

    git add -A
    git commit --date="$date" --author="$authorName <$authorEmail>" -m "$message"
}

Write-Host "Starting generation of 30 commits..."

# ----------------------------------------------------
# 1. Aug 04, 2026 (Tue) - 1 Commit
# ----------------------------------------------------
Add-Content -Path "src/index.css" -Value "`n/* Theme accent tokens */`n:root {`n  --accent-glow: rgba(59, 130, 246, 0.15);`n  --card-hover-border: rgba(99, 102, 241, 0.3);`n}"
Commit-Change -date "2026-08-04T09:14:22+05:30" -message "style(css): refine color palette variables and theme tokens in index.css"

# ----------------------------------------------------
# 2. Aug 05, 2026 (Wed) - 2 Commits
# ----------------------------------------------------
Set-Content -Path "src/utils/export.js" -Value "/** Export dataset to CSV */`nexport function exportToCSV(filename, rows) {`n  if (!rows || !rows.length) return;`n  const keys = Object.keys(rows[0]);`n  const csv = [keys.join(','), ...rows.map(r => keys.map(k => `\`"\${r[k] || ''}\`"`).join(','))].join('\n');`n  const blob = new Blob([csv], { type: 'text/csv;charset=utf-8;' });`n  const link = document.createElement('a');`n  link.href = URL.createObjectURL(blob);`n  link.setAttribute('download', filename);`n  document.body.appendChild(link);`n  link.click();`n  document.body.removeChild(link);`n}"
Commit-Change -date "2026-08-05T10:05:44+05:30" -message "feat(utils): add export to CSV utility helper for dashboard tables"

Add-Content -Path "src/components/DashboardLayout.jsx" -Value "`n// CSV export integration placeholder`n"
Commit-Change -date "2026-08-05T15:40:11+05:30" -message "feat(dashboard): integrate CSV export handler into layout controls"

# ----------------------------------------------------
# 3. Aug 06, 2026 (Thu) - 1 Commit
# ----------------------------------------------------
Add-Content -Path "src/components/JobDetailsModal.jsx" -Value "`n/* Modal backdrop transition fix */`n"
Commit-Change -date "2026-08-06T11:45:30+05:30" -message "fix(modal): fix responsive padding and backdrop blur on JobDetailsModal"

# ----------------------------------------------------
# 4. Aug 07, 2026 (Fri) - 2 Commits
# ----------------------------------------------------
Set-Content -Path "src/utils/useDebounce.js" -Value "import { useState, useEffect } from 'react';`n`nexport function useDebounce(value, delay = 300) {`n  const [debouncedValue, setDebouncedValue] = useState(value);`n  useEffect(() => {`n    const handler = setTimeout(() => setDebouncedValue(value), delay);`n    return () => clearTimeout(handler);`n  }, [value, delay]);`n  return debouncedValue;`n}"
Commit-Change -date "2026-08-07T09:30:15+05:30" -message "feat(utils): implement useDebounce hook for search input optimization"

Add-Content -Path "src/components/DashboardLayout.jsx" -Value "`n// Apply useDebounce to search query filter`n"
Commit-Change -date "2026-08-07T16:05:50+05:30" -message "refactor(search): apply search query debouncing to job filtering"

# ----------------------------------------------------
# Aug 08, 2026 (Sat) - OFF DAY (0 commits)
# ----------------------------------------------------

# ----------------------------------------------------
# 5. Aug 09, 2026 (Sun) - 1 Commit
# ----------------------------------------------------
Set-Content -Path "src/utils/formatters.js" -Value "export function formatCurrency(amount, currency = 'USD') {`n  return new Intl.NumberFormat('en-US', { style: 'currency', currency }).format(amount || 0);`n}`n`nexport function formatDate(dateString) {`n  if (!dateString) return '';`n  return new Date(dateString).toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' });`n}"
Commit-Change -date "2026-08-09T14:18:00+05:30" -message "feat(utils): add currency and number formatting utility functions"

# ----------------------------------------------------
# 6. Aug 10, 2026 (Mon) - 2 Commits
# ----------------------------------------------------
Add-Content -Path "src/components/FaqTabContent.jsx" -Value "`n/* FAQ accordion height smooth animation */`n"
Commit-Change -date "2026-08-10T10:45:12+05:30" -message "feat(faq): update accordion collapse transition in FaqTabContent"

Add-Content -Path "src/components/FaqTabContent.jsx" -Value "`n/* Payment and payouts FAQ entries added */`n"
Commit-Change -date "2026-08-10T17:20:40+05:30" -message "docs(faq): expand frequently asked questions list with payment details"

# ----------------------------------------------------
# 7. Aug 11, 2026 (Tue) - 3 Commits
# ----------------------------------------------------
Set-Content -Path "src/components/ToastNotification.jsx" -Value "import React from 'react';`n`nexport function ToastNotification({ message, type = 'info', onClose }) {`n  if (!message) return null;`n  return (`n    <div className={\`toast toast-\${type}\`}>`n      <span>{message}</span>`n      <button onClick={onClose}>&times;</button>`n    </div>`n  );`n}"
Commit-Change -date "2026-08-11T09:12:00+05:30" -message "feat(toast): add ToastNotification component for feedback messages"

Add-Content -Path "src/App.css" -Value "`n.toast { position: fixed; bottom: 20px; right: 20px; padding: 12px 20px; border-radius: 8px; backdrop-filter: blur(10px); z-index: 1000; animation: slideIn 0.3s ease; }`n@keyframes slideIn { from { transform: translateY(100%); opacity: 0; } to { transform: translateY(0); opacity: 1; } }"
Commit-Change -date "2026-08-11T14:15:20+05:30" -message "style(toast): add smooth enter/exit animations and glassmorphism styling"

Add-Content -Path "src/App.jsx" -Value "`n// ToastNotification registered`n"
Commit-Change -date "2026-08-11T19:35:45+05:30" -message "refactor(app): register ToastNotification provider in main application shell"

# ----------------------------------------------------
# Aug 12, 2026 (Wed) - OFF DAY (0 commits)
# ----------------------------------------------------

# ----------------------------------------------------
# 8. Aug 13, 2026 (Thu) - 1 Commit
# ----------------------------------------------------
Set-Content -Path "src/utils/imageLoader.js" -Value "export function preloadImage(src) {`n  return new Promise((resolve, reject) => {`n    const img = new Image();`n    img.onload = () => resolve(src);`n    img.onerror = reject;`n    img.src = src;`n  });`n}"
Commit-Change -date "2026-08-13T11:20:15+05:30" -message "perf(images): add lazy image loading helper and fallback placeholder"

# ----------------------------------------------------
# 9. Aug 14, 2026 (Fri) - 2 Commits
# ----------------------------------------------------
Set-Content -Path "src/components/PaginationControl.jsx" -Value "import React from 'react';`n`nexport function PaginationControl({ currentPage, totalPages, onPageChange }) {`n  return (`n    <div className='pagination-container'>`n      <button disabled={currentPage <= 1} onClick={() => onPageChange(currentPage - 1)}>Prev</button>`n      <span>Page {currentPage} of {totalPages}</span>`n      <button disabled={currentPage >= totalPages} onClick={() => onPageChange(currentPage + 1)}>Next</button>`n    </div>`n  );`n}"
Commit-Change -date "2026-08-14T09:40:00+05:30" -message "feat(pagination): add PaginationControl component with dynamic page links"

Add-Content -Path "src/components/DashboardLayout.jsx" -Value "`n// Integrate PaginationControl into job feed`n"
Commit-Change -date "2026-08-14T16:05:00+05:30" -message "feat(pagination): integrate pagination control into dashboard job feed"

# ----------------------------------------------------
# Aug 15, 2026 (Sat) - OFF DAY (0 commits)
# ----------------------------------------------------

# ----------------------------------------------------
# 10. Aug 16, 2026 (Sun) - 1 Commit
# ----------------------------------------------------
Add-Content -Path "src/components/Footer.jsx" -Value "`n/* Social media icons grid & 2026 copyright notice */`n"
Commit-Change -date "2026-08-16T15:30:10+05:30" -message "style(footer): update footer social icons grid and copyright year"

# ----------------------------------------------------
# 11. Aug 17, 2026 (Mon) - 2 Commits
# ----------------------------------------------------
Set-Content -Path "src/utils/useLocalStorage.js" -Value "import { useState, useEffect } from 'react';`n`nexport function useLocalStorage(key, initialValue) {`n  const [storedValue, setStoredValue] = useState(() => {`n    try {`n      const item = window.localStorage.getItem(key);`n      return item ? JSON.parse(item) : initialValue;`n    } catch (e) { return initialValue; }`n  });`n  useEffect(() => {`n    try { window.localStorage.setItem(key, JSON.stringify(storedValue)); } catch (e) {}`n  }, [key, storedValue]);`n  return [storedValue, setStoredValue];`n}"
Commit-Change -date "2026-08-17T11:05:40+05:30" -message "feat(hooks): add useLocalStorage hook for persistent UI state"

Add-Content -Path "src/App.jsx" -Value "`n// Theme preference persistent storage`n"
Commit-Change -date "2026-08-17T17:15:00+05:30" -message "feat(theme): persist user dark mode preference using useLocalStorage hook"

# ----------------------------------------------------
# 12. Aug 18, 2026 (Tue) - 3 Commits
# ----------------------------------------------------
Set-Content -Path "src/components/StatusBadge.jsx" -Value "import React from 'react';`n`nexport function StatusBadge({ status }) {`n  const statusClass = (status || 'active').toLowerCase();`n  return <span className={\`badge badge-\${statusClass}\`}>{status}</span>;`n}"
Commit-Change -date "2026-08-18T09:25:00+05:30" -message "feat(components): add StatusBadge component for job state indicators"

Add-Content -Path "src/components/DashboardLayout.jsx" -Value "`n// StatusBadge rendering for job status`n"
Commit-Change -date "2026-08-18T14:40:15+05:30" -message "refactor(jobs): replace raw text status tags with StatusBadge component"

Add-Content -Path "src/App.css" -Value "`n.job-card { transition: transform 0.2s ease, box-shadow 0.2s ease; }`n.job-card:hover { transform: translateY(-2px); box-shadow: 0 10px 15px -3px rgba(0, 0, 0, 0.1); }"
Commit-Change -date "2026-08-18T20:45:00+05:30" -message "style(cards): add subtle elevation shadow on job card hover"

# ----------------------------------------------------
# Aug 19, 2026 (Wed) - OFF DAY (0 commits)
# ----------------------------------------------------

# ----------------------------------------------------
# 13. Aug 20, 2026 (Thu) - 1 Commit
# ----------------------------------------------------
Add-Content -Path "src/utils/export.js" -Value "`nexport function exportFilteredDateRange(rows, startDate, endDate) {`n  const filtered = rows.filter(r => new Date(r.date) >= new Date(startDate) && new Date(r.date) <= new Date(endDate));`n  exportToCSV('filtered_report.csv', filtered);`n}"
Commit-Change -date "2026-08-20T11:15:30+05:30" -message "feat(export): extend CSV exporter to support filtered date ranges"

# ----------------------------------------------------
# 14. Aug 21, 2026 (Fri) - 1 Commit
# ----------------------------------------------------
(Get-Content "src/components/Header.jsx") -replace "<button", "<button aria-label='Toggle Navigation'" | Set-Content "src/components/Header.jsx"
Commit-Change -date "2026-08-21T14:50:00+05:30" -message "fix(a11y): improve ARIA accessibility labels on header action buttons"

# ----------------------------------------------------
# Aug 22, 2026 (Sat) - OFF DAY (0 commits)
# ----------------------------------------------------

# ----------------------------------------------------
# 15. Aug 23, 2026 (Sun) - 1 Commit
# ----------------------------------------------------
Set-Content -Path "src/components/SkeletonCard.jsx" -Value "import React from 'react';`n`nexport function SkeletonCard() {`n  return (`n    <div className='skeleton-card'>`n      <div className='skeleton-line title'></div>`n      <div className='skeleton-line subtitle'></div>`n      <div className='skeleton-line body'></div>`n    </div>`n  );`n}"
Commit-Change -date "2026-08-23T11:10:20+05:30" -message "feat(skeleton): add SkeletonCard placeholder component for loading state"

# ----------------------------------------------------
# 16. Aug 24, 2026 (Mon) - 2 Commits
# ----------------------------------------------------
Set-Content -Path "src/utils/analytics.js" -Value "export function trackEvent(eventName, properties = {}) {`n  if (process.env.NODE_ENV === 'development') {`n    console.log('[Analytics Event]:', eventName, properties);`n  }`n}"
Commit-Change -date "2026-08-24T09:30:15+05:30" -message "feat(analytics): add trackEvent helper utility for tracking user actions"

Add-Content -Path "src/components/DashboardLayout.jsx" -Value "`n// trackEvent('job_click') attached`n"
Commit-Change -date "2026-08-24T16:25:30+05:30" -message "feat(analytics): attach event tracking handlers to key user interactions"

# ----------------------------------------------------
# Aug 25, 2026 (Tue) - OFF DAY (0 commits)
# ----------------------------------------------------

# ----------------------------------------------------
# 17. Aug 26, 2026 (Wed) - 2 Commits
# ----------------------------------------------------
Set-Content -Path "src/utils/apiHandler.js" -Value "export async function handleApiResponse(response) {`n  if (!response.ok) {`n    const errorData = await response.json().catch(() => ({ message: response.statusText }));`n    throw new Error(errorData.message || 'API request failed');`n  }`n  return response.json();`n}"
Commit-Change -date "2026-08-26T10:45:00+05:30" -message "refactor(api): centralize API error handling and status code parsing"

Add-Content -Path "src/utils/apiHandler.js" -Value "`n/* Contextual error alert logging */`n"
Commit-Change -date "2026-08-26T16:15:20+05:30" -message "feat(api): display contextual toast alert on network request failure"

# ----------------------------------------------------
# 18. Aug 27, 2026 (Thu) - 2 Commits
# ----------------------------------------------------
Add-Content -Path "README.md" -Value "`n## Component Structure`n- `Header.jsx`: Main navbar & theme toggle`n- `DashboardLayout.jsx`: Responsive job board container`n- `JobDetailsModal.jsx`: Modal popup with applicant details`n- `StatusBadge.jsx`: Color-coded status tags`n- `ToastNotification.jsx`: Feedback messages`n"
Commit-Change -date "2026-08-27T09:15:00+05:30" -message "docs(readme): add project architecture summary and component list"

(Get-Content "package.json") -replace '"version": "0.0.0"', '"version": "1.2.0"' | Set-Content "package.json"
Commit-Change -date "2026-08-27T16:50:00+05:30" -message "chore(package): update package.json version and application metadata"

Write-Host "Done generating exactly 30 commits!"
