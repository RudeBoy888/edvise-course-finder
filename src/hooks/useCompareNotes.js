import React, { useState, useEffect, useCallback } from 'react';

const COMPARE_NOTES_KEY = 'edvise_compare_notes';

export function useCompareNotes() {
  const [notes, setNotes] = useState({});

  // Load notes from localStorage on mount
  useEffect(() => {
    const saved = localStorage.getItem(COMPARE_NOTES_KEY);
    if (saved) {
      try {
        setNotes(JSON.parse(saved));
      } catch (e) {
        console.error('Failed to load compare notes:', e);
      }
    }
  }, []);

  // Save to localStorage whenever notes change
  useEffect(() => {
    localStorage.setItem(COMPARE_NOTES_KEY, JSON.stringify(notes));
  }, [notes]);

  // Generate unique key for course
  const getKey = useCallback((course, institution) => {
    return `${institution.providerCode}-${course.courseCode}`;
  }, []);

  // Get note for a course
  const getNote = useCallback((course, institution) => {
    return notes[getKey(course, institution)] || '';
  }, [notes, getKey]);

  // Set note for a course
  const setNote = useCallback((course, institution, note) => {
    const key = getKey(course, institution);
    setNotes((prev) => ({
      ...prev,
      [key]: note,
    }));
  }, [getKey]);

  // Clear note for a course
  const clearNote = useCallback((course, institution) => {
    const key = getKey(course, institution);
    setNotes((prev) => {
      const newNotes = { ...prev };
      delete newNotes[key];
      return newNotes;
    });
  }, [getKey]);

  // Clear all notes
  const clearAllNotes = useCallback(() => {
    setNotes({});
  }, []);

  return {
    notes,
    getNote,
    setNote,
    clearNote,
    clearAllNotes,
  };
}
