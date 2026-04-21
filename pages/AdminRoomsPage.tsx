import React, { useMemo, useState } from 'react';
import { useEffect } from 'react';
import { useLocation } from 'react-router-dom';
import {
  Loader2,
  LogOut,
  MapPin,
  Pencil,
  Plus,
  RefreshCw,
  Save,
} from 'lucide-react';
import DashboardShell from '../components/DashboardShell';
import { getAdminDashboardNav } from '../config/dashboardNavigation';
import { useAuth } from '../services/authContext';
import {
  fetchVenues,
  saveVenue,
  updateVenueActiveState,
} from '../services/dataService';
import { Venue, VenueInput } from '../types';

const emptyForm = (): VenueInput => ({
  name: '',
  description: '',
  capacity: 1,
  amenities: [],
  imageUrl: '',
  isActive: true,
  sortOrder: 1,
});

const AdminRoomsPage: React.FC = () => {
  const { user, logout } = useAuth();
  const location = useLocation();
  const [venues, setVenues] = useState<Venue[]>([]);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [toggleBusyVenueId, setToggleBusyVenueId] = useState<string | null>(null);
  const [error, setError] = useState('');
  const [notice, setNotice] = useState('');
  const [editingVenueId, setEditingVenueId] = useState<string | null>(null);
  const [form, setForm] = useState<VenueInput>(emptyForm());
  const [amenitiesInput, setAmenitiesInput] = useState('');

  const loadVenues = async () => {
    setLoading(true);
    setError('');

    try {
      const data = await fetchVenues();
      setVenues(data);
    } catch {
      setError('Unable to load room management right now.');
      setVenues([]);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    void loadVenues();
  }, []);

  const activeVenueCount = useMemo(
    () => venues.filter((venue) => venue.isActive).length,
    [venues]
  );

  const resetForm = () => {
    setEditingVenueId(null);
    setForm({
      ...emptyForm(),
      sortOrder: venues.length + 1,
    });
    setAmenitiesInput('');
  };

  useEffect(() => {
    if (!loading && !editingVenueId && !form.name) {
      setForm((current) => ({
        ...current,
        sortOrder: venues.length + 1,
      }));
    }
  }, [editingVenueId, form.name, loading, venues.length]);

  const handleEdit = (venue: Venue) => {
    setEditingVenueId(venue.id);
    setForm({
      name: venue.name,
      description: venue.description,
      capacity: venue.capacity,
      amenities: venue.amenities,
      imageUrl: venue.imageUrl || '',
      isActive: venue.isActive,
      sortOrder: venue.sortOrder,
    });
    setAmenitiesInput(venue.amenities.join(', '));
  };

  const handleSubmit = async (event: React.FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    setSaving(true);
    setError('');
    setNotice('');

    try {
      const venueId = await saveVenue(
        {
          ...form,
          amenities: amenitiesInput
            .split(',')
            .map((item) => item.trim())
            .filter(Boolean),
        },
        editingVenueId || undefined
      );

      await loadVenues();
      const savedVenueName =
        form.name.trim() || venues.find((venue) => venue.id === venueId)?.name || 'Room';
      setNotice(`${savedVenueName} saved successfully.`);
      resetForm();
    } catch (saveError) {
      setError(
        saveError instanceof Error ? saveError.message : 'Unable to save room right now.'
      );
    } finally {
      setSaving(false);
    }
  };

  const handleToggleActive = async (venue: Venue) => {
    setToggleBusyVenueId(venue.id);
    setError('');
    setNotice('');

    try {
      await updateVenueActiveState(venue.id, !venue.isActive);
      setVenues((current) =>
        current.map((currentVenue) =>
          currentVenue.id === venue.id
            ? {
                ...currentVenue,
                isActive: !currentVenue.isActive,
              }
            : currentVenue
        )
      );
      setNotice(
        venue.isActive
          ? `${venue.name} archived successfully.`
          : `${venue.name} activated successfully.`
      );
    } catch (toggleError) {
      setError(
        toggleError instanceof Error
          ? toggleError.message
          : 'Unable to update room state.'
      );
    } finally {
      setToggleBusyVenueId(null);
    }
  };

  return (
    <DashboardShell
      badge="Admin Rooms"
      title="Room Management"
      description="Manage the room catalogue used by the landing page, calendar hub, and booking requests."
      userLabel={user?.displayName || user?.email}
      navItems={getAdminDashboardNav(location.pathname)}
      headerActions={
        <>
          <button
            type="button"
            onClick={() => void loadVenues()}
            className="inline-flex items-center gap-2 rounded-xl border border-gray-200 bg-white px-4 py-3 text-sm font-semibold text-gray-700 transition-colors hover:border-brand-maroon hover:text-brand-maroon dark:border-gray-800 dark:bg-gray-900 dark:text-gray-200 dark:hover:border-red-300 dark:hover:text-red-200"
          >
            <RefreshCw className="h-4 w-4" />
            Refresh
          </button>
          <button
            type="button"
            onClick={() => void logout()}
            className="inline-flex items-center gap-2 rounded-xl border border-gray-200 bg-white px-4 py-3 text-sm font-semibold text-gray-700 transition-colors hover:border-red-300 hover:text-red-600 dark:border-gray-800 dark:bg-gray-900 dark:text-gray-200 dark:hover:border-red-400 dark:hover:text-red-200"
          >
            <LogOut className="h-4 w-4" />
            Sign out
          </button>
        </>
      }
    >
      {(error || notice) && (
        <div
          className={`mb-6 rounded-2xl px-4 py-3 text-sm ${
            error
              ? 'border border-red-200 bg-red-50 text-red-700 dark:border-red-900/40 dark:bg-red-900/10 dark:text-red-300'
              : 'border border-green-200 bg-green-50 text-green-700 dark:border-green-900/40 dark:bg-green-900/10 dark:text-green-300'
          }`}
        >
          {error || notice}
        </div>
      )}

      <div className="grid gap-8 xl:grid-cols-[0.9fr_1.1fr]">
        <section className="rounded-3xl border border-gray-200 bg-white p-6 shadow-sm dark:border-gray-800 dark:bg-gray-900">
          <div className="flex items-center justify-between gap-3 border-b border-gray-200 pb-6 dark:border-gray-800">
            <div>
              <h2 className="text-xl font-semibold text-gray-900 dark:text-white">
                {editingVenueId ? 'Edit Room' : 'Create Room'}
              </h2>
              <p className="mt-2 text-sm text-gray-500 dark:text-gray-400">
                Active rooms: {activeVenueCount} of {venues.length}
              </p>
            </div>
            <button
              type="button"
              onClick={resetForm}
              className="inline-flex items-center gap-2 rounded-xl border border-gray-200 px-4 py-2.5 text-sm font-semibold text-gray-700 transition-colors hover:border-brand-maroon hover:text-brand-maroon dark:border-gray-700 dark:text-gray-200 dark:hover:border-red-300 dark:hover:text-red-200"
            >
              <Plus className="h-4 w-4" />
              New
            </button>
          </div>

          <form onSubmit={(event) => void handleSubmit(event)} className="mt-6 space-y-5">
            <div>
              <label className="mb-2 block text-sm font-medium text-gray-700 dark:text-gray-300">
                Room Name
              </label>
              <input
                value={form.name}
                onChange={(event) =>
                  setForm((current) => ({ ...current, name: event.target.value }))
                }
                className="w-full rounded-xl border border-gray-300 bg-white px-4 py-3 text-gray-900 outline-none transition focus:border-brand-maroon focus:ring-2 focus:ring-brand-maroon/20 dark:border-gray-700 dark:bg-gray-950 dark:text-white"
                placeholder="Main Hall"
              />
            </div>

            <div>
              <label className="mb-2 block text-sm font-medium text-gray-700 dark:text-gray-300">
                Description
              </label>
              <textarea
                rows={4}
                value={form.description}
                onChange={(event) =>
                  setForm((current) => ({ ...current, description: event.target.value }))
                }
                className="w-full rounded-xl border border-gray-300 bg-white px-4 py-3 text-gray-900 outline-none transition focus:border-brand-maroon focus:ring-2 focus:ring-brand-maroon/20 dark:border-gray-700 dark:bg-gray-950 dark:text-white"
                placeholder="Describe the room and use case."
              />
            </div>

            <div className="grid gap-5 md:grid-cols-2">
              <div>
                <label className="mb-2 block text-sm font-medium text-gray-700 dark:text-gray-300">
                  Capacity
                </label>
                <input
                  type="number"
                  min="1"
                  value={form.capacity}
                  onChange={(event) =>
                    setForm((current) => ({
                      ...current,
                      capacity: Number(event.target.value) || 1,
                    }))
                  }
                  className="w-full rounded-xl border border-gray-300 bg-white px-4 py-3 text-gray-900 outline-none transition focus:border-brand-maroon focus:ring-2 focus:ring-brand-maroon/20 dark:border-gray-700 dark:bg-gray-950 dark:text-white"
                />
              </div>
              <div>
                <label className="mb-2 block text-sm font-medium text-gray-700 dark:text-gray-300">
                  Sort Order
                </label>
                <input
                  type="number"
                  min="1"
                  value={form.sortOrder}
                  onChange={(event) =>
                    setForm((current) => ({
                      ...current,
                      sortOrder: Number(event.target.value) || 1,
                    }))
                  }
                  className="w-full rounded-xl border border-gray-300 bg-white px-4 py-3 text-gray-900 outline-none transition focus:border-brand-maroon focus:ring-2 focus:ring-brand-maroon/20 dark:border-gray-700 dark:bg-gray-950 dark:text-white"
                />
              </div>
            </div>

            <div>
              <label className="mb-2 block text-sm font-medium text-gray-700 dark:text-gray-300">
                Amenities
              </label>
              <input
                value={amenitiesInput}
                onChange={(event) => setAmenitiesInput(event.target.value)}
                className="w-full rounded-xl border border-gray-300 bg-white px-4 py-3 text-gray-900 outline-none transition focus:border-brand-maroon focus:ring-2 focus:ring-brand-maroon/20 dark:border-gray-700 dark:bg-gray-950 dark:text-white"
                placeholder="Projector, WiFi, Aircond"
              />
              <p className="mt-2 text-xs text-gray-500 dark:text-gray-400">
                Separate amenities with commas.
              </p>
            </div>

            <div>
              <label className="mb-2 block text-sm font-medium text-gray-700 dark:text-gray-300">
                Image URL
              </label>
              <input
                value={form.imageUrl || ''}
                onChange={(event) =>
                  setForm((current) => ({ ...current, imageUrl: event.target.value }))
                }
                className="w-full rounded-xl border border-gray-300 bg-white px-4 py-3 text-gray-900 outline-none transition focus:border-brand-maroon focus:ring-2 focus:ring-brand-maroon/20 dark:border-gray-700 dark:bg-gray-950 dark:text-white"
                placeholder="https://..."
              />
            </div>

            <label className="flex items-center gap-3 rounded-2xl border border-gray-200 px-4 py-3 text-sm text-gray-700 dark:border-gray-800 dark:text-gray-200">
              <input
                type="checkbox"
                checked={form.isActive}
                onChange={(event) =>
                  setForm((current) => ({ ...current, isActive: event.target.checked }))
                }
                className="h-4 w-4 rounded border-gray-300 text-brand-maroon focus:ring-brand-maroon"
              />
              Active room
            </label>

            <button
              type="submit"
              disabled={saving}
              className="inline-flex items-center gap-2 rounded-xl bg-brand-maroon px-5 py-3 text-sm font-semibold text-white transition-colors hover:bg-[#74161c] disabled:cursor-not-allowed disabled:opacity-60"
            >
              {saving ? (
                <>
                  <Loader2 className="h-4 w-4 animate-spin" />
                  Saving
                </>
              ) : (
                <>
                  <Save className="h-4 w-4" />
                  Save room
                </>
              )}
            </button>
          </form>
        </section>

        <section className="rounded-3xl border border-gray-200 bg-white p-6 shadow-sm dark:border-gray-800 dark:bg-gray-900">
          <div className="border-b border-gray-200 pb-6 dark:border-gray-800">
            <h2 className="text-xl font-semibold text-gray-900 dark:text-white">
              Room Catalogue
            </h2>
            <p className="mt-2 text-sm text-gray-500 dark:text-gray-400">
              Archive a room to hide it from public browsing and new bookings without deleting its history.
            </p>
          </div>

          {loading ? (
            <div className="flex justify-center py-16">
              <Loader2 className="h-8 w-8 animate-spin text-brand-maroon" />
            </div>
          ) : venues.length === 0 ? (
            <div className="py-12 text-center text-sm text-gray-500 dark:text-gray-400">
              No rooms created yet.
            </div>
          ) : (
            <div className="mt-6 grid gap-4">
              {venues.map((venue) => {
                const isBusy = toggleBusyVenueId === venue.id;

                return (
                  <article
                    key={venue.id}
                    className="rounded-2xl border border-gray-200 p-5 dark:border-gray-800"
                  >
                    <div className="flex flex-col gap-4 lg:flex-row lg:items-start lg:justify-between">
                      <div className="space-y-3">
                        <div className="flex flex-wrap items-center gap-3">
                          <h3 className="text-lg font-semibold text-gray-900 dark:text-white">
                            {venue.name}
                          </h3>
                          {venue.isActive ? (
                            <span className="rounded-full bg-green-50 px-3 py-1 text-xs font-semibold text-green-700 dark:bg-green-900/20 dark:text-green-300">
                              Active
                            </span>
                          ) : (
                            <span className="rounded-full bg-slate-100 px-3 py-1 text-xs font-semibold text-slate-700 dark:bg-slate-800 dark:text-slate-300">
                              Archived
                            </span>
                          )}
                        </div>
                        <p className="text-sm text-gray-600 dark:text-gray-300">
                          {venue.description}
                        </p>
                        <div className="flex flex-wrap gap-2 text-xs text-gray-500 dark:text-gray-400">
                          <span className="rounded-full bg-gray-100 px-3 py-1 dark:bg-gray-800">
                            Capacity: {venue.capacity}
                          </span>
                          <span className="rounded-full bg-gray-100 px-3 py-1 dark:bg-gray-800">
                            Sort Order: {venue.sortOrder}
                          </span>
                          {(venue.amenities ?? []).slice(0, 4).map((amenity) => (
                            <span
                              key={amenity}
                              className="rounded-full bg-gray-100 px-3 py-1 dark:bg-gray-800"
                            >
                              {amenity}
                            </span>
                          ))}
                        </div>
                      </div>

                      <div className="flex flex-wrap gap-2">
                        <button
                          type="button"
                          onClick={() => handleEdit(venue)}
                          className="inline-flex items-center gap-2 rounded-xl border border-gray-200 px-3 py-2 text-xs font-semibold text-gray-700 transition-colors hover:border-brand-maroon hover:text-brand-maroon dark:border-gray-700 dark:text-gray-200 dark:hover:border-red-300 dark:hover:text-red-200"
                        >
                          <Pencil className="h-3.5 w-3.5" />
                          Edit
                        </button>
                        <button
                          type="button"
                          disabled={isBusy}
                          onClick={() => void handleToggleActive(venue)}
                          className="inline-flex items-center gap-2 rounded-xl border border-gray-200 px-3 py-2 text-xs font-semibold text-gray-700 transition-colors hover:border-brand-maroon hover:text-brand-maroon disabled:cursor-not-allowed disabled:opacity-50 dark:border-gray-700 dark:text-gray-200 dark:hover:border-red-300 dark:hover:text-red-200"
                        >
                          {isBusy ? (
                            <Loader2 className="h-3.5 w-3.5 animate-spin" />
                          ) : (
                            <MapPin className="h-3.5 w-3.5" />
                          )}
                          {venue.isActive ? 'Archive' : 'Activate'}
                        </button>
                      </div>
                    </div>
                  </article>
                );
              })}
            </div>
          )}
        </section>
      </div>
    </DashboardShell>
  );
};

export default AdminRoomsPage;
