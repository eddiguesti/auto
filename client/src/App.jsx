import { Routes, Route } from 'react-router-dom'
import Home from './pages/Home'
import Chapter from './pages/Chapter'
import Export from './pages/Export'

function App() {
  return (
    <div className="min-h-screen bg-parchment">
      <Routes>
        <Route path="/" element={<Home />} />
        <Route path="/chapter/:chapterId" element={<Chapter />} />
        <Route path="/export" element={<Export />} />
      </Routes>
    </div>
  )
}

export default App
