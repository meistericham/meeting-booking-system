import React, { useEffect, useMemo, useState } from 'react';
import { Link, useNavigate, useParams } from 'react-router-dom';
import {
  AlertCircle,
  ArrowLeft,
  CalendarDays,
  Loader2,
  MapPin,
  Phone,
  Users,
} from 'lucide-react';
import PublicLayout from '../components/PublicLayout';
import TimeSlotPicker from '../components/TimeSlotPicker';
import { isSlotTaken, toTimestamp } from '../config/timeSlots';
import { useAuth } from '../services/authContext';
import { sendBookingSubmittedNotifications } from '../services/emailService';
import {
  createBooking,
  fetchActiveBookingsByDate,
  fetchVenues,
} from '../services/dataService';
import { Booking, CreateBookingInput, EventType, TimeSlot, Venue } from '../types';

const EVENT_TYPES: EventType[] = ['meeting', 'seminar', 'workshop', 'reception', 'other'];

const getTodayString = () => {
  const now = new Date();
  const year = now.getFullYear();
  const month = String(now.getMonth() + 1).padStart(2, '0');
  const day = String(now.getDate()).padStart(2, '0');
  return `${year}-${month}-${day}`;
};

const BookingPage: React.FC = () => {
  const { user } = useAuth();
  const { venueId } = useParams<{ venueId: string }>();
  const navigate = useNavigate();

  const [venues, setVenues] = useState<Venue[]>([]);
  const [activeBookings, setActiveBookings] = useState<Booking[]>([]);
  const [selectedDate, setSelectedDate] = useState(getTodayString());
  const [selectedSlot, setSelectedSlot] = useState<TimeSlot | null>(null);
  const [selectedVenueId, setSelectedVenueId] = useState(venueId ?? '');
  const [expectedPax, setExpectedPax] = useState('');
  const [loadingVenues, setLoadingVenues] = useState(true);
  const [loadingAvailability, setLoadingAvailability] = useState(false);
  const [submitting, setSubmitting] = useState(false);
  const [submitError, setSubmitError] = useState('');
  const [validationError, setValidationError] = useState('');
  const [form, setForm] = useState({
    guestPhone: user?.phoneNumber || '',
    organization: user?.organization || '',
    eventTitle: '',
    eventType: 'meeting' as EventType,
    specialRequests: '',
  });

  useEffect(() => {
    if (user) {
      setForm((current) => ({
        ...current,
        guestPhone: current.guestPhone || user.phoneNumber || '',
        organization: current.organization || user.organization || '',
      }));
    }
  }, [user]);

  useEffect(() => {
    const loadVenues = async () => {
      try {
        const data = await fetchVenues();
        const activeVenues = data.filter((venue) => venue.isActive);
        setVenues(activeVenues);

        if (venueId) {
          setSelectedVenueId(venueId);
        }
      } catch {
        setVenues([]);
      } finally {
        setLoadingVenues(false);
      }
    };

    void loadVenues();
  }, [venueId]);

  useEffect(() => {
    const loadActiveBookings = async () => {
      if (!selectedDate) {
        setActiveBookings([]);
        return;
      }

      setLoadingAvailability(true);
      setSubmitError('');

      try {
        const data = await fetchActiveBookingsByDate(selectedDate);
        setActiveBookings(data);
      } catch {
        setActiveBookings([]);
      } finally {
        setLoadingAvailability(false);
      }
    };

    void loadActiveBookings();
  }, [selectedDate]);

  const selectedPax = Number(expectedPax);
  const hasValidSchedule =
    Boolean(selectedDate) && Boolean(selectedSlot) && Number.isFinite(selectedPax) && selectedPax > 0;

  const getVenueBookings = (currentVenueId: string) =>
    activeBookings.filter((booking) => booking.venueId === currentVenueId);

  const isVenueAvailable = (venue: Venue) => {
    if (!selectedSlot || !hasValidSchedule) {
      return false;
    }

    if (selectedPax > venue.capacity) {
      return false;
    }

    return !isSlotTaken(selectedSlot, selectedDate, getVenueBookings(venue.id));
  };

  const directVenue = useMemo(
    () => venues.find((venue) => venue.id === venueId) ?? null,
    [venueId, venues]
  );

  const selectedVenue = useMemo(
    () => venues.find((venue) => venue.id === selectedVenueId) ?? null,
    [selectedVenueId, venues]
  );

  const availableVenues = useMemo(() => {
    if (!hasValidSchedule) {
      return [];
    }

    return venues.filter((venue) => isVenueAvailable(venue));
  }, [activeBookings, hasValidSchedule, selectedPax, selectedSlot, selectedDate, venues]);

  useEffect(() => {
    if (!venueId && selectedVenueId && !availableVenues.some((venue) => venue.id === selectedVenueId)) {
      setSelectedVenueId('');
    }
  }, [availableVenues, selectedVenueId, venueId]);

  const handleFieldChange = (
    event: React.ChangeEvent<HTMLInputElement | HTMLSelectElement | HTMLTextAreaElement>
  ) => {
    const { name, value } = event.target;
    setForm((current) => ({ ...current, [name]: value }));
  };

  const validateForm = () => {
    if (!user) {
      return 'You must be signed in to create a booking.';
    }

    if (!selectedDate || selectedDate < getTodayString()) {
      return 'Please choose a valid booking date.';
    }

    if (!selectedSlot) {
      return 'Please choose an available time slot.';
    }

    if (!Number.isFinite(selectedPax) || selectedPax <= 0) {
      return 'Expected pax must be greater than zero.';
    }

    if (!selectedVenue) {
      return venueId
        ? 'This venue is not available for the selected schedule.'
        : 'Please choose one of the available venues.';
    }

    if (!form.guestPhone.trim()) {
      return 'Phone number is required.';
    }

    if (!form.eventTitle.trim()) {
      return 'Event title is required.';
    }

    if (selectedPax > selectedVenue.capacity) {
      return `Expected pax exceeds the ${selectedVenue.capacity}-guest capacity for this venue.`;
    }

    if (!isVenueAvailable(selectedVenue)) {
      return 'That venue is no longer available for the selected schedule.';
    }

    return '';
  };

  const handleSubmit = async (event: React.FormEvent<HTMLFormElement>) => {
    event.preventDefault();

    const errorMessage = validateForm();
    setValidationError(errorMessage);
    setSubmitError('');

    if (errorMessage || !user || !selectedVenue || !selectedSlot) {
      return;
    }

    const payload: CreateBookingInput = {
      userId: user.uid,
      venueId: selectedVenue.id,
      venueName: selectedVenue.name,
      guestName: user.displayName,
      guestEmail: user.email,
      guestPhone: form.guestPhone.trim(),
      organization: form.organization.trim(),
      date: selectedDate,
      startTime: selectedSlot.start,
      endTime: selectedSlot.end,
      startTimestamp: toTimestamp(selectedDate, selectedSlot.start),
      endTimestamp: toTimestamp(selectedDate, selectedSlot.end),
      eventTitle: form.eventTitle.trim(),
      eventType: form.eventType,
      expectedPax: selectedPax,
      specialRequests: form.specialRequests.trim(),
    };

    setSubmitting(true);

    try {
      const bookingId = await createBooking(payload);

      void sendBookingSubmittedNotifications({
        id: bookingId,
        guestName: payload.guestName,
        guestEmail: payload.guestEmail,
        venueName: payload.venueName,
        date: payload.date,
        startTime: payload.startTime,
        endTime: payload.endTime,
        eventTitle: payload.eventTitle,
      }).catch(() => undefined);

      navigate(`/confirmation/${bookingId}`);
    } catch (error) {
      setSubmitError(
        error instanceof Error ? error.message : 'Unable to submit booking right now.'
      );
    } finally {
      setSubmitting(false);
    }
  };

  const directVenueBookings = directVenue ? getVenueBookings(directVenue.id) : [];

  return (
    <PublicLayout>
      <section className="bg-gray-50 py-10 dark:bg-gray-950 md:py-14">
        <div className="mx-auto max-w-7xl px-4 md:px-8">
          <Link
            to={venueId ? '/venue' : '/dashboard'}
            className="inline-flex items-center gap-2 text-sm font-medium text-gray-500 transition-colors hover:text-brand-maroon dark:text-gray-400 dark:hover:text-red-300"
          >
            <ArrowLeft className="h-4 w-4" />
            {venueId ? 'Back to venue details' : 'Back to dashboard'}
          </Link>

          <div className="mt-5 grid gap-8 lg:grid-cols-[0.78fr_1.22fr]">
            <div className="space-y-6">
              <div className="rounded-3xl border border-gray-200 bg-white p-6 shadow-sm dark:border-gray-800 dark:bg-gray-900">
                <div className="inline-flex items-center gap-2 rounded-full bg-brand-maroon/8 px-3 py-1 text-xs font-semibold uppercase tracking-[0.2em] text-brand-maroon dark:bg-brand-maroon/20 dark:text-red-200">
                  <CalendarDays className="h-3.5 w-3.5" />
                  Availability First
                </div>
                <h1 className="mt-4 text-3xl font-bold text-gray-900 dark:text-white">
                  Choose date, slot, and pax first
                </h1>
                <p className="mt-3 text-sm leading-6 text-gray-600 dark:text-gray-300">
                  The system only shows venues that still match your selected time slot and
                  expected attendance.
                </p>
              </div>

              <div className="rounded-3xl border border-gray-200 bg-white p-6 shadow-sm dark:border-gray-800 dark:bg-gray-900">
                <h2 className="text-lg font-semibold text-gray-900 dark:text-white">
                  Your account snapshot
                </h2>
                <dl className="mt-4 space-y-3 text-sm">
                  <div>
                    <dt className="text-gray-500 dark:text-gray-400">Booked by</dt>
                    <dd className="mt-1 font-medium text-gray-900 dark:text-white">
                      {user?.displayName}
                    </dd>
                  </div>
                  <div>
                    <dt className="text-gray-500 dark:text-gray-400">Email</dt>
                    <dd className="mt-1 font-medium text-gray-900 dark:text-white">
                      {user?.email}
                    </dd>
                  </div>
                </dl>
              </div>

              <div className="rounded-3xl border border-gray-200 bg-white p-6 shadow-sm dark:border-gray-800 dark:bg-gray-900">
                <div className="grid gap-5">
                  <div>
                    <label className="mb-2 block text-sm font-medium text-gray-700 dark:text-gray-300">
                      Event Date
                    </label>
                    <input
                      type="date"
                      min={getTodayString()}
                      value={selectedDate}
                      onChange={(event) => {
                        setSelectedDate(event.target.value);
                        setSelectedSlot(null);
                        setValidationError('');
                      }}
                      className="w-full rounded-xl border border-gray-300 bg-white px-4 py-3 text-gray-900 outline-none transition focus:border-brand-maroon focus:ring-2 focus:ring-brand-maroon/20 dark:border-gray-700 dark:bg-gray-950 dark:text-white"
                    />
                  </div>

                  <div>
                    <label className="mb-2 block text-sm font-medium text-gray-700 dark:text-gray-300">
                      Expected Pax
                    </label>
                    <input
                      type="number"
                      min="1"
                      value={expectedPax}
                      onChange={(event) => {
                        setExpectedPax(event.target.value);
                        setValidationError('');
                      }}
                      className="w-full rounded-xl border border-gray-300 bg-white px-4 py-3 text-gray-900 outline-none transition focus:border-brand-maroon focus:ring-2 focus:ring-brand-maroon/20 dark:border-gray-700 dark:bg-gray-950 dark:text-white"
                      placeholder="Enter number of guests"
                    />
                  </div>

                  <div>
                    <div className="mb-2 flex items-center justify-between gap-3">
                      <label className="block text-sm font-medium text-gray-700 dark:text-gray-300">
                        Time Slot
                      </label>
                      {loadingAvailability && (
                        <span className="inline-flex items-center gap-2 text-xs text-gray-500 dark:text-gray-400">
                          <Loader2 className="h-3.5 w-3.5 animate-spin" />
                          Refreshing availability
                        </span>
                      )}
                    </div>
                    <TimeSlotPicker
                      date={selectedDate}
                      selectedSlot={selectedSlot}
                      onSelectSlot={(slot) => {
                        setSelectedSlot(slot);
                        setValidationError('');
                      }}
                      existingBookings={venueId ? directVenueBookings : []}
                      disabled={loadingAvailability}
                    />
                  </div>
                </div>
              </div>
            </div>

            <form
              onSubmit={(event) => void handleSubmit(event)}
              className="rounded-3xl border border-gray-200 bg-white p-6 shadow-sm dark:border-gray-800 dark:bg-gray-900 md:p-8"
            >
              <div className="border-b border-gray-200 pb-6 dark:border-gray-800">
                <h2 className="text-xl font-semibold text-gray-900 dark:text-white">
                  {venueId ? 'Selected venue availability' : 'Available venues'}
                </h2>
                <p className="mt-2 text-sm text-gray-500 dark:text-gray-400">
                  {venueId
                    ? 'This direct booking view only proceeds if the selected venue is free for your chosen schedule.'
                    : 'Only venues that match your schedule and pax appear below.'}
                </p>
              </div>

              <div className="mt-6">
                {loadingVenues ? (
                  <div className="flex justify-center py-14">
                    <Loader2 className="h-8 w-8 animate-spin text-brand-maroon" />
                  </div>
                ) : venueId && directVenue ? (
                  isVenueAvailable(directVenue) ? (
                    <div className="rounded-3xl border border-brand-maroon/20 bg-brand-maroon/5 p-5 dark:border-brand-maroon/30 dark:bg-brand-maroon/10">
                      <div className="flex items-start justify-between gap-4">
                        <div>
                          <h3 className="text-xl font-bold text-gray-900 dark:text-white">
                            {directVenue.name}
                          </h3>
                          <p className="mt-2 text-sm text-gray-600 dark:text-gray-300">
                            {directVenue.description}
                          </p>
                        </div>
                        <MapPin className="h-5 w-5 text-brand-maroon dark:text-red-300" />
                      </div>
                      <div className="mt-4 flex flex-wrap gap-2">
                        {(directVenue.amenities ?? []).map((amenity) => (
                          <span
                            key={amenity}
                            className="rounded-full bg-white px-3 py-1 text-xs font-medium text-gray-700 shadow-sm dark:bg-gray-800 dark:text-gray-200"
                          >
                            {amenity}
                          </span>
                        ))}
                      </div>
                    </div>
                  ) : (
                    <div className="rounded-3xl border border-dashed border-gray-300 bg-gray-50 px-6 py-12 text-center dark:border-gray-700 dark:bg-gray-950/40">
                      <MapPin className="mx-auto h-12 w-12 text-gray-300 dark:text-gray-600" />
                      <p className="mt-4 text-lg font-semibold text-gray-900 dark:text-white">
                        This venue is not available
                      </p>
                      <p className="mt-2 text-sm text-gray-500 dark:text-gray-400">
                        Choose another schedule, reduce your pax, or compare other venues.
                      </p>
                      <Link
                        to="/book"
                        className="mt-5 inline-flex rounded-xl bg-brand-maroon px-5 py-3 text-sm font-semibold text-white transition-colors hover:bg-[#74161c]"
                      >
                        Compare other venues
                      </Link>
                    </div>
                  )
                ) : !hasValidSchedule ? (
                  <div className="rounded-3xl border border-dashed border-gray-300 bg-gray-50 px-6 py-12 text-center dark:border-gray-700 dark:bg-gray-950/40">
                    <Users className="mx-auto h-12 w-12 text-gray-300 dark:text-gray-600" />
                    <p className="mt-4 text-lg font-semibold text-gray-900 dark:text-white">
                      Choose your schedule first
                    </p>
                    <p className="mt-2 text-sm text-gray-500 dark:text-gray-400">
                      Enter a date, time slot, and expected pax to see venues that are still
                      available.
                    </p>
                  </div>
                ) : availableVenues.length === 0 ? (
                  <div className="rounded-3xl border border-dashed border-gray-300 bg-gray-50 px-6 py-12 text-center dark:border-gray-700 dark:bg-gray-950/40">
                    <MapPin className="mx-auto h-12 w-12 text-gray-300 dark:text-gray-600" />
                    <p className="mt-4 text-lg font-semibold text-gray-900 dark:text-white">
                      No venues match this schedule
                    </p>
                    <p className="mt-2 text-sm text-gray-500 dark:text-gray-400">
                      Try a different time slot or lower the guest count to widen availability.
                    </p>
                  </div>
                ) : (
                  <div className="grid gap-4 md:grid-cols-2">
                    {availableVenues.map((venue) => {
                      const isSelected = selectedVenueId === venue.id;
                      const amenities = venue.amenities ?? [];

                      return (
                        <button
                          key={venue.id}
                          type="button"
                          onClick={() => {
                            setSelectedVenueId(venue.id);
                            setValidationError('');
                          }}
                          className={`rounded-3xl border p-5 text-left transition ${
                            isSelected
                              ? 'border-brand-maroon bg-brand-maroon/5 shadow-sm dark:border-red-300 dark:bg-brand-maroon/10'
                              : 'border-gray-200 hover:border-brand-maroon/40 hover:bg-gray-50 dark:border-gray-800 dark:hover:border-red-300 dark:hover:bg-gray-800/60'
                          }`}
                        >
                          <div className="flex items-start justify-between gap-4">
                            <div>
                              <h3 className="text-lg font-bold text-gray-900 dark:text-white">
                                {venue.name}
                              </h3>
                              <p className="mt-2 text-sm text-gray-600 dark:text-gray-300">
                                {venue.description}
                              </p>
                            </div>
                            <MapPin className="h-5 w-5 text-brand-maroon dark:text-red-300" />
                          </div>
                          <div className="mt-4 text-sm text-gray-500 dark:text-gray-400">
                            Capacity up to {venue.capacity} guests
                          </div>
                          <div className="mt-4 flex flex-wrap gap-2">
                            {amenities.slice(0, 4).map((amenity) => (
                              <span
                                key={amenity}
                                className="rounded-full bg-gray-100 px-3 py-1 text-xs font-medium text-gray-700 dark:bg-gray-800 dark:text-gray-200"
                              >
                                {amenity}
                              </span>
                            ))}
                          </div>
                        </button>
                      );
                    })}
                  </div>
                )}
              </div>

              <div className="mt-8 border-t border-gray-200 pt-6 dark:border-gray-800">
                <h2 className="text-xl font-semibold text-gray-900 dark:text-white">
                  Booking details
                </h2>
                <p className="mt-2 text-sm text-gray-500 dark:text-gray-400">
                  Contact name and email are taken from your account. You can update the phone
                  or organization snapshot for this request.
                </p>

                <div className="mt-6 grid gap-5 md:grid-cols-2">
                  <div>
                    <label className="mb-2 block text-sm font-medium text-gray-700 dark:text-gray-300">
                      Contact Name
                    </label>
                    <input
                      value={user?.displayName || ''}
                      disabled
                      className="w-full cursor-not-allowed rounded-xl border border-gray-200 bg-gray-50 px-4 py-3 text-gray-500 dark:border-gray-800 dark:bg-gray-900 dark:text-gray-400"
                    />
                  </div>
                  <div>
                    <label className="mb-2 block text-sm font-medium text-gray-700 dark:text-gray-300">
                      Contact Email
                    </label>
                    <input
                      value={user?.email || ''}
                      disabled
                      className="w-full cursor-not-allowed rounded-xl border border-gray-200 bg-gray-50 px-4 py-3 text-gray-500 dark:border-gray-800 dark:bg-gray-900 dark:text-gray-400"
                    />
                  </div>
                  <div>
                    <label className="mb-2 block text-sm font-medium text-gray-700 dark:text-gray-300">
                      Phone Number
                    </label>
                    <div className="relative">
                      <Phone className="absolute left-4 top-1/2 h-4 w-4 -translate-y-1/2 text-gray-400" />
                      <input
                        name="guestPhone"
                        value={form.guestPhone}
                        onChange={handleFieldChange}
                        className="w-full rounded-xl border border-gray-300 bg-white py-3 pl-11 pr-4 text-gray-900 outline-none transition focus:border-brand-maroon focus:ring-2 focus:ring-brand-maroon/20 dark:border-gray-700 dark:bg-gray-950 dark:text-white"
                        placeholder="+60 12-345 6789"
                      />
                    </div>
                  </div>
                  <div>
                    <label className="mb-2 block text-sm font-medium text-gray-700 dark:text-gray-300">
                      Organization
                    </label>
                    <input
                      name="organization"
                      value={form.organization}
                      onChange={handleFieldChange}
                      className="w-full rounded-xl border border-gray-300 bg-white px-4 py-3 text-gray-900 outline-none transition focus:border-brand-maroon focus:ring-2 focus:ring-brand-maroon/20 dark:border-gray-700 dark:bg-gray-950 dark:text-white"
                      placeholder="Your team or organization"
                    />
                  </div>
                  <div>
                    <label className="mb-2 block text-sm font-medium text-gray-700 dark:text-gray-300">
                      Event Title
                    </label>
                    <input
                      name="eventTitle"
                      value={form.eventTitle}
                      onChange={handleFieldChange}
                      className="w-full rounded-xl border border-gray-300 bg-white px-4 py-3 text-gray-900 outline-none transition focus:border-brand-maroon focus:ring-2 focus:ring-brand-maroon/20 dark:border-gray-700 dark:bg-gray-950 dark:text-white"
                      placeholder="Quarterly planning session"
                    />
                  </div>
                  <div>
                    <label className="mb-2 block text-sm font-medium text-gray-700 dark:text-gray-300">
                      Event Type
                    </label>
                    <select
                      name="eventType"
                      value={form.eventType}
                      onChange={handleFieldChange}
                      className="w-full rounded-xl border border-gray-300 bg-white px-4 py-3 text-gray-900 outline-none transition focus:border-brand-maroon focus:ring-2 focus:ring-brand-maroon/20 dark:border-gray-700 dark:bg-gray-950 dark:text-white"
                    >
                      {EVENT_TYPES.map((type) => (
                        <option key={type} value={type}>
                          {type.charAt(0).toUpperCase() + type.slice(1)}
                        </option>
                      ))}
                    </select>
                  </div>
                  <div className="md:col-span-2">
                    <label className="mb-2 block text-sm font-medium text-gray-700 dark:text-gray-300">
                      Special Requests
                    </label>
                    <textarea
                      name="specialRequests"
                      rows={4}
                      value={form.specialRequests}
                      onChange={handleFieldChange}
                      className="w-full rounded-xl border border-gray-300 bg-white px-4 py-3 text-gray-900 outline-none transition focus:border-brand-maroon focus:ring-2 focus:ring-brand-maroon/20 dark:border-gray-700 dark:bg-gray-950 dark:text-white"
                      placeholder="Any setup notes, accessibility needs, or special requests."
                    />
                  </div>
                </div>
              </div>

              {(validationError || submitError) && (
                <div className="mt-6 flex items-start gap-3 rounded-2xl border border-red-200 bg-red-50 px-4 py-3 text-sm text-red-700 dark:border-red-900/40 dark:bg-red-900/10 dark:text-red-300">
                  <AlertCircle className="mt-0.5 h-4 w-4 flex-shrink-0" />
                  <span>{validationError || submitError}</span>
                </div>
              )}

              <div className="mt-6 flex flex-col gap-3 border-t border-gray-200 pt-6 dark:border-gray-800 sm:flex-row sm:items-center sm:justify-between">
                <div className="text-sm text-gray-500 dark:text-gray-400">
                  {selectedSlot ? (
                    <span>
                      Selected slot: <strong className="text-gray-900 dark:text-white">{selectedSlot.label}</strong>{' '}
                      ({selectedSlot.start} - {selectedSlot.end})
                    </span>
                  ) : (
                    'Choose a date, slot, and pax before continuing.'
                  )}
                </div>

                <button
                  type="submit"
                  disabled={
                    submitting ||
                    loadingVenues ||
                    !selectedVenue ||
                    !selectedSlot ||
                    !hasValidSchedule ||
                    !isVenueAvailable(selectedVenue)
                  }
                  className="inline-flex items-center justify-center gap-2 rounded-xl bg-brand-maroon px-5 py-3 text-sm font-semibold text-white transition-colors hover:bg-[#74161c] disabled:cursor-not-allowed disabled:opacity-60"
                >
                  {submitting ? (
                    <>
                      <Loader2 className="h-4 w-4 animate-spin" />
                      Submitting
                    </>
                  ) : (
                    'Submit booking request'
                  )}
                </button>
              </div>
            </form>
          </div>
        </div>
      </section>
    </PublicLayout>
  );
};

export default BookingPage;
