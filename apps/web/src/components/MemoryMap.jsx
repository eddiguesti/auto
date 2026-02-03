// /life-story/client/src/components/MemoryMap.jsx

import { useState, useEffect } from 'react';
import { useAuth } from '../context/AuthContext';

export default function MemoryMap() {
  const { token } = useAuth();
  const [entities, setEntities] = useState({ people: [], places: [] });
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    fetchEntities();
  }, []);

  const fetchEntities = async () => {
    try {
      const [peopleRes, placesRes] = await Promise.all([
        fetch('/api/memory/person', {
          headers: { 'Authorization': `Bearer ${token}` }
        }).then(r => r.json()),
        fetch('/api/memory/place', {
          headers: { 'Authorization': `Bearer ${token}` }
        }).then(r => r.json())
      ]);
      setEntities({
        people: peopleRes.data || [],
        places: placesRes.data || []
      });
    } catch (err) {
      console.error('Error fetching entities:', err);
    } finally {
      setLoading(false);
    }
  };

  if (loading) {
    return (
      <div className="bg-white rounded-xl p-6 border border-sepia/10">
        <div className="animate-pulse">
          <div className="h-6 bg-sepia/10 rounded w-1/3 mb-4"></div>
          <div className="flex flex-wrap gap-2">
            {[1, 2, 3, 4, 5].map(i => (
              <div key={i} className="h-8 w-20 bg-sepia/10 rounded-full"></div>
            ))}
          </div>
        </div>
      </div>
    );
  }

  const hasPeople = entities.people.length > 0;
  const hasPlaces = entities.places.length > 0;
  const isEmpty = !hasPeople && !hasPlaces;

  return (
    <div className="bg-white rounded-xl p-6 border border-sepia/10">
      <h2 className="font-display text-xl text-ink mb-4">Your Memory Map</h2>

      {isEmpty ? (
        <p className="text-sepia text-center py-8">
          As you write memories, people and places you mention will appear here.
        </p>
      ) : (
        <div className="space-y-6">
          {/* People */}
          {hasPeople && (
            <div>
              <h3 className="text-sm font-medium text-sepia mb-3">
                👤 People ({entities.people.length})
              </h3>
              <div className="flex flex-wrap gap-2">
                {entities.people.slice(0, 20).map(person => (
                  <span
                    key={person.id}
                    className="px-3 py-1 bg-sepia/10 rounded-full text-sm text-ink hover:bg-sepia/20 transition cursor-default"
                    title={`Mentioned ${person.mention_count} times`}
                  >
                    {person.name}
                    {person.mention_count > 1 && (
                      <span className="ml-1 text-xs text-sepia">
                        ({person.mention_count})
                      </span>
                    )}
                  </span>
                ))}
                {entities.people.length > 20 && (
                  <span className="px-3 py-1 text-sm text-sepia">
                    +{entities.people.length - 20} more
                  </span>
                )}
              </div>
            </div>
          )}

          {/* Places */}
          {hasPlaces && (
            <div>
              <h3 className="text-sm font-medium text-sepia mb-3">
                📍 Places ({entities.places.length})
              </h3>
              <div className="flex flex-wrap gap-2">
                {entities.places.slice(0, 20).map(place => (
                  <span
                    key={place.id}
                    className="px-3 py-1 bg-amber-100 rounded-full text-sm text-ink hover:bg-amber-200 transition cursor-default"
                    title={`Mentioned ${place.mention_count} times`}
                  >
                    {place.name}
                    {place.mention_count > 1 && (
                      <span className="ml-1 text-xs text-sepia">
                        ({place.mention_count})
                      </span>
                    )}
                  </span>
                ))}
                {entities.places.length > 20 && (
                  <span className="px-3 py-1 text-sm text-sepia">
                    +{entities.places.length - 20} more
                  </span>
                )}
              </div>
            </div>
          )}
        </div>
      )}
    </div>
  );
}
