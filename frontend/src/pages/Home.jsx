import Hero from "../components/Home/Hero"
import TopMarkets from "../components/Home/TopMarkets";
import HowItWorks from "../components/Home/HowItWorks";
import CTASection from "../components/Home/CTASection";

export const Home = ({ onNavigate }) => {

    return (
        <div className="flex min-h-screen flex-col">
            <Hero onNavigate={onNavigate} />
            <TopMarkets/>
            <HowItWorks/>
            <CTASection onNavigate={onNavigate}/>
        </div>
    );
};