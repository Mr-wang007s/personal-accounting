import { useState } from 'react'
import { RecordsProvider, useRecords } from '@/context/RecordsContext'
import { SyncProvider, useSync } from '@/context/SyncContext'
import { BottomNav } from '@/components/layout/BottomNav'
import { HomePage } from '@/pages/HomePage'
import { RecordFormPage } from '@/pages/RecordFormPage'
import { RecordsPage } from '@/pages/RecordsPage'
import { StatisticsPage } from '@/pages/StatisticsPage'
import { SyncSettings } from '@/components/sync/SyncSettings'
import { SyncStatusBar } from '@/components/sync/SyncStatusBar'

function AppContent() {
  const [currentPage, setCurrentPage] = useState('home')
  const [showSyncSettings, setShowSyncSettings] = useState(false)
  const { refreshData } = useRecords()
  const { syncState } = useSync()

  const handleNavigate = (page: string) => {
    if (page === 'sync') {
      setShowSyncSettings(true)
      return
    }
    setCurrentPage(page)
  }

  // 同步成功后刷新数据
  if (syncState === 'success') {
    refreshData()
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
      {/* 同步状态栏 */}
      <div className="fixed top-0 left-0 right-0 z-50 px-4 pt-2 pb-1 bg-slate-50">
        <SyncStatusBar />
      </div>
      
      {/* 主内容区域 */}
      <div className="pt-12">
        {renderPage()}
      </div>
      
      {showBottomNav && (
        <BottomNav currentPage={currentPage} onNavigate={handleNavigate} />
      )}

      {/* 同步设置弹窗 */}
      {showSyncSettings && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 p-4">
          <SyncSettings onClose={() => setShowSyncSettings(false)} />
        </div>
      )}
    </div>
  )
}

function App() {
  return (
    <SyncProvider>
      <RecordsProvider>
        <AppContent />
      </RecordsProvider>
    </SyncProvider>
  )
}

export default App
