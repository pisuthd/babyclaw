import Hero from "../components/Home/Hero"
import TopMarkets from "../components/Home/TopMarkets";


export const Home = ({ onNavigate }) => {

    return (
        <div className="flex min-h-screen flex-col">
            <Hero onNavigate={onNavigate} />
            <TopMarkets/> 
        </div>
    );
};
