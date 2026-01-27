import { Routes, Route } from 'react-router-dom'
import Home from './pages/Home'
import Chapter from './pages/Chapter'
import Export from './pages/Export'
import VoiceChat from './pages/VoiceChat'
import Landing from './pages/Landing'

function App() {
  return (
    <div className="min-h-screen bg-parchment">
      <Routes>
        <Route path="/" element={<Landing />} />
        <Route path="/home" element={<Home />} />
        <Route path="/chapter/:chapterId" element={<Chapter />} />
        <Route path="/export" element={<Export />} />
        <Route path="/voice" element={<VoiceChat />} />
      </Routes>
    </div>
  )
}

export default App
