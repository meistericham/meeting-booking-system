import React from 'react';
import { Link } from 'react-router-dom';
import { Users, MapPin, ArrowRight } from 'lucide-react';
import { Venue } from '../types';

interface VenueCardProps {
  venue: Venue;
}

const VenueCard: React.FC<VenueCardProps> = ({ venue }) => {
  const amenities = venue.amenities ?? [];

  return (
    <div className="bg-white dark:bg-gray-800 rounded-xl border border-gray-200 dark:border-gray-700 overflow-hidden shadow-sm hover:shadow-md transition-shadow group">
      {/* Image */}
      <div className="h-48 bg-gradient-to-br from-brand-maroon/10 to-brand-maroon/5 dark:from-brand-maroon/20 dark:to-gray-800 flex items-center justify-center">
        {venue.imageUrl ? (
          <img src={venue.imageUrl} alt={venue.name} className="w-full h-full object-cover" />
        ) : (
          <MapPin className="w-12 h-12 text-brand-maroon/30" />
        )}
      </div>

      {/* Content */}
      <div className="p-5">
        <h3 className="text-lg font-bold text-gray-900 dark:text-white mb-1">{venue.name}</h3>
        <p className="text-sm text-gray-500 dark:text-gray-400 line-clamp-2 mb-3">{venue.description}</p>

        <div className="flex items-center gap-4 text-sm text-gray-500 dark:text-gray-400 mb-4">
          <span className="flex items-center gap-1">
            <Users className="w-4 h-4" />
            Up to {venue.capacity} pax
          </span>
        </div>

        {/* Amenities */}
        {amenities.length > 0 && (
          <div className="flex flex-wrap gap-1.5 mb-4">
            {amenities.slice(0, 4).map((amenity) => (
              <span
                key={amenity}
                className="px-2 py-0.5 text-[11px] font-medium rounded-full bg-gray-100 dark:bg-gray-700 text-gray-600 dark:text-gray-300"
              >
                {amenity}
              </span>
            ))}
            {amenities.length > 4 && (
              <span className="px-2 py-0.5 text-[11px] font-medium rounded-full bg-gray-100 dark:bg-gray-700 text-gray-500 dark:text-gray-400">
                +{amenities.length - 4} more
              </span>
            )}
          </div>
        )}

        <Link
          to={`/calendar?venueId=${venue.id}`}
          className="inline-flex items-center gap-1.5 text-sm font-medium text-brand-maroon hover:text-[#7b171d] dark:text-red-400 dark:hover:text-red-300 transition-colors group-hover:gap-2.5"
        >
          Open in Calendar <ArrowRight className="w-4 h-4 transition-all" />
        </Link>
      </div>
    </div>
  );
};

export default VenueCard;
