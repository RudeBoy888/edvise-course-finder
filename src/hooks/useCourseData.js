import { useState, useEffect } from 'react';

/**
 * Custom hook to fetch and cache course data from JSON file
 * Exposes filtered results based on search term and state
 */
export function useCourseData() {
  const [data, setData] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);

  useEffect(() => {
    const fetchData = async () => {
      try {
        const response = await fetch('/courses_data.json');
        if (!response.ok) {
          throw new Error('Failed to load course data');
        }
        const json = await response.json();
        setData(json);
        setError(null);
      } catch (err) {
        setError(err.message);
        setData([]);
      } finally {
        setLoading(false);
      }
    };

    fetchData();
  }, []);

  return { data, loading, error };
}
