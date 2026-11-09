import Nav from '../components/Nav.jsx';
import Hero from '../components/Hero.jsx';
import Metrics from '../components/Metrics.jsx';
import Tracks from '../components/Tracks.jsx';
import PaymentDemo from '../components/PaymentDemo.jsx';
import StoreLoop from '../components/StoreLoop.jsx';
import BuyPack from '../components/BuyPack.jsx';
import LossLayer from '../components/LossLayer.jsx';
import Stack from '../components/Stack.jsx';
import Judging from '../components/Judging.jsx';
import Footer from '../components/Footer.jsx';
import { Reveal } from '../lib/useReveal.jsx';

export default function Home() {
  return (
    <div className="relative">
      <div className="grid-bg" aria-hidden="true" />
      <div className="noise" aria-hidden="true" />

      <Nav />

      <main className="relative z-[2]">
        <Hero />

        <div className="wrap pb-4">
          <Reveal>
            <Metrics />
          </Reveal>
        </div>

        <Tracks />
        <PaymentDemo />
        <StoreLoop />
        <BuyPack />
        <LossLayer />
        <Stack />
        <Judging />
        <Footer />
      </main>
    </div>
  );
}