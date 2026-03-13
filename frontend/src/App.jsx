import { useState, useEffect } from 'react';

import Header from './components/Header';
import Footer from './components/Footer';
import { Home } from './pages/Home';
import { Lounge } from './pages/Lounge';
import { Markets } from './pages/Markets';
import { Baby } from './pages/Baby';
import { Portfolio } from './pages/Portfolio';

const currentPageToComponent = {
  '/': Home,
  '/lounge': Lounge,
  '/markets': Markets,
  '/baby': Baby,
  '/portfolio': Portfolio
};

function App() {

  const [currentPage, setCurrentPage] = useState('/');

  useEffect(() => {
    const handleHashChange = () => {
      const hash = window.location.hash.replace('#', '') || '/';
      setCurrentPage(hash);
    };

    // Initial load
    handleHashChange();

    // Listen for hash changes
    window.addEventListener('hashchange', handleHashChange);

    // Cleanup
    return () => window.removeEventListener('hashchange', handleHashChange);
  }, []);

  const handleNavigate = (path) => {
    setCurrentPage(path);
    window.location.hash = path;
  };

  const CurrentPageComponent = currentPageToComponent[currentPage] || Home;

  return (
    <div className="min-h-screen bg-gradient-to-br from-bg-primary to-[#1a1f3a] font-inter text-text-primary">
      <Header onNavigate={handleNavigate} />
      <main className="flex-1 pt-16 md:pt-24">
        <CurrentPageComponent onNavigate={handleNavigate} />
      </main>
      <Footer />
    </div>
  );
}

export default App;