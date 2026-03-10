import Hero from './components/Hero';
import Markets from './components/Markets';
import HowItWorks from './components/HowItWorks';
import Token from './components/Token';
import Header from './components/Header';
import Footer from './components/Footer';

function App() {
  return (
    <div className="min-h-screen bg-gradient-to-br from-bg-primary to-[#1a1f3a] font-inter text-text-primary">
      <Header />
      <main className="pt-24 md:pt-28">
        <Hero />
        <Markets />
        <HowItWorks />
        <Token />
      </main>
      <Footer />
    </div>
  );
}

export default App;