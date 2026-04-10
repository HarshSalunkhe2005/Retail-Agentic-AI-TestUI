import { BrowserRouter, Routes, Route } from 'react-router-dom';
import Navbar from './components/Common/Navbar';
import Sidebar from './components/Common/Sidebar';
import Home from './pages/Home';
import WizardPage from './pages/Wizard';

export const API_BASE_URL = import.meta.env.VITE_API_URL ?? 'http://localhost:8000/api';

export default function App() {
  return (
    <BrowserRouter>
      <div className="min-h-screen bg-[#0a0e1a]">
        <Navbar />
        <div className="flex pt-16">
          <Sidebar />
          <main className="flex-1 ml-56">
            <Routes>
              <Route path="/" element={<Home />} />
              <Route path="/wizard" element={<WizardPage />} />
            </Routes>
          </main>
        </div>
      </div>
    </BrowserRouter>
  );
}
