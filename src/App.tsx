import { useState } from 'react'
import { RecordsProvider } from '@/context/RecordsContext'
import { BottomNav } from '@/components/layout/BottomNav'
import { HomePage } from '@/pages/HomePage'
import { RecordFormPage } from '@/pages/RecordFormPage'
import { RecordsPage } from '@/pages/RecordsPage'
import { StatisticsPage } from '@/pages/StatisticsPage'

function AppContent() {
  const [currentPage, setCurrentPage] = useState('home')

  const handleNavigate = (page: string) => {
    setCurrentPage(page)
  }

  const renderPage = () => {
    switch (currentPage) {
      case 'home':
        return <HomePage onNavigate={handleNavigate} />
      case 'record':
        return <RecordFormPage type="expense" onNavigate={handleNavigate} />
      case 'income':
        return <RecordFormPage type="income" onNavigate={handleNavigate} />
      case 'expense':
        return <RecordFormPage type="expense" onNavigate={handleNavigate} />
      case 'records':
        return <RecordsPage onNavigate={handleNavigate} />
      case 'statistics':
        return <StatisticsPage onNavigate={handleNavigate} />
      default:
        return <HomePage onNavigate={handleNavigate} />
    }
  }

  const showBottomNav = !['income', 'expense'].includes(currentPage)

  return (
    <div className="min-h-screen bg-slate-50">
      {renderPage()}
      {showBottomNav && (
        <BottomNav currentPage={currentPage} onNavigate={handleNavigate} />
      )}
    </div>
  )
}

function App() {
  return (
    <RecordsProvider>
      <AppContent />
    </RecordsProvider>
  )
}

export default App
