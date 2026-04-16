import React, { useEffect, useState } from 'react';
import { Link } from 'react-router-dom';
import { Calendar, ArrowRight, MapPin, Clock, CheckCircle, Loader2 } from 'lucide-react';
import PublicLayout from '../components/PublicLayout';
import VenueCard from '../components/VenueCard';
import { fetchVenues } from '../services/dataService';
import { Venue } from '../types';
import { APP_CONFIG } from '../config/appConfig';

const LandingPage: React.FC = () => {
  const [venues, setVenues] = useState<Venue[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const load = async () => {
      try {
        const data = await fetchVenues();
        setVenues(data.filter((v) => v.isActive));
      } catch {
        setVenues([]);
      } finally {
        setLoading(false);
      }
    };
    load();
  }, []);

  return (
    <PublicLayout>
      {/* Hero */}
      <section className="relative bg-gradient-to-br from-brand-maroon to-[#5a1015] text-white overflow-hidden">
        <div className="absolute inset-0 bg-[url('data:image/svg+xml;base64,PHN2ZyB3aWR0aD0iNjAiIGhlaWdodD0iNjAiIHZpZXdCb3g9IjAgMCA2MCA2MCIgeG1sbnM9Imh0dHA6Ly93d3cudzMub3JnLzIwMDAvc3ZnIj48ZyBmaWxsPSJub25lIiBmaWxsLXJ1bGU9ImV2ZW5vZGQiPjxnIGZpbGw9IiNmZmYiIGZpbGwtb3BhY2l0eT0iMC4wMyI+PHBhdGggZD0iTTM2IDE4YzAtOS45NC04LjA2LTE4LTE4LTE4UzAgOC4wNiAwIDE4czguMDYgMTggMTggMTggMTgtOC4wNiAxOC0xOHoiLz48L2c+PC9nPjwvc3ZnPg==')] opacity-50" />
        <div className="relative max-w-7xl mx-auto px-4 md:px-8 py-20 md:py-32">
          <div className="max-w-2xl">
            <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full bg-white/10 text-sm font-medium mb-6 backdrop-blur-sm">
              <Calendar className="w-4 h-4" />
              {APP_CONFIG.APP_SUBTITLE}
            </div>
            <h1 className="text-4xl md:text-5xl lg:text-6xl font-bold leading-tight mb-6">
              Book Your Perfect <span className="text-brand-gold">Venue</span>
            </h1>
            <p className="text-lg md:text-xl text-white/80 mb-8 leading-relaxed">
              {APP_CONFIG.APP_STORY}
            </p>
            <div className="flex flex-col sm:flex-row gap-3">
              <Link
                to="/book"
                className="inline-flex items-center justify-center gap-2 px-6 py-3 bg-white text-brand-maroon font-semibold rounded-lg hover:bg-gray-100 transition-colors shadow-lg"
              >
                Book Now <ArrowRight className="w-5 h-5" />
              </Link>
              <Link
                to="/venue"
                className="inline-flex items-center justify-center gap-2 px-6 py-3 bg-white/10 text-white font-semibold rounded-lg hover:bg-white/20 transition-colors backdrop-blur-sm border border-white/20"
              >
                View Venues
              </Link>
            </div>
          </div>
        </div>
      </section>

      {/* How It Works */}
      <section className="py-16 md:py-24 bg-white dark:bg-gray-900">
        <div className="max-w-7xl mx-auto px-4 md:px-8">
          <div className="text-center mb-12">
            <h2 className="text-2xl md:text-3xl font-bold text-gray-900 dark:text-white mb-3">
              How It Works
            </h2>
            <p className="text-gray-500 dark:text-gray-400 max-w-lg mx-auto">
              Invited users can request a venue in 3 simple steps.
            </p>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-3 gap-8 max-w-4xl mx-auto">
            {[
              { icon: MapPin, title: 'Choose a Venue', desc: 'Browse our available halls and spaces to find the right fit.' },
              { icon: Clock, title: 'Sign In & Check Availability', desc: 'Log in, choose your date and time slot, then view only the venues that are still available.' },
              { icon: CheckCircle, title: 'Submit & Track', desc: 'Send your booking request and monitor its status from your dashboard.' },
            ].map((step, i) => (
              <div key={i} className="text-center group">
                <div className="w-14 h-14 mx-auto mb-4 rounded-xl bg-brand-maroon/5 dark:bg-brand-maroon/10 flex items-center justify-center group-hover:bg-brand-maroon/10 transition-colors">
                  <step.icon className="w-7 h-7 text-brand-maroon dark:text-red-400" />
                </div>
                <div className="text-xs font-bold text-brand-maroon dark:text-red-400 mb-1 uppercase tracking-wider">
                  Step {i + 1}
                </div>
                <h3 className="text-lg font-semibold text-gray-900 dark:text-white mb-2">{step.title}</h3>
                <p className="text-sm text-gray-500 dark:text-gray-400">{step.desc}</p>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* Venues */}
      <section className="py-16 md:py-24 bg-gray-50 dark:bg-gray-950">
        <div className="max-w-7xl mx-auto px-4 md:px-8">
          <div className="text-center mb-12">
            <h2 className="text-2xl md:text-3xl font-bold text-gray-900 dark:text-white mb-3">
              Our Venues
            </h2>
            <p className="text-gray-500 dark:text-gray-400 max-w-lg mx-auto">
              Explore our halls and spaces available for booking.
            </p>
          </div>

          {loading ? (
            <div className="flex justify-center py-12">
              <Loader2 className="w-8 h-8 animate-spin text-brand-maroon" />
            </div>
          ) : venues.length > 0 ? (
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
              {venues.map((venue) => (
                <VenueCard key={venue.id} venue={venue} />
              ))}
            </div>
          ) : (
            <div className="text-center py-12 text-gray-400 dark:text-gray-500">
              <MapPin className="w-12 h-12 mx-auto mb-3 opacity-30" />
              <p className="text-lg font-medium">No venues available yet</p>
              <p className="text-sm mt-1">Venues will appear here once they are added by an admin.</p>
            </div>
          )}
        </div>
      </section>
    </PublicLayout>
  );
};

export default LandingPage;
