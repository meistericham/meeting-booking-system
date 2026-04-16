import React, { useEffect, useState } from 'react';
import { Link } from 'react-router-dom';
import { ArrowLeft, ArrowRight, Loader2, MapPin, Users } from 'lucide-react';
import PublicLayout from '../components/PublicLayout';
import { fetchVenues } from '../services/dataService';
import { Venue } from '../types';

const VenueDetailsPage: React.FC = () => {
  const [venues, setVenues] = useState<Venue[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const loadVenues = async () => {
      try {
        const data = await fetchVenues();
        setVenues(data.filter((venue) => venue.isActive));
      } catch {
        setVenues([]);
      } finally {
        setLoading(false);
      }
    };

    void loadVenues();
  }, []);

  return (
    <PublicLayout>
      <section className="border-b border-gray-200 bg-white/80 py-10 backdrop-blur dark:border-gray-800 dark:bg-gray-900/80">
        <div className="mx-auto flex max-w-7xl flex-col gap-4 px-4 md:px-8">
          <Link
            to="/"
            className="inline-flex items-center gap-2 text-sm font-medium text-gray-500 transition-colors hover:text-brand-maroon dark:text-gray-400 dark:hover:text-red-300"
          >
            <ArrowLeft className="h-4 w-4" />
            Back to Home
          </Link>
          <div className="max-w-3xl">
            <h1 className="text-3xl font-bold text-gray-900 dark:text-white md:text-4xl">
              Venue Details
            </h1>
            <p className="mt-3 text-base text-gray-600 dark:text-gray-300">
              Review capacities, amenities, and layout details before sending a booking
              request.
            </p>
          </div>
        </div>
      </section>

      <section className="bg-gray-50 py-12 dark:bg-gray-950 md:py-16">
        <div className="mx-auto max-w-7xl px-4 md:px-8">
          {loading ? (
            <div className="flex justify-center py-20">
              <Loader2 className="h-8 w-8 animate-spin text-brand-maroon" />
            </div>
          ) : venues.length === 0 ? (
            <div className="rounded-3xl border border-dashed border-gray-300 bg-white px-6 py-16 text-center dark:border-gray-700 dark:bg-gray-900">
              <MapPin className="mx-auto h-12 w-12 text-gray-300 dark:text-gray-600" />
              <h2 className="mt-4 text-xl font-semibold text-gray-900 dark:text-white">
                No active venues yet
              </h2>
              <p className="mt-2 text-sm text-gray-500 dark:text-gray-400">
                Add a venue in Firestore and it will appear here automatically.
              </p>
            </div>
          ) : (
            <div className="space-y-8">
              {venues.map((venue) => {
                const amenities = venue.amenities ?? [];

                return (
                  <article
                    key={venue.id}
                    className="grid overflow-hidden rounded-3xl border border-gray-200 bg-white shadow-sm dark:border-gray-800 dark:bg-gray-900 lg:grid-cols-[1.1fr_0.9fr]"
                  >
                    <div className="min-h-[240px] bg-gradient-to-br from-brand-maroon/15 via-brand-maroon/5 to-amber-100/60 dark:from-brand-maroon/30 dark:via-brand-maroon/10 dark:to-gray-800">
                      {venue.imageUrl ? (
                        <img
                          src={venue.imageUrl}
                          alt={venue.name}
                          className="h-full w-full object-cover"
                        />
                      ) : (
                        <div className="flex h-full items-center justify-center">
                          <MapPin className="h-16 w-16 text-brand-maroon/35 dark:text-red-300/40" />
                        </div>
                      )}
                    </div>

                    <div className="flex flex-col justify-between p-6 md:p-8">
                      <div>
                        <div className="inline-flex items-center gap-2 rounded-full bg-brand-maroon/8 px-3 py-1 text-xs font-semibold uppercase tracking-[0.2em] text-brand-maroon dark:bg-brand-maroon/20 dark:text-red-200">
                          <Users className="h-3.5 w-3.5" />
                          Up to {venue.capacity} guests
                        </div>
                        <h2 className="mt-4 text-2xl font-bold text-gray-900 dark:text-white">
                          {venue.name}
                        </h2>
                        <p className="mt-3 text-sm leading-6 text-gray-600 dark:text-gray-300">
                          {venue.description}
                        </p>

                        <div className="mt-6">
                          <h3 className="text-sm font-semibold uppercase tracking-[0.2em] text-gray-500 dark:text-gray-400">
                            Amenities
                          </h3>
                          <div className="mt-3 flex flex-wrap gap-2">
                            {amenities.length > 0 ? (
                              amenities.map((amenity) => (
                                <span
                                  key={amenity}
                                  className="rounded-full bg-gray-100 px-3 py-1 text-sm font-medium text-gray-700 dark:bg-gray-800 dark:text-gray-200"
                                >
                                  {amenity}
                                </span>
                              ))
                            ) : (
                              <span className="text-sm text-gray-500 dark:text-gray-400">
                                Amenities will be listed here once configured.
                              </span>
                            )}
                          </div>
                        </div>
                      </div>

                      <div className="mt-8 flex flex-wrap gap-3">
                        <Link
                          to={`/book/${venue.id}`}
                          className="inline-flex items-center gap-2 rounded-xl bg-brand-maroon px-5 py-3 text-sm font-semibold text-white transition-colors hover:bg-[#74161c]"
                        >
                          Book this venue
                          <ArrowRight className="h-4 w-4" />
                        </Link>
                        <Link
                          to="/book"
                          className="inline-flex items-center gap-2 rounded-xl border border-gray-200 px-5 py-3 text-sm font-semibold text-gray-700 transition-colors hover:border-brand-maroon hover:text-brand-maroon dark:border-gray-700 dark:text-gray-200 dark:hover:border-red-300 dark:hover:text-red-200"
                        >
                          Compare in booking form
                        </Link>
                      </div>
                    </div>
                  </article>
                );
              })}
            </div>
          )}
        </div>
      </section>
    </PublicLayout>
  );
};

export default VenueDetailsPage;
