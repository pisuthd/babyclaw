import Hero from "../components/Home/Hero"
import TopMarkets from "../components/Home/TopMarkets";
import HowItWorks from "../components/Home/HowItWorks";

export const Home = ({ onNavigate }) => {

    return (
        <div className="flex min-h-screen flex-col">
            <Hero onNavigate={onNavigate} />
            <TopMarkets/>
            <HowItWorks/>
        </div>
    );
};