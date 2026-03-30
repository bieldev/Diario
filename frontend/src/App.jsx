import { useEffect } from 'react'
import { Routes, Route } from 'react-router-dom'
import { useQuery } from '@tanstack/react-query'
import { dashboardApi } from './api/dashboard.js'
import { useNightMode } from './hooks/useNightMode.js'
import { BottomNav } from './components/BottomNav.jsx'
import { InstallBanner } from './components/InstallBanner.jsx'
import { HomeScreen }    from './screens/HomeScreen.jsx'
import { FeedingScreen } from './screens/FeedingScreen.jsx'
import { DiaperScreen }  from './screens/DiaperScreen.jsx'
import { SleepScreen }   from './screens/SleepScreen.jsx'
import { HistoryScreen } from './screens/HistoryScreen.jsx'
import { StatsScreen }   from './screens/StatsScreen.jsx'
import { GrowthScreen }         from './screens/GrowthScreen.jsx'
import { NotificationsScreen }  from './screens/NotificationsScreen.jsx'
import { PhotosScreen }         from './screens/PhotosScreen.jsx'
import { DesignPreviewScreen }  from './screens/DesignPreviewScreen.jsx'

export default function App() {
  const isDark = useNightMode()

  // Sincroniza theme-color da barra do sistema com o dark mode
  useEffect(() => {
    const meta = document.getElementById('theme-color-meta')
    if (meta) meta.content = isDark ? '#130f2a' : '#7C3AED'
  }, [isDark])

  const { data } = useQuery({
    queryKey: ['dashboard'],
    queryFn: dashboardApi.get,
    refetchInterval: 10_000,
    retry: false,
  })

  const activeType = data?.active?.type || null

  return (
    <div className="max-w-[430px] mx-auto h-screen flex flex-col bg-[#F5F0FF] dark:bg-[#130f2a] relative overflow-hidden transition-colors duration-400">
      <InstallBanner />
      <main className="flex-1 overflow-hidden" style={{ paddingTop: 'env(safe-area-inset-top, 0px)', paddingBottom: 'calc(4rem + env(safe-area-inset-bottom, 0px))' }}>
        <Routes>
          <Route path="/"          element={<HomeScreen />} />
          <Route path="/mamar"     element={<FeedingScreen />} />
          <Route path="/fralda"    element={<DiaperScreen />} />
          <Route path="/sono"      element={<SleepScreen />} />
          <Route path="/historico"   element={<HistoryScreen />} />
          <Route path="/stats"       element={<StatsScreen />} />
          <Route path="/crescimento"  element={<GrowthScreen />} />
          <Route path="/notificacoes" element={<NotificationsScreen />} />
          <Route path="/fotos"        element={<PhotosScreen />} />
          <Route path="/preview"      element={<DesignPreviewScreen />} />
        </Routes>
      </main>
      <BottomNav activeType={activeType} />
    </div>
  )
}
