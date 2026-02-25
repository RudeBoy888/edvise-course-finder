import React, { useState, useEffect, useCallback } from 'react';

const WISHLIST_STORAGE_KEY = 'edvise_wishlist';

export function useWishlist() {
  const [wishlist, setWishlist] = useState([]);

  // Load wishlist from localStorage on mount
  useEffect(() => {
    const saved = localStorage.getItem(WISHLIST_STORAGE_KEY);
    if (saved) {
      try {
        setWishlist(JSON.parse(saved));
      } catch (e) {
        console.error('Failed to load wishlist:', e);
      }
    }
  }, []);

  // Save to localStorage whenever wishlist changes
  useEffect(() => {
    localStorage.setItem(WISHLIST_STORAGE_KEY, JSON.stringify(wishlist));
  }, [wishlist]);

  const toggleWishlist = useCallback((course, institution) => {
    setWishlist((prev) => {
      const isInWishlist = prev.some(
        (item) =>
          item.course.courseCode === course.courseCode &&
          item.institution.providerCode === institution.providerCode
      );

      if (isInWishlist) {
        return prev.filter(
          (item) =>
            !(
              item.course.courseCode === course.courseCode &&
              item.institution.providerCode === institution.providerCode
            )
        );
      } else {
        return [...prev, { course, institution }];
      }
    });
  }, []);

  const isInWishlist = useCallback((course, institution) => {
    return wishlist.some(
      (item) =>
        item.course.courseCode === course.courseCode &&
        item.institution.providerCode === institution.providerCode
    );
  }, [wishlist]);

  const clearWishlist = useCallback(() => {
    setWishlist([]);
  }, []);

  return {
    wishlist,
    toggleWishlist,
    isInWishlist,
    clearWishlist,
  };
}
